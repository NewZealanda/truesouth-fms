# TrueSouth FMS — Architecture Review & Bug Sweep v26.76

_Overnight sweep (3-area parallel audit: realtime/seat-field desync · XSS/date/guards · new-code + scheduling + breakdown). This is the first run of what becomes the **nightly automated sweep** (scheduled task `nightly-fms-sweep`, fires ~00:04 daily)._

## What shipped this cycle (separate from the sweep)
- **v26.74 — Start of Day screen** (`modules/startday.js`): one-action morning flow (pull Rezdy → declared-weight preview → allocate aircraft + pilots) + a live exceptions dashboard (no-aircraft, over-capacity, W&B/CofG/landing/reserve, split groups, missing/unrated pilots, transport-no-driver, balances owing), each row deep-linking to the fix.
- **v26.75 — Today-at-a-glance homescreen** (`renderHomeToday`): landing dashboard with departures board, counts, attention banner, transport/owing summary, quick links. New default landing for operations users.
- Both validated read-only against live bookings (W&B, pilots, capacity all resolve correctly; tomorrow scanned clean with no false positives).

## Fixed in the sweep (v26.76)
| # | Severity | Area | Fix |
|---|----------|------|-----|
| 1 | High | XSS | `loadsheet.js` seat-pill passenger + infant names now `esc()`-escaped (were injected raw into innerHTML). |
| 2 | High | XSS | `shared_b.js` presence bar: user `name`, initials, `uid`, `color` now escaped in the title attrs + force-logout button. |
| 3 | High | Realtime sync | `admin.js lsDropOnUnalloc` (drag a seated pax back to unallocated) was `render()`-only — now calls `autoSaveLS()` so it persists/broadcasts (was silently reverting on reload / not syncing to other devices). |
| 4 | High | Realtime sync | `loadsheet.js` "Clear & Start Blank" now calls `autoSaveLS()` before render — the cleared form was not persisted, so old data reappeared on refresh. |
| 5 | Medium | UX hang | `startday.js sodRun` wrapped in try/**finally** — the spinner/disabled state now always clears even if a step throws (was at risk of sticking the button disabled). |
| 6 | Low | Defensive | `startday.js _sodScan` guards the W&B call against an empty departure key. |
| 7 | Low | Defensive | `scheduling.js` subset-enumeration loops (`_schedPickFleet`, `_schedPlanPick`) cap at n=24 — 2^n would hang the browser only on an unrealistically large fleet, but the guard is free insurance. |

**Verified clean (no action):** the 7 per-seat field maps (`names/seats/bags/infantNames/paxGroups/paxType/paxPaymentReq`) move/clear together in every seat-swap/drop/delete handler (`lsDropOnSeat`, `lsDropOnUnalloc`, `tapFormSeat`, `dropFormSeat`, `lsDelPax`). No date/UTC off-by-one found (local-date helpers `_todayLocal`/`_rIso` used consistently). No duplicate top-level declarations across the shared scope.

## Open backlog (documented, not changed — judged risky/low-value/out-of-scope)
- **`admin.js lsN` (name onblur)** persists via `autoSaveLS()` but doesn't re-render like `lsS`/`lsB`. Cosmetic only (the input holds the typed value); left as-is to avoid re-rendering on every blur.
- **Maintenance hours inputs** (`admin_b.js` `ml_hours`/`ml_used`) `parseFloat` without an `isFinite` guard — non-numeric entry silently yields NaN downstream. Low frequency; worth a validation guard next pass.
- **`shell.js` login error** assigned via `innerHTML` — currently app-controlled constant strings only, so not exploitable today; switch to `textContent` for defence-in-depth.
- **Breakdown undo** (`rezdy_c.js rezdyBreakdownUndo`) restores `_rzBookingAc`/`_rzBreakCancelled` but not the memoised `_schedAutoAc` cache. The breakdown feature is **superadmin-only / WIP** (hidden in v26.72), so low impact; address when the feature is un-hidden.
- **`freePilotsAt` default of 99** when the roster isn't loaded is **intentional** (mirrors `ratedAvail` treating "no roster" as unconstrained) — flagged by the audit as a magic number; leaving as designed.

## Security posture (unchanged from prior reviews + this pass)
- XSS surface reduced (items 1–2). Remaining dynamic-string renders across rezdy/maintenance/leave/flightrecord were confirmed already escaped via `_rzEsc`.
- Auth: Supabase Auth/GoTrue, RLS + per-role `has_perm()` policies in the repo migrations — **still requires Andrew to confirm the migrations are APPLIED live**. Server gating is by permission, not row-ownership (any operations user can delete any loadsheet/manifest). No CSP (incompatible with inline-handler UI).
- No secrets hardcoded; bundle is publicly readable by design.

## Build/test status
- `python3 build.py` clean; top-level collision scan clean.
- Inline `<script>` blocks: `node --check` → 0 errors.
- New screens validated read-only on live data.

## ⚠️ Deploy note
A stale `.git/HEAD.lock` blocked commits from **v26.75 onward** (per standing rules I did not delete it). v26.75 (homescreen) and v26.76 (these fixes) are **built and in the working tree but uncommitted**. Clear the lock and commit in one pass — see the morning report for the exact command.
