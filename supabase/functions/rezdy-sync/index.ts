// Supabase Edge Function: rezdy-sync
// Deploy: supabase functions deploy rezdy-sync   (or paste in the dashboard editor)
// Env (auto): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ; Secret: REZDY_API_KEY
//
// POST {date:'YYYY-MM-DD', store?:true} -> fetch that day's Rezdy bookings (by tour
// start time), normalise (incl. per-passenger names+weights, extras/lunches, booking
// fields/special requirements, and outstanding balance), cache in ts_rezdy_bookings,
// and return them. The Rezdy API key never leaves the server.
//
// NOTE: Rezdy requires ISO-8601 timestamps (yyyy-MM-ddTHH:mm:ssZ) for
// minTourStartTime / maxTourStartTime — a space-separated datetime is rejected.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SB_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SB_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const REZDY_KEY = Deno.env.get("REZDY_API_KEY") ?? ""
const REZDY_BASE = "https://api.rezdy.com/v1"
const admin = createClient(SB_URL, SB_SERVICE_KEY)

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } })

const num = (x: any) => { const n = parseFloat(x); return isNaN(n) ? 0 : n }

function fieldsToObj(fields: any[]): Record<string, string> {
  const o: Record<string, string> = {}
  ;(fields || []).forEach((f: any) => { if (f && f.label) o[f.label] = f.value })
  return o
}

function participant(p: any) {
  const f = fieldsToObj(p.fields)
  const name = [f["First Name"] || f["Firstname"] || f["First name"] || "",
                f["Last Name"] || f["Lastname"] || f["Last name"] || ""].filter(Boolean).join(" ")
  const wKey = Object.keys(f).find((k) => /weight/i.test(k))
  const ageKey = Object.keys(f).find((k) => /child|infant|age/i.test(k))
  return { name, weight: wKey ? f[wKey] : "", age: ageKey ? f[ageKey] : "", fields: f }
}

function normalize(b: any) {
  const c = b.customer || {}
  const items = (b.items || []).map((it: any) => ({
    product: it.productName || it.productCode || "",
    startTimeLocal: it.startTimeLocal || it.startTime || "",
    quantity: it.totalQuantity || (it.quantities || []).reduce((s: number, q: any) => s + (q.value || 0), 0),
    // Keep the per-price-option breakdown (Adult / Child / Infant …) for the A/C/i counts.
    quantities: (it.quantities || []).map((q: any) => ({ label: q.optionLabel || q.label || q.priceOptionLabel || "", value: q.value || 0 })),
    pickup: it.pickupLocation ? (it.pickupLocation.locationName || it.pickupLocation.additionalInstructions || "") : "",
    pickupTime: it.pickupLocation?.pickupTime ?? "",
    extras: (it.extras || []).map((e: any) => ({ name: e.name || e.extraName || "", qty: e.quantity || 1 })),
    participants: (it.participants || []).map(participant),
  }))
  const totalAmount = num(b.totalAmount)
  const totalPaid = num(b.totalPaid)
  // Resolve the marketplace/agent NAME (Viator, GetYourGuide, …) ahead of Rezdy's source code.
  const _agentName = (typeof b.agent === "string" ? b.agent : (b.agent && b.agent.companyName))
    || (typeof b.reseller === "string" ? b.reseller : (b.reseller && b.reseller.companyName))
    || b.resellerName || b.marketplaceName || b.agentName || ""
  const _rawSource = b.source || ""
  const _resolvedSource = _agentName || _rawSource || ""
  return {
    id: String(b.orderNumber || b.id || ""),
    orderNumber: b.orderNumber || "",
    status: b.status || b.orderStatus || "",
    customerName: [c.firstName, c.lastName].filter(Boolean).join(" "),
    phone: c.phone || c.mobile || "",
    email: c.email || "",
    comments: b.comments || "",
    fields: fieldsToObj(b.fields), // booking-level custom fields (e.g. Special Requirements)
    source: _resolvedSource,
    totalPax: items.reduce((s: number, i: any) => s + (i.quantity || 0), 0),
    totalAmount, totalPaid,
    balanceDue: Math.max(0, totalAmount - totalPaid),
    currency: b.totalCurrency || b.currency || "",
    items,
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405)
  if (!REZDY_KEY) return json({ ok: false, error: "no_api_key", hint: "Set REZDY_API_KEY secret" }, 500)

  let body: { date?: string; store?: boolean }
  try { body = await req.json() } catch (_) { return json({ ok: false, error: "bad_request" }, 400) }
  const date = (body.date || "").trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ ok: false, error: "missing_or_bad_date" }, 400)

  // Rezdy's min/maxTourStartTime filter is in UTC, but our tour "day" is NZ-local
  // (UTC+12 NZST / +13 NZDT). A plain ${date}T00:00:00Z..23:59:59Z window therefore
  // straddles two NZ days and pulls the NEXT morning's tours into this date. Query a
  // day either side so nothing on the boundary is missed, then keep only the bookings
  // whose LOCAL start date actually matches `date` (DST-proof — no fixed offset).
  const shiftDay = (d: string, days: number) => {
    const t = new Date(d + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + days)
    return t.toISOString().slice(0, 10)
  }
  // The NZ day [00:00–24:00 local] in UTC is roughly [date-1 11:00Z .. date 12:00Z]
  // (NZST +12) or one hour earlier (NZDT +13). Query date-1 10:00Z .. date 14:00Z — a
  // ~28h window that fully contains the NZ day with margin, much tighter than ±1 full day.
  const minT = `${shiftDay(date, -1)}T10:00:00Z`
  const maxT = `${date}T14:00:00Z`

  const all: any[] = []
  let offset = 0
  for (let page = 0; page < 20; page++) {
    const url = `${REZDY_BASE}/bookings?apiKey=${REZDY_KEY}` +
      `&minTourStartTime=${encodeURIComponent(minT)}` +
      `&maxTourStartTime=${encodeURIComponent(maxT)}` +
      `&limit=100&offset=${offset}`
    const r = await fetch(url)
    if (!r.ok) {
      const t = await r.text().catch(() => "")
      return json({ ok: false, error: "rezdy_error", status: r.status, body: t.slice(0, 400) }, 502)
    }
    const j = await r.json().catch(() => ({}))
    const bookings = j.bookings || j.data || []
    all.push(...bookings)
    if (bookings.length < 100) break
    offset += 100
  }

  const normAll = all.map(normalize).filter((n) => n.id)

  // Keep only bookings whose LOCAL tour start date matches the requested NZ day.
  // startTimeLocal looks like "2026-06-21 09:30:00" or "2026-06-21T09:30:00".
  const localDate = (s: string) => String(s || "").slice(0, 10).replace(/\//g, "-")
  const norm = normAll.filter((n) =>
    (n.items || []).some((it: any) => localDate(it.startTimeLocal) === date)
  )

  if (body.store !== false) {
    // This sync is authoritative for the date: clear the date's existing rows first so any
    // previously mis-dated bookings (the off-by-one) are removed, then write the fresh set
    // in a SINGLE batched upsert (one round-trip) instead of one request per booking.
    try { await admin.from("ts_rezdy_bookings").delete().eq("tour_date", date) } catch (_) { /* keep going */ }
    if (norm.length) {
      const now = new Date().toISOString()
      const rows = norm.map((n) => ({ id: n.id, order_number: n.orderNumber, tour_date: date, data: n, updated_at: now }))
      try { await admin.from("ts_rezdy_bookings").upsert(rows, { onConflict: "id" }) } catch (_) { /* keep going */ }
    }
  }

  return json({ ok: true, date, count: norm.length, bookings: norm })
})
