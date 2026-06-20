# TrueSouth FMS — Project Context for Claude

This file is read automatically at the start of a new conversation. It captures everything
needed to continue work without re-explaining the app. Keep it updated as things change.

## What this is
TrueSouth FMS is an aviation **Flight Management System** — a single-page web app for a
charter/scenic flight operator. Core areas: manifests, loadsheets with weight & balance,
a seatmap workspace, crew roster, leave management, aircraft maintenance, and notifications.

## ⚠️ Standing rules (do not violate)
1. **Commit, but do NOT push.** Andrew pushes/merges via GitHub Desktop himself.
2. **Do NOT delete git locks.** If a commit fails on a stale `.git/HEAD.lock` or `index.lock`,
   STOP and ask Andrew to clear it manually — he does this on purpose. Never delete locks yourself.
3. **Bump `APP_VER` on every change** (in `modules/shared.js`, e.g. `const APP_VER='v22.87';`).
   It's shown in the UI so Andrew can confirm a deploy went live.
4. **Never hardcode secrets** (e.g. the Rezdy API key). The bundle is publicly readable.
5. Payment/PII features may come later, but **never store card data**.

## Architecture
- **Vanilla JS, no framework.** Source lives in `modules/*.js` + `modules/head.html` /
  `modules/tail.html`. `build.py` concatenates them (in a fixed ORDER) into a single
  `index.html`. Everything shares ONE global scope — watch for top-level name collisions.
- **Module order (build.py):** head.html, shared.js, shell.js, manifest.js, loadsheet.js,
  scratchpad.js, aerodromes.js, saved.js, charter.js, admin.js, maintenance.js, roster.js,
  leave.js, tail.html.
- **Backend: Supabase** (REST + realtime websocket). `SB`/`SH` (URL/headers) and the anon
  key are in `shared.js`. **Auth update (was A1):** `AUTH_PHASE_A`/`AUTH_PHASE_C` are now
  `true` — login uses Supabase Auth/GoTrue (server-side password verify via the `verify-login`
  edge fn), and REST + realtime carry the user JWT. RLS + per-role `has_perm()` policies exist
  in the repo `auth_*.sql` migrations. ⚠️ Andrew must confirm those migrations are APPLIED in
  the live Supabase project for RLS to actually be on. Residual: server gating is by
  permission, not row-ownership (any `operations` user can delete any loadsheet/manifest); no
  CSP (incompatible with the inline-handler UI). See ARCHITECTURE_REVIEW_v24.04 §2.
- **Deploy: Netlify.** Branch `test` → test--testtruesouth.netlify.app;
  branch `main` → truesouth.netlify.app (production). Andrew currently commits to whichever
  branch is checked out and merges/pushes himself. `_headers` sets no-store on the HTML.

