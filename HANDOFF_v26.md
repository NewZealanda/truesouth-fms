# TrueSouth FMS — handoff blurb (as of v26.02)

Paste this into a new conversation. (CLAUDE.md auto-loads with the standing rules; this is the
state-of-play on top of it.)

## What it is
A vanilla-JS single-page **Flight Management System** for TrueSouth, a Queenstown charter/scenic
operator (Milford Sound dominant; also Mt Cook, Franz Josef, Branches Station). One operator-facing
web app: bookings, seatmap + loadsheets (weight & balance), a calendar/scheduler, crew roster, leave,
aircraft maintenance, flight records/logbook, flight-and-duty, and a business-plan workbook.

Fleet: **ZK-SLA, ZK-SLB** (C208 Caravan), **ZK-SDB** (C208, *leased* — needs its own pilot
endorsement, costed at a flat $/hr), **ZK-SLD, ZK-SLQ** (GA8 Airvan). Wanaka (WF) is the maintenance
base; aircraft ferry QN↔WF for maintenance.

## Architecture / workflow (critical)
- **Vanilla JS, ONE global scope.** Source in `modules/*.js` + `head.html`/`tail.html`; `build.py`
  concatenates them (fixed ORDER) into `index.html`. No framework, no modules — watch for top-level
  name collisions (build.py scans for them).
- **Backend: Supabase** (REST + a realtime websocket). Anon key only in the client; the Rezdy API key,
  service-role key and webhook secret live ONLY in edge functions (`supabase/functions/*`).
- **Deploy: Netlify** (branch `main` → production). 
- **Every change:** edit `modules/*.js` → bump `APP_VER` in `shared.js` → `python3 build.py` →
  syntax-check by extracting inline `<script>` and `node --check` (expect 0 errors) → commit with the
  temp-index trick:
  `GIT_INDEX_FILE=/tmp/tsidx git read-tree HEAD && GIT_INDEX_FILE=/tmp/tsidx git add -A && GIT_INDEX_FILE=/tmp/tsidx git commit -m "..."`
- **STANDING RULES:** commit but **do NOT push** (Andrew pushes/merges via GitHub Desktop). **Never
  delete `.git/HEAD.lock`/`index.lock`** — if a commit fails on a stale lock, STOP and ask Andrew to
  clear it (this happens often; he clears it, then I retry). Never hardcode secrets. Never store card data.
- The build sandbox paths map: repo `…/Documents/truesouth-fms` ↔ `/sessions/.../mnt/truesouth-fms`.

## Current version: v26.02. Latest review: `ARCHITECTURE_REVIEW_v25.97.md` (backlog cleared in v25.98).

## Key systems & current behaviour (the v25.x–v26.x work)
- **Calendar (Operations ▸ Calendar)** has three sub-tabs: **Bookings** (per-aircraft day grid),
  **Aircraft movements** (per-aircraft legs incl. ferries), **Pilot movements** (per-pilot timeline).
- **Pointer-based block drag/resize** (NOT HTML5 DnD): grab a booking block's **top edge** = set
  departure, **bottom edge** = set return, **middle** = move (follows cursor in 2D, highlights the
  target aircraft column) → drops re-time + reassign aircraft; **tap** = open. Flyback (CCF/FLB) drag
  sets its fly-back time, or folds onto a flight, or assigns to an aircraft column. 15-min snap with a
  dashed-red guideline. Overrides: `S._rzDepTimeOv` (dep), `S._rzDepEndOv` (return),
  `S._rzFlybackTime` — all keyed `product|rawStart` (survive aircraft moves), persisted in the pickup
  blob (`_PK_FIELDS`).
- **Scheduling allocator** (`modules/scheduling.js`): cost-aware aircraft allocation (`_schedDayPlan`,
  per-dest away-time `_schedDepDurMin`: BRA 30 / MC 360 / FJ 300 / MF 270) + **time-aware pilot
  allocation** (`_schedComputeBlockPilots` over `_schedDayFlights`, the single shared flight list used
  by both the calendar render and `_schedEnsureAuto` → seatmap PIC and calendar agree). Pilots **stay
  with the aircraft for the whole rotation** (fly down, wait, fly back) and only free up back in QN;
  manual picks reserved; **SDB needs its own endorsement**, others type-based (`_pilotRatedForAc`).
  Maintenance ferry gives the pilot a **1.5h QN↔WF drive buffer** (`RZ_MAINT_DRIVE_MIN`). One live
  **Route costs** table (Settings ▸ Ops ▸ Scheduling) is the single source the allocator reads,
  computed from Business-Plan run/hr × route hours + real destination fees (override per cell).
- **Maintenance ferries**: a maintenance booking auto-creates QN-WF / WF-QN ferry blocks; the calendar
  shows an "AT MAINTENANCE" backdrop between them; manual blocks (incl. ferries) are draggable and
  auto-get a pilot.
- **Pilot movements view** (newest, v26.02): per-pilot columns = flights + 🚗 drives + 📅 meetings;
  **＋** on each pilot column adds a meeting (stored as a `ts_schedule` block with `aircraft:'__pilot__'`
  + `pilot` field; shared block-edit form `_rzSchedEditForm`).
- **Flight records / logbook / flight-and-duty**: per-aircraft "Aircraft records" with a manual
  "＋ Add a flight"; personal logbook (`renderLogbook`, "+ Add entry"); F&D advisory tracker. These
  tables (`ts_flight_records`, `ts_flightduty`, `ts_fd_certs`) are now in the realtime subscription —
  Andrew has enabled realtime on them in Supabase (Database ▸ Publications ▸ supabase_realtime).
- **Rezdy**: search only returns ~last 2 months of *created* bookings, so completeness comes from a
  **webhook** (`rezdy-webhook`, captures every order live) + a `{import:[orderNumbers]}` backfill in
  `rezdy-sync` (run from a CSV export). Per-(order,date) storage in `ts_rezdy_bookings`.
- **Loading screen**: hand-drawn mountains draw left→right then a plane takes off and climbs the range
  (6s loop, painterly brush filter); a **Skip** button.

## Known open / next-step candidates
- M1/M2 from the review are reconciled; remaining minor backlog is documented in
  `ARCHITECTURE_REVIEW_v25.97.md`.
- Possible follow-ups Andrew may raise: show the maintenance drive as a shoulder on the Bookings/
  Aircraft-movements ferry blocks too; make pilot meetings drag-resizable; per-destination FJ flat
  prices (Franz Josef needs a "Franz Josef" location in Business-Plan running-cost locations for fees).

## Working style with Andrew
Iterative, fast back-and-forth; he tests each deploy. Keep responses concise. Always build + syntax-check
+ commit (not push). Use the AskUserQuestion tool sparingly; prefer shipping a sensible default and noting
it. He clears git locks when they block a commit.
