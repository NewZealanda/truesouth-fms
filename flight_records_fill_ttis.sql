-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth FMS — Fill TTIS start/end on the split (leg) import records
-- Run in the Supabase SQL editor. Only touches the legacy import ('fr_imp_%').
--
-- Each trip's legs are chained: leg start = trip's recorded start TTIS plus the
-- sum of earlier legs' tacho; leg end = leg start + this leg's tacho. So e.g.
-- Lily 7638.3 + 0.6 = 7638.9 (L1 end = L2 start), then 7638.9 + 0.6 = 7639.5.
-- (tacho = the apportioned per-leg flight time already stored.)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── STEP 1 — PREVIEW: what each leg's start/end will become ──
with legs as (
  select id, start_hours, end_hours, flight_time,
         regexp_replace(id,'_L[0-9]+$','') as trip,
         coalesce(nullif(substring(id from '_L([0-9]+)$'),'')::int,1) as legn
  from ts_flight_records where id like 'fr_imp_%'
),
calc as (
  select id, legn, flight_time, start_hours as old_start, end_hours as old_end,
         max(start_hours) over (partition by trip) as s0,
         coalesce(sum(flight_time) over (partition by trip order by legn
                   rows between unbounded preceding and 1 preceding),0) as ft_before,
         sum(flight_time) over (partition by trip order by legn
                   rows between unbounded preceding and current row) as ft_incl
  from legs
)
select id, legn, flight_time as tacho, old_start, old_end,
       round((s0+ft_before)::numeric,1) as new_start,
       round((s0+ft_incl)::numeric,1)   as new_end
from calc
where s0 is not null
order by id
limit 60;

-- ── STEP 2 — APPLY (uncomment to run) ──
-- with legs as (
--   select id, start_hours, flight_time,
--          regexp_replace(id,'_L[0-9]+$','') as trip,
--          coalesce(nullif(substring(id from '_L([0-9]+)$'),'')::int,1) as legn
--   from ts_flight_records where id like 'fr_imp_%'
-- ),
-- calc as (
--   select id, flight_time,
--          max(start_hours) over (partition by trip) as s0,
--          coalesce(sum(flight_time) over (partition by trip order by legn
--                    rows between unbounded preceding and 1 preceding),0) as ft_before,
--          sum(flight_time) over (partition by trip order by legn
--                    rows between unbounded preceding and current row) as ft_incl
--   from legs
-- )
-- update ts_flight_records t
-- set start_hours = round((c.s0 + c.ft_before)::numeric,1),
--     end_hours   = round((c.s0 + c.ft_incl)::numeric,1),
--     tacho       = c.flight_time
-- from calc c
-- where t.id = c.id and c.s0 is not null;
