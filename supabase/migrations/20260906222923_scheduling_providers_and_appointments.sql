create extension if not exists btree_gist with schema extensions;

create table public.scheduling_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name = btrim(name) and char_length(name) between 1 and 120),
  active boolean not null default true,
  version bigint not null default 1 check (version between 1 and 9007199254740991),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null,
  updated_by uuid not null
);

create table public.scheduling_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name = btrim(name) and char_length(name) between 1 and 120),
  active boolean not null default true,
  version bigint not null default 1 check (version between 1 and 9007199254740991),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null,
  updated_by uuid not null
);

create table public.appointment_types (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name = btrim(name) and char_length(name) between 1 and 120),
  duration_minutes integer not null check (duration_minutes between 1 and 1440),
  buffer_before_minutes integer not null default 0 check (buffer_before_minutes between 0 and 720),
  buffer_after_minutes integer not null default 0 check (buffer_after_minutes between 0 and 720),
  active boolean not null default true,
  version bigint not null default 1 check (version between 1 and 9007199254740991),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null,
  updated_by uuid not null
);

create table public.provider_hours (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.scheduling_providers(id) on delete cascade,
  location_id uuid not null references public.scheduling_locations(id) on delete restrict,
  weekday integer not null check (weekday between 0 and 6),
  open_minute integer not null check (open_minute between 0 and 1439),
  close_minute integer not null check (close_minute between 1 and 1440 and close_minute > open_minute),
  valid_from date not null,
  valid_to date,
  check (valid_from >= date '0001-01-01' and isfinite(valid_from)),
  check (valid_to is null or (valid_to >= valid_from and isfinite(valid_to)))
);
create index provider_hours_provider_idx on public.provider_hours(provider_id);
create index provider_hours_location_idx on public.provider_hours(location_id);

create table public.provider_time_exceptions (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.scheduling_providers(id) on delete cascade,
  location_id uuid references public.scheduling_locations(id) on delete restrict,
  kind text not null check (kind in ('available', 'unavailable')),
  starts_at timestamptz not null check (isfinite(starts_at)),
  ends_at timestamptz not null check (isfinite(ends_at) and ends_at > starts_at),
  check (kind <> 'available' or location_id is not null)
);
create index provider_time_exceptions_provider_idx on public.provider_time_exceptions(provider_id, starts_at);
create index provider_time_exceptions_location_idx on public.provider_time_exceptions(location_id);

alter table public.patient_request_links add constraint patient_request_links_request_patient_unique
  unique(request_id, patient_id);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  provider_id uuid not null references public.scheduling_providers(id) on delete restrict,
  location_id uuid not null references public.scheduling_locations(id) on delete restrict,
  appointment_type_id uuid not null references public.appointment_types(id) on delete restrict,
  source_request_id uuid,
  starts_at timestamptz not null check (isfinite(starts_at)),
  ends_at timestamptz not null check (isfinite(ends_at) and ends_at > starts_at),
  duration_minutes integer not null check (duration_minutes between 1 and 1440),
  buffer_before_minutes integer not null check (buffer_before_minutes between 0 and 720),
  buffer_after_minutes integer not null check (buffer_after_minutes between 0 and 720),
  reserved_from timestamptz not null check (isfinite(reserved_from)),
  reserved_until timestamptz not null check (isfinite(reserved_until)),
  status text not null default 'scheduled' check (status in ('scheduled', 'checked_in', 'completed', 'no_show', 'cancelled')),
  reason text check (reason = btrim(reason) and char_length(reason) between 1 and 500),
  version bigint not null default 1 check (version between 1 and 9007199254740991),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null,
  updated_by uuid not null,
  unique(id, patient_id),
  foreign key(source_request_id, patient_id) references public.patient_request_links(request_id, patient_id)
    on delete set null(source_request_id),
  check (ends_at = starts_at + make_interval(mins => duration_minutes)),
  check (reserved_from = starts_at - make_interval(mins => buffer_before_minutes)),
  check (reserved_until = ends_at + make_interval(mins => buffer_after_minutes)),
  constraint appointments_provider_no_overlap exclude using gist (
    provider_id extensions.gist_uuid_ops with =,
    tstzrange(reserved_from, reserved_until, '[)') with &&
  ) where (status <> 'cancelled'),
  constraint appointments_patient_no_overlap exclude using gist (
    patient_id extensions.gist_uuid_ops with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status <> 'cancelled')
);
create index appointments_provider_start_idx on public.appointments(provider_id, starts_at, id);
create index appointments_patient_start_idx on public.appointments(patient_id, starts_at, id);
create index appointments_location_start_idx on public.appointments(location_id, starts_at, id);
create index appointments_type_idx on public.appointments(appointment_type_id);
create index appointments_source_request_idx on public.appointments(source_request_id, patient_id);
create index appointments_interval_idx on public.appointments using gist(tstzrange(starts_at,ends_at,'[)'));
create unique index appointments_active_request_idx on public.appointments(source_request_id)
  where source_request_id is not null and status <> 'cancelled';

create table public.scheduling_changes (
  id uuid primary key default gen_random_uuid(),
  entity text not null check (entity in ('provider', 'location', 'appointment_type', 'appointment')),
  entity_id uuid not null,
  appointment_id uuid references public.appointments(id) on delete cascade,
  provider_id uuid references public.scheduling_providers(id) on delete cascade,
  location_id uuid references public.scheduling_locations(id) on delete cascade,
  appointment_type_id uuid references public.appointment_types(id) on delete cascade,
  version bigint not null check (version between 1 and 9007199254740991),
  command text not null check (command in ('save_provider', 'save_location', 'save_appointment_type',
    'book', 'reschedule', 'cancel', 'check_in', 'complete', 'no_show', 'undo')),
  before_record jsonb,
  after_record jsonb not null,
  compensates_change_id uuid references public.scheduling_changes(id) on delete cascade,
  actor_id uuid not null,
  actor_email text not null,
  occurred_at timestamptz not null default now(),
  unique(entity, entity_id, version),
  unique(compensates_change_id),
  check (
    (entity = 'appointment' and appointment_id is not null and appointment_id = entity_id
      and provider_id is null and location_id is null and appointment_type_id is null)
    or (entity = 'provider' and provider_id is not null and provider_id = entity_id
      and appointment_id is null and location_id is null and appointment_type_id is null)
    or (entity = 'location' and location_id is not null and location_id = entity_id
      and appointment_id is null and provider_id is null and appointment_type_id is null)
    or (entity = 'appointment_type' and appointment_type_id is not null and appointment_type_id = entity_id
      and appointment_id is null and provider_id is null and location_id is null)
  )
);
create index scheduling_changes_appointment_idx on public.scheduling_changes(appointment_id);
create index scheduling_changes_provider_idx on public.scheduling_changes(provider_id);
create index scheduling_changes_location_idx on public.scheduling_changes(location_id);
create index scheduling_changes_type_idx on public.scheduling_changes(appointment_type_id);

