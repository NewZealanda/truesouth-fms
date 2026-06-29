-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth FMS — let the creator delete their own vehicle prestart
-- (admins/superadmin can already delete any). Run in the Supabase SQL editor.
-- Safe + idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

drop policy if exists veh_prestart_delete on public.ts_vehicle_prestarts;
create policy veh_prestart_delete on public.ts_vehicle_prestarts for delete to authenticated
  using (public.app_role() in ('admin','superadmin') or user_id::text = public.app_id());

-- Done.
