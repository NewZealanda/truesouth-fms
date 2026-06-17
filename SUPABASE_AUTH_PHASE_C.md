# TrueSouth FMS — Supabase Auth migration: PHASE C (full per-user auth)

_The final phase: every request carries a real per-user JWT, and RLS enforces who can
read/write what server-side. After this, `hasRolePerm()` is a UX mirror of real DB
enforcement rather than the only gate. Written against v22.90 (Phases A + B live)._

> **Status: PLAN + inert server artifacts.** The SQL and the `migrate-login` function are
> ready to review/deploy. The **client transport rewrite is intentionally NOT committed yet** —
> it changes the session + every REST/realtime call, so it should be built behind an
> `AUTH_PHASE_C` flag and tested incrementally on the test site with a break-glass admin, not
> shipped blind. This doc specifies exactly what that client work is.

---

## 1. What changes vs today

| | Phase A/B (now) | Phase C (target) |
|---|---|---|
| Credential per request | anon key (shared) | each user's **JWT** (`signInWithPassword`) |
| Identity in DB | none (`auth.uid()` is NULL) | `auth.uid()` = the user's Auth UUID |
| RLS policies | permissive `using(true)` | `auth.uid()` / role-claim aware |
| Password store | SHA-256 in `ts_users` | bcrypt in `auth.users` (Supabase-managed) |
| Reset flow | custom token in `ts_users` | Supabase's built-in reset |
| App user ids | TEXT (`u_admin`) — **kept** | TEXT kept; mapped to Auth UUID via `profiles` |

The app's TEXT ids stay canonical in every `ts_*` table. We never rewrite foreign keys —
`profiles` (created in Phase 0) maps `auth.uid()` → `app_id` + `role`, and a **custom access
token hook** stamps `app_id` + `user_role` into the JWT so policies read them with no extra query.

---

## 2. The two hard parts (and how each is solved)

### 2.1 UUID ↔ TEXT-id mapping
- `auth.users.id` is a UUID; the app keys everything on TEXT (`u_admin`, `u_178…`).
- **Solution:** `profiles(auth_uid uuid pk, app_id text unique, role text)`. Provision one row
  per existing user at cutover (script in §4.2). RLS reads `app_id`/`role` from the JWT claim
  (fast) or `profiles` (fallback). No FK migration anywhere.

### 2.2 Passwords (don't force a mass reset)
- Supabase Auth stores bcrypt and **can't import** the existing SHA-256 / legacy btoa hashes.
- **Solution — lazy migration.** Pre-create Auth users with a random password (§4.2). On a user's
  first Phase-C login, the client's `signInWithPassword` fails (random pw), so it falls back to the
  **`migrate-login`** Edge Function: it verifies the typed password against the legacy `ts_users`
  hash, and on success sets the Auth password to that value (admin API) and marks the user migrated.
  The very next `signInWithPassword` succeeds. Nobody is forced to reset; passwords carry over on
  first login, exactly like today's btoa→SHA-256 upgrade — just one level up.

---

## 3. Order of execution (all on `test` first, with a break-glass admin)

