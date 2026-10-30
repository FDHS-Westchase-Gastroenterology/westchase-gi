-- A provider's hours for one day, or for one weekday from a day on (#353).
--
-- The Day view's Hours sheet edits the hours layer of a practice day: the weekly windows valid
-- that day, plus available exceptions, minus unavailable exceptions that carry no reason. An
-- unavailable range with no reason is an hours change, not time off; time off always carries one
-- (add_time_off requires it), so Settings lists only those, and time off still subtracts from
-- whatever the hours layer says.
--
-- "This day only" rewrites the day's reasonless exceptions so the layer equals the windows sent.
-- "Every <weekday>" ends that weekday's weekly rows the day before and starts the new windows on
-- the day; it clears that day's one-off hours and leaves later one-off days as they were.
--
-- A change never strands a scheduled, checked-in or completed appointment, never puts a window
-- outside the office's hours, never schedules a provider who is not bookable, and never rewrites
-- the part of today that has already passed. Undo restores the provider's hours and exceptions
-- exactly as they were before the change, when nothing has changed them since.

alter table public.scheduling_changes drop constraint scheduling_changes_command_check;
alter table public.scheduling_changes add constraint scheduling_changes_command_check check (command in (
  'save_provider','save_location','save_appointment_type',
  'book','reschedule','cancel','check_in','complete','no_show','undo',
  'add_provider','set_provider_profile','set_provider_weekly_hours','add_time_off','remove_time_off',
  'set_provider_types','reorder_appointment_types','set_appointment_type_active','delete_appointment_type',
  'save_location_details','add_location_closure','remove_location_closure','set_provider_day_hours'));

-- The hours layer of one practice day, per office: weekly windows and available exceptions,
-- less the unavailable ranges that carry no reason. Closures and time off are not applied.
create function public.portal_provider_day_layer(p_provider_id uuid, p_day date)
returns table(location_id uuid, hours tstzmultirange)
language sql stable security invoker set search_path = '' as $$
  with bounds as (
    select p_day::timestamp at time zone 'America/New_York' as day_start,
      (p_day+1)::timestamp at time zone 'America/New_York' as day_end
  ), places as (
    select h.location_id from public.provider_hours h
      where h.provider_id=p_provider_id and h.weekday=extract(dow from p_day)::integer
      and p_day>=h.valid_from and (h.valid_to is null or p_day<=h.valid_to)
    union
    select e.location_id from public.provider_time_exceptions e cross join bounds b
      where e.provider_id=p_provider_id and e.kind='available'
      and e.starts_at<b.day_end and e.ends_at>b.day_start
  )
  select pl.location_id,
    (coalesce((select range_agg(tstzrange(
        (p_day::timestamp+make_interval(mins=>h.open_minute)) at time zone 'America/New_York',
        (p_day::timestamp+make_interval(mins=>h.close_minute)) at time zone 'America/New_York','[)'))
      from public.provider_hours h
      where h.provider_id=p_provider_id and h.location_id=pl.location_id
      and h.weekday=extract(dow from p_day)::integer
      and p_day>=h.valid_from and (h.valid_to is null or p_day<=h.valid_to)),'{}'::tstzmultirange)
    + coalesce((select range_agg(tstzrange(greatest(e.starts_at,b.day_start),least(e.ends_at,b.day_end),'[)'))
      from public.provider_time_exceptions e
      where e.provider_id=p_provider_id and e.kind='available' and e.location_id=pl.location_id
      and e.starts_at<b.day_end and e.ends_at>b.day_start),'{}'::tstzmultirange))
    - coalesce((select range_agg(tstzrange(e.starts_at,e.ends_at,'[)'))
      from public.provider_time_exceptions e
      where e.provider_id=p_provider_id and e.kind='unavailable' and e.reason is null
      and (e.location_id is null or e.location_id=pl.location_id)
      and e.starts_at<b.day_end and e.ends_at>b.day_start),'{}'::tstzmultirange)
  from places pl cross join bounds b;
$$;

-- The hours layer as the windows the sheet edits: minutes from the day's midnight.
create function public.portal_provider_day_windows(p_provider_id uuid, p_day date)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('locationId',l.location_id,
      'openMinute',(extract(epoch from (lower(r) at time zone 'America/New_York')-p_day::timestamp)/60)::integer,
      'closeMinute',(extract(epoch from (upper(r) at time zone 'America/New_York')-p_day::timestamp)/60)::integer)
    order by lower(r)),'[]'::jsonb)
  from public.portal_provider_day_layer(p_provider_id,p_day) l cross join lateral unnest(l.hours) r;
