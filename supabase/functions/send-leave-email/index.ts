// Supabase Edge Function: send-leave-email
// Deploy: supabase functions deploy send-leave-email
// Env vars needed: RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? ""
const SB_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SB_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const FROM_EMAIL = "noreply@truesouthflights.co.nz"
const APP_NAME = "TrueSouth FMS"

const supabase = createClient(SB_URL, SB_SERVICE_KEY)

function fmtDate(ds: string): string {
  if (!ds) return ""
  const d = new Date(ds + "T00:00:00")
  return d.toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" })
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: "Annual Leave",
  sick: "Sick Leave",
  unpaid: "Unpaid Leave",
  other: "Other Leave",
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 })

  const { requestId, action } = await req.json()
  if (!requestId || !action) {
    return new Response("Missing requestId or action", { status: 400 })
  }

  // Fetch the leave request
  const { data: requests, error } = await supabase
    .from("ts_leave_requests")
    .select("*")
    .eq("id", requestId)
    .limit(1)

  if (error || !requests?.length) {
    return new Response("Request not found", { status: 404 })
  }

  const req_data = requests[0]
  const leaveTypeLbl = LEAVE_TYPE_LABELS[req_data.leave_type] ?? req_data.leave_type
  const dateRange = `${fmtDate(req_data.start_date)} – ${fmtDate(req_data.end_date)}`
  const days = req_data.total_days ?? 1
  const dayStr = `${days} day${days !== 1 ? "s" : ""}`

  // Fetch all users to find approvers + the requester
  const { data: users } = await supabase.from("ts_users").select("id,name,email,role")
  if (!users) return new Response("Users not found", { status: 500 })

  const requesterUser = users.find((u: any) => u.id === req_data.user_id)
  const requesterEmail = requesterUser?.email ?? ""
  const requesterName = req_data.user_name ?? requesterUser?.name ?? "Team Member"

  // Determine who gets emailed
  const emails: { to: string; subject: string; html: string }[] = []

  if (action === "submitted") {
    // Email approvers
    const approverRoles =
      ["desk", "ground_staff"].includes(req_data.user_role)
        ? ["cx_manager", "admin", "superadmin"]
        : ["admin", "superadmin"]

    const approvers = users.filter((u: any) => approverRoles.includes(u.role) && u.email)

    for (const approver of approvers) {
      emails.push({
        to: approver.email,
        subject: `Leave Request: ${requesterName} — ${leaveTypeLbl}`,
        html: `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#7c3aed;margin-bottom:4px">New Leave Request</h2>
  <p style="color:#6b7280;margin-top:0">Requires your review in ${APP_NAME}</p>
  <div style="background:#f9fafb;border-radius:8px;padding:16px 20px;margin:20px 0">
    <p><strong>Employee:</strong> ${requesterName} (${req_data.user_role})</p>
    <p><strong>Leave Type:</strong> ${leaveTypeLbl}</p>
    <p><strong>Dates:</strong> ${dateRange} (${dayStr}${req_data.partial_day ? ` · Half day ${req_data.partial_type?.toUpperCase()}` : ""})</p>
    ${req_data.reason ? `<p><strong>Reason:</strong> ${req_data.reason}</p>` : ""}
    <p><strong>Status:</strong> <span style="color:#f59e0b;font-weight:bold">Pending</span></p>
  </div>
  <p style="color:#6b7280;font-size:13px">Log in to TrueSouth FMS → Leave → Approvals to action this request.</p>
</div>`,
      })
    }
  } else if (action === "approved" || action === "declined") {
    // Email the employee
    if (requesterEmail) {
      const statusColor = action === "approved" ? "#22c55e" : "#ef4444"
      const statusLbl = action === "approved" ? "Approved ✓" : "Declined"
      emails.push({
        to: requesterEmail,
        subject: `Leave ${statusLbl}: ${leaveTypeLbl} ${dateRange}`,
        html: `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:${statusColor};margin-bottom:4px">Leave Request ${statusLbl}</h2>
  <p style="color:#6b7280;margin-top:0">Your request has been reviewed</p>
  <div style="background:#f9fafb;border-radius:8px;padding:16px 20px;margin:20px 0">
    <p><strong>Leave Type:</strong> ${leaveTypeLbl}</p>
    <p><strong>Dates:</strong> ${dateRange} (${dayStr})</p>
    <p><strong>Status:</strong> <span style="color:${statusColor};font-weight:bold">${statusLbl}</span></p>
    ${req_data.admin_comment ? `<p><strong>Comment:</strong> ${req_data.admin_comment}</p>` : ""}
    ${req_data.reviewed_by_name ? `<p><strong>Reviewed by:</strong> ${req_data.reviewed_by_name}</p>` : ""}
  </div>
  <p style="color:#6b7280;font-size:13px">Log in to TrueSouth FMS → Leave to view your leave history.</p>
</div>`,
      })
    }
  }

  // Send via Resend
  let sent = 0
  for (const email of emails) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${APP_NAME} <${FROM_EMAIL}>`,
        to: [email.to],
        subject: email.subject,
        html: email.html,
      }),
    })
    if (res.ok) sent++
    else console.error("Resend error:", await res.text())
  }

  return new Response(JSON.stringify({ sent, total: emails.length }), {
    headers: { "Content-Type": "application/json" },
  })
})
