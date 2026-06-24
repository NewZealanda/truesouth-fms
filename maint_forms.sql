-- ─────────────────────────────────────────────────────────────────────────────
-- Maintenance forms (v26.30) — run in the Supabase SQL editor.
-- Fillable, cross-device aircraft documents (starting with the SLA 13 Work Order).
-- Until this is applied the Maintenance ▸ Documents area works in-session but does NOT persist.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists ts_maint_forms (
  id             text primary key,        -- "wo_<epoch>_<rand>"
  form_type      text not null,           -- 'work_order' (more form types later)
  aircraft       text,                    -- ZK-xxx
  title          text,                    -- friendly label (e.g. "WO 1042 · ZK-SLA")
  data           jsonb,                   -- all the form fields
  status         text default 'open',     -- 'open' | 'complete' | 'deleted'
  drive_uploaded boolean default false,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  updated_by     text
);
create index if not exists ts_maint_forms_ac on ts_maint_forms (aircraft, form_type);

-- Realtime: add to the publication so edits sync across devices.
alter publication supabase_realtime add table ts_maint_forms;

-- RLS — match the existing scheme (gated client-side by the 'maintenance' permission).
alter table ts_maint_forms enable row level security;
drop policy if exists ts_maint_forms_rw on ts_maint_forms;
create policy ts_maint_forms_rw on ts_maint_forms for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.ts_maint_forms to authenticated;
