# Morning Report — TrueSouth FMS nightly sweep

**Run:** Sat 27 Jun 2026 (NZST) · **Version:** v27.47 → **v27.48** · **Status:** ✅ built, syntax-clean, committed (not pushed)

## TL;DR
Whole-app sweep. Found and fixed **3 date/UTC off-by-one bugs** — all the same root cause (a local
`Date` formatted with `toISOString().slice(0,10)`, which rolls back to the previous day in NZ). One of
them was making real maintenance oil readings silently disappear. Everything else swept clean. Build
and `node --check` both pass; live site loads fine.

## What I swept
Every `modules/*.js`, focused on the recurring bug classes: per-seat field-map desync, realtime
handlers that mutate-but-don't-broadcast, W&B null/NaN guards, XSS, date/UTC off-by-one, duplicate
top-level declarations, focus-clobbering renders, permission gaps. Extra attention on the newest code
since the last sweep (Weather calls, User Preferences page, Today page, the seat re-seater).

## Bugs fixed (v27.48)
1. **Weather-call "next day" chips stored the wrong date** (`rezdy.js _wxNextDays`, Medium). The chip
   label (e.g. "Mon") and the date it actually saved disagreed by one day — a click rebooked to the day
   before the one shown. Fixed to use the local-date helper.
2. **Maintenance oil-history showed real readings as blank gaps** (`maintenance.js` oil grid, Medium).
   The grid built its day keys a day early, so they never matched the stored oil entries — every reading
   rendered as "—" and the date column was off by one. Fixed.
3. **Maintenance next-due estimate dates jittered ±1 day** by what time you opened the page
   (`renderMaintEstimator`, Low). Stabilised to a fixed local calendar date.

## Swept clean (no change needed)
- **Loadsheet seat moves** — all 7 per-seat maps (name/weight/bag/infant/group/child/TO-PAY) move
  together in every drag/swap/drop/delete handler. No leftovers.
- **Weather calls realtime** — correctly saves + broadcasts to other devices; reminder de-dupe flag is
  synced. No mutate-then-render-only bug.
- **XSS** — weather-call comments/reasons and the new User Preferences page are all escaped / app-only.
- **NaN guards** — maintenance hours entry already guards against blank/NaN. (Closing the old
  ml_hours/ml_used backlog item — it's a non-issue at the save path.)
- **No duplicate top-level declarations** (build collision scan clean).

## Left open (and why)
- `shared.js _fetchSince` uses the same UTC-slice pattern but it's only a fetch lower-bound — a day
  early just over-fetches harmlessly. Not worth touching.
- `shell.js` login-error text still uses `innerHTML` (app-controlled constants only — not exploitable;
  cosmetic defence-in-depth, carried over).
- **Auth/RLS:** still needs you to confirm the Supabase RLS migrations are actually APPLIED live. Server
  gating is by permission, not row-ownership (any operations user can delete any loadsheet/manifest).

## Tests
- `python3 build.py` → clean, no collision warnings. index.html = 23,643 lines / 2151 KB.
- Inline `<script>` blocks (4) → `node --check` → **0 errors**.
- Live read-only check: `truesouth.netlify.app` loads (title "True South FMS", loading screen renders).
  No login, no data touched.

## Lines of code
- Source (`modules/*.js` + `modules/*.html`): **23,673**
- Generated `index.html`: **23,643** (2151 KB)
- **Combined total: 47,316 lines**

## Git / blockers
- A **stale `.git/index.lock`** (from 26 Jun 12:04) is present. Per the standing rules I did **not**
  delete it. The commit still went through fine using the temp-index trick (it uses its own index file,
  so the stale `.git/index.lock` doesn't block it). **No action needed on the lock for the commit** — but
  you may want to clear it manually so normal `git` / GitHub Desktop ops aren't tripped up:
  `rm .git/index.lock` (only if no git process is actually running).
- v27.48 is **committed, not pushed** — merge/push via GitHub Desktop when you're ready.
