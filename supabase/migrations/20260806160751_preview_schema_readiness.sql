-- The Preview readiness endpoint calls this with the server-only service role.
-- The complete applied-version set detects missing older migrations as well as
-- a stale latest migration. No application or patient data is exposed.
create function public.portal_preview_schema_readiness()
returns text[]
language sql
security definer
set search_path = ''
as $$
  select coalesce(
    pg_catalog.array_agg(m.version::text order by m.version::text),
    '{}'::text[]
  )
  from supabase_migrations.schema_migrations as m
$$;

revoke execute on function public.portal_preview_schema_readiness()
  from public, anon, authenticated;
grant execute on function public.portal_preview_schema_readiness() to service_role;
