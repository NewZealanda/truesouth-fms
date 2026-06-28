-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth FMS — De-duplicate flight records (legacy import vs app-made)
-- Run in the Supabase SQL editor. The legacy import (ids 'fr_imp_%') was added
-- ALONGSIDE the flight cards already made in the app, so any flight that existed
-- in BOTH sources is now duplicated (only the recent overlap, e.g. 26–27 Jun 2026).
--
-- Plan: KEEP the app-made records (the pilots' real live entries); REMOVE the
-- imported duplicates that match an app record on date + aircraft + off-blocks.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── STEP 1 — REVIEW: list imported × app records on the same day + aircraft ──
-- Run this first and eyeball it. Rows where imp_off = app_off are clean duplicates
-- the delete below will remove. Rows where the times differ are NOT auto-deleted —
-- check those by hand (they may be the same flight logged with a slightly different
-- off-blocks time, or a genuinely different flight).
select i.fr_date, i.aircraft,
       i.id  as imp_id,  i.off_blocks as imp_off,  i.on_blocks as imp_on,  i.pic_name as imp_pic,  i.flight_time as imp_h,
       a.id  as app_id,  a.off_blocks as app_off,  a.on_blocks as app_on,  a.pic_name as app_pic,  a.flight_time as app_h
from ts_flight_records i
join ts_flight_records a
  on a.fr_date = i.fr_date and a.aircraft = i.aircraft and a.id not like 'fr_imp_%'
where i.id like 'fr_imp_%'
order by i.fr_date desc, i.aircraft, i.off_blocks;

-- ── STEP 2 — DELETE the matched imported duplicates (keeps the app records) ──
-- Only removes an imported row when an app-made row exists for the SAME
-- date + aircraft + off-blocks. Safe: a legacy-only flight (no app match) is kept.
-- Uncomment to run:
--
-- delete from ts_flight_records i
-- using ts_flight_records a
-- where i.id like 'fr_imp_%'
--   and a.id not like 'fr_imp_%'
--   and a.fr_date = i.fr_date
--   and a.aircraft = i.aircraft
--   and coalesce(a.off_blocks,'') = coalesce(i.off_blocks,'');

-- ── STEP 3 — VERIFY: should now return NO rows (no remaining same-day overlap) ──
-- select fr_date,
--        count(*) filter (where id like 'fr_imp_%')     as imported,
--        count(*) filter (where id not like 'fr_imp_%') as app_made
-- from ts_flight_records
-- group by fr_date
-- having count(*) filter (where id like 'fr_imp_%') > 0
--    and count(*) filter (where id not like 'fr_imp_%') > 0
-- order by fr_date desc;
--
-- Any leftover overlap = off-blocks times differ between the two sources. Open the
-- Records tab, filter to that date, and delete the imported ('Imported from legacy…')
-- row by hand with the 🗑 button.
