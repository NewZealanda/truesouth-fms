-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth — 2026-27 SEASON prices, effective 1 Oct 2026  (marketing sheet, Jul 2026)
--
-- ✅ SAFE TO RUN NOW. This does NOT change today's prices. It:
--   1. Adds "next season" columns to ts_products (next_from + next_price_*).
--   2. Loads the 2026-27 prices into those columns with next_from = 2026-10-01.
--
-- The app + booking page + platform-book edge fn (v29.29+) price by FLIGHT DATE:
-- a booking for ≤ 30 Sep 2026 uses the current price columns; ≥ 1 Oct 2026 uses
-- these next-season prices. No changeover step needed.
--
-- (Next year: a new SQL moves these into the base columns and loads 2027-28 into
--  next_* — ask Claude to generate it from the new price sheet.)
--
-- Sheet notes:
--   THH / FJHH  — no child price on the 2026-27 sheet (2025-26 had $1,599) →
--                 next child = null (POA). EDIT in the Products editor if that
--                 was just an omission.
--   STT / MCHS  — "TBC" → omitted; they stay on current pricing for Oct+ until
--                 you fill their next-season fields in the editor.
--   Mt Asp add on ($349) — an extra, not a bookable product; not modelled.
--   Mapping (GL → MCGL+FJGL, QT OH → QNLS, MCOH inc landing → MCOH, new codes
--   CCFPK/MFOHL/FOXFJ/MCFLB) matches products_prices_2025-26.sql.
--
-- Run in the Supabase SQL editor. Idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.ts_products add column if not exists next_from         date;
alter table public.ts_products add column if not exists next_price_adult  numeric;
alter table public.ts_products add column if not exists next_price_child  numeric;
alter table public.ts_products add column if not exists next_price_infant numeric;

insert into public.ts_products
  (id, name, dest_short, apt, scenic, flyback, active, sort,
   next_from, next_price_adult, next_price_child, next_price_infant)
values
  ('FCF',  'Milford Sound Fly-Cruise-Fly',             'MF','NZMF',false,false,false, 10, '2026-10-01',  875,  725,   0),
  ('MFOH', 'Milford Sound Scenic Flight',              'MF','NZQN',true, false,false, 20, '2026-10-01',  710, null,   0),
  ('FLB',  'Milford Sound One-Way Flight',             'QN','NZQN',false,true, false, 30, '2026-10-01',  599,  549,   0),
  ('CCF',  'Milford Sound Coach-Cruise-Fly',           'QN','NZQN',false,true, false, 40, '2026-10-01',  884,  729, 110),
  ('CCFPK','Milford Sound Coach-Cruise-Fly (Peak)',    'QN','NZQN',false,true, false, 50, '2026-10-01',  894,  845, 120),
  ('MFOHL','Milford Sound Scenic Flight with Landing', 'MF','NZMF',false,false,false, 60, '2026-10-01',  750, null,   0),
  ('ASP',  'Mount Aspiring Scenic Flight',             'QN','NZQN',true, false,false, 70, '2026-10-01',  649, null,   0),
  ('QNLS', 'Queenstown Local Scenic Flight',           'QN','NZQN',true, false,false, 80, '2026-10-01',  449, null,   0),
  ('MCEXP','Aoraki / Mount Cook Expedition',           'MC','NZMC',false,false,false, 90, '2026-10-01', 1049,  995,   0),
  ('THH',  'Tasman Heli Hike',                         'MC','NZMC',false,false,false,100, '2026-10-01', 1995, null,   0),
  ('FJHH', 'Franz Josef Glacier Heli-Hike',            'FJ','NZFJ',false,false,false,110, '2026-10-01', 1995, null,   0),
  ('MCGL', 'Mount Cook Helicopter Glacier Landing',    'MC','NZMC',false,false,false,120, '2026-10-01', 1849, 1599, 699),
  ('FJGL', 'Franz Josef Helicopter Glacier Landing',   'FJ','NZFJ',false,false,false,130, '2026-10-01', 1849, 1599, 699),
  ('MCOH', 'Mount Cook Scenic Flight',                 'MC','NZQN',true, false,false,140, '2026-10-01',  995, null,   0),
  ('FOXFJ','Fox / Franz Josef One-Way Flight',         'FJ','NZFJ',false,false,false,150, '2026-10-01',  995, null,   0),
  ('MCFLB','Mount Cook One-Way Flight',                'MC','NZQN',false,false,false,160, '2026-10-01',  949, null,   0)
  -- STT / MCHS deliberately omitted (TBC on the sheet).
on conflict (id) do update set
  next_from         = excluded.next_from,
  next_price_adult  = excluded.next_price_adult,
  next_price_child  = excluded.next_price_child,
  next_price_infant = excluded.next_price_infant,
  updated_at        = now();

-- Done — the "From 1 Oct 2026" columns appear in Settings ▸ Operations ▸ Products.
