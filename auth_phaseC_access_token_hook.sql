-- ============================================================================
-- Phase C — Custom Access Token Hook + claim-aware helpers
-- ============================================================================
-- Stamps the app's TEXT id + role into every issued JWT so RLS policies can read
-- them with no per-row profiles lookup, and the client can map the Auth user back
-- to its app identity.
--
-- AFTER running this: Dashboard -> Authentication -> Hooks -> "Custom Access Token"
-- -> enable -> select public.custom_access_token_hook.
-- ============================================================================

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims   jsonb;
  v_app_id text;
  v_role   text;
begin
  select app_id, role
    into v_app_id, v_role
  from public.profiles
  where auth_uid = (event->>'user_id')::uuid;

  claims := coalesce(event->'claims', '{}'::jsonb);
  if v_app_id is not null then
    claims := jsonb_set(claims, '{app_id}',    to_jsonb(v_app_id));
    claims := jsonb_set(claims, '{user_role}', to_jsonb(coalesce(v_role, 'desk')));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- The Auth server (supabase_auth_admin) must run the hook and read profiles.
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant usage  on schema public to supabase_auth_admin;
grant select on public.profiles to supabase_auth_admin;
-- Nobody else may call the hook.
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- ----------------------------------------------------------------------------
-- Claim-aware helpers (override the Phase 0 versions). Read the JWT claim first
-- (fast, no query), fall back to the profiles table.
-- ----------------------------------------------------------------------------
create or replace function public.app_id() returns text
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'app_id', ''),
    (select app_id from public.profiles where auth_uid = auth.uid())
  );
$$;

create or replace function public.app_role() returns text
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'user_role', ''),
    (select role from public.profiles where auth_uid = auth.uid()),
    'desk'
  );
$$;

-- ROLLBACK:
--   alter ... disable the hook in the Dashboard, then optionally:
--   drop function if exists public.custom_access_token_hook(jsonb);
--   (and restore the Phase 0 helper bodies if desired)
