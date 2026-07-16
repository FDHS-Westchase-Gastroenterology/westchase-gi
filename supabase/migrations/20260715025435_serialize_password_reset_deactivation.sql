create or replace function public.portal_record_staff_password_reset(
  p_user_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_email text;
begin
  select id, email
  into v_profile_id, v_email
  from public.staff_profiles
  where user_id = p_user_id
    and active
    and onboarded_at is not null
  for update;

  if not found then
    raise exception 'Active onboarded staff profile not found'
      using errcode = 'P0002';
  end if;

  insert into public.audit_log (
    actor_email,
    action,
    entity,
    entity_id,
    detail
  ) values (
    v_email,
    'staff.password_reset',
    'staff_profiles',
    v_profile_id,
    pg_catalog.jsonb_build_object('user_id', p_user_id)
  );

  return true;
end;
$$;

revoke execute on function public.portal_record_staff_password_reset(uuid)
from public, anon, authenticated;

grant execute on function public.portal_record_staff_password_reset(uuid)
to service_role;
