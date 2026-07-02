-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth — WINTER departure times on the product catalog  (v29.31)
--
-- Products can carry TWO sets of standard departure times:
--   times         — summer / default timetable
--   times_winter  — winter timetable (empty = same as summer)
-- Which set applies is resolved by the FLIGHT date against a global recurring
-- "winter window" (default 1 May – 30 Sep, editable at the top of
-- Settings ▸ Operations ▸ Products; stored in ts_settings key 'platform_cfg').
--
-- Run in the Supabase SQL editor. Idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.ts_products add column if not exists times_winter jsonb default '[]'::jsonb;

-- Done.
