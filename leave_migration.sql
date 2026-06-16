-- ═══════════════════════════════════════════════════════
-- TrueSouth FMS — Leave Management Migration
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- 1. Leave Requests
CREATE TABLE IF NOT EXISTS ts_leave_requests (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL,
  user_name       TEXT,
  user_role       TEXT,
  leave_type      TEXT NOT NULL CHECK (leave_type IN ('annual','sick','unpaid','other')),
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  total_days      NUMERIC(4,1) DEFAULT 1,
  partial_day     BOOLEAN DEFAULT false,
  partial_type    TEXT,           -- 'am' | 'pm'
  reason          TEXT,
  status          TEXT DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','declined','withdrawn')),
  admin_comment   TEXT,
  submitted_at    TIMESTAMPTZ DEFAULT now(),
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     UUID,
  reviewed_by_name TEXT
);

CREATE INDEX IF NOT EXISTS ts_leave_requests_user_id  ON ts_leave_requests (user_id);
CREATE INDEX IF NOT EXISTS ts_leave_requests_status   ON ts_leave_requests (status);
CREATE INDEX IF NOT EXISTS ts_leave_requests_dates    ON ts_leave_requests (start_date, end_date);

-- 2. Audit Trail
CREATE TABLE IF NOT EXISTS ts_leave_audit (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id       UUID REFERENCES ts_leave_requests(id) ON DELETE CASCADE,
  action           TEXT NOT NULL,   -- 'submitted' | 'approved' | 'declined' | 'withdrawn'
  performed_by     UUID,
  performed_by_name TEXT,
  comment          TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ts_leave_audit_request_id ON ts_leave_audit (request_id);

-- 3. In-App Notifications
CREATE TABLE IF NOT EXISTS ts_notifications (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL,
  type          TEXT NOT NULL,   -- 'leave_submitted' | 'leave_approved' | 'leave_declined'
  message       TEXT,
  reference_id  UUID,
  read          BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ts_notifications_user_id ON ts_notifications (user_id);
CREATE INDEX IF NOT EXISTS ts_notifications_read    ON ts_notifications (user_id, read);

-- Done!
