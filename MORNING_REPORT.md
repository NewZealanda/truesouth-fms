# Morning Report — TrueSouth FMS nightly sweep (v28.55)

**Date:** 2026-06-30 · **Build:** v28.54 → **v28.55** · **Status:** built + verified, ⚠️ commit blocked by a stuck `.git` lock (your work is safe in the working tree).

## TL;DR
First full sweep since v28.15 — it covers the whole undocumented **v28.16→v28.54** cycle (the 5 new ground/ops modules, Storage uploads, the menu restructure, festive header). Two small, safe bugs found and fixed, both in the new modules. The heavy modules (rezdy, scheduling, flight records, leave) audited clean. Build + syntax check pass; production loads with no console errors. The only thing needing you: **a stale git lock is blocking the commit** — clear it and commit in GitHub Desktop.

## What I swept
Every `modules/*.js`. Read the 5 new modules in full (`vehprestart`, `opsnotices`, `equipment`, `visitors`, `monitoring`); ran two parallel deep reviewers over rezdy×3 and scheduling/flightrecord/leave/training; grepped the whole tree for the recurring classes (per-seat map desync, broadcast-less mutations, XSS, date/UTC off-by-one, duplicate top-level decls); verified the new modules' routing + permission gates in `shell.js`.

## Bugs found & fixed → v28.55
1. **Search boxes lost focus while typing (Med).** `render()` only restores focus to inputs that have a stable `id`. The **Ops Notices** list search and the **Visitors → History** Name/Company filters re-rendered on every keystroke with no id, so you had to re-click after each character. Gave them ids (`onSearchBox`, `viSearchName`, `viSearchCo`). (Equipment's search already had one.)
2. **Unescaped uploaded-file URLs in `src`/`href` (Low).** For consistency with the rest of the app (and `equipment.js`, which already does this), wrapped the upload URL/data-URI in the module's escape helper: Ops-Notice attachment image/link (`_onEsc(fl.data)` — the *edit* view already escaped it, the *view* didn't), and the vehicle-prestart Not-OK photo thumbnails (`_vpEsc(c.p)`).

## Audited clean (no change needed)
- **Rezdy (bookings/seatmap/loadsheet/calendar):** per-seat 7-map moves intact, every mutator broadcasts, all booking/customer text escaped, dates use local helpers.
- **Scheduling / flight records / leave / training:** cost math NaN-guarded; leave stamp/unstamp merge-before-write (no last-writer-wins); leave approve/decline gated to admin/superadmin + direct-reports; leave-day counts exclude RDO/off and read the persisted roster; all dates local-helper'd.
- **New modules:** user fields escaped, dates use `_todayLocal`/`_rIso`, numeric DB columns int-coerced; section routing + perm gates wired correctly through the new menu.
- **Duplicate top-level declarations:** none (build scan clean).

## Left open (documented, not changed — low risk)
- The 5 new ground/ops tables (`ts_visitors`, `ts_equipment`, `ts_ops_notices`, `ts_vehicle_prestarts`, `ts_flight_following`) write to Supabase + a local cache but are **not realtime-subscribed**, so a second open device only sees updates on reload (monitoring polls every 30 s). Fine for now; the clean next upgrade is to add them to the realtime reload list. Deferred (larger change).
- Carried: `saveAircraftDraft` doesn't broadcast W&B spec changes; flight records not realtime-synced; server gating is by permission not row-ownership. (All pre-existing.)

## Tests
- `python3 build.py` → clean, **no duplicate-declaration collisions**; `index.html` rebuilt **26,170 lines / 3,359 KB**.
- Extracted the 4 inline `<script>` blocks → `node --check` → **0 errors**.
- Live read-only check of https://truesouth.netlify.app → **no console errors** (this is the deployed bundle; v28.55 is local/unpushed).

## Lines of code
- `modules/*.js` = **25,826**
- `modules/*.html` = **379**
- `index.html` (generated) = **26,170**
- **Combined total = 52,375 lines.**

## ⚠️ Blocker — git (needs you)
Commit could not be made. Two things:
1. A stale **`.git/index.lock`** is present and can't be removed from my side ("Operation not permitted"), plus a 0-byte **`.git/HEAD.lock`** from the previous session. Per your standing rule I did **not** delete either.
2. The commit itself fails with `fatal: unable to write new index file` — this session can't write into `.git` at all.

So v28.55 is **built, verified, and sitting in the working tree, uncommitted.** The tree also still contains a pre-existing mid-refactor changeset from before this run (staged SQL-file deletions, `.gitignore`/`build.py` edits) — that's your in-progress work, not mine.

**Files I changed this run:** `modules/opsnotices.js`, `modules/visitors.js`, `modules/vehprestart.js`, `modules/shared.js` (APP_VER→v28.55), `index.html` (rebuilt), `ARCHITECTURE_REVIEW_v28.55.md`, `CLAUDE.md`, `MORNING_REPORT.md`.

**To finish:** clear `.git/index.lock` and `.git/HEAD.lock`, review the working tree in GitHub Desktop, commit, then push/merge. Also apply the new-table SQL if you haven't (`vehicle_prestarts.sql`, `ops_notices.sql`, `equipment.sql`, `visitors.sql`, `flight_following.sql`, `vp_delete_own.sql`, `fix_feature_table_grants.sql`, `fix_uuid_user_columns.sql`).
