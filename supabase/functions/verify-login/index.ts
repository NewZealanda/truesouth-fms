// Supabase Edge Function: verify-login  (Phase A)
// Deploy: supabase functions deploy verify-login
// Env vars needed: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Purpose: move password verification OFF the browser. The client posts
// {email, password}; this function (service role) reads ts_users, verifies the
// password against the stored hash, and returns the user record WITHOUT the
// password hash / reset token. Hashes never reach the browser again.
//
// Matches the app's existing hashing exactly:
//   - SHA-256 hex (current scheme)
//   - legacy btoa(plaintext) (auto-upgraded to SHA-256 on successful login)

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

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("")
}

// Returns { ok, legacy } — legacy true means the stored hash was the old btoa form.
async function verifyPassword(plain: string, stored: string): Promise<{ ok: boolean; legacy: boolean }> {
  if (!plain || !stored) return { ok: false, legacy: false }
  try {
    if (stored === btoa(plain)) return { ok: true, legacy: true }
  } catch (_) { /* btoa can throw on non-latin1; ignore */ }
  if (stored === (await sha256Hex(plain))) return { ok: true, legacy: false }
  return { ok: false, legacy: false }
}

function safeUser(u: Record<string, unknown>) {
  const { password_hash, reset_token, reset_expires, ...rest } = u
  return rest
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS })

  let body: { email?: string; password?: string }
  try { body = await req.json() } catch (_) {
    return new Response(JSON.stringify({ ok: false, error: "bad_request" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } })
  }
  const email = (body.email ?? "").trim().toLowerCase()
  const password = body.password ?? ""
  if (!email || !password) {
    return new Response(JSON.stringify({ ok: false, error: "missing_credentials" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } })
  }

  // Case-insensitive email lookup.
  const { data: users, error } = await supabase
    .from("ts_users")
    .select("*")
    .ilike("email", email)
    .limit(1)

  // Generic failure (don't reveal whether the email exists).
  const fail = () =>
    new Response(JSON.stringify({ ok: false, error: "invalid_login" }), { status: 401, headers: { ...CORS, "Content-Type": "application/json" } })

  if (error || !users || !users.length) return fail()
  const user = users[0] as Record<string, unknown>

  const { ok, legacy } = await verifyPassword(password, String(user.password_hash ?? ""))
  if (!ok) return fail()

  // Auto-upgrade a legacy btoa hash to SHA-256 on successful login.
  if (legacy) {
    try {
      await supabase.from("ts_users").update({ password_hash: await sha256Hex(password) }).eq("id", user.id)
    } catch (_) { /* non-fatal */ }
  }

  return new Response(JSON.stringify({ ok: true, user: safeUser(user) }), {
    status: 200,
    headers: { ...CORS, "Content-Type": "application/json" },
  })
})
