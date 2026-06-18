// Supabase Edge Function: migrate-login  (Phase C)
// Deploy: supabase functions deploy migrate-login
// Env vars needed: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Lazy password migration. The Phase C client calls supabase.auth.signInWithPassword
// first; if that fails (the Auth user still has its random provisioning password), it
// calls THIS function with {email, password}. We verify the password against the legacy
// ts_users hash, and on success set the user's Auth password to it (admin API) and ensure
// a profiles mapping exists. The client then retries signInWithPassword, which now works.
// Real passwords carry over on first login — nobody is forced to reset.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SB_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SB_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const admin = createClient(SB_URL, SB_SERVICE_KEY)

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
async function legacyVerify(plain: string, stored: string): Promise<boolean> {
  if (!plain || !stored) return false
  try { if (stored === btoa(plain)) return true } catch (_) { /* ignore */ }
  return stored === (await sha256Hex(plain))
}

// Find an auth user by email (paginates if needed for larger user bases).
async function findAuthUser(email: string) {
  let page = 1
  // deno-lint-ignore no-constant-condition
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error || !data || !data.users.length) return null
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === email)
    if (hit) return hit
    if (data.users.length < 200) return null
    page++
    if (page > 50) return null
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405)

  let b: { email?: string; password?: string }
  try { b = await req.json() } catch (_) { return json({ ok: false, error: "bad_request" }, 400) }
  const email = (b.email ?? "").trim().toLowerCase()
  const password = b.password ?? ""
  if (!email || !password) return json({ ok: false, error: "missing_credentials" }, 400)

  // 1. Verify against the legacy hash.
  const { data: rows } = await admin.from("ts_users").select("id,email,role,password_hash").ilike("email", email).limit(1)
  if (!rows || !rows.length) return json({ ok: false, error: "invalid_login" }, 401)
  const legacy = rows[0] as Record<string, unknown>
  if (!(await legacyVerify(password, String(legacy.password_hash ?? "")))) {
    return json({ ok: false, error: "invalid_login" }, 401)
  }

  // 2. Find (or create) the Auth user, then set its password to the verified one.
  let authUser = await findAuthUser(email)
  if (!authUser) {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (error || !data?.user) return json({ ok: false, error: "provision_failed" }, 500)
    authUser = data.user
  } else {
    const { error } = await admin.auth.admin.updateUserById(authUser.id, { password })
    if (error) return json({ ok: false, error: "set_password_failed" }, 500)
  }

  // 3. Ensure the profiles mapping (auth uuid -> app TEXT id + role).
  await admin.from("profiles").upsert(
    { auth_uid: authUser.id, app_id: legacy.id, role: legacy.role ?? "desk", email },
    { onConflict: "auth_uid" },
  )

  // Client should now retry supabase.auth.signInWithPassword(email, password).
  return json({ ok: true, migrated: true })
})