$$;

-- The part of a day's hours layer before p_lock, per office, as comparable text.
create function public.portal_provider_day_past(p_provider_id uuid, p_day date, p_lock timestamptz)
returns text language sql stable security invoker set search_path = '' as $$
  select coalesce(string_agg(l.location_id::text||'='||
      (l.hours*tstzmultirange(tstzrange(p_day::timestamp at time zone 'America/New_York',p_lock,'[)')))::text,
      ';' order by l.location_id),'')
  from public.portal_provider_day_layer(p_provider_id,p_day) l
  where not isempty(l.hours*tstzmultirange(tstzrange(p_day::timestamp at time zone 'America/New_York',p_lock,'[)')));
$$;

-- The appointments a change of a provider's hours would strand: booked under the old schedule,
-- not under the new one. Read at the reservation, buffers included, as booking reads it.
create function public.portal_provider_hours_conflicts(
  p_provider_id uuid, p_before jsonb, p_after jsonb, p_from timestamptz
) returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'version',a.version,'startsAt',a.starts_at,
      'endsAt',a.ends_at,'date',(a.starts_at at time zone 'America/New_York')::date,'status',a.status,
      'appointmentType',t.name,'appointmentTypeIcon',t.icon,'locationName',l.name,'providerName',p.name,
      'patientName',pt.name,'patientListName',(regexp_match(pt.name,'(\S+)$'))[1])
      order by a.starts_at,a.id),'[]'::jsonb)
  from public.appointments a join public.appointment_types t on t.id=a.appointment_type_id
  join public.scheduling_locations l on l.id=a.location_id join public.patients pt on pt.id=a.patient_id
  join public.scheduling_providers p on p.id=a.provider_id
  where a.provider_id=p_provider_id and a.status in ('scheduled','checked_in','completed')
  and a.starts_at>=p_from
  and public.portal_schedule_allows(a.location_id,a.reserved_from,a.reserved_until,p_before->'hours',p_before->'exceptions')
  and not public.portal_schedule_allows(a.location_id,a.reserved_from,a.reserved_until,p_after->'hours',p_after->'exceptions');
$$;

revoke execute on function public.portal_provider_day_layer(uuid,date),
  public.portal_provider_day_windows(uuid,date),
  public.portal_provider_day_past(uuid,date,timestamptz),
  public.portal_provider_hours_conflicts(uuid,jsonb,jsonb,timestamptz) from public, anon, authenticated;
grant execute on function public.portal_provider_day_layer(uuid,date),
  public.portal_provider_day_windows(uuid,date),
  public.portal_provider_day_past(uuid,date,timestamptz),
  public.portal_provider_hours_conflicts(uuid,jsonb,jsonb,timestamptz) to service_role;

