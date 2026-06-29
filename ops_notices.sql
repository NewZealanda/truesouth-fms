-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth FMS — Operations Notices (SMS)  + read receipts
-- Run in the Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.ts_ops_notices (
  id            text primary key,
  no            integer,
  subject       text,
  body          text,
  issued_by     text,
  issued_by_id  uuid,
  date_issued   date,
  status        text default 'active',        -- active | ongoing | closed | deleted
  groups        jsonb default '[]'::jsonb,    -- ['pilots','desk','ground','admin','other'] or ['everyone']
  files         jsonb default '[]'::jsonb,    -- [{name,type,data}]  (data-URI for now)
  created_at    timestamptz default now()
);
create index if not exists ts_ops_notices_no_idx on public.ts_ops_notices (no desc);

create table if not exists public.ts_ops_notice_reads (
  id          text primary key,               -- "<noticeId>|<userId>"
  notice_id   text,
  user_id     uuid,
  user_name   text,
  read_at     timestamptz default now()
);
create index if not exists ts_ops_notice_reads_nid_idx on public.ts_ops_notice_reads (notice_id);

alter table public.ts_ops_notices       enable row level security;
alter table public.ts_ops_notice_reads  enable row level security;

-- Notices: everyone reads; create/update/delete = admins/superadmin/cx_manager.
drop policy if exists ops_notices_read on public.ts_ops_notices;
create policy ops_notices_read on public.ts_ops_notices for select to authenticated using (true);
drop policy if exists ops_notices_write on public.ts_ops_notices;
create policy ops_notices_write on public.ts_ops_notices for all to authenticated
  using (public.app_role() in ('admin','superadmin','cx_manager'))
  with check (public.app_role() in ('admin','superadmin','cx_manager'));

-- Read receipts: everyone reads (so managers see all); a user may only insert/update their OWN receipt.
drop policy if exists ops_reads_read on public.ts_ops_notice_reads;
create policy ops_reads_read on public.ts_ops_notice_reads for select to authenticated using (true);
drop policy if exists ops_reads_write on public.ts_ops_notice_reads;
create policy ops_reads_write on public.ts_ops_notice_reads for all to authenticated
  using (user_id::text = public.app_id() or public.app_role() in ('admin','superadmin'))
  with check (user_id::text = public.app_id() or public.app_role() in ('admin','superadmin'));

-- Done.
