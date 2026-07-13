do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute
      'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

drop policy if exists staff_profiles_admin_read on public.staff_profiles;

drop policy if exists registry_assets_portal_read on public.registry_assets;
create policy registry_assets_portal_read
on public.registry_assets
for select
to authenticated
using (
  ((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin', 'staff')
);

drop policy if exists registry_grants_portal_read on public.registry_grants;
create policy registry_grants_portal_read
on public.registry_grants
for select
to authenticated
using (
  ((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('admin', 'staff')
);

