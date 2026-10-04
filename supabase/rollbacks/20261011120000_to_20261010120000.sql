-- Reverses 20261011120000_openings_on_the_clock: openings start one booking interval after the
-- last opening or booking again, wherever that lands, and a booked visit holds its provider for
-- one interval. The definitions below are 20261009120100_booked_visits_hold_interval's.

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
    -- A booked appointment holds its provider for one interval, or its own time when longer.
    and not exists(select 1 from public.appointments a
      where a.provider_id=r.provider_id and a.status<>'cancelled'
      and tstzrange(a.reserved_from,greatest(a.reserved_until,a.starts_at+v_interval),'[)')
        &&tstzrange(r.reserved_from,r.reserved_until,'[)'))
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
  v_held tstzmultirange;
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
          -- A booked appointment holds its provider for one interval, or its own time when longer.
          v_held:=coalesce((select range_agg(tstzrange(a.reserved_from,
              greatest(a.reserved_until,a.starts_at+v_interval),'[)'))
            from public.appointments a
            where a.provider_id=v_provider.id and a.status<>'cancelled'
            and a.reserved_from<v_day_end
            and greatest(a.reserved_until,a.starts_at+v_interval)>v_day_start),
            '{}'::tstzmultirange);
          v_until:='-infinity'::timestamptz;
          for v_slot in select value from jsonb_array_elements(v_read->'slots') loop
            v_start:=(v_slot->>'startsAt')::timestamptz;
            if v_start-make_interval(mins=>v_type.buffer_before_minutes)>=v_until
              and not tstzrange(v_start-make_interval(mins=>v_type.buffer_before_minutes),
                v_start+make_interval(mins=>v_type.duration_minutes+v_type.buffer_after_minutes),'[)')
                &&v_held then
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
