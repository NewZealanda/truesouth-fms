-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth FMS — NATIVE bookings store  (Phase 0 of the bespoke booking platform)
--
-- Goal: OWN THE BOOKING DATA, while COEXISTING with Rezdy. Rezdy bookings keep
-- flowing into `ts_rezdy_bookings` (via the edge fn + webhook). This table holds
-- bookings we create IN-HOUSE (direct web, agent, walk-in/phone) that don't exist
-- in Rezdy. The app reads BOTH and merges them (native wins on order-number clash),
-- so nothing about the calendar / seatmap / loadsheet rendering changes.
--
-- Row shape deliberately MIRRORS ts_rezdy_bookings: one row per (order, tour date),
-- with the canonical booking object in a JSON `data` blob — so the existing
-- _rzMapBookings / _rzRow readers consume it unchanged. Normalised product / session
-- / payment tables come in later phases (see PLATFORM_ROADMAP.md); the blob keeps
-- Phase 0 zero-risk to the read path.
--
-- Idempotent — safe to re-run. Run in the Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.ts_native_bookings (
  id           text primary key,            -- "<order_number>__<tour_date>" (mirrors ts_rezdy_bookings)
  order_number text not null,               -- native order id, e.g. "TS-000123" (in-house prefix, never clashes with Rezdy "TSF…")
  tour_date    date not null,               -- NZ-local flight date (drives the per-date load)
  source       text default 'native',       -- 'direct' | 'agent' | 'manual' | 'web' | 'native'
  status       text default 'CONFIRMED',    -- mirrors Rezdy status strings ('CONFIRMED','CANCELLED',…) for filters
  data         jsonb not null,              -- canonical booking object (SAME shape as ts_rezdy_bookings.data)
  created_by   text,                        -- user id of the desk/agent who created it
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists ts_native_bookings_date_idx  on public.ts_native_bookings (tour_date);
create index if not exists ts_native_bookings_order_idx on public.ts_native_bookings (order_number);

alter table public.ts_native_bookings enable row level security;

-- Everyone signed-in can READ (same as the Rezdy bookings + operations state).
drop policy if exists native_bookings_read on public.ts_native_bookings;
create policy native_bookings_read on public.ts_native_bookings
  for select to authenticated using (true);

-- CREATE / UPDATE / DELETE = booking-desk roles only (operations, cx_manager, admins).
drop policy if exists native_bookings_write on public.ts_native_bookings;
create policy native_bookings_write on public.ts_native_bookings
  for all to authenticated
  using      (public.app_role() in ('operations','desk','cx_manager','admin','superadmin'))
  with check (public.app_role() in ('operations','desk','cx_manager','admin','superadmin'));

-- Table-level privileges (Postgres checks these BEFORE RLS; without them PostgREST 401s).
grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on public.ts_native_bookings to authenticated;

-- Live cross-device sync: add to the realtime publication so inserts/updates broadcast
-- (same treatment as the other operational tables). Guarded so re-running never errors.
do $$
begin
  begin
    alter publication supabase_realtime add table public.ts_native_bookings;
  exception
    when duplicate_object then null;   -- already in the publication
    when undefined_object then null;   -- publication not present (self-hosted) — skip
  end;
end $$;

-- Done.
