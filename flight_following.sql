-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth FMS — Flight following / Monitoring  (one row per aircraft, current status)
-- Run in the Supabase SQL editor.  Driven by the flight card (Off/On Blocks).
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.ts_flight_following (
  id          text primary key,         -- aircraft registration (e.g. ZK-SLQ)
  aircraft    text,
  status      text,                      -- 'air' | 'ground'
  flight_id   text,
  frm         text,                      -- departure (from)
  "to"        text,                      -- destination
  pob         integer,
  off_time    text,
  eta_type    text,                      -- 'ams' | 'other'
  eta_time    text,
  location    text,                      -- where it's on the ground
  updated_at  timestamptz default now()
);

alter table public.ts_flight_following enable row level security;

-- Everyone signed-in can read the board; any signed-in user (pilots) may update their aircraft's status.
drop policy if exists flight_following_read on public.ts_flight_following;
create policy flight_following_read on public.ts_flight_following for select to authenticated using (true);
drop policy if exists flight_following_write on public.ts_flight_following;
create policy flight_following_write on public.ts_flight_following for all to authenticated using (true) with check (true);

-- Done.
