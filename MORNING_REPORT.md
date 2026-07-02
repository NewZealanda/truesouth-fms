# Morning Report — TrueSouth FMS nightly sweep
**Run:** 2026-07-03 (early AM) · **Version:** v29.42 → **v29.43**

## TL;DR
Good night. First sweep since v28.90 — covered the whole v28.91→v29.42 booking-platform cycle.
Three small fixes, all in the public **book.html** (client-only, no edge-fn redeploy needed);
everything else checked clean. Built, syntax-checked, committed on `main` — ready for you to
review + push.

## Fixed (→ v29.43)
1. **Hold race/leak (med):** `placeHold()` fired the old hold's release and the new hold
   concurrently → spurious "Not enough seats" on tight days, and a stale out-of-order response
   could overwrite `HOLD` and LEAK an unreleased 15-min hold, blocking seats for other customers.
   Now sequenced (release awaited first) + a `HOLDSEQ` token so only the latest response wins; a
   superseded hold releases itself.
2. **Escaping hardening (low):** new `jsq()` JS-string escape on the `pickProd`/`pickDep` inline
   onclick values — `esc()` doesn't cover single quotes (same class as the v28.90 wx-modal fix).
3. **Pax cap (low):** adults+children now clamped at 13 combined in `cnt()` (the edge fn's
   MAX_PAX) instead of failing at submit with "Invalid passenger count".

## Verified clean
- **platform-book edge fn:** server-side validation throughout (date/dep/product/timetable, pax
  1..13, weights 0..250, string length clamps), hold TTL enforced on every read, generic error
  messages (no secret leakage), seasonal price + winter-timetable resolution consistent with the
  client and platform.js (all ISO-string compares, no UTC parse traps).
- **book.html rendering:** every dynamic value escaped at the leaf; pagehide beacon releases
  abandoned holds.
- **platform.js / availability.js:** editor handler-ids sanitised, values escaped; product writes
  propagate via the ts_products realtime subscription; no duplicate top-level names.
- **v29.40 stats panel** (names escaped, loading flag resets on error), **v29.39 per-tail notes**
  (escaped, persisted via saveMaintenance), **v29.37–38 calendar snapshot/scroll carry** (snapshot
  is pointer-events:none, always dropped; `_winPendY` can't stick), **roster views** (local-date
  math), **Records browse grid** (edits persist via `_frSave`), **loadsheet 7-maps** (all five
  handlers move all 7 maps + autoSaveLS).

## Left open (details in ARCHITECTURE_REVIEW.md)
- Edge-fn `hold` could take a `replaceId` for an atomic swap — queue with the next platform-book
  redeploy (client sequencing covers it meanwhile).
- Pre-go-live fail-softs to revisit per the PLATFORM_ROADMAP checklist: Rezdy-down fleet-guard
  oversell window; empty-timetable products accept any dep; infant count uncapped vs adults.
- Carried: 5 ground/ops modules + wx_links still poll/reload-only; `ts_aircraft` saves don't
  broadcast; RLS migrations need confirming applied live.

## Tests
- `python3 build.py` → clean (module presence + dup-decl scan OK); index.html **27,927 lines /
  3,752 KB**, APP_VER v29.43.
- `node --check` → 4 index.html inline blocks + book.html's script: **0 errors**.
- No live checks this run (browser tools unavailable in the session); the changes don't touch
  boot/login paths.

## Total lines of code
**55,892** (modules/*.js + modules/*.html + index.html) · 56,408 incl. book.html + wx.html.

## Git / blockers
- Committed on `main` — **not pushed** (per rule; push/merge via GitHub Desktop).
- ⚠️ Housekeeping: the git INDEX held a stale staged snapshot (an inverse of v29.41–42 — looks
  like GitHub Desktop leftovers) and a zero-byte `.git/index.lock` appeared during a read-only
  `git diff` (the sandbox couldn't unlink it afterwards). I did NOT delete the lock. The
  temp-index commit trick sidesteps both, but clear the lock + review the staging in GitHub
  Desktop before your next push.
