-- ============================================================================
-- Allow ts_notifications.reference_id to hold non-UUID ids (loadsheet ids like
-- 'ls_rz_SLA_1718…').
-- ============================================================================
-- The "loadsheet created for you" notification stores the loadsheet id in reference_id so the
-- "Open loadsheet →" button can jump straight to it. Loadsheet ids are TEXT, but the column was
-- created as uuid, so the insert with the id silently failed and the app retried WITHOUT it —
-- leaving the notification with no link (the Open button then doesn't appear / can't navigate).
--
-- This changes reference_id to text. Existing uuid values (e.g. leave-request references) are
-- preserved as their text form and continue to work, since the client only ever uses the value
-- as an opaque string. Idempotent: only alters if the column is still uuid.
--
-- DRY-RUN (inspect, change nothing):   begin;  <DO block>  ; rollback;
-- ============================================================================
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='ts_notifications'
      and column_name='reference_id' and data_type='uuid'
  ) then
    alter table public.ts_notifications
      alter column reference_id type text using reference_id::text;
  end if;
end$$;

-- Verify the resulting type (expect: reference_id | text)
select column_name, data_type
from information_schema.columns
where table_schema='public' and table_name='ts_notifications' and column_name='reference_id';
