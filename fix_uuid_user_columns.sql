-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth FMS — REAL fix for the "Upload rejected (HTTP 400)" on Prestart + Ops Notices
-- Server error was:  22P02  invalid input syntax for type uuid: "u_admin"
--
-- CAUSE: TrueSouth user ids are TEXT (e.g. 'u_admin', crew codes), but these
-- columns were mistakenly declared `uuid`. Postgres rejects the insert.
-- This is the same issue already fixed for ts_notifications.user_id earlier.
--
-- FIX: change the three offending columns to text. RLS policies use
-- `user_id::text = app_id()`, which keeps working after the change.
--
-- Safe + idempotent. Run in the Supabase SQL editor.
-- (You do NOT need fix_feature_table_grants.sql — this is the actual fix.)
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.ts_vehicle_prestarts alter column user_id      type text using user_id::text;
alter table public.ts_ops_notices        alter column issued_by_id type text using issued_by_id::text;
alter table public.ts_ops_notice_reads   alter column user_id      type text using user_id::text;

-- Verify (should all read 'text'):
select table_name, column_name, data_type
from information_schema.columns
where table_schema='public'
  and ((table_name='ts_vehicle_prestarts' and column_name='user_id')
    or (table_name='ts_ops_notices'        and column_name='issued_by_id')
    or (table_name='ts_ops_notice_reads'   and column_name='user_id'));

-- Done. Retry a Prestart and an Ops Notice — they should now upload (✓).
