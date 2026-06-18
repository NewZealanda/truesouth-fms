-- ============================================================================
-- Close the permission-escalation hole on ts_settings (applied live).
-- ============================================================================
-- The permissions grid is stored in ts_settings under key='role_perms'. ts_settings
-- had a single permissive policy (anon_all: FOR ALL ... using true with check true),
-- so ANY authenticated user — or even the public anon key — could upsert the
-- role_perms key and grant themselves admin. Verified: a 'desk' role could write it.
--
-- Fix: RESTRICTIVE write policies that AND with the existing permissive policy, so
-- reads and every OTHER settings key (roster, maintenance, workspace, charter) are
-- unaffected — only WRITES to the role_perms key are locked to admin_users/superadmin.
-- (Reads of role_perms stay open: every client must read it to compute its own
-- permissions; SELECT is governed only by the permissive policy.)
--
-- Verified after applying: desk write role_perms = BLOCKED (42501),
-- superadmin write role_perms = ALLOWED. Also confirmed users cannot self-update
-- profiles.role (no update policy → RLS denies), so the JWT role can't be escalated.
-- ============================================================================
drop policy if exists ts_settings_roleperms_ins on public.ts_settings;
drop policy if exists ts_settings_roleperms_upd on public.ts_settings;
drop policy if exists ts_settings_roleperms_del on public.ts_settings;

create policy ts_settings_roleperms_ins on public.ts_settings as restrictive for insert
  with check ( key <> 'role_perms' or public.app_role()='superadmin' or public.has_perm('admin_users') );
create policy ts_settings_roleperms_upd on public.ts_settings as restrictive for update
  using      ( key <> 'role_perms' or public.app_role()='superadmin' or public.has_perm('admin_users') )
  with check ( key <> 'role_perms' or public.app_role()='superadmin' or public.has_perm('admin_users') );
create policy ts_settings_roleperms_del on public.ts_settings as restrictive for delete
  using      ( key <> 'role_perms' or public.app_role()='superadmin' or public.has_perm('admin_users') );

-- NOTE (follow-up, lower priority): the anon_all policy still lets the public anon key
-- read/write OTHER ts_settings keys (roster, maintenance, etc.). That's a data-integrity
-- exposure, not privilege escalation. Tightening it (drop anon access; gate roster by
-- roster_edit, maintenance by maint_bookings) is a sensible next hardening step.
