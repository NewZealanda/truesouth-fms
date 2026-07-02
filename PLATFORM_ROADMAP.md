# TrueSouth Booking Platform — Roadmap

Building a bespoke booking platform to eventually reduce/replace the Rezdy dependency.
Strategy: **coexist with Rezdy, then cut over channel by channel.** Nothing gets ripped out;
each phase is additive and reversible.

## Why this is achievable

The FMS already contains the hard, bespoke-to-us half of a booking platform: seatmap +
passenger moving, weight & balance / loadsheets, the cost-aware calendar allocator (incl.
oversized-booking splitting), live seat availability, roster, and Supabase Auth with roles + RLS.
Replacing Rezdy is mostly about the **front of the funnel** (checkout, payments, distribution),
not the operational back end.

## What Rezdy actually bundles (so we don't under-scope)

1. Customer booking widget + checkout
2. **Payment handling** (→ use a third-party provider; never hold card data)
3. **Distribution** — connections to OTAs/resellers (Viator, GetYourGuide, local DMCs) + agent
   net rates/commissions. This is Rezdy's most valuable piece and the hardest to replicate; plan
   to keep Rezdy for distribution even after building direct.
4. Availability / inventory engine

Items 1, 2 and 4 are very buildable on what we have. Item 3 is why we coexist rather than replace.

---

## Phases

### Phase 0 — Own the data  ← **in progress**
Make the app capable of holding bookings that don't exist in Rezdy, in our own store, while Rezdy
keeps syncing. No user-facing change yet.

- **`native_bookings.sql`** — new table `ts_native_bookings`, row shape mirrors `ts_rezdy_bookings`
  (one row per order × tour date, canonical booking object in a JSON `data` blob). RLS: all
  authenticated read; write = operations/desk/cx_manager/admin/superadmin. Added to the realtime
  publication. **Apply this in the Supabase SQL editor to switch the feature on.**
- **`modules/platform.js`** — the native store: `platformLoadBookings(date)`,
  `platformSaveBooking(booking)`, `platformDeleteBooking(order,date)`, `platformNewOrderNo()`, and
  `_rzMergeNativeBookings()`.
- **Read merge** — `rezdyLoadBookings()` now loads native bookings and merges them on top of the
  Rezdy rows (native wins on order-number clash). Fails soft: until the SQL is applied, this is a
  no-op and behaviour is identical.

Why a JSON blob and not fully-normalised tables yet? It keeps the read path (`_rzMapBookings` /
`_rzRow`) byte-for-byte identical, so Phase 0 carries zero risk to rendering. Normalised
`products` / `sessions` / `payments` tables arrive in Phase 0.5 / Phase 1 once we're writing
bookings natively and know the exact query patterns.

**Phase 0 follow-ups — status:**
- ✅ New desk bookings write to `ts_native_bookings` (`rezdyNewBookingSave` routes native-first,
  legacy pickup-blob only as fallback). Existing old manual bookings stay in their blobs (they
  age out with their dates — no migration needed).
- ✅ `ts_native_bookings` realtime-subscribed (+ reconnect backfill → `platformReloadBookingsLive`).
- ✅ Product catalog `ts_products` (v29.28) — see Phase 1 below.

### Phase 0.5 — Availability engine  ← **built (v29.26)**
One source of truth for "sellable seats on this departure right now", consolidating the seat math
that used to live in the bookings chips + the Rezdy availability table.
- **`modules/availability.js`** — `availForDep(date,dep)` / `availDay(date)` return
  `{fleetSeats, committed, fleetRemaining, rezdyReported, held, sellable}`.
  `sellable = max(0, min(fleetRemaining, rezdyReported) − held)` where
  `fleetRemaining = flyable fleet seats − committed pax (Rezdy + native bookings)`. Capping by
  Rezdy's live number is the coexistence guard against overselling a Rezdy-controlled channel.
  Pure core `_availCompute` is unit-tested.
- **Holds (soft-locks):** `ts_session_holds` table + `availHold(date,dep,seats,minutes)` /
  `availReleaseHold(id)` / `availLoadHolds(date)`. The engine subtracts active (unexpired) holds.
  No holds UI yet — the checkout (Phase 1) is what will place/release them; this is the plumbing.
- **Visible:** a collapsible "Sellable seats (availability engine)" panel on the Bookings page
  (fleet / booked / Rezdy cap / held / sellable per departure) so the desk can see + verify it.
- **Live:** `ts_session_holds` is realtime-subscribed (+ reconnect backfill) so held seats update
  across devices.
- **Apply `session_holds.sql`** in Supabase to switch holds on (the engine works without it — holds
  just read as 0 until the table exists).

Deliberately compute-on-demand (no materialised `ts_sessions` table to drift): the engine derives
from the live bookings + fleet + Rezdy availability + holds each call.

### Phase 1 — Direct bookings + payments  ← **foundations built (v29.28)**
Customer-facing booking flow → availability engine → `ts_native_bookings` → third-party payment.
Highest-value, lowest-risk win: every direct sale skips Rezdy's fee and we own the funnel.

