# TrueSouth FMS — Architecture Review & Bug Sweep (v24.41)

Full multi-reviewer audit run over the work since v24.16 — Flight & Duty (v24.37–v24.40),
Transport/per-departure pickups + drop-offs (v24.28–v24.36), the calendar changes, and the core
sync/W&B/roster/leave paths. Three independent reviewers swept (A) `flightduty.js`, (B) `rezdy.js`
transport/calendar, (C) core `shared.js`/loadsheet-W&B/roster/leave + name-collision scan.

## Fixed in v24.41

- **F1 (HIGH, data drop) — `reloadTable('ts_crew')` stripped `dob`/`typeRatings`.** The boot map
  loaded them but the realtime/reconnect reload (fired on any crew edit) rebuilt `S.crew` without
  them, so Flight & Duty currency/age logic blanked after any profile edit until a full reload.
  Same class as the v24.35 `drive_uploaded` bug. Now mapped in `reloadTable` too.
- **Transport — drop-off location/time edits were ignored.** Drop-off cards rendered an editable
  location keyed by the `…|D` id, but `_rzPickups` only read the base id's override, so the edit
  reverted on next render. Drop-offs now resolve their own `locOverride`/`timeOverride` from the
  `…|D` id.
- **Transport — `'~'` vs `'—'` departure-sentinel mismatch.** Allocation/ensure-vans used `'~'` for
  a time-less pickup while the board/`_rzVanDepIds` used `'—'`, so such a pickup could mis-group.
  Unified to `'—'` everywhere.
- **F&D — orphan empty rows.** `fdSaveRow` computed `empty` but saved anyway; clearing a day left a
  zero row in the DB/cache forever. Now deletes the row locally **and** issues a DELETE.
- **F&D — days-off counted today/unlogged days as "off".** The rest-compliance counters now only
  count a **past** day with no entry as a confirmed day off (today/future blanks are "unknown").
- **F&D — landing inputs now coerced** to non-negative integers (flight hrs to non-negative), so a
  stray character can't silently zero a day's landings/currency.
- **F&D — `fdSetLimit` NaN guard** (garbage input reverts to default instead of disabling a limit).
- **F&D — non-managers only pull their own rows** (`&user_id=eq.self`) — defence-in-depth alongside
  RLS so a device doesn't download every pilot's record.
- **F&D — printed record's rolling figures** are computed as at the **end of the printed period**,
  not "today", so a printed past month shows that month's rolling totals.
- **F4 (W&B safety) — `calcFormWB` null-deref.** A partial/corrupt aircraft record (missing
  `seats`/`cargo`) white-screened the app on every loadsheet render. Now returns `null` (no W&B)
  instead of throwing.

## OPEN — top remaining (deliberately not changed blind overnight)

- **F2/F3 (HIGH, multi-device data loss) — roster/leave whole-blob save is last-writer-wins.**
  `saveRosterToCloud` (and the leave stamp/unstamp + roster pattern-push) overwrite the entire
  `ts_settings.roster` blob from a possibly-stale `S.roster`, so a concurrent device's edits vanish.
  Fix = re-GET the cloud roster immediately before writing and deep-merge per-date/per-user (one
  shared merge-before-write helper covers all paths); also gate the pattern-push "Pushed N" toast on
  the save result. **Pre-existing (in the v24.04/v24.14 backlog); needs a two-device real test —
  left for a tested pass rather than a blind overnight change.**
- **F5 (W&B, latent) — duplicated reserve calc.** The loadsheet's below-reserve banner recomputes
  fuel/reserve with a different burn-default chain than `calcFormWB`; they agree for the current
  fleet (all have `burnDef`) but could drift. Make the banner consume `calcFormWB`'s `reserveOk`.
- **F6 — leave `total_days` frozen at submit** from a possibly-stale roster (recompute on approve).
- **F7/F8 — leave `_renderMyLeave` uses UTC "today"** (rest of date math is local); unguarded
  `new Date(r.submitted_at)`.

## Checked and clear (no action)
- Name collisions across the concatenated scope — none (new `flightduty.js`/`businessplan.js`
  symbols unique; `_rzEscSafe` guards; `build.py` collision scan clean).
- Per-departure helper arg counts — all `(vi,dep)`, no leftover single-arg call-sites.
- Drop-off `…|D` ids don't leak into check-in/manifest/loadsheet/pax-breakdowns (those read
  `S._rezdyBookings`, not `_rzPickups`).
- FLB/CCF calendar block drag-to-reassign resolves orders off the un-remapped `ac|12:00|FLB` key.
- F&D rolling-window math (inclusive "any N days"), currency expiry (3rd-most-recent + 90), and the
  look-ahead (existing entries only) are correct.
- Per-seat-index W&B maps move together; fuel unit conversions not mixed; submit-below-reserve gate
  hard-blocks at the handler (not just the banner). `_sbRefresh` single-flighting + 401 retry OK.
- `merge-duplicates` upserts only touch supplied columns, so the crew minimal-fallback doesn't wipe
  other columns in the DB (the in-memory drop was F1).
