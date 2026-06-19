-- ============================================================================
-- Fix: maintenance editing gated on 'maintenance' (was 'maint_bookings')
-- ============================================================================
-- The maintenance log + observations live in ts_settings under keys 'maintenance'
-- and 'aircraft_obs'. The write-gate function previously required has_perm('maint_bookings'),
-- so pilots / the 'maintenance' role (who have 'maintenance' but NOT 'maint_bookings')
-- got "Maintenance save failed — not saved to server" when ticking ADAS/Comp-Wash,
-- editing log cells, or logging observations — the database rejected the write.
--
-- This relaxes those two keys to has_perm('maintenance') to match the client (v23.36+),
-- where general maintenance editing needs 'maintenance' and only the Bookings tab needs
-- 'maint_bookings'. NOTE: maintenance bookings live in the SAME 'maintenance' JSON blob,
-- so server-side they ride along with this key; the bookings UI stays gated client-side.
--
-- Run in the Supabase SQL editor (project level — applies to test + prod).
-- To DRY-RUN: wrap in  begin; ... rollback;
-- ============================================================================
create or replace function public._settings_write_ok(k text) returns boolean language sql stable as $$
  select public.app_role()='superadmin'
    or (k='role_perms' and public.has_perm('admin_users'))
    or (k='roster' and (public.has_perm('roster_edit') or public.has_perm('leave_approve')))
    or (k in ('maintenance','aircraft_obs') and public.has_perm('maintenance'))
    or (k in ('charter_wait_rate','charter_quotes') and public.has_perm('charter'))
    or (k='workspace_shared')
    or (k not in ('role_perms','roster','maintenance','aircraft_obs','charter_wait_rate','charter_quotes'));
$$;

-- Verify the function compiled and shows the new gate:
select pg_get_functiondef('public._settings_write_ok(text)'::regprocedure);