**Built in v29.28 (pay-later skeleton, not yet customer-facing):**
- **`ts_products` catalog** (`products.sql`) — one row per product: customer name, per-pax NZD
  prices, standard departure `times[]`, duration, description, `active` (public visibility, all OFF
  by default). Editor at **Settings ▸ Operations ▸ 🛍 Products** (admin+): seed-from-built-in-list
  button, inline editing, add/delete. Anon RLS reads ACTIVE rows only. Realtime-subscribed.
  Loaders in `modules/platform.js` (`platformLoadProducts` / `platformProducts` / `platformProduct`).
- **`platform-book` edge function** (`supabase/functions/platform-book/`) — the public funnel's
  only door (service role; anon can't write the tables). Actions: `catalog`, `availability`
  (fleet seats − committed(both stores) − active holds, per HH:MM slot), `hold`/`release`
  (15-min soft-locks in `ts_session_holds`), `book` (validates product/date/slot/pax + seat check,
  prices from the catalog, inserts the canonical booking shape → whole FMS picks it up unchanged).
  Deploy: `supabase functions deploy platform-book --no-verify-jwt`.
- **`book.html`** — standalone public page (wx.html pattern): product cards → date + live
  seat-count slot picker (places a hold) → pax names/weights → contact → request booking →
  confirmation with TS- order number. Pay-later copy; hold released on page-leave via sendBeacon.
- **Payments (Windcave target, pluggable):** `createPaymentSession()` in the edge fn is the seam —
  when Windcave goes live it returns the Hosted Payment Page URL (env `WINDCAVE_USER`/`WINDCAVE_KEY`)
  and book.html already redirects to `payment.url` if present. Card data never touches our servers.
  Provider webhook → `payments` + flip booking paid is the remaining piece.

**Go-live checklist (before linking book.html anywhere):**
1. Apply `products.sql`; deploy `platform-book` with `--no-verify-jwt`.
2. Seed + price products in Settings ▸ Operations ▸ Products; set standard `times`; tick `active`
   only on what should sell direct.
3. ⚠️ Coexistence: the edge fn guards with FLEET capacity only — it can't see Rezdy's live
   availability number. Either wire the Rezdy cap into `platform-book` (via rezdy-sync) or only
   activate products/slots Rezdy doesn't sell, else a direct sale could oversell a Rezdy channel.
4. Wire Windcave (or launch pay-later deliberately).

**Pricing architecture — DESIGN CONSTRAINT (Andrew, Jul 2026):** the end goal is **dynamic /
live pricing** — a floating price that moves up and down with availability (and potentially
lead time / demand). Seasonal pricing (v29.29: `next_from` + next-season columns, resolved by
flight date) is the current model. To keep the dynamic option open, ALL price resolution must
stay funnelled through the single per-(product, flight-date) resolver seam:
`platformPriceFor()` (app), `priceFor()` (platform-book edge fn), `tierFor()` (book.html
display; the edge fn's number is authoritative at booking time). Dynamic pricing later =
extend the edge-fn resolver with an availability input (the engine already computes
sellable-per-departure) + a pricing-rules table. NEVER hardcode a price anywhere else, and
never trust a client-computed price when booking.

### Phase 2 — Agent / B2B portal
Agent login (a new role on the auth we already have) with live availability, net/commission rates,
book-on-account or card, and voucher/confirmation PDFs.

### Phase 3 — Distribution / partner API
A partner API or channel connection for OTAs. Decide here whether to keep Rezdy purely as a
distribution channel or replace it.

### Phase 4 — Cutover
Decommission Rezdy channel by channel once each is covered by the above.

---

## Data model (target)

Mirrors the current canonical booking object. Phase 0 uses the `data` JSON blob; later phases
normalise where querying/reporting needs it.

- **bookings** — id, order_number, tour_date, status, source, customer (name/phone/email),
  totals (amount/paid/balance), currency, comments, fields{}, is_manual/native.
- **items** — booking_id, product_code, product_name, start_time_local, quantity, pickup, seq.
- **passengers** — item_id, name, weight, age/type, declared_weight, seq.
- **extras** — item_id, name, qty.
- **products** — code, name, dest short, airport, scenic/flyback flags, fuel/burn defaults.
- **sessions** — tour_date, product_code, start_time_local, seats_available (availability engine).
- **payments** — booking_id, provider, provider_ref, amount, status, created_at (Phase 1).

Load-bearing fields used everywhere: **orderNumber**, **items[0].product**,
**items[0].startTimeLocal**, and the passenger **quantities**/participants.

---

## Coexistence read path (Phase 0, live now)

```
rezdyLoadBookings(date)
  → sbF('ts_rezdy_bookings', tour_date=date)            # Rezdy-synced rows (edge fn + webhook)
  → _rzMapBookings(...)                                  # canonical shape
  → platformLoadBookings(date)                           # ts_native_bookings (in-house)  [fails soft]
  → _rzMergeNativeBookings(rezdy, native)                # native wins on order clash
  → S._rezdyBookings                                     # everything downstream unchanged
```
