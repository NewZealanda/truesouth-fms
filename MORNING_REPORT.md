# Morning Report — TrueSouth FMS nightly sweep
**Run:** 2026-07-01 (early AM) · **Version:** v28.89 → **v28.90** (built, ⚠️ uncommitted)

## TL;DR
Clean night. First full sweep since v28.55 — covered the whole undocumented **v28.56→v28.89**
cycle (the new **customer weather-link** system + `wx.html`, self-drive pickup override, 15-language
wx page, leave-cancellation approval, anniversary header). **No High/Med bugs.** One small safe
consistency fix applied. Build + syntax-check pass with 0 errors. **Commit is blocked** by a stale
`.git/index.lock` + a read-only `.git` in this VM — work is in the working tree for you to commit.

## What I swept
- **Weather-link / self-drive / pickup layer** (`wxlinks.js`, `rezdy.js`, `rezdy_b.js`, `wx.html`) — read `wxlinks.js` in full + a dedicated deep-audit reviewer.
- **Leave cancellation-approval + roster revert** (`leave.js`) — dedicated deep-audit reviewer.
- **Loadsheet per-seat 7-map move/swap** (`admin.js`) — read all 5 handlers directly.
- **Repo-wide greps** for date/UTC off-by-one, XSS sinks, duplicate top-level declarations.

## Bugs found & fixed
- **v28.90 — [Low] escape order# in the weather-link modal's inline `onclick` handlers.**
  In `wxlinks.js` `_wxLinkModal`, the Copy button already JS-escaped the order#, but Mark-sent
  (WhatsApp/Email), Reset-to-live and Clear-history interpolated the bare `order`. Rezdy order
  numbers are alphanumeric so the practical risk was ~nil, but it was an inconsistent latent
  handler-break/injection gap. Fixed: one JS-safe `oj` used in all 5 inline handlers. No
  behaviour change.

## Verified clean (no change needed)
- **Per-seat field maps** move all 7 together (`names/seats/bags/infantNames/paxGroups/paxType/paxPaymentReq`) and call `autoSaveLS()` in every loadsheet move/swap/bump handler — the recurring TO-PAY/child-orphan class is clean.
- **Weather-link layer:** all customer/booking text escaped at the render leaf; `wx.html` uses `textContent` for the name + withholds the internal comment; every state mutator persists+broadcasts (`pickupSave`/`_rzPickupBroadcast`/`wxSyncDep`/`sbU`); dates `_rIso`-guarded; NaN/null guards present.
- **Leave cancellation:** roster revert goes through `_rosterApplyAndSave` (merge-before-write, no last-writer-wins); approve/decline double perm-gated; leave-days exclude rdo/off off the persisted roster.
- **Duplicate top-level decls:** none (build.py column-0 scan).
- **Date/UTC:** no bare local-date off-by-one — all `toISOString().slice(0,10)` are guarded fallbacks or deliberate UTC uses.

## Left open (documented, not changed)
- The 5 ground/ops modules **and** `ts_wx_links` are not realtime-subscribed — they poll/reload only. Worth confirming `ts_wx_links` is in the realtime publication (else a desk off the bookings page won't see customer actions live). Next-upgrade candidate; deferred (larger change).
- Cosmetic: leave stamp/unstamp asymmetry — revert blanks a cell rather than restoring a prior non-off status (non-destructive of concurrent edits; UI copy slightly overstates fidelity). Pre-existing.
- Carried: `saveAircraftDraft` no realtime broadcast; flight records not realtime-synced; server gating is by-permission not row-ownership; no CSP.

## Tests
- `python3 build.py` → clean (module-presence + dup-decl scan pass). `index.html` rebuilt **26,791 lines / 3,663 KB**, carries `APP_VER='v28.90'`.
- `node --check` on all **4** inline `<script>` blocks → **0 errors**.
- No live mutation. Production (truesouth.netlify.app) serves the deployed v28.89; this sweep's v28.90 is local/unpushed, so a live check wouldn't reflect it.

## Total lines of code
**53,618 lines** (`modules/*.js` + `modules/*.html`), with the generated `index.html` at 26,791 lines.

## ⚠️ Blocker — commit could not be made
A stale **`.git/index.lock`** is present, and this VM also can't write into `.git/objects`
("Operation not permitted"), so even the temp-index commit trick fails. **Per the standing rule I
did NOT delete the lock or touch `.git`.** On top of that, the working tree was already mid-refactor
before this run — your **`wx.html` → `modules/wxlinks.js`** migration shows as staged deletions of
`wx.html`/`wx_links.sql`/`modules/wxlinks.js` alongside untracked re-adds, plus `build.py`/`.gitignore`
edits. That's your in-progress work, not the sweep.

**To pick up v28.90:** clear `.git/index.lock` (and any `.git/HEAD.lock`) manually → review the
working tree in GitHub Desktop → untangle the wx-refactor staging → commit → push/merge. This
sweep's files: `modules/wxlinks.js`, `modules/shared.js` (APP_VER), `index.html`,
`ARCHITECTURE_REVIEW_v28.90.md`, `CLAUDE.md`, `MORNING_REPORT.md`.

**SQL to apply if not done:** `wx_links.sql` + the carried set (`vehicle_prestarts.sql`,
`ops_notices.sql`, `equipment.sql`, `visitors.sql`, `flight_following.sql`, `vp_delete_own.sql`,
`fix_feature_table_grants.sql`, `fix_uuid_user_columns.sql`).
