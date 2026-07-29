create table public.portal_release_states (
  staff_user_id uuid not null
    references public.staff_profiles(user_id) on delete cascade,
  release_id text not null,
  first_opened_at timestamptz not null default pg_catalog.now(),
  acknowledged_at timestamptz,
  hidden_at timestamptz,
  constraint portal_release_states_pkey
    primary key (staff_user_id, release_id),
  constraint portal_release_states_release_id_valid
    check (
      release_id = pg_catalog.btrim(release_id)
      and pg_catalog.char_length(release_id) between 1 and 80
      and release_id ~ '^[a-z0-9][a-z0-9._-]*$'
    )
);

alter table public.portal_release_states enable row level security;

revoke all on table public.portal_release_states
from public, anon, authenticated;

grant select, insert, update, delete on table public.portal_release_states
to service_role;

create function public.portal_open_staff_release(
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

create function public.portal_acknowledge_staff_release(
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

  update public.portal_release_states
  set acknowledged_at = pg_catalog.now()
  where staff_user_id = p_user_id
    and release_id = p_release_id
    and acknowledged_at is null;

  v_changed := found;

  if not v_changed and not exists (
    select 1
    from public.portal_release_states
    where staff_user_id = p_user_id
      and release_id = p_release_id
  ) then
    raise exception 'Release state not found' using errcode = 'P0002';
  end if;

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
      'staff.release_acknowledge',
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

create function public.portal_hide_staff_release(
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

  update public.portal_release_states
  set hidden_at = pg_catalog.now()
  where staff_user_id = p_user_id
    and release_id = p_release_id
    and hidden_at is null;

  v_changed := found;

  if not v_changed and not exists (
    select 1
    from public.portal_release_states
    where staff_user_id = p_user_id
      and release_id = p_release_id
  ) then
    raise exception 'Release state not found' using errcode = 'P0002';
  end if;

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
      'staff.release_hide',
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
revoke execute on function public.portal_acknowledge_staff_release(uuid, text)
from public, anon, authenticated;
revoke execute on function public.portal_hide_staff_release(uuid, text)
from public, anon, authenticated;

grant execute on function public.portal_open_staff_release(uuid, text)
to service_role;
grant execute on function public.portal_acknowledge_staff_release(uuid, text)
to service_role;
grant execute on function public.portal_hide_staff_release(uuid, text)
to service_role;
