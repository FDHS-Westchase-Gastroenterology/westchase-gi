with retired_asset as (
  delete from public.registry_assets
  where name = 'Review QR print tool'
  returning id, name
)
insert into public.audit_log (
  actor_email,
  action,
  entity,
  entity_id,
  detail
)
select
  'system@migration.invalid',
  'registry.update',
  'registry_assets',
  id,
  jsonb_build_object(
    'change', 'review_qr_print_tool_retired',
    'asset_name', name,
    'source', 'issue_26'
  )
from retired_asset;
