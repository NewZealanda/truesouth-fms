-- ============================================================================
-- Phase 4 — open the new Operations flow to everyone with the 'operations' permission
-- ============================================================================
-- The promoted Operations flow (Bookings / Seatmap / Loadsheets) is now rendered for any user
-- who holds the 'operations' permission (superadmin, admin, cx_manager, pilot, desk). Its
-- check-in, pickup arrangement and seatmap-pax state are persisted to public.ts_pickup_lists.
--
-- That table's WRITE policy was previously gated on has_perm('rezdy') (superadmin only), which
-- would block pilots/desk/cx_manager from checking passengers in or saving the seatmap. Re-map
-- the write permission from 'rezdy' to 'operations'.
--
-- Already OK (no change needed):
--   • ts_settings rz_* keys (rz_manifest_<date>, rz_lstabs_<date>, rz_vehicles) — _settings_write_ok()
--     already allows any non-protected key for authenticated users.
--   • ts_loadsheets — write gated on 'operations'.
--   • ts_rezdy_bookings — reads open; only the rezdy-sync edge function writes it (service role).
--   • ts_schedule — written by the still-gated Calendar, keeps 'rezdy'.
--
-- Reads stay open to any signed-in user (mirrors Stage 2).
--
-- DRY-RUN (inspect, change nothing):   begin;  <DO block>  ; rollback;
-- ============================================================================
do $$
begin
  if to_regclass('public.ts_pickup_lists') is null then return; end if;
  execute 'alter table public.ts_pickup_lists enable row level security';

  -- Replace the write policies (operations instead of rezdy). Keep an open read policy.
  drop policy if exists s2_ins  on public.ts_pickup_lists;
  drop policy if exists s2_upd  on public.ts_pickup_lists;
  drop policy if exists s2_del  on public.ts_pickup_lists;
  drop policy if exists s2_read on public.ts_pickup_lists;

  create policy s2_read on public.ts_pickup_lists
    for select to authenticated using (true);
  create policy s2_ins on public.ts_pickup_lists
    for insert to authenticated
    with check (public.app_role()='superadmin' or public.has_perm('operations'));
  create policy s2_upd on public.ts_pickup_lists
    for update to authenticated
    using      (public.app_role()='superadmin' or public.has_perm('operations'))
    with check (public.app_role()='superadmin' or public.has_perm('operations'));
  create policy s2_del on public.ts_pickup_lists
    for delete to authenticated
    using (public.app_role()='superadmin' or public.has_perm('operations'));

  grant select, insert, update, delete on public.ts_pickup_lists to authenticated;
end$$;

-- Verify the resulting policies on ts_pickup_lists
select polname,
       case polcmd when 'a' then 'INSERT' when 'w' then 'UPDATE'
                   when 'r' then 'SELECT' when 'd' then 'DELETE' else polcmd::text end as cmd
from pg_policy po
join pg_class c on c.oid = po.polrelid
where c.relname = 'ts_pickup_lists'
order by cmd;
