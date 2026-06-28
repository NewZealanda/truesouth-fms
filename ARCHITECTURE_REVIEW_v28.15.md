# Architecture Review — TrueSouth FMS v28.15

Full architecture audit + bug sweep + testing, run after the v28.12–v28.15 work
(permissions overhaul, weather-call notifications, Statistics→Data Recording,
Reports-to→Roster, User Preferences redesign). Three parallel reviewers covered
(1) regression risk in this session's changes, (2) the Operations/Rezdy/loadsheet/
seatmap layer, (3) the core/admin/roster/leave/maintenance/flight-records layer.

## Scope & method
- Recurring bug classes checked: per-seat field-map desync, realtime
  mutate-without-broadcast, W&B/CoG NaN guards, XSS, date/UTC off-by-one,
  duplicate top-level declarations, focus-clobbering renders, permission/leave
  logic correctness, NaN guards in estimators/finance.
- Tests: `python3 build.py` (module-presence + top-level duplicate-declaration
  scan) → clean; inline `<script>` blocks (4) `node --check` → 0 errors;
  `index.html` rebuilt 25,064 lines / 2288 KB.

## Bugs found & fixed (this sweep → v28.15)

1. **[High · regression] `ground_staff` locked out of Ground/Transport.** The
   v28.12 combine aliased `ground`→`operations` in `hasRolePerm`, but
   `DEFAULT_ROLE_PERMS.ground_staff` had `operations:false, ground:true` — so the
   one role whose entire job is Transport lost the Ground section, drawer button
   and sub-tabs. Fixed: `ground_staff` now `operations:true, calendar:true`
   (matches the stated intent — every role that previously saw any operational
   area now sees all of it). `shared.js`.

2. **[Med · regression] Dead "No sections available" body in Settings.** Settings
   is now open to everyone (`settings` perm default-on), but `renderAdmin`'s
   non-admin branch fell through to a no-access card for a role lacking
   `admin_crew`/`admin_users` that landed on Settings (e.g. home-page pref set to
   Settings, or `S.admin.section` still `'people'`). Fixed: fall back to
   `_renderUserPrefs()` (Preferences is always permitted). `admin.js`.

3. **[High · XSS] Unescaped user fields in the account modal + app header.**
   `${u.name||u.email}`, `${u.email}`, `${u.role}` (account modal) and
   `${S.user.name.split(' ')[0]}`, `${S.user.role}` (header) were interpolated
   into innerHTML unescaped. Names/emails/roles come from `ts_users`
   (admin-set). Wrapped each in `esc()`. `shell.js`.

4. **[Med · XSS] Reflected reset email + CAA number.** Login reset-confirmation
   panel reflected the typed `S.resetEmail` unescaped (`shell.js`); the People
   list printed the DB `caaNum` unescaped while name/email beside it were escaped
   (`admin.js`). Both wrapped in `esc()`.

5. **[Med · realtime] `clearPadCanvas` didn't persist or broadcast.** Clearing a
   scratchpad canvas wiped only the local drawing — lost on refresh and never
   synced to other devices (stroke-add broadcasts, clear didn't). Fixed:
   `clearPadCanvas` now calls `_padAutoSave(act)` (persists the emptied drawing)
   and broadcasts a `pad_stroke` with a `clear` flag; the realtime receiver in
   `shared_b.js` honours it (empties the drawing + clears the live canvas).

6. **[Low · XSS] Maintenance booking notes** interpolated unescaped into an input
   `value=""` (operator-entered, but a `"` would break the attribute). Wrapped in
   `esc()`. `maintenance.js`.

## Verified clean (no changes needed)
- **Per-seat field maps** — every seat move/clear handler moves all seven maps
  (names/seats/bags/infantNames/paxGroups/paxType/paxPaymentReq) together,
  including the historically-leaky TO-PAY and child flags (`tapFormSeat`,
  `lsDropOnSeat`, `lsCoPilot`, `lsAc`, `lsDelPax`, `rezdyManCreateLoadsheet`, …).
- **Realtime broadcasts** — loadsheet mutators call `autoSaveLS()`, seatmap/pool
  mutators call `saveSeatmapWS()`, Rezdy seatmap/pickup/calendar route through
  their save/broadcast helpers. (Scratchpad clear was the one gap — fixed above.)
- **W&B / CoG** — `calcFormWB` null-guards a missing aircraft and CoG division;
  envelope interpolation guards slope/axis denominators; instance-aware by
  `_seatmapKey||acId`.
- **Date/UTC** — keyed/displayed dates use `_rIso`/`_todayLocal`/`_fdIso`; no
  local-date `toISOString().slice(0,10)` off-by-one in scope.
- **Duplicate top-level declarations** — full column-0 scan across all modules:
  none (only intentional same-file `function X(){}; window.X=X` self-exports).
- **Leave/permission logic** — `_lvCanApproveReq` (superadmin=all, admin=all but
  superadmin, everyone-else=direct reports), `_notifyLeaveApprovers`,
  `_wxBroadcastRecipients` all defensive on empty `S.users`/`S.roster`; approve/
  decline re-check server-side. New weather_call notification is clickable
  (label + navigate) end-to-end.
- **NaN guards** — maintenance estimator, flightduty rolling sums/currency,
  businessplan loan/budget math all guard zero denominators.

## Open / deferred (low risk, documented)
- **`saveAircraftDraft` (admin_b.js) writes `ts_aircraft` without a realtime
  broadcast** — other open devices keep stale W&B specs until reload. Low (specs
  change rarely); would need a new realtime event + receiver. Not changed.
- **Combined-Ops behaviour:** any role with `operations:true` now also passes the
  aliased `charter`/`calendar`/`ground`/`resources`/`weather_call` checks (by
  design). Confirm CX Manager seeing Charter is acceptable (charter has aliased to
  operations since before this session).
- Pre-existing carried items: flight records not realtime-synced; breakdown-undo
  cache; `shell.js` login uses innerHTML (login fields are app-controlled).

## Git
Built + verified; committing on top of `aa8076f` (v28.14). Not pushed (standing
rule). If a commit hits a stale `.git/*.lock`, clear it manually before GitHub
Desktop, then push/merge.
