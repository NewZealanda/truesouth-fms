-- ============================================================================
-- FIX: user account saves fail under Phase C (e.g. "Kasey Willis" won't save)
-- ============================================================================
-- This is the verified, live state. Safe to re-run (idempotent).
--
-- Root cause chain (diagnosed empirically):
--   1. Phase A revokes SELECT on ts_users from anon/authenticated to hide password
--      hashes (RLS is NOT relied on for this — a direct SELECT still leaked 20 rows,
--      so grant-level revocation is the real protection).
--   2. The app wrote users via PostgREST upsert (Prefer: resolution=merge-duplicates),
--      which becomes INSERT ... ON CONFLICT DO UPDATE. Postgres requires *table-level*
--      SELECT for ON CONFLICT, so every save failed with 42501 "permission denied for
--      table ts_users".
--   3. We can't grant table SELECT back without exposing hashes (RLS doesn't block
--      reads here). So the client (v22.99+) no longer upserts: it INSERTs new users and
--      PATCHes (UPDATE by id) existing ones. Those need only INSERT/UPDATE + SELECT(id).
--
-- Verified as the authenticated superadmin:
--   plain INSERT: OK | dup INSERT: 23505 (client PATCHes) | UPDATE by id: OK
--   READ password_hash: DENIED (good)
-- ============================================================================

-- Hide password hashes from clients at the GRANT level (works even if RLS is off).
revoke select on public.ts_users from anon, authenticated;

-- But allow reading the id column only, so PATCH (UPDATE ... WHERE id=...) can run.
grant select (id) on public.ts_users to authenticated;

-- The signed-in role needs to write rows.
grant insert, update, delete on public.ts_users to authenticated;

-- RLS: keep enabled; only admins/superadmins may create/update user rows.
alter table public.ts_users enable row level security;

drop policy if exists ts_users_admin_insert on public.ts_users;
drop policy if exists ts_users_admin_update on public.ts_users;
drop policy if exists ts_users_admin_write  on public.ts_users;  -- older name, if present

create policy ts_users_admin_insert on public.ts_users
  for insert to authenticated
  with check (public.app_role() in ('admin','superadmin'));

create policy ts_users_admin_update on public.ts_users
  for update to authenticated
  using      (public.app_role() in ('admin','superadmin'))
  with check (public.app_role() in ('admin','superadmin'));

-- VERIFY (optional): should show the two policies, and grants without full SELECT.
select polname,
       case polcmd when 'a' then 'INSERT' when 'w' then 'UPDATE' else polcmd::text end as cmd
from pg_policy where polrelid='public.ts_users'::regclass order by polname;
