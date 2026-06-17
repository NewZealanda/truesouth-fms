-- ============================================================================
-- Phase C — per-user / per-role RLS policies (replace Phase B's permissive ones)
-- ============================================================================
-- Run ONLY after: profiles are provisioned & verified, the access-token hook is
-- enabled, and the client (AUTH_PHASE_C) is sending real user JWTs on the test site.
-- Swap table-by-table, verifying the app after each. Rollback block at the bottom
-- restores the Phase B permissive policies.
--
-- Policies target the `authenticated` role and read role/identity from the JWT via
-- public.app_role() / public.app_id() (claim-backed). `anon` gets nothing.
-- ============================================================================

-- ---- Operational data: any signed-in user may read/write (mirrors today, minus anon) ----
do $$
declare t text;
begin
  foreach t in array array[
    'ts_crew','ts_aircraft','ts_loadsheets','ts_manifests','ts_settings',
    'ts_charter_rates','ts_maintenance','ts_scratchpads'
  ] loop
    if to_regclass('public.'||t) is null then continue; end if;
    execute format('drop policy if exists anon_all on public.%I;', t);
    execute format('drop policy if exists auth_all on public.%I;', t);
    execute format('create policy auth_all on public.%I for all to authenticated using (true) with check (true);', t);
  end loop;
end$$;

-- ---- Notifications: a user sees/*acts on* only their own ----
drop policy if exists anon_all on public.ts_notifications;
drop policy if exists notif_own on public.ts_notifications;
create policy notif_own on public.ts_notifications for all to authenticated
  using (user_id = public.app_id()) with check (user_id = public.app_id());
-- (If approvers need to CREATE notifications for others, add an insert policy:
--  create policy notif_insert_any on public.ts_notifications for insert to authenticated with check (true);)

-- ---- Roster build: read all; write only roster editors ----
drop policy if exists anon_all on public.ts_roster_build;
drop policy if exists roster_read on public.ts_roster_build;
drop policy if exists roster_write on public.ts_roster_build;
create policy roster_read  on public.ts_roster_build for select to authenticated using (true);
create policy roster_write on public.ts_roster_build for all to authenticated
  using (public.app_role() in ('admin','superadmin','cx_manager'))
  with check (public.app_role() in ('admin','superadmin','cx_manager'));

-- ---- Role/permission grid: read all; write only admins ----
drop policy if exists anon_all on public.ts_role_perms;
drop policy if exists roleperms_read on public.ts_role_perms;
drop policy if exists roleperms_write on public.ts_role_perms;
create policy roleperms_read  on public.ts_role_perms for select to authenticated using (true);
create policy roleperms_write on public.ts_role_perms for all to authenticated
  using (public.app_role() in ('admin','superadmin'))
  with check (public.app_role() in ('admin','superadmin'));

-- ---- Leave requests: owner read/write own; approvers read + update by role ----
drop policy if exists anon_all on public.ts_leave_requests;
drop policy if exists leave_owner on public.ts_leave_requests;
drop policy if exists leave_approver_read on public.ts_leave_requests;
drop policy if exists leave_approver_update on public.ts_leave_requests;
create policy leave_owner on public.ts_leave_requests for all to authenticated
  using (user_id = public.app_id()) with check (user_id = public.app_id());
create policy leave_approver_read on public.ts_leave_requests for select to authenticated
  using (public.app_role() in ('cx_manager','admin','superadmin'));
create policy leave_approver_update on public.ts_leave_requests for update to authenticated
  using (public.app_role() in ('cx_manager','admin','superadmin'))
  with check (public.app_role() in ('cx_manager','admin','superadmin'));

-- ---- Leave audit: insert by any authenticated; read by owner or approver; no edits ----
drop policy if exists anon_all on public.ts_leave_audit;
drop policy if exists leaveaudit_insert on public.ts_leave_audit;
drop policy if exists leaveaudit_read on public.ts_leave_audit;
create policy leaveaudit_insert on public.ts_leave_audit for insert to authenticated with check (true);
create policy leaveaudit_read   on public.ts_leave_audit for select to authenticated
  using (public.app_role() in ('cx_manager','admin','superadmin')
         or performed_by = public.app_id());
-- (superadmin delete of leave history, if still needed, would need an explicit delete policy
--  gated on public.app_role() = 'superadmin')

-- ---- ts_users base table: keep it Auth-only. The app reads ts_users_public (granted in
--      Phase A). Once passwords live in auth.users, drop password_hash/reset_* columns. ----
-- (No authenticated policy here = base ts_users stays unreadable/unwritable by clients.)

-- ============================================================================
-- ROLLBACK — restore Phase B permissive behaviour
-- ============================================================================
-- do $$
-- declare t text;
-- begin
--   foreach t in array array[
--     'ts_crew','ts_aircraft','ts_loadsheets','ts_manifests','ts_settings',
--     'ts_charter_rates','ts_maintenance','ts_scratchpads','ts_notifications',
--     'ts_leave_requests','ts_leave_audit','ts_roster_build','ts_role_perms'
--   ] loop
--     if to_regclass('public.'||t) is null then continue; end if;
--     execute format('drop policy if exists auth_all on public.%I;', t);
--     execute format('drop policy if exists notif_own on public.%I;', t);
--     execute format('drop policy if exists roster_read on public.%I;', t);
--     execute format('drop policy if exists roster_write on public.%I;', t);
--     execute format('drop policy if exists roleperms_read on public.%I;', t);
--     execute format('drop policy if exists roleperms_write on public.%I;', t);
--     execute format('drop policy if exists leave_owner on public.%I;', t);
--     execute format('drop policy if exists leave_approver_read on public.%I;', t);
--     execute format('drop policy if exists leave_approver_update on public.%I;', t);
--     execute format('drop policy if exists leaveaudit_insert on public.%I;', t);
--     execute format('drop policy if exists leaveaudit_read on public.%I;', t);
--     execute format('create policy anon_all on public.%I for all to anon, authenticated using (true) with check (true);', t);
--   end loop;
-- end$$;
