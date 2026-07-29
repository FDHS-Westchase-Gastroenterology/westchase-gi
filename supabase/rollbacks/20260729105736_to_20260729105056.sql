-- Manual rollback for 20260729105736_fix_portal_release_guide_timestamp.
-- This restores the preceding function definition, including its known
-- invalid schema qualification. Prefer rolling the application forward.

create or replace function public.portal_record_staff_release_guide_open(
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
  v_event_at timestamptz := pg_catalog.now();
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

  update public.portal_release_states
  set
    guide_opened_at = pg_catalog.coalesce(guide_opened_at, v_event_at),
    last_guide_opened_at = v_event_at,
    guide_open_count = guide_open_count + 1
  where staff_user_id = p_user_id
    and release_id = p_release_id
    and guide_open_count < 2147483647;

  v_changed := found;

  if not v_changed then
    if exists (
      select 1
      from public.portal_release_states
      where staff_user_id = p_user_id
        and release_id = p_release_id
    ) then
      raise exception 'Release guide open count limit reached'
        using errcode = '22003';
    end if;

    raise exception 'Release state not found' using errcode = 'P0002';
  end if;

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
    'staff.release_guide_open',
    'portal_release_states',
    v_profile_id,
    'staff',
    pg_catalog.gen_random_uuid(),
    pg_catalog.jsonb_build_object('release_id', p_release_id)
  );

  return true;
end;
$$;

revoke execute on function public.portal_record_staff_release_guide_open(uuid, text)
from public, anon, authenticated;

grant execute on function public.portal_record_staff_release_guide_open(uuid, text)
to service_role;
