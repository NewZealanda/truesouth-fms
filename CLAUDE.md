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
- `ARCHITECTURE_REVIEW_v28.90.md` — **latest** full sweep (kept in the working tree). Older
  per-version review snapshots (v22.87 → v28.55) were removed from the working tree to declutter;
  they remain in git history if ever needed (`git show <rev>:ARCHITECTURE_REVIEW_vXX.YY.md`).
  The dated changelog entries below still reference them by name as historical pointers.
- `auth_*.sql` + other `*.sql` files in the repo root — Supabase migrations Andrew runs in the
  SQL editor (the RLS / per-role policy work).
- `build.py` — the concatenation build (now: module-presence check + top-level
  duplicate-declaration scan across the shared scope).
- `versions/` — version snapshots.

## Current state (update this when it changes)
- **v29.39 (latest) — maintenance log notes are now PER AIRCRAFT.** Bug: the hours-log Notes
  column wrote one shared `comment` per DATE row (`hist` entry) while ttis/starts/landings were
  per-tail keys — editing one aircraft's note changed every aircraft's. Now `saveMaintField` +
  `addMaintEntry` write `<ac>_comment`; the log cell reads the per-tail note falling back to the
  legacy shared `comment` (still visible until a tail gets its own); explicitly CLEARING a note
  also deletes the legacy shared one; the Search results Notes column shows legacy + per-tail
  notes tagged with the tail short code. `hasFlightData` row-visibility includes per-tail notes.
- **v29.38 — no more "Loading…" flash on a calendar day change (all three sub-views).**
  The calendar body (header cards + grid / movement columns) is wrapped in `#rzCalBody`;
  `rezdySetDate` snapshots its innerHTML (`S._calSnap`) before clearing the day's caches, and the
  loading branches of ALL THREE calendar sub-views (`_rzRenderSchedule` / `_rzRenderMovements` /
  `_rzRenderPilotMovements`) render that snapshot dimmed (opacity .45, saturate .5,
  pointer-events none) with a sticky "Loading <day>…" pill via the shared `_rzCalLoadingHold()` —
  page height is preserved so the scroll genuinely never moves; each view drops the snapshot the
  moment its real content renders. The Aircraft-movements + Pilot-movements grids also gained
  `data-keepscroll` ids (`rzMovGrid`/`rzPilotGrid`) so their horizontal scroll survives renders.
  Complements v29.37's clamped-scroll carry (still the fallback with no snapshot, e.g. first open).
- **v29.37 — calendar keeps its scroll position when stepping between days.** The
  existing keep-scroll machinery (window-scroll restore keyed on section|tab + the
  `_rzCalStartPx` hour-alignment delta) was defeated by the intermediate **"Loading calendar…"**
  render on a day change: the short placeholder page CLAMPED the scroll to ~0, and the final
  data render then faithfully restored the clamped position. Fix (shell.js render()): when the
  restore falls short AND the `rzCalGrid` isn't on screen, the intended Y is carried in
  `S._winPendY` and used on the next render(s); cleared as soon as the grid is back (or on
  leaving the calendar) so later manual scrolling is never yanked. Day-stepping now visually
  holds the same spot, still hour-aligned across differing per-day time windows.
- **v29.36 — Records browse grid: Tab flows cleanly box-to-box.** Root cause: every
  `frEditField` called `safeRender()`, whose 3s deferred force-render rebuilt the DOM mid-Tab and
  dumped focus (browse inputs had no id/data attrs for the restore). Now: all browse-grid
  inputs/selects carry `data-row`/`data-field` (render()'s existing focus-restore mechanism),
  `frEditField` updates the computed Flt-h cell IN PLACE when the grid is on screen
  (`#frbTable`) instead of re-rendering (falls back to safeRender elsewhere — Today's-record
  flows unchanged), and the 🗑 buttons are tabindex=-1 so Tab skips straight to the next row.
  Totals/breakdown panels above the grid catch up on the next natural render.
- **v29.35 — roster DAY view tidied on iPhone.** With only 2 columns the browser was
  stretching the Crew column across half the screen and the 92px select floated lost in the wide
  day column. Now: Crew column pinned (46px on mobile, 155px on desktop day view) so the day
  column takes the rest; the day-view status select/pill fills its column (94%, max 300px,
  13px font, taller padding) — one clean full-width tappable widget per crew row (`_dayWide`).
- **v29.34 — roster week view fits an iPhone screen.** On `S.mobileView`, week view
  uses the compact month-style cells (`_cmp` flag: 44px / 9px font) so 46px initials col +
  7×44px ≈ 354px — all 7 days visible without sideways scroll; table min-width 560→0 on mobile.
  Month view unchanged (still scrolls on mobile); day view stays 92px.
- **v29.33 — Records: 🛬 Landings-by-location breakdown.** The Records browser's
  Breakdown panel (flightrecord.js `_frRenderBrowse`) gains a third mode alongside By pilot /
  By aircraft: landings aggregated by the record's `to` (destination — where the landing happens),
  place-named via `_frPlaceName`, sorted by landings desc. Respects all existing filters (date
  range / pilot / aircraft / type / search). A landings column was added to all three breakdown
  modes. build + node --check clean.
- **v29.32 — roster day/month views + mobile initials; products table sticky scroll.**
  (1) **Roster views** (roster.js): Day | Week | Month selector in the toolbar (`S._rosterView`,
  persisted `ts_roster_view`, week default). Generalised the days array — `S.rosterWeek` stays the
  anchor (day = that date, month = snapped to the 1st); prev/next buttons, `rosterShiftWeek`
  (arrow keys) and `rosterJump` (date picker) are all view-aware; pay-week toggle only shows in
  week view; weekend shading now by getDay (was index). Month view uses compact 44px cells /
  9px font; colspans dynamic (`_colspan`); `loadRosterLeave` always fetches ≥31 days.
  (2) **Mobile initials**: on `S.mobileView` the sticky Crew column shows just the 2-letter code
  badge (title = full name), col shrinks 155px→46px so more days fit on iPhone.
  (3) **Products editor**: table container is now `overflow:auto;max-height:65vh` with a sticky
  header row — the horizontal scrollbar sits at the bottom of the panel, no more scrolling the
  whole page to reach it. build + node --check clean.
- **v29.31 — summer/winter departure timetables on the product catalog.**
  `ts_products` gains `times_winter` (`products_winter_times.sql` — APPLY IN SUPABASE); a global
  recurring winter window (MM-DD..MM-DD, default 05-01..09-30, may wrap year-end) lives in
  ts_settings key `platform_cfg`, editable at the top of Settings ▸ Operations ▸ Products
  (`platformCfgLoad/Set`, cache `ts_platform_cfg`). Resolution is by FLIGHT date everywhere:
  `platformTimesFor(p,date)`/`platformIsWinter` (platform.js), `timesFor()/winterWindow()` in the
  platform-book edge fn — availability now returns `productTimes` (per-product timetable resolved
  for the requested date) and the book action validates the dep against the date-resolved set;
  book.html's slot picker consumes `productTimes` (falls back to default times). Editor grid:
  ☀ Times + ❄ Winter times columns (blank winter = same as summer), `platformProdTimes` gains a
  field arg. ⚠️ Re-deploy **platform-book**; run `products_winter_times.sql`. build+node-check clean.
- **v29.30 — Rezdy INTERNAL NOTES synced into the app + live-pricing design constraint.**
  Both Rezdy edge fns (`rezdy-sync`, `rezdy-webhook`) now map `b.internalNotes` into the canonical
  booking; the booking card shows it read-only ("🗒 Rezdy: …", dashed border) directly above the
  desk's own editable 📝 internal-note textarea (rezdy.js, same width/stack — edits to the Rezdy
  note happen IN RezDY and follow the sync; the app note `S._rzBkNote` is unchanged/separate).
  ⚠️ Re-deploy BOTH rezdy-sync + rezdy-webhook; existing cached rows show the note after their
  next sync/webhook touch. Also: PLATFORM_ROADMAP.md gains the **dynamic/live pricing design
  constraint** — all pricing must stay funnelled through the per-(product,flight-date) resolver
  seam (platformPriceFor / edge-fn priceFor / book.html tierFor) so availability-driven floating
  prices can slot in later without rework.
