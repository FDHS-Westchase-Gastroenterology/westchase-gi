create table public.staff_request_receipts (
  idempotency_key uuid primary key,
  actor_email text not null
    constraint staff_request_receipts_actor_valid check (
      actor_email = pg_catalog.lower(pg_catalog.btrim(actor_email))
      and actor_email <> ''
      and pg_catalog.char_length(actor_email) <= 254
    ),
  payload_fingerprint text not null
    constraint staff_request_receipts_fingerprint_valid
      check (payload_fingerprint ~ '^[0-9a-f]{64}$'),
  request_id uuid not null unique references public.requests(id) on delete cascade,
  created_at timestamptz not null default pg_catalog.now()
);

alter table public.staff_request_receipts enable row level security;
revoke all on public.staff_request_receipts from public, anon, authenticated;
grant select, insert on public.staff_request_receipts to service_role;

create function public.portal_create_staff_request(
  p_actor_email text,
  p_idempotency_key uuid,
  p_request jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor_email text;
  v_email text;
  v_fingerprint text;
  v_message text;
  v_name text;
  v_phone text;
  v_receipt public.staff_request_receipts%rowtype;
  v_request_id uuid;
begin
  v_actor_email := pg_catalog.lower(pg_catalog.btrim(p_actor_email));
  if p_actor_email is null
    or p_actor_email <> pg_catalog.btrim(p_actor_email)
    or v_actor_email = ''
    or pg_catalog.char_length(v_actor_email) > 254
    or v_actor_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or p_idempotency_key is null
  then
    raise exception 'Invalid staff request identity' using errcode = '22023';
  end if;

  if p_request is null
    or pg_catalog.jsonb_typeof(p_request) <> 'object'
    or not p_request ?& array['name', 'phone', 'email', 'location', 'preferred_time', 'message']
    or (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(p_request)) <> 6
    or pg_catalog.jsonb_typeof(p_request->'name') <> 'string'
    or pg_catalog.jsonb_typeof(p_request->'phone') <> 'string'
    or pg_catalog.jsonb_typeof(p_request->'location') <> 'string'
    or pg_catalog.jsonb_typeof(p_request->'preferred_time') <> 'string'
    or pg_catalog.jsonb_typeof(p_request->'email') not in ('string', 'null')
    or pg_catalog.jsonb_typeof(p_request->'message') not in ('string', 'null')
  then
    raise exception 'Invalid staff request payload' using errcode = '22023';
  end if;

  v_name := p_request->>'name';
  v_phone := p_request->>'phone';
  v_email := nullif(p_request->>'email', '');
  v_message := nullif(p_request->>'message', '');

  if v_name <> pg_catalog.btrim(v_name)
    or v_name = ''
    or pg_catalog.char_length(v_name) > 120
    or v_phone <> pg_catalog.btrim(v_phone)
    or v_phone = ''
    or pg_catalog.char_length(v_phone) > 32
    or pg_catalog.char_length(pg_catalog.regexp_replace(v_phone, '[^0-9]', '', 'g')) < 10
    or (v_email is not null and (
      v_email <> pg_catalog.btrim(v_email)
      or pg_catalog.char_length(v_email) > 254
      or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ))
    or (v_message is not null and (
      v_message <> pg_catalog.btrim(v_message)
      or pg_catalog.char_length(v_message) > 2000
    ))
    or p_request->>'location' not in ('any', 'tampa', 'lutz')
    or p_request->>'preferred_time' not in ('any', 'morning', 'afternoon')
  then
    raise exception 'Invalid staff request payload' using errcode = '22023';
  end if;

  v_fingerprint := pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(
        pg_catalog.jsonb_build_object(
          'email', v_email,
          'location', p_request->>'location',
          'message', v_message,
          'name', v_name,
          'phone', v_phone,
          'preferred_time', p_request->>'preferred_time'
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_idempotency_key::text, 0)
  );
  select * into v_receipt
  from public.staff_request_receipts
  where idempotency_key = p_idempotency_key;

  if found then
    if v_receipt.actor_email = v_actor_email
      and v_receipt.payload_fingerprint = v_fingerprint
    then
      return v_receipt.request_id;
    end if;
    raise exception 'Staff request idempotency conflict' using errcode = '23505';
  end if;

  insert into public.requests (
    name, phone, email, location, preferred_time, message, locale, source_path
  ) values (
    v_name,
    v_phone,
    v_email,
    p_request->>'location',
    p_request->>'preferred_time',
    v_message,
    'en',
    '/admin/requests/new'
  ) returning id into v_request_id;

  insert into public.request_events (request_id, type, status, meta)
  values (v_request_id, 'created', 'recorded', '{"origin":"staff"}'::jsonb);

  insert into public.audit_log (
    actor_email, action, entity, entity_id, source, correlation_id, detail
  ) values (
    v_actor_email,
    'request.create',
    'requests',
    v_request_id,
    'staff',
    pg_catalog.gen_random_uuid(),
    '{"origin":"staff"}'::jsonb
  );

  insert into public.staff_request_receipts (
    idempotency_key, actor_email, payload_fingerprint, request_id
  ) values (
    p_idempotency_key, v_actor_email, v_fingerprint, v_request_id
  );

  return v_request_id;
end;
$$;

revoke execute on function public.portal_create_staff_request(text, uuid, jsonb)
from public, anon, authenticated;
grant execute on function public.portal_create_staff_request(text, uuid, jsonb)
to service_role;
