// Supabase Edge Function: rezdy-sync
// Deploy: supabase functions deploy rezdy-sync   (or paste in the dashboard editor)
// Env (auto): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ; Secret: REZDY_API_KEY
//
// POST {date:'YYYY-MM-DD'}            -> fetch that day's Rezdy bookings, normalise, cache, return.
// POST {import:["TSF...","..."]}      -> backfill specific orders by number (GET /bookings/{order}),
//                                        for advance bookings the search can't reach (see note below).
//
// IMPORTANT: Rezdy's GET /bookings search only returns bookings CREATED in roughly the last ~2 months
// and cannot be widened (proven: an explicit older minDateCreated/maxDateCreated window returns 0).
// So advance bookings (booked months ahead — common on peak dates, any channel) are invisible to this
// search. Completeness comes from the rezdy-webhook function (captures every order as it's made/changed)
// plus the {import:[...]} backfill here for orders already made before the webhook existed.

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

// Canonical NZ-local datetime ("YYYY-MM-DD HH:mm:ss") from the dependable UTC startTime — Rezdy's
// startTimeLocal can carry a UTC time on some agent/marketplace bookings and mis-date them by a day.
function nzLocal(it: any): string {
  const utc = String((it && it.startTime) || "")
  if (utc) {
    const d = new Date(/[zZ]|[+\-]\d{2}:?\d{2}$/.test(utc) ? utc : utc + "Z")
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

function itemLocalDate(it: any): string {
  const sl = String((it && it.startTimeLocal) || "")
  if (/^\d{4}-\d{2}-\d{2}/.test(sl) && !/[zZ]$|[+\-]\d{2}:?\d{2}$/.test(sl)) return sl.slice(0, 10).replace(/\//g, "-")
  const raw = sl || String((it && it.startTime) || "")
  if (!raw) return ""
  const d = new Date(raw)
  if (isNaN(d.getTime())) return raw.slice(0, 10).replace(/\//g, "-")
  try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit" }).format(d) }
  catch (_) { return raw.slice(0, 10).replace(/\//g, "-") }
}

function normalize(b: any) {
  const c = b.customer || {}
  const items = (b.items || []).map((it: any) => ({
    product: it.productName || it.productCode || "",
    startTimeLocal: nzLocal(it),
    startTime: it.startTime || "",
    quantity: it.totalQuantity || (it.quantities || []).reduce((s: number, q: any) => s + (q.value || 0), 0),
    quantities: (it.quantities || []).map((q: any) => ({ label: q.optionLabel || q.label || q.priceOptionLabel || "", value: q.value || 0 })),
    pickup: it.pickupLocation ? (it.pickupLocation.locationName || it.pickupLocation.additionalInstructions || "") : "",
    pickupTime: it.pickupLocation?.pickupTime ?? "",
    extras: (it.extras || []).map((e: any) => ({ name: e.name || e.extraName || "", qty: e.quantity || 1 })),
    participants: (it.participants || []).map(participant),
  }))
  const totalAmount = num(b.totalAmount)
  const totalPaid = num(b.totalPaid)
  const _agentName = (typeof b.agent === "string" ? b.agent : (b.agent && b.agent.companyName))
    || (typeof b.reseller === "string" ? b.reseller : (b.reseller && b.reseller.companyName))
    || b.resellerName || b.marketplaceName || b.agentName || ""
  const _rawSource = b.source || ""
  return {
    id: String(b.orderNumber || b.id || ""),
    orderNumber: b.orderNumber || "",
    status: b.status || b.orderStatus || "",
    customerName: [c.firstName, c.lastName].filter(Boolean).join(" "),
    phone: c.phone || c.mobile || "",
    email: c.email || "",
    comments: b.comments || "",
    fields: fieldsToObj(b.fields),
    source: _agentName || _rawSource || "",
    sourceCode: _rawSource,
    totalPax: items.reduce((s: number, i: any) => s + (i.quantity || 0), 0),
    totalAmount, totalPaid,
    balanceDue: Math.max(0, totalAmount - totalPaid),
    currency: b.totalCurrency || b.currency || "",
    items,
  }
}

// Store normalised orders as ONE row per (order, local item-date) so a multi-date order appears under
// every date it touches. Order-scoped: replace each fetched order's rows (across all dates) and rewrite.
async function storeOrders(normList: any[]) {
  const orders = [...new Set(normList.map((n) => n.orderNumber).filter(Boolean))]
  if (orders.length) { try { await admin.from("ts_rezdy_bookings").delete().in("order_number", orders) } catch (_) { /* keep going */ } }
  const now = new Date().toISOString()
  const rows: any[] = []
  for (const n of normList) {
    const ds = [...new Set((n.items || []).map((it: any) => itemLocalDate(it)).filter((d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d)))]
    for (const d of ds) rows.push({ id: `${n.orderNumber}__${d}`, order_number: n.orderNumber, tour_date: d, data: n, updated_at: now })
  }
  if (rows.length) { try { await admin.from("ts_rezdy_bookings").upsert(rows, { onConflict: "id" }) } catch (_) { /* keep going */ } }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405)
  if (!REZDY_KEY) return json({ ok: false, error: "no_api_key", hint: "Set REZDY_API_KEY secret" }, 500)

  let body: { date?: string; store?: boolean; import?: string[] }
  try { body = await req.json() } catch (_) { return json({ ok: false, error: "bad_request" }, 400) }

  // Backfill: fetch specific orders by number (the only way to reach advance bookings the search hides).
  if (Array.isArray(body.import)) {
    const fetched: any[] = []
    const misses: any[] = []
    for (const on of body.import) {
      try {
        const r = await fetch(`${REZDY_BASE}/bookings/${encodeURIComponent(String(on))}?apiKey=${REZDY_KEY}`)
        const j: any = await r.json().catch(() => ({}))
        const bk = j.booking || j.data || j
        if (bk && (bk.orderNumber || bk.id)) fetched.push(normalize(bk)); else misses.push({ o: on, status: r.status })
      } catch (e) { misses.push({ o: on, error: String(e) }) }
    }
    if (fetched.length) await storeOrders(fetched)
    return json({ ok: true, imported: fetched.map((n) => n.orderNumber), misses })
  }

  // Live seat availability: list products (for codes + names), then pull Rezdy availability sessions
  // for the date range. Returns one entry per session (departure) with seatsAvailable.
  if (body.availability) {
    const from = String(body.availability.from || "").slice(0, 10)
    const to = String(body.availability.to || "").slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return json({ ok: false, error: "bad_range" }, 400)
    const prods: any[] = []
    try {
      for (let off = 0; off < 6; off++) {
        const pr = await fetch(`${REZDY_BASE}/products?apiKey=${REZDY_KEY}&limit=100&offset=${off * 100}`)
        const pj: any = await pr.json().catch(() => ({}))
        const list = pj.products || pj.data || []
        prods.push(...list)
        if (list.length < 100) break
      }
    } catch (_) { /* keep going */ }
    const nameByCode: Record<string, string> = {}
    const codes: string[] = []
    for (const p of prods) {
      const code = p.code || p.productCode || ""
      if (!code) continue
      if (String(p.productType || "").toUpperCase().includes("GIFT")) continue
      nameByCode[code] = p.name || code
      codes.push(code)
    }
    const debug: any = {
      prodCount: prods.length, codeCount: codes.length,
      sampleProduct: prods[0] ? { keys: Object.keys(prods[0]).slice(0, 25), code: prods[0].code || prods[0].productCode || null, name: prods[0].name || null, type: prods[0].productType || null } : null,
      avail: [] as any[],
    }
    if (!codes.length) return json({ ok: true, from, to, sessions: [], products: [], debug })
    // Rezdy's startTime/endTime params are ISO8601 (UTC), NOT the local "yyyy-MM-dd HH:mm:ss" format.
    // Widen the UTC window a day each side so a full NZ (UTC+12/13) month is covered; the client filters by local date.
    const isoT = (dstr: string, add: number) => { const t = new Date(dstr + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + add); return t.toISOString().slice(0, 19) + "Z" }
    const startTime = isoT(from, -1), endTime = isoT(to, 1)
    const sessions: any[] = []
    for (let i = 0; i < codes.length; i += 20) {
      const chunk = codes.slice(i, i + 20)
      let url = `${REZDY_BASE}/availability?apiKey=${REZDY_KEY}&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`
      for (const c of chunk) url += `&productCode=${encodeURIComponent(c)}`
      try {
        const ar = await fetch(url)
        const raw = await ar.text()
        let aj: any = {}; try { aj = JSON.parse(raw) } catch (_) { /* non-json */ }
        const list = aj.sessions || []
        if (i === 0) debug.avail.push({ ok: ar.ok, status: ar.status, sessionCount: list.length, sample: raw.slice(0, 400) })
        for (const s of list) {
          const sa = (s.seatsAvailable != null ? s.seatsAvailable : s.seats)
          sessions.push({ productCode: s.productCode, productName: nameByCode[s.productCode] || s.productCode, startTimeLocal: s.startTimeLocal || s.startTime || "", seatsAvailable: sa, seats: s.seats })
        }
      } catch (e) { if (i === 0) debug.avail.push({ error: String(e) }) }
    }
    return json({ ok: true, from, to, sessions, products: codes.map((c) => ({ code: c, name: nameByCode[c] })), debug })
  }

  const date = (body.date || "").trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ ok: false, error: "missing_or_bad_date" }, 400)

  // Query a full day either side (NZ day spans two UTC days, and Rezdy is inconsistent about whether
  // the bounds are UTC or local); exact NZ-day membership is decided locally by itemLocalDate().
  const shiftDay = (d: string, days: number) => {
    const t = new Date(d + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + days)
    return t.toISOString().slice(0, 10)
  }
  const minT = `${shiftDay(date, -1)}T00:00:00Z`
  const maxT = `${shiftDay(date, 1)}T23:59:59Z`
  // Wide creation floor (Rezdy ignores it beyond its own ~2-month cap, but harmless and future-proof).
  const minCreated = `${Number(date.slice(0, 4)) - 5}-01-01T00:00:00Z`
  const baseUrl = `${REZDY_BASE}/bookings?apiKey=${REZDY_KEY}` +
    `&minTourStartTime=${encodeURIComponent(minT)}` +
    `&maxTourStartTime=${encodeURIComponent(maxT)}` +
    `&minDateCreated=${encodeURIComponent(minCreated)}`

  const all: any[] = []
  let offset = 0
  for (let page = 0; page < 20; page++) {
    const url = baseUrl + `&limit=100&offset=${offset}`
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

  // Keep bookings whose LOCAL tour date matches the requested NZ day.
  const norm = all.map(normalize).filter((n) => n.id).filter((n) =>
    (n.items || []).some((it: any) => itemLocalDate(it) === date)
  )

  // Refresh only the orders this search returned (recent ones). Advance bookings written by the
  // rezdy-webhook / {import} backfill are NOT in `norm`, so they are left untouched here.
  if (body.store !== false) await storeOrders(norm)

  return json({ ok: true, date, count: norm.length, bookings: norm })
})
