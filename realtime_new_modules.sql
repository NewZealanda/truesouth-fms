-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth FMS — enable realtime for the new ground/ops module tables
-- After this, a change on one device pushes live to others (instead of only on
-- reload / the 30s Monitoring poll). The app already subscribes to these tables
-- (v28.56); Postgres only DELIVERS the change events once the table is in the
-- supabase_realtime publication. Run in the Supabase SQL editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare t text;
begin
  foreach t in array array[
    'ts_vehicle_prestarts',
    'ts_ops_notices',
    'ts_ops_notice_reads',
    'ts_equipment',
    'ts_visitors',
    'ts_flight_following'
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Verify (should list all six):
select tablename from pg_publication_tables
where pubname='supabase_realtime' and schemaname='public'
  and tablename in ('ts_vehicle_prestarts','ts_ops_notices','ts_ops_notice_reads',
                    'ts_equipment','ts_visitors','ts_flight_following')
order by tablename;

-- Done.
