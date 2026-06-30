-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth FMS — customer weather-call links (Phase 1)
-- A unique tokenised link per BOOKING. Pilots make a weather call → the desk
-- copies the link → pastes it to the customer (WhatsApp/email). The customer
-- opens it, taps "reveal", and that acknowledgement comes back to us (auto-Wx).
--
-- SECURITY: anon has NO table access — it can only reach a single row through
-- the two token-scoped RPCs below (so the table can't be enumerated). Staff
-- (authenticated) read/write the table directly.
--
-- Run in the Supabase SQL editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.ts_wx_links (
  token        text primary key,            -- unguessable token used in the URL (?t=…)
  order_number text,                         -- Rezdy booking ref (maps back to the app)
  dep_key      text,                         -- departure key (HH:MM…)
  fr_date      date,                         -- flight date
  snapshot     jsonb default '{}'::jsonb,    -- display data for the public page (pax, dep, route, wx, pickup)
  ack_at       timestamptz,                  -- customer revealed / acknowledged (null = not yet = link "live")
  action       text,                         -- confirmed | refund | contact | null
  action_at    timestamptz,
  action_note  text,
  events       jsonb default '[]'::jsonb,    -- activity log: [{t, at, src, by}] copied/sent/view/confirmed/refund/contact/reset
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index if not exists ts_wx_links_order_idx on public.ts_wx_links(order_number);
create index if not exists ts_wx_links_date_idx  on public.ts_wx_links(fr_date);

alter table public.ts_wx_links enable row level security;

-- Staff (any signed-in user) manage the links directly.
drop policy if exists wx_links_staff on public.ts_wx_links;
create policy wx_links_staff on public.ts_wx_links for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.ts_wx_links to authenticated;

-- ── Public (anon) token-scoped RPCs ─────────────────────────────────────────
-- Read one link by token (returns null if missing). Read-only — the reveal tap calls wx_link_ack.
create or replace function public.wx_link_get(p_token text)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
           'snapshot', r.snapshot, 'ack_at', r.ack_at,
           'action', r.action, 'action_at', r.action_at)
  from public.ts_wx_links r where r.token = p_token;
$$;

-- Record a customer action. p_action: 'view' (reveal) | 'confirmed' | 'refund' | 'contact'.
-- First view stamps ack_at + logs a 'view'; actions set action/action_at + log it. Repeat views are ignored.
create or replace function public.wx_link_ack(p_token text, p_action text default 'view', p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.ts_wx_links; v_act boolean; v_first boolean;
begin
  select * into r from public.ts_wx_links where token = p_token;
  if not found then return null; end if;
  v_act   := p_action in ('confirmed','refund','contact','self_drive','change_pickup');
  v_first := (r.ack_at is null and p_action = 'view');
  update public.ts_wx_links set
    ack_at      = coalesce(ack_at, now()),
    action      = case when v_act then p_action else action end,
    action_at   = case when v_act then now()    else action_at end,
    action_note = coalesce(p_note, action_note),
    events      = case when (v_act or v_first)
                       then coalesce(events,'[]'::jsonb) || jsonb_build_object('t',p_action,'at',now(),'src','customer')
                       else coalesce(events,'[]'::jsonb) end,
    updated_at  = now()
  where token = p_token;
  return jsonb_build_object('ok', true, 'action', p_action);
end;
$$;

revoke all on function public.wx_link_get(text)        from public;
revoke all on function public.wx_link_ack(text,text,text) from public;
grant execute on function public.wx_link_get(text)        to anon, authenticated;
grant execute on function public.wx_link_ack(text,text,text) to anon, authenticated;

-- Optional: enable realtime so the desk sees acknowledgements live.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ts_wx_links') then
    execute 'alter publication supabase_realtime add table public.ts_wx_links';
  end if;
end $$;

-- Done.
