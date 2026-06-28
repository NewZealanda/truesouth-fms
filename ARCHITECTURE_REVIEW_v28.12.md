# Architecture Review — v28.12 (nightly sweep, 29 Jun 2026)

First full sweep doc since **v27.79**. Covers the undocumented **v27.80 → v28.11** cycle (which
CLAUDE.md's "current state" never described): mobile calendar drag-lock + lock-on-all-devices
(v27.90/v27.99), allocator route preference caravans→Milford / airvans→landing (v27.88), maintenance
block date-move + ferry-following hatching (v27.85/v27.86), Reports-to org structure + manager-based
leave approval (v27.93), the big **flight-records import** (legacy FlightTable → `ts_flight_records`,
leg-split, pagination by id) (v27.95→v28.06), logbook day-summary by complete round-trips + ferry
position-chaining (v28.07→v28.09), the new **Data Recording** section (v28.10), and the leave-approval
scoping change so only admins/superadmin action everyone while other managers action only their direct
reports (v28.11).

## Fixed this run (v28.12)

| # | Sev | Area | Bug + fix |
|---|-----|------|-----------|
| 1 | **Med** | XSS (print / Drive-upload) | **Passenger names, PIC and Co-Pilot were interpolated UNESCAPED into the printed loadsheet HTML doc** (`admin_b.js` `generatePrintHTML` + the second compact print builder). Passenger names originate from **Rezdy booking customer data** — externally controlled — so a crafted name (`<img src=x onerror=…>`) would execute when the loadsheet is printed or rendered for the Drive upload. The on-screen UI already escapes these; the print path did not. Fix: wrapped every name/PIC/co-pilot interpolation in the global `esc()` helper — `_dispN` (name + infant), the two `f.pic` cells + the signature "Name" cell in the full print, and `n`/`inf`/`f.pic`/`f.coPilot` in the compact print. Behaviour-preserving for normal names. |
| 2 | Low | XSS (consistency) | **`rezdy_b.js` transport departure-tab label `_lbl` was the one un-`_rzEsc`'d `_rzTransDepLabel(t)` call** (its two sibling render sites at :578 and :1328 wrap it). Dest segment is config-derived (not raw operator text) so not live-exploitable, but wrapped it in `_rzEsc` for consistency / defence-in-depth. |

Both changes are isolated and behaviour-preserving.

## Verified clean (no action)

- **Per-seat field maps** — every seat move / swap / drop / delete moves all **seven** maps together
  (`names/seats/bags/infantNames/paxGroups/paxType/paxPaymentReq`). Verified across `admin.js`
  (`tapFormSeat`, `tapDropUnallocated`, `lsDropOnSeat`, `lsDropOnUnalloc`, `dropFormSeat`, `lsCoPilot`,
  `lsDelPax`, `lsCopyFlight`, `lsTrimExcess`, the `lsAc` type-change trim, `generateLoadsheet`),
  `loadsheet.js` (spot save/clear + the single-field paxType/payReq toggles, which correctly touch only
  their own map), and `rezdy_c.js` (loadsheet build fills onto a freshly-reset `S.form`). The seatmap
  allocator operates on passenger **objects**, so flags travel automatically. No desync.
- **Realtime broadcast** — every persistent-state handler pairs its mutation with the right persist +
  broadcast: seatmap manifest setters → `_rzManSave()` (`rz_manifest_update`); transport/pickups →
  `pickupSave(true)` (`_rzPickupBroadcast`); calendar pilot/co-pilot/booking-AC → `pickupSave(true)` +
  `_rzSchedBroadcast()`; scheduling config → `_schedSave()` (`ts_settings` realtime). No mutate-then-
  render-only handler found in the new code. (Flight records still not realtime-synced — pre-existing
  documented **C1** backlog item, not a regression.)
- **W&B / CoG signing gate** — well guarded. `calcFormWB` CoG divisions guard the denominator
  (`wt?mom/wt:0`); `_wbEnvAt` guards the interpolation slope (`(p1.w-p0.w)||1`); `_wbEnvRows` filters to
  finite rows and requires ≥2 (else null, callers null-check); `_finalReserveKg`/`burnToKg` null-guard
  the aircraft and use `parseFloat(v)||0`. The signing gate consumes `reserveOk`/`cogOk` from the single
  `calcFormWB` source. No NaN path passes an invalid sheet.
- **Date/UTC off-by-one** — every `toISOString().slice(0,10)` that derives a LOCAL calendar date is
  guarded with the `_rIso`/`_todayLocal` fallback (leave.js, maintenance.js, rezdy.js, rezdy_c.js,
  startday.js, maintforms.js). The two unguarded ones are intentionally UTC (`maintenance.js` `ymd()`
  over `Date.UTC`, `shared.js _fetchSince` lower bound). Clean.
- **Duplicate top-level declarations** — `build.py` collision scan clean.

## Open backlog (documented, not changed)

- **COMMITTED; stale lock files remain on disk — needs Andrew to clear + push.** The commit succeeded:
  `main` is at `5023e5b` (this sweep) on top of `ab1505e` (the v28.09–v28.11 permissions overhaul, also
  committed this session). Working tree is clean (verified — no uncommitted diffs; APP_VER=v28.12; both
  fixes present). However the write-once VM mount left stale **`.git/index.lock`** + **`.git/HEAD.lock`**
  files behind (git wrote the ref via a fresh `GIT_INDEX_FILE` but could not unlink the leftover locks);
  per the standing rule they were **NOT deleted**. They don't affect the committed history but **GitHub
  Desktop will refuse to operate until they're removed** — Andrew should delete both lock files, then
  **push/merge**. Not pushed (per rule).
- **Combined OPERATIONS permission hides grid toggles that no longer act.** `hasRolePerm` (shared.js)
  now remaps `charter|calendar|ground|resources|weather_call` → `operations`, so those permissions all
  follow Operations. But the **perms grid still renders separate Ground / Resources / Weather columns**
  (admin_b.js `renderAdminPerms`) whose toggles are now inert. Not a bug, but a UX trap for the next
  editor — either hide those columns or add a note in the grid. (Documented, left for Andrew to decide.)
- **`settings` now defaults OPEN to every role.** `_sectionAllowed('settings')` → `hasRolePerm('settings')`
  which defaults `true` unless explicitly turned off per role. Sub-tabs inside Settings are still gated
  (`admin_users` hardcoded to admin/superadmin, `audit` to superadmin), so user/role management is not
  exposed — but lower roles can now reach the Settings shell (operations config, fuel tables, etc.).
  Intentional per the v28.x design comment; flagged so Andrew can confirm it's the desired posture.
- **Auth / RLS** — Supabase Auth + per-role `has_perm()` policies are in the repo migrations, but
  **Andrew must confirm they're APPLIED in the live project.** Server gating is by permission, not
  row-ownership (any `operations` user can delete any loadsheet/manifest). No CSP (incompatible with the
  inline-handler UI). Plus three NEW migrations from this cycle still need applying if not already:
  `reports_to.sql`, `leave_managers_view_all.sql`, `flight_records_*` import/dedupe SQL. Carried.
- **`shell.js` login error** still assigned via `innerHTML` (app-controlled constant strings only — not
  exploitable; `textContent` would be defence-in-depth). Carried.
- **Breakdown undo** (`rezdy_c.js`) doesn't restore the memoised `_schedAutoAc` cache — superadmin-only
  WIP, hidden. Carried.

## Security posture

- No secrets hardcoded; bundle is publicly readable by design.
- XSS surface tightened this run: the printed loadsheet doc now escapes passenger/PIC/co-pilot names
  (was the one remaining unescaped external-data sink). On-screen XSS surface remains escaped across the
  newer features (Data Recording, logbook routes, leave approvals, transport reorder).
- Auth/RLS caveat above stands until Andrew confirms the migrations (old + the 3 new) are live.

## Build / test status

- `python3 build.py` → clean; top-level collision scan clean. `index.html` = **25,028 lines / 2285 KB**.
- Inline `<script>` blocks (4): `node --check` → **0 errors**.
- Per-module `node --check` on the edited files (admin_b.js, rezdy_b.js, shared.js) → 0 errors.
- **Live read-only check** — not performed this run (the priority was confirming the working-tree
  contents survived the git-lock incident). Production at `https://truesouth.netlify.app` continues to
  serve Andrew's last merged build; v28.12 won't be live until the locks are cleared + committed + merged.
- **Commit: SUCCEEDED** — `main` at `5023e5b` (+ `ab1505e`). Stale `.git/index.lock`/`HEAD.lock` left on
  disk (NOT deleted, per rule); clear them before GitHub Desktop, then push. Not pushed.

## Code size

- Source: `modules/*.js` + `modules/*.html` = **25,058 lines**.
- Generated `index.html` = **25,028 lines** (2285 KB).
- Combined total (source + generated) = **50,086 lines**.
