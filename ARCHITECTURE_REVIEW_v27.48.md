# TrueSouth FMS — Architecture Review & Bug Sweep v27.48

_Nightly automated sweep (`nightly-fms-sweep`), run 27 Jun 2026 (NZST). Whole-app pass over every
`modules/*.js`. Focus on the recurring bug classes: per-seat field-map desync, realtime handlers that
mutate-but-don't-broadcast, W&B null/NaN guards, XSS, date/UTC off-by-one, duplicate top-level
declarations, focus-clobbering renders, permission gaps. This review covers the v26.77 → v27.47 cycle
(the prior review snapshot was v26.76; ~70 versions of feature work shipped since with no sweep doc)._

## Context at start of run
- Working tree **exactly matched HEAD** (`v27.47`), verified via a fresh temp-index `git diff HEAD`.
- A **stale `.git/index.lock`** (0 bytes, dated 26 Jun 12:04) was present. Per standing rules it was
  **NOT deleted**. The temp-index commit trick (`GIT_INDEX_FILE=/tmp/tsidx`) sidesteps `.git/index`
  and its lock, so commits still succeed — see Build/test status below.

## Fixed in the sweep (v27.48)
| # | Severity | Area | Fix |
|---|----------|------|-----|
| 1 | Medium | Date/UTC | **`rezdy.js _wxNextDays`** (Weather-calls "next day" reschedule chips, new in v27.40). `base` is LOCAL midnight, so `d.toISOString().slice(0,10)` emitted the day **before** in NZ (UTC+12/+13) — the chip's weekday *label* (local `getDay()`) and its stored *value* (UTC date) disagreed, and clicking a chip stored a rebooking date one day early. Now uses the local-date helper `_rIso(d)`. |
| 2 | Medium | Date/UTC | **`maintenance.js`** oil-history grid (`renderMaintLog`/oil view). The per-day grid keys were built with `d.toISOString().slice(0,10)` from a LOCAL-midnight `Date`, so every key was a day early and **never matched the stored (local-dated) oil entries** — real readings rendered as gaps (`—`) and the date column was off by one. Now uses `_rIso(d)`. |
| 3 | Low | Date/UTC | **`maintenance.js renderMaintEstimator`** next-check / next-engine / next-prop estimate dates were `new Date(now.getTime()+N*86400000).toISOString().slice(0,10)` — a current-time instant carries the time-of-day, so the UTC slice jittered the displayed due-date by ±1 day depending on what time the page was opened. Added a local `_estDate(days)` helper (uses `_rIso`); all three now show a stable local calendar date. |

All three were the **same root cause** (local `Date` → UTC `toISOString().slice(0,10)` in NZ) — the
exact off-by-one class this sweep watches for. The fixes are isolated, behaviour-preserving except for
the corrected date, and guarded (`typeof _rIso==='function'` fallback) so they cannot throw.

## Verified clean (no action)
- **Per-seat field maps** — every seat move/swap/drop/delete handler (`lsDropOnSeat`, `lsDropOnUnalloc`,
  `dropFormSeat`, plus the per-seat edit/toggle handlers in `loadsheet.js`) moves/clears **all seven**
  maps together (`names/seats/bags/infantNames/paxGroups/paxType/paxPaymentReq`). The seatmap allocator
  and the new "tidy seats" re-seater (`rezdyManTidySeats`/`rezdyManReseat`) operate on passenger
  **objects**, so flags travel automatically. No desync found.
- **Realtime broadcast** — the new Weather-calls feature (`wxSubmit`, `wxClear`, `_wxCheckReminders`)
  correctly persists via `pickupSave(true)` and broadcasts via `_rzPickupBroadcast()`; `wxCalls` is in
  the `_PK_FIELDS` blob and restored in `rezdyLoadPickups`. The reminder `_notified` flag rides the
  synced blob (guards against duplicate notifications across devices). No mutate-then-render-only
  handlers found in the swept code.
- **XSS** — Weather-calls user text (`comment`, `reasons`, `by`, day labels) is `_rzEsc`-escaped on
  every render, including the `<textarea>` body. The new User Preferences page (`_renderUserPrefs`)
  renders only app-controlled constant strings + app-defined chime IDs (no user input). No raw
  interpolation found.
- **NaN guards** — `addMaintEntry` gates on `if(!hours||hours<=0)` (catches `NaN`); `calcHoursUsed`/
  `calcTTIS` gate on `ttis>0`/`used>0`. The v26.76 "ml_hours/ml_used parseFloat" backlog item is a
  **non-issue at the save path** — closing it.
- **Duplicate top-level declarations** — `build.py` collision scan clean.
- **Other `toISOString().slice(0,10)` sites** — `leave.js` (all `_rIso`-guarded), `maintenance.js:802`
  `ymd` (constructs from `Date.UTC` and reads back UTC — internally consistent), `shared.js _fetchSince`
  (a fetch lower-bound; a day early only over-fetches harmlessly). Left as-is.

## Open backlog (documented, not changed)
- **`shared.js _fetchSince`** uses UTC slice for the fetch "since" bound — harmless (over-fetches by up
  to a day); not worth a change.
- **`shell.js` login error** still assigned via `innerHTML` (app-controlled constant strings only — not
  exploitable today; `textContent` would be defence-in-depth). Carried from v26.76.
- **Auth / RLS** — Supabase Auth + per-role `has_perm()` policies live in the repo migrations, but
  **Andrew must confirm they're APPLIED in the live project**. Server gating is by permission, not
  row-ownership (any `operations` user can delete any loadsheet/manifest). No CSP (incompatible with the
  inline-handler UI). Unchanged from prior reviews.
- **Breakdown undo** (`rezdy_c.js`) doesn't restore the memoised `_schedAutoAc` cache — feature is
  superadmin-only/WIP and hidden; low impact. Carried from v26.76.
- **CLAUDE.md "Current state" was ~30 versions stale** (documented up to v27.18; HEAD was v27.47). Note
  refreshed this run.

## Security posture (unchanged)
- No secrets hardcoded; bundle is publicly readable by design.
- XSS surface confirmed escaped across the newest features (weather calls, user prefs).
- Auth/RLS caveat above stands until Andrew confirms the migrations are live.

## Build / test status
- `python3 build.py` → clean; top-level collision scan clean. `index.html` = 23,643 lines / 2151 KB.
- Inline `<script>` blocks (4): `node --check` → **0 errors**.
- **Live read-only check** — `https://truesouth.netlify.app` loads cleanly (title "True South FMS",
  loading screen renders). No login / no mutation. (Production serves Andrew's last merged build; v27.48
  is committed-not-pushed, so it won't be live until he merges.)
- Commit: via the temp-index trick (sidesteps the stale `.git/index.lock`). **Committed, not pushed**
  (Andrew pushes/merges via GitHub Desktop).

## Code size
- Source: `modules/*.js` + `modules/*.html` = **23,673 lines**.
- Generated `index.html` = **23,643 lines** (2151 KB).
- Combined total (source + generated) = **47,316 lines**.
