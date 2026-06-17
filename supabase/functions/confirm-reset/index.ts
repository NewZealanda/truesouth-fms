// Supabase Edge Function: confirm-reset  (Phase A)
// Deploy: supabase functions deploy confirm-reset
// Env vars needed: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Purpose: under Phase A the reset_token column is no longer readable by the browser,
// so the "enter your 6-digit code + new password" step must be verified server-side.
// Verifies the code against ts_users.reset_token (+ expiry), sets the new SHA-256 hash,
// and clears the token. The matching "request a code" step keeps using the existing
// send-reset-email function (the client still writes the token via sbUserWrite).

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
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } })

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("")
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405)

  let b: { email?: string; code?: string; newPassword?: string }
  try { b = await req.json() } catch (_) { return json({ ok: false, error: "bad_request" }, 400) }

  const email = (b.email ?? "").trim().toLowerCase()
  const code = (b.code ?? "").trim()
  const newPassword = b.newPassword ?? ""
  if (!email || !code) return json({ ok: false, error: "missing_fields" }, 400)
  if (typeof newPassword !== "string" || newPassword.length < 6) return json({ ok: false, error: "weak_password" }, 400)

  const { data: users } = await supabase.from("ts_users").select("*").ilike("email", email).limit(1)
  if (!users || !users.length) return json({ ok: false, error: "invalid_code" }, 401)
  const u = users[0] as Record<string, unknown>

  const tokenOk = String(u.reset_token ?? "") === code && String(u.reset_token ?? "") !== ""
  const exp = Number(u.reset_expires ?? 0)
  const notExpired = Number.isFinite(exp) && exp > 0 && Date.now() < exp
  if (!tokenOk || !notExpired) return json({ ok: false, error: "invalid_code" }, 401)

  await supabase
    .from("ts_users")
    .update({ password_hash: await sha256Hex(newPassword), reset_token: null, reset_expires: null })
    .eq("id", u.id)

  return json({ ok: true })
})
