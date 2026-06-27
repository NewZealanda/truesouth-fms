# Architecture Review — v27.79 (nightly sweep, 28 Jun 2026)

First full sweep doc since **v27.48**. Covers the **v27.49 → v27.78** cycle — the undocumented stretch
in CLAUDE.md (which only described up to v27.48): WebAuthn/Face ID unlock (v27.71), the flight-manual
**CoG envelope** work that became the **signing gate** (v27.74–v27.77), GA8 MLW correction (v27.76),
loadsheet seat-bubble restyle + Passenger list (v27.77), Self-Walk pickups (v27.73), and the transport
**drag-to-reorder** board (v27.78).

## Fixed this run (v27.79)

| # | Sev | Area | Bug + fix |
|---|-----|------|-----------|
| 1 | **Med** | Realtime / persistence | **`window.lsAc` (loadsheet "change aircraft") was render-only.** Switching the aircraft on a loadsheet mutates the form heavily — sets `S.form.ac`, reseats/bumps excess pax to the unallocated pool, clears cargo/fuel/burn on a type change, voids the signature (`S.form.sig=null`) — but the handler ended with a bare `render()`. No `autoSaveLS()`, so the change was **not persisted** (lost on the next refresh / autosave-from-elsewhere) and **never broadcast** to other devices. This is the exact mutate-without-broadcast class the sweep watches for. Fix: added `S.formDirty=true;autoSaveLS();` before the final `render()`, matching every sibling loadsheet handler (`lsPIC`, `lsCoPilot`, `lsDelPax`, the seat drag/drop set). |
| 2 | Low | Docs/safety | **Stale comment on the CoG signing gate** (`shared.js` `_wbEnvRows` header). It still claimed "the signing gate still uses the rectangular cogMin/cogMax … unchanged" — but v27.76 made `calcFormWB.cogOk` use the **flight-manual envelope** (effective fwd/aft at TOW + advisory landing check). On a safety-critical W&B path a wrong comment is a real hazard for the next editor. Rewrote it to describe the actual v27.76 behaviour. No code change. |

Both changes are isolated and behaviour-preserving except for the intended persistence fix.

## Verified clean (no action)

- **Per-seat field maps** — every seat move/swap/drop/delete path moves/clears **all seven** maps
  together (`names/seats/bags/infantNames/paxGroups/paxType/paxPaymentReq`): `tapFormSeat`,
  `tapDropUnallocated`, `lsDropOnSeat`, `lsDropOnUnalloc`, `lsDelPax`, and the type-change reseat inside
  `lsAc`. The seatmap allocator works on passenger **objects**, so flags travel automatically. No desync.
- **W&B / CoG envelope** (the v27.74–v27.77 signing-gate change — highest-risk recent work) — well
  guarded. `_wbEnvRows` filters non-finite points and requires ≥2 rows; `_wbEnvAt` interpolates with a
  div-by-zero guard (`(p1.w-p0.w)||1`) and clamps below/above the first/last point; aircraft with no
  `cogEnv` fall back to the baked-in flight-manual default (`AC_DEF`) and then to the rectangular
  `cogMin/cogMax`. `calcFormWB` null-guards a partial/corrupt aircraft record (`return null`). GA8 MLW =
  1860 kg is consistent across SLD/SLQ. No NaN path lets an invalid sheet through the gate.
- **Realtime broadcast** — the v27.78 transport reorder handlers (`myPkMove`, `pickupReorderDrop`,
  `myPkDrop`, `rzTransMoveDep`) and driver add/remove all persist+broadcast via `pickupSave(true)` →
  `_rzPickupBroadcast()`. Drag state vars are consistent (`pickupDragStart`→`S._rezdyDragId`,
  `myPkDragStart`→`S._myPkDrag`). No other mutate-then-render-only handler found (only `lsAc`, now fixed).
- **XSS** — the v27.77 Passenger list and restyled seat bubbles escape names/infant/role via `esc()`;
  transport driver pickers escape names via `_rzEsc`. No raw booking/user interpolation found in the
  swept new code.
- **Date/UTC off-by-one** — every `toISOString().slice(0,10)` site is guarded with a
  `(typeof _rIso==='function')?_rIso(…)` / `_todayLocal()` fallback (leave.js, maintenance.js, rezdy.js,
  maintforms.js, startday.js). The v27.48 trio of date fixes is holding. `maintenance.js ymd` builds from
  `Date.UTC` and reads back UTC (internally consistent). Clean.
- **Duplicate top-level declarations** — `build.py` collision scan clean.

## Open backlog (documented, not changed)

- **GIT COMMIT BLOCKED — needs Andrew (see below).** v27.79 is built + verified but **uncommitted** —
  the VM session cannot write to `.git`, and the stale `.git/HEAD.lock` + `.git/index.lock` (both from
  26–27 Jun) remain in place (not deleted, per the standing rule). Work is safe in the working tree.
- **Auth / RLS** — Supabase Auth + per-role `has_perm()` policies are in the repo migrations, but
  **Andrew must confirm they're APPLIED in the live project**. Server gating is by permission, not
  row-ownership (any `operations` user can delete any loadsheet/manifest). No CSP (incompatible with the
  inline-handler UI). Unchanged from prior reviews.
- **`shell.js` login error** still assigned via `innerHTML` (app-controlled constant strings only — not
  exploitable today; `textContent` would be defence-in-depth). Carried.
- **`shared.js _fetchSince`** uses a UTC slice for the fetch lower bound — harmless (over-fetches ≤1 day).
  Carried.
- **Breakdown undo** (`rezdy_c.js`) doesn't restore the memoised `_schedAutoAc` cache — superadmin-only
  WIP, hidden. Carried.

## Security posture (unchanged)

- No secrets hardcoded; bundle is publicly readable by design.
- XSS surface confirmed escaped across the newest features (CoG envelope editor, passenger list, seat
  bubbles, transport reorder).
- Auth/RLS caveat above stands until Andrew confirms the migrations are live.
- v27.71 biometric unlock is a **local presence gate only** (WebAuthn platform passkey, opt-in per
  device, password fallback everywhere) — nothing new stored server-side.

## Build / test status

- `python3 build.py` → clean; top-level collision scan clean. `index.html` = **24,432 lines / 2223 KB**.
- Inline `<script>` blocks (4): `node --check` → **0 errors**.
- **Live read-only check** — `https://truesouth.netlify.app` loads cleanly (title "True South FMS"),
  **no console errors** on load. No login / no mutation. (Production serves Andrew's last merged build;
  v27.79 won't be live until he commits + merges.)
- **Commit: BLOCKED.** Temp-index trick failed at `git read-tree` ("unable to write new index file") —
  the `.git` dir is not writable from this VM session and the stale `HEAD.lock`/`index.lock` are present.
  Locks NOT deleted (per rule). Andrew must clear the locks and commit v27.79 himself.

## Code size

- Source: `modules/*.js` + `modules/*.html` = **24,462 lines**.
- Generated `index.html` = **24,432 lines** (2223 KB).
- Combined total (source + generated) = **48,894 lines**.
