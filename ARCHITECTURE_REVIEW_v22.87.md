# TrueSouth FMS — Architecture Review & Bug Sweep (v22.87)

_Date: 17 Jun 2026. Reviewed source modules (not the built bundle). Three parallel deep reviews: architecture, seatmap/loadsheet/manifest, and shared/shell/leave/roster._

---

## 1. What was fixed in v22.87 (committed in this pass)

| # | Area | Bug | Severity | Fix |
|---|------|-----|----------|-----|
| 1 | Loadsheet | `lsDelPax` deleted only name/seat/bag/infant — left `paxGroups`/`paxType`/`paxPaymentReq` behind. A removed pax left a stale **TO PAY** / child / group flag that a new occupant could inherit. | **Critical** (billing) | Delete all seven per-seat maps. |
| 2 | Loadsheet | `lsTrimExcess` trimmed only 4 of 7 maps and never broadcast. | High | Trim all seven; call `autoSaveLS()`. |
| 3 | W&B | `runSolver` CoG-fix looked up the aircraft setup by `s.acId` instead of `_seatmapKey`, so on a **duplicated aircraft instance** (e.g. 2× ZK-SLA) it found nothing → PIC weight treated as 0 → wrong projected CoG and wrong auto-apply/fix suggestion. | High | Resolve by `_seatmapKey \|\| acId`. |
| 4 | W&B | `calcFormWB` returned `lwCog: mom/wt` with no zero guard → `NaN`/`Infinity` landing CoG on a degenerate/empty spec. | Medium | Guard `wt ? mom/wt : 0`. |
| 5 | Realtime | Duplicated `phx_reply` handler block → double presence-broadcast + double render on every (re)connect. | High | Removed the duplicate. |
| 6 | Realtime | Foreground resume created a new presence `setInterval` without clearing the old one → orphaned timer / duplicate 9 s broadcasts. | Medium | `clearInterval` before re-arming. |
| 7 | Notifications | `logout()` left `S._notifications`/`__notifStr` populated → next user on a shared device briefly saw the previous user's notifications/badge. | High (privacy) | Clear notification state on logout. |
| 8 | Notifications | `markNotificationsRead` didn't refresh `__notifStr` → 10 s poll did a wasted re-render each cycle. | Medium | Sync `__notifStr` after marking read. |
| 9 | Leave | `_lvWorkingDays` counted via `_rGetStatus`, which overlays the **unsaved roster draft** and **leave overlay** → stored leave-day totals changed depending on transient UI state (payroll-relevant). | High | Read the persisted roster only. |
| 10 | Leave | `_lvDays` parsed bare dates as UTC while the rest of the app uses local midnight → DST off-by-one on ranges crossing a transition. | Medium | Parse as local midnight. |
| 11 | Consistency | `bF()` didn't initialise `paxPaymentReq{}`. | Low | Added it. |

All 11 are isolated, verified against the actual code, build-clean (`node --check` passes), and bundled in **v22.87**.

---

## 2. Architecture findings NOT yet actioned (need your decision)

These are structural — bigger than a one-line fix, and a couple need a product/security decision before I touch them.

### Security (most important)

**A1 — The database is effectively world-readable/writable.** The Supabase **anon key is the only credential**, it's embedded in the public bundle, RLS is disabled, and auth is done entirely client-side (password hashes are read/written from the browser). Anyone who opens the deployed page can in principle `fetch` `ts_users` and pull every email + password hash, or write arbitrary rows (roster, audit, manifests).

> This is the single biggest risk. Before you go to real production use with real people's data, you want: (1) RLS enabled on every `ts_*` table — at minimum block `SELECT` on `ts_users.password_hash`; (2) ideally move auth to Supabase Auth so requests carry a real per-user token. This is a decision + a chunk of work, so I've left it for you rather than changing your auth model unannounced.

### Realtime / sync correctness

