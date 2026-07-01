// Supabase Edge Function: platform-book  (Phase 1 — direct bookings)
// Deploy: supabase functions deploy platform-book --no-verify-jwt
// Env vars needed: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// The public booking page (book.html) has NO authenticated user, and anon has no
// write access to ts_native_bookings / ts_session_holds — so this function is the
// public funnel's only door. It (service role) computes availability, places seat
// holds, and creates native bookings in the SAME canonical shape the desk's "New
// booking" writes, so the whole FMS (calendar / seatmap / loadsheet / transport)
// picks them up with zero rendering changes.
//
// Actions (POST JSON {action, ...}):
//   catalog                      → active products (code, name, prices, times, …)
//   availability {date}          → per-departure sellable seats for that date
//   hold {date, dep, seats}      → 15-min soft-lock; returns holdId
//   release {holdId}             → drop a hold (customer backed out)
//   book {date, dep, product, holdId?, customer{name,phone,email},
//         adults[{name,weight}], children[{name,weight}], infants[{name}],
//         note?}                 → validates + inserts ts_native_bookings, returns order
//
// ⚠️ COEXISTENCE NOTE: the in-app availability engine caps sellable by Rezdy's live
// reported availability; this function can't see that number, so it guards with
// FLEET capacity only (fleet seats − committed − holds). Before pointing real
// traffic at book.html, either (a) wire the Rezdy availability check in here via
// the rezdy-sync function, or (b) only activate products/slots Rezdy doesn't sell.
//
// Payments: NOT wired yet. Bookings are created CONFIRMED with balanceDue = total
// ("pay on arrival / we'll be in touch"). The payment step is pluggable — see
// createPaymentSession() below for where the Windcave Hosted Payment Page call goes.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SB_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SB_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const supabase = createClient(SB_URL, SB_SERVICE_KEY)

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const J = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } })

// NZ-local calendar date (the app's tour_date convention).
function nzToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Pacific/Auckland" })
}
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const DEP_RE = /^\d{2}:\d{2}$/
const MAX_PAX = 13 // largest cabin (C208B)

// ── Catalog ──────────────────────────────────────────────────────────────────
async function getProducts() {
  const { data } = await supabase.from("ts_products").select("*").eq("active", true)
  return data ?? []
}

// ── Availability (fleet-capacity guard; see coexistence note above) ─────────
// Fleet seats: the scheduling config's per-tail caps, skipping tails marked down.
async function fleetSeats(): Promise<number> {
  const { data } = await supabase.from("ts_settings").select("value").eq("key", "scheduling").maybeSingle()
  let v: any = data?.value
  if (typeof v === "string") { try { v = JSON.parse(v) } catch { v = null } }
  const tails = v?.tails ?? {}
  let n = 0
  for (const ac of Object.keys(tails)) {
    const t = tails[ac] ?? {}
    if (t.status === "down") continue
    n += Math.max(0, parseInt(t.cap, 10) || 0)
  }
  if (n > 0) return n
  // Config missing — conservative fallback so we can never oversell an unknown fleet.
  return 7
}

// Committed pax (adults+children; infants are lap) per departure "HH:MM" for a date,
// across BOTH stores (Rezdy-synced + native), skipping cancelled bookings.
async function committedBySlot(date: string): Promise<Record<string, number>> {
  const bySlot: Record<string, number> = {}
  for (const table of ["ts_rezdy_bookings", "ts_native_bookings"]) {
    const { data } = await supabase.from(table).select("data,status").eq("tour_date", date)
    for (const row of data ?? []) {
      const b: any = row?.data ?? {}
      const status = String(row?.status ?? b?.status ?? "").toUpperCase()
      if (status.includes("CANCEL") || status.includes("ABANDONED")) continue
      for (const it of b.items ?? []) {
        const m = /[T ](\d{2}):(\d{2})/.exec(String(it?.startTimeLocal ?? ""))
        if (!m) continue
        const slot = `${m[1]}:${m[2]}`
        let pax = 0
        for (const q of it?.quantities ?? []) {
          const label = String(q?.label ?? "").toLowerCase()
          if (label.includes("infant")) continue
          pax += parseInt(q?.value, 10) || 0
        }
        if (!pax) pax = parseInt(it?.quantity, 10) || 0
        bySlot[slot] = (bySlot[slot] ?? 0) + pax
      }
    }
  }
  return bySlot
}

