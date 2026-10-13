-- The practice's booking interval: how far apart the schedule offers openings.
--
-- One practice-wide setting, any whole quarter hour from 15 minutes to 8 hours, 60 by default.
-- Openings are found on the schedule's quarter-hour grid, so a quarter hour is the finest step.
-- Each provider is offered at most one opening per interval. The Week, Day and Month views and
-- booking availability pack openings from the first bookable quarter-hour of a provider's day: an
-- opening is offered where the type's own time (buffers included) fits the provider's hours and
-- is free of appointments, and the next opening starts no sooner than one interval after it, or
-- after the type's time when the type is longer than the interval. An opening still lasts as long
-- as the visit it books.
--
-- The interval governs only the openings offered. Booking, moving and the time picker keep
-- accepting any start the type fits, and an appointment never moves when the interval changes.
-- Admins change the interval in Settings; the change is idempotent, versioned and recorded in
-- the scheduling change history as the practice entity.

create table public.scheduling_practice (
  id uuid primary key default '00000000-0000-4000-8000-000000000001'
    constraint scheduling_practice_singleton check (id='00000000-0000-4000-8000-000000000001'),
  booking_interval_minutes integer not null default 60
    constraint scheduling_practice_booking_interval_valid check (booking_interval_minutes between 15 and 480 and booking_interval_minutes%15=0),
  version bigint not null default 1 check (version between 1 and 9007199254740991),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.scheduling_practice enable row level security;
revoke all on table public.scheduling_practice from public,anon,authenticated;
grant select,insert,update,delete on table public.scheduling_practice to service_role;
insert into public.scheduling_practice default values;

alter table public.scheduling_changes drop constraint scheduling_changes_entity_check;
alter table public.scheduling_changes add constraint scheduling_changes_entity_check
  check (entity in ('provider','location','appointment_type','appointment','practice'));
alter table public.scheduling_changes drop constraint scheduling_changes_check;
alter table public.scheduling_changes add constraint scheduling_changes_check check (
  (entity='appointment' and appointment_id is not null and appointment_id=entity_id
    and provider_id is null and location_id is null and appointment_type_id is null)
  or (entity='provider' and provider_id is not null and provider_id=entity_id
    and appointment_id is null and location_id is null and appointment_type_id is null)
  or (entity='location' and location_id is not null and location_id=entity_id
    and appointment_id is null and provider_id is null and appointment_type_id is null)
  or (entity='appointment_type' and appointment_type_id is not null and appointment_type_id=entity_id
    and appointment_id is null and provider_id is null and location_id is null)
  or (entity='practice' and appointment_id is null and provider_id is null and location_id is null
    and appointment_type_id is null)
);
alter table public.scheduling_changes drop constraint scheduling_changes_command_check;
alter table public.scheduling_changes add constraint scheduling_changes_command_check check (command in (
  'save_provider','save_location','save_appointment_type',
  'book','reschedule','cancel','check_in','complete','no_show','undo',
  'add_provider','set_provider_profile','set_provider_weekly_hours','add_time_off','remove_time_off',
  'set_provider_types','reorder_appointment_types','set_appointment_type_active','delete_appointment_type',
  'save_location_details','add_location_closure','remove_location_closure','set_provider_day_hours',
  'set_booking_interval'));

-- The interval the schedule offers openings at; 60 if the practice row is missing.
create function public.portal_booking_interval() returns integer
language sql stable security invoker set search_path = '' as $$
  select coalesce((select booking_interval_minutes from public.scheduling_practice), 60);
$$;
revoke execute on function public.portal_booking_interval() from public,anon,authenticated;
grant execute on function public.portal_booking_interval() to service_role;

-- Settings: set the booking interval. Admin-only, idempotent by key, checked against the
-- version the window last read.
create function public.portal_set_booking_interval(
  p_actor_id uuid, p_idempotency_key uuid, p_fingerprint text, p_command jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_staff public.staff_profiles%rowtype;
  v_receipt public.scheduling_command_receipts%rowtype;
  v_practice public.scheduling_practice%rowtype;
  v_id uuid;
  v_version bigint;
  v_minutes integer;
  v_before jsonb;
  v_after jsonb;
  v_now timestamptz;
  v_change_id uuid;
  v_result jsonb;
begin
  select * into v_staff from public.staff_profiles
    where user_id=p_actor_id and active and onboarded_at is not null for share;
  if not found then return jsonb_build_object('ok',false,'code','unauthorized'); end if;
  if v_staff.role<>'admin' then return jsonb_build_object('ok',false,'code','forbidden'); end if;
  if p_idempotency_key is null or p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$'
    or jsonb_typeof(p_command) is distinct from 'object'
    or p_command->>'kind' is distinct from 'set_booking_interval'
    or p_command-array['kind','id','expectedVersion','minutes']<>'{}'::jsonb
    or jsonb_typeof(p_command->'id') is distinct from 'string'
    or jsonb_typeof(p_command->'expectedVersion') is distinct from 'number'
    or jsonb_typeof(p_command->'minutes') is distinct from 'number' then
    return jsonb_build_object('ok',false,'code','invalid_command');
  end if;
  v_id:=(p_command->>'id')::uuid;
  v_version:=(p_command->>'expectedVersion')::bigint;
  v_minutes:=(p_command->>'minutes')::integer;
  if v_version not between 1 and 9007199254740991 or v_minutes not between 15 and 480 or v_minutes%15<>0 then
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

  select * into v_practice from public.scheduling_practice where id=v_id for update;
  if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
  if v_practice.version<>v_version then
    return jsonb_build_object('ok',false,'code','stale_version','currentVersion',v_practice.version);
  end if;
  v_now:=clock_timestamp();
  v_before:=jsonb_build_object('id',v_practice.id,'bookingIntervalMinutes',v_practice.booking_interval_minutes,
    'version',v_practice.version);
  update public.scheduling_practice set booking_interval_minutes=v_minutes,version=version+1,
    updated_by=p_actor_id,updated_at=v_now
    where id=v_id returning * into v_practice;
  v_after:=jsonb_build_object('id',v_practice.id,'bookingIntervalMinutes',v_practice.booking_interval_minutes,
    'version',v_practice.version);
  insert into public.scheduling_changes(entity,entity_id,version,command,before_record,after_record,
    actor_id,actor_email,occurred_at)
    values('practice',v_id,v_practice.version,'set_booking_interval',v_before,v_after,p_actor_id,
      v_staff.email,v_now)
    returning id into v_change_id;
  insert into public.audit_log(actor_email,action,entity,entity_id,source,correlation_id,detail,at)
    values(v_staff.email,'scheduling.set_booking_interval','scheduling',v_id,'staff',p_idempotency_key,
      jsonb_build_object('entity','practice','version',v_practice.version),v_now);
  v_result:=jsonb_build_object('ok',true,'entity','practice','id',v_id,'version',v_practice.version);
  insert into public.scheduling_command_receipts(idempotency_key,change_id,actor_id,fingerprint,result,created_at)
    values(p_idempotency_key,v_change_id,p_actor_id,p_fingerprint,v_result,v_now);
  return v_result;
exception when invalid_text_representation or numeric_value_out_of_range then
  return jsonb_build_object('ok',false,'code','invalid_command');
end;
$$;
revoke execute on function public.portal_set_booking_interval(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.portal_set_booking_interval(uuid,uuid,text,jsonb) to service_role;

-- Openings on the Week, Day and Month views: at most one per provider per booking interval.
-- With no type asked for, each provider is measured in the shortest active type they see.
create or replace function public.portal_schedule_greedy_opens(
  p_first date, p_last date, p_provider_ids uuid[], p_location_id uuid, p_type_id uuid
) returns table(provider_id uuid, location_id uuid, day date, starts_at timestamptz, ends_at timestamptz,
  appointment_type_id uuid)
language plpgsql stable security invoker set search_path = '' as $$
#variable_conflict use_column
declare
  v_now timestamptz := statement_timestamp();
  v_today date := (statement_timestamp() at time zone 'America/New_York')::date;
  v_range_start timestamptz := p_first::timestamp at time zone 'America/New_York';
  v_range_end timestamptz := (p_last+1)::timestamp at time zone 'America/New_York';
  v_row record;
  v_provider uuid;
  v_until timestamptz;
  v_interval interval := make_interval(mins=>public.portal_booking_interval());
begin
  if greatest(p_first,v_today)>p_last then return; end if;
  for v_row in
    with providers as (
      select p.id,t.id as type_id,t.duration_minutes,t.buffer_before_minutes,t.buffer_after_minutes
      from public.scheduling_providers p
      cross join lateral (
        select t.id,t.duration_minutes,t.buffer_before_minutes,t.buffer_after_minutes
        from public.appointment_types t
        join public.appointment_type_providers x on x.appointment_type_id=t.id and x.provider_id=p.id
        where (p_type_id is null and t.active) or t.id=p_type_id
        order by t.duration_minutes,t.created_at,t.id limit 1
      ) t
      where p.active and p.bookable and (p_provider_ids is null or p.id=any(p_provider_ids))
    ), locations as (
      select l.id from public.scheduling_locations l
      where l.active and (p_location_id is null or l.id=p_location_id)
    ), located as (
      select distinct h.provider_id,h.location_id from public.provider_hours h
        join providers p on p.id=h.provider_id join locations l on l.id=h.location_id
      union
      select distinct e.provider_id,e.location_id from public.provider_time_exceptions e
        join providers p on p.id=e.provider_id join locations l on l.id=e.location_id
        where e.kind='available' and e.starts_at<v_range_end and e.ends_at>v_range_start
    ), pairs as (
      select x.provider_id,x.location_id,p.type_id,p.duration_minutes,p.buffer_before_minutes,p.buffer_after_minutes
      from located x join providers p on p.id=x.provider_id
    ), days as (
      select d::date as day from generate_series(greatest(p_first,v_today)::timestamp,p_last::timestamp,interval '1 day') d
    ), grid as (
      select dy.day,s.instant,
        count(*) over(partition by dy.day,s.instant at time zone 'America/New_York') as occurrences
      from days dy cross join lateral generate_series(dy.day::timestamp at time zone 'America/New_York',
        ((dy.day+1)::timestamp at time zone 'America/New_York')-interval '1 minute',interval '15 minutes') as s(instant)
    ), ranges as (
      select p.provider_id,p.location_id,p.type_id,p.duration_minutes,g.day,g.instant,
        g.instant-make_interval(mins=>p.buffer_before_minutes) as reserved_from,
        g.instant+make_interval(mins=>p.duration_minutes+p.buffer_after_minutes) as reserved_until
      from pairs p cross join grid g
      where g.occurrences=1 and g.instant>v_now
        and not exists(select 1 from public.location_closures c
          where c.location_id=p.location_id and c.closed_on=g.day)
    ), dated as (
      select r.*,(r.reserved_from at time zone 'America/New_York')::date as start_day from ranges r
    )
    select r.provider_id as slot_provider,r.location_id as slot_location,r.day as slot_day,
      r.instant,r.reserved_from,r.reserved_until,r.type_id as slot_type,r.duration_minutes as slot_duration
    from dated r
    where (
      exists(select 1 from public.provider_hours h
        where h.provider_id=r.provider_id and h.location_id=r.location_id
        and h.weekday=extract(dow from r.start_day)::integer
        and r.start_day>=h.valid_from and (h.valid_to is null or r.start_day<=h.valid_to)
        and r.reserved_from>=((r.start_day::timestamp+make_interval(mins=>h.open_minute)) at time zone 'America/New_York')
        and r.reserved_until<=((r.start_day::timestamp+make_interval(mins=>h.close_minute)) at time zone 'America/New_York'))
      or exists(select 1 from public.provider_time_exceptions e
        where e.provider_id=r.provider_id and e.kind='available' and e.location_id=r.location_id
        and e.starts_at<=r.reserved_from and e.ends_at>=r.reserved_until)
    )
    and not exists(select 1 from public.provider_time_exceptions e
      where e.provider_id=r.provider_id and e.kind='unavailable'
      and (e.location_id is null or e.location_id=r.location_id)
      and e.starts_at<r.reserved_until and e.ends_at>r.reserved_from)
    and not exists(select 1 from public.appointments a
      where a.provider_id=r.provider_id and a.status<>'cancelled'
      and tstzrange(a.reserved_from,a.reserved_until,'[)')&&tstzrange(r.reserved_from,r.reserved_until,'[)'))
    order by r.provider_id,r.instant,r.location_id
  loop
    if v_row.slot_provider is distinct from v_provider then
      v_provider:=v_row.slot_provider;
      v_until:='-infinity'::timestamptz;
    end if;
    -- The same instant at a second location is rejected here: its range starts before v_until.
    -- The next opening waits one booking interval, or the type's time when that is longer.
    if v_row.reserved_from>=v_until then
      provider_id:=v_row.slot_provider;
      location_id:=v_row.slot_location;
      day:=v_row.slot_day;
      starts_at:=v_row.instant;
      ends_at:=v_row.instant+make_interval(mins=>v_row.slot_duration);
      appointment_type_id:=v_row.slot_type;
      return next;
      v_until:=greatest(v_row.reserved_until,v_row.instant+v_interval);
    end if;
  end loop;
end;
$$;
revoke execute on function public.portal_schedule_greedy_opens(date,date,uuid[],uuid,uuid) from public,anon,authenticated;
grant execute on function public.portal_schedule_greedy_opens(date,date,uuid[],uuid,uuid) to service_role;

-- Booking availability packs its openings the same way.
create or replace function public.portal_schedule_month_availability(
  p_actor_id uuid, p_month date, p_appointment_type_id uuid, p_request_location text,
  p_patient_id uuid default null
) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare
  v_now timestamptz:=statement_timestamp();
  v_today date:=(statement_timestamp() at time zone 'America/New_York')::date;
  v_type public.appointment_types%rowtype;
  v_last date;
  v_month_start timestamptz;
  v_month_end timestamptz;
  v_locations uuid[];
  v_provider record;
  v_location record;
  v_day date;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_scheduled tstzmultirange;
  v_working tstzmultirange;
  v_read jsonb;
  v_slot jsonb;
  v_start timestamptz;
  v_until timestamptz;
  v_interval interval:=make_interval(mins=>public.portal_booking_interval());
  v_open jsonb;
  v_booked integer;
  v_working_any boolean;
  v_entries jsonb:='[]'::jsonb;
  v_result jsonb;
begin
  if not exists(select 1 from public.staff_profiles where user_id=p_actor_id and active and onboarded_at is not null) then
    return jsonb_build_object('ok',false,'code','unauthorized');
  end if;
  if p_month is null or not isfinite(p_month) or p_month<>date_trunc('month',p_month)::date
    or p_month<date '2000-01-01' or p_month>date '2199-12-01' or p_appointment_type_id is null
    or p_request_location is null or p_request_location not in ('tampa','lutz','any') then
    return jsonb_build_object('ok',false,'code','invalid_command');
  end if;
  if p_patient_id is not null then
    if not exists(select 1 from public.patients where id=p_patient_id) then
      return jsonb_build_object('ok',false,'code','patient_not_found');
    end if;
    if exists(select 1 from public.patients where id=p_patient_id and archived_at is not null) then
      return jsonb_build_object('ok',false,'code','patient_archived');
    end if;
  end if;
  select * into v_type from public.appointment_types where id=p_appointment_type_id and active;
  if not found then return jsonb_build_object('ok',false,'code','type_unavailable'); end if;
  select array_agg(id order by name,id) into v_locations from public.scheduling_locations
    where active and request_location is not null
    and (p_request_location='any' or request_location=p_request_location);
  if v_locations is null then return jsonb_build_object('ok',false,'code','location_unavailable'); end if;

  v_last:=(p_month+interval '1 month'-interval '1 day')::date;
  v_month_start:=p_month::timestamp at time zone 'America/New_York';
  v_month_end:=(v_last+1)::timestamp at time zone 'America/New_York';

  -- Providers scheduled at the office this month: an hours row or an available exception.
  for v_provider in
    select p.id,p.name from public.scheduling_providers p
    where p.active and p.bookable and exists(select 1 from public.appointment_type_providers x
      where x.appointment_type_id=v_type.id and x.provider_id=p.id) and (
      exists(select 1 from public.provider_hours h where h.provider_id=p.id and h.location_id=any(v_locations)
        and h.valid_from<=v_last and (h.valid_to is null or h.valid_to>=p_month))
      or exists(select 1 from public.provider_time_exceptions e where e.provider_id=p.id and e.kind='available'
        and e.location_id=any(v_locations) and e.starts_at<v_month_end and e.ends_at>v_month_start))
    order by p.sort_order,lower(p.name),p.id
  loop
    for v_day in select d::date from generate_series(greatest(p_month,v_today)::timestamp,v_last::timestamp,interval '1 day') d
    loop
      v_day_start:=v_day::timestamp at time zone 'America/New_York';
      v_day_end:=(v_day+1)::timestamp at time zone 'America/New_York';
      v_working_any:=false;
      for v_location in
        select l.id,l.name from public.scheduling_locations l where l.id=any(v_locations) order by l.name,l.id
      loop
        -- Scheduled time reads the sources portal_schedule_allows reads.
        v_scheduled:=coalesce((select range_agg(tstzrange(
            (v_day::timestamp+make_interval(mins=>h.open_minute)) at time zone 'America/New_York',
            (v_day::timestamp+make_interval(mins=>h.close_minute)) at time zone 'America/New_York','[)'))
          from public.provider_hours h
          where h.provider_id=v_provider.id and h.location_id=v_location.id
          and h.weekday=extract(dow from v_day)::integer
          and v_day>=h.valid_from and (h.valid_to is null or v_day<=h.valid_to)),'{}'::tstzmultirange)
        + coalesce((select range_agg(tstzrange(greatest(e.starts_at,v_day_start),least(e.ends_at,v_day_end),'[)'))
          from public.provider_time_exceptions e
          where e.provider_id=v_provider.id and e.kind='available' and e.location_id=v_location.id
          and e.starts_at<v_day_end and e.ends_at>v_day_start),'{}'::tstzmultirange);
        if exists(select 1 from public.location_closures c where c.location_id=v_location.id and c.closed_on=v_day) then
          v_scheduled:='{}'::tstzmultirange;
        end if;
        continue when isempty(v_scheduled);
        v_working_any:=true;
        v_working:=v_scheduled-coalesce((select range_agg(tstzrange(e.starts_at,e.ends_at,'[)'))
          from public.provider_time_exceptions e
          where e.provider_id=v_provider.id and e.kind='unavailable'
          and (e.location_id is null or e.location_id=v_location.id)
          and e.starts_at<v_day_end and e.ends_at>v_day_start),'{}'::tstzmultirange);
        select count(*) into v_booked from public.appointments a
          where a.provider_id=v_provider.id and a.location_id=v_location.id and a.status<>'cancelled'
          and a.starts_at>=v_day_start and a.starts_at<v_day_end;
        v_open:='[]'::jsonb;
        if not isempty(v_working) then
          v_read:=public.portal_available_appointment_slots(p_actor_id,v_provider.id,v_location.id,v_day,
            v_type.id,p_patient_id,null,15);
          if v_read is null or not coalesce((v_read->>'ok')::boolean,false) then
            return coalesce(v_read,jsonb_build_object('ok',false,'code','unavailable'));
          end if;
          v_until:='-infinity'::timestamptz;
          for v_slot in select value from jsonb_array_elements(v_read->'slots') loop
            v_start:=(v_slot->>'startsAt')::timestamptz;
            if v_start-make_interval(mins=>v_type.buffer_before_minutes)>=v_until then
              v_open:=v_open||jsonb_build_array(jsonb_build_object('startsAt',v_slot->'startsAt','time',v_slot->'time'));
              v_until:=greatest(v_start+make_interval(mins=>v_type.duration_minutes+v_type.buffer_after_minutes),
                v_start+v_interval);
            end if;
          end loop;
        end if;
        v_entries:=v_entries||jsonb_build_array(jsonb_build_object(
          'date',v_day,'providerId',v_provider.id,'providerName',v_provider.name,
          'locationId',v_location.id,'locationName',v_location.name,
          'open',v_open,'booked',v_booked,'capacity',v_booked+jsonb_array_length(v_open),
          'reason',case when jsonb_array_length(v_open)>0 then null
            when isempty(v_working) then 'time_off' else 'booked_out' end));
      end loop;
      if not v_working_any then
        v_entries:=v_entries||jsonb_build_array(jsonb_build_object(
          'date',v_day,'providerId',v_provider.id,'providerName',v_provider.name,
          'locationId',null,'locationName',null,'open','[]'::jsonb,'booked',0,'capacity',0,
          'reason','no_hours'));
      end if;
    end loop;
  end loop;

  select jsonb_build_object('ok',true,'observedAt',v_now,'today',v_today,
    'month',to_char(p_month,'YYYY-MM'),'timeZone','America/New_York',
    'appointmentType',jsonb_build_object('id',v_type.id,'name',v_type.name,'version',v_type.version,
      'durationMinutes',v_type.duration_minutes,'bufferBeforeMinutes',v_type.buffer_before_minutes,
      'bufferAfterMinutes',v_type.buffer_after_minutes),
    'locations',(select jsonb_agg(jsonb_build_object('id',l.id,'name',l.name,'requestLocation',l.request_location)
      order by l.name,l.id) from public.scheduling_locations l where l.id=any(v_locations)),
    'providers',coalesce((select jsonb_agg(jsonb_build_object('id',x.provider_id,'name',x.provider_name,
        'locations',x.locations) order by x.position)
      from (select e.value->>'providerId' provider_id,e.value->>'providerName' provider_name,
          min(e.ordinality) position,
          jsonb_agg(distinct jsonb_build_object('id',e.value->'locationId','name',e.value->'locationName'))
            filter (where e.value->>'locationId' is not null) locations
        from jsonb_array_elements(v_entries) with ordinality e group by 1,2) x
      where x.locations is not null),'[]'::jsonb),
    'days',(select jsonb_agg(jsonb_build_object('date',d.day,'past',d.day<v_today,
        'open',coalesce(t.open,0),'booked',coalesce(t.booked,0),'capacity',coalesce(t.capacity,0),
        'providers',coalesce(t.providers,'[]'::jsonb)) order by d.day)
      from (select g::date as day from generate_series(p_month::timestamp,v_last::timestamp,interval '1 day') g) d
      left join lateral (
        select sum(jsonb_array_length(e.value->'open')) open,sum((e.value->>'booked')::int) booked,
          sum((e.value->>'capacity')::int) capacity,
          jsonb_agg(e.value-'date' order by e.ordinality) providers
        from jsonb_array_elements(v_entries) with ordinality e
        where (e.value->>'date')::date=d.day
      ) t on true))
  into v_result;
  return v_result;
end;
$$;
revoke execute on function public.portal_schedule_month_availability(uuid,date,uuid,text,uuid)
  from public,anon,authenticated;
grant execute on function public.portal_schedule_month_availability(uuid,date,uuid,text,uuid)
  to service_role;

-- Everything the Settings window shows, now with the practice's booking interval.
create or replace function public.portal_scheduling_settings(p_actor_id uuid)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  v_role text;
  v_now timestamptz:=statement_timestamp();
  v_today date:=(statement_timestamp() at time zone 'America/New_York')::date;
  v_result jsonb;
begin
  select role into v_role from public.staff_profiles where user_id=p_actor_id and active and onboarded_at is not null;
  if not found then return jsonb_build_object('ok',false,'code','unauthorized'); end if;
  select jsonb_build_object('ok',true,'observedAt',v_now,'today',v_today,'timeZone','America/New_York',
    'canEdit',v_role='admin',
    'practice',(select jsonb_build_object('id',s.id,'bookingIntervalMinutes',s.booking_interval_minutes,
      'version',s.version) from public.scheduling_practice s),
    'providers',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,
        'credentials',p.credentials,'bookable',p.bookable,'version',p.version,'sortOrder',p.sort_order,
        -- The week in force from today: rows that end before today are history.
        'hours',coalesce((select jsonb_agg(jsonb_build_object('id',h.id,'locationId',h.location_id,
            'weekday',h.weekday,'openMinute',h.open_minute,'closeMinute',h.close_minute,
            'validFrom',h.valid_from,'validTo',h.valid_to) order by h.weekday,h.open_minute,h.valid_from,h.id)
          from public.provider_hours h where h.provider_id=p.id and (h.valid_to is null or h.valid_to>=v_today)),'[]'::jsonb),
        'timeOff',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'startsAt',e.starts_at,'endsAt',e.ends_at,
            'locationId',e.location_id,'reason',e.reason,
            'allDay',(e.starts_at at time zone 'America/New_York')::time=time '00:00'
              and (e.ends_at at time zone 'America/New_York')::time=time '00:00') order by e.starts_at,e.id)
          from public.provider_time_exceptions e
          where e.provider_id=p.id and e.kind='unavailable' and e.reason is not null and e.ends_at>v_now),'[]'::jsonb),
        'typeIds',coalesce((select jsonb_agg(x.appointment_type_id order by t.sort_order,t.id)
          from public.appointment_type_providers x join public.appointment_types t on t.id=x.appointment_type_id
          where x.provider_id=p.id and t.archived_at is null),'[]'::jsonb))
      order by p.sort_order,lower(p.name),p.id)
      from public.scheduling_providers p where p.active),'[]'::jsonb),
    'types',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'icon',t.icon,
        'description',t.description,'durationMinutes',t.duration_minutes,
        'bufferBeforeMinutes',t.buffer_before_minutes,'bufferAfterMinutes',t.buffer_after_minutes,
        'active',t.active,'version',t.version,'sortOrder',t.sort_order,
        'providerIds',coalesce((select jsonb_agg(x.provider_id order by p.sort_order,p.id)
          from public.appointment_type_providers x join public.scheduling_providers p on p.id=x.provider_id
          where x.appointment_type_id=t.id and p.active),'[]'::jsonb),
        'used',exists(select 1 from public.appointments a where a.appointment_type_id=t.id))
      order by t.sort_order,lower(t.name),t.id)
      from public.appointment_types t where t.archived_at is null),'[]'::jsonb),
    'locations',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'name',l.name,'version',l.version,
        'street',l.street,'city',l.city,'region',l.region,'postal',l.postal,'mapsQuery',l.maps_query,
        'requestLocation',l.request_location,
        'hours',coalesce((select jsonb_agg(jsonb_build_object('weekday',h.weekday,
            'openMinute',h.open_minute,'closeMinute',h.close_minute) order by h.weekday)
          from public.location_hours h where h.location_id=l.id),'[]'::jsonb),
        'closures',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'closedOn',c.closed_on,'note',c.note)
            order by c.closed_on)
          from public.location_closures c where c.location_id=l.id and c.closed_on>=v_today),'[]'::jsonb),
        'providerIds',coalesce((select jsonb_agg(p.id order by p.sort_order,p.id)
          from public.scheduling_providers p where p.active and exists(select 1 from public.provider_hours h
            where h.provider_id=p.id and h.location_id=l.id and (h.valid_to is null or h.valid_to>=v_today))),'[]'::jsonb))
      order by l.name,l.id)
      from public.scheduling_locations l where l.active),'[]'::jsonb))
  into v_result;
  return v_result;
end;
$$;
revoke execute on function public.portal_scheduling_settings(uuid) from public,anon,authenticated;
grant execute on function public.portal_scheduling_settings(uuid) to service_role;

notify pgrst,'reload schema';