1. **Backup.** Create a Supabase Auth **break-glass superadmin** you control by hand (so a bad
   policy/hook can't lock everyone out).
2. **Deploy** the `custom_access_token_hook` function (§4.1) and enable it in Dashboard →
   Authentication → Hooks (Custom Access Token).
3. **Provision** Auth users + `profiles` rows for all existing users (§4.2). Random passwords.
4. **Deploy** `migrate-login` (§4.3).
5. **Build the client behind `AUTH_PHASE_C`** (§5), flip it on for the test site, and migrate a
   couple of real users by logging in. Verify claims, reads, writes, realtime, reset.
6. **Swap the RLS policies** from Phase B's `using(true)` to the per-role policies (§4.4), table by
   table, verifying each.
7. Retire the custom `reset_token`/`reset_expires` columns once Supabase reset is wired.
8. Stage the production cutover; keep the flag + policy rollback ready.

---

## 4. Server artifacts (in this repo, inert until deployed/run)

- **`auth_phaseC_access_token_hook.sql`** — the JWT claim hook + the `app_id()/app_role()` helpers
  rewritten to read the claim.
- **`auth_phaseC_provision.sql`** — notes + SQL/agent steps to create `profiles` rows; the Auth-user
  creation itself is done via the admin API (a one-off script, outlined in the file).
- **`auth_phaseC_policies.sql`** — the per-role RLS policy swaps for each table (replacing Phase B's
  permissive ones), with a rollback block.
- **`supabase/functions/migrate-login/`** — the lazy password-migration login function.

### 4.1 Access-token hook (claims)
Stamps `app_id` + `user_role` from `profiles` into every issued JWT. Policies then read
`auth.jwt()->>'user_role'`. See `auth_phaseC_access_token_hook.sql`.

### 4.2 Provisioning
- Create an `auth.users` row per existing `ts_users` row (admin API: `createUser({email,
  email_confirm:true, password:<random>}`), then upsert a `profiles` row mapping that new
  `auth_uid` → the app's existing `app_id` + `role`. Outlined in `auth_phaseC_provision.sql`.
- This can be a one-off Node/Deno script run with the service-role key, or done lazily inside
  `migrate-login` on first login. Bulk pre-provisioning is recommended so the mapping is verified
  before cutover.

### 4.3 `migrate-login`
Verify legacy password → set the Auth password → return success so the client retries
`signInWithPassword`. See `supabase/functions/migrate-login/`.

### 4.4 Per-role policies
Replace each Phase B `anon_all` policy with `authenticated`-role policies keyed on
`auth.jwt()->>'user_role'` / `app_id()`. Examples for `ts_role_perms`, `ts_leave_requests`,
`ts_roster_build`, `ts_loadsheets`, `ts_users` are in `auth_phaseC_policies.sql`.

---

## 5. Client transport rewrite (build behind `AUTH_PHASE_C`)

This is the part to build incrementally and test, not commit blind. Precise scope:

1. **Session.** Add the Supabase JS client (or hand-rolled token handling). `_doLogin` →
   `signInWithPassword(email,pass)`; on `invalid credentials`, call `migrate-login` then retry once.
   Store the returned **session** (access + refresh token); set `S.user` from the JWT claims
   (`app_id`, `user_role`) + a `ts_users_public` lookup for name/etc.
2. **Transport.** Replace the static `SH.Authorization: Bearer <anon>` with **`Bearer <access
   token>`** on every REST call (keep `apikey: anon`). Refresh the token before expiry; on refresh
   failure, route to login. `logout()` → `supabase.auth.signOut()`.
3. **Realtime.** `initRealtime` `phx_join.access_token` becomes the **user JWT** (not `SK`); re-join
   on token refresh. With per-row RLS, each device only receives rows it may see.
4. **Remember-me.** Use Supabase session persistence (refresh token) instead of storing the user
   object; drop `ts_remembered_user`.
5. **Password reset.** Switch `handleForgot`/`handleReset` to Supabase's `resetPasswordForEmail` +
   the recovery callback; retire the custom token columns and the `confirm-reset`/`send-reset-email`
   path.
6. **Writes.** Once policies are per-role, the existing client writes are enforced server-side —
   `hasRolePerm` stays as the UX gate. Remove the Phase A `sbUserWrite` empty-hash workaround once
   `ts_users` is fully behind Auth (passwords live in `auth.users`, not `ts_users`).

Each of 1–6 is independently testable on the flag; do them in that order.

---

## 6. Risks & safeguards

- **Lockout** is the dominant risk. Mitigations: break-glass Auth superadmin (step 1); everything on
  `test` first; migrate 1–2 users before the rest; keep the Phase B `using(true)` policies as a
  one-command rollback; keep `AUTH_PHASE_C=false` as an instant client revert.
- **Mapping correctness** — verify `profiles.app_id` exactly matches the ids used in `user_id`,
  `reviewed_by`, roster code keys, leave/notifications/audit before swapping policies. A mismatch
  silently hides a user's own data.
- **Token expiry / refresh** — get refresh handling right before relying on it (a missed refresh
  logs everyone out mid-shift). Test a long idle session.
- **Realtime re-auth** — confirm the socket re-joins with a refreshed token; otherwise live sync
  silently dies after ~1 hour.
- **Reset cutover** — don't retire the custom reset columns until Supabase reset is verified end to
  end (email deliverability included).

---

## 7. Definition of done

- Every REST + realtime request carries a per-user JWT; the anon key alone can read/write nothing
  sensitive.
- `fetch ts_users` / `ts_loadsheets` / etc. with only the anon key returns 401 or an empty set.
- A desk user cannot edit the roster or approve leave **server-side**, not just in the UI.
- Passwords live only in `auth.users` (bcrypt); `ts_users.password_hash` and the reset-token columns
  are dropped.
- `hasRolePerm` and the DB policies agree, with the DB as the source of truth.
