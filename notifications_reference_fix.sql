-- ═══════════════════════════════════════════════════════
-- TrueSouth FMS — notifications reference_id fix
-- Run this in the Supabase SQL Editor.
--
-- WHY: ts_notifications.reference_id is a UUID column. Leave-request ids are UUIDs
-- so those notifications work, but loadsheet ids are text (e.g. "ls_SLA_1718..."),
-- so the PIC loadsheet notification's "Open loadsheet to sign" link couldn't store
-- its id. Changing the column to TEXT lets both work (existing UUID values cast fine).
-- ═══════════════════════════════════════════════════════

ALTER TABLE ts_notifications ALTER COLUMN reference_id TYPE TEXT USING reference_id::text;

-- Done! Loadsheet notifications will now carry the "Open loadsheet to sign" button.
