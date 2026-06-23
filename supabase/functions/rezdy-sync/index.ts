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

// Robust NZ-local tour date for an order item. Prefer Rezdy's startTimeLocal (already local,
// e.g. "2026-12-26 09:00:00" / "2026-12-26T09:00:00"); but if that's missing or is actually a UTC
// stamp (ends with Z / carries a +HH:MM offset), convert via the Pacific/Auckland zone so a
// morning NZ tour isn't mis-dated onto the previous UTC day. Returns "YYYY-MM-DD" or "".
function itemLocalDate(it: any): string {
  const sl = String((it && it.startTimeLocal) || "")
  if (/^\d{4}-\d{2}-\d{2}/.test(sl) && !/[zZ]$|[+\-]\d{2}:?\d{2}$/.test(sl)) {
    return sl.slice(0, 10).replace(/\//g, "-")
  }
  const raw = sl || String((it && it.startTime) || "")
  if (!raw) return ""
  const d = new Date(raw)
  if (isNaN(d.getTime())) return raw.slice(0, 10).replace(/\//g, "-")
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit" }).format(d)
  } catch (_) { return raw.slice(0, 10).replace(/\//g, "-") }
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
    sourceCode: _rawSource, // raw Rezdy source (e.g. MARKETPLACE_PREF_RATE) — used to drop supplier-side duplicates
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

  // A booking belongs to this date if ANY of its order items starts on that NZ-local day.
  const norm = normAll.filter((n) =>
    (n.items || []).some((it: any) => itemLocalDate(it) === date)
  )

  if (body.store !== false) {
    // Store ONE row per (order, local item-date) so a MULTI-DATE order (items spread over several
    // days) appears under EVERY date it touches. Previously rows were keyed by order number alone
    // (one tour_date), so a multi-date order could only live under a single date and went missing
    // from the others — e.g. bookings absent on Boxing Day.
    //
    // Refresh is ORDER-scoped, not date-scoped: delete every existing row for the orders we just
    // fetched (across all dates) and rewrite them. We deliberately do NOT blanket-delete by
    // tour_date — that would wipe a multi-date order's rows for the OTHER dates this per-date sync
    // didn't return (the bug). A booking hard-deleted in Rezdy is re-cleaned whenever its order is
    // next returned by a sync; cancellations come back with status=CANCELLED (filtered client-side).
    const seen = [...new Set(norm.map((n) => n.orderNumber).filter(Boolean))]
    if (seen.length) {
      try { await admin.from("ts_rezdy_bookings").delete().in("order_number", seen) } catch (_) { /* keep going */ }
    }
    const now = new Date().toISOString()
    const rows: any[] = []
    for (const n of norm) {
      const ds = [...new Set((n.items || []).map((it: any) => itemLocalDate(it)).filter((d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d)))]
      if (!ds.includes(date)) ds.push(date) // safety net: always index under the synced date
      for (const d of ds) rows.push({ id: `${n.orderNumber}__${d}`, order_number: n.orderNumber, tour_date: d, data: n, updated_at: now })
    }
    if (rows.length) {
      try { await admin.from("ts_rezdy_bookings").upsert(rows, { onConflict: "id" }) } catch (_) { /* keep going */ }
    }
  }

  return json({ ok: true, date, count: norm.length, bookings: norm })
})
