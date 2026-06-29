-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth FMS — new columns for Equipment photos + Ops Notice active date range
-- Run AFTER fix_uuid_user_columns.sql, in the Supabase SQL editor. Safe + idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

-- Equipment: photo attachments
alter table public.ts_equipment   add column if not exists photos jsonb default '[]'::jsonb;

-- Ops Notices: active notices carry a start + end date (ongoing/closed use date_issued)
alter table public.ts_ops_notices add column if not exists start_date date;
alter table public.ts_ops_notices add column if not exists end_date   date;

-- Done.
