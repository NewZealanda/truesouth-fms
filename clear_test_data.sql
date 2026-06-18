-- ============================================================================
-- Clear test data — run in the Supabase SQL editor (service role bypasses RLS).
-- Wipes ALL notifications (every user) and ALL leave requests + their audit trail.
-- Safe to re-run. Does NOT touch crew, aircraft, loadsheets, manifests or the roster.
-- ============================================================================

-- 1. Notifications for everyone (bell clears for all users on their next poll, ~10s).
delete from public.ts_notifications;

-- 2. Leave requests + their per-request audit history.
--    (ts_leave_audit references the request; delete it first to avoid FK errors.)
delete from public.ts_leave_audit;
delete from public.ts_leave_requests;

-- Optional sanity check — should all return 0:
-- select count(*) from public.ts_notifications;
-- select count(*) from public.ts_leave_requests;
-- select count(*) from public.ts_leave_audit;

-- NOTE: leave that was approved during testing was auto-stamped onto the roster.
-- Deleting the requests above does NOT remove those roster stamps. If your test leave
-- left 'leave'/'sick'/'training' marks on the roster, clear them on the Roster tab
-- (or tell Claude the date range + person and they can script a roster cleanup).
