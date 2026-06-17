# TrueSouth FMS — Supabase Auth + RLS Migration Plan

_Target: move from "anon key + client-side auth + RLS off" to real per-user Supabase Auth
with row-level security on every `ts_*` table. Written 17 Jun 2026 against v22.88._

> **Status: PLAN ONLY — nothing in here has been applied.** Every SQL block is for Andrew to
> run in the Supabase SQL editor; every client change ships on the `test` branch first and is
> verified against `test--testtruesouth.netlify.app` before it ever touches `main`. There is a
> deliberate break-glass path so a policy mistake can't lock you out.

---

## 1. Why (recap of the A1 risk)

Today the Supabase **anon key is the only credential**, it's embedded in the public bundle, and
**RLS is disabled** on every table. Login is 100% client-side: the browser downloads all of
`ts_users` (including `password_hash`) and compares locally. Consequences:

- Anyone who opens the page can `fetch` `ts_users` and harvest every email + password hash.
- Hashes are **unsalted SHA-256**, and some legacy accounts are **`btoa(plaintext)`** (reversible).
- Anyone can **write any table** (insert a superadmin, overwrite a hash → account takeover, edit
  rosters/audit/manifests). Role checks (`hasRolePerm`) are cosmetic — there is no server enforcement.

The fix has two independent halves, and **the first half closes 90% of the risk**:

1. **Stop exposing hashes and stop anonymous writes** (RLS + server-side password verification).
2. **Give each request a real per-user identity** (Supabase Auth JWT) so RLS can enforce per-role access.

---

## 2. Target architecture

- Each person becomes a **Supabase Auth user** (`auth.users`, UUID primary key, bcrypt password
  managed by Supabase).
- The app **keeps its existing text ids** (`u_admin`, `u_178…`) as the canonical key in every
  `ts_*` table — **we do NOT rewrite foreign keys**. A small **`profiles`** table maps
  `auth.uid()` (UUID) → app text id + role.
- The user's **role is stamped into the JWT as a custom claim** (via an auth hook) so RLS policies
  can read `role` without a per-query lookup.
- The client logs in with `supabase.auth.signInWithPassword`, stores the returned **session**, and
  sends the **user's access token** on every REST + realtime call instead of the anon key.
- **RLS is on for every table**, default deny, with policies expressed in terms of `auth.uid()` and
  the role claim.

### The password problem (important)

Supabase Auth stores bcrypt and **cannot import your SHA-256 / btoa hashes**. Two ways to migrate
without a mass password reset:

- **Option P1 — Lazy migration (recommended).** Provision each auth user with a random throwaway
  password. On a user's first login, an Edge Function verifies what they typed against the *legacy*
  hash in `ts_users`; if it matches, it sets their real Supabase Auth password (admin API) and marks
  them migrated. Users keep their current passwords; nobody is forced to reset. After everyone has
  logged in once, the legacy hashes can be deleted.
- **Option P2 — Forced reset.** Email every user a Supabase password-reset link at cutover. Cleaner
  server-side, but disruptive and depends on everyone having a working email on file.

This plan assumes **P1**.

---

## 3. Phased rollout

Each phase is shippable on its own and leaves the app working. Stop after any phase if you want to
pause — you're strictly more secure than before at every step.

### Phase 0 — Prep & safety net (no behaviour change)
- Snapshot the DB (Supabase dashboard → Database → Backups, or `pg_dump`).
- Create the `profiles` table and a **safe view** of users (no hash). Nothing reads them yet.
- Add a **break-glass** superadmin Auth account you control, so you can always get in.

### Phase A — Close the hash leak (RLS on `ts_users` + server-side verify)  ← biggest win
- Enable RLS on `ts_users`, revoke anon `SELECT`, expose `ts_users_public` (no hash/token).
- Move password **verification** and **writes** into Edge Functions (service role). Hashes never
  leave the DB again.
- Client: bootstrap reads `ts_users_public`; `_doLogin` calls the verify function; password
  change/reset call functions. **Auth model otherwise unchanged** (still SHA-256, still your session
  object) — low risk, no data migration. *After this phase the headline risk is gone.*