## Build & verify workflow (every change)
1. Edit the relevant `modules/*.js` (never edit `index.html` directly — it's generated).
2. Bump `APP_VER` in `shared.js`.
3. Rebuild: `python3 build.py`.
4. Syntax-check: extract the inline `<script>` blocks from `index.html` and run
   `node --check` on them. (Build passes silently; this catches JS errors before deploy.)
5. Commit with the temp-index trick to dodge `index.lock`:
   `GIT_INDEX_FILE=/tmp/tsidx git read-tree HEAD && GIT_INDEX_FILE=/tmp/tsidx git add -A &&
   GIT_INDEX_FILE=/tmp/tsidx git commit -m "vXX.YY: ..."`
   If it still fails on a HEAD.lock, STOP and ask Andrew to clear it.
6. Do NOT push.

## Key data-model concepts
- **`S`** is the single global state object (crew, aircraft, manifests, loadsheets, roster,
  leave, UI flags, caches). Persisted piecemeal to localStorage under `ts_*` keys.
- **Three dispatches:** `S.dispatch` (active manifest), `S._manifestDispatches` (open manifest
  tabs), and `S.smWS` (the seatmap **workspace**, persisted to `ts_smws`). `curDisp()` returns
  the right one based on the current tab (`_onSeatCtx()` → smWS on seatmap/loadsheet tabs).
- **Loadsheet form (`S.form`)** stores passengers as **per-seat-index maps**: `names{}`,
  `seats{}` (weights), `bags{}`, `infantNames{}`, `paxGroups{}`, `paxType{}` ('C'=child),
  `paxPaymentReq{}` (TO PAY). When a passenger moves between seats, **ALL of these must move
  together** — forgetting one is a recurring bug class (TO PAY/child left behind).
- **Seatmap/manifest passengers are objects** with properties `name, weight, bag, paymentReq,
  type, group, infantName` (flags travel with the object automatically).
- **Instance-aware seating:** an aircraft can appear twice on the seatmap (`_seatmapKey` /
  `_displaySuffix`, e.g. `ZK-SLA_2`). `_ac(key)` resolves a seatmap key to the physical
  aircraft. W&B helpers must resolve setup by `_seatmapKey || acId`, not `acId` alone.
- **Realtime:** broadcast/receive events over `_rtWs` — `ls_update`, `ls_saved`, `ls_signed`,
  `ls_tab_open/close`, `manifest_tabs`, `workspace_update`, `sm_update`. Echo loops are
  prevented via `_sessionId` checks. State-changing handlers MUST call `autoSaveLS()`
  (loadsheet) or `saveSeatmapWS()` (seatmap) to broadcast — a handler that only calls
  `render()` will NOT sync to other devices.
- **`safeRender()`** defers a full re-render while an INPUT/SELECT/TEXTAREA is focused (so live
  updates don't clobber typing). `render()` rebuilds the whole DOM.

## Permissions & roster
- `hasRolePerm(perm)` + `DEFAULT_ROLE_PERMS` (shared.js); `PERM_COLS` grid (admin.js).
  `roster_edit` gates roster editing. Superadmin/admin/cx_manager have most perms.
- Roster has an unsaved-draft guard (`_rosterUnsaved` / `_navAway` / save-before-leave prompt).
- Leave: tables `ts_leave_requests`, `ts_leave_audit`, `ts_notifications`. Leave-day counts
  exclude roster RDO/off days and must read the PERSISTED roster (not the live draft/overlay).

## Useful files
- `ARCHITECTURE_REVIEW_v24.04.md` — **latest** review (full bug sweep): what was fixed in
  v24.04 + the current backlog (realtime sync gaps A2–A4, leave-day count L-A/L-B, Rezdy seat
  alloc R-A, roster save-guard leaks, etc.) + the updated security posture. Earlier snapshots:
  `ARCHITECTURE_REVIEW_v23.04.md`, `ARCHITECTURE_REVIEW_v22.87.md`.
- `auth_*.sql` + other `*.sql` files in the repo root — Supabase migrations Andrew runs in the
  SQL editor (the RLS / per-role policy work).
- `build.py` — the concatenation build (now: module-presence check + top-level
  duplicate-declaration scan across the shared scope).
- `versions/` — version snapshots.

## Current state (update this when it changes)
- Latest version: **v24.04**.
- Recent work: editable **Standard Fuels & Burns** table (Admin ▸ Settings ▸ Fuels,
  per-destination airvan/caravan fuel+burn overrides via `S._rzFuelOv` / `rz_fuel_ov`);
  bookings Print run-sheet; drag-pilot-onto-PIC replaces PIC; aerodrome edit override fix;
  seatmap ETD carries to loadsheet; Saved View/Edit/Reopen route to the current Operations
  loadsheet editor; signed loadsheets no longer falsely show "Unsigned"; dark-ink signatures
  on a light pad (visible on light theme + print); plus the **v24.04 bug-sweep fixes** (W&B
  co-pilot orphaned-bag + removed-seat submit gate; toast/seat-name XSS escaping; cancelled
  bookings no longer create pickups; fuel/cargo edits refresh the W&B readout; maintenance
  cancellation notice fires after confirm; crew-load hardened against a bad endorsements row;
  build.py hardening).
- Operations is the Rezdy-powered flow (Bookings / Seatmap / Loadsheets); legacy manifest.js
  retired. Seatmap departures keyed by TIME+DESTINATION; `_RZ_PROD_CFG` in rezdy.js is the
  built-in product→{dest,fuel,burn} config, now overlaid by the editable per-destination
  overrides (`_rzEffCfg`). Manual fuel via `form._fuelUserSet` always wins.
- Open decisions (see ARCHITECTURE_REVIEW_v24.04): confirm RLS migrations are applied live
  (auth code is on); add pickup + roster live-sync and reconnect backfill (A2–A4); make
  leave-day counts compute live (L-A/L-B); fix the Rezdy create-loadsheet seat-fill fallback
  (R-A).
