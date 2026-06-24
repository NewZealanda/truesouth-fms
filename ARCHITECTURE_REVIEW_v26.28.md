# TrueSouth FMS — Architecture Review v26.28 (overnight audit, 25 Jun 2026)

A full-app architecture + bug sweep. What's healthy, what's fixed this session, and a **prioritised
OPEN backlog**. Companion to the earlier `ARCHITECTURE_REVIEW_v25.97.md`.

---

## 1. Architecture at a glance

- **Vanilla JS, ONE global scope.** Source in `modules/*.js` + `head.html`/`tail.html`; `build.py`
  concatenates them (fixed ORDER) into a single `index.html` (~20.9k lines, ~1.9 MB). No framework.
- **Modules split this session** (v26.24) for navigability: `rezdy → rezdy/rezdy_b/rezdy_c`,
  `admin → admin/admin_b`, `shared → shared/shared_b`. 22 module files now. The split was verified
  byte-identical (rebuilt bundle diff = only the version line). `build.py` scans for top-level
  duplicate declarations across the shared scope (currently clean).
- **Backend: Supabase** — REST + a realtime websocket. Anon key in the client; the Rezdy key,
  service-role key and webhook secret live only in edge functions (`supabase/functions/*`:
  `rezdy-sync`, `rezdy-webhook`, plus auth/login/leave fns).
- **Auth: Phase C** (GoTrue) — server-side password verify via `verify-login`, RLS + per-role
  `has_perm()` policies, JWT carried on REST + realtime.
- **State: one global `S`** object, persisted piecemeal to `localStorage` (`ts_*` keys) and mirrored
  to Supabase tables (`ts_*`).
- **Render model:** `render()` rebuilds the whole DOM via innerHTML; `safeRender()` defers while an
  input is focused. Localised DOM updates are used in a few hot paths (drag, toasts, login).

---

## 2. Health — what's solid

- **Persistence/sync is now robust.** The loadsheet Bin/Archive state survives refreshes via an
  independent **`ts_ls_sticky`** map that only bin/restore/upload touch (v26.19), plus forward-only
  reload reconciliation and an **offline write-queue** (v26.11/17) that retries failed
  loadsheet/flight-record writes and purges stale rows so they can't replay over a newer state.
- **Roster writes are merge-before-write** (`_rosterApplyAndSave`) so concurrent devices don't
  clobber each other.
- **Realtime reloads are guarded** (focused-input guard, draft guard, echo/sessionId guards).
- **Audit logging persists to `ts_audit_log`** and now covers the high-stakes actions (expanded
  v26.26: loadsheet bin/upload/reopen, F&D certify/uncertify, user + roster saves). Leave has its own
  `ts_leave_audit` trail.
- **Scheduling allocator** is cohesive and now group-fit aware (won't split a booking group across
  tails) with an SDB-standby rule and meeting-aware pilot reservation.

---

## 3. Fixed this session (v26.24 → v26.28)

- v26.24 module split (byte-identical).
- v26.25 F&D drawn-signature pad + signature in print (`ts_fd_certs.signature`, graceful degrade).
- v26.26 expanded audit logging.
- v26.27 permissions grid grouped into labelled categories.
- v26.28 bug fixes: state-initialiser landmine restored; two maintenance UTC-"today" off-by-ones.
- (Earlier in the session: pax-tracker flyback double-count, CCF last-40-min block, pilot-movements
  aircraft colours, pilot-meeting reservations + auto SDB standby, group-fit allocator, distinct group
  colours, the whole Bin/Archive persistence saga, offline queue, Pilot Bag, intro-once, login polish.)

---

## 4. OPEN backlog (prioritised)

### High
- **H1 — RLS is permission-based, not row-ownership.** Any `operations`-permitted user can delete or
  edit any loadsheet/manifest (noted since v24.04). Consider per-row ownership or at least
  audit-backed soft-delete (audit now covers the *action*, which helps). Confirm the `auth_*.sql`
  RLS migrations are actually APPLIED in the live project.
- **H2 — Apply pending migrations.** `flightduty.sql` now needs `ts_fd_certs.signature` (added this
  session) for F&D signatures to persist server-side; the write degrades gracefully until then.
- **H3 — No CSP.** The UI relies on inline event handlers, so a Content-Security-Policy is
  incompatible without a refactor. Documented risk; a longer-term hardening item.

### Medium
- **M1 — Render performance.** `render()` rebuilds the entire DOM on most state changes. On the
  heaviest pages (calendar, bookings, seatmap) this is the main runtime cost. Options, in order of
  effort: (a) push more hot paths to localised DOM updates (as drag/toasts already do); (b) split the
  page renderers so only the active section re-renders; (c) a keyed-diff layer (large). Not urgent,
  but the highest-leverage *runtime* win — splitting source files (done) does NOT help here.
- **M2 — Single 1.9 MB bundle, loaded up-front.** Fine today; if it keeps growing, consider lazy
  loading the rarely-used heavy modules (business plan, scheduling, maintenance) as separate scripts
  fetched on first open. This is the only change that would actually speed initial load.
- **M3 — Offline queue scope.** The retry queue only covers `ts_loadsheets` + `ts_flight_records`.
  Roster/leave/F&D/maintenance writes are not queued (most have their own merge/retry logic, but worth
  a conscious decision on which else should be offline-resilient).
- **M4 — `ts_rezdy_bookings` retention.** No pruning; the table grows unbounded. A periodic job to
  drop rows older than ~90 days (proposed in REZDY_ARCHITECTURE.md) would keep loads fast.
- **M5 — Hard-deleted Rezdy bookings don't auto-disappear** from the cache (the webhook handles
  new/updated/cancelled, not hard-delete). A reconcile step on sync would close it.

### Low / hygiene
- **L1 — Dead/unused state** (`auditFilter/auditFilterUser/auditPage` appear unused now that they're
  re-initialised). Harmless; remove when convenient.
- **L2 — `_schedDayFlights`/calendar still has the two-away-time / two-auto-pilot-map notes** from the
  v25.97 review (M1/M2 there) — reconciled but worth a glance.
- **L3 — Latin-1 encoding constraint.** `build.py` enforces latin-1; any stray non-latin-1 char fails
  the build. Fine, just a gotcha for future emoji/text.

---

## 5. Recommendations as the app grows

1. **Keep modules under ~1.5k lines** — the split helped; carve again (e.g. `admin_b`, `rezdy_b/c`)
   when they balloon.
2. **Treat the architecture review as living** — bump it each major cycle (this file supersedes
   v25.97).
3. **Migrations discipline** — keep a single "apply these in order" runbook (there's
   `MIGRATION_RUNBOOK.md`); add `flightduty.sql`'s new column to it.
4. **Decide the SMS path** (see `SMS_IMPLEMENTATION_PLAN.md`) before it's urgent.
5. **Runtime perf** — when it's felt, do M1(a)/(b) before anything heavier.

Nothing here is on fire. The persistence/sync foundation (the thing that bites hardest in a
multi-device ops app) is in good shape after this session.