// Active (unexpired) held seats per departure, optionally excluding one hold id.
async function heldBySlot(date: string, excludeId?: string): Promise<Record<string, number>> {
  const bySlot: Record<string, number> = {}
  const { data } = await supabase.from("ts_session_holds").select("*").eq("tour_date", date)
  const now = Date.now()
  for (const h of data ?? []) {
    if (excludeId && h.id === excludeId) continue
    if (new Date(h.expires_at).getTime() <= now) continue
    const dep = String(h.dep ?? "")
    const slot = dep.includes(":") ? dep : `${dep.slice(0, 2)}:${dep.slice(2)}` // stored HHMM or HH:MM
    bySlot[slot] = (bySlot[slot] ?? 0) + (parseInt(h.seats, 10) || 0)
  }
  return bySlot
}

async function sellableFor(date: string, dep: string, excludeHoldId?: string): Promise<number> {
  const [fleet, committed, held] = await Promise.all([
    fleetSeats(), committedBySlot(date), heldBySlot(date, excludeHoldId),
  ])
  return Math.max(0, fleet - (committed[dep] ?? 0) - (held[dep] ?? 0))
}

// ── Payments (pluggable; Windcave target) ────────────────────────────────────
// When Windcave goes live: POST to the Windcave REST sessions endpoint with the
// account credentials (env vars WINDCAVE_USER / WINDCAVE_KEY), amount + order ref,
// and return the hosted-payment-page URL for book.html to redirect to. A second
// action ("payment-callback" or a dedicated webhook fn) then flips the booking's
// paid/balance fields on the provider's notification. Never handle card data here.
function createPaymentSession(_order: string, _amountNzd: number): { provider: string; url: string | null } {
  return { provider: "windcave", url: null } // not configured yet → pay-later flow
}

