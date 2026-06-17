-- ============================================================================
-- Phase C — Provision Auth users + profiles for existing accounts
-- ============================================================================
-- Two steps. Step 1 (create auth.users) is done via the Admin API — Supabase does
-- not support inserting into auth.users from plain SQL. Step 2 (map them to app ids)
-- is the SQL below, matching on email.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1 — create an Auth user per existing ts_users row (run ONCE, service role).
-- Random passwords; real passwords carry over lazily on first login via migrate-login.
-- Save as scripts/provision_auth_users.mjs and run with:  node provision_auth_users.mjs
-- ----------------------------------------------------------------------------
/*
import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: users } = await sb.from("ts_users").select("id,email,role");
for (const u of users ?? []) {
  if (!u.email) continue;
  const rnd = crypto.randomUUID() + crypto.randomUUID();         // throwaway password
  const { data, error } = await sb.auth.admin.createUser({
    email: u.email, password: rnd, email_confirm: true,
  });
  if (error && !String(error.message).includes("already")) { console.error(u.email, error.message); continue; }
  console.log("ok", u.email);
}
// Then run STEP 2 below to backfill profiles (or rely on the email-join insert).
*/

-- ----------------------------------------------------------------------------
-- STEP 2 — map each Auth user to its app id + role (run AFTER step 1).
-- Joins auth.users to ts_users on email; app_id stays the existing TEXT id.
-- ----------------------------------------------------------------------------
insert into public.profiles (auth_uid, app_id, role, email)
select au.id, tu.id, coalesce(tu.role, 'desk'), tu.email
from auth.users au
join public.ts_users tu on lower(au.email) = lower(tu.email)
on conflict (auth_uid) do update
  set app_id = excluded.app_id,
      role   = excluded.role,
      email  = excluded.email;

-- ----------------------------------------------------------------------------
-- VERIFY the mapping is complete and unambiguous BEFORE swapping policies:
--   -- every Auth user has a profile:
--   select au.email from auth.users au
--     left join public.profiles p on p.auth_uid = au.id where p.auth_uid is null;
--   -- app_ids are unique and match ts_users:
--   select app_id, count(*) from public.profiles group by app_id having count(*) > 1;
--   select p.app_id from public.profiles p
--     left join public.ts_users tu on tu.id = p.app_id where tu.id is null;
-- All three should return zero rows.
-- ----------------------------------------------------------------------------

-- ROLLBACK: delete from public.profiles;  (and delete the auth.users via the Admin API)
