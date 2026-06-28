-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth FMS — "Reports to" org structure + manager-based leave approval
-- Run this ONCE in the Supabase SQL Editor (Dashboard ▸ SQL).
--
-- WHAT IT DOES
--   1. Adds a `reports_to` column to ts_users (each person's manager's app id).
--   2. Exposes reports_to through the ts_users_public view the app reads.
--   3. Adds a SECURITY DEFINER helper app_manages() so the leave RLS can ask
--      "is the current user the direct manager of this requester?" (RLS can't
--      read ts_users directly because SELECT on it is revoked).
--   4. Widens the leave-request RLS so a person's DIRECT MANAGER can read and
--      action their leave — admin / cx_manager / superadmin keep blanket access.
--
-- SAFE TO RE-RUN (idempotent).
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Manager link on the base table. NULL = no manager set.
alter table public.ts_users add column if not exists reports_to text;

-- 2) Recreate the safe public view to include reports_to (app reads this, not the
--    base table — the base table's password_hash stays hidden).
create or replace view public.ts_users_public as
  select id, name, email, role, linked_crew, reports_to, inactive, created_at
  from public.ts_users;
grant select on public.ts_users_public to anon, authenticated;

-- 3) "Is the signed-in user the DIRECT manager of req_user?" Runs as owner so it
--    can read ts_users even though authenticated has no SELECT on it.
create or replace function public.app_manages(req_user text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.ts_users u
    where u.id = req_user
      and u.reports_to is not null
      and u.reports_to = public.app_id()
  );
$$;
revoke all on function public.app_manages(text) from public;
grant execute on function public.app_manages(text) to authenticated;

-- 4) Leave RLS — approver roles keep full access; ADD the requester's direct manager.
drop policy if exists leave_approver_read on public.ts_leave_requests;
create policy leave_approver_read on public.ts_leave_requests for select to authenticated
  using (public.app_role() in ('cx_manager','admin','superadmin')
         or public.app_manages(user_id));

drop policy if exists leave_approver_update on public.ts_leave_requests;
create policy leave_approver_update on public.ts_leave_requests for update to authenticated
  using      (public.app_role() in ('cx_manager','admin','superadmin') or public.app_manages(user_id))
  with check (public.app_role() in ('cx_manager','admin','superadmin') or public.app_manages(user_id));

-- 5) Let an org MANAGER write the roster blob too, so the leave-approval auto-stamp works for
--    non-admin managers (the roster lives in ts_settings key 'roster'; its write gate previously
--    required roster_edit OR leave_approve). app_is_manager() = "does anyone report to me?".
create or replace function public.app_is_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ts_users u where u.reports_to = public.app_id());
$$;
revoke all on function public.app_is_manager() from public;
grant execute on function public.app_is_manager() to authenticated;

create or replace function public._settings_write_ok(k text) returns boolean language sql stable as $$
  select public.app_role()='superadmin'
    or (k='role_perms' and public.has_perm('admin_users'))
    or (k='roster' and (public.has_perm('roster_edit') or public.has_perm('leave_approve') or public.app_is_manager()))
    or (k in ('maintenance','aircraft_obs') and public.has_perm('maintenance'))
    or (k in ('charter_wait_rate','charter_quotes') and public.has_perm('charter'))
    or (k='workspace_shared')
    or (k not in ('role_perms','roster','maintenance','aircraft_obs','charter_wait_rate','charter_quotes'));
$$;
-- (Managers write the roster via the app's merge-before-write path, so they only change the cells
--  their approval touches — the rest of the roster blob is preserved.)

-- Done.
