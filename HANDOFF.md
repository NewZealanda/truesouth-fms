# TrueSouth FMS — Developer Handoff

Read this first in a new chat, alongside `CLAUDE.md` (auto-loaded). This is the practical
"how we work + where we are + what's next" note. `CLAUDE.md` has the architecture; this has the
workflow, the recent history, and the gotchas.

Current version: **v24.28** — pickups are now PER DEPARTURE (drivers + active/parked vans + driver
acknowledgement all keyed `(vehicle, departure)` = `"vi|dep"`; `S._pickupDrivers/_pickupSpare/
_pickupAck` are objects now, old blobs start fresh). Built + verified (build clean, `blocks=4
errors=0`, 16/16 per-dep logic unit tests pass). ⚠️ **Still needs a two-departure / two-driver
real-device test** before production. **The latest full bug-sweep is `ARCHITECTURE_REVIEW_v24.14.md`**
— read it for the prioritised OPEN backlog (what was deliberately left for a runtime-tested pass).

---

## How to make a change (every time — do not skip)

1. Edit `modules/*.js` only — NEVER edit `index.html` (it's generated).
2. Bump `APP_VER` in `modules/shared.js` (e.g. `const APP_VER='v24.12';`). It shows in the UI so
   Andrew can confirm a deploy went live.
3. Rebuild: `python3 build.py`. It now also prints a top-level duplicate-declaration scan
   (single global scope) and checks module presence. Expect no collision warnings.
4. Syntax-check the 4 inline `<script>` blocks (build passes silently; this catches JS errors):
   ```
   node -e 'const fs=require("fs");const h=fs.readFileSync("index.html","utf8");
   const re=/<script>([\s\S]*?)<\/script>/g;let m,b=0,e=0;
   while((m=re.exec(h))){const c=m[1];if(!c.trim())continue;b++;try{new Function(c)}catch(x){e++;console.log("ERR "+x.message)}}
   console.log("blocks="+b+" errors="+e)'
   ```
   Expect `blocks=4 errors=0`.
5. Commit with the temp-index trick (dodges a stale `index.lock`):
   ```
   T=/tmp/tsidx_$$ && GIT_INDEX_FILE=$T git read-tree HEAD && GIT_INDEX_FILE=$T git add -A && \
   GIT_INDEX_FILE=$T git commit -m "vXX.YY: ..."
   ```
6. **Do NOT push.** Andrew pushes/merges via GitHub Desktop.

### The git-lock dance (important)
- Every commit leaves a stale `.git/HEAD.lock` that the sandbox CANNOT delete. It **blocks the
  next commit**. NEVER delete locks yourself (Andrew clears them on purpose).
- So: make ALL edits for a logical change, build, verify, then ONE commit. If the next commit is
  blocked, STOP and ask Andrew to clear `.git/HEAD.lock`; he replies when done, then commit.
- The `git commit` will print `warning: unable to unlink '.git/objects/..'` lines — those are
  harmless; the commit still succeeds (look for the `[main <hash>]` line).
- Note: commits go through a temp index, so plain `git status` against the real `.git/index`
  looks out of sync (shows M/D on already-committed files). That's a known artifact; `git log`
  is the source of truth. Andrew reconciles in GitHub Desktop. Don't try to "fix" the index.

### Path mapping (file tools vs the bash sandbox)
- File tools (Read/Write/Edit) use `/Users/andrewadamson/Documents/truesouth-fms/...`
- Bash sandbox sees the same repo at `/sessions/<id>/mnt/truesouth-fms/...`
- Build + git must run in bash (the sandbox path); edits use the file-tool path.

---

## Architecture in one breath
Vanilla JS, ONE global scope. `modules/*.js` are concatenated by `build.py` (fixed ORDER) into
`index.html`. Global state object `S`. Backend Supabase (REST + realtime websocket). Auth is LIVE
(`AUTH_PHASE_A`/`AUTH_PHASE_C` true — GoTrue + JWT; RLS policies in `auth_*.sql`). Function
declarations hoist across the whole bundle, so a helper defined anywhere is callable anywhere —
but watch for top-level name collisions (the build scans for them).

Key files: `modules/rezdy.js` (biggest — Bookings/Seatmap/Calendar/Pickups/Loadsheets/fuel),
`modules/shared.js` (state, sync, W&B helpers, boot), `modules/loadsheet.js` + loadsheet parts of
`modules/admin.js` (the W&B editor — SAFETY CRITICAL), `modules/roster.js`, `modules/leave.js`,
`modules/maintenance.js`, `modules/shell.js` (nav, keydown/swipe, render shell).

## Recurring gotchas (learned the hard way)
- **Per-seat-index maps move together.** `S.form.names/seats/bags/infantNames/paxGroups/paxType/
  paxPaymentReq` are keyed by seat index. When a passenger moves/swaps/clears, ALL must update or
  a bag / child / TO-PAY flag gets orphaned (this was a real W&B bug in v24.04).
- **Lazy-load shared blobs.** Roster (`S.roster`) and the pickup blob (`S._schedPilots` etc.) only
  load when their own page is opened. If another view needs them, lazy-load like
  `_rzAvailablePilots` (v24.08) and the seatmap PIC seed (v24.10) do, or you'll read empty data.
- **Escape external/user text in HTML** — use `esc()` (global, escapes quotes too). Rezdy customer
  names are attacker-controlled; `toast()` and seat-name renderers were XSS holes (fixed v24.04).
- **Departure keys are composite** TIME·DESTINATION (`_rzBaseDep`); the time-only form needs
  `.split('·')[0]`. Mixing the two is the #1 source of latent Rezdy bugs.
- **Don't full-render on a timer** — it flashes. Update the element in place (see `_rzTickNowLine`).
- **W&B units:** `form.fuel` is KG; `form.burnOff` is DISPLAY units; `toKg(v,acId)` = airvan→×AVGAS
  (litres), else ×LB (lb). Verify any fuel/weight math against this.

---

## Backlog / good next tasks
From `ARCHITECTURE_REVIEW_v24.04.md` §3 (each has a concrete suggested fix in that doc):
- ✅ **A2 — pickups/check-ins live-sync** — DONE v24.13 (`pickup_update` broadcast/receiver,
  `rezdyReloadPickupLive`). ⚠️ still needs a two-device real-iPad confirm.
- ✅ **A3 — roster live-sync** — DONE v24.13 (roster/roster_colors added to the `ts_settings`
  realtime reload; apply skipped while a local draft is open). ⚠️ confirm on two devices.
- ✅ **A4 — reconnect backfill** — DONE v24.13 (re-pulls `ts_settings` + current-date Rezdy
  state on socket re-open). ⚠️ confirm by forcing a network drop on a device.
- ✅ **R-A — Rezdy create-loadsheet seat-fill fallback** — DONE v24.13 (real occupancy set
  replaces the dead `seatOf['__'+n]` guard; verified the old code dropped a pax, new seats all).
- **L-A / L-B — leave-day counts** computed live (currently frozen at submit / pre-roster-load).
- **L-C, R-B, roster save-guard leaks, notification recipient gating** — still open (§3).
The three realtime ones (A2–A4) were implemented together but each still needs runtime testing
on a real device — verify one at a time on the `test` branch before production.

### New since v24.04: Pickup-location master list (v24.12)
Editable list under Operations ▸ Pickups ▸ **📍 Locations** (name · address · minutes-before-
departure). State `S._rzPickupLocs` → `ts_settings` key `rz_pickup_locs` (cache `ts_rz_pickup_locs`),
live-synced. Seeded from `_RZ_PICKUP_LOC_SEED` (114 rows imported from the Rezdy pickup list);
first device to open the editor writes the seed to the cloud. NOT yet wired into the live driver/
booking pickup cards — a booking's pickup is still the free-text `it.pickup` string; joining the
two (address + map link + auto pickup-time from minutes-prior) is the obvious next step.

Rezdy API ideas (`REZDY_API_REFERENCE.md`) — all would extend the read-only `rezdy-sync` edge fn,
key stays server-side: seats-remaining readout (`GET /availability`); push captured weights back
(`PUT /bookings/{order}`); cancel from the FMS; manual booking → real Rezdy booking. NOTE: the API
**cannot** reschedule/move a booking's date or product.

## Reference docs in the repo
- `CLAUDE.md` — architecture, standing rules, data model, current state (auto-loaded each chat).
- `ARCHITECTURE_REVIEW_v24.04.md` — latest full bug-sweep + backlog + security posture.
- `REZDY_API_REFERENCE.md` — what the Rezdy API can/can't do (availability/edit/cancel; no move).
- `auth_*.sql` — the RLS / per-role policy migrations (Andrew runs these in Supabase SQL editor).

## Deploy
Netlify: branch `test` → test--testtruesouth.netlify.app; branch `main` → truesouth.netlify.app.
Andrew commits to whichever branch is checked out and merges/pushes himself.
