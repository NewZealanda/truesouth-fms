-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth FMS — allow the PUBLIC sign-in page (visit.html) to create visitor
-- records without logging into the app. The page uses the anon key.
--
-- Privacy: anon can ONLY INSERT a fresh on-site sign-in. No select/update/delete,
-- so the public page can never read or change the visitor list. Staff continue to
-- view / sign-out visitors inside the app (authenticated policies, unchanged).
--
-- Run in the Supabase SQL editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

grant usage on schema public to anon;
grant insert on public.ts_visitors to anon;

drop policy if exists visitors_public_insert on public.ts_visitors;
create policy visitors_public_insert on public.ts_visitors
  for insert to anon
  with check (status = 'onsite' and sign_out is null);

-- Done. The in-app QR (Visitors page) points to <your-site>/visit.html.
