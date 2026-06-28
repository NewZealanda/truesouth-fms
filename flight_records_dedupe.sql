-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth FMS — De-duplicate flight records (legacy import vs app-made)
-- Run in the Supabase SQL editor. The legacy import ('fr_imp_%') sits ALONGSIDE
-- the flight cards already made in the app, so recent days (e.g. 26–27 Jun 2026)
-- exist in both. Legacy logs whole trips / legs; the app is the live source of
-- truth for the days it was used.
--
-- PLAN: for any AIRCRAFT + DAY the app also recorded, delete the legacy
-- ('fr_imp_%') rows and keep the app rows. Legacy-only aircraft/days are untouched.
-- Steps 1–3 are READ-ONLY previews. Step 4 is the only one that changes data.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── STEP 1 — SUMMARY: which aircraft+days are affected (counts) ──
select i.fr_date, i.aircraft,
       count(distinct i.id) as legacy_to_delete,
       (select count(*) from ts_flight_records a
          where a.id not like 'fr_imp_%' and a.fr_date = i.fr_date and a.aircraft = i.aircraft) as app_kept
from ts_flight_records i
where i.id like 'fr_imp_%'
  and exists (select 1 from ts_flight_records a
                where a.id not like 'fr_imp_%' and a.fr_date = i.fr_date and a.aircraft = i.aircraft)
group by i.fr_date, i.aircraft
order by i.fr_date desc, i.aircraft;

-- ── STEP 2 — EXACTLY what will be DELETED (every legacy row Step 4 removes) ──
select i.fr_date, i.aircraft, i.pic_name,
       i.off_blocks as off, i.on_blocks as "on",
       coalesce(i.route_from,'')||'-'||coalesce(i.route_to,'') as route,
       i.flight_time as h, i.id
from ts_flight_records i
where i.id like 'fr_imp_%'
  and exists (select 1 from ts_flight_records a
                where a.id not like 'fr_imp_%' and a.fr_date = i.fr_date and a.aircraft = i.aircraft)
order by i.fr_date desc, i.aircraft, i.off_blocks;

-- ── STEP 3 — what will STAY (the app rows kept for those same aircraft+days) ──
select a.fr_date, a.aircraft, a.pic_name,
       a.off_blocks as off, a.on_blocks as "on",
       coalesce(a.route_from,'')||'-'||coalesce(a.route_to,'') as route,
       a.flight_time as h, a.id
from ts_flight_records a
where a.id not like 'fr_imp_%'
  and exists (select 1 from ts_flight_records i
                where i.id like 'fr_imp_%' and i.fr_date = a.fr_date and a.aircraft = i.aircraft)
order by a.fr_date desc, a.aircraft, a.off_blocks;

-- ── STEP 4 — DELETE (uncomment to run once you're happy with Steps 2 & 3) ──
-- delete from ts_flight_records i
-- where i.id like 'fr_imp_%'
--   and exists (select 1 from ts_flight_records a
--                 where a.id not like 'fr_imp_%'
--                   and a.fr_date = i.fr_date
--                   and a.aircraft = i.aircraft);

-- ── STEP 5 — VERIFY (after Step 4): should return NO rows ──
-- select fr_date,
--        count(*) filter (where id like 'fr_imp_%')     as imported,
--        count(*) filter (where id not like 'fr_imp_%') as app_made
-- from ts_flight_records
-- group by fr_date
-- having count(*) filter (where id like 'fr_imp_%') > 0
--    and count(*) filter (where id not like 'fr_imp_%') > 0
-- order by fr_date desc;
