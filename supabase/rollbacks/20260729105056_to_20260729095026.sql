-- Manual rollback for 20260729105056_add_portal_release_engagement_telemetry.
-- Run only with the preceding application deployment ready. This refuses to
-- silently discard staff engagement events collected after the migration.

do $$
begin
  if exists (
    select 1
    from public.portal_release_states
    where view_count <> 1
      or last_viewed_at <> first_opened_at
      or guide_open_count <> 0
      or guide_opened_at is not null
      or last_guide_opened_at is not null
      or dismiss_count <> 0
      or last_dismissed_at is not null
  ) then
    raise exception
      'Rollback blocked: portal release engagement telemetry would be discarded'
      using errcode = '55000';
  end if;
end;
$$;

drop function public.portal_record_staff_release_dismiss(uuid, text);
drop function public.portal_record_staff_release_guide_open(uuid, text);

alter table public.portal_release_states
  drop constraint portal_release_states_dismiss_engagement_valid,
  drop constraint portal_release_states_guide_engagement_valid,
  drop constraint portal_release_states_view_timestamps_valid,
  drop constraint portal_release_states_view_count_valid,
  drop column dismiss_count,
  drop column last_dismissed_at,
  drop column guide_open_count,
  drop column last_guide_opened_at,
  drop column guide_opened_at,
  drop column view_count,
  drop column last_viewed_at;

create or replace function public.portal_open_staff_release(
  p_user_id uuid,
  p_release_id text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_email text;
  v_changed boolean := false;
begin
  if p_user_id is null
    or p_release_id is null
    or p_release_id <> pg_catalog.btrim(p_release_id)
    or pg_catalog.char_length(p_release_id) not between 1 and 80
    or p_release_id !~ '^[a-z0-9][a-z0-9._-]*$'
  then
    raise exception 'A valid staff user and release identifier are required'
      using errcode = '22023';
  end if;

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

  insert into public.portal_release_states (
    staff_user_id,
    release_id
  ) values (
    p_user_id,
    p_release_id
  )
  on conflict (staff_user_id, release_id) do nothing;

  v_changed := found;

  if v_changed then
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
      'staff.release_open',
      'portal_release_states',
      v_profile_id,
      'staff',
      pg_catalog.gen_random_uuid(),
      pg_catalog.jsonb_build_object('release_id', p_release_id)
    );
  end if;

  return v_changed;
end;
$$;

revoke execute on function public.portal_open_staff_release(uuid, text)
from public, anon, authenticated;

grant execute on function public.portal_open_staff_release(uuid, text)
to service_role;
