-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth FMS — session seat HOLDS  (Phase 0.5, availability engine)
--
-- A hold is a short-lived soft-lock on N seats for a departure, so a booking in
-- progress (direct checkout / agent portal, Phase 1+) can reserve seats without
-- double-selling. The availability engine subtracts ACTIVE (unexpired) holds from
-- the sellable count. Expired holds are simply ignored; a periodic cleanup can prune.
--
-- Idempotent — safe to re-run. Run in the Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.ts_session_holds (
  id           text primary key,            -- "<tour_date>|<dep>|<rand>"
  tour_date    date not null,               -- NZ-local flight date
  dep          text not null,               -- departure time, HHMM (e.g. "0930")
  dest         text,                         -- optional destination group (MC / MF / FJ …)
  seats        int  not null default 1,      -- seats held
  expires_at   timestamptz not null,         -- hold lapses at this time
  created_by   text,                          -- user id that placed the hold
  created_at   timestamptz default now()
);

create index if not exists ts_session_holds_date_idx    on public.ts_session_holds (tour_date);
create index if not exists ts_session_holds_expires_idx on public.ts_session_holds (expires_at);

alter table public.ts_session_holds enable row level security;

-- Everyone signed-in can READ (needed to compute availability).
drop policy if exists session_holds_read on public.ts_session_holds;
create policy session_holds_read on public.ts_session_holds
  for select to authenticated using (true);

-- Place / release holds = booking-desk roles (and later the checkout/agent service).
drop policy if exists session_holds_write on public.ts_session_holds;
create policy session_holds_write on public.ts_session_holds
  for all to authenticated
  using      (public.app_role() in ('operations','desk','cx_manager','admin','superadmin'))
  with check (public.app_role() in ('operations','desk','cx_manager','admin','superadmin'));

grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on public.ts_session_holds to authenticated;

-- Live cross-device availability: add to the realtime publication (guarded so re-running never errors).
do $$
begin
  begin
    alter publication supabase_realtime add table public.ts_session_holds;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;

-- Done.
