-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth FMS — Ground equipment & servicing tracker  (Ground ▸ Equipment)
-- Run in the Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.ts_equipment (
  id          text primary key,
  name        text,
  category    text,
  notes       text,
  checks      jsonb default '[]'::jsonb,   -- [{id,label,freq,last,next,_notified}]
  log         jsonb default '[]'::jsonb,   -- [{date,by,check,ts}]
  photos      jsonb default '[]'::jsonb,   -- [{name,type,data}]
  active      boolean default true,
  created_at  timestamptz default now()
);

alter table public.ts_equipment enable row level security;

-- Everyone signed-in can read; create/update/delete = ground / maintenance / admins.
drop policy if exists equipment_read on public.ts_equipment;
create policy equipment_read on public.ts_equipment for select to authenticated using (true);
drop policy if exists equipment_write on public.ts_equipment;
create policy equipment_write on public.ts_equipment for all to authenticated
  using (public.app_role() in ('ground_staff','maint','maintenance','admin','superadmin','cx_manager'))
  with check (public.app_role() in ('ground_staff','maint','maintenance','admin','superadmin','cx_manager'));

-- Done.
