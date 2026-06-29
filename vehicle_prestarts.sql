-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth FMS — Vehicle prestart checklist  (Ground ▸ Vehicle Prestart)
-- Run in the Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.ts_vehicle_prestarts (
  id          text primary key,
  vehicle     text,
  user_id     uuid,
  user_name   text,
  check_date  date,
  time        text,
  odo         integer,
  fuel        text,
  passed      boolean default false,
  checklist   jsonb   default '{}'::jsonb,   -- { itemKey: { s:'ok'|'no', c:comment, p:photoDataURI } }
  sig         text,                          -- driver signature (data URI)
  notes       text,
  created_at  timestamptz default now()
);
create index if not exists ts_veh_prestarts_date_idx on public.ts_vehicle_prestarts (check_date desc);
create index if not exists ts_veh_prestarts_veh_idx  on public.ts_vehicle_prestarts (vehicle);

alter table public.ts_vehicle_prestarts enable row level security;

-- Any signed-in user may read prestart reports and submit their own; updates/deletes are admin/superadmin.
drop policy if exists veh_prestart_read on public.ts_vehicle_prestarts;
create policy veh_prestart_read on public.ts_vehicle_prestarts for select to authenticated using (true);

drop policy if exists veh_prestart_insert on public.ts_vehicle_prestarts;
create policy veh_prestart_insert on public.ts_vehicle_prestarts for insert to authenticated with check (true);

drop policy if exists veh_prestart_update on public.ts_vehicle_prestarts;
create policy veh_prestart_update on public.ts_vehicle_prestarts for update to authenticated
  using (public.app_role() in ('admin','superadmin') or user_id::text = public.app_id())
  with check (public.app_role() in ('admin','superadmin') or user_id::text = public.app_id());

drop policy if exists veh_prestart_delete on public.ts_vehicle_prestarts;
create policy veh_prestart_delete on public.ts_vehicle_prestarts for delete to authenticated
  using (public.app_role() in ('admin','superadmin'));

-- Done.
