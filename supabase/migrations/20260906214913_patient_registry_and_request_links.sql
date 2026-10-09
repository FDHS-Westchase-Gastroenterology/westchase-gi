create extension if not exists pg_trgm with schema extensions;

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name = btrim(name) and char_length(name) between 1 and 120),
  date_of_birth date check (
    date_of_birth >= date '0001-01-01'
    and date_of_birth <= (now() at time zone 'America/New_York')::date
  ),
  phone text check (
    phone = btrim(phone) and char_length(phone) between 1 and 32
    and char_length(regexp_replace(phone, '[^0-9]', '', 'g')) >= 10
  ),
  email text check (
    email = btrim(email) and char_length(email) between 3 and 254
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  archived_at timestamptz,
  version bigint not null default 1 check (version between 1 and 9007199254740991),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null,
  updated_by uuid not null,
  search_text text generated always as (
    lower(name || ' ' || coalesce(email, '') || ' ' || coalesce(phone, '') || ' ' ||
      regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'))
  ) stored
);

create index patients_name_id_idx on public.patients ((archived_at is not null), lower(name), id);
create index patients_search_idx on public.patients using gin (search_text extensions.gin_trgm_ops);

-- Intake can expire without deleting the patient or the patient's later records.
create table public.patient_request_links (
  request_id uuid primary key references public.requests(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete restrict,
  linked_at timestamptz not null default now(),
  linked_by uuid not null
);
create index patient_request_links_patient_idx on public.patient_request_links(patient_id, request_id);

create table public.patient_revisions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  version bigint not null,
  command text not null check (command in ('create', 'update', 'set_archived', 'link_request', 'unlink_request')),
  before_record jsonb,
  after_record jsonb not null,
  request_id uuid,
  actor_id uuid not null,
  actor_email text not null check (char_length(btrim(actor_email)) between 1 and 254),
  occurred_at timestamptz not null default now(),
  unique (patient_id, version)
);

create table public.patient_command_receipts (
  idempotency_key uuid primary key,
  patient_id uuid not null references public.patients(id) on delete cascade,
  actor_id uuid not null,
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  result jsonb not null,
  created_at timestamptz not null default now()
);
create index patient_command_receipts_patient_idx on public.patient_command_receipts(patient_id);

alter table public.patients enable row level security;
alter table public.patient_request_links enable row level security;
alter table public.patient_revisions enable row level security;
alter table public.patient_command_receipts enable row level security;
revoke all on public.patients, public.patient_request_links, public.patient_revisions,
  public.patient_command_receipts from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.patients to service_role;
grant select, insert, delete on public.patient_request_links to service_role;
grant select, insert on public.patient_revisions, public.patient_command_receipts to service_role;

create function public.portal_execute_patient_command(
  p_actor_id uuid,
  p_idempotency_key uuid,
  p_fingerprint text,
  p_command jsonb
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  v_staff public.staff_profiles%rowtype;
  v_patient public.patients%rowtype;
  v_before jsonb;
  v_receipt public.patient_command_receipts%rowtype;
  v_kind text;
  v_fields jsonb;
  v_patient_id uuid;
  v_request_id uuid;
  v_linked_patient uuid;
  v_version bigint;
  v_archived boolean;
  v_birth_date date;
  v_now timestamptz;
  v_result jsonb;
begin
  -- A deactivation either precedes this decision or waits for it to commit.
  select * into v_staff from public.staff_profiles
  where user_id = p_actor_id and active and onboarded_at is not null for share;
  if not found then return jsonb_build_object('ok', false, 'code', 'unauthorized'); end if;
  if p_idempotency_key is null or p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$'
    or jsonb_typeof(p_command) is distinct from 'object' then
    return jsonb_build_object('ok', false, 'code', 'invalid_command');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'wgi:patient-command:' || p_idempotency_key::text, 0));
  select * into v_receipt from public.patient_command_receipts where idempotency_key = p_idempotency_key;
  if found then
    if v_receipt.actor_id <> p_actor_id or v_receipt.fingerprint <> p_fingerprint then
      return jsonb_build_object('ok', false, 'code', 'idempotency_conflict');
    end if;
    return v_receipt.result;
  end if;

  v_kind := p_command ->> 'kind';
  if v_kind is null or v_kind not in ('create', 'update', 'set_archived', 'link_request', 'unlink_request') then
    return jsonb_build_object('ok', false, 'code', 'invalid_command');
  end if;
  if v_kind = 'create' then
    if not (p_command ? 'patient') or p_command - array['kind', 'patient', 'requestId'] <> '{}'::jsonb then
      return jsonb_build_object('ok', false, 'code', 'invalid_command');
    end if;
  else
    if not (p_command ?& array['patientId', 'expectedVersion'])
      or jsonb_typeof(p_command -> 'expectedVersion') is distinct from 'number'
      or (p_command ->> 'expectedVersion') !~ '^[1-9][0-9]{0,15}$' then
      return jsonb_build_object('ok', false, 'code', 'invalid_command');
    end if;
    v_patient_id := (p_command ->> 'patientId')::uuid;
    v_version := (p_command ->> 'expectedVersion')::bigint;
    if v_patient_id is null or v_version > 9007199254740991 then
      return jsonb_build_object('ok', false, 'code', 'invalid_command');
    end if;
    if (v_kind = 'update' and (not (p_command ? 'patient')
      or p_command - array['kind', 'patientId', 'expectedVersion', 'patient'] <> '{}'::jsonb))
      or (v_kind = 'set_archived' and (jsonb_typeof(p_command -> 'archived') is distinct from 'boolean'
      or p_command - array['kind', 'patientId', 'expectedVersion', 'archived'] <> '{}'::jsonb))
      or (v_kind in ('link_request', 'unlink_request') and (not (p_command ? 'requestId')
      or p_command - array['kind', 'patientId', 'expectedVersion', 'requestId'] <> '{}'::jsonb)) then
      return jsonb_build_object('ok', false, 'code', 'invalid_command');
    end if;
  end if;
  if v_kind = 'set_archived' and v_staff.role <> 'admin' then
    return jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;

  if v_kind in ('create', 'update') then
    v_fields := p_command -> 'patient';
    if jsonb_typeof(v_fields) is distinct from 'object'
      or not (v_fields ?& array['name', 'dateOfBirth', 'phone', 'email'])
      or v_fields - array['name', 'dateOfBirth', 'phone', 'email'] <> '{}'::jsonb
      or jsonb_typeof(v_fields -> 'name') is distinct from 'string'
      or jsonb_typeof(v_fields -> 'dateOfBirth') not in ('string', 'null')
      or jsonb_typeof(v_fields -> 'phone') not in ('string', 'null')
      or jsonb_typeof(v_fields -> 'email') not in ('string', 'null')
      or ((v_fields ->> 'dateOfBirth') is not null and (v_fields ->> 'dateOfBirth') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$') then
      return jsonb_build_object('ok', false, 'code', 'invalid_command');
    end if;
    v_birth_date := (v_fields ->> 'dateOfBirth')::date;
    if char_length(v_fields ->> 'name') not between 1 and 120
      or (v_fields ->> 'name') <> btrim(v_fields ->> 'name')
      or (v_birth_date is not null and (v_birth_date < date '0001-01-01'
        or v_birth_date > (now() at time zone 'America/New_York')::date))
      or ((v_fields ->> 'phone') is not null and (
        (v_fields ->> 'phone') <> btrim(v_fields ->> 'phone')
        or char_length(v_fields ->> 'phone') not between 1 and 32
        or char_length(regexp_replace(v_fields ->> 'phone', '[^0-9]', '', 'g')) < 10))
      or ((v_fields ->> 'email') is not null and (
        (v_fields ->> 'email') <> btrim(v_fields ->> 'email')
        or char_length(v_fields ->> 'email') not between 3 and 254
        or (v_fields ->> 'email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')) then
      return jsonb_build_object('ok', false, 'code', 'invalid_command');
    end if;
  end if;

  -- Request before patient is the shared lock order for both linking operations.
  v_request_id := (p_command ->> 'requestId')::uuid;
  if v_kind in ('link_request', 'unlink_request') and v_request_id is null then
    return jsonb_build_object('ok', false, 'code', 'invalid_command');
  end if;
  if v_request_id is not null then
    perform 1 from public.requests where id = v_request_id for update;
    if not found then return jsonb_build_object('ok', false, 'code', 'request_not_found'); end if;
    select patient_id into v_linked_patient from public.patient_request_links where request_id = v_request_id;
    if v_kind = 'unlink_request' then
      if v_linked_patient is distinct from v_patient_id then
        return jsonb_build_object('ok', false, 'code', 'request_link_conflict');
      end if;
    elsif v_linked_patient is not null then
      return jsonb_build_object('ok', false, 'code', 'request_link_conflict');
    end if;
  end if;

  if v_kind <> 'create' then
    select * into v_patient from public.patients where id = v_patient_id for update;
    if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
    if v_patient.version <> v_version then
      return jsonb_build_object('ok', false, 'code', 'stale_version', 'currentVersion', v_patient.version);
    end if;
    if v_patient.archived_at is not null and v_kind in ('update', 'link_request') then
      return jsonb_build_object('ok', false, 'code', 'patient_archived');
    end if;
    v_before := to_jsonb(v_patient) - 'search_text';
  end if;
  v_now := clock_timestamp();

  if v_kind = 'create' then
    insert into public.patients(name, date_of_birth, phone, email, created_by, updated_by, created_at, updated_at)
    values (v_fields ->> 'name', (v_fields ->> 'dateOfBirth')::date, v_fields ->> 'phone',
      v_fields ->> 'email', p_actor_id, p_actor_id, v_now, v_now) returning * into v_patient;
    v_patient_id := v_patient.id;
  elsif v_kind = 'update' then
    update public.patients set name = v_fields ->> 'name', date_of_birth = (v_fields ->> 'dateOfBirth')::date,
      phone = v_fields ->> 'phone', email = v_fields ->> 'email', version = version + 1,
      updated_at = v_now, updated_by = p_actor_id where id = v_patient_id returning * into v_patient;
  else
    if v_kind = 'set_archived' then
      v_archived := (p_command ->> 'archived')::boolean;
      if v_archived = (v_patient.archived_at is not null) then
        return jsonb_build_object('ok', false, 'code', 'unchanged');
      end if;
    end if;
    update public.patients set version = version + 1, updated_at = v_now, updated_by = p_actor_id,
      archived_at = case when v_kind = 'set_archived' then case when v_archived then v_now else null end
        else archived_at end where id = v_patient_id returning * into v_patient;
  end if;

  if v_request_id is not null then
    if v_kind = 'unlink_request' then
      delete from public.patient_request_links where request_id = v_request_id;
    else
      insert into public.patient_request_links(request_id, patient_id, linked_at, linked_by)
      values (v_request_id, v_patient_id, v_now, p_actor_id);
    end if;
  end if;

  insert into public.patient_revisions(patient_id, version, command, before_record, after_record,
    request_id, actor_id, actor_email, occurred_at)
  values (v_patient_id, v_patient.version, v_kind, v_before, to_jsonb(v_patient) - 'search_text',
    v_request_id, p_actor_id, v_staff.email, v_now);
  insert into public.audit_log(actor_email, action, entity, entity_id, source, correlation_id, detail, at)
  values (v_staff.email, 'patient.' || v_kind, 'patients', v_patient_id,
    'staff', p_idempotency_key,
    jsonb_build_object('version', v_patient.version, 'request_id', v_request_id), v_now);
  v_result := jsonb_build_object('ok', true, 'patientId', v_patient_id, 'version', v_patient.version);
  insert into public.patient_command_receipts(idempotency_key, patient_id, actor_id, fingerprint, result, created_at)
  values (p_idempotency_key, v_patient_id, p_actor_id, p_fingerprint, v_result, v_now);
  return v_result;
exception
  when invalid_text_representation or datetime_field_overflow or invalid_datetime_format
    or numeric_value_out_of_range then
    return jsonb_build_object('ok', false, 'code', 'invalid_command');
end;
$$;

create function public.portal_search_patients(
  p_actor_id uuid,
  p_query text default '',
  p_archived boolean default false,
  p_limit integer default 50,
  p_after_name text default null,
  p_after_id uuid default null
) returns jsonb
language plpgsql stable security invoker set search_path = ''
as $$
declare
  v_pattern text;
  v_result jsonb;
begin
  if not exists (select 1 from public.staff_profiles where user_id = p_actor_id and active and onboarded_at is not null) then
    return jsonb_build_object('ok', false, 'code', 'unauthorized');
  end if;
  if p_query is null or char_length(p_query) > 254 or p_limit is null or p_limit not between 1 and 100
    or p_archived is null or ((p_after_name is null) <> (p_after_id is null))
    or (p_after_name is not null and char_length(p_after_name) not between 1 and 120) then
    return jsonb_build_object('ok', false, 'code', 'invalid_command');
  end if;
  v_pattern := '%' || replace(replace(replace(lower(btrim(p_query)), E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%';
  with matching as not materialized (
    select p.id, p.name, p.date_of_birth, p.phone, p.email, p.archived_at, p.version,
      p.created_at, p.updated_at from public.patients p
    where (p.archived_at is not null) = p_archived and p.search_text like v_pattern escape E'\\'
  ), page as (
    select * from matching where p_after_id is null or (lower(name), id) > (lower(p_after_name), p_after_id)
    order by lower(name), id limit p_limit + 1
  ), visible as (
    select * from page order by lower(name), id limit p_limit
  )
  select jsonb_build_object('ok', true, 'total', (select count(*) from matching),
    'patients', coalesce((select jsonb_agg(to_jsonb(v) order by lower(v.name), v.id) from visible v), '[]'::jsonb),
    'next', case when (select count(*) from page) > p_limit then
      (select jsonb_build_object('name', name, 'id', id) from visible order by lower(name) desc, id desc limit 1)
      else null end) into v_result;
  return v_result;
end;
$$;

create function public.portal_read_patient(
  p_actor_id uuid,
  p_patient_id uuid,
  p_history_before bigint default null,
  p_links_after uuid default null
) returns jsonb
language plpgsql stable security invoker set search_path = ''
as $$
declare
  v_patient public.patients%rowtype;
  v_result jsonb;
begin
  if not exists (select 1 from public.staff_profiles where user_id = p_actor_id and active and onboarded_at is not null) then
    return jsonb_build_object('ok', false, 'code', 'unauthorized');
  end if;
  if p_patient_id is null or (p_history_before is not null and p_history_before < 1) then
    return jsonb_build_object('ok', false, 'code', 'invalid_command');
  end if;
  select * into v_patient from public.patients where id = p_patient_id;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  with history_page as (
    select * from public.patient_revisions where patient_id = p_patient_id
      and (p_history_before is null or version < p_history_before)
    order by version desc limit 51
  ), history_visible as (
    select * from history_page order by version desc limit 50
  ), links_page as (
    select l.*, r.created_at as request_created_at, r.status as request_status
    from public.patient_request_links l join public.requests r on r.id = l.request_id
    where l.patient_id = p_patient_id and (p_links_after is null or l.request_id > p_links_after)
    order by l.request_id limit 51
  ), links_visible as (
    select * from links_page order by request_id limit 50
  )
  select jsonb_build_object('ok', true, 'patient', to_jsonb(v_patient) - 'search_text',
    'history', jsonb_build_object(
      'items', coalesce((select jsonb_agg(to_jsonb(h) order by h.version desc) from history_visible h), '[]'::jsonb),
      'total', (select count(*) from public.patient_revisions where patient_id = p_patient_id),
      'nextVersion', case when (select count(*) from history_page) > 50 then
        (select min(version) from history_visible) else null end),
    'requests', jsonb_build_object(
      'items', coalesce((select jsonb_agg(to_jsonb(l) order by l.request_id) from links_visible l), '[]'::jsonb),
      'total', (select count(*) from public.patient_request_links where patient_id = p_patient_id),
      'nextRequestId', case when (select count(*) from links_page) > 50 then
        (select request_id from links_visible order by request_id desc limit 1) else null end)) into v_result;
  return v_result;
end;
$$;

revoke execute on function public.portal_execute_patient_command(uuid, uuid, text, jsonb),
  public.portal_search_patients(uuid, text, boolean, integer, text, uuid),
  public.portal_read_patient(uuid, uuid, bigint, uuid) from public, anon, authenticated;
grant execute on function public.portal_execute_patient_command(uuid, uuid, text, jsonb),
  public.portal_search_patients(uuid, text, boolean, integer, text, uuid),
  public.portal_read_patient(uuid, uuid, bigint, uuid) to service_role;

comment on table public.patients is 'Independent patient identity. Intake, clinical records, and billing remain optional.';
comment on table public.patient_revisions is 'Protected patient change history. Patient values do not enter the general audit detail.';
notify pgrst, 'reload schema';