### Phase B — RLS on everything else (still anon-key transport)
- `ALTER TABLE … ENABLE ROW LEVEL SECURITY` on all remaining `ts_*` tables with **permissive
  `USING(true)` policies that mirror today's behaviour**, then tighten the sensitive ones
  (`ts_role_perms`, `ts_audit_log` insert-only, reset tokens). This makes the posture "RLS on
  everywhere, deny by default" without yet requiring per-user JWTs.

### Phase C — Real Supabase Auth (per-user JWT) + per-role policies
- Provision `auth.users` for everyone; lazy-migrate passwords (P1).
- Switch the client to `supabase.auth` sessions; send the user JWT on REST + realtime.
- Replace the broad `USING(true)` policies with `auth.uid()` / role-claim policies; `hasRolePerm`
  becomes a *mirror* of real DB enforcement rather than the only gate.
- Retire the custom `reset_token` columns in favour of Supabase's reset flow; drop `ts_users` from
  the realtime subscription.

---

## 4. SQL — the concrete pieces

> Run in the Supabase SQL editor. Adjust the exact table list against the dashboard; the DB tables
> in use are: `ts_users, ts_crew, ts_aircraft, ts_loadsheets, ts_manifests, ts_settings,
> ts_charter_rates, ts_maintenance, ts_scratchpads, ts_notifications, ts_leave_requests,
> ts_leave_audit, ts_audit_log, ts_role_perms, ts_roster_build` (the `*_cache`, `ts_user`,
> `ts_remembered_user`, `ts_smws`, `ts_lastview`, `ts_wide_mode`, `ts_drive_*`, `ts_crew_photo_*`,
> `ts_roster`/`ts_roster_payweek`/`ts_roster_grouphide`, `ts_wt_reminder` names are **localStorage
> keys, not tables** — ignore them).

### 4.1 Profiles + role helper (Phase 0)

```sql
-- Maps a Supabase Auth user (uuid) to the app's existing text id + role.
create table if not exists public.profiles (
  auth_uid uuid primary key references auth.users(id) on delete cascade,
  app_id   text unique not null,         -- e.g. 'u_admin'
  role     text not null default 'desk',
  email    text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

-- A user may read only their own profile.
create policy profiles_self_read on public.profiles
  for select using (auth_uid = auth.uid());

-- Helpers usable inside other policies.
create or replace function public.app_id() returns text
  language sql stable as $$ select app_id from public.profiles where auth_uid = auth.uid() $$;

create or replace function public.app_role() returns text
  language sql stable as $$ select role from public.profiles where auth_uid = auth.uid() $$;
```

### 4.2 Safe user view + lock down `ts_users` (Phase A)

```sql
-- Public-safe projection (NO password_hash / reset_token).
create or replace view public.ts_users_public as
  select id, name, email, role, linked_crew, inactive  -- adjust columns to your schema
  from public.ts_users;

alter table public.ts_users enable row level security;
revoke all on public.ts_users from anon, authenticated;   -- only service role touches it
grant select on public.ts_users_public to anon, authenticated;
```

Password verification + writes move to Edge Functions (see §5). With RLS on and no policy granting
anon access, direct `fetch` of `ts_users` returns nothing — the leak is closed.

### 4.3 Permissive RLS to preserve behaviour (Phase B)

```sql
-- Repeat for each non-sensitive table. Mirrors today's open behaviour but makes RLS the default.
alter table public.ts_loadsheets enable row level security;
create policy anon_rw on public.ts_loadsheets for all
  using (true) with check (true);   -- tighten in Phase C
```