-- Sets a provider's hours for one day (scope 'date') or for that weekday from the day on (scope
-- 'weekday_from'). windows is the whole day: every window the provider works, at any office. A
-- dry run, and a change that would strand appointments, write nothing; both answer with what the
-- change would do.
create function public.portal_set_provider_day_hours(
  p_actor_id uuid, p_idempotency_key uuid, p_fingerprint text, p_command jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_staff public.staff_profiles%rowtype;
  v_receipt public.scheduling_command_receipts%rowtype;
  v_provider public.scheduling_providers%rowtype;
  v_item jsonb;
  v_id uuid;
  v_version bigint;
  v_day date;
  v_scope text;
  v_windows jsonb;
  v_dry_run boolean;
  v_weekday integer;
  v_today date:=(statement_timestamp() at time zone 'America/New_York')::date;
  v_now timestamptz:=clock_timestamp();
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_lock timestamptz;
  v_past text;
  v_before jsonb;
  v_after jsonb;
  v_conflicts jsonb;
  v_open integer;
  v_code text;
  v_change_id uuid;
  v_result jsonb;
begin
  select * into v_staff from public.staff_profiles
    where user_id=p_actor_id and active and onboarded_at is not null for share;
  if not found then return jsonb_build_object('ok',false,'code','unauthorized'); end if;
  if v_staff.role<>'admin' then return jsonb_build_object('ok',false,'code','forbidden'); end if;
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

  if p_command-array['providerId','date','scope','windows','expectedVersion','dryRun']<>'{}'::jsonb
    or not (p_command ?& array['providerId','date','scope','windows','expectedVersion','dryRun'])
    or jsonb_typeof(p_command->'providerId') is distinct from 'string'
    or jsonb_typeof(p_command->'date') is distinct from 'string'
    or (p_command->>'date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or coalesce(p_command->>'scope','') not in ('date','weekday_from')
    or jsonb_typeof(p_command->'windows') is distinct from 'array'
    or jsonb_array_length(p_command->'windows')>24
    or jsonb_typeof(p_command->'expectedVersion') is distinct from 'number'
    or jsonb_typeof(p_command->'dryRun') is distinct from 'boolean' then
    return jsonb_build_object('ok',false,'code','invalid_command');
  end if;
  v_windows:=p_command->'windows';
  for v_item in select value from jsonb_array_elements(v_windows) loop
    if jsonb_typeof(v_item) is distinct from 'object'
      or v_item-array['locationId','openMinute','closeMinute']<>'{}'::jsonb
      or jsonb_typeof(v_item->'locationId') is distinct from 'string'
      or jsonb_typeof(v_item->'openMinute') is distinct from 'number'
      or jsonb_typeof(v_item->'closeMinute') is distinct from 'number' then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
    if (v_item->>'openMinute')::integer not between 0 and 1425
      or (v_item->>'closeMinute')::integer not between 15 and 1440
      or (v_item->>'closeMinute')::integer<=(v_item->>'openMinute')::integer
      or (v_item->>'openMinute')::integer%15<>0 or (v_item->>'closeMinute')::integer%15<>0 then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
  end loop;
  -- A provider is in one place at a time, and two windows that touch at one office are one
  -- window: a visit across the seam must fit a single window to be booked.
  if exists(select 1 from jsonb_array_elements(v_windows) with ordinality a(v,i)
    join jsonb_array_elements(v_windows) with ordinality b(v,j) on a.i<b.j
    where (a.v->>'openMinute')::integer<(b.v->>'closeMinute')::integer
      and (b.v->>'openMinute')::integer<(a.v->>'closeMinute')::integer
      or (a.v->>'locationId'=b.v->>'locationId'
        and ((a.v->>'closeMinute')::integer=(b.v->>'openMinute')::integer
          or (b.v->>'closeMinute')::integer=(a.v->>'openMinute')::integer))) then
    return jsonb_build_object('ok',false,'code','invalid_command');
  end if;
  v_id:=(p_command->>'providerId')::uuid;
  v_version:=(p_command->>'expectedVersion')::bigint;
  v_day:=(p_command->>'date')::date;
  v_scope:=p_command->>'scope';
  v_dry_run:=(p_command->>'dryRun')::boolean;
  if v_version not between 1 and 9007199254740991 or v_day<v_today or v_day>v_today+730 then
    return jsonb_build_object('ok',false,'code','invalid_command');
  end if;
  v_weekday:=extract(dow from v_day)::integer;
  v_day_start:=v_day::timestamp at time zone 'America/New_York';
  v_day_end:=(v_day+1)::timestamp at time zone 'America/New_York';

  select * into v_provider from public.scheduling_providers where id=v_id for update;
  if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
  if not v_provider.active or not v_provider.bookable then
    return jsonb_build_object('ok',false,'code','provider_not_bookable');
  end if;
  if v_provider.version<>v_version then
    return jsonb_build_object('ok',false,'code','stale_version','currentVersion',v_provider.version);
  end if;
  perform 1 from public.scheduling_locations l where l.id in (
    select (value->>'locationId')::uuid from jsonb_array_elements(v_windows)) order by l.id for share;
  if exists(select 1 from jsonb_array_elements(v_windows) w where not exists(
    select 1 from public.scheduling_locations where id=(w->>'locationId')::uuid and active)) then
    return jsonb_build_object('ok',false,'code','location_unavailable');
  end if;
  if v_scope='date' and exists(select 1 from jsonb_array_elements(v_windows) w
    join public.location_closures c on c.location_id=(w->>'locationId')::uuid and c.closed_on=v_day) then
    return jsonb_build_object('ok',false,'code','location_closed');
  end if;
  if exists(select 1 from jsonb_array_elements(v_windows) w where not public.portal_office_hours_allow(
    (w->>'locationId')::uuid,v_weekday,(w->>'openMinute')::integer,(w->>'closeMinute')::integer)) then
    return jsonb_build_object('ok',false,'code','outside_office_hours');
  end if;

  v_before:=public.portal_scheduling_settings_record('provider',v_id);
  -- The quarter hour now falls in is the earliest a change today can reach.
  if v_day=v_today then
    v_lock:=date_trunc('hour',v_now)+make_interval(mins=>(extract(minute from v_now)::integer/15)*15);
    v_past:=public.portal_provider_day_past(v_id,v_day,v_lock);
  end if;

  -- The change is written, then read back: what it strands and how much open time it leaves are
  -- answered by the schedule itself. A dry run or a refusal rolls the writes back.
  begin
    if v_scope='weekday_from' then
      delete from public.provider_hours where provider_id=v_id and weekday=v_weekday and valid_from>=v_day;
      update public.provider_hours set valid_to=v_day-1
        where provider_id=v_id and weekday=v_weekday and valid_from<v_day
        and (valid_to is null or valid_to>=v_day);
      insert into public.provider_hours(provider_id,location_id,weekday,open_minute,close_minute,valid_from,valid_to)
        select v_id,(w->>'locationId')::uuid,v_weekday,(w->>'openMinute')::integer,
          (w->>'closeMinute')::integer,v_day,null from jsonb_array_elements(v_windows) w;
    end if;
    -- The day's one-off hours go; any part of them outside the day stays.
    with gone as (
      delete from public.provider_time_exceptions
        where provider_id=v_id and reason is null and starts_at<v_day_end and ends_at>v_day_start
        returning location_id,kind,starts_at,ends_at
    )
    insert into public.provider_time_exceptions(provider_id,location_id,kind,starts_at,ends_at,reason)
      select v_id,location_id,kind,starts_at,v_day_start,null from gone where starts_at<v_day_start
      union all
      select v_id,location_id,kind,v_day_end,ends_at,null from gone where ends_at>v_day_end;
    if v_scope='date' then
      -- A window no single weekly window holds is added whole, so a visit inside it can be booked.
      insert into public.provider_time_exceptions(provider_id,location_id,kind,starts_at,ends_at,reason)
        select v_id,(w->>'locationId')::uuid,'available',
          (v_day::timestamp+make_interval(mins=>(w->>'openMinute')::integer)) at time zone 'America/New_York',
          (v_day::timestamp+make_interval(mins=>(w->>'closeMinute')::integer)) at time zone 'America/New_York',null
        from jsonb_array_elements(v_windows) w
        where not exists(select 1 from public.provider_hours h
          where h.provider_id=v_id and h.location_id=(w->>'locationId')::uuid and h.weekday=v_weekday
          and v_day>=h.valid_from and (h.valid_to is null or v_day<=h.valid_to)
          and h.open_minute<=(w->>'openMinute')::integer and h.close_minute>=(w->>'closeMinute')::integer);
      -- Weekly time the windows leave out is taken away, office by office.
      insert into public.provider_time_exceptions(provider_id,location_id,kind,starts_at,ends_at,reason)
        select v_id,x.location_id,'unavailable',lower(r),upper(r),null
        from (
          select g.location_id,
            coalesce((select range_agg(tstzrange(
                (v_day::timestamp+make_interval(mins=>h.open_minute)) at time zone 'America/New_York',
                (v_day::timestamp+make_interval(mins=>h.close_minute)) at time zone 'America/New_York','[)'))
              from public.provider_hours h
              where h.provider_id=v_id and h.location_id=g.location_id and h.weekday=v_weekday
              and v_day>=h.valid_from and (h.valid_to is null or v_day<=h.valid_to)),'{}'::tstzmultirange)
            - coalesce((select range_agg(tstzrange(
                (v_day::timestamp+make_interval(mins=>(w->>'openMinute')::integer)) at time zone 'America/New_York',
                (v_day::timestamp+make_interval(mins=>(w->>'closeMinute')::integer)) at time zone 'America/New_York','[)'))
              from jsonb_array_elements(v_windows) w
              where (w->>'locationId')::uuid=g.location_id),'{}'::tstzmultirange) as gap
          from (select distinct h.location_id from public.provider_hours h
            where h.provider_id=v_id and h.weekday=v_weekday
            and v_day>=h.valid_from and (h.valid_to is null or v_day<=h.valid_to)) g
        ) x cross join lateral unnest(x.gap) r;
    end if;

    v_after:=public.portal_scheduling_settings_record('provider',v_id);
    if v_lock is not null and public.portal_provider_day_past(v_id,v_day,v_lock)<>v_past then
      v_code:='hours_in_past';
    end if;
    v_conflicts:=public.portal_provider_hours_conflicts(v_id,v_before,v_after,v_day_start);
    if v_code is null and jsonb_array_length(v_conflicts)>0 then v_code:='schedule_in_use'; end if;
    select count(*)::integer into v_open
      from public.portal_schedule_greedy_opens(v_day,v_day,array[v_id],null,null);
    if v_code is not null or v_dry_run then
      raise exception using errcode='WGI01';
    end if;
  exception when sqlstate 'WGI01' then
    if v_code='schedule_in_use' then
      return jsonb_build_object('ok',false,'code',v_code,'conflicts',v_conflicts);
    elsif v_code is not null then
      return jsonb_build_object('ok',false,'code',v_code);
    end if;
    return jsonb_build_object('ok',true,'dryRun',true,'entity','provider','id',v_id,
      'version',v_provider.version,'openCount',v_open,'conflicts','[]'::jsonb);
  end;

  update public.scheduling_providers set version=version+1,updated_by=p_actor_id,updated_at=v_now
    where id=v_id returning * into v_provider;
  v_after:=v_after||jsonb_build_object('dayHours',jsonb_build_object('scope',v_scope,'date',v_day,
    'windows',v_windows));
  insert into public.scheduling_changes(entity,entity_id,provider_id,version,command,before_record,
    after_record,actor_id,actor_email,occurred_at)
    values('provider',v_id,v_id,v_provider.version,'set_provider_day_hours',v_before,v_after,
      p_actor_id,v_staff.email,v_now)
    returning id into v_change_id;
  insert into public.audit_log(actor_email,action,entity,entity_id,source,correlation_id,detail,at)
    values(v_staff.email,'scheduling.set_provider_day_hours','scheduling',v_id,'staff',p_idempotency_key,
      jsonb_build_object('entity','provider','version',v_provider.version,'scope',v_scope,'date',v_day),v_now);
  v_result:=jsonb_build_object('ok',true,'dryRun',false,'entity','provider','id',v_id,
    'version',v_provider.version,'changeId',v_change_id,'openCount',v_open,'conflicts','[]'::jsonb);
  insert into public.scheduling_command_receipts(idempotency_key,change_id,actor_id,fingerprint,result,created_at)
    values(p_idempotency_key,v_change_id,p_actor_id,p_fingerprint,v_result,v_now);
  return v_result;
exception when invalid_text_representation or datetime_field_overflow or invalid_datetime_format
  or numeric_value_out_of_range then
  return jsonb_build_object('ok',false,'code','invalid_command');
end;
$$;

-- Undoes one day-hours change: the provider's hours and exceptions return to what they were,
-- when the provider has not changed since. Bookings do not change the provider, so a visit
-- booked into the added time meanwhile refuses the undo with the list.
create function public.portal_undo_provider_day_hours(
  p_actor_id uuid, p_idempotency_key uuid, p_fingerprint text, p_command jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_staff public.staff_profiles%rowtype;
  v_receipt public.scheduling_command_receipts%rowtype;
  v_change public.scheduling_changes%rowtype;
  v_provider public.scheduling_providers%rowtype;
  v_version bigint;
  v_day date;
  v_today date:=(statement_timestamp() at time zone 'America/New_York')::date;
  v_now timestamptz:=clock_timestamp();
  v_lock timestamptz;
  v_past text;
  v_before jsonb;
  v_after jsonb;
  v_conflicts jsonb;
  v_code text;
  v_change_id uuid;
  v_result jsonb;
begin
  select * into v_staff from public.staff_profiles
    where user_id=p_actor_id and active and onboarded_at is not null for share;
  if not found then return jsonb_build_object('ok',false,'code','unauthorized'); end if;
  if v_staff.role<>'admin' then return jsonb_build_object('ok',false,'code','forbidden'); end if;
  if p_idempotency_key is null or p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$'
    or jsonb_typeof(p_command) is distinct from 'object'
    or p_command-array['changeId','expectedVersion']<>'{}'::jsonb
    or jsonb_typeof(p_command->'changeId') is distinct from 'string'
    or jsonb_typeof(p_command->'expectedVersion') is distinct from 'number' then
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
  v_version:=(p_command->>'expectedVersion')::bigint;
  select * into v_change from public.scheduling_changes
    where id=(p_command->>'changeId')::uuid and command='set_provider_day_hours';
  if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
  select * into v_provider from public.scheduling_providers where id=v_change.provider_id for update;
  if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
  if v_provider.version<>v_version or v_change.version<>v_version then
    return jsonb_build_object('ok',false,'code','stale_version','currentVersion',v_provider.version);
  end if;
  v_day:=(v_change.after_record->'dayHours'->>'date')::date;
  v_before:=public.portal_scheduling_settings_record('provider',v_provider.id);
  if v_day=v_today then
    v_lock:=date_trunc('hour',v_now)+make_interval(mins=>(extract(minute from v_now)::integer/15)*15);
    v_past:=public.portal_provider_day_past(v_provider.id,v_day,v_lock);
  end if;

  begin
    delete from public.provider_hours where provider_id=v_provider.id;
    delete from public.provider_time_exceptions where provider_id=v_provider.id;
    insert into public.provider_hours(provider_id,location_id,weekday,open_minute,close_minute,valid_from,valid_to)
      select v_provider.id,(h->>'locationId')::uuid,(h->>'weekday')::integer,(h->>'openMinute')::integer,
        (h->>'closeMinute')::integer,(h->>'validFrom')::date,(h->>'validTo')::date
      from jsonb_array_elements(v_change.before_record->'hours') h;
    insert into public.provider_time_exceptions(provider_id,location_id,kind,starts_at,ends_at,reason)
      select v_provider.id,(e->>'locationId')::uuid,e->>'kind',(e->>'startsAt')::timestamptz,
        (e->>'endsAt')::timestamptz,e->>'reason'
      from jsonb_array_elements(v_change.before_record->'exceptions') e;
    v_after:=public.portal_scheduling_settings_record('provider',v_provider.id);
    if v_lock is not null and public.portal_provider_day_past(v_provider.id,v_day,v_lock)<>v_past then
      v_code:='hours_in_past';
    end if;
    v_conflicts:=public.portal_provider_hours_conflicts(v_provider.id,v_before,v_after,
      v_day::timestamp at time zone 'America/New_York');
    if v_code is null and jsonb_array_length(v_conflicts)>0 then v_code:='schedule_in_use'; end if;
    if v_code is not null then raise exception using errcode='WGI01'; end if;
  exception when sqlstate 'WGI01' then
    if v_code='schedule_in_use' then
      return jsonb_build_object('ok',false,'code',v_code,'conflicts',v_conflicts);
    end if;
    return jsonb_build_object('ok',false,'code',v_code);
  end;

  update public.scheduling_providers set version=version+1,updated_by=p_actor_id,updated_at=v_now
    where id=v_provider.id returning * into v_provider;
  insert into public.scheduling_changes(entity,entity_id,provider_id,version,command,before_record,
    after_record,compensates_change_id,actor_id,actor_email,occurred_at)
    values('provider',v_provider.id,v_provider.id,v_provider.version,'undo',v_before,v_after,v_change.id,
      p_actor_id,v_staff.email,v_now)
    returning id into v_change_id;
  insert into public.audit_log(actor_email,action,entity,entity_id,source,correlation_id,detail,at)
    values(v_staff.email,'scheduling.undo','scheduling',v_provider.id,'staff',p_idempotency_key,
      jsonb_build_object('entity','provider','version',v_provider.version,
        'compensates_change_id',v_change.id),v_now);
  v_result:=jsonb_build_object('ok',true,'entity','provider','id',v_provider.id,'version',v_provider.version);
  insert into public.scheduling_command_receipts(idempotency_key,change_id,actor_id,fingerprint,result,created_at)
    values(p_idempotency_key,v_change_id,p_actor_id,p_fingerprint,v_result,v_now);
  return v_result;
exception when invalid_text_representation or numeric_value_out_of_range then
  return jsonb_build_object('ok',false,'code','invalid_command');
when unique_violation then
  return jsonb_build_object('ok',false,'code','stale_version','currentVersion',v_provider.version);
end;
$$;

-- What the Hours sheet shows for one practice day: each office's hours that weekday, and each
-- bookable provider's hours that day, their weekly hours for the weekday, the office they usually
-- work at, the weekdays they usually work, their time off, and the visits they have that day. Admins only, like the commands.
create function public.portal_day_hours(p_actor_id uuid, p_date date)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  v_role text;
  v_now timestamptz:=statement_timestamp();
  v_today date:=(statement_timestamp() at time zone 'America/New_York')::date;
  v_weekday integer:=extract(dow from p_date)::integer;
  v_start timestamptz:=p_date::timestamp at time zone 'America/New_York';
  v_end timestamptz:=(p_date+1)::timestamp at time zone 'America/New_York';
begin
  select role into v_role from public.staff_profiles where user_id=p_actor_id and active and onboarded_at is not null;
  if not found then return jsonb_build_object('ok',false,'code','unauthorized'); end if;
  if v_role<>'admin' then return jsonb_build_object('ok',false,'code','forbidden'); end if;
  if p_date is null then return jsonb_build_object('ok',false,'code','invalid_command'); end if;
  return jsonb_build_object('ok',true,'observedAt',v_now,'today',v_today,'date',p_date,'weekday',v_weekday,
    'locations',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'name',l.name,
        'openMinute',h.open_minute,'closeMinute',h.close_minute,
        'closed',exists(select 1 from public.location_closures c where c.location_id=l.id and c.closed_on=p_date)
          or (h.location_id is null and exists(select 1 from public.location_hours x where x.location_id=l.id)))
        order by l.name,l.id)
      from public.scheduling_locations l
      left join public.location_hours h on h.location_id=l.id and h.weekday=v_weekday
      where l.active),'[]'::jsonb),
    'providers',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'version',p.version,
        'windows',public.portal_provider_day_windows(p.id,p_date),
        'weekly',coalesce((select jsonb_agg(jsonb_build_object('locationId',h.location_id,
            'openMinute',h.open_minute,'closeMinute',h.close_minute) order by h.open_minute,h.id)
          from public.provider_hours h where h.provider_id=p.id and h.weekday=v_weekday
          and p_date>=h.valid_from and (h.valid_to is null or p_date<=h.valid_to)),'[]'::jsonb),
        -- The office their current weekly hours use most, so a provider who is off that day still
        -- groups under an office.
        'homeLocationId',(select h.location_id from public.provider_hours h where h.provider_id=p.id
          and p_date>=h.valid_from and (h.valid_to is null or p_date<=h.valid_to)
          group by h.location_id order by count(*) desc,h.location_id limit 1),
        'usualWeekdays',coalesce((select jsonb_agg(distinct h.weekday)
          from public.provider_hours h where h.provider_id=p.id
          and p_date>=h.valid_from and (h.valid_to is null or p_date<=h.valid_to)),'[]'::jsonb),
        'timeOff',coalesce((select jsonb_agg(jsonb_build_object('reason',e.reason,
            'startMinute',(extract(epoch from (greatest(e.starts_at,v_start) at time zone 'America/New_York')-p_date::timestamp)/60)::integer,
            'endMinute',(extract(epoch from (least(e.ends_at,v_end) at time zone 'America/New_York')-p_date::timestamp)/60)::integer)
            order by e.starts_at,e.id)
          from public.provider_time_exceptions e where e.provider_id=p.id and e.kind='unavailable'
          and e.reason is not null and e.starts_at<v_end and e.ends_at>v_start),'[]'::jsonb),
        'bookings',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'locationId',a.location_id,
            'startsAt',a.starts_at,'endsAt',a.ends_at,'status',a.status,
            'patientName',pt.name,'patientListName',(regexp_match(pt.name,'(\S+)$'))[1])
            order by a.starts_at,a.id)
          from public.appointments a join public.patients pt on pt.id=a.patient_id
          where a.provider_id=p.id and a.status in ('scheduled','checked_in','completed')
          and a.starts_at>=v_start and a.starts_at<v_end),'[]'::jsonb))
      order by p.sort_order,lower(p.name),p.id)
      from public.scheduling_providers p where p.active and p.bookable),'[]'::jsonb));
end;
$$;

revoke execute on function public.portal_set_provider_day_hours(uuid,uuid,text,jsonb),
  public.portal_undo_provider_day_hours(uuid,uuid,text,jsonb),
  public.portal_day_hours(uuid,date) from public, anon, authenticated;
grant execute on function public.portal_set_provider_day_hours(uuid,uuid,text,jsonb),
  public.portal_undo_provider_day_hours(uuid,uuid,text,jsonb),
  public.portal_day_hours(uuid,date) to service_role;

-- Settings lists time off: unavailable ranges with a reason. A day's hours change is not time off.
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
