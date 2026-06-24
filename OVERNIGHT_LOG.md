# Overnight work log — started 24 Jun 2026 (~11:50pm)

Running log of the autonomous session so you can review/revert per commit. Commits are local
(not pushed). If the git lock ever sticks, anything uncommitted is documented here + saved on disk.

## Plan / order
1. ✅ Split big modules (rezdy/admin/shared) — done as v26.24, bundle byte-identical.
2. ⏳ F&D certify: drawn signature pad + signature in print.
3. ⏳ Audit-logging review + improvements.
4. ⏳ Permissions page declutter (group/split).
5. ⏳ Architecture audit doc (ARCHITECTURE_REVIEW_v26.xx.md).
6. ⏳ Bug sweep with fixes (each built, syntax-checked, committed individually).

## Commits this session
- **v26.24** — split big modules: `rezdy.js → rezdy.js + rezdy_b.js + rezdy_c.js`,
  `admin.js → admin.js + admin_b.js`, `shared.js → shared.js + shared_b.js`. Contiguous split,
  build.py ORDER updated. Verified: rebuilt `index.html` diff vs pre-split = **only the APP_VER line**
  (proves zero behaviour change). 0 syntax errors. Modules now 22 files (was 19).

- **v26.25** — Flight & Duty certify now opens a **drawn signature pad** (mirrors the loadsheet sign
  box); signature saved on the cert (`ts_fd_certs.signature`, added in `flightduty.sql`, write degrades
  gracefully if the column isn't applied yet), shown on the certified card, and embedded in `fdPrint`.
- **v26.26** *(BUILT + VERIFIED, NOT YET COMMITTED — git lock stuck ~12:04)* — expanded audit logging:
  `loadsheet_bin` (delSaved + rezdy close-delete), `loadsheet_bin_bulk`, `record_delete_permanent`,
  `bin_empty`, `loadsheet_upload`, `loadsheet_reopen`, `fd_certify`, `fd_uncertify`, `user_save`,
  `roster_save`. (Leave already has its own `ts_leave_audit` trail.) Files: admin.js, admin_b.js,
  rezdy_c.js, flightduty.js, roster.js, shared.js (APP_VER).

- **v26.27** *(BUILT + VERIFIED, NOT YET COMMITTED — lock)* — **permissions grid decluttered**: columns
  grouped into labelled, colour-coded categories (Operations / Maintenance / Roster & Leave / Pilot /
  Admin & System / Coming soon) with a category header row, group separators, and a grouped column
  guide. `renderAdminPerms` in admin_b.js. No perm keys changed — purely presentation.

- **v26.28** *(BUILT + VERIFIED, NOT YET COMMITTED — lock)* — bug-sweep fixes:
  1. **State-initialiser landmine** — a runaway `//` comment after `resetStep:0` in the `S={...}`
     initialiser had been silently commenting out `lockedAcs, formDirty, mobileAcIdx, sigMode,
     sigTypedName, maintTab, maintSearch, editAcId, auditFilter/User/Page`. They survived only because
     every access is defensively guarded — restored them as active code (contained the comment).
  2. & 3. **Maintenance "today" used UTC** (`toISOString().slice(0,10)`) — that's *yesterday* for the
     first ~12h of every NZ day. Fixed the oil-entry-form default date and the search date-range to use
     `_todayLocal()`.

## ⚠ Git lock (≈12:04) — commits paused
`.git/HEAD.lock` is stuck and I can't remove it. All work from **v26.26 onward is saved on disk and
built/verified**, just not committed. It will all commit once the lock is cleared (quit GitHub Desktop
+ delete `.git/HEAD.lock`). Each change is logged here so nothing is lost and it stays reviewable; I
keep bumping APP_VER per logical change so versions are still distinct in the code.

## Architecture audit
- **`ARCHITECTURE_REVIEW_v26.28.md`** written (supersedes v25.97) — health, what's fixed this session,
  and a prioritised OPEN backlog (H1 RLS row-ownership, H2 apply flightduty.sql, H3 no CSP; M1 render
  perf, M2 bundle size, M3 offline-queue scope, M4 rezdy retention, M5 hard-delete reconcile).

## Bug sweep — verified clean (no fix needed)
- Loadsheet seat-move paths (swap / drop-from-unalloc / drop-to-unalloc / clear) all move ALL 7
  per-seat maps consistently (names/seats/bags/infantNames/paxGroups/paxType/paxPaymentReq) — the
  "recurring bug class" from CLAUDE.md is not present.
- No genuine duplicate `window.*` handler definitions (only print-window `onload` strings, which are
  separate child windows). No top-level declaration collisions (build.py scan clean).
- No month-level UTC date bugs (`_fdToday`/`_frToday` use local components).

## Final state (≈12:15)
- Committed (HEAD): **v26.25**.
- On disk, built + verified (0 syntax errors), pending git lock: **v26.26, v26.27, v26.28** + the docs
  (`ARCHITECTURE_REVIEW_v26.28.md`, `SMS_IMPLEMENTATION_PLAN.md`, this log).
- To land it all: quit GitHub Desktop, delete `.git/HEAD.lock`, then a single commit captures the lot
  (the temp-index commit snapshots the whole working tree). Everything is documented per-change above.

## Notes
- Splitting is for developer ergonomics only; runtime is unchanged (still one concatenated bundle).
  Real runtime-perf items will be findings in the architecture audit, not blind refactors.
