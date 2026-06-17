-- ============================================================================
-- TrueSouth FMS — Supabase Auth migration: PHASE 0 + PHASE A
-- ============================================================================
-- Run in the Supabase SQL editor.  This is the "close the password-hash leak"
-- step.  It is SAFE to run before any client changes: the app keeps working on
-- the anon key because the only table we lock down (ts_users) is replaced for
-- the client by the ts_users_public view (no hash).  Password verification +
-- writes move to the verify-login / set-password Edge Functions.
--
-- BEFORE RUNNING:
--   1. Take a database backup (Dashboard -> Database -> Backups).
--   2. Deploy the Edge Functions (supabase functions deploy verify-login set-password).
--   3. Do this on a NON-production project / the test data first if possible.
--
-- A paired ROLLBACK script is at the bottom (commented out).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PHASE 0 — profiles mapping + role helpers (inert; nothing reads them yet)
-- ----------------------------------------------------------------------------

-- Maps a future Supabase Auth user (uuid) to the app's existing TEXT id + role.
-- Used in Phase C; created now so the schema is ready and reviewable.
create table if not exists public.profiles (
  auth_uid   uuid primary key references auth.users(id) on delete cascade,
  app_id     text unique not null,          -- e.g. 'u_admin'
  role       text not null default 'desk',
  email      text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (auth_uid = auth.uid());

-- Helper functions usable inside RLS policies (Phase B/C).
create or replace function public.app_id() returns text
  language sql stable as $$ select app_id from public.profiles where auth_uid = auth.uid() $$;

create or replace function public.app_role() returns text
  language sql stable as $$ select role from public.profiles where auth_uid = auth.uid() $$;

-- ----------------------------------------------------------------------------
-- PHASE A — lock down ts_users, expose a hash-free view
-- ----------------------------------------------------------------------------

-- Hash-free projection the browser is allowed to read.
-- NOTE: adjust the column list to your real ts_users schema. It must NOT include
-- password_hash, reset_token, or reset_expires.
create or replace view public.ts_users_public as
  select
    id,
    name,
    email,
    role,
    linked_crew,
    weight,
    is_pilot,
    inactive
  from public.ts_users;

-- Turn on RLS and remove direct anon/authenticated access to the base table.
-- (Edge Functions use the service_role key, which bypasses RLS, so login + admin
-- password writes keep working through verify-login / set-password.)
alter table public.ts_users enable row level security;

revoke all on public.ts_users from anon, authenticated;

-- The browser reads users through the safe view instead.
grant select on public.ts_users_public to anon, authenticated;

-- IMPORTANT: ts_users is in the realtime publication and streams change events to
-- every anon client. With RLS on and no SELECT policy, realtime will no longer leak
-- user rows. In the client you should ALSO drop 'ts_users' from the initRealtime
-- subscription list (Phase A client change) so it stops trying to subscribe to it.

-- ============================================================================
-- VERIFY (run these to confirm the leak is closed):
--   -- As anon (e.g. from the browser console on the deployed app):
--   --   await fetch(SB+'/rest/v1/ts_users?select=*',{headers:SH}).then(r=>r.json())
--   -- Expect: [] or a permission error (NOT a list of password hashes).
--   -- And the view should work:
--   --   await fetch(SB+'/rest/v1/ts_users_public?select=*',{headers:SH}).then(r=>r.json())
--   -- Expect: rows with no password_hash column.
-- ============================================================================


-- ============================================================================
-- ROLLBACK (uncomment to revert Phase A if needed — restores the old open access)
-- ============================================================================
-- grant select, insert, update, delete on public.ts_users to anon, authenticated;
-- alter table public.ts_users disable row level security;
-- drop view if exists public.ts_users_public;
-- -- Phase 0 (optional to keep; harmless if left in place):
-- -- drop function if exists public.app_role();
-- -- drop function if exists public.app_id();
-- -- drop table if exists public.profiles;
