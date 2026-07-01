-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth FMS — PRODUCT CATALOG  (Phase 1 foundations of the booking platform)
--
-- One row per sellable product (flight type). Gives products, prices and standard
-- departure times a durable, editable home — so the public booking page (book.html)
-- and the desk can read them WITHOUT a code deploy. The operational fuel/burn
-- config stays in the app (`_RZ_PROD_CFG` + the Fuels override table); this table
-- carries the COMMERCIAL fields: display name, per-pax prices, standard departure
-- slots, and whether the product is publicly sellable.
--
-- The app seeds this once from its built-in product list (Settings ▸ Operations ▸
-- Products); everything is editable after that. `active=false` (the default) means
-- the product exists for the desk but is NOT offered on the public page.
--
-- Anon read of ACTIVE rows only: the public book.html reads the catalog directly
-- with the anon key (same pattern as wx.html). Writes stay desk-role gated.
--
-- Idempotent — safe to re-run. Run in the Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.ts_products (
  id            text primary key,            -- product code (THH, FCF, MCEXP, …)
  name          text not null,               -- customer-facing name
  dest_short    text,                        -- destination group (MC / MF / FJ / QN …)
  apt           text,                        -- loadsheet destination ICAO
  scenic        boolean default false,       -- overhead scenic (no landing)
  flyback       boolean default false,       -- rides the return leg (FLB / CCF)
  active        boolean default false,       -- offered on the PUBLIC booking page
  sort          int default 100,             -- display order
  duration_min  int,                         -- customer-facing duration
  price_adult   numeric,                     -- NZD incl. GST; null = POA / not priced yet
  price_child   numeric,
  price_infant  numeric default 0,
  times         jsonb default '[]'::jsonb,   -- standard departure slots ["08:00","09:30",…]
  description   text,                        -- short blurb for the public page
  updated_by    text,
  updated_at    timestamptz default now()
);

alter table public.ts_products enable row level security;

-- Signed-in users read everything (desk needs inactive rows too).
drop policy if exists products_read on public.ts_products;
create policy products_read on public.ts_products
  for select to authenticated using (true);

-- PUBLIC (anon) reads ACTIVE products only — powers book.html's catalog.
drop policy if exists products_read_public on public.ts_products;
create policy products_read_public on public.ts_products
  for select to anon using (active = true);

-- Write = booking-desk roles (same set as ts_native_bookings).
drop policy if exists products_write on public.ts_products;
create policy products_write on public.ts_products
  for all to authenticated
  using      (public.app_role() in ('operations','desk','cx_manager','admin','superadmin'))
  with check (public.app_role() in ('operations','desk','cx_manager','admin','superadmin'));

grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on public.ts_products to authenticated;
grant select on public.ts_products to anon;

-- Live cross-device sync (guarded so re-running never errors).
do $$
begin
  begin
    alter publication supabase_realtime add table public.ts_products;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;

-- Done.
