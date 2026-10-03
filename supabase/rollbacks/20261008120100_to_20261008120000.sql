-- Reverses 20261008120100_drop_portal_tour_dismissed_at: restores the single tour's column and
-- command. An account with a running tour has the old tour undismissed; one with any finished or
-- skipped tour has it dismissed at its latest record.

alter table public.staff_profiles add column portal_tour_dismissed_at timestamptz;

update public.staff_profiles p
set portal_tour_dismissed_at = (
  select max(t.recorded_at) from public.staff_tours t where t.staff_user_id = p.user_id
)
where exists (select 1 from public.staff_tours t where t.staff_user_id = p.user_id)
  and not exists (
    select 1 from public.staff_tours t where t.staff_user_id = p.user_id and t.status = 'pending'
  );


create or replace function public.portal_set_staff_tour_dismissed(
  p_user_id uuid,
  p_dismissed boolean
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_email text;
  v_dismissed_at timestamptz;
begin
  if p_dismissed is null then
    raise exception 'Tour dismissal state is required' using errcode = '22023';
  end if;

  select id, email, portal_tour_dismissed_at
  into v_profile_id, v_email, v_dismissed_at
  from public.staff_profiles
  where user_id = p_user_id
    and active
    and onboarded_at is not null
  for update;

  if not found then
    raise exception 'Active onboarded staff profile not found'
      using errcode = 'P0002';
  end if;

  if (p_dismissed and v_dismissed_at is not null)
    or (not p_dismissed and v_dismissed_at is null)
  then
    return false;
  end if;

  update public.staff_profiles
  set portal_tour_dismissed_at = case
    when p_dismissed then pg_catalog.now()
    else null
  end
  where id = v_profile_id;

  insert into public.audit_log (
    actor_email,
    action,
    entity,
    entity_id,
    source,
    correlation_id,
    detail
  ) values (
    v_email,
    case
      when p_dismissed then 'staff.tour_dismiss'
      else 'staff.tour_restart'
    end,
    'staff_profiles',
    v_profile_id,
    'staff',
    pg_catalog.gen_random_uuid(),
    pg_catalog.jsonb_build_object('dismissed', p_dismissed)
  );

  return true;
end;
$$;

revoke execute on function public.portal_set_staff_tour_dismissed(uuid, boolean)
from public, anon, authenticated;

grant execute on function public.portal_set_staff_tour_dismissed(uuid, boolean)
to service_role;
