with changed_assets as (
  update public.registry_assets
  set
    repo = 'FDHS-Westchase-Gastroenterology/westchase-gi',
    hosting = 'Vercel project: westchase-gi (clinic-owned Hobby account)',
    maintainer = 'Clinic-owned; ASTXRTYS — Write collaborator'
  where name in ('Westchase GI website', 'Staff admin portal')
    and row(repo, hosting, maintainer) is distinct from row(
      'FDHS-Westchase-Gastroenterology/westchase-gi',
      'Vercel project: westchase-gi (clinic-owned Hobby account)',
      'Clinic-owned; ASTXRTYS — Write collaborator'
    )
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
    'change', 'clinic_custody_sync',
    'asset_name', name,
    'source', 'issue_20'
  )
from changed_assets;
