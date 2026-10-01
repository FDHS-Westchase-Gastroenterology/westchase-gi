-- The Schedule month view reads one summary per practice date (issue #343).
-- Open counts place the reference type greedily under the same conflict rules as
-- portal_available_appointment_slots: a reserved range sits inside a single hours row or a
-- single available exception, never overlaps an unavailable exception for that location or
-- every location, and never overlaps the provider's non-cancelled reserved ranges.
create function public.portal_schedule_month_summary(
  p_actor_id uuid, p_month date, p_location_id uuid default null, p_appointment_type_id uuid default null
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  v_now timestamptz := statement_timestamp();
  v_today date := (statement_timestamp() at time zone 'America/New_York')::date;
  v_type public.appointment_types%rowtype;
  v_last date;
  v_month_start timestamptz;
  v_month_end timestamptz;
  v_row record;
  v_provider uuid;
  v_until timestamptz;
  v_slot_providers uuid[] := '{}';
  v_slot_days date[] := '{}';
  v_slot_starts timestamptz[] := '{}';
  v_result jsonb;
begin
  if not exists(select 1 from public.staff_profiles where user_id=p_actor_id and active and onboarded_at is not null) then
    return jsonb_build_object('ok',false,'code','unauthorized');
  end if;
  if p_month is null or not isfinite(p_month) or p_month<>date_trunc('month',p_month)::date
    or p_month<date '2000-01-01' or p_month>date '2199-12-01' then
    return jsonb_build_object('ok',false,'code','invalid_command');
  end if;
  if p_location_id is not null and not exists(
    select 1 from public.scheduling_locations where id=p_location_id and active) then
    return jsonb_build_object('ok',false,'code','location_unavailable');
  end if;
  -- The reference type is the shortest active type; the earliest created wins a tie.
  select * into v_type from public.appointment_types
    where active and (p_appointment_type_id is null or id=p_appointment_type_id)
    order by duration_minutes, created_at, id limit 1;
  if not found then return jsonb_build_object('ok',false,'code','type_unavailable'); end if;

  v_last:=(p_month+interval '1 month'-interval '1 day')::date;
  v_month_start:=p_month::timestamp at time zone 'America/New_York';
  v_month_end:=(v_last+1)::timestamp at time zone 'America/New_York';

  -- Candidates for today and later, chronological per provider across every location.
  for v_row in
    with providers as (
      select id from public.scheduling_providers where active
    ), locations as (
      select id from public.scheduling_locations where active and (p_location_id is null or id=p_location_id)
    ), pairs as (
      select distinct h.provider_id,h.location_id from public.provider_hours h
        join providers p on p.id=h.provider_id join locations l on l.id=h.location_id
      union
      select distinct e.provider_id,e.location_id from public.provider_time_exceptions e
        join providers p on p.id=e.provider_id join locations l on l.id=e.location_id
        where e.kind='available' and e.starts_at<v_month_end and e.ends_at>v_month_start
    ), days as (
      select d::date as day from generate_series(greatest(p_month,v_today)::timestamp,v_last::timestamp,interval '1 day') d
    ), grid as (
      select dy.day,s.instant,
        count(*) over(partition by dy.day,s.instant at time zone 'America/New_York') as occurrences
      from days dy cross join lateral generate_series(dy.day::timestamp at time zone 'America/New_York',
        ((dy.day+1)::timestamp at time zone 'America/New_York')-interval '1 minute',interval '15 minutes') as s(instant)
    ), ranges as (
      select g.day,g.instant,
        g.instant-make_interval(mins=>v_type.buffer_before_minutes) as reserved_from,
        g.instant+make_interval(mins=>v_type.duration_minutes+v_type.buffer_after_minutes) as reserved_until
      from grid g where g.occurrences=1 and g.instant>v_now
    ), dated as (
      select r.*,(r.reserved_from at time zone 'America/New_York')::date as start_day from ranges r
    )
    select p.provider_id,r.day,r.instant,r.reserved_from,r.reserved_until
    from pairs p cross join dated r
    where (
      exists(select 1 from public.provider_hours h
        where h.provider_id=p.provider_id and h.location_id=p.location_id
        and h.weekday=extract(dow from r.start_day)::integer
        and r.start_day>=h.valid_from and (h.valid_to is null or r.start_day<=h.valid_to)
        and r.reserved_from>=((r.start_day::timestamp+make_interval(mins=>h.open_minute)) at time zone 'America/New_York')
        and r.reserved_until<=((r.start_day::timestamp+make_interval(mins=>h.close_minute)) at time zone 'America/New_York'))
      or exists(select 1 from public.provider_time_exceptions e
        where e.provider_id=p.provider_id and e.kind='available' and e.location_id=p.location_id
        and e.starts_at<=r.reserved_from and e.ends_at>=r.reserved_until)
    )
    and not exists(select 1 from public.provider_time_exceptions e
      where e.provider_id=p.provider_id and e.kind='unavailable'
      and (e.location_id is null or e.location_id=p.location_id)
      and e.starts_at<r.reserved_until and e.ends_at>r.reserved_from)
    and not exists(select 1 from public.appointments a
      where a.provider_id=p.provider_id and a.status<>'cancelled'
      and tstzrange(a.reserved_from,a.reserved_until,'[)')&&tstzrange(r.reserved_from,r.reserved_until,'[)'))
    order by p.provider_id,r.instant
  loop
    if v_row.provider_id is distinct from v_provider then
      v_provider:=v_row.provider_id;
      v_until:='-infinity'::timestamptz;
    end if;
    -- The same instant at a second location is rejected here: its range starts before v_until.
    if v_row.reserved_from>=v_until then
      v_slot_providers:=v_slot_providers||v_row.provider_id;
      v_slot_days:=v_slot_days||v_row.day;
      v_slot_starts:=v_slot_starts||v_row.instant;
      v_until:=v_row.reserved_until;
    end if;
  end loop;

  with providers as (
    select id,name from public.scheduling_providers where active
  ), locations as (
    select id,name from public.scheduling_locations where active and (p_location_id is null or id=p_location_id)
  ), pairs as (
    select distinct h.provider_id,h.location_id from public.provider_hours h
      join providers p on p.id=h.provider_id join locations l on l.id=h.location_id
    union
    select distinct e.provider_id,e.location_id from public.provider_time_exceptions e
      join providers p on p.id=e.provider_id join locations l on l.id=e.location_id
      where e.kind='available' and e.starts_at<v_month_end and e.ends_at>v_month_start
  ), days as (
    select d::date as day,
      d at time zone 'America/New_York' as day_start,
      (d+interval '1 day') at time zone 'America/New_York' as day_end
    from generate_series(p_month::timestamp,v_last::timestamp,interval '1 day') d
  ), location_working as (
    -- Working time: hours and available exceptions, less unavailable exceptions.
    select pl.provider_id,pl.location_id,dy.day,
      (coalesce((select range_agg(tstzrange(
          (dy.day::timestamp+make_interval(mins=>h.open_minute)) at time zone 'America/New_York',
          (dy.day::timestamp+make_interval(mins=>h.close_minute)) at time zone 'America/New_York','[)'))
        from public.provider_hours h
        where h.provider_id=pl.provider_id and h.location_id=pl.location_id
        and h.weekday=extract(dow from dy.day)::integer
        and dy.day>=h.valid_from and (h.valid_to is null or dy.day<=h.valid_to)),'{}'::tstzmultirange)
      + coalesce((select range_agg(tstzrange(greatest(e.starts_at,dy.day_start),least(e.ends_at,dy.day_end),'[)'))
        from public.provider_time_exceptions e
        where e.provider_id=pl.provider_id and e.kind='available' and e.location_id=pl.location_id
        and e.starts_at<dy.day_end and e.ends_at>dy.day_start),'{}'::tstzmultirange))
      - coalesce((select range_agg(tstzrange(e.starts_at,e.ends_at,'[)'))
        from public.provider_time_exceptions e
        where e.provider_id=pl.provider_id and e.kind='unavailable'
        and (e.location_id is null or e.location_id=pl.location_id)
        and e.starts_at<dy.day_end and e.ends_at>dy.day_start),'{}'::tstzmultirange) as working
    from pairs pl cross join days dy
  ), provider_working as (
    select w.provider_id,w.day,range_agg(r) as working,
      jsonb_agg(distinct l.name) as location_names
    from location_working w cross join lateral unnest(w.working) as r
    join locations l on l.id=w.location_id
    group by w.provider_id,w.day
  ), provider_minutes as (
    select pw.provider_id,pw.day,pw.location_names,
      (select sum(extract(epoch from upper(r)-lower(r)))/60 from unnest(pw.working) r) as minutes
    from provider_working pw
  ), slots as (
    select * from unnest(v_slot_providers,v_slot_days,v_slot_starts) as s(provider_id,day,starts_at)
  ), provider_rows as (
    select pm.day,
      sum(pm.minutes) as working_minutes,
      sum((select count(*) from slots s where s.provider_id=pm.provider_id and s.day=pm.day)) as open,
      jsonb_agg(jsonb_build_object(
        'id',p.id,'name',p.name,
        'locations',(select jsonb_agg(n order by n) from jsonb_array_elements_text(pm.location_names) n),
        'open',(select count(*) from slots s where s.provider_id=pm.provider_id and s.day=pm.day),
        'firstOpen',coalesce((select jsonb_agg(x.starts_at order by x.starts_at) from (
          select s.starts_at from slots s where s.provider_id=pm.provider_id and s.day=pm.day
          order by s.starts_at limit 2) x),'[]'::jsonb))
        order by lower(p.name),p.id) as providers
    from provider_minutes pm join providers p on p.id=pm.provider_id
    where pm.minutes>0
    group by pm.day
  ), visits as (
    select (a.starts_at at time zone 'America/New_York')::date as day,
      count(*) filter (where a.status in ('scheduled','checked_in','completed','no_show')
        and p.id is not null and l.id is not null) as booked,
      coalesce(sum(extract(epoch from a.reserved_until-a.reserved_from)/60) filter (
        where a.status in ('scheduled','checked_in','completed','no_show')
        and p.id is not null and l.id is not null),0) as reserved_minutes,
      count(*) filter (where a.status in ('checked_in','completed')) as seen
    from public.appointments a
    left join providers p on p.id=a.provider_id
    left join locations l on l.id=a.location_id
    where a.starts_at>=v_month_start and a.starts_at<v_month_end
      and (p_location_id is null or a.location_id=p_location_id)
    group by 1
  )
  select jsonb_build_object('ok',true,'observedAt',v_now,'today',v_today,
    'month',to_char(p_month,'YYYY-MM'),'timeZone','America/New_York',
    'referenceType',jsonb_build_object('id',v_type.id,'name',v_type.name,
      'durationMinutes',v_type.duration_minutes,'bufferBeforeMinutes',v_type.buffer_before_minutes,
      'bufferAfterMinutes',v_type.buffer_after_minutes),
    'days',jsonb_agg(case
      when coalesce(pr.working_minutes,0)=0 then jsonb_build_object('date',dy.day,'status','closed',
        'open',null,'bookedShare',null,'seen',null)
      when dy.day<v_today then jsonb_build_object('date',dy.day,'status','past',
        'open',null,'bookedShare',null,'seen',coalesce(v.seen,0))
      else jsonb_build_object('date',dy.day,
        'status',case when pr.open=0 then 'full' else 'open' end,
        'open',pr.open,
        'bookedShare',round(least(1,coalesce(v.reserved_minutes,0)/pr.working_minutes)::numeric,4),
        'seen',null,
        'booked',coalesce(v.booked,0),
        'capacity',coalesce(v.booked,0)+pr.open,
        'providers',pr.providers)
    end order by dy.day))
  into v_result
  from days dy
  left join provider_rows pr on pr.day=dy.day
  left join visits v on v.day=dy.day;
  return v_result;
end;
$$;
revoke execute on function public.portal_schedule_month_summary(uuid,date,uuid,uuid) from public,anon,authenticated;
grant execute on function public.portal_schedule_month_summary(uuid,date,uuid,uuid) to service_role;

notify pgrst,'reload schema';
