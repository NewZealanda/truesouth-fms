# Morning Report — TrueSouth FMS nightly sweep
**Mon 29 Jun 2026 · v28.12**

## TL;DR
Full app bug sweep (every `modules/*.js`). One **Med** security fix + one Low consistency fix applied.
Build + syntax checks pass. **Committed** (HEAD `5023e5b`; the v28.09–v28.11 perms work also landed as
`ab1505e`). Stale `.git/index.lock` + `.git/HEAD.lock` files were left on disk (the write-once mount
couldn't remove them; not deleted per rule) — **clear them before using GitHub Desktop, then push/merge.**
Not pushed (per standing rule).

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

## ⚠️ Git — read this
- **The code fix IS committed.** `main` is at **`5023e5b`** (this sweep) on top of **`ab1505e`** (the
  v28.09–v28.11 permissions overhaul, which also landed this session). APP_VER=v28.12. The XSS escaping
  fix is in history.
- **Then the git locks blocked further commits.** After that first commit, the write-once VM mount left a
  stale **`.git/HEAD.lock`** (and `.git/index.lock`) on disk that I cannot remove (and must not, per
  rule). A follow-up commit to correct these report files therefore **failed** ("cannot lock ref HEAD:
  File exists"). So **these three doc files (`MORNING_REPORT.md`, `ARCHITECTURE_REVIEW_v28.12.md`,
  `CLAUDE.md`) are currently UNCOMMITTED in the working tree** — their working-tree text (what you're
  reading) is accurate; the versions committed in `5023e5b` still say "commit blocked" (stale wording).
- **Action for you:**
  1. Delete `.git/HEAD.lock` and `.git/index.lock` (Finder → the repo's `.git` folder).
  2. Commit the 3 modified doc files (the corrected reports).
  3. **Push / merge** `5023e5b` + `ab1505e` as usual. I did not push.

## Code size
Source `modules/*.js` + `*.html` = **25,058 lines** · generated `index.html` = **25,028 lines** ·
combined **50,086 lines**.
