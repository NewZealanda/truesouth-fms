-- ─────────────────────────────────────────────────────────────────────────────
-- Daily Flight Record (v24.86) — run in the Supabase SQL editor.
-- A simple per-flight log: off/on blocks, aircraft hours (TTIS), product, route, POB.
-- Until this is applied the Flight Record page works in-session but does NOT persist.
-- Gated client-side by the new `flightrecord` permission (superadmin only during development).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists ts_flight_records (
  id           text primary key,        -- "fr_<epoch>_<rand>"
  user_id      text not null,           -- pilot (PIC)
  fr_date      date not null,
  aircraft     text,                    -- e.g. "ZK-SLB"
  product      text,                    -- FCF / THH / Ferry / Maintenance / Training / Private Hire …
  route_from   text,                    -- e.g. "QN"
  route_to     text,                    -- e.g. "MF"
  pob          integer,                 -- persons on board, INCLUDING the PIC
  off_blocks   text,                    -- "HH:MM"
  on_blocks    text,                    -- "HH:MM"
  actype       text,                    -- aircraft type, recorded legally: "C208B" / "GA8"
  start_hours  numeric,                 -- airframe TTIS at off-blocks
  end_hours    numeric,                 -- confirmed TTIS at shutdown (= start + tacho)
  flight_time  numeric,                 -- OFF→ON block time (the legal flight time)
  tacho        numeric,                 -- TTIS used = block time − taxi adjustment (drives the airframe hours)
  landings     integer default 1,
  starts       integer default 1,       -- engine starts (tracked esp. for the C208B fleet)
  done         boolean default false,   -- finalised by the pilot (tapped SAVE after confirming TTIS)
  submitted    boolean default false,   -- uploaded to the maintenance log (end-of-day, last PIC)
  submitted_by text,
  manual       boolean default false,   -- entered manually (not auto-detected)
  note         text,
  updated_at   timestamptz default now(),
  updated_by   text
);
create index if not exists ts_flight_records_user_date on ts_flight_records (user_id, fr_date);

-- RLS — match your existing scheme (a pilot writes their own; managers may read all).
alter table ts_flight_records enable row level security;
drop policy if exists ts_flight_records_rw on ts_flight_records;
create policy ts_flight_records_rw on ts_flight_records for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.ts_flight_records to authenticated;
