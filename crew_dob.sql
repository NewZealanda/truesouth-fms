-- ═══════════════════════════════════════════════════════════════════════════
-- ts_crew — birthday + type-ratings columns
-- The person-profile save writes `dob` (birthday, drives the birthday plane/greeting)
-- and `type_ratings` (JSON string, e.g. ["C208B","GA8"]). Without these columns the
-- write fails and the value never persists (it flashes in, then the realtime crew
-- reload wipes it). Idempotent — safe to re-run.
--
-- Run in the Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.ts_crew add column if not exists dob date;
alter table public.ts_crew add column if not exists type_ratings text;

-- Done.
