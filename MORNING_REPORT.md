# Morning Report — TrueSouth FMS — Sun 28 Jun 2026

**Version:** v27.79 (built + verified, **NOT committed** — see blocker below)
**Full detail:** `ARCHITECTURE_REVIEW_v27.79.md`

## TL;DR
Swept the whole app. Found and fixed **one real sync bug** (loadsheet "change aircraft" wasn't saving or
syncing). Everything else clean. Build + syntax check pass, prod loads with no console errors. **The
commit is blocked by the stale git locks — you'll need to clear them and commit v27.79 yourself.**

## What I swept
Every `modules/*.js`, focused on the recurring bug classes (per-seat field-map desync, mutate-without-
broadcast, W&B/NaN guards, XSS, date/UTC off-by-one, duplicate top-level decls) and the undocumented
**v27.49→v27.78** work: Face ID/WebAuthn (v27.71), the **CoG envelope → signing gate** change
(v27.74–77), GA8 MLW fix (v27.76), seat-bubble restyle + Passenger list (v27.77), Self-Walk pickups
(v27.73), transport drag-to-reorder (v27.78).

## Bugs found & fixed (v27.79)
1. **[Med] Loadsheet "change aircraft" didn't persist or sync.** `window.lsAc` reseats passengers,
   clears cargo/fuel on a type change and voids the signature — then only called `render()`. No
   `autoSaveLS()`, so the switch vanished on the next refresh and never reached other devices. Fixed:
   added `S.formDirty=true;autoSaveLS()` (same pattern as every other loadsheet handler).
2. **[Low] Stale comment on the CoG signing gate** (`shared.js`) — still claimed the gate uses the old
   rectangular limits; v27.76 actually moved it to the flight-manual envelope. Corrected the comment
   (no code change) — it's a safety-critical path, so a wrong note there is a real hazard.

## Verified clean (no change needed)
- Per-seat maps: all 7 (`names/seats/bags/infantNames/paxGroups/paxType/paxPaymentReq`) move together in
  every handler, incl. the reseat inside `lsAc`.
- CoG envelope (the big recent change): finite-point filtering, div-by-zero guards, sane fallback chain,
  null-guards a corrupt aircraft record. No NaN slips through the gate. GA8 MLW = 1860 consistent.
- v27.78 transport reorder + driver changes all broadcast via `pickupSave(true)`.
- v27.77 passenger list / seat bubbles escape names via `esc()`. No XSS found in new code.
- All `toISOString().slice(0,10)` sites are `_rIso`/`_todayLocal`-guarded. build dup-decl scan clean.

## Left open (why)
- **Auth/RLS** — migrations are in the repo; still needs you to confirm they're APPLIED live. Server
  gating is by permission, not row-ownership. (Unchanged — needs your action in Supabase.)
- Minor carried items: `shell.js` login error via `innerHTML` (constants only), `_fetchSince` UTC bound
  (harmless over-fetch), breakdown-undo cache (superadmin WIP). All low impact.

## Tests
- `python3 build.py` → clean, collision scan clean. `index.html` = 24,432 lines / 2223 KB.
- `node --check` on all 4 inline `<script>` blocks → **0 errors**.
- Live read-only: `truesouth.netlify.app` loads ("True South FMS"), **no console errors** on load.
  (Prod is your last merged build — v27.79 isn't live yet.)

## Total lines of code
`modules/*.js + modules/*.html + index.html` = **48,894 lines** (source 24,462 + generated 24,432).

## ⚠️ Blocker — needs you
**Commit is blocked.** The git directory isn't writable from the overnight session, and the stale
`.git/HEAD.lock` + `.git/index.lock` (from 26–27 Jun) are still there. Per your standing rule I did
**not** delete them. The v27.79 fix is saved in the working tree (`modules/admin.js`, `modules/shared.js`,
rebuilt `index.html`). **Please clear the two locks, then commit v27.79.** Suggested message:

> `v27.79: nightly sweep — lsAc (loadsheet aircraft switch) now persists+broadcasts (was render-only: change/reseat lost on refresh, never synced); corrected stale CoG signing-gate comment`
