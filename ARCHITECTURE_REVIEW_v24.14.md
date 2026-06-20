# TrueSouth FMS — Architecture Review & Full Bug Sweep (v24.14 → v24.16)

_Date: 2026-06-21. Supersedes `ARCHITECTURE_REVIEW_v24.04.md` (the v24.04 backlog items A2–A4 / R-A
are now done — see v24.13). This pass was a full, file-by-file audit (6 parallel reviewers, one per
module group) plus the v24.12–v24.16 feature/nav work._

> **Commit state at time of writing:** v24.12 (`136038c`), v24.13 (`3c0e2d5`), v24.14 (`6f549bb`),
> v24.15 (`bcad457`) are committed. **v24.16 is built + verified but NOT yet committed** — the
> commit hit a stale `.git/HEAD.lock` (Andrew clears these manually). This report itself, plus the
> `HANDOFF.md`/`CLAUDE.md` updates, are also waiting on that lock. Clear the lock, then commit.

---

## 1. What shipped (v24.12 → v24.16)

- **v24.12** — Editable master pickup-location list (114 rows seeded from Rezdy), `ts_settings`
  key `rz_pickup_locs`, live-synced. (Later moved to Settings ▸ Operations in v24.14.)
- **v24.13** — Realtime backlog **A2** (pickup live-sync), **A3** (roster/roster_colors live),
  **A4** (reconnect backfill), **R-A** (seat-fill overflow guard). _Still want a real two-device
  pass on the test branch._
- **v24.14** — Navigation restructure: **Calendar** → its own tier-1 section + new `calendar`
  permission; **Pickups / My Pickups** → Operations ▸ **Ground** (tier-2, tier-3 sub-tabs);
  **pickup-location editor** → Settings ▸ **Operations** (tier-3); empty **Rezdy section retired**
  with a `render()` migration shim.
- **v24.15** — Bug-sweep pass 1 (correctness + W&B safety). See §2.
- **v24.16** — Bug-sweep pass 2 (UI / responsive / login / nav polish). See §2.

---

## 2. Fixed in this sweep

### v24.15 — correctness & safety
- **[W&B, SAFETY] Submit enabled below final reserve.** `canSubmit` (loadsheet.js) didn't include
  the reserve check, so the green **Submit** button showed for a sheet below the 30-min final
  reserve even though the submit handler blocked it. Now gated on `!_belowRes` (matches the red
  banner). _Safe-side change._
- **[W&B, SAFETY] `lsCoPilot` orphaned per-seat maps.** The clear/else branches deleted only
  `seats[1]`/`names[1]`, leaving `bags[1]`/`paxGroups[1]`/`paxType[1]`/`paxPaymentReq[1]` — an
  orphaned `bags[1]` was then counted as crew weight by `calcFormWB`, inflating signed TOW/CoG.
  Rewritten to always clear all seat-1 maps, always pool a displaced passenger, and seat the
  co-pilot with a blank weight if the crew record has none (verified with a runtime harness).
- **[W&B, SAFETY] `lsAc` ignored `removedSeats`.** Switching to an aircraft with removed seats
  (e.g. ZK-SLB `[12,13]`) left a pax in a removed seat — hidden on the grid but still counted =
  phantom weight. Excess detection/trim now honour `removedSeats` (mirrors `lsTrimExcess`).
- **[REALTIME] `ls_saved` echo + self-refetch.** The receiver had no `sessionId` guard and two
  `admin.js` senders omitted `sessionId`; the saving device refetched its own save (could overwrite
  a locally-open form). Added the guard + `sessionId` to both senders.
- **[REALTIME] Rezdy manifest/pickup live-reload clobbered in-progress edits.**
  `rezdyReloadManifestLive` / `rezdyReloadPickupLive` overwrote local state wholesale even while a
  field was focused (the new A2 path). Both now skip while an INPUT/SELECT/TEXTAREA is focused
  (mirrors the `ls_update` guard).
- **[REALTIME] `roster_colors` apply unguarded.** Now skipped while `S._rosterColorEdit` is open
  (was inconsistent with the adjacent `roster` draft guard).
