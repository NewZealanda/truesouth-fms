# TrueSouth FMS — Auth Migration Runbook (do-this-in-order)

Plain-English steps to move from "anon key, RLS off" to full Supabase Auth. **You run these
yourself** (Supabase dashboard / SQL editor / a deploy). Nobody logs in on anyone's behalf.
Do everything on the **test site first**, verify, then repeat the flips on production.

Legend: 🟢 = safe/reversible · ⚠️ = the step that changes behaviour · ✅ = verify before moving on.

---

> **Free tier note.** This whole migration runs on Supabase's **free plan** — Auth, RLS, and Edge
> Functions are all included. Two free-tier specifics: (a) there are **no managed backups** (see
> Step 0 for the manual method), and (b) the Phase C **access-token hook is optional** — the
> `app_id()/app_role()` helpers fall back to a `profiles` lookup, so you can skip the hook entirely
> and lose nothing but a tiny bit of efficiency.

## STEP 0 — Safety net (once, ~5 min) 🟢
1. **Back up the database (manual on free tier — the dashboard Backups page is paid-only).**
   In the dashboard click **Connect** → copy the **URI**, then in a terminal run ONE of:
   ```
   pg_dump "postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres" > truesouth_backup_$(date +%F).sql
   # or, with the Supabase CLI you already use:
   supabase db dump --linked -f truesouth_backup.sql
   ```
   (Reassurance: every step below is reversible and nothing deletes data until the final optional
   "retire columns" step — so this backup is belt-and-suspenders.)
2. Supabase → Authentication → Users → **Add user** → make yourself a **break-glass admin**
   (an email + password you control). This is your "get back in" account if a policy misfires.

---

## PHASE A — close the password-hash leak

3. Deploy the three Edge Functions (terminal, in the repo):
   ```
   supabase functions deploy verify-login set-password confirm-reset
   ```
4. Supabase → SQL editor → paste & run **`auth_migration_phase0A.sql`**.
   (Creates the hash-free `ts_users_public` view and revokes read access to the real table.)
   ✅ In a browser console on the app, run:
   `await fetch(SB+'/rest/v1/ts_users?select=*',{headers:SH}).then(r=>r.json())`
   → should return an error or `[]` (no password hashes). The view should still work:
   `await fetch(SB+'/rest/v1/ts_users_public?select=*',{headers:SH}).then(r=>r.json())` → rows, no hash.
5. ⚠️ In `modules/shared.js` set **`AUTH_PHASE_A = true`**, bump `APP_VER`, run `python3 build.py`,
   commit, push (test branch first).
   ✅ On the test site: log in; change your password; do a "forgot password" reset; edit a user
   *without* setting a password and confirm that user can still log in (no wipe).
6. Happy? Repeat step 5's flag-flip + deploy on production.
   ↩️ Instant revert: set `AUTH_PHASE_A=false` and redeploy (and/or run the rollback block in the SQL).

**After Phase A the hash/PII harvest is closed.**

---

## PHASE B — turn RLS on everywhere

7. SQL editor → run **`auth_migration_phaseB.sql`**.
   (RLS on for every table with permissive policies that mirror today + audit log becomes append-only.)
   ✅ App still loads and every tab reads/writes normally. Then confirm the audit log is now immutable:
   a DELETE on `ts_audit_log` from the anon key should fail / affect 0 rows.
   ↩️ Revert: uncomment & run the rollback block at the bottom of that file.

**After Phase B the DB is "RLS on, deny-by-default" — groundwork for real per-user rules.**

---

## PHASE C — real per-user logins (the big one)

8. SQL editor → run **`auth_phaseC_access_token_hook.sql`** (it also installs the claim-aware
   helpers). Then **(optional — skip on free tier if you like)** Supabase → Authentication →
   Hooks → **Custom Access Token** → enable → choose `public.custom_access_token_hook`.
   The hook just puts each user's app id + role into their token for speed; if you skip it, the
   helpers fall back to a `profiles` lookup and everything still works.
9. Deploy the migration login function:
   ```
   supabase functions deploy migrate-login
   ```
10. **Provision Auth accounts (one run, all users).** Save the Node snippet from
    `auth_phaseC_provision.sql` as `provision_auth_users.mjs`, set `SUPABASE_URL` and
    `SUPABASE_SERVICE_ROLE_KEY` env vars, then `node provision_auth_users.mjs`.
    This creates one Supabase Auth account per existing user (random temp passwords).
    *You do NOT log in as anyone — this just creates the accounts.*
11. SQL editor → run **STEP 2** of `auth_phaseC_provision.sql` (the `insert into profiles … select …`
    that maps each new Auth account to its app id + role by email).
    ✅ Run the three verification queries in that file — all three must return **zero rows**
    (every Auth user mapped, app_ids unique, every app_id matches a real user).
12. ⚠️ Turn on the Phase C client (I'll have built this behind **`AUTH_PHASE_C`**): set the flag on,
    bump `APP_VER`, build, deploy to **test**.
    ✅ Log in as your break-glass admin → confirm it works. Then log in as **one real user** (their
    normal password) → confirm their password carried over, they see their own data, roster/leave
    behave, and live sync works. Leave it running ~1 hr to confirm the token auto-refreshes (you
    don't get logged out).
13. Once a couple of users have logged in cleanly, SQL editor → run **`auth_phaseC_policies.sql`**
    to swap the permissive policies for the real per-role ones.
    ✅ Confirm a *desk* user cannot edit the roster or approve leave (the server now blocks it, not
    just the UI). Confirm admins still can.
    ↩️ Revert anytime: the rollback block in that file restores the Phase B permissive policies.
14. When everything's verified on test, repeat the flag-flip (step 12) + policy swap (step 13) on
    production. Then retire the now-unused `password_hash` / `reset_token` / `reset_expires` columns.

**Done: every request carries a real per-user token and the database enforces who can do what.**

---

## If something goes wrong
- **Locked out / weird auth:** set `AUTH_PHASE_A=false` (and `AUTH_PHASE_C=false`), redeploy — the
  app drops back to the old client-side login instantly. Use the break-glass admin if needed.
- **A policy blocks legit work:** run that file's rollback block (restores the prior policies in seconds).
- **Bad data mapping:** `delete from public.profiles;` then re-run provisioning step 11.
- Each phase is independent — you can stop after A or B and still be strictly more secure than today.
