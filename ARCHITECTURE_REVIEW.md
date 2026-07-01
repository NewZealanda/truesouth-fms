# Architecture Review — TrueSouth FMS v28.90

Nightly automated sweep. First full sweep since **v28.55**; covers the undocumented
**v28.56 → v28.89** cycle, whose headline work was the **customer weather-link system**
(`modules/wxlinks.js` + the standalone `wx.html` customer page): a pilot makes a weather call,
the desk copies a unique per-booking link (`wx.html?t=token`) and sends it to the customer,
and the customer's acknowledgement / pickup choice flows back and auto-ticks the booking's Wx.
Surrounding work in the cycle: self-drive toggle that overrides the pickup location, the
bookings card showing pickup time, weather-call reasons rename (Visibility → Poor Visibility,
+ Turbulence), a required next-best-day before a cancellation, multi-language (15-language) wx
page with RTL, leave-cancellation-needs-approval (reverts roster on approve), and the April-2027
10-Year-Anniversary header.

## Scope & method
- Recurring bug classes checked: per-seat field-map desync (the 7 `S.form` maps must move
  together on a seat move/swap), realtime mutate-without-broadcast, W&B/CoG NaN guards, XSS
  (unescaped booking/customer/user text into innerHTML), date/UTC off-by-one, duplicate
  top-level declarations, focus-clobbering full renders, permission gating, leave-day counting.
- Method: read the new `wxlinks.js` module in full; two parallel deep-audit reviewers — (a) the
  weather-link/self-drive/pickup layer (`wxlinks.js` / `rezdy.js` / `rezdy_b.js` / `wx.html`)
  and (b) the leave-cancellation-approval + roster-revert path (`leave.js`); plus direct
  verification of the loadsheet per-seat-map move/swap handlers (`admin.js`) and repo-wide greps
  for the date/XSS/dup-decl classes.
