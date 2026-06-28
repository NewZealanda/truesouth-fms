-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth FMS — De-duplicate flight records (legacy import vs app-made)
-- Run in the Supabase SQL editor.
--
-- WHY THE TWO DON'T MATCH 1:1
--   The legacy FlightTable logged each trip as ONE row (e.g. SDB 09:50→13:46 = a
--   full out-and-back), while the app logs each LEG separately (09:50→10:24,
--   13:12→13:47, …). So you can't pair them row-for-row.
--
-- APPROACH
--   For any AIRCRAFT + DAY that the app also recorded, the app's live leg-by-leg
--   entries are the source of truth — so delete the legacy ('fr_imp_%') rows for
--   that aircraft+day and keep the app rows. Aircraft/days that ONLY exist in the
--   legacy import are left untouched.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── STEP 1 — REVIEW: which aircraft+days will be cleaned, and the before/after counts ──
-- imported_to_delete = legacy rows that will be removed; app_kept = app rows that stay.
select i.fr_date, i.aircraft,
       count(distinct i.id) as imported_to_delete,
       (select count(*) from ts_flight_records a
          where a.id not like 'fr_imp_%' and a.fr_date = i.fr_date and a.aircraft = i.aircraft) as app_kept
from ts_flight_records i
where i.id like 'fr_imp_%'
  and exists (select 1 from ts_flight_records a
                where a.id not like 'fr_imp_%' and a.fr_date = i.fr_date and a.aircraft = i.aircraft)
group by i.fr_date, i.aircraft
order by i.fr_date desc, i.aircraft;

-- ── STEP 2 — DELETE the legacy rows for any aircraft+day the app already covers ──
-- Uncomment to run:
--
-- delete from ts_flight_records i
-- where i.id like 'fr_imp_%'
--   and exists (select 1 from ts_flight_records a
--                 where a.id not like 'fr_imp_%'
--                   and a.fr_date = i.fr_date
--                   and a.aircraft = i.aircraft);

-- ── STEP 3 — VERIFY: should return NO rows (no date still has both sources) ──
-- select fr_date,
--        count(*) filter (where id like 'fr_imp_%')     as imported,
--        count(*) filter (where id not like 'fr_imp_%') as app_made
-- from ts_flight_records
-- group by fr_date
-- having count(*) filter (where id like 'fr_imp_%') > 0
--    and count(*) filter (where id not like 'fr_imp_%') > 0
-- order by fr_date desc;
