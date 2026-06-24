# TrueSouth FMS — Architecture Review & Bug Sweep (v25.97)

Three-area audit (read-only) of the codebase as of **v25.96**, run as parallel reviews:
calendar pointer-drag/overrides (rezdy.js), the scheduling allocator (scheduling.js),
and a broad architecture/security/persistence sweep. Fixes below shipped in **v25.97**;
the rest is the prioritised OPEN backlog.

The build is healthy: `build.py` passes (module-presence + NUL/latin-1 + column-0 duplicate-
declaration scan), the inline-script `node --check` extraction reports **0 errors**, and there
are **no top-level name collisions** across the single shared scope.

## FIXED in v25.97

- **H1 (HIGH) — manual pilot picks could double-book a pilot.** `_schedComputeBlockPilots`
  built one rotation per aircraft and captured only the LAST manual pick (`r.manual=…`), so a
  second manual pick on the same aircraft was never reserved in `freeAt` and could be
  auto-assigned to another overlapping aircraft. Now every manual pilot on a rotation is collected
  (`r.manual[]`) and each is reserved for the whole rotation. Unit-tested: two manual picks on one
  aircraft + an overlapping flight on another → the overlapping flight correctly takes the third
  pilot, never a reserved one.
- **A1 (MED) — spurious "moved" banner.** Dropping a block back on its original 15-min slot
  recorded a no-op departure override (`_rzDepTimeOv`), flagging the flight as moved. The move
  commit now only writes the override when the time actually changed, else clears it.
- **A2 (MED) — stuck live-preview styles.** A manual-block drag that resulted in no change
  (`rezdySchedMoveBlock` early-returns without rendering) left the block semi-transparent/mis-sized.
  `_rzCalUp` now always `render()`s after the manual-block path.
- **A3 (LOW) — no-op reassign on the Unallocated column.** Dropping an unallocated block back on
  the Unallocated column pushed an undo entry and re-stamped every booking `__none__`. The move now
  treats `__unalloc__`/`__none__`/current-ac as equivalent before reassigning.
- **A4 (LOW) — drag NaN guard.** `rzCalDown` now bails if a block's start/end minutes are
  unparseable (robustness; booking blocks were always fine).
- **M3 (MED) — Branches (BRA) flights were priced as Milford.** `BRA` had no entry in
  `SCHED_DEST_LOC` / `SCHED_DEST_ALIAS` / `SCHED_DEST_HRS`, so the cost path fell back to Milford
  hours/fees. Added BRA (location "Branches Station", alias "branch", 0.5h round trip) so a Branches
  departure is costed as the short near-base trip it is.

## Update — backlog cleared in v25.98

All OPEN items below were addressed in **v25.98** (plus 3 requested feature tweaks):
- **M1 done** — one flight-keyed, time-aware pilot writer (`_schedComputeBlockPilots` fed by the new
  shared `_schedDayFlights`), used by BOTH the calendar render and `_schedEnsureAuto`. The old
  aircraft-keyed `_schedComputeAutoPilots` is removed, so the seatmap PIC and the calendar agree.
- **F1 done** — `_schedDayFlights` includes manual schedule blocks (maintenance ferries etc.), so they
  get an auto pilot; `_rzManBlockTitle` now shows the manual-or-auto pilot.
- **C1 done** — `ts_flight_records`, `ts_flightduty`, `ts_fd_certs` added to the realtime subscription
  + `reloadTable` handlers (re-pull via the loaders). NB: still needs those tables in the Supabase
  realtime publication server-side to actually fire.
- **C2 done** — scheduling realtime apply now skips a ~4s window after a local `_schedSave` (timestamp
  guard) so an in-flight edit isn't clobbered.
- **C3 done** — `_rzTickNowLine` now `clearInterval`s `_rzNowTimer` once off the calendar.
- **A5 done** — removed dead `rezdySchedBlockDragStart`, `rezdySchedEdgeDragStart`,
  `_schedComputeAutoPilots`, and the `.ts-logo-spin`/`@keyframes ts-spin` CSS.
- **M2 reconciled (no code change)** — the cost-plan away-time (`_schedDepDurMin`, dest-based) and the
  pilot-rotation away-time (`_schedDayFlights`, product-based) already agree on the real routes
  (MF 270 / MC 360 / FJ 300 / BRA 30); they intentionally differ in granularity for rare scenic
  products, where the product-based figure is the more accurate one. Forcing a single function would
  regress scenic durations, so left as-is.
- Feature tweaks: flight-log "Add a flight" button de-cluttered (removed "(paper / missed)"), and the
  "Add a logbook entry" button removed from Aircraft records.