- **[REALTIME] `ts_scratchpads` missing from reconnect backfill.** Added to the A4 `Promise.all`.
- **[XSS] Scratchpad title attribute breakout.** `titleSafe` didn't escape `&` first, allowing a
  literal `&quot;` to break out of `value="…"`. Now uses `esc()`.
- **[DATA] Saved-loadsheet pax summary** dropped the infant count whenever children were present
  (operator-precedence bug). Fixed.
- **[DATA] `rezdyManClear`** only reset pax + seats; PIC/co-pilot/fuel/cargo/hidden persisted and
  re-attached on re-push. Now resets all manifest-scoped maps.
- **[DATA] Pickup-location overrides** not pruned on `rezdyResetBooking` → stale overrides. Now
  pruned by `order|…` prefix.
- **[DATE] UTC off-by-one.** `bD()`/`bF()` (and the maintenance booking default) defaulted the date
  via `toISOString().slice(0,10)` (UTC) → wrong calendar day late evening NZ. New `_todayLocal()`
  helper.
- **[PAINT] Pad canvas /0** → `NaN` stroke points corrupting a saved drawing. Guarded.
- **[PERMS] Missing keys.** `ground_staff`/`accounts`/`marketing` lacked `maint_bookings` /
  `sign_loadsheet` keys (read as `false`, but inconsistent). Added for a complete key set.

### v24.16 — UI / responsive / login / nav
- **[RESPONSIVE] `S.mobileView` frozen at boot.** Now recomputed (same formula) on
  `resize`/`orientationchange` — iPad rotation / split-view / window resize now reflow the JS-gated
  layout, not just the CSS media queries.
- **[RESPONSIVE] Touch targets.** Mobile `.sub-tab`/`.nav-tab` bumped from ~26px to ~40px tall.
- **[RESPONSIVE] Drawer width** capped at `min(270px,82vw)` for narrow phones.
- **[LOGIN] iOS auto-zoom.** Email/password inputs 14px → 16px (the rest of the app already does
  this).
- **[NAV] Arrow-key Operations cycle** now includes **Ground** (matched the swipe cycle); ⌘/Ctrl
  +←/→ day-cycle also works on **Ground** and **Calendar**.
- **[NAV] Ground sub-tab persistence.** Ground ▸ Pickups/My-Pickups now survives a refresh
  (`groundTab` saved/restored in `ts_lastview`).
- **[NAV] Dead `rezdy` permission column** removed from the grid (the section was retired in
  v24.14). The stored key + `_sectionAllowed` case are left for migration safety.

---

## 3. OPEN backlog (found this pass, NOT yet fixed) — prioritised

Each item is tagged with the reviewing module and a concrete suggested fix. **HIGH = data-loss /
operator-trust / safety-adjacent.**

### 3.1 HIGH

- **[roster] Pattern "push" loses to a lingering draft (data loss).** The Build-Pattern tab switch
  bypasses `_navAway`; `rosterApplyPattern`/`_rDoApplyBuild` write `S.roster` directly, but
  `saveRosterToCloud` then merges `S._rosterDraft` back on top — so the pushed pattern is overwritten
  by stale draft cells on save. _Fix:_ route the Build/Roster tab switch through `_navAway`, and/or
  flush/refuse the pattern push while `_rosterUnsaved()`. _(Not done autonomously — touches roster
  save flow that needs a runtime test.)_
