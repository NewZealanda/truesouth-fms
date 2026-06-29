-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth FMS — REAL fix for "Upload rejected (HTTP 400)" on Prestart + Ops Notices
-- Server error:  22P02  invalid input syntax for type uuid: "u_admin"
--
-- CAUSE: TrueSouth user ids are TEXT (e.g. 'u_admin'), but these columns were
-- declared `uuid`, so Postgres rejects every insert.
--
-- Postgres won't alter a column that an RLS policy references, so we DROP the
-- dependent policies, change the column to text, then RECREATE the policies
-- (identical logic — the ::text cast is a no-op once the column is text).
--
-- Safe + idempotent. Run the whole script in the Supabase SQL editor.
-- (You do NOT need fix_feature_table_grants.sql.)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── ts_vehicle_prestarts.user_id ──────────────────────────────────────────────
drop policy if exists veh_prestart_update on public.ts_vehicle_prestarts;
alter table public.ts_vehicle_prestarts alter column user_id type text using user_id::text;
create policy veh_prestart_update on public.ts_vehicle_prestarts for update to authenticated
  using      (public.app_role() in ('admin','superadmin') or user_id::text = public.app_id())
  with check (public.app_role() in ('admin','superadmin') or user_id::text = public.app_id());

-- ── ts_ops_notices.issued_by_id (no policy references it) ─────────────────────
alter table public.ts_ops_notices alter column issued_by_id type text using issued_by_id::text;

-- ── ts_ops_notice_reads.user_id ──────────────────────────────────────────────
drop policy if exists ops_reads_write on public.ts_ops_notice_reads;
alter table public.ts_ops_notice_reads alter column user_id type text using user_id::text;
create policy ops_reads_write on public.ts_ops_notice_reads for all to authenticated
  using      (user_id::text = public.app_id() or public.app_role() in ('admin','superadmin'))
  with check (user_id::text = public.app_id() or public.app_role() in ('admin','superadmin'));

-- Verify (should all read 'text'):
select table_name, column_name, data_type
from information_schema.columns
where table_schema='public'
  and ((table_name='ts_vehicle_prestarts' and column_name='user_id')
    or (table_name='ts_ops_notices'        and column_name='issued_by_id')
    or (table_name='ts_ops_notice_reads'   and column_name='user_id'));

-- Done. Retry a Prestart and an Ops Notice — they should now upload (✓).
