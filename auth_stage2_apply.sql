-- ============================================================================
-- Stage 2 — APPLY write-only RLS (per-role, driven by the permissions grid)
-- ============================================================================
-- Reads stay open to any signed-in user. Writes (insert/update/delete) require
-- superadmin OR has_perm(<mapped permission>). Mirrors the confirmed preview.
-- Depends on public.has_perm() and public.app_role() already existing.
--
-- ts_users is handled separately (already live). ts_maintenance is intentionally
-- omitted: the real maintenance data lives in ts_settings (mixed-key table), so it
-- keeps its existing policies for now.
--
-- To DRY-RUN without changing anything, wrap the DO block in:  begin; ... ; rollback;
-- ============================================================================
do $$
declare
  tbls text[] := array['ts_loadsheets','ts_manifests','ts_charter_rates','ts_roster_build','ts_crew','ts_rezdy_bookings','ts_schedule','ts_pickup_lists'];
  prms text[] := array['operations','operations','charter','roster_edit','admin_crew','rezdy','rezdy','rezdy'];
  i int; t text; p text; r record;
begin
  for i in 1 .. array_length(tbls,1) loop
    t := tbls[i]; p := prms[i];
    if to_regclass('public.'||t) is null then continue; end if;
    execute format('alter table public.%I enable row level security', t);
    -- Drop EVERY existing policy on the table (anon_all, auth_all, public_all, s2_*, etc.)
    -- so no leftover permissive policy can OR-allow writes. RLS policies are additive.
    for r in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy if exists %I on public.%I', r.policyname, t);
    end loop;
    execute format('create policy s2_read on public.%I for select to authenticated using (true)', t);
    execute format('create policy s2_ins on public.%I for insert to authenticated with check (public.app_role()=''superadmin'' or public.has_perm(%L))', t, p);
    execute format('create policy s2_upd on public.%I for update to authenticated using (public.app_role()=''superadmin'' or public.has_perm(%L)) with check (public.app_role()=''superadmin'' or public.has_perm(%L))', t, p, p);
    execute format('create policy s2_del on public.%I for delete to authenticated using (public.app_role()=''superadmin'' or public.has_perm(%L))', t, p);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end$$;

-- show the resulting write policies
select tablename, polname,
       case polcmd when 'a' then 'INSERT' when 'w' then 'UPDATE' when 'r' then 'SELECT' when 'd' then 'DELETE' else polcmd::text end as cmd
from pg_policies pp
join pg_policy po on po.polname=pp.policyname
join pg_class c on c.oid=po.polrelid and c.relname=pp.tablename
where pp.schemaname='public'
  and pp.tablename in ('ts_loadsheets','ts_manifests','ts_charter_rates','ts_roster_build','ts_crew','ts_rezdy_bookings','ts_schedule','ts_pickup_lists')
order by tablename, cmd;
