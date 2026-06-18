-- ============================================================================
-- ts_settings hardening (applied live) — remove anon access, gate writes per key.
-- ============================================================================
-- ts_settings previously had a single permissive policy (anon_all, FOR ALL using/check
-- true) so the public anon key — and any signed-in user — could read AND write every
-- settings key. role_perms escalation was closed separately (auth_settings_roleperms_guard.sql);
-- this removes anonymous access entirely and gates each key by the right permission.
--
-- Verified by simulated-role dry-run before applying (no legitimate writer is blocked):
--   superadmin/admin: all keys; cx_manager: roster+maintenance(+override)+workspace;
--   maint: maintenance+workspace; desk: charter+workspace; non-permitted keys denied.
-- Reads remain open to any authenticated user (every client must read role_perms etc.).
-- anon (the public key) now has NO ts_settings policy → fully denied (boot reloads after login).
-- ============================================================================
create or replace function public._settings_write_ok(k text) returns boolean language sql stable as $$
  select public.app_role()='superadmin'
    or (k='role_perms' and public.has_perm('admin_users'))
    or (k='roster' and (public.has_perm('roster_edit') or public.has_perm('leave_approve')))
    or (k in ('maintenance','aircraft_obs') and public.has_perm('maint_bookings'))
    or (k in ('charter_wait_rate','charter_quotes') and public.has_perm('charter'))
    or (k='workspace_shared')
    or (k not in ('role_perms','roster','maintenance','aircraft_obs','charter_wait_rate','charter_quotes'));
$$;

drop policy if exists anon_all on public.ts_settings;
drop policy if exists ts_settings_read on public.ts_settings;
drop policy if exists ts_settings_w_ins on public.ts_settings;
drop policy if exists ts_settings_w_upd on public.ts_settings;
drop policy if exists ts_settings_w_del on public.ts_settings;

create policy ts_settings_read  on public.ts_settings for select to authenticated using (true);
create policy ts_settings_w_ins on public.ts_settings for insert to authenticated with check (public._settings_write_ok(key));
create policy ts_settings_w_upd on public.ts_settings for update to authenticated using (public._settings_write_ok(key)) with check (public._settings_write_ok(key));
create policy ts_settings_w_del on public.ts_settings for delete to authenticated using (public._settings_write_ok(key));

grant select, insert, update, delete on public.ts_settings to authenticated;

-- The restrictive role_perms guards (auth_settings_roleperms_guard.sql) remain in place as
-- belt-and-braces, so role_perms stays admin-only even if a permissive policy is re-added.