// ── Handler ──────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  if (req.method !== "POST") return J({ ok: false, error: "POST only" }, 405)

  let body: any
  try { body = await req.json() } catch { return J({ ok: false, error: "Bad JSON" }, 400) }
  const action = String(body?.action ?? "")

  try {
    // ── catalog ──
    if (action === "catalog") {
      const products = (await getProducts()).map((p: any) => ({
        code: p.id, name: p.name, description: p.description ?? "",
        durationMin: p.duration_min, times: p.times ?? [],
        priceAdult: p.price_adult, priceChild: p.price_child, priceInfant: p.price_infant ?? 0,
        sort: p.sort ?? 100,
      })).sort((a: any, b: any) => (a.sort - b.sort) || String(a.code).localeCompare(b.code))
      return J({ ok: true, products })
    }

    // ── availability ──
    if (action === "availability") {
      const date = String(body?.date ?? "")
      if (!DATE_RE.test(date) || date < nzToday()) return J({ ok: false, error: "Invalid date" }, 400)
      const [fleet, committed, held] = await Promise.all([fleetSeats(), committedBySlot(date), heldBySlot(date)])
      const slots: Record<string, number> = {}
      const deps = new Set<string>([...Object.keys(committed), ...Object.keys(held)])
      for (const p of await getProducts()) for (const t of (p.times ?? [])) deps.add(t)
      for (const dep of deps) {
        if (!DEP_RE.test(dep)) continue
        slots[dep] = Math.max(0, fleet - (committed[dep] ?? 0) - (held[dep] ?? 0))
      }
      return J({ ok: true, date, fleetSeats: fleet, slots })
    }

    // ── hold ──
    if (action === "hold") {
      const date = String(body?.date ?? ""), dep = String(body?.dep ?? "")
      const seats = Math.min(MAX_PAX, Math.max(1, parseInt(body?.seats, 10) || 1))
      if (!DATE_RE.test(date) || date < nzToday() || !DEP_RE.test(dep)) return J({ ok: false, error: "Invalid date/departure" }, 400)
      if (await sellableFor(date, dep) < seats) return J({ ok: false, error: "Not enough seats" }, 409)
      const id = `${date}|${dep.replace(":", "")}|w${crypto.randomUUID().slice(0, 8)}`
      const expires_at = new Date(Date.now() + 15 * 60000).toISOString()
      const { error } = await supabase.from("ts_session_holds").upsert([{
        id, tour_date: date, dep: dep.replace(":", ""), dest: "", seats, expires_at, created_by: "web",
      }])
      if (error) return J({ ok: false, error: "Hold failed" }, 500)
      return J({ ok: true, holdId: id, expiresAt: expires_at })
    }

    // ── release ──
    if (action === "release") {
      const id = String(body?.holdId ?? "")
      if (id) await supabase.from("ts_session_holds").delete().eq("id", id)
      return J({ ok: true })
    }

    // ── book ──
    if (action === "book") {
      const date = String(body?.date ?? ""), dep = String(body?.dep ?? ""), code = String(body?.product ?? "").toUpperCase()
      const holdId = body?.holdId ? String(body.holdId) : undefined
      if (!DATE_RE.test(date) || date < nzToday() || !DEP_RE.test(dep)) return J({ ok: false, error: "Invalid date/departure" }, 400)

      const product = (await getProducts()).find((p: any) => String(p.id).toUpperCase() === code)
      if (!product) return J({ ok: false, error: "Unknown product" }, 400)
      const times: string[] = product.times ?? []
      if (times.length && !times.includes(dep)) return J({ ok: false, error: "Departure not offered" }, 400)

      const clean = (s: unknown, max: number) => String(s ?? "").trim().slice(0, max)
      const cust = body?.customer ?? {}
      const name = clean(cust.name, 120)
      if (!name) return J({ ok: false, error: "Name required" }, 400)
      const paxIn = (arr: unknown, withWt: boolean) => (Array.isArray(arr) ? arr : []).slice(0, MAX_PAX).map((p: any) => ({
        name: clean(p?.name, 80),
        weight: withWt ? String(Math.max(0, Math.min(250, parseFloat(p?.weight) || 0)) || "") : "",
      }))
      const adults = paxIn(body?.adults, true), children = paxIn(body?.children, true), infants = paxIn(body?.infants, false)
      const a = adults.length, c = children.length, i = infants.length
      if (a + c < 1 || a + c > MAX_PAX) return J({ ok: false, error: "Invalid passenger count" }, 400)

      // Seat check — the customer's own hold covers their seats, so exclude it from held.
      const avail = await sellableFor(date, dep, holdId)
      if (avail < a + c) return J({ ok: false, error: "Not enough seats left" }, 409)

      // Price from the catalog (null price = POA → 0 owing, desk follows up).
      const pa = product.price_adult, pc = product.price_child, pi = product.price_infant ?? 0
      const poa = (a > 0 && pa == null) || (c > 0 && pc == null)
      const total = poa ? 0 : Math.round(((a * (pa ?? 0)) + (c * (pc ?? 0)) + (i * (pi ?? 0))) * 100) / 100

      // Canonical booking — SAME shape as the desk's "New booking" (rezdyNewBookingSave).
      const order = "TS-" + Date.now().toString(36).toUpperCase().slice(-7) + Math.floor(Math.random() * 36).toString(36).toUpperCase()
      const quantities: { label: string; value: number }[] = []
      if (a) quantities.push({ label: "Adult", value: a })
      if (c) quantities.push({ label: "Child", value: c })
      if (i) quantities.push({ label: "Infant", value: i })
      const participants = [
        ...adults.map((p) => ({ name: p.name, weight: p.weight, age: "" })),
        ...children.map((p) => ({ name: p.name, weight: p.weight, age: "Child" })),
        ...infants.map((p) => ({ name: p.name, weight: "", age: "Infant" })),
      ]
      const booking = {
        id: order, orderNumber: order, status: "CONFIRMED",
        customerName: name, phone: clean(cust.phone, 40), email: clean(cust.email, 120),
        comments: clean(body?.note, 500), fields: {}, source: "Web",
        totalPax: a + c + i, totalAmount: total, totalPaid: 0, balanceDue: total, currency: "NZD",
        items: [{
          product: code, startTimeLocal: `${date}T${dep}:00`, quantity: a + c + i,
          quantities, pickup: "", pickupTime: "", extras: [], participants,
        }],
        _tourDate: date, _native: true, _poa: poa || undefined,
      }
      const { error } = await supabase.from("ts_native_bookings").upsert([{
        id: `${order}__${date}`, order_number: order, tour_date: date,
        source: "web", status: "CONFIRMED", data: booking, created_by: "web",
        updated_at: new Date().toISOString(),
      }])
      if (error) return J({ ok: false, error: "Could not save the booking — please call us" }, 500)
      if (holdId) await supabase.from("ts_session_holds").delete().eq("id", holdId)

      const pay = createPaymentSession(order, total)
      return J({ ok: true, order, total, poa, payment: pay })
    }

    return J({ ok: false, error: "Unknown action" }, 400)
  } catch (_e) {
    return J({ ok: false, error: "Server error" }, 500)
  }
})
