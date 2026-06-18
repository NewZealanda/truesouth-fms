-- ============================================================================
-- Stage 2 — ROLLBACK: restore permissive (any signed-in user can read+write)
-- ============================================================================
-- Run this if Stage 2 enforcement causes problems. It drops the per-role write
-- policies and restores a single permissive policy per table (the pre-Stage-2 model).
-- ============================================================================
do $$
declare
  tbls text[] := array['ts_loadsheets','ts_manifests','ts_charter_rates','ts_roster_build','ts_crew','ts_rezdy_bookings','ts_schedule','ts_pickup_lists'];
  t text;
begin
  foreach t in array tbls loop
    if to_regclass('public.'||t) is null then continue; end if;
    execute format('drop policy if exists s2_read on public.%I', t);
    execute format('drop policy if exists s2_ins  on public.%I', t);
    execute format('drop policy if exists s2_upd  on public.%I', t);
    execute format('drop policy if exists s2_del  on public.%I', t);
    execute format('drop policy if exists auth_all on public.%I', t);
    execute format('create policy auth_all on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end$$;