- **v29.29 — SEASONAL product pricing (priced by flight date) + season price loads.**
  `ts_products` gains `next_from` + `next_price_adult/child/infant` (added by
  `products_prices_2026-27.sql`). Resolution everywhere is by the FLIGHT (tour) date:
  `platformPriceFor(p,date)` (platform.js), `priceFor()` in the platform-book edge fn (book action
  + catalog now returns the next-season fields), and `tierFor()` in book.html (product cards +
  total follow the chosen date; a "Season pricing from …" note shows when the next set applies).
  So a 30 Sep 2026 flight prices at current rates and 1 Oct 2026 at 2026-27 rates with no
  changeover step. Products editor gains From/Next-A$/C$/I$ columns. **Price loads from the
  marketing sheet:** `products_prices_2025-26.sql` (current prices; run now) +
  `products_prices_2026-27.sql` (adds the columns + loads next-season prices effective
  2026-10-01; safe to run now). Mapping calls flagged in the SQL headers: GL→MCGL+FJGL,
  QT OH→QNLS, MCOH-inc-landing→MCOH, new inactive codes CCFPK/MFOHL/FOXFJ/MCFLB (NOT in
  _RZ_PROD_CFG yet — add dest/fuel before selling), "Mt Asp add on" skipped (extras not
  modelled), THH/FJHH next-season child = POA per sheet, STT/MCHS next TBC (omitted).
  ⚠️ Re-deploy the **platform-book** edge fn (code changed). build + node --check clean.
