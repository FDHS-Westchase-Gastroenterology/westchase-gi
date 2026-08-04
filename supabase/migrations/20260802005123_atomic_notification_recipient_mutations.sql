create function public.portal_add_notification_recipient(
  p_actor_email text,
  p_email text,
  p_label text,
  p_active boolean
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_recipient_id uuid;
  v_email text := pg_catalog.lower(pg_catalog.btrim(p_email));
  v_label text := nullif(pg_catalog.btrim(p_label), '');
begin
  if p_email is null
    or v_email = ''
    or pg_catalog.char_length(v_email) > 254
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    or p_active is null
  then
    raise exception 'A valid recipient email and active state are required'
      using errcode = '22023';
  end if;

  if v_label is not null and pg_catalog.char_length(v_label) > 120 then
    raise exception 'Labels must be at most 120 characters'
      using errcode = '22023';
  end if;

  insert into public.notification_recipients (
    email,
    label,
    active
  ) values (
    v_email,
    v_label,
    p_active
  )
  returning id into v_recipient_id;

  insert into public.audit_log (
    actor_email,
    action,
    entity,
    entity_id,
    source,
    correlation_id,
    detail
  ) values (
    p_actor_email,
    'recipients.add',
    'notification_recipients',
    v_recipient_id,
    'staff',
    pg_catalog.gen_random_uuid(),
    pg_catalog.jsonb_build_object(
      'active', p_active,
      'has_label', v_label is not null
    )
  );

  return v_recipient_id;
end;
$$;

create function public.portal_toggle_notification_recipient(
  p_actor_email text,
  p_recipient_id uuid,
  p_active boolean
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_previous_active boolean;
begin
  if p_active is null then
    raise exception 'An active state is required' using errcode = '22023';
  end if;

  select active
  into v_previous_active
  from public.notification_recipients
  where id = p_recipient_id
  for update;

  if not found then
    raise exception 'Notification recipient not found' using errcode = 'P0002';
  end if;

  if v_previous_active = p_active then
    return false;
  end if;

  update public.notification_recipients
  set active = p_active
  where id = p_recipient_id;

  insert into public.audit_log (
    actor_email,
    action,
    entity,
    entity_id,
    source,
    correlation_id,
    detail
  ) values (
    p_actor_email,
    'recipients.toggle',
    'notification_recipients',
    p_recipient_id,
    'staff',
    pg_catalog.gen_random_uuid(),
    pg_catalog.jsonb_build_object(
      'from', v_previous_active,
      'to', p_active
    )
  );

  return true;
end;
$$;

create function public.portal_remove_notification_recipient(
  p_actor_email text,
  p_recipient_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_active boolean;
begin
  select active
  into v_active
  from public.notification_recipients
  where id = p_recipient_id
  for update;

  if not found then
    raise exception 'Notification recipient not found' using errcode = 'P0002';
  end if;

  delete from public.notification_recipients
  where id = p_recipient_id;

  insert into public.audit_log (
    actor_email,
    action,
    entity,
    entity_id,
    source,
    correlation_id,
    detail
  ) values (
    p_actor_email,
    'recipients.remove',
    'notification_recipients',
    p_recipient_id,
    'staff',
    pg_catalog.gen_random_uuid(),
    pg_catalog.jsonb_build_object('active', v_active)
  );

  return true;
end;
$$;

revoke execute on function public.portal_add_notification_recipient(
  text,
  text,
  text,
  boolean
) from public, anon, authenticated;
revoke execute on function public.portal_toggle_notification_recipient(
  text,
  uuid,
  boolean
) from public, anon, authenticated;
revoke execute on function public.portal_remove_notification_recipient(text, uuid)
  from public, anon, authenticated;

grant execute on function public.portal_add_notification_recipient(
  text,
  text,
  text,
  boolean
) to service_role;
grant execute on function public.portal_toggle_notification_recipient(
  text,
  uuid,
  boolean
) to service_role;
grant execute on function public.portal_remove_notification_recipient(text, uuid)
  to service_role;
