-- ============================================================================
-- TrueSouth FMS — Supabase Auth migration: PHASE B
-- ============================================================================
-- Run AFTER Phase A (auth_migration_phase0A.sql) is live and verified.
--
-- Goal: turn Row-Level Security ON for every remaining ts_* table, with EXPLICIT
-- permissive policies that mirror today's open behaviour. This moves the whole DB
-- to "RLS enabled, deny-by-default, explicitly allowed" — the structure Phase C
-- then tightens with per-user / per-role policies once real JWTs exist.
--
-- IMPORTANT — why the policies are still permissive here:
--   Phase B runs while the app is STILL on the anon key (no per-user JWT yet), so
--   auth.uid() is NULL and role-based policies cannot work. Restricting by identity
--   therefore waits for Phase C. What Phase B *can* do safely now:
--     • make RLS the enforced model (so a future missing policy fails closed), and
--     • lock the general audit log to append-only (needs no identity).
--
-- These are additive and mirror current behaviour, so the running app keeps working
-- on the anon key. Idempotent: safe to re-run. Rollback block at the bottom.
--
-- BEFORE RUNNING: take a DB backup. Test on the test site first if you can.
-- NOTE: confirm this table list against the dashboard; ts_users is handled by
--       Phase A (do NOT re-open it here).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Data tables — RLS on + a single permissive policy (mirrors today's access).
--    return=representation writes keep working because the policy also allows SELECT.
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'ts_crew','ts_aircraft','ts_loadsheets','ts_manifests','ts_settings',
    'ts_charter_rates','ts_maintenance','ts_scratchpads','ts_notifications',
    'ts_leave_requests','ts_leave_audit','ts_roster_build','ts_role_perms'
  ]
  loop
    -- skip tables that don't exist in this project
    if to_regclass('public.'||t) is null then
      raise notice 'skipping %, not present', t; continue;
    end if;
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists anon_all on public.%I;', t);
    execute format(
      'create policy anon_all on public.%I for all to anon, authenticated using (true) with check (true);', t);
  end loop;
end$$;

-- ----------------------------------------------------------------------------
-- 2. General audit log — append-only from clients (no identity needed).
--    INSERT + SELECT allowed; no UPDATE/DELETE policy => those are denied.
--    (auditLog() only ever INSERTs, and the app only ever reads it, so this is
--    a real hardening win with zero behaviour change.)
-- ----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.ts_audit_log') is not null then
    alter table public.ts_audit_log enable row level security;
    drop policy if exists audit_insert on public.ts_audit_log;
    drop policy if exists audit_select on public.ts_audit_log;
    drop policy if exists anon_all   on public.ts_audit_log;  -- in case a prior run added it
    create policy audit_insert on public.ts_audit_log for insert to anon, authenticated with check (true);
    create policy audit_select on public.ts_audit_log for select to anon, authenticated using (true);
    -- (deliberately NO update/delete policy → audit rows are immutable from the client)
  end if;
end$$;

-- ============================================================================
-- VERIFY
--   • App still loads and every tab reads/writes normally (RLS now ON, policies allow it).
--   • Audit log: an INSERT succeeds, a SELECT succeeds, but an UPDATE/DELETE from the
--     anon key is rejected, e.g.:
--       await fetch(SB+'/rest/v1/ts_audit_log?id=eq.<someid>',{method:'DELETE',headers:SH})
--     should return 401/403 (or affect 0 rows), confirming immutability.
-- ============================================================================


-- ============================================================================
-- PHASE C PREVIEW (DO NOT RUN YET — needs Supabase Auth / per-user JWT)
-- Once requests carry a real user token, replace the permissive policies above
-- with identity/role-aware ones, e.g.:
--
--   -- Only admins may change the role/permission grid:
--   drop policy anon_all on public.ts_role_perms;
--   create policy roleperms_read  on public.ts_role_perms for select using (true);
--   create policy roleperms_write on public.ts_role_perms for all
--     using (public.app_role() in ('admin','superadmin'))
--     with check (public.app_role() in ('admin','superadmin'));
--
--   -- Leave: owner read/write own; approvers by role:
--   drop policy anon_all on public.ts_leave_requests;
--   create policy leave_owner on public.ts_leave_requests for all
--     using (user_id = public.app_id()) with check (user_id = public.app_id());
--   create policy leave_approver_rw on public.ts_leave_requests for all
--     using (public.app_role() in ('cx_manager','admin','superadmin'));
--
-- (app_id()/app_role() were created in Phase 0; they return NULL until Phase C
--  auth is in place, which is exactly why the tightening waits.)
-- ============================================================================


-- ============================================================================
-- ROLLBACK (uncomment to revert Phase B — restores the pre-RLS open behaviour)
-- ============================================================================
-- do $$
-- declare t text;
-- begin
--   foreach t in array array[
--     'ts_crew','ts_aircraft','ts_loadsheets','ts_manifests','ts_settings',
--     'ts_charter_rates','ts_maintenance','ts_scratchpads','ts_notifications',
--     'ts_leave_requests','ts_leave_audit','ts_roster_build','ts_role_perms','ts_audit_log'
--   ] loop
--     if to_regclass('public.'||t) is null then continue; end if;
--     execute format('drop policy if exists anon_all on public.%I;', t);
--     execute format('drop policy if exists audit_insert on public.%I;', t);
--     execute format('drop policy if exists audit_select on public.%I;', t);
--     execute format('alter table public.%I disable row level security;', t);
--   end loop;
-- end$$;
