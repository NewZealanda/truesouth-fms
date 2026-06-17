// Supabase Edge Function: rezdy-sync
// Deploy: supabase functions deploy rezdy-sync   (or paste in the dashboard editor)
// Env (auto): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ; Secret: REZDY_API_KEY
//
// POST {date:'YYYY-MM-DD', store?:true} -> fetches that day's Rezdy bookings (by tour
// start time), normalises them, caches them in ts_rezdy_bookings, and returns them.
// The Rezdy API key never leaves the server.
//
// NOTE: Rezdy requires ISO-8601 timestamps (yyyy-MM-ddTHH:mm:ssZ) for
// minTourStartTime / maxTourStartTime — a space-separated datetime is rejected
// with errorCode 3 "Invalid Date format".

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

function fieldsToObj(fields: any[]): Record<string, string> {
  const o: Record<string, string> = {}
  ;(fields || []).forEach((f: any) => { if (f && f.label) o[f.label] = f.value })
  return o
}

function normalize(b: any) {
  const c = b.customer || {}
  const items = (b.items || []).map((it: any) => ({
    product: it.productName || it.productCode || "",
    startTimeLocal: it.startTimeLocal || it.startTime || "",
    quantity: it.totalQuantity || (it.quantities || []).reduce((s: number, q: any) => s + (q.value || 0), 0),
    pickup: it.pickupLocation ? (it.pickupLocation.locationName || it.pickupLocation.additionalInstructions || "") : "",
    pickupLat: it.pickupLocation?.latitude ?? null,
    pickupLng: it.pickupLocation?.longitude ?? null,
    participants: (it.participants || []).map((p: any) => fieldsToObj(p.fields)),
  }))
  return {
    id: String(b.orderNumber || b.id || ""),
    orderNumber: b.orderNumber || "",
    status: b.status || b.orderStatus || "",
    customerName: [c.firstName, c.lastName].filter(Boolean).join(" "),
    phone: c.phone || c.mobile || "",
    email: c.email || "",
    comments: b.comments || "",
    source: b.source || (b.agent && b.agent.companyName) || "",
    totalPax: items.reduce((s: number, i: any) => s + (i.quantity || 0), 0),
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

  const minT = `${date}T00:00:00Z`
  const maxT = `${date}T23:59:59Z`

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

  const norm = all.map(normalize).filter((n) => n.id)

  if (body.store !== false) {
    for (const n of norm) {
      try {
        await admin.from("ts_rezdy_bookings").upsert(
          { id: n.id, order_number: n.orderNumber, tour_date: date, data: n, updated_at: new Date().toISOString() },
          { onConflict: "id" },
        )
      } catch (_) { /* keep going */ }
    }
  }

  return json({ ok: true, date, count: norm.length, bookings: norm })
})