```sql
-- Sensitive: audit logs are insert + read, never update/delete by clients.
alter table public.ts_audit_log enable row level security;
create policy audit_insert on public.ts_audit_log for insert with check (true);
create policy audit_read   on public.ts_audit_log for select using (true);
-- (no update/delete policy = those are denied)

-- Role grid: only admins may change it.
alter table public.ts_role_perms enable row level security;
create policy roleperms_read  on public.ts_role_perms for select using (true);
create policy roleperms_write on public.ts_role_perms for all
  using (public.app_role() in ('admin','superadmin'))
  with check (public.app_role() in ('admin','superadmin'));
```

### 4.4 Per-role policies (Phase C examples)

```sql
-- Leave: a person can read & write their OWN requests; approvers can read/update by role.
alter table public.ts_leave_requests enable row level security;

create policy leave_owner on public.ts_leave_requests for all
  using (user_id = public.app_id()) with check (user_id = public.app_id());

create policy leave_approver_read on public.ts_leave_requests for select
  using (public.app_role() in ('cx_manager','admin','superadmin'));

create policy leave_approver_update on public.ts_leave_requests for update
  using (public.app_role() in ('cx_manager','admin','superadmin'));

-- Roster build: edit gated on role (mirrors roster_edit perm).
alter table public.ts_roster_build enable row level security;
create policy roster_read  on public.ts_roster_build for select using (true);
create policy roster_write on public.ts_roster_build for all
  using (public.app_role() in ('admin','superadmin','cx_manager'))
  with check (public.app_role() in ('admin','superadmin','cx_manager'));
```

> The role claim can also be injected into the JWT via a **custom access token hook** so policies
> read `auth.jwt()->>'role'` directly (faster, no `profiles` lookup per row). The `app_role()`
> function form above is simpler to start with; switch to the claim if query plans need it.

---

## 5. Edge Functions (service role — hashes never reach the browser)

You already have one function in-repo (`supabase/functions/send-leave-email`) using
`SUPABASE_SERVICE_ROLE_KEY`, so the pattern is established. Add:

- **`verify-login(email, password)`** — Phase A. Looks up the user server-side, verifies the
  password against the legacy hash, and (Phase C) on success sets/updates the Supabase Auth password
  and returns a session. Never returns the hash. This also auto-upgrades legacy `btoa`/SHA-256 to
  bcrypt as people log in (same idea as today's btoa→SHA-256 upgrade, just server-side).
- **`set-password(userId, newPassword)`** — replaces the direct `sbU('ts_users',{password_hash})`
  writes in `shell.js` / `admin.js` / `shared.js`. Requires the caller's role to permit it.
- **`request-reset` / `confirm-reset`** — Phase C, or hand this to Supabase's built-in reset and
  delete the custom `reset_token`/`reset_expires` columns.

> Note: `handleForgot` in `shared.js` already calls a `send-reset-email` function that is **not in
> the repo** (deployed only). Fold it into this set so the whole auth surface is in version control.

---

## 6. Client changes (by phase)

**Phase A (small, surgical):**
- Bootstrap fetch: `sbF('ts_users')` → `sbF('ts_users_public')` (2 call sites in `shared.js`).
- `_doLogin`: replace local `verifyPw` with a call to `verify-login`.
- Password change/reset/admin-set-password: route through the functions instead of
  `sbU('ts_users', {password_hash})`.

**Phase C (broader):**
- Add the Supabase JS client (or hand-rolled token handling) and use `signInWithPassword`.
- `SH` headers: send the **session access token** as `Authorization: Bearer <jwt>` (keep `apikey:
  anon` — that's expected); refresh on expiry.
- Realtime (`initRealtime`): `access_token` in `phx_join` becomes the **user JWT**, not `SK`; drop
  `ts_users` from the subscribed `tables` list.
- Session model: `S.user` / `ts_user` / `ts_remembered_user` handling moves onto the Supabase
  session; `logout()` calls `supabase.auth.signOut()`.
- `hasRolePerm` stays as a UX gate but is now backed by real RLS.

---

## 7. Risks & safeguards

- **Lockout is the #1 risk.** Mitigations: (a) a break-glass superadmin Auth account created in
  Phase 0; (b) every phase tested on the `test` branch / test Netlify site first; (c) Phase B uses
  `USING(true)` so enabling RLS can't deny anyone before policies are proven; (d) keep the DB
  backup from Phase 0.
- **Text-id ↔ UUID mapping** is the migration's sharp edge (it already bit the leave tables —
  `leave_migration_fix.sql` converted UUID→TEXT). Keeping app text ids canonical and mapping via
  `profiles` avoids touching every FK. Verify `profiles.app_id` matches the exact ids used in
  `user_id`/`reviewed_by`/roster code keys before flipping Phase C policies.
- **Legacy hashes** stay readable only to the service role during P1; delete them once everyone has
  migrated (track via a `migrated_at` column).
- **Realtime under RLS** only streams rows the JWT can see — confirm each device still receives the
  manifests/loadsheets it should after Phase C.
- **Rollback:** each phase is a forward migration; keep a paired `DISABLE ROW LEVEL SECURITY`
  / `drop policy` script per table so any phase can be reverted in seconds.

---

## 8. Suggested order of execution

1. Phase 0 + **Phase A** on `test` → verify login, password change, no `ts_users` readable from the
   browser console → merge to `main`. **(Do this first; it closes the hash exposure.)**
2. **Phase B** on `test` → verify every tab still reads/writes → merge.
3. **Phase C** on `test`, behind a feature flag, with the break-glass account → migrate a couple of
   real users via P1 → verify per-role enforcement → staged cutover → merge.

Per the standing rules: every step bumps `APP_VER`, rebuilds via `build.py`, commits (no push), and
leaves a paired rollback script.

---

## 9. Phase 0 + Phase A — ready-to-run artifacts (in this repo)

These are committed and **inert** until you run/deploy them:

- **`auth_migration_phase0A.sql`** — the profiles table + helpers (Phase 0) and the `ts_users`
  lockdown + `ts_users_public` view (Phase A), with a paired rollback block at the bottom.
- **`supabase/functions/verify-login/`** — server-side password verification (replaces the browser
  downloading hashes). Returns the user record with the hash stripped; auto-upgrades legacy `btoa`
  hashes to SHA-256 on login, exactly like the current client does.
- **`supabase/functions/set-password/`** — server-side password writes (replaces the
  account-takeover-prone `sbU('ts_users',{password_hash})` calls). Re-verifies a self or admin
  credential before writing.

### Cutover order (on the `test` branch first)
1. Backup the DB. Deploy the two functions:
   `supabase functions deploy verify-login set-password` (they reuse the existing
   `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` secrets).
2. Run `auth_migration_phase0A.sql` in the SQL editor.
3. Apply the client edits below, build, and verify on `test--testtruesouth.netlify.app`.
4. Confirm from the browser console that `fetch(SB+'/rest/v1/ts_users?select=*')` returns no hashes.
5. Merge to `main`.

### Exact client edits (Phase A)
- **Bootstrap user list:** the two `sbF('ts_users')` calls in `shared.js` → `sbF('ts_users_public')`.
  (`S.users` then has no `password_hash` — that's the point.)
- **Login (`_doLogin`):** instead of finding the user in `S.users` and calling `verifyPw` locally,
  POST `{email, password}` to the `verify-login` function and use the returned `user`.
- **Remember-me restore caveat:** today restore re-matches by `id + passwordHash` against `S.users`.
  Since the hash is no longer client-side, change restore to re-validate by **`id` only** against
  `ts_users_public` (or store a short-lived opaque marker). This is the one behavioural change to
  test carefully.
- **Password change / admin set-password / reset:** route the `sbU('ts_users',{password_hash})`
  writes in `shell.js` / `admin.js` / `shared.js` through the `set-password` function (self vs admin
  mode). Fold the deployed-but-not-in-repo `send-reset-email` into a `request-reset` function here.
- **Realtime:** drop `'ts_users'` from the `tables` array in `initRealtime` (it can no longer be
  subscribed once RLS is on).

After Phase A the password-hash exposure and anonymous account-takeover paths are closed; Phases B
and C then add per-table and per-user enforcement as described above.
