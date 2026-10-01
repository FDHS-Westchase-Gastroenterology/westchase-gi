-- The request card books from the staff home (issue #344).
-- Worklist rows carry the request's linked patient. patient_request_links is keyed by request_id,
-- so the join adds one column and never multiplies a row.
drop function public.portal_request_worklist_rows(text,text,timestamptz,timestamptz,timestamptz);
create function public.portal_request_worklist_rows(
  p_query text, p_location text, p_received_from timestamptz, p_received_to timestamptz,
  p_now timestamptz
) returns table(
  id uuid,name text,phone text,location text,preferred_time text,locale text,status text,
  created_at timestamptz,follow_up_at timestamptz,legacy_review_required boolean,version bigint,
  last_activity_at timestamptz,last_activity_by text,bucket text,bucket_order integer,
  ascending_time timestamptz,descending_time timestamptz,patient_id uuid
) language sql stable security invoker set search_path='' as $$
  with clock as (
    select (p_now at time zone 'America/New_York')::date today
  ), boundary as (
    select today, ((today-case extract(isodow from today)::int
      when 1 then 3 when 7 then 2 else 1 end)+time '08:00')
      at time zone 'America/New_York' previous_morning from clock
  ), candidates as (
    select r.id,r.name,r.phone,r.location,r.preferred_time,r.locale,
      case when r.status='booked' then 'scheduled' else r.status end status,
      r.created_at,r.follow_up_at,r.legacy_review_required,r.version,
      activity.at last_activity_at,actor.actor_email last_activity_by,
      case
        when r.status='new' then 0
        when r.status='contacted' and r.follow_up_at is not null
          and (r.follow_up_at at time zone 'America/New_York')::date<=b.today then 1
        when r.status='contacted' and r.follow_up_at is null
          and coalesce(activity.at,r.created_at)<b.previous_morning then 2
        when r.status='contacted' then 3
        when r.status in ('booked','scheduled') then 4
        else 5 end bucket_order,
      link.patient_id
    from public.requests r cross join boundary b
    left join public.patient_request_links link on link.request_id=r.id
    left join lateral (
      select a.at from public.audit_log a where a.entity='requests' and a.entity_id=r.id
      order by a.at desc,a.id desc limit 1
    ) activity on true
    left join lateral (
      select a.actor_email from public.audit_log a
      where a.entity='requests' and a.entity_id=r.id and a.actor_email is not null and a.actor_email<>''
      order by a.at desc,a.id desc limit 1
    ) actor on true
    where (p_query='' or strpos(lower(r.name),lower(p_query))>0
      or strpos(lower(r.phone),lower(p_query))>0 or strpos(lower(coalesce(r.email,'')),lower(p_query))>0)
      and (p_location is null or r.location=p_location)
      and (p_received_from is null or r.created_at>=p_received_from)
      and (p_received_to is null or r.created_at<p_received_to)
  )
  select c.id,c.name,c.phone,c.location,c.preferred_time,c.locale,c.status,c.created_at,
    c.follow_up_at,c.legacy_review_required,c.version,c.last_activity_at,c.last_activity_by,
    (array['new','follow_up','stale','upcoming','scheduled','closed'])[c.bucket_order+1],c.bucket_order,
    case c.bucket_order when 0 then c.created_at when 1 then c.follow_up_at
      when 2 then coalesce(c.last_activity_at,c.created_at) when 3 then c.follow_up_at end,
    case when c.bucket_order>=3 then c.created_at end,
    c.patient_id
  from candidates c;
$$;
revoke execute on function public.portal_request_worklist_rows(text,text,timestamptz,timestamptz,timestamptz)
  from public,anon,authenticated;
grant execute on function public.portal_request_worklist_rows(text,text,timestamptz,timestamptz,timestamptz)
  to service_role;

-- A scheduling location names the intake office it serves, so a request's tampa, lutz or any
-- resolves to scheduling locations. Several locations may serve one office; unmapped locations
-- stay out of the card's availability.
alter table public.scheduling_locations add column request_location text
  check (request_location in ('tampa','lutz'));
comment on column public.scheduling_locations.request_location is
  'Intake office (requests.location) this location serves; null keeps it out of request-card availability.';

-- Month availability for the request card: per practice date and provider, the open starts of
-- one appointment type at the request's office. Every start comes from
-- portal_available_appointment_slots, so a listed time is bookable when it is read. Starts are
-- placed greedily so the listed times never overlap one another; capacity is booked plus open.
-- A provider without an open start carries a reason: no_hours (no hours or available exception
-- at the office that day), time_off (unavailable exceptions cover the scheduled time), or
-- booked_out (working, but nothing fits).
create function public.portal_schedule_month_availability(
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
    where p.active and (
      exists(select 1 from public.provider_hours h where h.provider_id=p.id and h.location_id=any(v_locations)
        and h.valid_from<=v_last and (h.valid_to is null or h.valid_to>=p_month))
      or exists(select 1 from public.provider_time_exceptions e where e.provider_id=p.id and e.kind='available'
        and e.location_id=any(v_locations) and e.starts_at<v_month_end and e.ends_at>v_month_start))
    order by lower(p.name),p.id
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
              v_until:=v_start+make_interval(mins=>v_type.duration_minutes+v_type.buffer_after_minutes);
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
        'locations',x.locations) order by lower(x.provider_name),x.provider_id)
      from (select e->>'providerId' provider_id,e->>'providerName' provider_name,
          jsonb_agg(distinct jsonb_build_object('id',e->'locationId','name',e->'locationName'))
            filter (where e->>'locationId' is not null) locations
        from jsonb_array_elements(v_entries) e group by 1,2) x
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

notify pgrst,'reload schema';
