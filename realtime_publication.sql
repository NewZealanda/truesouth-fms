-- ═══════════════════════════════════════════════════════════════════════════
-- TrueSouth FMS — ensure EVERY table the app subscribes to is in the realtime
-- publication. Postgres only delivers postgres_changes events for tables in the
-- `supabase_realtime` publication; a subscribed-but-unpublished table syncs nothing.
--
-- This closes the two carried items:
--   • W&B / aircraft spec changes (ts_aircraft) now broadcast to other devices.
--   • Flight records (ts_flight_records) now sync live (Data Recording, Logbook, Monitoring).
-- It also re-affirms the 5 new ground/ops tables (superset of realtime_new_modules.sql).
--
-- Idempotent: each table is added only if missing. Run in the Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare t text;
begin
  foreach t in array array[
    -- core collaborative tables
    'ts_crew','ts_aircraft','ts_users','ts_loadsheets','ts_manifests',
    'ts_charter_rates','ts_settings','ts_maintenance','ts_flight_records',
    'ts_flightduty','ts_fd_certs','ts_maint_forms','ts_scratchpads',
    -- new ground/ops modules
    'ts_vehicle_prestarts','ts_ops_notices','ts_ops_notice_reads',
    'ts_equipment','ts_visitors','ts_flight_following'
  ]
  loop
    if exists (select 1 from information_schema.tables
               where table_schema='public' and table_name=t)
    and not exists (select 1 from pg_publication_tables
               where pubname='supabase_realtime' and schemaname='public' and tablename=t)
    then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Verify — list every TrueSouth table currently in the realtime publication:
select tablename from pg_publication_tables
where pubname='supabase_realtime' and schemaname='public' and tablename like 'ts_%'
order by tablename;

-- Done.
