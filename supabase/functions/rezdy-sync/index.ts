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
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

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

// Canonical NZ-local datetime ("YYYY-MM-DD HH:mm:ss") for an order item. Rezdy's startTimeLocal is
// unreliable on some (older / agent / Viator) bookings — it can carry a UTC time, which mis-dates
// the booking by a day. The UTC `startTime` instant is the dependable field, so we render THAT in
// the Pacific/Auckland zone (DST-proof) and use it as the local time everywhere. Falls back to the
// raw startTimeLocal only when there's no usable startTime.
function nzLocal(it: any): string {
  const utc = String((it && it.startTime) || "")
  if (utc) {
    const d = new Date(/[zZ]|[+\-]\d{2}:?\d{2}$/.test(utc) ? utc : utc + "Z") // assume UTC when no zone
    if (!isNaN(d.getTime())) {
      try {
        const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(d)
        const g = (t: string) => (p.find((x: any) => x.type === t) || { value: "" }).value
        if (g("year")) return `${g("year")}-${g("month")}-${g("day")} ${g("hour")}:${g("minute")}:${g("second")}`
      } catch (_) { /* fall through */ }
    }
  }
  return String((it && it.startTimeLocal) || "")
}

function normalize(b: any) {
  const c = b.customer || {}
  const items = (b.items || []).map((it: any) => ({
    product: it.productName || it.productCode || "",
    startTimeLocal: nzLocal(it),
    startTime: it.startTime || "",
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
  // Probe: POST {probe:["TSF...","..."]} fetches each booking DIRECTLY by order number and returns
  // its raw item times + status — to see what Rezdy stores for bookings the tour-time search misses.
  if (Array.isArray((body as any).probe)) {
    const out: any[] = []
    for (const on of (body as any).probe) {
      try {
        const r = await fetch(`${REZDY_BASE}/bookings/${encodeURIComponent(String(on))}?apiKey=${REZDY_KEY}`)
        const j: any = await r.json().catch(() => ({}))
        const bk = j.booking || j.data || j
        out.push({
          o: on, httpStatus: r.status, orderStatus: (bk && (bk.status || bk.orderStatus)) || null,
          source: (bk && bk.source) || null,
          items: ((bk && bk.items) || []).map((it: any) => ({ stl: it.startTimeLocal ?? null, st: it.startTime ?? null, product: it.productName || it.productCode || null })),
        })
      } catch (e) { out.push({ o: on, error: String(e) }) }
    }
    return json({ ok: true, probe: out })
  }

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
  // Rezdy's min/maxTourStartTime bound the search, but Rezdy is inconsistent about whether these
  // are UTC or the operator's LOCAL time. A tight UTC-only window (…date 14:00Z) was silently
  // cutting off AFTERNOON NZ tours whenever Rezdy read the bound as local time. Query a FULL day
  // either side so the whole NZ day is covered under EITHER interpretation; exact NZ-day membership
  // is then decided locally by itemLocalDate(), so the wide window never over-includes.
  const minT = `${shiftDay(date, -1)}T00:00:00Z`
  const maxT = `${shiftDay(date, 1)}T23:59:59Z`

  // CRITICAL: Rezdy's booking search filters by minDateCreated ("only load bookings created on or
  // after this date") and DEFAULTS it to recently-created bookings. So advance bookings — placed
  // months ahead for a future tour (the low / older order numbers) — were silently omitted even
  // though their tour falls in the window. Pin the creation floor years back so EVERY booking with
  // a tour in the window is returned regardless of when it was booked. (5y back ≫ any booking lead
  // time, and avoids any "range too wide" rejection from an absolute epoch.)
  const minCreated = `${Number(date.slice(0, 4)) - 5}-01-01T00:00:00Z`

  // CRITICAL: Rezdy's booking search OMITS marketplace-channel orders (e.g. Viator sold via Rezdy
  // Marketplace — source MARKETPLACE / MARKETPLACE_PREF_RATE) unless you request that `source`
  // explicitly. With no source param it returns only the direct channels, so marketplace bookings
  // silently vanished from the day (the real cause of the "missing Boxing Day bookings"). Fetch the
  // default channels PLUS each marketplace source and MERGE (dedupe by order number) so every
  // booking with a tour in the window is captured regardless of channel.
  const SOURCES: (string | null)[] = [null, "MARKETPLACE", "MARKETPLACE_PREF_RATE"]
  const baseUrl = `${REZDY_BASE}/bookings?apiKey=${REZDY_KEY}` +
    `&minTourStartTime=${encodeURIComponent(minT)}` +
    `&maxTourStartTime=${encodeURIComponent(maxT)}` +
    `&minDateCreated=${encodeURIComponent(minCreated)}`
  const all: any[] = []
  const seenIds = new Set<string>()
  let fetchErr: { status: number; body: string; src: string | null } | null = null
  const srcStats: any[] = []
  for (const src of SOURCES) {
    let offset = 0, got = 0, errStr: string | null = null
    for (let page = 0; page < 20; page++) {
      const url = baseUrl + (src ? `&source=${encodeURIComponent(src)}` : "") + `&limit=100&offset=${offset}`
      const r = await fetch(url)
      if (!r.ok) { const bt = (await r.text().catch(() => "")).slice(0, 200); errStr = r.status + ": " + bt; fetchErr = { status: r.status, body: bt, src }; break } // skip this source, keep the rest
      const j = await r.json().catch(() => ({}))
      const bookings = j.bookings || j.data || []
      got += bookings.length
      for (const b of bookings) { const id = String((b && (b.orderNumber || b.id)) || ""); if (id && !seenIds.has(id)) { seenIds.add(id); all.push(b) } }
      if (bookings.length < 100) break
      offset += 100
    }
    srcStats.push({ src: src || "(default)", got, err: errStr })
  }
  // Only hard-fail if we got NOTHING and a request errored — a single source hiccup must not wipe the day.
  if (!all.length && fetchErr) return json({ ok: false, error: "rezdy_error", status: fetchErr.status, body: fetchErr.body }, 502)

  const normAll = all.map(normalize).filter((n) => n.id)

  // A booking belongs to this date if ANY of its order items starts on that NZ-local day.
  const norm = normAll.filter((n) =>
    (n.items || []).some((it: any) => itemLocalDate(it) === date)
  )

  // Diagnostic: POST {date, diag:true} → echoes the exact query params used (to confirm which code
  // is live) + the raw time fields for every booking in the window (no store).
  if ((body as any).diag) {
    return json({
      ok: true, date, minCreated, minT, maxT, sources: SOURCES, srcStats, windowCount: all.length, count: norm.length,
      diag: all.map((b: any) => ({
        o: b.orderNumber,
        i: (b.items || []).map((it: any) => ({ stl: it.startTimeLocal ?? null, st: it.startTime ?? null, d: itemLocalDate({ startTimeLocal: nzLocal(it), startTime: it.startTime }) })),
      })),
    })
  }

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

  return json({ ok: true, date, count: norm.length, windowCount: all.length, bookings: norm })
})
