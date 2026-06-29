# Architecture Review — TrueSouth FMS v28.55

Nightly automated sweep. This is the first full sweep since **v28.15**; it covers the
large undocumented **v28.16 → v28.54** cycle, whose headline work was the five new
ground/ops modules (`vehprestart`, `opsnotices`, `equipment`, `visitors`, `monitoring`),
Supabase Storage uploads, the menu/drawer restructure (Operations / Crew / Company groups),
the festive header/loading-screen decorations, and the uuid→text user-id column fix.

## Scope & method
- Recurring bug classes checked: per-seat field-map desync (the 7 `S.form` maps must move
  together), realtime mutate-without-broadcast, W&B/CoG NaN guards, XSS (unescaped
  booking/user text into innerHTML), date/UTC off-by-one, duplicate top-level declarations,
  focus-clobbering full renders, permission gating, leave-day counting, finance/estimator NaN.
- Method: read all five new modules in full; targeted greps for the date/XSS/dup-decl
  classes across every module; two parallel deep-audit reviewers covering (a) `rezdy.js` /
  `rezdy_b.js` / `rezdy_c.js` and (b) `scheduling.js` / `flightrecord.js` / `leave.js` /
  `training.js`; verified section routing + permission gating for the new modules in `shell.js`.
- Tests: `python3 build.py` (module-presence + top-level duplicate-declaration scan) → clean,
  no collisions; inline `<script>` blocks (4) `node --check` → **0 errors**; `index.html`
  rebuilt 26,170 lines / 3,359 KB. Live read-only check of production
  (https://truesouth.netlify.app): page loads with **no console errors** (deployed bundle;
  this sweep's v28.55 is local/unpushed).

## Bugs found & fixed (this sweep → v28.55)

1. **[Med · focus] Search inputs lost focus on every keystroke (new modules).** The app's
   `render()` restores focus + caret only for inputs that carry a stable `id`
   (`shell.js` ~L545). Two new-module search boxes called `render()` on `oninput` but had **no
   `id`**, so each character rebuilt the DOM and dropped focus — the user had to re-click to
   type the next character. Fixed by giving them stable ids:
   - `opsnotices.js` Operations-Notices list search → `id="onSearchBox"`.
   - `visitors.js` History "Name / staff…" + "Company…" filters → `id="viSearchName"` /
     `id="viSearchCo"`.
   (Equipment's search already had `id="eqSearchBox"`; the date filter uses `onchange`, no
   clobber. This is exactly the class the v28.30 maintenance work-order fix addressed.)

2. **[Low · XSS/robustness] Unescaped uploaded-file URLs in attachment/photo `src`/`href`.**
   For consistency with the rest of the codebase (and `equipment.js`, which already escapes
   `p.data`), wrapped the uploaded-file URL/data-URI in the module's `esc` helper at the
   render leaf:
   - `opsnotices.js` notice-view attachments — `<img src>` + `<a href>` now `_onEsc(fl.data)`
     (the edit view already escaped it; the view didn't — inconsistent).
   - `vehprestart.js` Not-OK photo thumbnails (new-draft + saved-report views) now
     `_vpEsc(c.p)`.
   Low severity (these are Storage public URLs / canvas-generated data-URIs, not free text),
   but escaping is safe in attribute context (`&`→`&amp;` round-trips) and closes the gap.

## Verified clean (no changes needed)
- **Rezdy layer (`rezdy.js`/`rezdy_b.js`/`rezdy_c.js`)** — all four target classes clean.
  Per-seat maps only live in the loadsheet form and are built together in
  `rezdyManCreateLoadsheet`; seatmap pax are objects (flags travel automatically) so seat
  move/swap/remove handlers are structurally immune. Every state-mutator routes through a
  save/broadcast helper (`_rzManSave`→`rz_manifest_update`, `pickupSave`→`_rzPickupBroadcast`,
  `_rzSchedBroadcast`). All booking/customer/pickup/note strings escaped with `_rzEsc` at the
  render leaf; no `innerHTML=` sinks. Date keys use `_rzYmd`/`_rIso`/`_todayLocal` (only
  guarded `toISOString` fallbacks remain).
- **Scheduling / flight records / leave / training** — no surviving High/Med defects. Leave
  stamp/unstamp **merge-before-write** via `_rosterApplyAndSave` (no last-writer-wins); leave
  approve/decline double-gated by `_lvCanApprove(role)` **and** `_lvCanApproveReq(req)`
  (direct-reports scoping); leave-day counts exclude `{rdo,off}` and read the persisted
  `S.roster` after forcing a roster load at submit/approve/edit; scheduling cost math guards
  every `/2` and null route cost; all date sites use local helpers. Training is session-only
  and gates each step nav behind `_sectionAllowed`.
- **New modules functional pass** — `visitors`/`equipment`/`opsnotices`/`vehprestart`/
  `monitoring` escape user fields with their per-module `esc` wrappers (18/12/28/27/8 uses
  respectively); all date keys use `_todayLocal`/`_rIso` with guarded fallbacks; payloads
  coerce numerics to int with `isFinite` guards (`odo`, notice `no`); free-text handlers
  (`onDraftField`, `vpComment`, `eqItemNotes`) deliberately skip `render()` to keep focus.
- **Section routing / permissions for new modules** — `_sectionAllowed` gates `opsnotices`
  (`ops_notices`), `visitors` (`visitors`), `monitoring` (`monitoring`); the render dispatch
  re-checks each perm before rendering; drawer buttons mirror the same gates; Ground sub-tabs
  gate Vehicle-Prestart (`vehicle_prestart`) and Equipment (`ground`/`maintenance`).
  Superadmin passes all. No routing regression from the menu restructure.
- **Duplicate top-level declarations** — `build.py` column-0 scan across all modules: none.

## Open / deferred (low risk, documented — NOT changed this sweep)
- **New ground/ops modules are not realtime-subscribed.** `ts_visitors`, `ts_equipment`,
  `ts_ops_notices`, `ts_vehicle_prestarts`, `ts_flight_following` write to Supabase + a local
  cache, but there is no websocket subscription, so a second open device only sees changes on
  reload or (monitoring only) its 30 s poll. Acceptable for now (low concurrency on these
  screens), but the obvious next upgrade — add each table to the realtime reload list +
  a receiver, mirroring the pickup/roster pattern. Larger change; deferred.
- **`monitoring` `_ffNotifyDesk` / `equipment` `_eqRemind` notifications are best-effort and
  can double-fire** across devices (each device that loads runs the reminder once per session;
  `_eqRemind` guards per-check with `c._notified===today` and persists, which mostly dedupes;
  `_ffNotifyDesk` fires whenever Off-Blocks is pressed — fine). No change.
- **Carried from v28.15:** `saveAircraftDraft` (admin_b.js) writes `ts_aircraft` without a
  realtime broadcast (stale W&B specs on other open devices until reload); flight records not
  realtime-synced; breakdown-undo cache (superadmin WIP); `shell.js` login uses innerHTML
  (app-controlled fields).
- **Server gating is by permission, not row-ownership** (pre-existing): any `operations` user
  can delete any loadsheet/manifest; no CSP (incompatible with inline handlers). See
  ARCHITECTURE_REVIEW_v24.04 §2.

## Security posture
No new XSS sinks introduced by the v28.16→v28.54 cycle survived this sweep (the two
attachment/photo `src` interpolations are now escaped). User/booking text is escaped at the
render leaf throughout. Numeric DB columns are int-coerced before upsert (the v28.40/v28.50
fixes). RLS/`has_perm()` policies still depend on Andrew confirming the migrations are applied
live (carried). New tables (`ts_visitors`, `ts_equipment`, `ts_ops_notices`,
`ts_vehicle_prestarts`, `ts_flight_following`) need their RLS/grants applied — see the
`*.sql` files in the repo root (`vehicle_prestarts.sql`, `ops_notices.sql`, `equipment.sql`,
`visitors.sql`, `flight_following.sql`, `vp_delete_own.sql`, `fix_feature_table_grants.sql`,
`fix_uuid_user_columns.sql`).

## Git — ⚠️ COMMIT BLOCKED (stale locks, NOT deleted)
Branch `test`, ahead of `origin/test` by 3 commits. **A stale `.git/index.lock` is present and
cannot be removed ("Operation not permitted"), plus a 0-byte `.git/HEAD.lock`.** Per the
standing rule I did **not** delete either lock. The working tree was already in a large
mid-refactor state before this run (staged SQL-file deletions, `.gitignore`/`build.py` edits,
several module modifications) — that is pre-existing in-progress work, not from this sweep.
This sweep's changes are built + syntax-checked + in the working tree but **UNCOMMITTED**:
`modules/opsnotices.js`, `modules/visitors.js`, `modules/vehprestart.js`,
`modules/shared.js` (APP_VER→v28.55), `index.html` (rebuilt), plus this review +
`CLAUDE.md`/`MORNING_REPORT.md`. **Action for Andrew:** clear `.git/index.lock` and
`.git/HEAD.lock` manually, review the working tree in GitHub Desktop, commit, then push/merge.