- **[roster, SUSPECT] Whole-blob roster save overwrites a peer's realtime change.** The A3 draft
  guard correctly skips applying a remote roster while a local draft is open — but then the device
  saves its **stale** `S.roster` (which never received the peer's change) as a whole blob =
  last-write-wins clobber of the peer. _Fix:_ on save, re-pull the latest persisted roster and
  3-way merge (persisted + remote-since + local draft) before upserting. **Needs a two-device test.**
- **[leave] L-A — `total_days` frozen at submit.** Stored once; the headline shows the stored value
  while the live "RDO excl" parenthetical recomputes off the current roster → they can disagree.
  _Fix:_ compute the headline from `_lvWorkingDays` live in the card/approvals view, or
  recompute+persist on approve.
- **[leave] L-B — Leave-day preview computed before the roster loads.** `renderLeave` sets
  `S._rosterLoaded=true` and fires a fire-and-forget load; the synchronous preview can run against
  an empty `S.roster` (every day counts as working) and an over-count can persist if submitted
  early. _Fix:_ gate the preview behind a real "roster loaded for this window" flag set only when
  the cloud promise resolves.
- **[roster/leave] L-C — Shared crew-code/initials keying cross-contaminates** roster + leave
  counts when two crew share a code or collide on initials (the roster writes under both `id` AND
  `ini`). _Fix:_ key new writes by `id` only; keep the `ini` read-fallback for legacy migration only.
- **[rezdy] Cross-aircraft seat swap strands the displaced occupant + its infant.** In
  `rezdyManDropSeat`, when the drag originates from a different aircraft the displaced `occupant`
  isn't re-homed and its infants aren't re-pointed (unlike `rezdyManDrop`). _Fix:_ pool the
  displaced occupant + re-point its infants on a cross-aircraft swap.
- **[rezdy] Manifest live-receive still has no "currently dragging" guard.** v24.15 added a
  focused-input guard, but a seatmap **drag** (no focused input) can still be clobbered by a peer's
  `rz_manifest_update`. _Fix:_ also skip/merge while a seat drag is in progress.
- **[maintenance/charter] Charter realtime clobber + no quote ids.** `charter_update` blindly
  replaces the local quote cache; rename/delete operate by array index → races overwrite/mis-target
  quotes. _Fix:_ give quotes a stable id, merge by id, and key rename/delete by id.

### 3.2 MEDIUM

- **[rezdy] Manual fuel / PIC / co-pilot keyed by `acId` not `dep|acId`.** An aircraft flying two
  departures the same day leaks fuel/crew between the two loadsheets (seats/cargo are correctly
  keyed by `dep|acId`). _Fix:_ key `S._rzManFuel`/`_rzManPic`/`_rzManCoPic` by `dep|acId`. (Also the
  auto-PIC seed flag mismatch, same root cause.)
- **[shared] `maintenance` realtime apply unguarded.** Any `ts_settings` change re-applies the
  maintenance blob (cross-key coupling via the single `key=in.(…)` fetch) → can overwrite a local
  maintenance edit. _Fix:_ add a maintenance edit-in-progress guard, or only apply on actual change.
- **[maintenance] `aircraft_obs` (defects/observations) persisted but NOT live-synced.** Absent
  from the `ts_settings` reload list + no broadcast. _Fix:_ add `aircraft_obs` to the reload list +
  an apply branch (mirror A3), and/or an `obs_update` broadcast.
- **[maintenance] Repeated date-edits re-spam notifications** (no dedup window). _Fix:_ debounce per
  (ac, booking, date, action).
- **[maintenance] UTC date off-by-one** in `_lastUpdatedLabel`, `daysSince`, the oil/estimator/
  search date generation (several `toISOString().slice(0,10)` sites). _Fix:_ use `_todayLocal()` /
  the inline local formatter consistently.
- **[leave] Notification recipients hardcoded by role, not by `leave_approve`.** A user granted
  `leave_approve` outside the hardcoded list is never notified (and revoked roles still are). _Fix:_
  derive recipients from effective `leave_approve` holders + `_lvCanApproveRole`.
- **[roster] Section-switch + pay-week toggle bypass `_navAway`.** Switching from a dirty roster to
  Operations/Maintenance via a section header, or toggling pay-week, loses the draft with no prompt.
  _Fix:_ route both through `_navAway` when `S.section==='roster'&&_rosterUnsaved()`.
- **[roster] `_rGetStatus` reads the live draft** for seatmap/pilot-availability (rezdy.js),
  diverging from leave counts (which read persisted only). _Fix:_ give non-grid callers a
  persisted-only read path.
- **[shared] `mergeDispatch` replace-branch wipes `seatMap`** on a newer `_loadedAt` even if local
  has unsynced pax (bypasses the per-pax `_ts` merge). **Needs a two-device test.**
- **[aerodromes] Featured-list toggle is last-write-wins** (whole-array replace, no per-icao merge /
  echo guard). _Fix:_ merge by union/diff.
- **[scratchpad] Text edits lost inside the ~2.1s autosave debounce** if the user navigates away.
  _Fix:_ flush pending pad saves on tab change / `beforeunload`. Also `clearPadCanvas` doesn't
  broadcast/autosave the clear.
- **[shell] Old `rezdy` last-views collapse to Calendar.** `rezdyTab` was never persisted in
  `ts_lastview`, so a pre-v24.14 saved `section:'rezdy'` can't distinguish Pickups/My-Pickups and
  the migration shim defaults to Calendar. _One-time transient_ (new last-views use the new
  structure + `groundTab`, fixed in v24.16). _Fix (optional):_ none needed going forward.

### 3.3 LOW / consistency

- **[shared] `_sbFetch` 401-refresh not single-flighted** — a burst of writes can race multiple
  refresh-token rotations. _Fix:_ cache the in-progress refresh promise.
- **[shared] Refresh timer not re-armed on `visibilitychange` resume** (only realtime is). _Fix:_
  call `_scheduleRefresh()` on resume.
- **[charter] Saved total ≠ displayed total** (the 2.5-hr minimum is applied on render but not in
  `saveCharterQuote`); **wait-cost "first hour free" applied per-leg** (label says one free hour).
  _Fix:_ one shared total helper; decide the free-hour policy.
- **[loadsheet] Hardcoded reserve constant `68.05` / `136.1`** duplicated in three places; **draft
  PIC weight re-synced on every view** (masks an intentional override); rounding precision differs
  across the summary vs the W&B card. _Fix:_ a named `C208_CRUISE_KGPH` constant; resync PIC weight
  only when empty/identity-changed.
- **[shell] `_defaultTabFor('calendar')` returns the unused tab id `'calendar'`** (harmless;
  Calendar renders off `S.section`). Minor.
- **[saved.js / maintenance] Sort assumptions** — the monthly summary's "last known before" assumes
  date-ascending `hist` but `loadMaintenanceFromCloud` doesn't re-sort. _Fix:_ sort before the
  lookup.

---

## 4. Verified-correct (checked, no action)

- **W&B unit model** (both reviewers): `toKg` (airvan litres×AVGAS / else lb×LB), `form.fuel` kg,
  `burnOff` display units via `burnToKg`, reserves `toKg(29)` airvan / `68.05` kg caravan — all
  consistent across seatmap preview, W&B preview, loadsheet create, and route re-default. Envelope
  test (`cogMin/cogMax`) matches between `calcAcWB` and `calcFormWB`.
- **Per-seat-index map integrity** on the move/swap/delete/clear paths (the v24.04 fix held); the
  only leaks were the two co-pilot/aircraft-change edges fixed in v24.15.
- **Instance-aware seating** (`_seatmapKey||acId`) resolution is consistent across the W&B helpers.
- **XSS posture** in rezdy.js is solid (customer/pax/pickup text all run through `_rzEsc`); the one
  gap (scratchpad title) is fixed in v24.15.
- **Rezdy realtime broadcasts** are echo-guarded (`sessionId` + date); the new `pickup_update`
  path matches.
- **Nav migration (v24.14)** — `calendar` perm present for all roles, content router + drawer +
  `_sectionAllowed` consistent, the `S.section==='rezdy'` shim remaps old deep-links.

---

## 5. Security posture (unchanged from v24.04 except where noted)

- Auth is live (GoTrue + JWT; RLS policies in `auth_*.sql`). **⚠️ Andrew must still confirm the RLS
  migrations are APPLIED in the live Supabase project.**
- Server gating is by permission, not row-ownership (any `operations` user can delete any
  loadsheet/manifest). No CSP (incompatible with the inline-handler UI).
- Rezdy API key is server-only (edge function env), not in the public bundle.
- The bundle is publicly readable — no secrets in it (verified).

---

## 6. Suggested next-session order

1. Clear the `.git/HEAD.lock`, commit v24.16 + this report + the doc updates.
2. **Two-device test** the v24.13 realtime trio + the v24.15 realtime guards on the `test` branch.
3. Tackle the roster HIGH items (pattern-push data loss + whole-blob save merge) — they need a
   real two-device runtime test, so do them one at a time.
4. Leave-day counts L-A / L-B / L-C (operator-trust path).
5. The `dep|acId` keying fix for manual fuel/crew (multi-leg aircraft).
6. Then the planned new work: **Flight & Duty** spreadsheet features, and the Rezdy API write-back
   (push captured weights, cancel/seats-remaining) — all server-side via the edge fn, key stays
   server-only.