create table public.scheduling_command_receipts (
  idempotency_key uuid primary key,
  change_id uuid not null unique references public.scheduling_changes(id) on delete cascade,
  actor_id uuid not null,
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  result jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.scheduling_locations enable row level security;
alter table public.scheduling_providers enable row level security;
alter table public.appointment_types enable row level security;
alter table public.provider_hours enable row level security;
alter table public.provider_time_exceptions enable row level security;
alter table public.appointments enable row level security;
alter table public.scheduling_changes enable row level security;
alter table public.scheduling_command_receipts enable row level security;
revoke all on public.scheduling_locations, public.scheduling_providers, public.appointment_types,
  public.provider_hours, public.provider_time_exceptions, public.appointments, public.scheduling_changes,
  public.scheduling_command_receipts from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.scheduling_locations, public.scheduling_providers,
  public.appointment_types, public.provider_hours, public.provider_time_exceptions, public.appointments to service_role;
grant select, insert on public.scheduling_changes, public.scheduling_command_receipts to service_role;

create function public.portal_preserve_appointment_patient() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.patient_id <> old.patient_id then
    raise exception 'An appointment cannot change patients' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger appointments_preserve_patient before update of patient_id on public.appointments
  for each row execute function public.portal_preserve_appointment_patient();
revoke execute on function public.portal_preserve_appointment_patient() from public, anon, authenticated;
grant execute on function public.portal_preserve_appointment_patient() to service_role;

-- Proposed schedules and persisted schedules use the same availability decision.
create function public.portal_schedule_allows(
  p_location_id uuid, p_start timestamptz, p_end timestamptz, p_hours jsonb, p_exceptions jsonb
) returns boolean language sql stable security invoker set search_path = '' as $$
  with context as (
    select (p_start at time zone 'America/New_York')::date as practice_day,
      extract(dow from p_start at time zone 'America/New_York')::integer weekday
  ), hours as (
    select * from jsonb_to_recordset(p_hours) as h(
      "locationId" uuid, weekday integer, "openMinute" integer, "closeMinute" integer,
      "validFrom" date, "validTo" date
    )
  ), exceptions as (
    select * from jsonb_to_recordset(p_exceptions) as e(
      "locationId" uuid, kind text, "startsAt" timestamptz, "endsAt" timestamptz
    )
  )
  select coalesce(
    p_start < p_end and isfinite(p_start) and isfinite(p_end)
    and (
      exists(select 1 from hours h cross join context c
        where h."locationId" = p_location_id and h.weekday = c.weekday
        and c.practice_day >= h."validFrom" and (h."validTo" is null or c.practice_day <= h."validTo")
        and p_start >= ((c.practice_day::timestamp + make_interval(mins => h."openMinute")) at time zone 'America/New_York')
        and p_end <= ((c.practice_day::timestamp + make_interval(mins => h."closeMinute")) at time zone 'America/New_York'))
      or exists(select 1 from exceptions e where e.kind = 'available' and e."locationId" = p_location_id
        and e."startsAt" <= p_start and e."endsAt" >= p_end)
    )
    and not exists(select 1 from exceptions e where e.kind = 'unavailable'
      and (e."locationId" is null or e."locationId" = p_location_id)
      and e."startsAt" < p_end and e."endsAt" > p_start), false);
$$;

create function public.portal_provider_schedule(p_provider_id uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('provider', to_jsonb(p),
    'hours', coalesce((select jsonb_agg(jsonb_build_object(
      'locationId', h.location_id, 'weekday', h.weekday, 'openMinute', h.open_minute,
      'closeMinute', h.close_minute, 'validFrom', h.valid_from, 'validTo', h.valid_to)
      order by h.location_id, h.weekday, h.valid_from, h.open_minute, h.id)
      from public.provider_hours h where h.provider_id = p.id), '[]'::jsonb),
    'exceptions', coalesce((select jsonb_agg(jsonb_build_object(
      'locationId', e.location_id, 'kind', e.kind, 'startsAt', e.starts_at, 'endsAt', e.ends_at)
      order by e.starts_at, e.ends_at, e.id)
      from public.provider_time_exceptions e where e.provider_id = p.id), '[]'::jsonb)
  ) from public.scheduling_providers p where p.id = p_provider_id;
$$;

revoke execute on function public.portal_schedule_allows(uuid,timestamptz,timestamptz,jsonb,jsonb),
  public.portal_provider_schedule(uuid) from public, anon, authenticated;
grant execute on function public.portal_schedule_allows(uuid,timestamptz,timestamptz,jsonb,jsonb),
  public.portal_provider_schedule(uuid) to service_role;

create function public.portal_save_scheduling_config(
  p_actor_id uuid, p_idempotency_key uuid, p_fingerprint text, p_command jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_staff public.staff_profiles%rowtype;
  v_receipt public.scheduling_command_receipts%rowtype;
  v_provider public.scheduling_providers%rowtype;
  v_location public.scheduling_locations%rowtype;
  v_type public.appointment_types%rowtype;
  v_kind text;
  v_entity text;
  v_id uuid;
  v_version bigint;
  v_current_version bigint;
  v_name text;
  v_active boolean;
  v_before jsonb;
  v_after jsonb;
  v_hours jsonb;
  v_exceptions jsonb;
  v_item jsonb;
  v_duration integer;
  v_buffer_before integer;
  v_buffer_after integer;
  v_now timestamptz;
  v_change_id uuid;
  v_result jsonb;
begin
  select * into v_staff from public.staff_profiles
    where user_id = p_actor_id and active and onboarded_at is not null for share;
  if not found then return jsonb_build_object('ok',false,'code','unauthorized'); end if;
  if v_staff.role <> 'admin' then return jsonb_build_object('ok',false,'code','forbidden'); end if;
  if p_idempotency_key is null or p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$'
    or jsonb_typeof(p_command) is distinct from 'object' then
    return jsonb_build_object('ok',false,'code','invalid_command');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('wgi:scheduling:'||p_idempotency_key::text,0));
  select * into v_receipt from public.scheduling_command_receipts where idempotency_key=p_idempotency_key;
  if found then
    if v_receipt.actor_id<>p_actor_id or v_receipt.fingerprint<>p_fingerprint then
      return jsonb_build_object('ok',false,'code','idempotency_conflict');
    end if;
    return v_receipt.result;
  end if;
  v_kind:=p_command->>'kind';
  if v_kind is null or v_kind not in ('save_provider','save_location','save_appointment_type')
    or not (p_command ?& array['kind','id','expectedVersion','name','active'])
    or jsonb_typeof(p_command->'name') is distinct from 'string'
    or jsonb_typeof(p_command->'active') is distinct from 'boolean'
    or jsonb_typeof(p_command->'id') not in ('null','string')
    or jsonb_typeof(p_command->'expectedVersion') not in ('null','number') then
    return jsonb_build_object('ok',false,'code','invalid_command');
  end if;
  v_id:=(p_command->>'id')::uuid;
  v_version:=(p_command->>'expectedVersion')::bigint;
  v_name:=p_command->>'name';
  v_active:=(p_command->>'active')::boolean;
  if (v_id is null) <> (v_version is null) or v_version not between 1 and 9007199254740991
    or char_length(v_name) not between 1 and 120 or v_name<>btrim(v_name) then
    return jsonb_build_object('ok',false,'code','invalid_command');
  end if;
  if v_kind='save_location' then
    v_entity:='location';
    if p_command-array['kind','id','expectedVersion','name','active']<>'{}'::jsonb then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
    if v_id is not null then
      select * into v_location from public.scheduling_locations where id=v_id for update;
      if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
      v_current_version:=v_location.version; v_before:=to_jsonb(v_location);
      if not v_active and exists(select 1 from public.appointments where location_id=v_id
        and status in ('scheduled','checked_in') and ends_at>clock_timestamp()) then
        return jsonb_build_object('ok',false,'code','schedule_in_use');
      end if;
    end if;
  elsif v_kind='save_appointment_type' then
    v_entity:='appointment_type';
    if not (p_command ?& array['durationMinutes','bufferBeforeMinutes','bufferAfterMinutes'])
      or p_command-array['kind','id','expectedVersion','name','active','durationMinutes','bufferBeforeMinutes','bufferAfterMinutes']<>'{}'::jsonb
      or jsonb_typeof(p_command->'durationMinutes') is distinct from 'number'
      or jsonb_typeof(p_command->'bufferBeforeMinutes') is distinct from 'number'
      or jsonb_typeof(p_command->'bufferAfterMinutes') is distinct from 'number' then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
    v_duration:=(p_command->>'durationMinutes')::integer;
    v_buffer_before:=(p_command->>'bufferBeforeMinutes')::integer;
    v_buffer_after:=(p_command->>'bufferAfterMinutes')::integer;
    if v_duration not between 1 and 1440 or v_buffer_before not between 0 and 720
      or v_buffer_after not between 0 and 720 then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
    if v_id is not null then
      select * into v_type from public.appointment_types where id=v_id for update;
      if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
      v_current_version:=v_type.version; v_before:=to_jsonb(v_type);
    end if;
  else
    v_entity:='provider';
    if not (p_command ?& array['hours','exceptions'])
      or p_command-array['kind','id','expectedVersion','name','active','hours','exceptions']<>'{}'::jsonb
      or jsonb_typeof(p_command->'hours') is distinct from 'array'
      or jsonb_typeof(p_command->'exceptions') is distinct from 'array' then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
    v_hours:=p_command->'hours'; v_exceptions:=p_command->'exceptions';
    if jsonb_array_length(v_hours)>100 or jsonb_array_length(v_exceptions)>100 then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
    for v_item in select value from jsonb_array_elements(v_hours) loop
      if jsonb_typeof(v_item) is distinct from 'object'
        or not (v_item ?& array['locationId','weekday','openMinute','closeMinute','validFrom','validTo'])
        or v_item-array['locationId','weekday','openMinute','closeMinute','validFrom','validTo']<>'{}'::jsonb
        or jsonb_typeof(v_item->'locationId') is distinct from 'string'
        or jsonb_typeof(v_item->'weekday') is distinct from 'number'
        or jsonb_typeof(v_item->'openMinute') is distinct from 'number'
        or jsonb_typeof(v_item->'closeMinute') is distinct from 'number'
        or jsonb_typeof(v_item->'validFrom') is distinct from 'string'
        or jsonb_typeof(v_item->'validTo') not in ('string','null') then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
      if (v_item->>'weekday')::integer not between 0 and 6
        or (v_item->>'openMinute')::integer not between 0 and 1439
        or (v_item->>'closeMinute')::integer not between 1 and 1440
        or (v_item->>'closeMinute')::integer <= (v_item->>'openMinute')::integer
        or (v_item->>'validFrom') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        or (v_item->>'validFrom')::date < date '0001-01-01'
        or ((v_item->>'validTo') is not null and ((v_item->>'validTo') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
          or (v_item->>'validTo')::date < (v_item->>'validFrom')::date)) then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
    end loop;
    for v_item in select value from jsonb_array_elements(v_exceptions) loop
      if jsonb_typeof(v_item) is distinct from 'object'
        or not (v_item ?& array['locationId','kind','startsAt','endsAt'])
        or v_item-array['locationId','kind','startsAt','endsAt']<>'{}'::jsonb
        or jsonb_typeof(v_item->'locationId') not in ('string','null')
        or jsonb_typeof(v_item->'kind') is distinct from 'string'
        or v_item->>'kind' not in ('available','unavailable')
        or jsonb_typeof(v_item->'startsAt') is distinct from 'string'
        or jsonb_typeof(v_item->'endsAt') is distinct from 'string'
        or (v_item->>'startsAt') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T.*(Z|[+-][0-9]{2}:[0-9]{2})$'
        or (v_item->>'endsAt') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T.*(Z|[+-][0-9]{2}:[0-9]{2})$'
        or (v_item->>'endsAt')::timestamptz <= (v_item->>'startsAt')::timestamptz
        or (v_item->>'kind'='available' and (v_item->>'locationId') is null) then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
    end loop;
    if v_id is not null then
      select * into v_provider from public.scheduling_providers where id=v_id for update;
      if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
      v_current_version:=v_provider.version; v_before:=public.portal_provider_schedule(v_id);
    end if;
    -- Location changes cannot invalidate a concurrently saved provider schedule.
    perform 1 from public.scheduling_locations l where l.id in (
      select (value->>'locationId')::uuid from jsonb_array_elements(v_hours||v_exceptions)
    ) order by l.id for share;
    if exists(select 1 from jsonb_array_elements(v_hours||v_exceptions) item
      where item->>'locationId' is not null and not exists(
        select 1 from public.scheduling_locations where id=(item->>'locationId')::uuid and active)) then
      return jsonb_build_object('ok',false,'code','location_unavailable');
    end if;
    if v_id is not null and exists(select 1 from public.appointments a where a.provider_id=v_id
      and a.status in ('scheduled','checked_in') and a.ends_at>clock_timestamp()
      and (not v_active or not public.portal_schedule_allows(a.location_id,a.reserved_from,a.reserved_until,v_hours,v_exceptions))) then
      return jsonb_build_object('ok',false,'code','schedule_in_use');
    end if;
  end if;
  if v_id is not null and v_current_version<>v_version then
    return jsonb_build_object('ok',false,'code','stale_version','currentVersion',v_current_version);
  end if;
  v_now:=clock_timestamp();
  if v_kind='save_location' then
    if v_id is null then
      insert into public.scheduling_locations(name,active,created_by,updated_by,created_at,updated_at)
        values(v_name,v_active,p_actor_id,p_actor_id,v_now,v_now) returning * into v_location;
    else
      update public.scheduling_locations set name=v_name,active=v_active,version=version+1,
        updated_by=p_actor_id,updated_at=v_now where id=v_id returning * into v_location;
    end if;
    v_id:=v_location.id; v_version:=v_location.version; v_after:=to_jsonb(v_location);
  elsif v_kind='save_appointment_type' then
    if v_id is null then
      insert into public.appointment_types(name,active,duration_minutes,buffer_before_minutes,buffer_after_minutes,
        created_by,updated_by,created_at,updated_at)
        values(v_name,v_active,v_duration,v_buffer_before,v_buffer_after,p_actor_id,p_actor_id,v_now,v_now) returning * into v_type;
    else
      update public.appointment_types set name=v_name,active=v_active,duration_minutes=v_duration,
        buffer_before_minutes=v_buffer_before,buffer_after_minutes=v_buffer_after,version=version+1,
        updated_by=p_actor_id,updated_at=v_now where id=v_id returning * into v_type;
    end if;
    v_id:=v_type.id; v_version:=v_type.version; v_after:=to_jsonb(v_type);
  else
    if v_id is null then
      insert into public.scheduling_providers(name,active,created_by,updated_by,created_at,updated_at)
        values(v_name,v_active,p_actor_id,p_actor_id,v_now,v_now) returning * into v_provider;
    else
      update public.scheduling_providers set name=v_name,active=v_active,version=version+1,
        updated_by=p_actor_id,updated_at=v_now where id=v_id returning * into v_provider;
    end if;
    v_id:=v_provider.id; v_version:=v_provider.version;
    delete from public.provider_hours where provider_id=v_id;
    delete from public.provider_time_exceptions where provider_id=v_id;
    insert into public.provider_hours(provider_id,location_id,weekday,open_minute,close_minute,valid_from,valid_to)
      select v_id,(h->>'locationId')::uuid,(h->>'weekday')::integer,(h->>'openMinute')::integer,
        (h->>'closeMinute')::integer,(h->>'validFrom')::date,(h->>'validTo')::date from jsonb_array_elements(v_hours) h;
    insert into public.provider_time_exceptions(provider_id,location_id,kind,starts_at,ends_at)
      select v_id,(e->>'locationId')::uuid,e->>'kind',(e->>'startsAt')::timestamptz,(e->>'endsAt')::timestamptz
      from jsonb_array_elements(v_exceptions) e;
    v_after:=public.portal_provider_schedule(v_id);
  end if;
  insert into public.scheduling_changes(entity,entity_id,provider_id,location_id,appointment_type_id,
    version,command,before_record,after_record,actor_id,actor_email,occurred_at)
    values(v_entity,v_id,case when v_entity='provider' then v_id end,case when v_entity='location' then v_id end,
      case when v_entity='appointment_type' then v_id end,v_version,v_kind,v_before,v_after,p_actor_id,v_staff.email,v_now)
    returning id into v_change_id;
  insert into public.audit_log(actor_email,action,entity,entity_id,source,correlation_id,detail,at)
    values(v_staff.email,'scheduling.'||v_kind,'scheduling',v_id,'staff',p_idempotency_key,
      jsonb_build_object('entity',v_entity,'version',v_version),v_now);
  v_result:=jsonb_build_object('ok',true,'entity',v_entity,'id',v_id,'version',v_version);
  insert into public.scheduling_command_receipts(idempotency_key,change_id,actor_id,fingerprint,result,created_at)
    values(p_idempotency_key,v_change_id,p_actor_id,p_fingerprint,v_result,v_now);
  return v_result;
exception when invalid_text_representation or datetime_field_overflow or invalid_datetime_format
  or numeric_value_out_of_range then
  return jsonb_build_object('ok',false,'code','invalid_command');
end;
$$;
revoke execute on function public.portal_save_scheduling_config(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.portal_save_scheduling_config(uuid,uuid,text,jsonb) to service_role;

create function public.portal_execute_appointment_command(
  p_actor_id uuid, p_idempotency_key uuid, p_fingerprint text, p_command jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_staff public.staff_profiles%rowtype;
  v_receipt public.scheduling_command_receipts%rowtype;
  v_current public.appointments%rowtype;
  v_target public.appointments%rowtype;
  v_latest public.scheduling_changes%rowtype;
  v_type public.appointment_types%rowtype;
  v_kind text;
  v_id uuid;
  v_patient_id uuid;
  v_source_id uuid;
  v_version bigint;
  v_type_version bigint;
  v_before jsonb;
  v_schedule jsonb;
  v_now timestamptz;
  v_needs_reservation boolean;
  v_change_id uuid;
  v_compensates uuid;
  v_constraint text;
  v_result jsonb;
begin
  select * into v_staff from public.staff_profiles
    where user_id=p_actor_id and active and onboarded_at is not null for share;
  if not found then return jsonb_build_object('ok',false,'code','unauthorized'); end if;
  if p_idempotency_key is null or p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$'
    or jsonb_typeof(p_command) is distinct from 'object' then
    return jsonb_build_object('ok',false,'code','invalid_command');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('wgi:scheduling:'||p_idempotency_key::text,0));
  select * into v_receipt from public.scheduling_command_receipts where idempotency_key=p_idempotency_key;
  if found then
    if v_receipt.actor_id<>p_actor_id or v_receipt.fingerprint<>p_fingerprint then
      return jsonb_build_object('ok',false,'code','idempotency_conflict');
    end if;
    return v_receipt.result;
  end if;
  v_kind:=p_command->>'kind';
  if v_kind is null or v_kind not in ('book','reschedule','cancel','check_in','complete','no_show','undo') then
    return jsonb_build_object('ok',false,'code','invalid_command');
  end if;
  if v_kind='book' then
    if not (p_command ?& array['patientId','providerId','locationId','appointmentTypeId','expectedTypeVersion','sourceRequestId','startsAt'])
      or p_command-array['kind','patientId','providerId','locationId','appointmentTypeId','expectedTypeVersion','sourceRequestId','startsAt']<>'{}'::jsonb
      or jsonb_typeof(p_command->'patientId') is distinct from 'string'
      or jsonb_typeof(p_command->'sourceRequestId') not in ('string','null') then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
    v_patient_id:=(p_command->>'patientId')::uuid;
    v_source_id:=(p_command->>'sourceRequestId')::uuid;
  else
    if not (p_command ?& array['id','expectedVersion'])
      or jsonb_typeof(p_command->'id') is distinct from 'string'
      or jsonb_typeof(p_command->'expectedVersion') is distinct from 'number' then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
    v_id:=(p_command->>'id')::uuid;
    v_version:=(p_command->>'expectedVersion')::bigint;
    if v_version not between 1 and 9007199254740991 then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
    if (v_kind='reschedule' and (not (p_command ?& array['providerId','locationId','appointmentTypeId','expectedTypeVersion','startsAt','reason'])
        or p_command-array['kind','id','expectedVersion','providerId','locationId','appointmentTypeId','expectedTypeVersion','startsAt','reason']<>'{}'::jsonb))
      or (v_kind='cancel' and (not (p_command ? 'reason') or p_command-array['kind','id','expectedVersion','reason']<>'{}'::jsonb))
      or (v_kind in ('check_in','complete','no_show','undo') and p_command-array['kind','id','expectedVersion']<>'{}'::jsonb) then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
    select patient_id,source_request_id into v_patient_id,v_source_id from public.appointments where id=v_id;
    if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
  end if;
  -- Match request-linking lock order before touching an appointment that may lose its source link.
  if v_source_id is not null then
    perform 1 from public.requests where id=v_source_id for update;
    if v_kind='book' and not exists(select 1 from public.patient_request_links
      where request_id=v_source_id and patient_id=v_patient_id) then
      return jsonb_build_object('ok',false,'code','request_link_conflict');
    end if;
    if v_kind='book' and exists(select 1 from public.appointments
      where source_request_id=v_source_id and status<>'cancelled') then
      return jsonb_build_object('ok',false,'code','request_already_booked');
    end if;
  end if;
  -- Serialize this patient's own appointment changes before taking any appointment row lock.
  perform pg_advisory_xact_lock(hashtextextended('wgi:scheduling:patient:'||v_patient_id::text,0));
  if v_kind<>'book' then
    select * into v_current from public.appointments where id=v_id for update;
    if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
    if v_current.version<>v_version then
      return jsonb_build_object('ok',false,'code','stale_version','currentVersion',v_current.version);
    end if;
    v_before:=to_jsonb(v_current); v_target:=v_current;
  end if;
  v_now:=clock_timestamp();
  if v_kind in ('book','reschedule') then
    if jsonb_typeof(p_command->'providerId') is distinct from 'string'
      or jsonb_typeof(p_command->'locationId') is distinct from 'string'
      or jsonb_typeof(p_command->'startsAt') is distinct from 'string'
      or (p_command->>'startsAt') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T.*(Z|[+-][0-9]{2}:[0-9]{2})$'
      or jsonb_typeof(p_command->'appointmentTypeId') not in ('string','null')
      or jsonb_typeof(p_command->'expectedTypeVersion') not in ('number','null') then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
    v_target.provider_id:=(p_command->>'providerId')::uuid;
    v_target.location_id:=(p_command->>'locationId')::uuid;
    v_target.starts_at:=(p_command->>'startsAt')::timestamptz;
    v_type_version:=(p_command->>'expectedTypeVersion')::bigint;
    if ((p_command->>'appointmentTypeId') is null) <> (v_type_version is null)
      or (v_kind='book' and v_type_version is null)
      or v_type_version not between 1 and 9007199254740991
      or date_trunc('minute',v_target.starts_at)<>v_target.starts_at or not isfinite(v_target.starts_at) then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
    if v_kind='reschedule' and v_current.status<>'scheduled' then
      return jsonb_build_object('ok',false,'code','illegal_transition');
    end if;
    if v_target.starts_at<=v_now then return jsonb_build_object('ok',false,'code','appointment_in_past'); end if;
    v_target.reason:=p_command->>'reason';
    if v_kind='book' then
      v_target.id:=gen_random_uuid(); v_target.patient_id:=v_patient_id;
      v_target.source_request_id:=v_source_id; v_target.status:='scheduled';
      v_target.version:=1; v_target.created_at:=v_now; v_target.created_by:=p_actor_id;
    end if;
  elsif v_kind='undo' then
    select * into v_latest from public.scheduling_changes
      where entity='appointment' and entity_id=v_id and version=v_current.version;
    if not found or v_latest.command='undo' or v_latest.occurred_at < v_now-interval '15 minutes' then
      return jsonb_build_object('ok',false,'code','undo_unavailable');
    end if;
    v_compensates:=v_latest.id;
    if v_latest.before_record is null then
      v_target.status:='cancelled'; v_target.reason:='Booking undone';
    else
      v_target:=jsonb_populate_record(null::public.appointments,v_latest.before_record);
      -- Cleanup and an explicit unlink are independent; Undo must not recreate an expired link.
      v_target.source_request_id:=v_current.source_request_id;
    end if;
  elsif v_kind='cancel' then
    if v_current.status not in ('scheduled','checked_in') then
      return jsonb_build_object('ok',false,'code','illegal_transition');
    end if;
    if jsonb_typeof(p_command->'reason') is distinct from 'string' then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
    v_target.status:='cancelled'; v_target.reason:=p_command->>'reason';
  elsif v_kind='check_in' then
    if v_current.status<>'scheduled'
      or (v_current.starts_at at time zone 'America/New_York')::date<>(v_now at time zone 'America/New_York')::date then
      return jsonb_build_object('ok',false,'code','illegal_transition');
    end if;
    v_target.status:='checked_in'; v_target.reason:=null;
  elsif v_kind='complete' then
    if v_current.status<>'checked_in' then return jsonb_build_object('ok',false,'code','illegal_transition'); end if;
    v_target.status:='completed'; v_target.reason:=null;
  else
    if v_current.status<>'scheduled' or v_current.starts_at>v_now then
      return jsonb_build_object('ok',false,'code','illegal_transition');
    end if;
    v_target.status:='no_show'; v_target.reason:=null;
  end if;
  if (v_target.reason is not null and (char_length(v_target.reason) not between 1 and 500 or v_target.reason<>btrim(v_target.reason)))
    or (v_kind='reschedule' and jsonb_typeof(p_command->'reason') not in ('string','null')) then
    return jsonb_build_object('ok',false,'code','invalid_command');
  end if;
  -- A provider's reservation is shared across locations. Sort locks for provider changes and Undo.
  perform 1 from public.scheduling_providers where id in (v_current.provider_id,v_target.provider_id)
    order by id for update;
  v_needs_reservation:=v_kind in ('book','reschedule') or (v_kind='undo' and v_target.status<>'cancelled'
    and (v_current.status='cancelled' or v_current.provider_id<>v_target.provider_id
      or v_current.location_id<>v_target.location_id or v_current.reserved_from<>v_target.reserved_from
      or v_current.reserved_until<>v_target.reserved_until));
  if v_needs_reservation then
    if not exists(select 1 from public.scheduling_providers where id=v_target.provider_id and active) then
      return jsonb_build_object('ok',false,'code','provider_unavailable');
    end if;
    perform 1 from public.scheduling_locations where id=v_target.location_id and active for share;
    if not found then return jsonb_build_object('ok',false,'code','location_unavailable'); end if;
    perform 1 from public.patients where id=v_patient_id for share;
    if not found then return jsonb_build_object('ok',false,'code','patient_not_found'); end if;
    if v_kind in ('book','reschedule') and exists(select 1 from public.patients where id=v_patient_id and archived_at is not null) then
      return jsonb_build_object('ok',false,'code','patient_archived');
    end if;
    if v_kind in ('book','reschedule') and v_type_version is not null then
      select * into v_type from public.appointment_types
        where id=(p_command->>'appointmentTypeId')::uuid and active for share;
      if not found then return jsonb_build_object('ok',false,'code','type_unavailable'); end if;
      if v_type.version<>v_type_version then
        return jsonb_build_object('ok',false,'code','type_changed','currentVersion',v_type.version);
      end if;
      v_target.appointment_type_id:=v_type.id; v_target.duration_minutes:=v_type.duration_minutes;
      v_target.buffer_before_minutes:=v_type.buffer_before_minutes;
      v_target.buffer_after_minutes:=v_type.buffer_after_minutes;
    elsif v_kind='reschedule' then
      perform 1 from public.appointment_types where id=v_target.appointment_type_id and active for share;
      if not found then return jsonb_build_object('ok',false,'code','type_unavailable'); end if;
    end if;
    v_target.ends_at:=v_target.starts_at+make_interval(mins=>v_target.duration_minutes);
    v_target.reserved_from:=v_target.starts_at-make_interval(mins=>v_target.buffer_before_minutes);
    v_target.reserved_until:=v_target.ends_at+make_interval(mins=>v_target.buffer_after_minutes);
    if v_target.reserved_until>=timestamptz '10000-01-01 00:00:00+00' then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
    v_schedule:=public.portal_provider_schedule(v_target.provider_id);
    if not public.portal_schedule_allows(v_target.location_id,v_target.reserved_from,v_target.reserved_until,
      v_schedule->'hours',v_schedule->'exceptions') then
      return jsonb_build_object('ok',false,'code','time_unavailable');
    end if;
  end if;
  v_now:=clock_timestamp();
  if v_kind in ('book','reschedule') and v_target.starts_at<=v_now then
    return jsonb_build_object('ok',false,'code','appointment_in_past');
  end if;
  if v_kind='undo' and v_latest.occurred_at<v_now-interval '15 minutes' then
    return jsonb_build_object('ok',false,'code','undo_unavailable');
  end if;
  v_target.updated_at:=v_now; v_target.updated_by:=p_actor_id;
  if v_kind='book' then
    insert into public.appointments select (v_target).* returning * into v_current;
  else
    update public.appointments set provider_id=v_target.provider_id,location_id=v_target.location_id,
      appointment_type_id=v_target.appointment_type_id,starts_at=v_target.starts_at,ends_at=v_target.ends_at,
      duration_minutes=v_target.duration_minutes,buffer_before_minutes=v_target.buffer_before_minutes,
      buffer_after_minutes=v_target.buffer_after_minutes,reserved_from=v_target.reserved_from,
      reserved_until=v_target.reserved_until,status=v_target.status,reason=v_target.reason,
      version=version+1,updated_at=v_now,updated_by=p_actor_id where id=v_id returning * into v_current;
  end if;
  v_id:=v_current.id;
  insert into public.scheduling_changes(entity,entity_id,appointment_id,version,command,before_record,
    after_record,compensates_change_id,actor_id,actor_email,occurred_at)
    values('appointment',v_id,v_id,v_current.version,v_kind,v_before,to_jsonb(v_current),
      v_compensates,p_actor_id,v_staff.email,v_now) returning id into v_change_id;
  insert into public.audit_log(actor_email,action,entity,entity_id,source,correlation_id,detail,at)
    values(v_staff.email,'appointment.'||v_kind,'appointments',v_id,'staff',p_idempotency_key,
      jsonb_build_object('version',v_current.version,'status',v_current.status,'compensates_change_id',v_compensates),v_now);
  v_result:=jsonb_build_object('ok',true,'entity','appointment','id',v_id,'version',v_current.version);
  insert into public.scheduling_command_receipts(idempotency_key,change_id,actor_id,fingerprint,result,created_at)
    values(p_idempotency_key,v_change_id,p_actor_id,p_fingerprint,v_result,v_now);
  return v_result;
exception
  when exclusion_violation then
    get stacked diagnostics v_constraint=constraint_name;
    if v_constraint='appointments_provider_no_overlap' then
      return jsonb_build_object('ok',false,'code','provider_conflict');
    elsif v_constraint='appointments_patient_no_overlap' then
      return jsonb_build_object('ok',false,'code','patient_conflict');
    end if;
    raise;
  when unique_violation then
    get stacked diagnostics v_constraint=constraint_name;
    if v_constraint='appointments_active_request_idx' then
      return jsonb_build_object('ok',false,'code','request_already_booked');
    end if;
    raise;
  when invalid_text_representation or datetime_field_overflow or invalid_datetime_format or numeric_value_out_of_range then
    return jsonb_build_object('ok',false,'code','invalid_command');
end;
$$;
revoke execute on function public.portal_execute_appointment_command(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.portal_execute_appointment_command(uuid,uuid,text,jsonb) to service_role;

create function public.portal_scheduling_catalog(
  p_actor_id uuid, p_entity text, p_query text default '', p_active boolean default true,
  p_limit integer default 50, p_after_name text default null, p_after_id uuid default null
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare v_pattern text; v_result jsonb;
begin
  if not exists(select 1 from public.staff_profiles where user_id=p_actor_id and active and onboarded_at is not null) then
    return jsonb_build_object('ok',false,'code','unauthorized');
  end if;
  if p_entity is null or p_entity not in ('provider','location','appointment_type')
    or p_query is null or char_length(p_query)>120 or p_limit is null or p_limit not between 1 and 100
    or ((p_after_name is null)<>(p_after_id is null)) or char_length(p_after_name) not between 1 and 120 then
    return jsonb_build_object('ok',false,'code','invalid_command');
  end if;
  v_pattern:='%'||replace(replace(replace(lower(btrim(p_query)),E'\\',E'\\\\'),'%',E'\\%'),'_',E'\\_')||'%';
  with catalog as not materialized (
    select id,name,active,version,to_jsonb(p)-array['created_by','updated_by'] record
      from public.scheduling_providers p where p_entity='provider'
    union all select id,name,active,version,to_jsonb(l)-array['created_by','updated_by']
      from public.scheduling_locations l where p_entity='location'
    union all select id,name,active,version,to_jsonb(t)-array['created_by','updated_by']
      from public.appointment_types t where p_entity='appointment_type'
  ), matching as not materialized (
    select * from catalog where (p_active is null or active=p_active) and lower(name) like v_pattern escape E'\\'
  ), page as (
    select * from matching where p_after_id is null or (lower(name),id)>(lower(p_after_name),p_after_id)
    order by lower(name),id limit p_limit+1
  ), visible as (select * from page order by lower(name),id limit p_limit)
  select jsonb_build_object('ok',true,'entity',p_entity,'total',(select count(*) from matching),
    'items',coalesce((select jsonb_agg(record order by lower(name),id) from visible),'[]'::jsonb),
    'next',case when (select count(*) from page)>p_limit then
      (select jsonb_build_object('name',name,'id',id) from visible order by lower(name) desc,id desc limit 1) else null end)
    into v_result;
  return v_result;
end;
$$;

create function public.portal_read_scheduling_config(
  p_actor_id uuid,p_entity text,p_id uuid,p_history_before bigint default null
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare v_record jsonb; v_result jsonb;
begin
  if not exists(select 1 from public.staff_profiles where user_id=p_actor_id and active and onboarded_at is not null) then
    return jsonb_build_object('ok',false,'code','unauthorized');
  end if;
  if p_entity is null or p_entity not in ('provider','location','appointment_type') or p_id is null
    or (p_history_before is not null and p_history_before not between 1 and 9007199254740991) then
    return jsonb_build_object('ok',false,'code','invalid_command');
  end if;
  if p_entity='provider' then v_record:=public.portal_provider_schedule(p_id);
  elsif p_entity='location' then select to_jsonb(l) into v_record from public.scheduling_locations l where id=p_id;
  else select to_jsonb(t) into v_record from public.appointment_types t where id=p_id;
  end if;
  if v_record is null then return jsonb_build_object('ok',false,'code','not_found'); end if;
  with page as (
    select * from public.scheduling_changes where entity=p_entity and entity_id=p_id
      and (p_history_before is null or version<p_history_before) order by version desc limit 51
  ), visible as (select * from page order by version desc limit 50)
  select jsonb_build_object('ok',true,'entity',p_entity,'record',v_record,
    'history',jsonb_build_object('total',(select count(*) from public.scheduling_changes where entity=p_entity and entity_id=p_id),
      'items',coalesce((select jsonb_agg(to_jsonb(v) order by version desc) from visible v),'[]'::jsonb),
      'nextVersion',case when (select count(*) from page)>50 then (select min(version) from visible) else null end)) into v_result;
  return v_result;
end;
$$;

create function public.portal_list_appointments(
  p_actor_id uuid,p_from timestamptz default null,p_to timestamptz default null,
  p_patient_id uuid default null,p_provider_id uuid default null,p_location_id uuid default null,
  p_statuses text[] default null,p_limit integer default 100,
  p_after_start timestamptz default null,p_after_id uuid default null
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare v_result jsonb;
begin
  if not exists(select 1 from public.staff_profiles where user_id=p_actor_id and active and onboarded_at is not null) then
    return jsonb_build_object('ok',false,'code','unauthorized');
  end if;
  if ((p_from is null)<>(p_to is null)) or (p_from is null and p_patient_id is null)
    or (p_from is not null and (not isfinite(p_from) or not isfinite(p_to) or p_from>=p_to or p_to-p_from>interval '93 days'))
    or p_limit is null or p_limit not between 1 and 100
    or ((p_after_start is null)<>(p_after_id is null)) or (p_after_start is not null and not isfinite(p_after_start))
    or (p_statuses is not null and (cardinality(p_statuses)=0 or cardinality(p_statuses)>5
      or exists(select 1 from unnest(p_statuses) s where s is null or s not in ('scheduled','checked_in','completed','no_show','cancelled')))) then
    return jsonb_build_object('ok',false,'code','invalid_command');
  end if;
  with matching as not materialized (
    select * from public.appointments a where (p_from is null or tstzrange(a.starts_at,a.ends_at,'[)')&&tstzrange(p_from,p_to,'[)'))
      and (p_patient_id is null or a.patient_id=p_patient_id) and (p_provider_id is null or a.provider_id=p_provider_id)
      and (p_location_id is null or a.location_id=p_location_id) and (p_statuses is null or a.status=any(p_statuses))
  ), page as (
    select * from matching where p_after_id is null or (starts_at,id)>(p_after_start,p_after_id)
      order by starts_at,id limit p_limit+1
  ), visible as (select * from page order by starts_at,id limit p_limit)
  select jsonb_build_object('ok',true,'observedAt',statement_timestamp(),'total',(select count(*) from matching),
    'items',coalesce((select jsonb_agg(to_jsonb(v)||jsonb_build_object(
      'patient_name',p.name,'provider_name',sp.name,'location_name',l.name,'appointment_type_name',t.name)
      order by v.starts_at,v.id) from visible v join public.patients p on p.id=v.patient_id
      join public.scheduling_providers sp on sp.id=v.provider_id join public.scheduling_locations l on l.id=v.location_id
      join public.appointment_types t on t.id=v.appointment_type_id),'[]'::jsonb),
    'next',case when (select count(*) from page)>p_limit then
      (select jsonb_build_object('startsAt',starts_at,'id',id) from visible order by starts_at desc,id desc limit 1) else null end)
    into v_result;
  return v_result;
end;
$$;

create function public.portal_read_appointment(
  p_actor_id uuid,p_id uuid,p_history_before bigint default null
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare v_current public.appointments%rowtype; v_result jsonb; v_latest public.scheduling_changes%rowtype;
begin
  if not exists(select 1 from public.staff_profiles where user_id=p_actor_id and active and onboarded_at is not null) then
    return jsonb_build_object('ok',false,'code','unauthorized');
  end if;
  if p_id is null or (p_history_before is not null and p_history_before not between 1 and 9007199254740991) then
    return jsonb_build_object('ok',false,'code','invalid_command');
  end if;
  select * into v_current from public.appointments where id=p_id;
  if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
  select * into v_latest from public.scheduling_changes where entity='appointment' and entity_id=p_id and version=v_current.version;
  with page as (
    select * from public.scheduling_changes where entity='appointment' and entity_id=p_id
      and (p_history_before is null or version<p_history_before) order by version desc limit 51
  ), visible as (select * from page order by version desc limit 50)
  select jsonb_build_object('ok',true,'observedAt',statement_timestamp(),
    'appointment',to_jsonb(v_current)||jsonb_build_object('patient_name',p.name,'provider_name',sp.name,
      'location_name',l.name,'appointment_type_name',t.name),
    'undo',case when v_latest.command<>'undo' and v_latest.occurred_at>=statement_timestamp()-interval '15 minutes' then
      jsonb_build_object('changeId',v_latest.id,'expiresAt',v_latest.occurred_at+interval '15 minutes') else null end,
    'history',jsonb_build_object('total',(select count(*) from public.scheduling_changes where entity='appointment' and entity_id=p_id),
      'items',coalesce((select jsonb_agg(to_jsonb(v) order by version desc) from visible v),'[]'::jsonb),
      'nextVersion',case when (select count(*) from page)>50 then (select min(version) from visible) else null end))
    into v_result from public.patients p join public.scheduling_providers sp on sp.id=v_current.provider_id
      join public.scheduling_locations l on l.id=v_current.location_id
      join public.appointment_types t on t.id=v_current.appointment_type_id where p.id=v_current.patient_id;
  return v_result;
end;
$$;
revoke execute on function public.portal_scheduling_catalog(uuid,text,text,boolean,integer,text,uuid),
  public.portal_read_scheduling_config(uuid,text,uuid,bigint),
  public.portal_list_appointments(uuid,timestamptz,timestamptz,uuid,uuid,uuid,text[],integer,timestamptz,uuid),
  public.portal_read_appointment(uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.portal_scheduling_catalog(uuid,text,text,boolean,integer,text,uuid),
  public.portal_read_scheduling_config(uuid,text,uuid,bigint),
  public.portal_list_appointments(uuid,timestamptz,timestamptz,uuid,uuid,uuid,text[],integer,timestamptz,uuid),
  public.portal_read_appointment(uuid,uuid,bigint) to service_role;

create function public.portal_available_appointment_slots(
  p_actor_id uuid,p_provider_id uuid,p_location_id uuid,p_date date,
  p_appointment_type_id uuid default null,p_patient_id uuid default null,
  p_appointment_id uuid default null,p_interval_minutes integer default 15
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  v_current public.appointments%rowtype;
  v_type public.appointment_types%rowtype;
  v_schedule jsonb;
  v_patient_id uuid:=p_patient_id;
  v_duration integer;
  v_before integer;
  v_after integer;
  v_result jsonb;
begin
  if not exists(select 1 from public.staff_profiles where user_id=p_actor_id and active and onboarded_at is not null) then
    return jsonb_build_object('ok',false,'code','unauthorized');
  end if;
  if p_provider_id is null or p_location_id is null or p_date is null or not isfinite(p_date)
    or p_date<date '0001-01-01' or p_date>=date '9999-12-31'
    or p_interval_minutes is null or p_interval_minutes not in (5,10,15,30,60)
    or (p_appointment_id is null and p_appointment_type_id is null) then
    return jsonb_build_object('ok',false,'code','invalid_command');
  end if;
  if p_appointment_id is not null then
    select * into v_current from public.appointments where id=p_appointment_id;
    if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
    if v_current.status<>'scheduled' then return jsonb_build_object('ok',false,'code','illegal_transition'); end if;
    if p_patient_id is not null and p_patient_id<>v_current.patient_id then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
    v_patient_id:=v_current.patient_id;
  end if;
  if v_patient_id is not null then
    if not exists(select 1 from public.patients where id=v_patient_id) then
      return jsonb_build_object('ok',false,'code','patient_not_found');
    end if;
    if exists(select 1 from public.patients where id=v_patient_id and archived_at is not null) then
      return jsonb_build_object('ok',false,'code','patient_archived');
    end if;
  end if;
  select * into v_type from public.appointment_types
    where id=coalesce(p_appointment_type_id,v_current.appointment_type_id) and active;
  if not found then return jsonb_build_object('ok',false,'code','type_unavailable'); end if;
  if p_appointment_type_id is null then
    v_duration:=v_current.duration_minutes; v_before:=v_current.buffer_before_minutes; v_after:=v_current.buffer_after_minutes;
  else
    v_duration:=v_type.duration_minutes; v_before:=v_type.buffer_before_minutes; v_after:=v_type.buffer_after_minutes;
  end if;
  if not exists(select 1 from public.scheduling_providers where id=p_provider_id and active) then
    return jsonb_build_object('ok',false,'code','provider_unavailable');
  end if;
  if not exists(select 1 from public.scheduling_locations where id=p_location_id and active) then
    return jsonb_build_object('ok',false,'code','location_unavailable');
  end if;
  v_schedule:=public.portal_provider_schedule(p_provider_id);
  with candidates as (
    select instant,instant at time zone 'America/New_York' as wall_time,
      count(*) over(partition by instant at time zone 'America/New_York') as occurrences
    from generate_series(p_date::timestamp at time zone 'America/New_York',
      ((p_date+1)::timestamp at time zone 'America/New_York') - interval '1 minute',
      make_interval(mins=>p_interval_minutes)) as instant
  ), ranges as (
    select instant,wall_time,instant+make_interval(mins=>v_duration) as ends_at,
      instant-make_interval(mins=>v_before) as reserved_from,
      instant+make_interval(mins=>v_duration+v_after) as reserved_until
    from candidates where occurrences=1 and instant>statement_timestamp()
  ), available as (
    select * from ranges r where public.portal_schedule_allows(p_location_id,r.reserved_from,r.reserved_until,
      v_schedule->'hours',v_schedule->'exceptions')
      and not exists(select 1 from public.appointments a where a.provider_id=p_provider_id
        and a.status<>'cancelled' and a.id is distinct from p_appointment_id
        and tstzrange(a.reserved_from,a.reserved_until,'[)')&&tstzrange(r.reserved_from,r.reserved_until,'[)'))
      and (v_patient_id is null or not exists(select 1 from public.appointments a where a.patient_id=v_patient_id
        and a.status<>'cancelled' and a.id is distinct from p_appointment_id
        and tstzrange(a.starts_at,a.ends_at,'[)')&&tstzrange(r.instant,r.ends_at,'[)')))
  ) select jsonb_build_object('ok',true,'observedAt',statement_timestamp(),'date',p_date,'timeZone','America/New_York',
    'appointmentTypeId',v_type.id,'expectedTypeVersion',v_type.version,
    'durationMinutes',v_duration,'bufferBeforeMinutes',v_before,'bufferAfterMinutes',v_after,
    'preservesBookedDuration',p_appointment_type_id is null,'patientChecked',v_patient_id is not null,
    'slots',coalesce((select jsonb_agg(jsonb_build_object('startsAt',instant,'endsAt',ends_at,
      'time',to_char(wall_time,'HH24:MI')) order by instant) from available),'[]'::jsonb)) into v_result;
  return v_result;
end;
$$;
revoke execute on function public.portal_available_appointment_slots(uuid,uuid,uuid,date,uuid,uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.portal_available_appointment_slots(uuid,uuid,uuid,date,uuid,uuid,uuid,integer) to service_role;

comment on table public.appointments is 'Patient-owned scheduling records. Provider and patient overlaps are rejected by database constraints.';
comment on table public.scheduling_providers is 'Staff-managed scheduling identity and availability; independent of approved public-site provider facts.';
notify pgrst,'reload schema';
