// Supabase Edge Function: rezdy-webhook
// Receives Rezdy ORDER webhooks (new / updated / cancelled order) and writes them straight into
// ts_rezdy_bookings — so EVERY booking is captured the moment it's made or changed, regardless of
// how far ahead it was booked or which channel (Online / API / Internal / Marketplace / Agent).
// This closes the gap where Rezdy's GET /bookings search silently hides bookings created more than
// ~2 months ago (advance bookings) — that search can't return them by any parameter.
//
// SETUP (one-time):
//   1. Deploy this function.
//   2. Turn OFF "Verify JWT" for this function (Edge Functions ▸ rezdy-webhook ▸ Settings) — Rezdy
//      can't send a Supabase JWT.
//   3. Set a Supabase secret  REZDY_WEBHOOK_SECRET  to any long random string.
//   4. In the Rezdy dashboard (How To Set Up a Webhook), add a webhook for "new order",
//      "updated order" and "cancelled order", each pointing at:
//        https://<project>.supabase.co/functions/v1/rezdy-webhook?secret=<REZDY_WEBHOOK_SECRET>
//
// Rezdy fires NEW_ORDER (often PROCESSING) then UPDATED_ORDER (CONFIRMED); deliveries are
// at-least-once and may duplicate — every write here is idempotent (delete-then-upsert by order).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const SB_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SB_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const WH_SECRET = Deno.env.get("REZDY_WEBHOOK_SECRET") ?? ""
const admin = createClient(SB_URL, SB_SERVICE_KEY)

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

// Canonical NZ-local datetime ("YYYY-MM-DD HH:mm:ss") from the dependable UTC startTime (startTimeLocal
// is unreliable on some agent/marketplace bookings). Falls back to startTimeLocal when no startTime.
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

// Normalise a Rezdy order (same shape the rezdy-sync function stores, so the app reads them identically).
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
    internalNotes: b.internalNotes || "",   // Rezdy staff internal notes → shown in the app's internal-note box
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

// Replace this order's stored rows with one row per (order, local item-date) — matches rezdy-sync's
// scheme so a multi-date order shows under every date it touches and the app reads it unchanged.
async function storeOrder(order: any) {
  const n = normalize(order)
  if (!n.id) return
  try { await admin.from("ts_rezdy_bookings").delete().eq("order_number", n.orderNumber) } catch (_) { /* keep going */ }
  const now = new Date().toISOString()
  const ds = [...new Set((n.items || []).map((it: any) => itemLocalDate(it)).filter((d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d)))]
  const rows = ds.map((d) => ({ id: `${n.orderNumber}__${d}`, order_number: n.orderNumber, tour_date: d, data: n, updated_at: now }))
  if (rows.length) { try { await admin.from("ts_rezdy_bookings").upsert(rows, { onConflict: "id" }) } catch (_) { /* keep going */ } }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok")
  // Always ACK quickly (2xx) so Rezdy doesn't count failures, except for a bad secret.
  const secret = new URL(req.url).searchParams.get("secret") || ""
  if (!WH_SECRET || secret !== WH_SECRET) return new Response("forbidden", { status: 401 })
  if (req.method !== "POST") return new Response("ok", { status: 200 })
  try {
    const body: any = await req.json()
    // The webhook body is the order itself; tolerate a wrapper just in case.
    const order = body && (body.order || body.booking || body)
    if (order && (order.orderNumber || order.id)) await storeOrder(order)
  } catch (_) { /* ignore malformed — still ACK */ }
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } })
})
