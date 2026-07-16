revoke select on table
  public.requests,
  public.request_events,
  public.notification_recipients,
  public.staff_profiles,
  public.registry_assets,
  public.registry_grants,
  public.audit_log
from authenticated;

drop policy if exists requests_staff_read on public.requests;
drop policy if exists request_events_staff_read on public.request_events;
drop policy if exists notification_recipients_staff_read on public.notification_recipients;
drop policy if exists staff_profiles_self_read on public.staff_profiles;
drop policy if exists registry_assets_portal_read on public.registry_assets;
drop policy if exists registry_grants_portal_read on public.registry_grants;
drop policy if exists audit_log_staff_read on public.audit_log;

create function public.portal_create_registry_asset(
  p_actor_email text,
  p_name text,
  p_kind text,
  p_repo text,
  p_live_url text,
  p_hosting text,
  p_maintainer text,
  p_status text,
  p_notes text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_asset_id uuid;
begin
  insert into public.registry_assets (
    name,
    kind,
    repo,
    live_url,
    hosting,
    maintainer,
    status,
    notes
  ) values (
    p_name,
    p_kind,
    p_repo,
    p_live_url,
    p_hosting,
    p_maintainer,
    p_status,
    p_notes
  )
  returning id into v_asset_id;

  insert into public.audit_log (
    actor_email,
    action,
    entity,
    entity_id,
    detail
  ) values (
    p_actor_email,
    'registry.create',
    'registry_assets',
    v_asset_id,
    pg_catalog.jsonb_build_object('name', p_name)
  );

  return v_asset_id;
end;
$$;

create function public.portal_update_registry_asset(
  p_actor_email text,
  p_asset_id uuid,
  p_name text,
  p_kind text,
  p_repo text,
  p_live_url text,
  p_hosting text,
  p_maintainer text,
  p_status text,
  p_notes text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_asset_id uuid;
begin
  update public.registry_assets
  set
    name = p_name,
    kind = p_kind,
    repo = p_repo,
    live_url = p_live_url,
    hosting = p_hosting,
    maintainer = p_maintainer,
    status = p_status,
    notes = p_notes
  where id = p_asset_id
  returning id into v_asset_id;

  if not found then
    raise exception 'Asset not found' using errcode = 'P0002';
  end if;

  insert into public.audit_log (
    actor_email,
    action,
    entity,
    entity_id,
    detail
  ) values (
    p_actor_email,
    'registry.update',
    'registry_assets',
    v_asset_id,
    pg_catalog.jsonb_build_object('name', p_name)
  );

  return v_asset_id;
end;
$$;

create function public.portal_archive_registry_asset(
  p_actor_email text,
  p_asset_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_previous_status text;
begin
  select status
  into v_previous_status
  from public.registry_assets
  where id = p_asset_id
  for update;

  if not found then
    raise exception 'Asset not found' using errcode = 'P0002';
  end if;

  if v_previous_status = 'archived' then
    return false;
  end if;

  update public.registry_assets
  set status = 'archived'
  where id = p_asset_id;

  insert into public.audit_log (
    actor_email,
    action,
    entity,
    entity_id,
    detail
  ) values (
    p_actor_email,
    'registry.archive',
    'registry_assets',
    p_asset_id,
    pg_catalog.jsonb_build_object('from', v_previous_status)
  );

  return true;
end;
$$;

create function public.portal_add_registry_grant(
  p_actor_email text,
  p_asset_id uuid,
  p_person text,
  p_role text,
  p_granted_via text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_grant_id uuid;
begin
  perform 1
  from public.registry_assets
  where id = p_asset_id
  for key share;

  if not found then
    raise exception 'Asset not found' using errcode = 'P0002';
  end if;

  insert into public.registry_grants (
    asset_id,
    person,
    role,
    granted_via,
    active
  ) values (
    p_asset_id,
    p_person,
    p_role,
    p_granted_via,
    true
  )
  returning id into v_grant_id;

  insert into public.audit_log (
    actor_email,
    action,
    entity,
    entity_id,
    detail
  ) values (
    p_actor_email,
    'registry.update',
    'registry_grants',
    v_grant_id,
    pg_catalog.jsonb_build_object(
      'change', 'grant_added',
      'person', p_person
    )
  );

  return v_grant_id;
end;
$$;

create function public.portal_deactivate_registry_grant(
  p_actor_email text,
  p_grant_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_active boolean;
  v_person text;
begin
  select active, person
  into v_active, v_person
  from public.registry_grants
  where id = p_grant_id
  for update;

  if not found then
    raise exception 'Grant not found' using errcode = 'P0002';
  end if;

  if not v_active then
    return false;
  end if;

  update public.registry_grants
  set active = false
  where id = p_grant_id;

  insert into public.audit_log (
    actor_email,
    action,
    entity,
    entity_id,
    detail
  ) values (
    p_actor_email,
    'registry.update',
    'registry_grants',
    p_grant_id,
    pg_catalog.jsonb_build_object(
      'change', 'grant_deactivated',
      'person', v_person
    )
  );

  return true;
end;
$$;

create function public.portal_update_request_status(
  p_actor_email text,
  p_request_id uuid,
  p_next_status text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_previous_status text;
begin
  select status
  into v_previous_status
  from public.requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;

  if v_previous_status = p_next_status then
    return false;
  end if;

  update public.requests
  set status = p_next_status
  where id = p_request_id;

  insert into public.audit_log (
    actor_email,
    action,
    entity,
    entity_id,
    detail
  ) values (
    p_actor_email,
    'request.status_change',
    'requests',
    p_request_id,
    pg_catalog.jsonb_build_object(
      'from', v_previous_status,
      'to', p_next_status
    )
  );

  return true;
end;
$$;

create function public.portal_add_request_note(
  p_actor_email text,
  p_request_id uuid,
  p_note text,
  p_note_length integer
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_event_id uuid;
begin
  if p_note is null
    or p_note = ''
    or p_note <> pg_catalog.btrim(p_note)
    or p_note_length is null
    or p_note_length not between 1 and 2000
  then
    raise exception 'Notes must be 1-2000 trimmed characters'
      using errcode = '22023';
  end if;

  perform 1
  from public.requests
  where id = p_request_id
  for key share;

  if not found then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;

  insert into public.request_events (
    request_id,
    type,
    status,
    meta
  ) values (
    p_request_id,
    'note',
    'recorded',
    pg_catalog.jsonb_build_object(
      'text', p_note,
      'author_email', p_actor_email
    )
  )
  returning id into v_event_id;

  insert into public.audit_log (
    actor_email,
    action,
    entity,
    entity_id,
    detail
  ) values (
    p_actor_email,
    'request.note',
    'requests',
    p_request_id,
    pg_catalog.jsonb_build_object(
      'length', p_note_length
    )
  );

  return v_event_id;
end;
$$;

revoke execute on function public.portal_create_registry_asset(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from public, anon, authenticated;
revoke execute on function public.portal_update_registry_asset(
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from public, anon, authenticated;
revoke execute on function public.portal_archive_registry_asset(text, uuid)
  from public, anon, authenticated;
revoke execute on function public.portal_add_registry_grant(
  text,
  uuid,
  text,
  text,
  text
) from public, anon, authenticated;
revoke execute on function public.portal_deactivate_registry_grant(text, uuid)
  from public, anon, authenticated;
revoke execute on function public.portal_update_request_status(text, uuid, text)
  from public, anon, authenticated;
revoke execute on function public.portal_add_request_note(text, uuid, text, integer)
  from public, anon, authenticated;

grant execute on function public.portal_create_registry_asset(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to service_role;
grant execute on function public.portal_update_registry_asset(
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to service_role;
grant execute on function public.portal_archive_registry_asset(text, uuid)
  to service_role;
grant execute on function public.portal_add_registry_grant(
  text,
  uuid,
  text,
  text,
  text
) to service_role;
grant execute on function public.portal_deactivate_registry_grant(text, uuid)
  to service_role;
grant execute on function public.portal_update_request_status(text, uuid, text)
  to service_role;
grant execute on function public.portal_add_request_note(text, uuid, text, integer)
  to service_role;
