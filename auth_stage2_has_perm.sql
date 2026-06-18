-- ============================================================================
-- Stage 2 — server-side permission enforcement: foundation + DRY RUN
-- ============================================================================
-- This file ONLY creates the has_perm() helper and prints the effective matrix.
-- It does NOT change any table policy, so running it is 100% safe — nothing is
-- enforced yet. Run it, eyeball the matrix against the Admin > Permissions grid,
-- and confirm before we apply any write policies.
--
-- has_perm(perm) mirrors the client's hasRolePerm():
--   * superadmin -> always true (can never be locked out)
--   * else: override in ts_settings.role_perms (the grid) wins
--   * else: the built-in default below
--   * else: false
-- SECURITY DEFINER so it can read ts_settings.role_perms regardless of the
-- caller's own RLS, with a pinned search_path.
-- ============================================================================

create or replace function public.has_perm(perm text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text := public.app_role();
  v_val  jsonb;
  v_def  jsonb := $json$
{
  "admin":        {"operations":true,"charter":true,"maintenance":true,"roster":true,"roster_edit":true,"leave":true,"leave_approve":true,"admin_crew":true,"admin_users":true,"scratchpad":true,"audit":false,"maint_bookings":true,"sign_loadsheet":true,"rezdy":false,"pay_week":true},
  "cx_manager":   {"operations":true,"charter":false,"maintenance":false,"roster":true,"roster_edit":true,"leave":true,"leave_approve":true,"admin_crew":true,"admin_users":false,"scratchpad":false,"audit":false,"maint_bookings":false,"sign_loadsheet":false,"rezdy":false,"pay_week":false},
  "pilot":        {"operations":true,"charter":false,"maintenance":true,"roster":true,"roster_edit":false,"leave":true,"leave_approve":false,"admin_crew":true,"admin_users":false,"scratchpad":true,"audit":false,"maint_bookings":false,"sign_loadsheet":true,"rezdy":false,"pay_week":false},
  "desk":         {"operations":true,"charter":true,"maintenance":true,"roster":true,"roster_edit":false,"leave":true,"leave_approve":false,"admin_crew":true,"admin_users":false,"scratchpad":true,"audit":false,"maint_bookings":false,"sign_loadsheet":false,"rezdy":false,"pay_week":false},
  "maint":        {"operations":false,"charter":false,"maintenance":true,"roster":false,"roster_edit":false,"leave":true,"leave_approve":false,"admin_crew":true,"admin_users":false,"scratchpad":false,"audit":false,"maint_bookings":true,"sign_loadsheet":false,"rezdy":false,"pay_week":false},
  "maintenance":  {"operations":false,"charter":false,"maintenance":true,"roster":false,"roster_edit":false,"leave":true,"leave_approve":false,"admin_crew":true,"admin_users":false,"scratchpad":false,"audit":false,"maint_bookings":true,"sign_loadsheet":false,"rezdy":false,"pay_week":false},
  "ground_staff": {"operations":false,"charter":false,"maintenance":false,"roster":false,"roster_edit":false,"leave":true,"leave_approve":false,"admin_crew":true,"admin_users":false,"scratchpad":false,"audit":false,"rezdy":false,"pay_week":false},
  "accounts":     {"operations":false,"charter":false,"maintenance":false,"roster":true,"roster_edit":false,"leave":true,"leave_approve":false,"admin_crew":false,"admin_users":false,"scratchpad":false,"audit":false,"rezdy":false,"pay_week":true},
  "marketing":    {"operations":false,"charter":false,"maintenance":false,"roster":false,"roster_edit":false,"leave":true,"leave_approve":false,"admin_crew":false,"admin_users":false,"scratchpad":false,"audit":false,"rezdy":false,"pay_week":false}
}
$json$::jsonb;
begin
  if v_role is null then return false; end if;
  if v_role = 'superadmin' then return true; end if;

  -- Grid override (ts_settings.role_perms is a JSON string of {role:{perm:bool}})
  begin
    select (value::jsonb) -> v_role -> perm
      into v_val
      from public.ts_settings
     where key = 'role_perms';
  exception when others then
    v_val := null;
  end;
  if v_val is not null and jsonb_typeof(v_val) = 'boolean' then
    return v_val::boolean;
  end if;

  -- Built-in default
  v_val := v_def -> v_role -> perm;
  if v_val is not null and jsonb_typeof(v_val) = 'boolean' then
    return v_val::boolean;
  end if;

  return false;
end$$;

grant execute on function public.has_perm(text) to authenticated, anon;

-- ----------------------------------------------------------------------------
-- DRY RUN: print the effective "can write" matrix for every role.
-- Compare each line to the Admin > Permissions grid. Nothing is enforced here.
-- ----------------------------------------------------------------------------
create or replace function pg_temp.perm_matrix()
returns table(role text, granted_permissions text)
language plpgsql
as $$
declare
  r text; p text; s text;
  roles text[] := array['admin','cx_manager','pilot','desk','maint','maintenance','ground_staff','accounts','marketing'];
  perms text[] := array['operations','charter','maintenance','roster','roster_edit','leave','leave_approve','admin_crew','admin_users','sign_loadsheet','maint_bookings','audit','pay_week','rezdy'];
begin
  foreach r in array roles loop
    perform set_config('request.jwt.claims',
      json_build_object('role','authenticated','user_role',r)::text, true);
    s := '';
    foreach p in array perms loop
      if public.has_perm(p) then s := s || p || ', '; end if;
    end loop;
    role := r;
    granted_permissions := coalesce(nullif(rtrim(s, ', '), ''), '(none)');
    return next;
  end loop;
  -- superadmin always-true check
  perform set_config('request.jwt.claims',
    json_build_object('role','authenticated','user_role','superadmin')::text, true);
  role := 'superadmin';
  granted_permissions := 'ALL (bypass) -> operations='||public.has_perm('operations')::text||', admin_users='||public.has_perm('admin_users')::text;
  return next;
end$$;

select * from pg_temp.perm_matrix();
