-- ═══════════════════════════════════════════════════════
-- TrueSouth FMS — Leave Management FIX migration
-- Run this in the Supabase SQL Editor.
--
-- WHY: the app's user IDs are TEXT (e.g. "u_1781145076264", "u_admin"),
-- but the leave/notification tables were created with UUID columns for
-- user references. Inserting a non-UUID string causes a 400 error on
-- "Submit Leave Request" (and silently breaks approvals + notifications).
-- This converts those user-reference columns from UUID to TEXT.
--
-- Safe to run more than once.
-- ═══════════════════════════════════════════════════════

ALTER TABLE ts_leave_requests  ALTER COLUMN user_id     TYPE TEXT;
ALTER TABLE ts_leave_requests  ALTER COLUMN reviewed_by TYPE TEXT;

ALTER TABLE ts_leave_audit     ALTER COLUMN performed_by TYPE TEXT;

ALTER TABLE ts_notifications   ALTER COLUMN user_id      TYPE TEXT;

-- Note: request_id (audit) and reference_id (notifications) still hold the
-- leave-request id, which IS a real UUID, so those are left unchanged.

-- Done!
