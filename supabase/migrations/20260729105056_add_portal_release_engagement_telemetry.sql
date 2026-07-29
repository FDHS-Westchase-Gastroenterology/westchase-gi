alter table public.portal_release_states
  add column last_viewed_at timestamptz
    default pg_catalog.now(),
  add column view_count integer not null default 1,
  add column guide_opened_at timestamptz,
  add column last_guide_opened_at timestamptz,
  add column guide_open_count integer not null default 0,
  add column last_dismissed_at timestamptz,
  add column dismiss_count integer not null default 0;

update public.portal_release_states
set
  last_viewed_at = first_opened_at,
  view_count = 1,
  guide_opened_at = null,
  last_guide_opened_at = null,
  guide_open_count = 0,
  last_dismissed_at = null,
  dismiss_count = 0;

alter table public.portal_release_states
  alter column last_viewed_at set not null,
  add constraint portal_release_states_view_count_valid
    check (view_count between 1 and 2147483647),
  add constraint portal_release_states_view_timestamps_valid
    check (last_viewed_at >= first_opened_at),
  add constraint portal_release_states_guide_engagement_valid
    check (
      (
        guide_open_count = 0
        and guide_opened_at is null
        and last_guide_opened_at is null
      )
      or (
        guide_open_count between 1 and 2147483647
        and guide_opened_at is not null
        and last_guide_opened_at is not null
        and last_guide_opened_at >= guide_opened_at
      )
    ),
  add constraint portal_release_states_dismiss_engagement_valid
    check (
      (
        dismiss_count = 0
        and last_dismissed_at is null
      )
      or (
        dismiss_count between 1 and 2147483647
        and last_dismissed_at is not null
      )
    );

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
  v_event_at timestamptz := pg_catalog.now();
  v_created boolean := false;
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
    release_id,
    first_opened_at,
    last_viewed_at,
    view_count
  ) values (
    p_user_id,
    p_release_id,
    v_event_at,
    v_event_at,
    1
  )
  on conflict (staff_user_id, release_id) do nothing;

  v_created := found;

  if v_created then
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

    return true;
  end if;

  update public.portal_release_states
  set
    last_viewed_at = v_event_at,
    view_count = view_count + 1
  where staff_user_id = p_user_id
    and release_id = p_release_id
    and view_count < 2147483647;

  v_changed := found;

  if not v_changed then
    if exists (
      select 1
      from public.portal_release_states
      where staff_user_id = p_user_id
        and release_id = p_release_id
    ) then
      raise exception 'Release view count limit reached'
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
    'staff.release_view',
    'portal_release_states',
    v_profile_id,
    'staff',
    pg_catalog.gen_random_uuid(),
    pg_catalog.jsonb_build_object('release_id', p_release_id)
  );

  return false;
end;
$$;

create function public.portal_record_staff_release_guide_open(
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

create function public.portal_record_staff_release_dismiss(
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
    last_dismissed_at = v_event_at,
    dismiss_count = dismiss_count + 1
  where staff_user_id = p_user_id
    and release_id = p_release_id
    and dismiss_count < 2147483647;

  v_changed := found;

  if not v_changed then
    if exists (
      select 1
      from public.portal_release_states
      where staff_user_id = p_user_id
        and release_id = p_release_id
    ) then
      raise exception 'Release dismiss count limit reached'
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
    'staff.release_dismiss',
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
revoke execute on function public.portal_record_staff_release_dismiss(uuid, text)
from public, anon, authenticated;

grant execute on function public.portal_record_staff_release_guide_open(uuid, text)
to service_role;
grant execute on function public.portal_record_staff_release_dismiss(uuid, text)
to service_role;
