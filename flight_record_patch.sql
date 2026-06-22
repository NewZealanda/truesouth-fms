-- ─────────────────────────────────────────────────────────────────────────────
-- Flight Record — column patch (v24.92).
-- Safe to run any time: only adds columns you don't already have. Run this if you
-- created ts_flight_records from an earlier version of flight_record.sql.
-- ─────────────────────────────────────────────────────────────────────────────
alter table ts_flight_records add column if not exists actype       text;
alter table ts_flight_records add column if not exists tacho        numeric;
alter table ts_flight_records add column if not exists starts       integer default 1;
alter table ts_flight_records add column if not exists submitted    boolean default false;
alter table ts_flight_records add column if not exists submitted_by text;
alter table ts_flight_records add column if not exists pic_name     text;
alter table ts_flight_records add column if not exists copilot      text;
alter table ts_flight_records add column if not exists details      text;
