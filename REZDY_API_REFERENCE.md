# Rezdy API — Capability Reference (for TrueSouth FMS)

Quick reference for what the Rezdy API can/can't do, so we don't have to re-research when we
build against it. TrueSouth is the **operator**, so the **Supplier API** (the one tied to our
`REZDY_API_KEY`) is the relevant spec.

Base URL: `https://api.rezdy.com/v1` (staging: `https://api.rezdy-staging.com/v1`)
Auth: `?apiKey=...` — **server-side only** (lives in the `rezdy-sync` edge function env, never
in the public bundle).

## Current integration state (as of v24.07)
- **Read-only.** `supabase/functions/rezdy-sync/index.ts` does ONE thing: `GET` search of a
  day's bookings by tour start time, normalises them (pax names/weights, extras, balance,
  source/agent, A/C/i quantities), caches in `ts_rezdy_bookings`, returns them.
- No write calls of any kind yet. Adding any capability below = new branch(es) in that edge
  function (keep the key server-side).

## What the Supplier API supports

| Capability | Verdict | Endpoint | Notes |
|---|---|---|---|
| **Read availability** | ✅ Yes | `GET /availability` | params: `productCode` (repeatable), `startTimeLocal`/`endTimeLocal` (or `startTime`/`endTime` ISO8601). Returns `sessions[]` with `seats`, `seatsAvailable`, `priceOptions[]`. |
| **Manage availability/seats** | ✅ Yes | `POST` / `PUT` / `DELETE /availability` | create / update (single + batch) / delete scheduled sessions & their seat capacity. |
| **Create booking** | ✅ Yes | `POST /bookings` | body: `customer`, `items[]` (productCode, startTimeLocal, quantities[]), `payments[]`. |
| **Edit booking (limited)** | ⚠️ Partial | `PUT /bookings/{orderNumber}` | can amend **status, customer details, participant details** (names, weights, pickup location, booking fields, comments). |
| **Move / reschedule booking** | ❌ No | — | **Not supported.** Spec: *"Updating bookings is limited to status, customer & participant details. Updating products or dates is not supported."* Cannot change tour date/time or product via API. |
| **Cancel booking** | ✅ Yes | `DELETE /bookings/{orderNumber}` | empty body. `?sendNotifications=false` suppresses the customer email. |

### The one hard limitation
You **cannot reschedule** (change date/time) or **swap the product** of an existing booking via
the API. The only API-level "move" is cancel + recreate on the new session — which loses the
original order number and has refund/recharge implications, so it's not a true reschedule.
Date/time moves still happen in the Rezdy dashboard.

## Ideas this unlocks (when we get to it)
- **Seats-remaining readout** on Bookings/Seatmap — `GET /availability` for the day's products,
  show `seatsAvailable` per departure (capacity vs sold).
- **Push weights/check-in back to Rezdy** — `PUT /bookings/{orderNumber}` to write the
  participant weights/details we capture at check-in back onto the Rezdy booking.
- **Cancel from the FMS** — `DELETE /bookings/{orderNumber}` (with the notify toggle).
- **Manual booking → real Rezdy booking** — `POST /bookings` so a walk-in created in the FMS
  becomes a genuine Rezdy order instead of a local-only `_manual` row.

## Other API flavours (not ours, for context)
- **Agent / Reseller APIs**: Reseller can't update bookings at all; Agent has the same
  status/customer/participant-only update limit. RezdyConnect is the supplier-channel-manager
  spec.
- Support: api-support@rezdy.com

## Sources
- Supplier API: https://developers.rezdy.com/rezdyapi/index-supplier.html
- Agent API: https://developers.rezdy.com/rezdyapi/index-agent.html
- RezdyConnect: https://developers.rezdy.com/rezdyconnect/index.html
- Webhooks: https://developers.rezdy.com/rezdywebhooks/index.html
