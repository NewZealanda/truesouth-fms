-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth — product prices, 2025-26 SEASON  (from marketing price sheet, Jul 2026)
--
-- Upserts prices into ts_products. ON CONFLICT updates ONLY the price fields
-- (+name/dest defaults on first insert), so anything you've already edited in
-- Settings ▸ Operations ▸ Products (names, times, active, sort) is preserved.
-- All NEW product codes are created active=false — review before publishing.
--
-- ⚠️ MAPPING NOTES (review these rows in the Products editor):
--   GL            → applied to BOTH MCGL (Mt Cook) and FJGL (Franz Josef) glacier
--                   landings. If they price differently, edit one of them.
--   QT OH         → QNLS (Queenstown Local Scenic).
--   MT ASP OH     → ASP (Mount Aspiring Scenic).
--   MCOH inc landing → MCOH. The FMS config treats MCOH as an overhead scenic
--                   (no landing) — if "inc landing" is really a separate product,
--                   add it with its own code.
--   CCF peak      → NEW code CCFPK. If "peak" is a seasonal surcharge rather than
--                   a separately-sold product, delete CCFPK and handle at booking.
--   MFOH with landing → NEW code MFOHL (check: is this actually FEF Fly-Explore-Fly?).
--   One way Fox FJ → NEW code FOXFJ.
--   MC FLB        → NEW code MCFLB (Mount Cook one-way).
--   Mt Asp add on ($299) → SKIPPED: it's an add-on/extra, not a bookable product.
--                   The catalog doesn't model extras yet.
--   NEW codes (CCFPK/MFOHL/FOXFJ/MCFLB) are NOT in the app's operational product
--   config (_RZ_PROD_CFG) — before selling one, tell Claude to add its
--   dest/fuel/burn so the seatmap + loadsheet handle it properly.
--
-- Run in the Supabase SQL editor. Idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.ts_products
  (id, name, dest_short, apt, scenic, flyback, active, sort, price_adult, price_child, price_infant)
values
  -- Milford
  ('FCF',  'Milford Sound Fly-Cruise-Fly',                'MF','NZMF',false,false,false, 10,  795,  645,   0),
  ('MFOH', 'Milford Sound Scenic Flight',                 'MF','NZQN',true, false,false, 20,  650, null,   0),
  ('FLB',  'Milford Sound One-Way Flight',                'QN','NZQN',false,true, false, 30,  550,  500,   0),
  ('CCF',  'Milford Sound Coach-Cruise-Fly',              'QN','NZQN',false,true, false, 40,  819,  665, 100),
  ('CCFPK','Milford Sound Coach-Cruise-Fly (Peak)',       'QN','NZQN',false,true, false, 50,  839,  685, 110),
  ('MFOHL','Milford Sound Scenic Flight with Landing',    'MF','NZMF',false,false,false, 60,  700, null,   0),
  -- Queenstown / Aspiring
  ('ASP',  'Mount Aspiring Scenic Flight',                'QN','NZQN',true, false,false, 70,  650, null,   0),
  ('QNLS', 'Queenstown Local Scenic Flight',              'QN','NZQN',true, false,false, 80,  400, null,   0),
  -- Mount Cook / glaciers
  ('MCEXP','Aoraki / Mount Cook Expedition',              'MC','NZMC',false,false,false, 90,  945,  785,   0),
  ('THH',  'Tasman Heli Hike',                            'MC','NZMC',false,false,false,100, 1799, 1599,   0),
  ('FJHH', 'Franz Josef Glacier Heli-Hike',               'FJ','NZFJ',false,false,false,110, 1799, 1599,   0),
  ('MCGL', 'Mount Cook Helicopter Glacier Landing',       'MC','NZMC',false,false,false,120, 1599, 1250, 699),
  ('FJGL', 'Franz Josef Helicopter Glacier Landing',      'FJ','NZFJ',false,false,false,130, 1599, 1250, 699),
  ('MCOH', 'Mount Cook Scenic Flight',                    'MC','NZQN',true, false,false,140,  895,  735,   0),
  ('FOXFJ','Fox / Franz Josef One-Way Flight',            'FJ','NZFJ',false,false,false,150,  950, null,   0),
  ('MCFLB','Mount Cook One-Way Flight',                   'MC','NZQN',false,false,false,160,  800, null,   0),
  -- Alpine specials
  ('STT',  'Ski the Tasman',                              'MC','NZMC',false,false,false,170, 2495, null,   0),
  ('MCHS', 'Mount Cook Heli-Ski',                         'MC','NZMC',false,false,false,180, 2695, null,   0)
on conflict (id) do update set
  price_adult  = excluded.price_adult,
  price_child  = excluded.price_child,
  price_infant = excluded.price_infant,
  updated_at   = now();

-- Done — prices appear in Settings ▸ Operations ▸ Products immediately (realtime).
