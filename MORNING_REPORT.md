# Morning Report — TrueSouth FMS nightly sweep
**Mon 29 Jun 2026 · v28.12**

## TL;DR
Full app bug sweep (every `modules/*.js`). One **Med** security fix + one Low consistency fix applied.
Build + syntax checks pass. **Commit is blocked** by a stale `.git/index.lock` — please clear it and
commit (work is safe in the working tree, nothing lost).

## What I swept
First full sweep since v27.79 — caught up on the undocumented **v27.80 → v28.11** stretch (flight-records
import, Reports-to org + manager-based leave approval, the new Data Recording section, logbook ferry
position-chaining, mobile calendar drag-lock, allocator route preference). Checked the recurring bug
classes across the whole codebase: per-seat field-map desync, realtime mutate-without-broadcast, W&B/CoG
NaN guards, XSS, date/UTC off-by-one, duplicate top-level declarations, focus-clobbering renders.

## Bugs found & fixed
1. **[Med · XSS] Printed loadsheet didn't escape names.** `admin_b.js` (`generatePrintHTML` + the compact
   print builder) dropped **passenger names, PIC and Co-Pilot straight into the print/Drive-upload HTML
   unescaped**. Passenger names come from Rezdy booking data (externally controlled), so a crafted name
   could inject into the printed doc. The on-screen UI already escapes these — the print path was the gap.
   Fixed: wrapped every name/PIC/co-pilot in `esc()`. Normal names look identical.
2. **[Low · consistency] One un-escaped transport label.** `rezdy_b.js` departure-tab label was the lone
   `_rzTransDepLabel` call not wrapped in `_rzEsc` (its two siblings are). Wrapped it. Not exploitable
   (config-derived text) — defence-in-depth.

Version bumped to **v28.12**, rebuilt.

## What I left open (and why)
- **Combined Operations permission makes 3 grid columns inert.** `hasRolePerm` now folds
  calendar/ground/resources/weather into `operations`, but the perms grid still shows those toggles —
  they no longer do anything. Left as-is (it's your v28.x design intent); worth hiding the dead columns
  or labelling them. Documented.
- **`settings` now defaults open to every role** (sub-tabs still gated to admins). Intentional per your
  code comment — flagged so you can confirm it's the posture you want. Not changed.
- **RLS + new migrations.** Still need confirmation the auth/RLS migrations are live, plus the new
  `reports_to.sql`, `leave_managers_view_all.sql`, and `flight_records_*` import/dedupe SQL applied.
- Pre-existing carried items: flight records not realtime-synced (C1), breakdown-undo cache, `shell.js`
  login `innerHTML`. No new risk.

Per-seat maps, realtime broadcasts, W&B/CoG guards, and date handling all verified **clean** — no changes
needed there.

## Test results
- `python3 build.py` → clean, top-level duplicate-declaration scan clean.
- Inline `<script>` blocks (4) → `node --check` **0 errors**. Edited modules individually → 0 errors.
- `index.html` rebuilt: **25,028 lines / 2285 KB**.
- Live read-only check skipped this run (focus was confirming the working tree survived the git-lock
  incident); production still serves your last merged build.

## ⚠️ Git / blocker
- A stale **zero-byte `.git/index.lock`** was created during the session. The VM mount is write-once for
  `.git` (git can write objects but can't unlink its own locks), so I could not remove it — and per the
  standing rule I did **not** delete it.
- **Action for you:** delete `.git/index.lock` (and any `.git/HEAD.lock`) via Finder/GitHub Desktop, then
  commit. The commit should include v28.12 **and** the still-uncommitted v28.09–v28.11 work (perms
  refactor, Data Recording, leave scoping, logbook ferry-chaining) — all of it is intact in the working
  tree (verified: APP_VER=v28.12, both fixes present, all prior work present). I did not push.

## Code size
Source `modules/*.js` + `*.html` = **25,058 lines** · generated `index.html` = **25,028 lines** ·
combined **50,086 lines**.
