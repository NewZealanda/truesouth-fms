-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth FMS — Re-attribute mis-imported legacy flights off the wrong pilots' logbooks.
-- Moves IMPORTED flights (id like 'fr_imp_%') dated BEFORE a pilot started onto a shared
-- "legacy pilot" placeholder. Aircraft hours / maintenance are unaffected (those sum by aircraft,
-- not by pilot). Run in the Supabase SQL editor.
--
-- ▶ EDIT the (name, start_date) list below — full names EXACTLY as in the profile.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── STEP 1 — PREVIEW: how many imported flights would move off each pilot ──
with affected as (
  select u.id as uid, u.name, s.start_date
  from (values
    ('FULL NAME 1','2025-01-01'::date),
    ('FULL NAME 2','2024-11-01'::date)
    -- add more rows: ,('Full Name','YYYY-MM-DD')
  ) s(name,start_date)
  join ts_users u on u.name = s.name
)
select a.name, a.start_date, count(*) as flights_to_move,
       min(f.fr_date) as earliest, max(f.fr_date) as latest
from ts_flight_records f
join affected a on f.user_id = a.uid
where f.id like 'fr_imp_%' and f.fr_date < a.start_date
group by a.name, a.start_date
order by a.name;

-- ── STEP 2 — APPLY (uncomment after checking the preview) ──
-- with affected as (
--   select u.id as uid, s.start_date
--   from (values
--     ('FULL NAME 1','2025-01-01'::date),
--     ('FULL NAME 2','2024-11-01'::date)
--   ) s(name,start_date)
--   join ts_users u on u.name = s.name
-- )
-- update ts_flight_records f
-- set user_id = '00000000-0000-0000-0000-0000000000ff',   -- shared legacy placeholder
--     pic_name = 'Legacy pilot'
-- from affected a
-- where f.user_id = a.uid and f.id like 'fr_imp_%' and f.fr_date < a.start_date;

-- Done. (Admins can later rename the "Legacy pilot" logbook, or re-home individual flights in
--  Data Recording ▸ Records.)
