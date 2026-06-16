-- ═══════════════════════════════════════════════════════
-- TrueSouth FMS — Leave RLS fix
-- Run this in the Supabase SQL Editor.
--
-- WHY: after the column-type fix, submitting leave now returns
-- 401 "new row violates row-level security policy". The leave tables have
-- Row-Level Security ENABLED but no policy that allows the app (which uses
-- the anon key, like every other table in this app) to insert/update.
--
-- This disables RLS on the three leave-related tables so they behave the
-- same as the rest of the app's tables (ts_manifests, ts_settings, etc.).
--
-- NOTE on security: this app authenticates with its own user system and
-- talks to Supabase with the public anon key for ALL tables, so these three
-- are simply being brought in line with the existing model. If you later move
-- to Supabase Auth, replace this with proper per-user RLS policies instead.
-- ═══════════════════════════════════════════════════════

ALTER TABLE ts_leave_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE ts_leave_audit    DISABLE ROW LEVEL SECURITY;
ALTER TABLE ts_notifications  DISABLE ROW LEVEL SECURITY;

-- ── Alternative (keep RLS ON, allow anon full access) ──
-- If you'd rather keep RLS enabled, comment out the three lines above and
-- run these instead:
--
-- DROP POLICY IF EXISTS anon_all ON ts_leave_requests;
-- CREATE POLICY anon_all ON ts_leave_requests FOR ALL USING (true) WITH CHECK (true);
-- DROP POLICY IF EXISTS anon_all ON ts_leave_audit;
-- CREATE POLICY anon_all ON ts_leave_audit FOR ALL USING (true) WITH CHECK (true);
-- DROP POLICY IF EXISTS anon_all ON ts_notifications;
-- CREATE POLICY anon_all ON ts_notifications FOR ALL USING (true) WITH CHECK (true);

-- Done!