## OPEN backlog (addressed in v25.98 — see above; original list kept for reference)

- **M1 (MED) — two writers to `S._schedAutoPilots` with different keying.** The calendar render
  writes a flight-keyed, time-aware map (`_schedComputeBlockPilots`); `_schedEnsureAuto` writes an
  aircraft-keyed, sticky, non-time-aware map (`_schedComputeAutoPilots`). On the calendar the
  time-aware one wins, but on the **seatmap** (or any render that doesn't reach the calendar's
  compute) `_rzSchedPilotFor`→`_schedAutoPilotFor` may read the aircraft-keyed version, so the
  seatmap PIC can disagree with the calendar. Fix: make `_schedEnsureAuto` produce block (flight-)
  keyed pilots too, or designate a single canonical writer.
- **M2 (MED) — two away-time models.** The cost optimiser (`_schedDayPlan`) uses
  `_schedDepDurMin` (BRA 30 / MC 360 / FJ 300 / 270 default); the calendar pilot rotation uses the
  real block span (product duration + edge-drag overrides). They can disagree on "is the aircraft
  free for the next departure," so the "pilots need N" count and the on-calendar rotations won't
  always match. Fix: drive both from one away-time function.
- **C1 (MED) — flight records / flight-and-duty not live-synced.** The realtime subscription covers
  ts_crew/aircraft/users/loadsheets/manifests/charter_rates/settings/maintenance but NOT
  `ts_flight_records`, `ts_flightduty`, `ts_fd_certs`. Data persists via `sbU` but doesn't propagate
  to other devices live (e.g. a manager's F&D Team Summary). Fix: add these tables + reload handlers
  (mirror the loadsheets pattern) — also requires the tables to be in the Supabase realtime
  publication.
- **C2 (LOW) — scheduling realtime handler has no edit-in-flight guard** (unlike roster/maintenance/
  business_plan). Low impact because scheduling saves on every change via a 3-way merge; only an
  uncommitted in-flight keystroke could be clobbered.
- **C3 (LOW) — `_rzNowTimer` interval never cleared.** Harmless: `_rzTickNowLine` early-returns off
  the calendar / on a missing element. Optional cleanup.
- **A5 (LOW, cleanup) — dead drag code.** After the pointer-drag rewrite,
  `rezdySchedBlockDragStart`, `rezdySchedEdgeDragStart`, `_rzDragSnapMins`, `S._rzSchedBlockGrabDy`
  and the block-on-block branches inside `rezdySchedDropPilot`/`rezdySchedDropBlockToAc` are
  unreachable for block drags (blocks are no longer HTML5-draggable). The column still uses
  `rezdySchedDragOverCol`/`rezdySchedDropBlockToAc` for **pilot** drag-over/drop — do NOT delete
  those. `head.html` `.ts-logo-spin` CSS is unused. Prune when convenient; none are broken refs.
- **Docs — CLAUDE.md is stale** (says v24.43 / review v24.41; actual APP_VER v25.9x). The newer
  modules (flightrecord.js, scheduling.js, training.js, businessplan.js) and the v25.x work aren't
  documented. Worth refreshing the standing rules + module list.

## Confirmed CLEAN (checked, ruled out)

- **Security:** no secrets in the client bundle beyond the Supabase anon key (`role:anon`). The
  Rezdy key, service-role key and webhook secret live only in the edge functions. `rezdy-webhook`
  verifies its secret and fails closed; `verify-login` strips password fields and gives a generic
  error (no user enumeration). Pre-existing/accepted: unsalted SHA-256 + no endpoint rate-limit.
- **Persistence:** the `_PK_FIELDS` pickup/calendar blob (25 fields incl. flybackTime/depTimeOv/
  depEndOv) round-trips symmetrically and merges 3-way before write; the `ts_settings` realtime
  reload list includes business_plan/scheduling/fd_limits/fr_settings with per-key try/catch and
  local-edit guards on the high-risk keys.
- **Ratings & cost round-trip:** `_pilotRatedForAc` (SDB needs own endorsement; GA8/C208 type-based;
  empty passthrough) is used identically by the allocator and all three manual pilot-pick guards.
  `schedSetRouteCost`/`schedSetDestCost` write the same keys `_schedRouteOv` reads.
- **Pointer-drag lifecycle:** document pointermove/up/cancel listeners are always removed (tap,
  cancel, rapid re-press); tap-vs-drag threshold and snap/clamp are correct; override maps key on
  `product|raw-start` so they survive aircraft moves and apply consistently in the block render,
  movements view, and pilot rotation.
