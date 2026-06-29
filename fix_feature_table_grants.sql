-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth FMS — fix writes on the new feature tables
-- Symptom: Vehicle Prestart + Ops Notices (and likely Equipment / Visitors /
--          Flight Following) save locally but say "saved on this device — will
--          sync later" and vanish on refresh, i.e. the INSERT is rejected.
--
-- Most likely cause: the `authenticated` (and `anon`) roles never received
-- table-level INSERT/UPDATE/DELETE privileges on these newer tables, so Postgres
-- raises "permission denied for table" BEFORE RLS is even evaluated, and
-- PostgREST returns 401/403. RLS still governs WHICH rows — these grants only
-- restore the baseline privilege Supabase normally sets by default.
--
-- Safe + idempotent: re-running does nothing harmful. Run in the Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════

grant usage on schema public to authenticated, anon;

grant select, insert, update, delete on
  public.ts_vehicle_prestarts,
  public.ts_ops_notices,
  public.ts_ops_notice_reads,
  public.ts_equipment,
  public.ts_visitors,
  public.ts_flight_following,
  public.ts_notifications
to authenticated;

-- Read-only for anon (login screen / pre-auth) is not required, but harmless to allow select.
grant select on
  public.ts_ops_notices,
  public.ts_flight_following
to anon;

-- Any identity/serial sequences these tables use.
grant usage, select on all sequences in schema public to authenticated;

-- Make sure future tables created here also inherit the grant (matches Supabase default).
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

-- Done. After running this, retry a Vehicle Prestart and an Ops Notice — they should
-- now upload (the toast will say "submitted ✓" / "issued ✓" instead of "saved on device").