- **v29.28 — booking platform Phase 1 foundations: product catalog + public booking page skeleton.**
  On branch **test** (Andrew's choice — commit/deploy to test first). See `PLATFORM_ROADMAP.md`
  (the authoritative platform doc — it also covers the undocumented v28.91→v29.27 cycle: Phase 0
  native-bookings store `modules/platform.js`/`ts_native_bookings`, desk New-booking routed
  native-first, Phase 0.5 availability engine `modules/availability.js` + `ts_session_holds`, both
  realtime-subscribed). New in v29.28:
  (1) **`ts_products` catalog** (`products.sql` — APPLY IN SUPABASE): per-product customer name,
  adult/child/infant NZD prices, standard departure `times[]`, duration, description, `active`
  (public visibility, default OFF). Anon RLS reads active rows only; realtime-subscribed
  (shared_b.js tables array + `platformReloadProductsLive` handler). Loaders/editor in
  `modules/platform.js`; editor tab **Settings ▸ Operations ▸ 🛍 Products** (admin+, registered in
  rezdy.js `renderAdminOperations`) with one-time seed from `_RZ_PROD_NAME`/`_RZ_PROD_CFG`.
  (2) **`platform-book` edge function** (`supabase/functions/platform-book/` — DEPLOY with
  `--no-verify-jwt`): the public funnel's only door (service role). Actions catalog/availability/
  hold/release/book; books in the canonical shape so the whole FMS consumes it unchanged;
  `createPaymentSession()` is the pluggable Windcave seam (pay-later until wired).
  (3) **`book.html`** — standalone public direct-booking page (wx.html pattern): products → date →
  live-seat slot picker (places a 15-min hold) → pax names/weights → contact → TS- order confirm.
  NOT linked anywhere yet; go-live checklist in the roadmap (⚠️ incl. the Rezdy-cap coexistence
  guard the edge fn doesn't have). build + `node --check` (4 blocks) → 0 errors; book.html script
  node-checked too. NOTE: mid-session Andrew discarded the working tree via GitHub Desktop to
  switch main→test; the v29.28 work was re-applied cleanly on test afterwards.
- **v28.90 — nightly sweep: escape order# in the weather-link modal's inline onclick handlers.**
  `ARCHITECTURE_REVIEW_v28.90.md` is the latest full sweep (first since v28.55; covers the undocumented
  **v28.56→v28.89** cycle — the headline being the **customer weather-link system** `modules/wxlinks.js`
  + standalone `wx.html` page: pilot makes a weather call → desk copies a per-booking `wx.html?t=token`
  link → customer's ack / pickup choice flows back + auto-ticks Wx. Cycle also: self-drive pickup
  override, bookings pickup-time, reasons rename Visibility→Poor Visibility +Turbulence, required
  next-best-day before cancel, 15-language wx page + RTL, leave-cancellation-needs-approval (reverts
  roster on approve), April-2027 10-Year-Anniversary header). One real fix: **`wxlinks.js` `_wxLinkModal`** —
  the Copy button JS-escaped the order# in its inline `onclick`, but the sibling Mark-sent/Reset/
  Clear-history buttons interpolated the bare `order` (latent handler-break/injection if an order ever
  held a quote; Rezdy orders are alphanumeric so practical risk ~nil). Computed one JS-safe `oj` and used
  it in all 5 handlers. Verified clean by two parallel deep-audit reviewers + direct reads: weather-link/
  self-drive/pickup layer (XSS escaped at leaf, every mutator persists+broadcasts via pickupSave/
  _rzPickupBroadcast/wxSyncDep/sbU, dates `_rIso`-guarded, NaN/null guards), loadsheet per-seat 7-map
  moves (all move together + autoSaveLS in tapFormSeat/lsDropOnSeat/lsDropOnUnalloc/tapDropUnallocated/
  dropFormSeat), leave cancellation-approval roster revert (merge-before-write via _rosterApplyAndSave,
  double perm-gated, rdo/off excluded). build + `node --check` (4 blocks) → 0 errors; index.html rebuilt
  26,791 lines. ⚠️ **COMMIT BLOCKED:** stale `.git/index.lock` present AND the VM can't write `.git/objects`
  ("Operation not permitted") — temp-index trick fails too; lock NOT deleted (per rule). v28.90 is built +
  in the working tree but **UNCOMMITTED**, on top of Andrew's pre-existing **wx-refactor** changeset
  (`wx.html`→`modules/wxlinks.js` migration: staged deletions of wx.html/wx_links.sql/wxlinks.js +
  untracked re-adds, build.py/.gitignore edits). Andrew must clear the lock, untangle the wx-refactor
  staging in GitHub Desktop, commit, then push/merge. ⚠️ **New-table SQL** to apply if not yet: `wx_links.sql`,
  `vehicle_prestarts.sql`, `ops_notices.sql`, `equipment.sql`, `visitors.sql`, `flight_following.sql`,
  `vp_delete_own.sql`, `fix_feature_table_grants.sql`, `fix_uuid_user_columns.sql`. OPEN: confirm `ts_wx_links`
  is in the realtime publication; the 5 ground/ops modules + wx_links still poll/reload-only (not realtime-subscribed).
- **v28.55 — nightly sweep: focus-clobber + escaping fixes on the new ground/ops modules.**
  `ARCHITECTURE_REVIEW_v28.55.md` is the latest full sweep — first since v28.15; covers the big
  undocumented **v28.16→v28.54** cycle (the 5 new modules `vehprestart`/`opsnotices`/`equipment`/
  `visitors`/`monitoring`, Supabase Storage uploads, the Operations/Crew/Company menu restructure,
  festive header/loading decorations, the uuid→text user-id fix). Two real fixes: (1) **focus clobber** —
  `render()` only restores focus to inputs with a stable `id`, but the `opsnotices` list search and the
  `visitors` History name/company filters called `render()` on `oninput` with NO id, so each keystroke
  dropped focus. Gave them ids (`onSearchBox`, `viSearchName`, `viSearchCo`). (2) **escaping consistency** —
  wrapped the uploaded-file URL/data-URI in `_onEsc(fl.data)` (opsnotices attachment img/href, which the
  edit view already escaped) and `_vpEsc(c.p)` (vehprestart Not-OK photo thumbnails). Verified clean by two
  parallel deep-audit reviewers + my own read: rezdy×3 (per-seat maps, broadcasts, XSS, dates), scheduling/
  flightrecord/leave/training (NaN guards, leave merge-before-write, perm scoping, leave-day RDO-exclusion,
  dates), new-module routing + perm gates in shell.js. build + `node --check` (4 blocks) → 0 errors; live
  truesouth.netlify.app loads with no console errors (read-only). ⚠️ **COMMIT BLOCKED:** this VM session
  can't write to `.git` (`fatal: unable to write new index file`) and stale `.git/index.lock` + `.git/HEAD.lock`
  are present — NOT deleted (per rule). v28.55 is built + in the working tree but **UNCOMMITTED**; the tree
  also still holds a pre-existing mid-refactor changeset (staged SQL-file deletions, `.gitignore`/`build.py`
  edits). Andrew must clear the locks, review in GitHub Desktop, commit, then push/merge. ⚠️ **New-table SQL**
  to apply if not yet: `vehicle_prestarts.sql`, `ops_notices.sql`, `equipment.sql`, `visitors.sql`,
  `flight_following.sql`, `vp_delete_own.sql`, `fix_feature_table_grants.sql`, `fix_uuid_user_columns.sql`.
  OPEN backlog: the 5 new modules write to Supabase + cache but are NOT realtime-subscribed (second device
  sees changes on reload / 30s poll only) — obvious next upgrade.
- **v28.12 — nightly sweep: escape passenger/PIC names in the printed loadsheet (XSS).**
  `ARCHITECTURE_REVIEW_v28.12.md` is the latest full sweep (first since v27.79; covers the undocumented
  v27.80→v28.11 cycle — flight-records import, Reports-to org + manager-based leave, Data Recording
  section, logbook ferry position-chaining, mobile calendar drag-lock, allocator route preference).
  One real fix: **`admin_b.js generatePrintHTML`** (+ the compact print builder) interpolated Rezdy-
  sourced **passenger names + PIC + co-pilot UNESCAPED** into the printed/Drive-uploaded loadsheet HTML —
  a stored-XSS-into-print sink. Wrapped every name in `esc()`. Also wrapped the one un-`_rzEsc`'d
  transport dep-label in `rezdy_b.js` (consistency). Verified clean: 7-map per-seat moves, realtime
  broadcast coverage, CoG/reserve NaN guards, date/UTC `_rIso` guards, duplicate-decl scan. build +
  `node --check` (4 blocks) → 0 errors. ✅ **COMMITTED:** `main` at `5023e5b` (this sweep) on top of
  `ab1505e` (the v28.09–v28.11 perms overhaul, also committed this session); working tree clean. Stale
  `.git/index.lock`+`HEAD.lock` left on disk (NOT deleted, per rule) — Andrew should clear them before
  GitHub Desktop, then **push/merge**. Not pushed. ⚠️ **Perms note:** `hasRolePerm` now folds calendar/ground/resources/weather into `operations`,
  so the grid's Ground/Resources/Weather columns are inert; and `settings` defaults OPEN to all roles
  (sub-tabs still gated). New SQL to apply if not yet: `reports_to.sql`, `leave_managers_view_all.sql`,
  `flight_records_*`.
- **v27.79 — nightly sweep: loadsheet "change aircraft" now persists+broadcasts.**
  `ARCHITECTURE_REVIEW_v27.79.md` is the latest full sweep (first since v27.48; covers the undocumented
  v27.49→v27.78 cycle). One real fix: **`window.lsAc`** (loadsheet aircraft switch) was render-only — it
  mutates the form heavily (sets `ac`, bumps excess pax to unallocated, clears cargo/fuel on type change,
  voids the signature) but never called `autoSaveLS()`, so the switch was lost on refresh and never synced
  to other devices. Added `S.formDirty=true;autoSaveLS()` (matches every sibling loadsheet handler). Also
  corrected a stale/misleading comment on the CoG **signing gate** in `shared.js` (v27.76 moved the gate to
  the flight-manual envelope; the comment still said it used the rectangle — no code change). Verified clean:
  per-seat 7-map moves, CoG-envelope NaN/div-by-zero guards + fallback chain, v27.78 transport reorder
  broadcasts via `pickupSave`, XSS escaping on the v27.77 passenger list/seat bubbles, all date sites
  `_rIso`/`_todayLocal`-guarded. build + `node --check` (4 blocks) → 0 errors; live truesouth.netlify.app
  loads clean with **no console errors** (read-only). ⚠️ **COMMIT BLOCKED:** the VM session can't write to
  `.git` and stale `.git/HEAD.lock` + `.git/index.lock` (26–27 Jun) are present — NOT deleted (per rule).
  v27.79 is built + in the working tree but UNCOMMITTED; Andrew must clear the locks and commit.
- **v27.48 — nightly sweep: 3 date/UTC off-by-one fixes.** `ARCHITECTURE_REVIEW_v27.48.md` is
  the latest full sweep (first sweep doc since v26.76; covers the v26.77→v27.47 cycle). All three fixes
  are the same root cause — a LOCAL `Date` formatted via `toISOString().slice(0,10)`, which lands on the
  previous calendar day in NZ (UTC+12/+13): (1) `rezdy.js _wxNextDays` Weather-call reschedule chips
  stored a date one day early; (2) `maintenance.js` oil-history grid keyed every row a day early so real
  oil entries showed as gaps; (3) `maintenance.js renderMaintEstimator` next-check/engine/prop estimate
  dates jittered ±1 day by load time. All now use the local-date helper `_rIso` (guarded). Verified clean
  this run: per-seat field maps (all 7 move together in every handler), weather-calls realtime
  broadcast/persist, XSS escaping on weather + user-prefs, maintenance NaN guards (the v26.76
  ml_hours/ml_used backlog item is closed — `addMaintEntry` already guards `!hours`). build + `node
  --check` (4 blocks) → 0 errors; live truesouth.netlify.app loads clean (read-only). Stale
  `.git/index.lock` from 26 Jun present but NOT deleted (temp-index commit trick sidesteps it).
- **v27.18** — **whole-day allocator refinement (true whole-day cost, not just greedy).**
  scheduling.js. Extracted the forward sim into `_schedSimulate(date,opts,forced)` (forced = map of
  depKey→[ac] to PIN an unlocked departure; empty forced = the exact old greedy). `_schedDayPlan` now
  runs the greedy then a bounded hill-climb: `_schedDepCandidateSets(date,d)` lists feasible covering
  aircraft sets (seats≥pax + group-pack, cnt≤3, top 8 cheapest), and each round it tries reassigning ONE
  unlocked departure, re-costs the ENTIRE day via `_schedSimulate`, and keeps a move only if the verified
  day TOTAL is strictly cheaper (>$0.5) and paxShort no worse — so it can NEVER be worse than the greedy,
  it just catches greedy's myopic calls (cheap tail at 0930 that forces a pricey ferry at 1200). Locked/
  departed deps untouched. Skipped for `opts.maxAircraft` sweeps / `opts.noRefine`. Recursion safe via the
  existing `_schedAutoBusy` guard. NOTE: it optimises pure $ — if a day still ferries it's because that IS
  the cheapest by the Route costs; a flexibility/"keep-a-spare" preference would be a separate lever.
- **v27.17** — session refresh + sync-queue flush on app foreground (mobile sleep pauses the JWT-refresh
  timer, so an idle phone woke with an expired token and signed loadsheets 401'd into the queue).
- **v27.16/15/14/13** — iPhone login fixes: removed nested overflow scroll container (standalone tap
  swallow), full-width email input (programmatic focus suppressed the keyboard), removed card
  backdrop-filter (iOS touch swallow), FLB flight type added. v27.12 = FLB.
- **v27.11** — **Logbook: co-pilot auto-from-calendar + flight-card notes surfaced.**
  flightrecord.js. Field is `copilot` (lowercase, existing DB column) — a personal Logbook (`_lbRender`)
  already had a Co-Pilot column but nothing populated it. New `_frCoPilotForAc(ac)` reads the calendar
  co-pilot (`_rzSchedCoPilotFor` over `_schedDayFlights` for that tail) and auto-fills it on the OFF-BLOCKS
  draft (`frUseFlight`), `frOffBlocks`, `frAddManual`, and logbook `frLbAdd`; editable on the flight card
  + both edit forms; shown in the Aircraft-records table (new Co-pilot column), resolved to a name via
  `_frPilotName`. NOTES: the OFF-BLOCKS flight card now has a Notes textarea (carried into the record);
  the personal Logbook gained a **Notes** column + edit field (was only "Details"); the Aircraft-records
  Notes column now WRAPS (was truncated). (Co-pilot is recorded on the PIC's record; does not yet credit
  the co-pilot's own F&D/logbook — possible follow-up.) v27.10 = Allocation-order card wording fix +
  pilots-don't-restrict-aircraft note.
- **v27.09** — **allocator constraint ranking made explicit + visible.** The cost-aware
  aircraft/passenger allocator already enforced the hierarchy Andrew wants (confirmed in code, no
  behaviour change): (1) HARD seat capacity — a subset only qualifies if seats ≥ pax AND every booking
  group packs whole (`_schedCanPack`); (2) lowest TOTAL DAY cost — `_schedDayPlan` plans every UNLOCKED
  departure together (route + empty-ferry + SDB/call-in costs), the covering score in `_schedPlanPick`
  is `[inc, fer, cnt, -pri, cap]` (cost first); (3) aircraft priority ★ (`_schedIsPriority` from
  `S.maintenance.priority`) is only the `-pri` tiebreak, so it's the FIRST soft rule broken when a
  cheaper plan needs it; manual pins (`_rzBookingAc`) win above all, locked/departed deps are skipped.
  Added a visible **"Allocation order"** card in Scheduling settings (4 ranked rules) + a CONSTRAINT
  RANKING doc comment above `_schedPlanPick`. NOTE: the day plan is a forward resource-aware GREEDY, not
  a proven global optimum — if specific days allocate sub-optimally, capture them and we can add a
  bounded whole-day local-search refinement on top.
- **v27.08** — **Today page improvements + Start of Day retired.** Today (`renderHomeToday`,
  startday.js) now: (1) shows pax SPLIT by type (A/C/i, e.g. "5A 2C 1i") on the headline chip + each
  departure row via `_rzBdCompact`; (2) shows co-pilot beside the PIC on each departure row
  (`_rzSchedCoPilotFor`); (3) has a **Transport · drivers** card listing each vehicle + its driver(s),
  read from `S._pickupDrivers` (keyed `vi|dep`) via `_rzVehName`; (4) folds the live exceptions list
  (`_sodScan`) inline — the attention banner expands/collapses it (`S._todayExOpen`) with each row deep-
  linking via `sodJump`. **Start of Day page removed**: HOME_OPTIONS entry, drawer button, and the Today
  quick-link/banner-link all gone; the render dispatch for `S.section==='startday'` now redirects to
  Today. `renderStartDay`/`sodRun` remain as unreferenced dead code in startday.js; `_sodScan` is KEPT
  (Today uses it). The calendar is the source of truth throughout (`_schedDayFlights`/`_rzSchedPilotFor`).
- **v27.07** — **calendar = source of truth: per-booking "Change aircraft" button in the
  block detail.** Next to each booking's "View booking →" there's now a **✈ Change aircraft** button
  (`rezdySchedAcPickToggle`) that reveals an inline aircraft picker; clicking a tail calls
  `rezdySchedSetBookingAc(order,ac)` → writes `S._rzBookingAc[order]` (persisted pickup blob, breaks any
  flyback combine, pushes undo, broadcasts). This is the calendar override that flows to the seatmap
  (`acHint=_rzBookingAc`) on push/allocate and into the loadsheet. PIC + co-pilot already auto-seed onto
  the seatmap from the calendar (`_rzSchedPilotFor`/`_rzSchedCoPilotFor` → `S._rzManPic`/`S._rzManCoPic`,
  one-time per dep+ac) and ETD flows from the seatmap dep into `form.etd` (rezdyManCreateLoadsheet). NOTE:
  changing the calendar aircraft updates future pushes; already-seated seatmap pax move on the next
  push/allocate (not live).
- **v27.06** — **flight cards chain start TTIS from the last shutdown.** New
  `_frNextStartHours(ac,date)` (flightrecord.js) returns the highest `endHours` already recorded for that
  aircraft on the date, falling back to `_frAcHours`=`maintGetLatest` (the maintenance/airswitch number)
  for the day's FIRST flight. Used by `frUseFlight` (draft), `frAddManual`, the auto-pick draft, and the
  aircraft-button hours hint — so flight 2+ start where flight 1 finished instead of resetting to the
  maintenance number each time. (Maintenance number still only advances at end-of-day submit.)
- **v27.05** — **explicit "Mark departed" (lock + PIN), fixes lock-then-refresh dumping past
  departures into Unallocated.** Root cause: `schedToggleLock` only set a lock flag; a locked departure's
  aircraft was still resolved via `_rzBookingAc`→auto, and the auto-allocator returns a different/empty
  result for a past departure on the next refresh, so the booking fell into the Unallocated column. Fix:
  `schedToggleLock` now `_schedPinDeparture(date,time)` — writes each booking's current aircraft into the
  PERSISTED `S._rzBookingAc` map (pickup blob) on lock, and `_schedUnpinDeparture` removes them on unlock.
  Because it's a concrete pin, the calendar keeps showing each booking on the aircraft it left on, across
  a refresh. Added a **🛫 Mark departed / ✓ Departed** button to the calendar block detail panel (calls
  `schedToggleLock` with the block's date/time) + a small green 🛫 marker on departed grid blocks
  (`_departedIcon`). Scheduling-view lock button relabelled "🛫 mark departed/departed". Time-based
  auto-lock stays disabled (v26.93) — departure locking is now an explicit action, so running late or a
  late cancel won't auto-freeze; mark it departed when it actually goes.
- **v27.04** — **seatmap: per-departure open/close tabs (like loadsheets) + cards closed
  by default + drag-to-combine departures.** New `S._rzManOpenDeps` (null = all open default; array =
  only those dep keys open) — helpers `_rzManOpenDepsList/_rzManOpenDep/_rzManCloseDepInternal/
  _rzManOpenCard` + handlers `rezdyManCloseDep`/`rezdyManReopenDep`/`rezdyManDepDragStart`/
  `rezdyManDepDrop` (rezdy_b.js). The dep tab bar now shows each OPEN departure as its own tab with a ✕
  to close + a ⤬ to split a combined one; closed-but-populated deps show as faint ＋ "reopen" chips;
  **drag one dep tab onto another to COMBINE** (→ `rezdyManCombineDeps`, same as transport). `rezdyManPull`
  (push) opens the pushed dep(s) + focuses; combine/split keep the result open. Open set is per-device,
  per-day in localStorage (`ts_rzman_open_<date>`), reset on date change, restored in `rezdyLoadManifest`
  — NOT in the cloud manifest blob. Aircraft cards now default **closed** (`open=(_ov!=null)?_ov:false`);
  `rezdyManAllocate` opens the cards that received pax and `rezdyManDrop` opens the card it dropped into.
  `_rzManSelDep` + the render selDep now prefer OPEN deps.
- **v27.03** — **flyback blocks now freely draggable + resizable.** Bug: the flyback drag
  stored its override under `m.origStart`, which for a flyback was the *rendered* return time (not the
  held slot), because `g._origStart` was never set — so the drag wrote `prod|15:30` but the render read
  `prod|12:00` and ignored it (block snapped back). Fix: bkBlocks now sets `g._origStart=g._fbHeld`
  (the held slot) for every flyback, so the drag/edge override round-trips. Flybacks are also resizable
  now (`_canResize` no longer excludes them): drag the TOP edge → return (fly-back) time
  (`_rzFlybackTime`), drag the BOTTOM edge → end/duration (new `_rzFlybackEnd` store +
  `rezdySetFlybackEnd`, default end = start+40). Moving the block shifts a custom end with it. New
  `flybackEnd` field persisted in the pickup blob (+reset on date change). Held-slot seat-block + the
  per-slot defaults (v27.02) unchanged.
- **v27.02** — **per-held-slot flyback default return times.** `_RZ_FB_DEFAULTS`
  (rezdy.js) maps the HELD outbound slot → default return: `10:30→14:00`, `12:00→15:30`, `13:00→16:15`.
  `_rzFbTime` falls back to `_rzFbDefaultTime(held)` (was hardcoded 15:30); the calendar flyback render
  gate is now `_fbOv||_rzFbHasDefault(_fbHeld)` (was `sm===720`), so 10:30/12:00/13:00-held flybacks all
  show at their own return time, keyed per slot, still draggable (override persists per slot). Detail
  "reset to …" label shows the slot's default. Other (unmapped) slots fall back to held-slot display
  until dragged. To add a slot default, edit `_RZ_FB_DEFAULTS`.
- **v27.01** — calendar block polish. (1) Co-pilot now shows in the block TITLE as
  `JC+MS/SLQ 3A FLB` (label at bkBlocks `g.label`, adds `+coPilot` after the PIC); the small `✈JC+MS`
  second-line text was removed. (2) A small green ⚙ (`_autoIcon`) shows on a block when the pilot was
  auto-allocated (`b.pilotAuto`), beside the amber ✋ forced icon. (3) Flyback held-slot behaviour
  RESTORED (kept the `_fbOv||sm===720` gate): FLB/CCF seats stay held in their 1200 Rezdy slot to block
  1200 seats (anti-overbook); the calendar shows 1200-held/overridden flybacks at the return time
  (default 15:30, block 15:30–16:10) keyed per held slot, so summer flybacks in other slots keep their
  own return time. (v27.00's "block starts AT the flyback time" fix stands.)
- **v27.00** — three fixes. (1) **Loadsheet sign-to-submit silently lost.** On a stale
  session (esp. an idle Android phone) the REST write 401s; `sbU` only queued retries for 5xx/0, so the
  signed loadsheet was DROPPED yet `submitLsInPlace` toasted "submitted ✓". Now `sbU` enqueues
  ts_loadsheets/ts_flight_records writes on 401/403 too (→ `ts_sync_queue`, replayed on reconnect /
  `_sbFetch` token-refresh / boot / `online`); `submitLsInPlace`+`handleSubmit` check the result and
  toast a clear "signed on THIS device, NOT yet uploaded" warning on failure; both now broadcast
  `ls_signed` (with id) so desktops live-refresh the Signed list + open tab (was `ls_saved` only, which
  didn't update an open tab / didn't re-render off the Saved tab). (2) **Mute all sound** toggle on the
  account/sign-out modal (`window.toggleMute`, persisted `ts_muted`; `_soundMuted()` gates `_rzChimeBeep`
  + `_notifChime` incl. vibrate). (3) **Flyback block drag** — a FLB/CCF block rendered 20 min below its
  stored time (`[ft+20, ft+60]`), so dragging to 15:00 snapped to 15:20; now the block STARTS at the
  actual flyback time (`[ft, ft+40]`), matching the dropdown + the drop position.
- **v26.99** — **Calendar co-pilot.** A flight block can now carry a CO-PILOT in addition to
  the PIC. Click a block → **Set co-pilot** picker in the detail panel (drag/Set-pilot still SWAPS the
  PIC; this ADDS a 2nd crew). Co-pilot need NOT be type-rated; the current PIC is excluded. Store:
  `S._schedCoPilots[key]` (same `ac|HH:MM|prod` key as `S._schedPilots`), persisted in the pickup blob
  (`schedCoPilots` field) + reset on date change + synced via `_rzSchedBroadcast`. Handlers
  `rezdySchedSetCoPilot`/`rezdySchedClearCoPilot` (rezdy.js); resolver `_rzSchedCoPilotFor` (rezdy_b.js,
  no auto fallback). Flows through: **seatmap** auto-seeds `S._rzManCoPic` (seat 1) one-time per
  departure+ac via `S._rzManCoSeed`/`_rzManCoAuto` (manual change/clear wins); **loadsheet** already
  reads `_rzManCoPic`→`form.coPilot`; **pilot movements** mirrors the leg into the co-pilot's lane (＋co).
  Block shows `✈PIC+CO` on the grid + a co-pilot pill in the detail header. ⚠️ uncommitted until lock clear.
- **v26.76** — NEW **Start of Day** + **Today** screens (`modules/startday.js`): one-action
  morning flow (pull Rezdy → declared-weight preview → allocate aircraft + pilots) + a live exceptions
  dashboard, and an at-a-glance landing dashboard (departures board, counts, owing, quick links). `today`
  is selectable as a home via the "Open the app to" picker (default landing stays Bookings/operations);
  both pinned to the top of the drawer. **`ARCHITECTURE_REVIEW_v26.76.md`
  is the latest sweep**: XSS in loadsheet pax-pills + presence bar escaped; `lsDropOnUnalloc` + loadsheet
  "Clear" now call `autoSaveLS()`; `sodRun` try/finally; scheduling subset-enum guards. A **nightly automated
  sweep** is scheduled (`nightly-fms-sweep`, ~00:04 daily): full app bug sweep + architecture audit +
  testing + morning report. ⚠️ v26.75–v26.76 are built + in the working tree but **uncommitted** — a stale
  `.git/HEAD.lock` blocked commits (NOT deleted, per rules); clear it and commit.
- Breakdown recovery engine (v26.66–v26.72, **superadmin-only / WIP**, hidden behind `S.user.superAdmin`):
  where-it-broke axis (base vs stranded) + recovery moves (spare / bring-parked-online / ferry-extra-run /
  rebook-later / split-across-tails / fill-spare-seats-then-cancel / outstation empty-collect) with Undo +
  1–6h/7+ duration.
- Earlier: **v25.97** — built+verified. **`ARCHITECTURE_REVIEW_v25.97.md` is the latest
  full bug sweep** (3-area parallel audit: calendar pointer-drag/overrides, scheduling allocator,
  architecture/security/persistence). Fixed in v25.97: H1 manual-pilot double-book, A1 spurious
  "moved" banner, A2 stuck drag preview, A3 unalloc no-op reassign, A4 drag NaN guard, M3 Branches
  priced as Milford. OPEN backlog there: M1 two auto-pilot maps (seatmap PIC vs calendar), M2 two
  away-time models, C1 flight-records/flightduty not live-synced, C2/C3/A5 minor, + this CLAUDE.md
  is otherwise stale below (modules flightrecord/scheduling/training/businessplan + the whole v25.x
  cycle aren't documented in the older notes that follow).
- v25.x highlights since v24.x: **Scheduling** module (cost-aware aircraft + time-aware pilot
  allocation — pilots stay with the aircraft for the whole rotation, only switch when back in QN;
  unified live "Route costs" table is the single source the allocator reads; per-dest away-time;
  no-ferry toggle; SDB-own-endorsement + type-based ratings). **Calendar**: pointer-based block
  move/resize (drag top=departure, bottom=return, middle=move/reassign, tap=open), editable flyback
  time, maintenance block spans between the QN-WF/WF-QN ferries, draggable manual/ferry blocks,
  Aircraft-movements view. **Flight records** manual add + logbook entry. **Loading screen**:
  mountains-draw + plane-takeoff animation with a Skip button. **Rezdy**: webhook + {import} backfill
  for advance bookings the search hides; per-(order,date) storage.
- Earlier snapshot below (pre-v25, may be stale):
- Latest version was **v24.42** — built+verified. See `HANDOFF.md` for the full log.
- **`ARCHITECTURE_REVIEW_v24.41.md` is the latest full bug-sweep** (3-reviewer audit of F&D +
  Transport + core). Fixed in v24.41: F1 crew `reloadTable` dropped `dob`/`typeRatings`; transport
  drop-off location/time override id; `'~'`→`'—'` dep sentinel; F&D orphan empty rows, days-off
  counting today, landing int-coercion, `fdSetLimit` NaN guard, non-manager query scope, printed
  rolling figures at period-end; W&B `calcFormWB` null-guard.
- **v24.42 — F2/F3 roster/leave blob save FIXED (merge-before-write).** New `window._rosterApplyAndSave(changes)`
  in roster.js re-GETs the latest cloud roster and applies ONLY the changed cells (`{ds:{uid:val|_RDEL}}`)
  onto it, so a concurrent device's other cells survive (was last-writer-wins). All three writers route
  through it: `saveRosterToCloud` (draft = delta), `_rDoApplyBuild` pattern-push (now async, toast gated
  on save result), and leave `_lvStampRoster`/`_lvUnstampRoster`. Also F7 (leave "today" uses local
  `_rIso` not UTC) + F8 (guard `submitted_at`). ⚠️ still wants a two-device real test.
- **v24.43 — F5 + F6 fixed (audit backlog cleared).** F5: the loadsheet "Fuel at Dest" / below-reserve
  banner now consumes `calcFormWB`'s `fuelRemKg`/`finalReserveKg`/`reserveOk` (single source of truth, can
  no longer disagree with the submit gate). F6: leave `total_days` is recomputed against the current
  roster on **approve** (RDOs excluded), not frozen from a stale submit-time roster. All audit items from
  `ARCHITECTURE_REVIEW_v24.41.md` are now addressed.
- **TSF Business Plan (v24.41) — NEW MODULE `modules/businessplan.js`.** Admin/superadmin section
  gated by the new **`businessplan`** perm. v1 = the interactive **Acquisition (Main Plan)** model:
  editable finance tranches (amount/rate/type io|pi/term) → live interest, monthly/annual repayments
  (`_bizMonthly`: io = amount×rate/12, pi = amortising PMT) + totals; editable asset-valuation table;
  notes. Persisted to `ts_settings` key `business_plan` (cache `ts_business_plan`), lazy-loaded via
  `window.loadBusinessPlan`. Seeded from the spreadsheet (`BIZ_DEFAULT`).
  **v24.44 — Loan schedules tab (`_bizRenderLoans`):** reusable amortisation engine `_bizLoanSchedule`
  — each loan = principal/rate/term/start + editable **interest-only months** + **lump-sum paydowns**
  (re-amortises after each); month-by-month schedule + summary; seeded KBC1/KBC2/SHD/Vendor;
  engine unit-tested. **v24.46–v24.49 — ALL workbook tabs now built & interactive:** Running costs
  (per-aircraft cost/hr), Loan timeline (consolidated monthly cashflow), Pay rates, Pax tracker (daily
  vs target/last-year), FY Budgets (FY26/27 pax+revenue forecast — drivers→departures→pax=Σeffseats×dep
  →revenue, verified vs sheet), and P&L (FY26/FY25 — line items→Total COS/Gross/EBITDA, seeded via
  `_bizPnlDefault()`, totals verified vs sheet). All seeded from the .xlsx and persisted to ts_settings.
- **Flight & Duty (v24.37–v24.40) — `modules/flightduty.js`.** Advisory NZ flight-and-duty +
  currency tracker (now live). See below for the engine; v24.39 added the look-ahead headroom panel
  + running Duty-30d column; v24.40 added 15-min time dropdowns/steppers + a "now" button.
- **Flight & Duty (v24.37) — NEW MODULE `modules/flightduty.js`.** Advisory NZ flight-and-duty +
  currency tracker for the superadmin "Flight & Duty" nav section (now live, gated by the new
  `flightduty` perm; `flightduty_manage` = see/certify all pilots). Single-pilot VFR, AC119-2 /
  SLA Exposition §4.8, **ATO+CTO combined envelope**. Engine: configurable limits (`FD_LIMITS_DEFAULT`
  overlaid by `S._fdLimits` from `ts_settings` key `fd_limits`; per-limit amber/red %), rolling-window
  sums (flight 7/28/30/90/365; duty daily+30), 90-day day-currency per type (C208B/GA8), days-off from
  the roster (RDO/leave → 2/14 + 2-consec/30). Data: per-pilot/day rows in **`ts_flightduty`** (keyed
  `user_id|YYYY-MM-DD`, cached `ts_flightduty_cache`) + monthly certifications in **`ts_fd_certs`**
  (`user_id|YYYY-MM`); lazy-loaded via `window.loadFlightDuty`. Screens: **Pilot/My Record** (month
  grid, one row/day: duty start/end → duty h, flight h, landings by type, 12h-extended flag; live
  limit panel green/amber/red; currency panel; monthly **print & certify/sign**) and **Team Summary**
  (all pilots vs 30-day duty/flight + currency, for rostering). Limits editor in **Settings ▸ Operations
  ▸ Flight & Duty** (`renderFDLimits`). Profile gains **DOB + type ratings (C208B/GA8)** (crew cols
  `dob`,`type_ratings`). ⚠️ **Andrew must apply `flightduty.sql`** (new tables + 2 crew columns + RLS)
  — until then the page works in-session but does NOT persist. Self-entry now; auto-fill of landings
  from calendar PIC allocation is the next step. NOT a controlled record until printed & signed.
- **v24.36 (misc):** (a) theme now DEFAULTS TO LIGHT — head.html boot applies `data-theme=light`
  unless `ts_theme==='dark'` (was: dark default, light opt-in); toggle still persists choice. (b)
  Maintenance **estimator** next-check/engine/prop dates show the full date "14 Aug 2026" (`fmtEst`
  now `{day,month:'short',year}`). (c) Maintenance **Search** has quick-range buttons
  (`window.maintSearchRange`): Last month / Last 3 months / Last 12 months / Last calendar year /
  Last FY (NZ 1 Apr–31 Mar, last completed) / Clear. (d) Two **superadmin-only placeholder** tier-1
  sections pinned to the bottom of the drawer: **Flight & Duty** (`flightduty`) and **TSF Business
  Plan** (`businessplan`) — gated in `_sectionAllowed` + the render dispatch on `S.user.superAdmin`,
  rendering `_renderPlaceholderSection` ("Coming soon").
- **v24.35:** fixed loadsheet archive→signed revert on refresh (`reloadTable` dropped
  `drive_uploaded`); printed bookings run-sheet swaps In column for an aircraft pill.
- Earlier latest was **v24.31** — built+verified, ready to commit. See `HANDOFF.md` for the full log.
- **Transport (pickups + drop-offs) (v24.31):** the Ground ▸ **Pickups** sub-tab is renamed **Transport**
  (id still `pickups`). `_rzPickups` now emits, for every non-flyback non-self-drive pickup, a SECOND
  "drop-off" entry (`id+'|D'`, `depart=_rzDropDep(pdep)` = `'↩'+dep`, `dropoff:true`) duplicating the
  pax for the tour's return; flybacks stay a single drop-off under `'Flybacks'`; self-drive pax get no
  drop-off. Every entry carries `ac=_rzBookingAc(b,order)` (aircraft flown). New helpers near
  `RZ_FLYBACK_DEP`: `RZ_DROP_PREFIX '↩'`, `RZ_PK_COL`(green)/`RZ_DROP_COL`(amber), `_rzDropDep`,
  `_rzIsDropDep`, `_rzDropDepBase`, `_rzTransDepLabel`, `_rzTransDepSort`, `_rzAcPill`. Drop-off
  departures are first-class (flow through the per-dep van/driver/ack model). The board: departure
  chips are colour-coded (pickup green / drop-off amber) with ◀▶ **reorder** controls (persisted in
  `S._rzDepOrder` → blob field `depOrder`), a **✈ By aircraft** toggle (`S._rzTransByAc`) that groups
  each van's stops under aircraft sub-headers, and an aircraft pill on every drop-off card (dispatch +
  My Pickups). NOT YET: auto-merging a tour's drop-off with the flyback run into one combined return
  (they're separate reorderable departures for now; combine by assigning the same driver/van to both).
  No fixed return times (operator reorders the list). ⚠️ NEEDS a real-device pass.
- **Flyback drop-offs (v24.30):** flyback items (FLB/CCF) in `_rzPickups` now get `depart=RZ_FLYBACK_DEP`
  (`'Flybacks'`) + a `dropoff:true` flag instead of inheriting the held outbound time — so they form
  their own **Flybacks** departure on the Pickups board / My Pickups. Dropoff cards/labels swap
  "Pickup"→"Drop-off", 📍→📦, "Mark collected"→"Mark dropped off", show a 🛬 FLYBACK DROP-OFF tag,
  and the dep chips/tabs read "Flybacks ⬇ / 🛬 Flybacks" with a "drop" unit. (pickupTime is still
  whatever Rezdy supplies — afternoon dropoff time refinement TBD.)
- **Calendar (v24.29):** (a) FLB/CCF held in a **1200** Rezdy slot now render as a 1-hour block
  **15:30–16:30** (the actual flyback time), not the held outbound slot — in the bkBlocks map:
  `if(_rzIsFlyback(g.product)&&sm===720){g.start='15:30';g.end='16:30';}` (key/grouping unchanged,
  so `_rzOrdersForBlockKey` still matches the original `ac|12:00|FLB`). (b) **Drag a booking block
  to another aircraft column** → reassigns every booking in it to that aircraft as a user-style
  selection (`S._rzBookingAc[order]=ac`, overrides comments) via `_rzReassignBlockToAc` +
  `rezdySchedDropBlockToAc(ac,e)` on the column; all booking blocks are now `draggable`. Block-on-
  block still folds a flyback into a flight (combine); any other block-on-block reassigns. Drop on
  the **Unallocated** column → `__none__`.
- **Pickups are now PER DEPARTURE (v24.28).** Drivers, the active/parked van set, and driver
  acknowledgement are all tracked per `(vehicle, departure)`, keyed `"vi|dep"`:
  `S._pickupDrivers`, `S._pickupSpare`, `S._pickupAck` are now OBJECTS keyed `_pkKey(vi,dep)`
  (were arrays/vi-keyed). Old blobs START FRESH (array `drivers` / vi-keyed `spare`/`ack` → `{}`).
  Helpers: `_pkKey`, `_rzVanParked(vi,dep)`, `_rzActiveVanCount(dep)`, `_rzVanDriver(vi,dep)`,
  `_rzAllDeps()`, `_rzVanDepIds(vi,dep)`, and per-`(vi,dep)` ack (`_rzVanSig/Ack/Acked/AddedIds/
  RemovedIds`). `_rzAutoVans`/`_rzEnsureVans` compute the active set + new-pickup placement per
  departure. The dispatch board resolves `depFilter` BEFORE the driver/spare bins; My Pickups is
  built from `myRuns` = `(vi,dep)` where I'm the assigned driver. Manual run order stays keyed
  `vi|dep` (shared by dispatch + driver). ⚠️ NEEDS a two-departure / two-driver real-device test.
- Earlier: **v24.27** dispatch pickup reordering (▲▼ `myPkMove`) + ongoing mobile unacked chime;
  **v24.26** change-driver resets that run's ack + notifies the new driver.
- **`ARCHITECTURE_REVIEW_v24.14.md` is the latest full bug-sweep** (6-reviewer audit) — what was
  fixed in v24.15/v24.16 + the prioritised OPEN backlog (roster pattern-push data loss, roster
  whole-blob save merge, leave L-A/L-B/L-C, cross-aircraft seat-swap, dep|acId fuel/crew keying,
  aircraft_obs live-sync, charter quote ids, maintenance UTC dates, etc.).
- Recent work (v24.14 → v24.16):
  - **v24.14** nav restructure: Calendar → own tier-1 section + new `calendar` permission;
    Pickups/My Pickups → Operations ▸ **Ground** (tier-2, tier-3 sub-tabs via `S._groundTab`);
    pickup-location editor → Settings ▸ **Operations** (tier-3, `renderAdminOperations`); the empty
    Rezdy section retired with a `render()` migration shim (`S.section==='rezdy'` remapped).
  - **v24.15** bug-sweep pass 1 (W&B safety: submit-below-reserve gate, lsCoPilot seat-1 orphan,
    lsAc removedSeats phantom weight; realtime guards: ls_saved echo, manifest/pickup live-reload
    focused-input guard, roster_colors guard, ts_scratchpads backfill; scratchpad XSS; saved pax
    summary; rezdyManClear; pickup-override prune; `_todayLocal()` UTC fix; missing perm keys).
  - **v24.16** UI/responsive/login (resize→mobileView reflow, 40px touch targets, drawer width,
    login 16px inputs; arrow/⌘-arrow include Ground+Calendar; Ground sub-tab persists; dead Rezdy
    perm column removed).
- Recent work (v24.12 → v24.13):
  - **Pickup-location master list** (v24.12): new editable list under Operations ▸ Pickups ▸
    **📍 Locations** (`_rzRenderPickupLocs`) — name · address · minutes-before-departure per row,
    add/edit/delete. State `S._rzPickupLocs`, persisted to `ts_settings` key `rz_pickup_locs`
    (localStorage cache `ts_rz_pickup_locs`), live-synced via the `ts_settings` realtime reload.
    Seeded once from the 114-row Rezdy pickup list (`_RZ_PICKUP_LOC_SEED`); the first device to
    open the editor writes the seed to the cloud. Editing gated by the `rezdy` perm (view-only
    otherwise); min-prior validated; fields HTML-escaped (`_rzEsc`).
  - **Realtime backlog A2/A3/A4 + R-A done** (v24.13):
    - **A2** pickups/check-ins live-sync — `pickupSave` now fires `_rzPickupBroadcast()`
      (`pickup_update`, date+sessionId), received in shared.js (date+echo guarded) →
      `window.rezdyReloadPickupLive()` re-pulls the blob without the loading flash.
    - **A3** roster/roster_colors live propagation — both keys added to the realtime
      `ts_settings` reload `in.(…)` list + handlers; the `roster` apply is SKIPPED while a local
      draft is open (`_rosterUnsaved()`) so in-progress edits aren't clobbered.
    - **A4** reconnect backfill — on socket re-open also re-pulls `ts_settings` (covers
      roster/roster_colors/rz_pickup_locs/fuels/perms) + the current-date Rezdy
      manifest/pickups/lstabs/calendar (broadcast-only state), not just manifests/loadsheets.
    - **R-A** `rezdyManCreateLoadsheet` seat-fill — replaced the dead `seatOf['__'+n]` guard with
      a real occupancy set (`used{}`): reserves the co-pilot seat + every explicit manifest seat
      up front and marks seats as filled, so a fallback pax can no longer overwrite a seat a later
      pax owns.
- Recent work (v24.05 → v24.11):
  - **Auto-PIC from the calendar** (v24.10): the seatmap auto-sets each aircraft's PIC from the
    calendar's pilot allocation for that aircraft+departure (`_rzSchedPilotFor`); one-time seed
    per departure+aircraft (`S._rzManPicSeed`/`S._rzManPicAuto`), manual change/clear always wins.
    The seatmap lazy-loads the pickup blob (`S._rzManPickupSynced`) so `S._schedPilots` is present.
  - **Calendar** (v24.10–v24.11): arrow keys / swipe-outside-grid cycle the DAY; whole-day pax
    breakdown at the top (matches Bookings header); "View booking →" now jumps to Operations ▸
    Bookings (was a dead rezdy sub-tab); the red "now" line repositions in place via
    `_rzTickNowLine` (no more per-minute flash); visible time window fits the day's blocks
    (`_RZ_SCH_START`/`_RZ_SCH_END` are now `let`, recomputed each render: earliest−1h … latest+1h).
  - **Refresh UX** (v24.06–v24.07): no login flash on refresh (`S._authRestoring` → spinner, 8s
    fallback); the Operations day persists across a refresh (sessionStorage `ts_rezdy_date`,
    `_rzInitDate`).
  - **Arrow keys** (v24.07): roster ←/→ shifts the week (via `_navAway`); maintenance ←/→ cycles
    tier-2 tabs (`_maintTabIds`). Maintenance estimator dates show a 3-letter month.
  - **Totals/breakdowns** (v24.05): roster Totals row shows per-day staff-on-duty count + total
    headcount; Bookings header shows `55A · 5C · 2i` + "N seats sold" (infants excluded).
  - **v24.08**: pilots no longer all show "off" on the seatmap — `_rzAvailablePilots` lazy-loads
    the roster (it used to read an empty `S.roster` unless the Roster page had been opened).
  - **v24.04** full bug-sweep/audit fixes (W&B co-pilot orphaned-bag + removed-seat submit gate;
    toast/seat-name XSS escaping; cancelled bookings no longer create pickups; maintenance cancel
    notice; build.py hardening). Editable **Standard Fuels & Burns** table is v24.02
    (`S._rzFuelOv`/`rz_fuel_ov`, overlaid via `_rzEffCfg`).
- Operations is the Rezdy-powered flow (Bookings / Seatmap / Loadsheets); legacy manifest.js
  retired. Seatmap departures keyed by TIME+DESTINATION; `_RZ_PROD_CFG` in rezdy.js is the
  built-in product→{dest,fuel,burn} config, overlaid by editable per-destination overrides
  (`_rzEffCfg`). Manual fuel via `form._fuelUserSet` always wins.
- Open backlog (see `ARCHITECTURE_REVIEW_v24.04.md` §3): confirm RLS migrations applied live
  (auth code is on); make leave-day counts compute live (L-A/L-B); shared crew-code keying
  (L-C); split-destination push focus (R-B); roster save-guard leaks; notification recipient
  gating. **DONE in v24.13:** A2 (pickup live-sync), A3 (roster live-sync), A4 (reconnect
  backfill), R-A (seat-fill overflow guard) — still want a real-device pass on the test branch
  for the three realtime ones.
- Rezdy API options (see `REZDY_API_REFERENCE.md`): availability is readable; bookings can be
  created/cancelled and have status/customer/participant edited — but **date/time/product moves
  are NOT supported** by the API. Current edge fn is read-only.
