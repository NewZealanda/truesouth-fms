-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth — auto-fill product DEPARTURE TIMES from Rezdy booking history
--
-- Derives each product's real timetable from the last ~13 months of synced
-- bookings (ts_rezdy_bookings): every departure time that ran on 3+ distinct
-- dates in a season becomes part of that product's timetable. Times on dates
-- inside the winter window (01 May – 30 Sep) fill ❄ times_winter; the rest fill
-- ☀ times. If a product's winter list ends up identical to summer, winter is
-- blanked (blank = same as summer).
--
-- Product-name → code mapping mirrors the app's _RZ_PROD_MAP.
--
-- ⚠️ OVERWRITES the times/times_winter of any product that has history (products
--    with no matching history are left untouched). Review the result in
--    Settings ▸ Operations ▸ Products and prune anything odd (e.g. one-off
--    charter times) — the 3-distinct-dates threshold filters most noise.
--
-- Run in the Supabase SQL editor. Idempotent (re-running recomputes).
-- ═══════════════════════════════════════════════════════════════════════════

with bk as (
  select b.tour_date,
         (it->>'startTimeLocal') as stl,
         (it->>'product')        as pname
  from public.ts_rezdy_bookings b,
       jsonb_array_elements(coalesce(b.data->'items','[]'::jsonb)) it
  where b.tour_date >= current_date - 400
    and coalesce(b.status, b.data->>'status', '') not ilike '%cancel%'
    and coalesce(b.data->>'status','')            not ilike '%abandoned%'
),
mapped as (
  select tour_date,
         substring(stl from 'T(\d{2}:\d{2})') as tm,
         case
           when pname ~* 'one.?way'                             then 'FLB'
           when pname ~* 'coach.*cruise.*fly'                   then 'CCF'
           when pname ~* 'coach.*cruise.*coach'                 then 'CCC'
           when pname ~* 'fly.*cruise.*fly'                     then 'FCF'
           when pname ~* 'fly.*explore.*fly'                    then 'FEF'
           when pname ~* 'expedition.*(cook|aoraki)|aoraki.*cook' then 'MCEXP'
           when pname ~* 'helihike.*franz|franz.*helihike'      then 'FJHH'
           when pname ~* 'helihike.*tasman|tasman.*helihike'    then 'THH'
           when pname ~* 'franz.*helic.*glacier.*land'          then 'FJGL'
           when pname ~* 'franz.*scenic'                        then 'FJOH'
           when pname ~* 'milford.*scenic'                      then 'MFOH'
           when pname ~* '(mount|mt).*cook.*helic.*glacier'     then 'MCGL'
           when pname ~* '(mount|mt).*cook.*scenic'             then 'MCOH'
           when pname ~* 'aspiring'                             then 'ASP'
           when pname ~* 'queenstown.*local.*scenic'            then 'QNLS'
           when pname ~* 'branches'                             then 'BRA'
           when pname ~* 'heliski'                              then 'MCHS'
           when pname ~* 'ski.*tasman'                          then 'STT'
           when pname ~* '^charter'                             then 'CHT'
           else upper(coalesce(pname,''))
         end as code,
         case when to_char(tour_date,'MM-DD') between '05-01' and '09-30'
              then 'winter' else 'summer' end as season
  from bk
),
freq as (
  select code, season, tm, count(distinct tour_date) as days
  from mapped
  where tm is not null and code <> 'CHT'          -- charters have no timetable
  group by 1,2,3
),
agg as (
  select code, season, jsonb_agg(tm order by tm) as times
  from freq
  where days >= 3                                 -- ran on 3+ distinct dates = real slot
  group by 1,2
)
update public.ts_products p set
  times        = coalesce((select a.times from agg a where a.code=p.id and a.season='summer'), p.times),
  times_winter = coalesce((select a.times from agg a where a.code=p.id and a.season='winter'), p.times_winter),
  updated_at   = now()
where exists (select 1 from agg a where a.code=p.id);

-- Blank winter where it matches summer (blank = same as summer).
update public.ts_products
  set times_winter='[]'::jsonb
  where times_winter = times;

-- Review what was set:
select id, name, times as summer_times, times_winter as winter_times
from public.ts_products
order by sort, id;