**A2 — Loadsheet live-sync is half-wired.** The query always fetches `ls_live_*` rows and there's a guard (`_ownLSSaveTs`) meant to suppress your own echo — but **nothing ever writes an `ls_live_*` row** and `_ownLSSaveTs` is **never assigned** (the guard is dead code). Live loadsheet editing currently rides entirely on the ephemeral `ls_update` broadcast. It works while sockets are up, but there's no durable backing and the dead guard means a table reload mid-edit can overwrite your form. _Recommendation: pick one model — either actually persist `ls_live_<ac>` rows (and set the guard), or delete the dead read branch and rely on the broadcast + active-element check._

**A3 — Two sync mechanisms run in parallel** (app-level `broadcast` events AND Supabase `postgres_changes`) for the same tables, uncoordinated, so a single save can apply twice and re-render twice.

**A4 — Merge is coarse last-writer-wins** on a single `_updateTs` per record. Two users editing different fields of the same manifest within the ~800 ms debounce window can have one overwrite the other; a locally-deleted pax can reappear from a slightly-older remote snapshot. Fine for "one editor at a time," risky for true simultaneous editing.

**A5 — No reconnect backfill.** After an 8 s blind reconnect, `postgres_changes` that fired during the gap are gone (broadcasts aren't replayed). The 60 s visibility reload partly covers it, but a socket that drops while the tab stays foreground for <60 s silently misses changes. _Recommendation: trigger a one-shot full reload on socket reopen._

### Build / structure

**A6 — Single global scope, load-order-dependent, no duplicate-symbol guard.** `acDisp` is defined three times (a copy-paste artifact in `admin.js` plus once in `maintenance.js`); it happens to be harmless because the last wins, but nothing would catch the next accidental collision. _Recommendation: add a build-time duplicate-top-level-symbol check to `build.py`._

**A7 — `build.py` is latin-1 only.** Pasting a real UTF-8 emoji or curly quote into any module breaks the build with an obscure error. _Recommendation: move the pipeline to UTF-8._

**A8 — ~1 MB inline base64 logo + `no-store` on the HTML** means the whole app re-downloads on every reload trigger (and there are several aggressive reload triggers). _Recommendation: move the logo to a hashed, long-cached static asset._

### Lower-priority

- **A9 — Caches not cleared on login/logout.** `ts_manifests_cache` and `ts_smws` survive a user switch, so a new user on a shared device inherits the previous user's cached manifests/workspace until the server fetch lands.
- **A10 — `_navAway` save path doesn't `await` the cloud save** before navigating (`_rosterNavChoose('save')`), so a "Save & continue" can lose the roster write if navigation reloads.
- **A11 — Section switches from Roster** (`setTab`/`switchOpsTab`) don't run the unsaved-roster guard — only the drawer buttons, week steppers and `beforeunload` do. Narrow gap, but a draft can be dropped silently.
- **A12 — `_seatmapSyncPool` de-dupes pool pax by `name|weight`**, so two genuinely different passengers with the same name and weight (e.g. two un-weighed "Smith" at 0 kg) — the second silently won't appear in the pool.
- **A13 — 10 s notification poll runs on every client** in addition to realtime; would scale better as a realtime subscription on `ts_notifications`.
- **A14 — Tab-key pax navigation off-by-one** (`fi<3` left over from an old 4-field layout) so Tab doesn't advance between pax rows.

---

## 3. Suggested next steps

1. **Now:** push v22.87 (the 11 fixes above).
2. **Before real production traffic:** A1 (RLS + auth) — happy to scope this with you.
3. **When you have a moment:** A2 (decide the loadsheet live-sync model) and A5 (reconnect backfill) — these are the realtime correctness items most likely to bite with multiple devices.
4. **Cheap wins I can do next pass if you want:** A6 (build duplicate-symbol guard), A9 (clear caches on logout), A10 (await roster save), A11 (guard section switches), A14 (Tab nav).