- Tests: `python3 build.py` (module-presence + top-level duplicate-declaration scan) → clean,
  no collisions; inline `<script>` blocks (4) `node --check` → **0 errors**; `index.html`
  rebuilt at **26,791 lines / 3,663 KB**, carrying `APP_VER='v28.90'`. (No live mutation; prod
  https://truesouth.netlify.app serves the deployed v28.89 — this sweep's v28.90 is local/unpushed.)

## Bugs found & fixed (this sweep → v28.90)

1. **[Low · XSS/consistency] Order number interpolated raw into inline `onclick` handlers in the
   weather-link modal.** In `wxlinks.js` `_wxLinkModal`, the **Copy** button (then ~L218) already
   built its `onclick` with a JS-escaped order (`_wxEsc(order).replace(/'/g,"\\'")`), but the
   sibling buttons — **Mark sent · WhatsApp/Email** (`wxMarkSent`), **Reset to live**
   (`wxResetLink`) and **Clear history** (`wxClearHistory`) — interpolated the bare `order`
   straight into `onclick="...('+order+'...)"`. Rezdy order numbers are alphanumeric (no quotes),
   so the practical risk was near-nil, but the asymmetry was a latent handler-breakage / injection
   gap if an order value ever carried a quote. Fixed by computing one JS-string-safe value
   (`var oj=String(order).replace(/\\/g,'\\\\').replace(/'/g,"\\'")`) once and using it in all
   five inline handlers (Copy, both Mark-sent, Reset, Clear-history). Pure consistency hardening;
   no behaviour change for normal order numbers.

## Verified clean (no changes needed)

- **Weather-link / self-drive / pickup layer** — all four target classes clean.
  Every customer/user string (`pax_name`, `dep_label`, `dep_time`, pickup location, weather-call
  comment, event labels, `e.by`) is escaped at the render leaf with `_wxEsc`/`_rzEsc`/`esc`; the
  public `wx.html` sets `pax_name` via `textContent` and deliberately does NOT render the internal
  `wx_comment` to the customer (the v28.89 change). Every state-mutating handler persists +
  broadcasts: `wxSubmit`/`wxClear` → `pickupSave(true)`+`_rzPickupBroadcast()`+`wxSyncDep()`;
  `rezdyBookingSelfDrive`/`pickupSetLocation` → `pickupSave(true)`; `_wxProcessActions` →
  `pickupSave(true)` only when dirty; the `wx*` row writers all `sbU('ts_wx_links',[row])` and the
  10 s poll + realtime reconverge other devices. All `toISOString().slice(0,10)` sites in the
  layer are guarded `_rIso`/`_todayLocal` fallbacks; `_wxNextDays` (next-best-day chips) uses
  `_rIso` on a local-midnight base. NaN/null guards present throughout (`_wxSnapFor`, `wxSyncDep`,
  `_wxEvTime` `isNaN` guard, try/catch around `_wxProcessActions`).
- **Loadsheet per-seat field maps** — clean. Every move/swap/bump handler in `admin.js`
  (`tapFormSeat`, `lsDropOnSeat`, `lsDropOnUnalloc`, `tapDropUnallocated`, `dropFormSeat`) moves
  **all 7 maps together** (`names`, `seats`, `bags`, `infantNames`, `paxGroups`, `paxType`,
  `paxPaymentReq`) and calls `autoSaveLS()` to persist+broadcast. No map left behind (the
  recurring TO-PAY/child/infant-orphan bug class).
- **Leave cancellation-approval + roster revert** — clean. The new `lvApproveCancel` reverts the
  roster via `_lvUnstampRoster` → `_rosterApplyAndSave` (merge-before-write, `_RDEL` deltas — no
  last-writer-wins blob overwrite); approve/decline-cancel are double-gated by `_lvCanApprove(role)`
  **and** `_lvCanApproveReq(req)` (direct-reports scoping). Leave-day counts read the persisted
  `S.roster` and exclude `{rdo,off}`. All output `_lvEsc`-escaped; all local dates via `_rIso`.
- **Duplicate top-level declarations** — `build.py` column-0 scan across all modules: none.
- **Date/UTC** — repo-wide, every `toISOString().slice(0,10)` is either a guarded
  `_rIso`/`_todayLocal` fallback or a deliberate UTC use (`maintenance.js` `Date.UTC` round-trip;
  `shared.js` `_fetchSince` lower-bound). No bare local-date off-by-one.

## Open / deferred (low risk, documented — NOT changed this sweep)

- **New ground/ops modules still not realtime-subscribed** (carried from v28.55): `ts_visitors`,
  `ts_equipment`, `ts_ops_notices`, `ts_vehicle_prestarts`, `ts_flight_following` write to
  Supabase + a local cache but have no websocket subscription — a second open device only sees
  changes on reload or (monitoring) its 30 s poll. The obvious next upgrade: add each table to the
  realtime reload list + a receiver, mirroring the pickup/roster pattern. Larger change; deferred.
- **`ts_wx_links` relies on the 10 s poll + (if subscribed) realtime** to converge customer
  actions across devices; the poll only runs while on the operations/bookings page and the tab is
  visible. Acceptable, but if `ts_wx_links` is NOT in the realtime publication, a desk on a
  different section won't see a customer action until they return to bookings. Worth confirming
  the table is in the realtime publication (see `wx_links.sql` / `realtime_*.sql`).
- **Leave stamp/unstamp asymmetry (cosmetic, pre-existing):** `_lvUnstampRoster` only clears a
  cell that still equals the stamped leave code; if `_lvStampRoster` had overwritten a
  pre-existing *non-off* status, the revert blanks the cell rather than restoring the prior
  status. Non-destructive of concurrent edits (the data-loss contract holds); the UI copy
  ("reverts those days to their original state") just slightly overstates fidelity. No fix.
- **Carried:** `saveAircraftDraft` (admin_b.js) writes `ts_aircraft` without a realtime broadcast
  (stale W&B specs on other devices until reload); flight records not realtime-synced;
  breakdown-undo cache (superadmin WIP); `shell.js` login uses innerHTML (app-controlled fields).
- **Server gating is by permission, not row-ownership** (pre-existing): any `operations` user can
  delete any loadsheet/manifest; no CSP (incompatible with the inline-handler UI). See
  ARCHITECTURE_REVIEW_v24.04 §2.

## Security posture
No surviving XSS sinks from the v28.56→v28.89 cycle: customer/booking text is escaped at the
render leaf throughout (`_wxEsc`/`_rzEsc`/`esc`/`_lvEsc`), the public `wx.html` uses `textContent`
for the name and withholds the internal comment, and this sweep closed the last raw-`order`
interpolation in the wx modal handlers. RLS/`has_perm()` policies still depend on Andrew confirming
the migrations are applied live (carried). New feature tables (`ts_wx_links` and the five
ground/ops tables) still need their RLS/grants applied — see `wx_links.sql`, `vehicle_prestarts.sql`,
`ops_notices.sql`, `equipment.sql`, `visitors.sql`, `flight_following.sql`, `vp_delete_own.sql`,
`fix_feature_table_grants.sql`, `fix_uuid_user_columns.sql`.

## Git — ⚠️ COMMIT BLOCKED (stale lock + read-only .git, NOT modified)
Branch `test`, HEAD at `46b307c` (v28.89). A stale **`.git/index.lock`** is present, AND the
sandbox cannot write into `.git/objects` ("Operation not permitted") — so even the temp-index
commit trick fails (`unable to write new index file` / `unable to unlink .git/objects/...`). Per
the standing rule I did **not** delete the lock or touch `.git`. The working tree was ALSO already
in a large mid-refactor state before this run — the `wx.html` → `modules/wxlinks.js` migration
shows up as staged deletions of `wx.html`/`wx_links.sql`/`modules/wxlinks.js` alongside untracked
re-adds, plus `build.py`/`.gitignore`/several-module edits. That is Andrew's pre-existing
in-progress work, not from this sweep. This sweep's changes are built + syntax-checked + in the
working tree but **UNCOMMITTED**: `modules/wxlinks.js` (5 escaped onclick handlers + `oj` helper),
`modules/shared.js` (APP_VER → v28.90), `index.html` (rebuilt), plus this review + the
`CLAUDE.md`/`MORNING_REPORT.md` updates. **Action for Andrew:** clear `.git/index.lock` (and any
`.git/HEAD.lock`) manually, review the working tree in GitHub Desktop, sort out the wx-refactor
staging, commit, then push/merge.
