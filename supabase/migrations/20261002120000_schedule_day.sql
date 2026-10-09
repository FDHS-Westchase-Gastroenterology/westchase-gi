-- The Schedule day view (issue #351): every provider working a practice date, side by side.
--
-- Working time and open placements come from the shared functions the month summary and the
-- week read use, so a provider's open count on the day equals the month's for the same date.

-- Providers who work the date, in name order, with each location window, their visits (every
-- status but cancelled), their open placements and their open count. A provider with visits on
-- the date also gets a column, so no visit is hidden; every other active provider is off.
create function public.portal_schedule_day(
  p_actor_id uuid, p_date date, p_appointment_type_id uuid default null
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  v_now timestamptz := statement_timestamp();
  v_today date := (statement_timestamp() at time zone 'America/New_York')::date;
  v_type public.appointment_types%rowtype;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_result jsonb;
begin
  if not exists(select 1 from public.staff_profiles where user_id=p_actor_id and active and onboarded_at is not null) then
    return jsonb_build_object('ok',false,'code','unauthorized');
  end if;
  if p_date is null or not isfinite(p_date)
    or p_date<date '2000-01-01' or p_date>date '2199-12-31' then
    return jsonb_build_object('ok',false,'code','invalid_command');
  end if;
  -- The month summary's reference type: the shortest active type, the earliest created on a tie.
  select * into v_type from public.appointment_types
    where active and (p_appointment_type_id is null or id=p_appointment_type_id)
    order by duration_minutes, created_at, id limit 1;
  if not found then return jsonb_build_object('ok',false,'code','type_unavailable'); end if;

  v_day_start:=p_date::timestamp at time zone 'America/New_York';
  v_day_end:=(p_date+1)::timestamp at time zone 'America/New_York';

  with providers as (
    select id,name from public.scheduling_providers where active
  ), locations as (
    select id,name from public.scheduling_locations where active
  ), working as (
    select w.provider_id,w.location_id,lower(r) as from_at,upper(r) as until_at
    from public.portal_schedule_working(p_date,p_date,null,null) w
    cross join lateral unnest(w.working) as r
  ), slots as (
    select o.provider_id,o.location_id,o.starts_at,o.ends_at
    from public.portal_schedule_greedy_opens(p_date,p_date,null,null,v_type.id) o
  ), visits as (
    select a.id,a.version,a.provider_id,a.starts_at,a.ends_at,a.status,
      t.name as type_name,pt.name as patient_name
    from public.appointments a
    join public.appointment_types t on t.id=a.appointment_type_id
    join public.patients pt on pt.id=a.patient_id
    where a.status<>'cancelled' and a.starts_at>=v_day_start and a.starts_at<v_day_end
  ), shown as (
    select p.id,p.name from providers p
    where exists(select 1 from working w where w.provider_id=p.id)
      or exists(select 1 from visits v where v.provider_id=p.id)
  )
  select jsonb_build_object('ok',true,'observedAt',v_now,'today',v_today,
    'date',p_date,'timeZone','America/New_York',
    'activeProviderCount',(select count(*) from providers),
    'referenceType',jsonb_build_object('id',v_type.id,'name',v_type.name,
      'durationMinutes',v_type.duration_minutes,'version',v_type.version),
    'providers',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,
      'working',coalesce((select jsonb_agg(jsonb_build_object('from',w.from_at,'until',w.until_at,
          'locationId',w.location_id,'locationName',l.name) order by w.from_at,l.name)
        from working w join locations l on l.id=w.location_id where w.provider_id=s.id),'[]'::jsonb),
      'appointments',coalesce((select jsonb_agg(jsonb_build_object(
          'id',v.id,'version',v.version,'startsAt',v.starts_at,'endsAt',v.ends_at,'status',v.status,
          'appointmentType',v.type_name,'patientName',v.patient_name,
          -- The list name is the surname: the last word of the registry name.
          'patientListName',(regexp_match(v.patient_name,'(\S+)$'))[1])
        order by v.starts_at,v.id)
        from visits v where v.provider_id=s.id),'[]'::jsonb),
      'open',coalesce((select jsonb_agg(jsonb_build_object('startsAt',o.starts_at,'endsAt',o.ends_at,
          'locationId',o.location_id,'locationName',l.name) order by o.starts_at)
        from slots o join locations l on l.id=o.location_id where o.provider_id=s.id),'[]'::jsonb),
      'seen',case when p_date<v_today then (select count(*) from visits v
        where v.provider_id=s.id and v.status in ('checked_in','completed')) end,
      'openCount',case when p_date>=v_today then (select count(*) from slots o
        where o.provider_id=s.id) end)
      order by lower(s.name),s.id) from shown s),'[]'::jsonb),
    'off',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name)
      order by lower(p.name),p.id)
      from providers p where not exists(select 1 from shown s where s.id=p.id)),'[]'::jsonb))
  into v_result;
  return v_result;
end;
$$;
revoke execute on function public.portal_schedule_day(uuid,date,uuid) from public,anon,authenticated;
grant execute on function public.portal_schedule_day(uuid,date,uuid) to service_role;

notify pgrst,'reload schema';
