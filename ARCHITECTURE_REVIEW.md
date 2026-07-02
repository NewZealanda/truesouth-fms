# Architecture Review — TrueSouth FMS v29.43 (nightly sweep, 3 Jul 2026)

First full sweep since **v28.90**; covers the **v28.91 → v29.42** cycle. That cycle's headline
work is the **bespoke booking platform** (Phases 0–1): native bookings store (`modules/platform.js`
/ `ts_native_bookings`), availability engine + session holds (`modules/availability.js` /
`ts_session_holds`), product catalog with seasonal prices + summer/winter timetables
(`ts_products`, Settings ▸ Operations ▸ Products), the `platform-book` edge function (the public
funnel's only door), and the standalone public booking page **book.html** — v29.41 wired true
Rezdy live-seat availability into it and v29.42 polished the product cards. Around it: roster
Day|Week|Month views + iPhone fits (v29.32–35), Records browse-grid Tab flow + landings-by-location
(v29.33/36), calendar day-step scroll hold + dimmed-snapshot loading (v29.37–38), per-aircraft
maintenance log notes (v29.39), and the Declared-vs-Loadsheet weights stats panel (v29.40).

## Scope & method
- Recurring classes checked: per-seat 7-map desync, mutate-without-broadcast, W&B/NaN guards, XSS
  (booking/customer/user text into innerHTML), date/UTC off-by-one, duplicate top-level
  declarations, focus-clobbering renders, permission gating.
- Focus areas read in full: `book.html`, `supabase/functions/platform-book/index.ts`,
  `modules/platform.js`, `modules/availability.js` (the public-facing layer — highest stakes),
  plus targeted reads of the v29.32–v29.40 change sites (`admin.js` statLoadDeclared,
  `maintenance.js` per-tail notes, `rezdy_b/c.js` calendar snapshot, `shell.js` scroll carry,
  `roster.js` views, `flightrecord.js` browse-grid edit) and re-verification of all five
  loadsheet per-seat move/swap handlers in `admin.js`.
- Tests: `python3 build.py` → clean, no duplicate-declaration warnings; inline `<script>` blocks
  (4 in index.html + 1 in book.html) `node --check` → **0 errors**; `index.html` rebuilt at
  **27,927 lines / 3,752 KB**, `APP_VER='v29.43'`. (No live checks this run — browser tools were
  unavailable in the session; nothing in the changes touches boot/login paths.)

## Bugs found & fixed (this sweep → v29.43) — all in book.html (public page)

1. **[Med · race/leak] `placeHold()` raced the release against the new hold.** The old hold's
   `release` and the new `hold` were fired concurrently, so (a) with tight seats the new hold
   could be spuriously rejected ("Not enough seats") because the not-yet-released old hold still
   counted against availability, and (b) two rapid changes (e.g. clicking +pax twice) could let a
   STALE hold response land after a newer one and overwrite `HOLD` — the newer hold's id was then
   lost and never released, blocking seats for other customers for 15 min. Fixed: release is now
   awaited before the hold is requested, and a `HOLDSEQ` token ensures only the latest response
   wins — a superseded response releases its own hold instead of leaking it.
2. **[Low · injection-hardening] Product id / departure time interpolated into inline `onclick`
   JS strings with HTML-escaping only.** `esc()` doesn't escape single quotes, so a `'` in a
   product id would break out of `pickProd('…')` (same latent class as the v28.90 wx-modal fix;
   practical risk ~nil — ids are admin-set codes, times are server HH:MM). Added `jsq()` (JS-string
   escape) applied inside `esc()` at both sites.
3. **[Low · UX/validation] Adults+children could exceed the 13-seat combined cabin cap
   client-side** (each capped at 13 individually), only failing at submit with the server's
   "Invalid passenger count". `cnt()` now clamps the combined a+c at 13 (matching the edge fn's
   `MAX_PAX`), so the limit is enforced where the customer sets it.

## Verified clean (no changes needed)

- **platform-book edge function** — validates date (`DATE_RE`, ≥ NZ today), dep (`DEP_RE`),
  product existence + timetable membership server-side; pax counts clamped 1..13 combined, weights
  clamped 0..250, all strings length-clamped via `clean()`; hold TTL enforced server-side on every
  read (`expires_at` check); seat check re-runs at book time excluding only the caller's own hold;
  hold ids carry 8 random UUID chars (not guessable); errors return generic messages, no secret
  leakage; Rezdy-unreachable falls back to the conservative fleet guard. Seasonal `priceFor` /
  winter `timesFor` use plain ISO-string comparison (no UTC parse) — consistent with the client's
  `tierFor` and platform.js's `platformPriceFor`/`platformIsWinter` (same string compares, same
  wrap-over-year-end window logic). `book.html`'s `todayNZ()` uses `Pacific/Auckland` correctly.
- **book.html rendering** — every dynamic value (`p.name`, `p.description`, order, dates, times,
  pax names/weights, ERR) is `esc()`-escaped at the leaf; prices go through `money()` (numeric).
  `pagehide` beacon releases an abandoned hold.
- **platform.js / availability.js** — Products editor sanitises inline-handler ids
  (`replace(/[^A-Z0-9_-]/gi,'')`) and escapes all field values; product writes propagate via the
  `ts_products` realtime subscription (no missing broadcast); `_availCompute` clamps ≥0 with
  null-safe rezdy cap; holds expire client-side on read. No duplicate top-level names introduced.
- **Declared-vs-Loadsheet stats (v29.40, admin.js)** — passenger names `esc()`-escaped in the
  top-5 table; `_dwCmpLoading` resets on the error path; zero/infant/co-pilot seats excluded as
  documented; per-range cache keyed `from|to`.
- **Per-aircraft maintenance notes (v29.39)** — `<ac>_comment` values escaped at both render
  sites (log input + search results); writes persist via `saveMaintenance()` (existing broadcast
  path).
- **Calendar snapshot + scroll carry (v29.37–38)** — snapshot rendered `pointer-events:none` (no
  live stale handlers), dropped by all three sub-views on real render; `S._winPendY` cleared on
  view change and once the grid is on screen (no scroll yank); loading pill escapes the date.
- **Roster views (v29.32–35)** — all date math is local `Date`+`setDate` with `_rIso` formatting;
  view choice is deliberately per-device (`ts_roster_view`); leave loader always fetches ≥31 days.
- **Records browse grid (v29.36)** — `frEditField` persists each edit via `_frSave`; the in-place
  Flt-h update only touches the unfocused computed cell, falls back to `safeRender` off-grid;
  all values `_frEsc`-escaped.
- **Loadsheet per-seat 7-maps** — re-verified: all five handlers (`tapFormSeat`, `lsDropOnSeat`,
  `lsDropOnUnalloc`, `tapDropUnallocated`, `dropFormSeat`) move/swap all 7 maps together and call
  `autoSaveLS()`.
- **Duplicate top-level declarations** — build.py scan: none. **Date/UTC** — no new bare
  `toISOString().slice(0,10)` sites; remaining matches are comments/guarded fallbacks.

## Open / deferred (documented, NOT changed)

- **platform-book `hold` doesn't take a `replaceId`** — the client now sequences release→hold, but
  an edge-fn-side atomic replace (exclude-and-delete the old hold in the hold action) would remove
  the remaining tiny window and one round-trip. Needs a redeploy; queue with the next edge-fn change.
- **Rezdy-down fallback can oversell a Rezdy-controlled slot** (documented in the edge fn header):
  when Rezdy is unreachable the fleet guard can't see Rezdy-channel bookings made in the outage.
  Accepted coexistence risk per the roadmap's go-live checklist.
- **`book`/`hold` accept any dep when a product has NO configured times** (`times.length &&` guard)
  — deliberate fail-soft, but worth revisiting before go-live: an empty timetable + Rezdy outage
  means any HH:MM books against the fleet guard.
- **Infant count is uncapped relative to adults** (client and server) — 1 adult + 13 infants would
  book; desk follows up. Cosmetic.
- **Carried from earlier sweeps:** 5 ground/ops modules + `ts_wx_links` still poll/reload-only
  (not realtime-subscribed); `saveAircraftDraft` writes `ts_aircraft` without broadcast; flight
  records not realtime-synced; server gating by permission not row-ownership; no CSP; RLS
  migrations need confirming applied live; leave stamp/unstamp fidelity cosmetic.

## Security posture
The public booking layer is in good shape: all customer-visible rendering escapes at the leaf, the
edge function is the only writer (anon has no table writes), inputs are validated/clamped
server-side, and this sweep closed the last raw-interpolation sites in book.html plus the hold-leak
race. Standing items: confirm RLS migrations applied live; the go-live checklist in
PLATFORM_ROADMAP.md (Rezdy-cap coexistence guard) still applies before pointing real traffic at
book.html. ⚠️ **The book.html fixes do NOT need an edge-fn redeploy** (client-only).

## Git
Branch `main`, HEAD `ee11641` (v29.42) at sweep start; working tree matched HEAD. NOTE: the git
INDEX held a stale staged snapshot (inverse of v29.41–42, likely GitHub Desktop leftovers) and a
zero-byte `.git/index.lock` appeared during the sweep's read-only `git diff` (sandbox couldn't
unlink it) — **not deleted, per rule**; the temp-index commit trick sidesteps both. See
MORNING_REPORT.md for the commit result.

## Previous sweeps (one line each)
- v28.90 (2 Jul): wx-modal onclick order-escaping; wx/self-drive/pickup + leave-cancel layers clean; commit blocked by lock.
- v28.55: focus-clobber ids on opsnotices/visitors search; escaping on upload URLs/photos; commit blocked by lock.
- v28.12: printed-loadsheet pax/PIC name XSS escaped; committed 5023e5b.
- v27.79: loadsheet lsAc change-aircraft now persists+broadcasts; commit blocked by lock.
