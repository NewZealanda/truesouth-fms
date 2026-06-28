-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth FMS — Set imported flights' Flt h to BLOCK time (off→on)
-- Run in the Supabase SQL editor. Only touches the legacy import ('fr_imp_%').
--
-- WHY: the import stored Flt h as the old air-switch (Hobbs) hours, but your
-- logbook (and the app's live flights) use OFF→ON block time, which is longer.
-- e.g. Andrew 3 Jun was 2.9 (air-switch) vs 3.5 (block). This recomputes Flt h
-- from each leg's off/on so it matches your logbook.
--
-- TTIS start/end are LEFT AS-IS (already chained from air-switch), and tacho is
-- set to the air-switch delta (end−start) — so airframe hours stay correct while
-- the logged flight time becomes block. ⚠ Do NOT re-run the TTIS-fill after this.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── STEP 1 — PREVIEW: current Flt h vs new block-based Flt h ──
select id, off_blocks as off, on_blocks as "on", flight_time as old_flt,
       round((((split_part(on_blocks,':',1)::int*60+split_part(on_blocks,':',2)::int)
              -(split_part(off_blocks,':',1)::int*60+split_part(off_blocks,':',2)::int)
              +1440)%1440)/60.0,1) as new_flt
from ts_flight_records
where id like 'fr_imp_%' and coalesce(off_blocks,'')<>'' and coalesce(on_blocks,'')<>''
order by fr_date desc, off_blocks
limit 60;

-- ── STEP 2 — APPLY (uncomment to run) ──
-- update ts_flight_records t
-- set flight_time = round((((split_part(on_blocks,':',1)::int*60+split_part(on_blocks,':',2)::int)
--                          -(split_part(off_blocks,':',1)::int*60+split_part(off_blocks,':',2)::int)
--                          +1440)%1440)/60.0,1),
--     tacho = case when start_hours is not null and end_hours is not null
--                  then round((end_hours-start_hours)::numeric,1)
--                  else round((((split_part(on_blocks,':',1)::int*60+split_part(on_blocks,':',2)::int)
--                              -(split_part(off_blocks,':',1)::int*60+split_part(off_blocks,':',2)::int)
--                              +1440)%1440)/60.0,1) end
-- where id like 'fr_imp_%' and coalesce(off_blocks,'')<>'' and coalesce(on_blocks,'')<>'';

-- ── STEP 3 — VERIFY a day (e.g. 3 Jun): block-based total should match your logbook ──
-- select pic_name, count(*) as legs, round(sum(flight_time)::numeric,1) as flt_h
-- from ts_flight_records
-- where id like 'fr_imp_%' and fr_date='2026-06-03'
-- group by pic_name order by pic_name;
