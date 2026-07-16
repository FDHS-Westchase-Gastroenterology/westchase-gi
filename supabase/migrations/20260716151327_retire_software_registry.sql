do $$
begin
  if exists (
    select 1
    from public.registry_assets
    where name not in ('Westchase GI website', 'Staff admin portal')
  ) then
    raise exception 'Unexpected software registry asset; retirement stopped';
  end if;
end;
$$;

insert into public.audit_log (
  actor_email,
  action,
  entity,
  detail
)
select
  'system@migration.invalid',
  'system.domain_retired',
  'software_registry',
  pg_catalog.jsonb_build_object(
    'change', 'software_registry_retired',
    'asset_count', (select pg_catalog.count(*) from public.registry_assets),
    'grant_count', (select pg_catalog.count(*) from public.registry_grants)
  );

drop function public.portal_create_registry_asset(text, text, text, text, text, text, text, text, text);
drop function public.portal_update_registry_asset(text, uuid, text, text, text, text, text, text, text, text);
drop function public.portal_archive_registry_asset(text, uuid);
drop function public.portal_add_registry_grant(text, uuid, text, text, text);
drop function public.portal_deactivate_registry_grant(text, uuid);

drop table public.registry_grants;
drop table public.registry_assets;
