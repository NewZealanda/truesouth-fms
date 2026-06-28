-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth FMS — Let any MANAGER read all leave (view), keep approve scoped
-- Run in the Supabase SQL editor. Requires reports_to.sql to have been run first
-- (it created app_manages() and app_is_manager()).
--
-- WHY: managers (incl. the CX Manager) should be able to SEE all leave requests
-- (for planning/conflicts), but only APPROVE/DECLINE — and be notified for — their
-- own direct reports. ONLY admins/superadmin action everyone. This widens the READ
-- policy to any manager; the UPDATE policy is limited to admins/superadmin or the
-- requester's direct manager.
-- ═══════════════════════════════════════════════════════════════════════════

drop policy if exists leave_approver_read on public.ts_leave_requests;
create policy leave_approver_read on public.ts_leave_requests for select to authenticated
  using (public.app_role() in ('cx_manager','admin','superadmin')
         or public.app_manages(user_id)     -- direct manager of the requester
         or public.app_is_manager());        -- anyone who manages someone → may view all

-- UPDATE (approve/decline): only admins/superadmin do everyone; otherwise just the
-- requester's DIRECT manager. (CX Manager is treated as a normal manager here.)
drop policy if exists leave_approver_update on public.ts_leave_requests;
create policy leave_approver_update on public.ts_leave_requests for update to authenticated
  using      (public.app_role() in ('admin','superadmin') or public.app_manages(user_id))
  with check (public.app_role() in ('admin','superadmin') or public.app_manages(user_id));

-- Done.
