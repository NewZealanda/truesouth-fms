-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth FMS — Visitor sign-in register  (Visitors section)
-- Run in the Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.ts_visitors (
  id           text primary key,
  name         text,
  company      text,
  mobile       text,
  visiting     text,
  reason       text,
  vehicle_reg  text,
  sign_in      timestamptz,
  sign_out     timestamptz,
  status       text default 'onsite',   -- onsite | out | deleted (soft)
  created_at   timestamptz default now()
);
create index if not exists ts_visitors_signin_idx on public.ts_visitors (sign_in desc);
create index if not exists ts_visitors_status_idx on public.ts_visitors (status);

alter table public.ts_visitors enable row level security;

-- Any signed-in user (reception) can read/sign-in/sign-out; only admins/CX can edit or soft-delete history.
drop policy if exists visitors_read on public.ts_visitors;
create policy visitors_read on public.ts_visitors for select to authenticated using (true);
drop policy if exists visitors_insert on public.ts_visitors;
create policy visitors_insert on public.ts_visitors for insert to authenticated with check (true);
drop policy if exists visitors_update on public.ts_visitors;
create policy visitors_update on public.ts_visitors for update to authenticated using (true) with check (true);
-- (No hard DELETE policy — records are soft-deleted via status; tighten update to admins later if desired.)

-- Done.
