// Supabase Edge Function: set-password  (Phase A)
// Deploy: supabase functions deploy set-password
// Env vars needed: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Purpose: move password WRITES off the browser. Today any holder of the anon key
// can `sbU('ts_users',{password_hash})` and take over any account. This function
// re-verifies a credential server-side before writing a new hash.
//
// Two modes:
//   self : { mode:'self',  email, currentPassword, newPassword }
//          -> verifies the user's current password, then sets the new one.
//   admin: { mode:'admin', adminEmail, adminPassword, targetId, newPassword }
//          -> verifies the admin's credentials AND that they are admin/superadmin,
//             then sets targetId's password (used by the admin People screen).
//
// (Phase C will replace the admin/self credential check with the caller's JWT.)

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
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } })

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("")
}
async function verify(plain: string, stored: string): Promise<boolean> {
  if (!plain || !stored) return false
  try { if (stored === btoa(plain)) return true } catch (_) { /* ignore */ }
  return stored === (await sha256Hex(plain))
}
async function userByEmail(email: string) {
  const { data } = await supabase.from("ts_users").select("*").ilike("email", email.trim().toLowerCase()).limit(1)
  return data && data.length ? (data[0] as Record<string, unknown>) : null
}

function strongEnough(pw: string): boolean {
  return typeof pw === "string" && pw.length >= 6
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405)

  let b: Record<string, string>
  try { b = await req.json() } catch (_) { return json({ ok: false, error: "bad_request" }, 400) }

  if (!strongEnough(b.newPassword)) return json({ ok: false, error: "weak_password" }, 400)
  const newHash = await sha256Hex(b.newPassword)

  if (b.mode === "self") {
    const u = await userByEmail(b.email ?? "")
    if (!u || !(await verify(b.currentPassword ?? "", String(u.password_hash ?? "")))) {
      return json({ ok: false, error: "invalid_login" }, 401)
    }
    await supabase.from("ts_users").update({ password_hash: newHash }).eq("id", u.id)
    return json({ ok: true })
  }

  if (b.mode === "admin") {
    const admin = await userByEmail(b.adminEmail ?? "")
    if (!admin || !(await verify(b.adminPassword ?? "", String(admin.password_hash ?? "")))) {
      return json({ ok: false, error: "invalid_admin" }, 401)
    }
    if (!["admin", "superadmin"].includes(String(admin.role ?? ""))) {
      return json({ ok: false, error: "not_authorised" }, 403)
    }
    if (!b.targetId) return json({ ok: false, error: "missing_target" }, 400)
    await supabase.from("ts_users").update({ password_hash: newHash }).eq("id", b.targetId)
    return json({ ok: true })
  }

  return json({ ok: false, error: "bad_mode" }, 400)
})
