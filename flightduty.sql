-- ─────────────────────────────────────────────────────────────────────────────
-- Flight & Duty (v24.37) — run in the Supabase SQL editor.
-- Adds the per-pilot daily flight/duty log, the monthly certification record, and
-- two crew-profile columns (date of birth + type ratings) used by currency tracking.
-- Until this is applied, the Flight & Duty page works in-session but does NOT persist.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Per-pilot daily flight & duty record (one row per pilot per day; id = "<user_id>|YYYY-MM-DD")
create table if not exists ts_flightduty (
  id              text primary key,
  user_id         text not null,
  fd_date         date not null,
  duty_start      text,            -- "HH:MM"
  duty_end        text,            -- "HH:MM"
  flight_time     numeric default 0,  -- hours, off-blocks -> on-blocks
  ldg_c208        integer default 0,  -- day landings on type (currency)
  ldg_ga8         integer default 0,
  extended        boolean default false, -- duty extended to 12h for a disrupted schedule
  override        boolean default false, -- "interest of safety/health" exceedance (logged)
  override_reason text,
  note            text,
  updated_at      timestamptz default now(),
  updated_by      text
);
create unique index if not exists ts_flightduty_user_date on ts_flightduty (user_id, fd_date);

-- 2) Monthly period certification ("I certify this record is correct"); id = "<user_id>|YYYY-MM"
create table if not exists ts_fd_certs (
  id            text primary key,
  user_id       text not null,
  period        text not null,    -- "YYYY-MM"
  certified_at  timestamptz,
  certified_by  text
);

-- 3) Crew profile additions used by Flight & Duty
alter table ts_crew add column if not exists dob          date;
alter table ts_crew add column if not exists type_ratings text;   -- JSON array, e.g. ["c208b","ga8"]

-- 4) RLS — enable and add policies consistent with your existing scheme.
--    Adjust these to match how your other ts_* tables gate access (has_perm()/role).
alter table ts_flightduty enable row level security;
alter table ts_fd_certs   enable row level security;

-- Minimal authenticated-access policies (replace with per-role / per-owner policies to match
-- your auth_*.sql pattern — e.g. a pilot may write only their own rows; F&D managers may read all).
drop policy if exists ts_flightduty_rw on ts_flightduty;
create policy ts_flightduty_rw on ts_flightduty for all to authenticated using (true) with check (true);

drop policy if exists ts_fd_certs_rw on ts_fd_certs;
create policy ts_fd_certs_rw on ts_fd_certs for all to authenticated using (true) with check (true);
