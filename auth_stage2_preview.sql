-- ============================================================================
-- Stage 2 — PREVIEW (safe, read-only): who can WRITE each table once enforced
-- ============================================================================
-- Computes exactly what the RLS write policies will decide
-- (superadmin OR has_perm(mapped_permission)) for every role × table.
-- Nothing is enforced or changed by running this. Compare to your intent.
-- ============================================================================
create or replace function pg_temp.stage2_preview()
returns table(role text, writable_tables text)
language plpgsql as $$
declare
  r text; s text; i int;
  roles text[] := array['admin','cx_manager','pilot','desk','maint','maintenance','ground_staff','accounts','marketing','superadmin'];
  -- table : permission that gates writing it
  tbls text[]  := array['ts_loadsheets','ts_manifests','ts_charter_rates','ts_maintenance','ts_roster_build','ts_crew','ts_rezdy_bookings','ts_schedule','ts_pickup_lists','ts_users'];
  perms text[] := array['operations','operations','charter','maint_bookings','roster_edit','admin_crew','rezdy','rezdy','rezdy','admin_users'];
begin
  foreach r in array roles loop
    perform set_config('request.jwt.claims',
      json_build_object('role','authenticated','user_role',r)::text, true);
    s := '';
    for i in 1 .. array_length(tbls,1) loop
      if r = 'superadmin' or public.has_perm(perms[i]) then
        s := s || replace(tbls[i],'ts_','') || ', ';
      end if;
    end loop;
    role := r;
    writable_tables := coalesce(nullif(rtrim(s, ', '), ''), '(read-only — no writes)');
    return next;
  end loop;
end$$;
select * from pg_temp.stage2_preview();
