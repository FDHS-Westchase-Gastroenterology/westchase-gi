-- Settings follow the clinic.
--
-- A provider's profile, weekly hours and appointment types each carry their own version, so an
-- edit to one never makes another stale. The row's version stays the change history's counter
-- and still moves on every change, as the Schedule's Hours sheet and its Undo expect. Time off
-- and closed days are added and removed by row, so they check no version at all.
--
-- Weekly hours take a start date. The week sent applies from that day: rows that began earlier
-- end the day before and rows from that day on are replaced. A week that matches the one ending
-- the day before joins it again, so cancelling a planned change leaves one week behind.
--
-- A change that leaves booked appointments outside a provider's hours answers schedule_in_use
-- with those appointments. The caller can resend it with keepBooked: the appointments stay where
-- they are and the Settings read lists them under needsNewTime, beside the ones time off and
-- closed days leave behind. A dry run answers with the same list and writes nothing.
--
-- Office hours lead provider hours. When an office's hours change, every provider's hours there
-- follow from today: an edge that matched the office's old opening or closing moves with it, any
-- other edge stays where it is inside the new hours, and a day the office no longer opens is
-- dropped. The answer names the providers whose hours moved.
--
-- Providers and offices retire instead of disappearing. Retiring refuses while appointments are
-- still booked with them and answers with those appointments; a retired office ends every
-- provider's hours there. Restore brings either back. The last open office cannot retire.
--
-- A closed day can be a run of days, and a run reopens in one change.

alter table public.scheduling_providers
  add column profile_version bigint not null default 1
    check (profile_version between 1 and 9007199254740991),
  add column hours_version bigint not null default 1
    check (hours_version between 1 and 9007199254740991),
  add column types_version bigint not null default 1
    check (types_version between 1 and 9007199254740991);
comment on column public.scheduling_providers.profile_version is
  'Name, credentials, bookable and retirement. Settings checks it before changing them.';
comment on column public.scheduling_providers.hours_version is
  'Moves whenever a provider_hours row of this provider changes, from Settings or the Schedule.';
comment on column public.scheduling_providers.types_version is
  'Moves whenever the appointment types this provider sees change, from either side.';

alter table public.scheduling_locations
  add column details_version bigint not null default 1
    check (details_version between 1 and 9007199254740991);
comment on column public.scheduling_locations.details_version is
  'Name, address, office hours and retirement. Closed days do not move it.';

create function public.portal_bump_provider_hours_version() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare v_provider uuid;
begin
  if tg_op='DELETE' then v_provider:=old.provider_id; else v_provider:=new.provider_id; end if;
  update public.scheduling_providers set hours_version=hours_version+1 where id=v_provider;
  return null;
end;
$$;
create trigger provider_hours_bump_version after insert or update or delete on public.provider_hours
  for each row execute function public.portal_bump_provider_hours_version();

create function public.portal_bump_provider_types_version() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare v_provider uuid;
begin
  if tg_op='DELETE' then v_provider:=old.provider_id; else v_provider:=new.provider_id; end if;
  update public.scheduling_providers set types_version=types_version+1 where id=v_provider;
  return null;
end;
$$;
create trigger appointment_type_providers_bump_version
  after insert or update or delete on public.appointment_type_providers
  for each row execute function public.portal_bump_provider_types_version();

revoke execute on function public.portal_bump_provider_hours_version(),
  public.portal_bump_provider_types_version() from public, anon, authenticated;
grant execute on function public.portal_bump_provider_hours_version(),
  public.portal_bump_provider_types_version() to service_role;

alter table public.scheduling_changes drop constraint scheduling_changes_command_check;
alter table public.scheduling_changes add constraint scheduling_changes_command_check check (command in (
  'save_provider','save_location','save_appointment_type',
  'book','reschedule','cancel','check_in','complete','no_show','undo',
  'add_provider','set_provider_profile','set_provider_weekly_hours','add_time_off','remove_time_off',
  'set_provider_types','reorder_appointment_types','set_appointment_type_active','delete_appointment_type',
  'save_location_details','add_location_closure','remove_location_closure','set_provider_day_hours',
  'set_booking_interval','retire_provider','restore_provider','retire_location','restore_location'));

-- Booked appointments as Settings lists them, soonest first.
create function public.portal_settings_conflicts(p_ids uuid[])
returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'version',a.version,'startsAt',a.starts_at,
      'endsAt',a.ends_at,'date',(a.starts_at at time zone 'America/New_York')::date,
      'appointmentType',t.name,'appointmentTypeIcon',t.icon,'locationName',l.name,'providerName',p.name,
      'patientName',pt.name,'patientListName',(regexp_match(pt.name,'(\S+)$'))[1])
      order by a.starts_at,a.id),'[]'::jsonb)
  from public.appointments a join public.appointment_types t on t.id=a.appointment_type_id
  join public.scheduling_locations l on l.id=a.location_id join public.patients pt on pt.id=a.patient_id
  join public.scheduling_providers p on p.id=a.provider_id
  where a.id=any(p_ids);
$$;
revoke execute on function public.portal_settings_conflicts(uuid[]) from public, anon, authenticated;
grant execute on function public.portal_settings_conflicts(uuid[]) to service_role;

-- The Settings window's granular commands. Each is admin-only and idempotent by key, checks the
-- version of the part it changes, moves the row's history counter, and writes a
-- scheduling_changes row with the before and after records. A command that would leave booked
-- appointments outside a provider's hours answers schedule_in_use with them unless keepBooked;
-- add_time_off and add_location_closure always go through and return what they cover.
create or replace function public.portal_save_scheduling_settings(
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
  v_aspect bigint;
  v_name text;
  v_text text;
  v_before jsonb;
  v_after jsonb;
  v_hours jsonb;
  v_new_hours jsonb;
  v_ids uuid[];
  v_dry_run boolean:=false;
  v_keep boolean:=false;
  v_conflicts jsonb;
  v_adjusted jsonb;
  v_cascade jsonb;
  v_provider_before jsonb;
  v_schedule jsonb;
  v_peer record;
  v_from timestamptz;
  v_until timestamptz;
  v_first date;
  v_last date;
  v_starts_on date;
  v_position integer;
  v_count integer;
  v_target_id uuid;
  v_today date:=(statement_timestamp() at time zone 'America/New_York')::date;
  v_now timestamptz;
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

  v_kind:=p_command->>'kind';
  if v_kind is null or v_kind not in ('add_provider','set_provider_profile','retire_provider',
    'restore_provider','set_provider_weekly_hours','add_time_off','remove_time_off','set_provider_types',
    'save_appointment_type','reorder_appointment_types','set_appointment_type_active',
    'delete_appointment_type','save_location_details','retire_location','restore_location',
    'add_location_closure','remove_location_closure') then
    return jsonb_build_object('ok',false,'code','invalid_command');
  end if;
  -- Every command but add_provider names an entity. Time off and closed days are rows of their
  -- own, so they carry no version; every other command carries the version of what it changes,
  -- and a new appointment type sends null for both.
  if v_kind<>'add_provider' then
    if not (p_command ? 'id') or jsonb_typeof(p_command->'id') not in ('string','null') then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
    v_id:=(p_command->>'id')::uuid;
    if v_kind in ('add_time_off','remove_time_off','add_location_closure','remove_location_closure') then
      if v_id is null or p_command ? 'expectedVersion' then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
    else
      if not (p_command ? 'expectedVersion')
        or jsonb_typeof(p_command->'expectedVersion') not in ('number','null') then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
      v_version:=(p_command->>'expectedVersion')::bigint;
      if (v_id is null)<>(v_version is null) or v_version not between 1 and 9007199254740991
        or (v_id is null and v_kind<>'save_appointment_type') then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
    end if;
  end if;
  v_now:=clock_timestamp();

  if v_kind in ('add_provider','set_provider_profile','retire_provider','restore_provider',
    'set_provider_weekly_hours','add_time_off','remove_time_off','set_provider_types') then
    v_entity:='provider';
  elsif v_kind in ('save_location_details','retire_location','restore_location',
    'add_location_closure','remove_location_closure') then
    v_entity:='location';
  else
    v_entity:='appointment_type';
  end if;

  ------------------------------------------------------------------ providers
  if v_kind='add_provider' then
    if p_command-array['kind','name','credentials','hours']<>'{}'::jsonb
      or not (p_command ?& array['name','credentials','hours'])
      or jsonb_typeof(p_command->'name') is distinct from 'string'
      or jsonb_typeof(p_command->'credentials') not in ('string','null')
      or not public.portal_settings_hours_valid(p_command->'hours',array['locationId','weekday','openMinute','closeMinute']) then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
    v_name:=p_command->>'name'; v_text:=p_command->>'credentials'; v_hours:=p_command->'hours';
    if char_length(v_name) not between 1 and 120 or v_name<>btrim(v_name)
      or (v_text is not null and (char_length(v_text) not between 1 and 120 or v_text<>btrim(v_text))) then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
    perform 1 from public.scheduling_locations l where l.id in (
      select (value->>'locationId')::uuid from jsonb_array_elements(v_hours)) order by l.id for share;
    if exists(select 1 from jsonb_array_elements(v_hours) h where not exists(
      select 1 from public.scheduling_locations where id=(h->>'locationId')::uuid and active)) then
      return jsonb_build_object('ok',false,'code','location_unavailable');
    end if;
    if exists(select 1 from jsonb_array_elements(v_hours) h where not public.portal_office_hours_allow(
      (h->>'locationId')::uuid,(h->>'weekday')::integer,(h->>'openMinute')::integer,(h->>'closeMinute')::integer)) then
      return jsonb_build_object('ok',false,'code','outside_office_hours');
    end if;
    insert into public.scheduling_providers(name,credentials,active,bookable,created_by,updated_by,created_at,updated_at)
      values(v_name,v_text,true,true,p_actor_id,p_actor_id,v_now,v_now) returning * into v_provider;
    v_id:=v_provider.id;
    insert into public.provider_hours(provider_id,location_id,weekday,open_minute,close_minute,valid_from,valid_to)
      select v_id,(h->>'locationId')::uuid,(h->>'weekday')::integer,(h->>'openMinute')::integer,
        (h->>'closeMinute')::integer,v_today,null from jsonb_array_elements(v_hours) h;
    select * into v_provider from public.scheduling_providers where id=v_id;
    v_version:=v_provider.version;
    v_aspect:=v_provider.profile_version;

  elsif v_entity='provider' then
    select * into v_provider from public.scheduling_providers where id=v_id for update;
    if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
    v_before:=public.portal_scheduling_settings_record('provider',v_id);

    if v_kind='set_provider_profile' then
      if p_command-array['kind','id','expectedVersion','name','credentials','bookable']<>'{}'::jsonb
        or not (p_command ?& array['name','credentials','bookable'])
        or jsonb_typeof(p_command->'name') is distinct from 'string'
        or jsonb_typeof(p_command->'credentials') not in ('string','null')
        or jsonb_typeof(p_command->'bookable') is distinct from 'boolean' then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
      v_name:=p_command->>'name'; v_text:=p_command->>'credentials';
      if char_length(v_name) not between 1 and 120 or v_name<>btrim(v_name)
        or (v_text is not null and (char_length(v_text) not between 1 and 120 or v_text<>btrim(v_text))) then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
      if v_provider.profile_version<>v_version then
        return jsonb_build_object('ok',false,'code','stale_version','currentVersion',v_provider.profile_version);
      end if;
      -- Turning bookability off keeps every appointment.
      update public.scheduling_providers set name=v_name,credentials=v_text,
        bookable=(p_command->>'bookable')::boolean,profile_version=profile_version+1,
        version=version+1,updated_by=p_actor_id,updated_at=v_now where id=v_id returning * into v_provider;
      v_aspect:=v_provider.profile_version;

    elsif v_kind in ('retire_provider','restore_provider') then
      if p_command-array['kind','id','expectedVersion']<>'{}'::jsonb then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
      if v_provider.profile_version<>v_version then
        return jsonb_build_object('ok',false,'code','stale_version','currentVersion',v_provider.profile_version);
      end if;
      if v_kind='retire_provider' then
        -- A retired provider leaves the schedule, so nothing can still be booked with them.
        select array_agg(a.id) into v_ids from public.appointments a
          where a.provider_id=v_id and a.status in ('scheduled','checked_in') and a.ends_at>v_now;
        if v_ids is not null then
          return jsonb_build_object('ok',false,'code','schedule_in_use',
            'conflicts',public.portal_settings_conflicts(v_ids));
        end if;
      end if;
      -- Their hours, time off and types stay, so a restore puts them back as they were.
      update public.scheduling_providers set active=(v_kind='restore_provider'),
        profile_version=profile_version+1,version=version+1,updated_by=p_actor_id,updated_at=v_now
        where id=v_id returning * into v_provider;
      v_aspect:=v_provider.profile_version;

    elsif v_kind='set_provider_weekly_hours' then
      if p_command-array['kind','id','expectedVersion','startsOn','hours','keepBooked','dryRun']<>'{}'::jsonb
        or not (p_command ?& array['startsOn','hours','keepBooked','dryRun'])
        or jsonb_typeof(p_command->'startsOn') is distinct from 'string'
        or (p_command->>'startsOn') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        or jsonb_typeof(p_command->'keepBooked') is distinct from 'boolean'
        or jsonb_typeof(p_command->'dryRun') is distinct from 'boolean'
        or not public.portal_settings_hours_valid(p_command->'hours',array['locationId','weekday','openMinute','closeMinute']) then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
      v_hours:=p_command->'hours';
      v_starts_on:=(p_command->>'startsOn')::date;
      v_keep:=(p_command->>'keepBooked')::boolean;
      v_dry_run:=(p_command->>'dryRun')::boolean;
      if v_starts_on<v_today or v_starts_on>v_today+366 then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
      if v_provider.hours_version<>v_version then
        return jsonb_build_object('ok',false,'code','stale_version','currentVersion',v_provider.hours_version);
      end if;
      perform 1 from public.scheduling_locations l where l.id in (
        select (value->>'locationId')::uuid from jsonb_array_elements(v_hours)) order by l.id for share;
      if exists(select 1 from jsonb_array_elements(v_hours) h where not exists(
        select 1 from public.scheduling_locations where id=(h->>'locationId')::uuid and active)) then
        return jsonb_build_object('ok',false,'code','location_unavailable');
      end if;
      if exists(select 1 from jsonb_array_elements(v_hours) h where not public.portal_office_hours_allow(
        (h->>'locationId')::uuid,(h->>'weekday')::integer,(h->>'openMinute')::integer,(h->>'closeMinute')::integer)) then
        return jsonb_build_object('ok',false,'code','outside_office_hours');
      end if;
      -- The week sent applies from startsOn. Rows that began earlier end the day before, so the
      -- days before keep the hours they had; rows that begin on startsOn or later are replaced.
      select coalesce(jsonb_agg(jsonb_build_object('locationId',h.location_id,'weekday',h.weekday,
          'openMinute',h.open_minute,'closeMinute',h.close_minute,'validFrom',h.valid_from,
          'validTo',case when h.valid_to is null or h.valid_to>=v_starts_on then v_starts_on-1 else h.valid_to end)),
          '[]'::jsonb)
        into v_new_hours from public.provider_hours h where h.provider_id=v_id and h.valid_from<v_starts_on;
      v_new_hours:=v_new_hours||coalesce((select jsonb_agg(h||jsonb_build_object('validFrom',v_starts_on,'validTo',null))
        from jsonb_array_elements(v_hours) h),'[]'::jsonb);
      v_conflicts:=public.portal_provider_hours_conflicts(v_id,v_before,
        jsonb_build_object('hours',v_new_hours,'exceptions',v_before->'exceptions'),
        greatest(v_now,v_starts_on::timestamp at time zone 'America/New_York'));
      if v_dry_run then
        return jsonb_build_object('ok',true,'dryRun',true,'entity','provider','id',v_id,
          'version',v_provider.hours_version,'conflicts',v_conflicts);
      end if;
      if jsonb_array_length(v_conflicts)>0 and not v_keep then
        return jsonb_build_object('ok',false,'code','schedule_in_use','conflicts',v_conflicts);
      end if;
      update public.provider_hours set valid_to=v_starts_on-1
        where provider_id=v_id and valid_from<v_starts_on and (valid_to is null or valid_to>=v_starts_on);
      delete from public.provider_hours where provider_id=v_id and valid_from>=v_starts_on;
      insert into public.provider_hours(provider_id,location_id,weekday,open_minute,close_minute,valid_from,valid_to)
        select v_id,(h->>'locationId')::uuid,(h->>'weekday')::integer,(h->>'openMinute')::integer,
          (h->>'closeMinute')::integer,v_starts_on,null from jsonb_array_elements(v_hours) h;
      -- A week that matches the one ending the day before carries it on instead of starting anew.
      if exists(select 1 from public.provider_hours where provider_id=v_id and valid_to=v_starts_on-1)
        and (select jsonb_agg(jsonb_build_array(h.location_id,h.weekday,h.open_minute,h.close_minute)
              order by h.location_id,h.weekday,h.open_minute,h.close_minute)
            from public.provider_hours h where h.provider_id=v_id and h.valid_to=v_starts_on-1)
          is not distinct from
            (select jsonb_agg(jsonb_build_array(h.location_id,h.weekday,h.open_minute,h.close_minute)
              order by h.location_id,h.weekday,h.open_minute,h.close_minute)
            from public.provider_hours h where h.provider_id=v_id and h.valid_from=v_starts_on) then
        delete from public.provider_hours where provider_id=v_id and valid_from=v_starts_on;
        update public.provider_hours set valid_to=null where provider_id=v_id and valid_to=v_starts_on-1;
      end if;
      update public.scheduling_providers set version=version+1,updated_by=p_actor_id,updated_at=v_now
        where id=v_id returning * into v_provider;
      v_aspect:=v_provider.hours_version;
      if jsonb_array_length(v_conflicts)=0 then v_conflicts:=null; end if;

    elsif v_kind='add_time_off' then
      if p_command-array['kind','id','startsOn','endsOn','allDay','startMinute','endMinute','reason','dryRun']<>'{}'::jsonb
        or not (p_command ?& array['startsOn','endsOn','allDay','startMinute','endMinute','reason','dryRun'])
        or jsonb_typeof(p_command->'startsOn') is distinct from 'string'
        or jsonb_typeof(p_command->'endsOn') is distinct from 'string'
        or (p_command->>'startsOn') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        or (p_command->>'endsOn') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        or jsonb_typeof(p_command->'allDay') is distinct from 'boolean'
        or jsonb_typeof(p_command->'dryRun') is distinct from 'boolean'
        or jsonb_typeof(p_command->'reason') is distinct from 'string'
        or p_command->>'reason' not in ('personal','conference','holiday') then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
      v_first:=(p_command->>'startsOn')::date; v_last:=(p_command->>'endsOn')::date;
      v_dry_run:=(p_command->>'dryRun')::boolean;
      if v_first<v_today or v_last<v_first or v_last-v_first>366 then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
      if (p_command->>'allDay')::boolean then
        if jsonb_typeof(p_command->'startMinute')<>'null' or jsonb_typeof(p_command->'endMinute')<>'null' then
          return jsonb_build_object('ok',false,'code','invalid_command');
        end if;
        v_from:=v_first::timestamp at time zone 'America/New_York';
        v_until:=(v_last+1)::timestamp at time zone 'America/New_York';
      else
        -- Part of a day is one day: the minutes run from that day's midnight.
        if v_first<>v_last or jsonb_typeof(p_command->'startMinute') is distinct from 'number'
          or jsonb_typeof(p_command->'endMinute') is distinct from 'number'
          or (p_command->>'startMinute')::integer not between 0 and 1425
          or (p_command->>'endMinute')::integer not between 15 and 1440
          or (p_command->>'endMinute')::integer<=(p_command->>'startMinute')::integer
          or (p_command->>'startMinute')::integer%15<>0 or (p_command->>'endMinute')::integer%15<>0 then
          return jsonb_build_object('ok',false,'code','invalid_command');
        end if;
        v_from:=(v_first::timestamp+make_interval(mins=>(p_command->>'startMinute')::integer)) at time zone 'America/New_York';
        v_until:=(v_first::timestamp+make_interval(mins=>(p_command->>'endMinute')::integer)) at time zone 'America/New_York';
      end if;
      -- Time off never cancels an appointment: the covered ones are returned to be rebooked.
      select array_agg(a.id) into v_ids from public.appointments a
        where a.provider_id=v_id and a.status in ('scheduled','checked_in')
        and a.starts_at<v_until and a.ends_at>v_from;
      v_conflicts:=public.portal_settings_conflicts(coalesce(v_ids,'{}'));
      if v_dry_run then
        return jsonb_build_object('ok',true,'dryRun',true,'entity','provider','id',v_id,
          'version',v_provider.version,'conflicts',v_conflicts);
      end if;
      insert into public.provider_time_exceptions(provider_id,location_id,kind,starts_at,ends_at,reason)
        values(v_id,null,'unavailable',v_from,v_until,p_command->>'reason');
      update public.scheduling_providers set version=version+1,updated_by=p_actor_id,updated_at=v_now
        where id=v_id returning * into v_provider;
      v_aspect:=v_provider.version;

    elsif v_kind='remove_time_off' then
      if p_command-array['kind','id','timeOffId']<>'{}'::jsonb
        or jsonb_typeof(p_command->'timeOffId') is distinct from 'string' then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
      v_target_id:=(p_command->>'timeOffId')::uuid;
      delete from public.provider_time_exceptions
        where id=v_target_id and provider_id=v_id and kind='unavailable' and reason is not null;
      if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
      update public.scheduling_providers set version=version+1,updated_by=p_actor_id,updated_at=v_now
        where id=v_id returning * into v_provider;
      v_aspect:=v_provider.version;

    else -- set_provider_types
      if p_command-array['kind','id','expectedVersion','typeIds']<>'{}'::jsonb
        or jsonb_typeof(p_command->'typeIds') is distinct from 'array'
        or jsonb_array_length(p_command->'typeIds')>100
        or exists(select 1 from jsonb_array_elements(p_command->'typeIds') x where jsonb_typeof(x) is distinct from 'string') then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
      select coalesce(array_agg(distinct x::uuid),'{}') into v_ids from jsonb_array_elements_text(p_command->'typeIds') x;
      if v_provider.types_version<>v_version then
        return jsonb_build_object('ok',false,'code','stale_version','currentVersion',v_provider.types_version);
      end if;
      if (select count(*) from public.appointment_types where id=any(v_ids) and archived_at is null)<>cardinality(v_ids) then
        return jsonb_build_object('ok',false,'code','not_found');
      end if;
      delete from public.appointment_type_providers x where x.provider_id=v_id
        and x.appointment_type_id<>all(v_ids);
      insert into public.appointment_type_providers(appointment_type_id,provider_id)
        select t,v_id from unnest(v_ids) t on conflict do nothing;
      update public.scheduling_providers set version=version+1,updated_by=p_actor_id,updated_at=v_now
        where id=v_id returning * into v_provider;
      v_aspect:=v_provider.types_version;
    end if;
    v_version:=v_provider.version;

  ------------------------------------------------------------------ appointment types
  elsif v_entity='appointment_type' then
    if v_kind='save_appointment_type' then
      if p_command-array['kind','id','expectedVersion','name','durationMinutes','bufferBeforeMinutes',
          'bufferAfterMinutes','icon','description','providerIds']<>'{}'::jsonb
        or not (p_command ?& array['name','durationMinutes','bufferBeforeMinutes','bufferAfterMinutes',
          'icon','description','providerIds'])
        or jsonb_typeof(p_command->'name') is distinct from 'string'
        or jsonb_typeof(p_command->'durationMinutes') is distinct from 'number'
        or jsonb_typeof(p_command->'bufferBeforeMinutes') is distinct from 'number'
        or jsonb_typeof(p_command->'bufferAfterMinutes') is distinct from 'number'
        or jsonb_typeof(p_command->'icon') is distinct from 'string'
        or jsonb_typeof(p_command->'description') not in ('string','null')
        or jsonb_typeof(p_command->'providerIds') is distinct from 'array'
        or jsonb_array_length(p_command->'providerIds')>100
        or exists(select 1 from jsonb_array_elements(p_command->'providerIds') x where jsonb_typeof(x) is distinct from 'string') then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
      v_name:=p_command->>'name'; v_text:=p_command->>'description';
      if char_length(v_name) not between 1 and 120 or v_name<>btrim(v_name)
        or (v_text is not null and (char_length(v_text) not between 1 and 200 or v_text<>btrim(v_text)))
        or (p_command->>'durationMinutes')::integer not between 1 and 1440
        or (p_command->>'bufferBeforeMinutes')::integer not between 0 and 720
        or (p_command->>'bufferAfterMinutes')::integer not between 0 and 720
        or p_command->>'icon' not in ('user-plus','history','stethoscope','clipboard-check','syringe',
          'droplet','microscope','pill','activity','file-text') then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
      select coalesce(array_agg(distinct x::uuid),'{}') into v_ids from jsonb_array_elements_text(p_command->'providerIds') x;
      -- Providers first, in id order: booking locks the provider before the type.
      perform 1 from public.scheduling_providers where id=any(v_ids) order by id for update;
      if (select count(*) from public.scheduling_providers where id=any(v_ids))<>cardinality(v_ids) then
        return jsonb_build_object('ok',false,'code','not_found');
      end if;
      if v_id is null then
        insert into public.appointment_types(name,active,duration_minutes,buffer_before_minutes,buffer_after_minutes,
          icon,description,created_by,updated_by,created_at,updated_at)
          values(v_name,true,(p_command->>'durationMinutes')::integer,(p_command->>'bufferBeforeMinutes')::integer,
            (p_command->>'bufferAfterMinutes')::integer,p_command->>'icon',v_text,p_actor_id,p_actor_id,v_now,v_now)
          returning * into v_type;
        v_id:=v_type.id;
      else
        select * into v_type from public.appointment_types where id=v_id and archived_at is null for update;
        if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
        if v_type.version<>v_version then
          return jsonb_build_object('ok',false,'code','stale_version','currentVersion',v_type.version);
        end if;
        v_before:=public.portal_scheduling_settings_record('appointment_type',v_id);
        update public.appointment_types set name=v_name,duration_minutes=(p_command->>'durationMinutes')::integer,
          buffer_before_minutes=(p_command->>'bufferBeforeMinutes')::integer,
          buffer_after_minutes=(p_command->>'bufferAfterMinutes')::integer,icon=p_command->>'icon',
          description=v_text,version=version+1,updated_by=p_actor_id,updated_at=v_now
          where id=v_id returning * into v_type;
      end if;
      delete from public.appointment_type_providers x where x.appointment_type_id=v_id
        and x.provider_id<>all(v_ids);
      insert into public.appointment_type_providers(appointment_type_id,provider_id)
        select v_id,p from unnest(v_ids) p on conflict do nothing;

    elsif v_kind='reorder_appointment_types' then
      if p_command-array['kind','id','expectedVersion','position']<>'{}'::jsonb
        or jsonb_typeof(p_command->'position') is distinct from 'number' then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
      v_position:=(p_command->>'position')::integer;
      -- The whole order is rewritten, so every live type is locked, in id order.
      perform 1 from public.appointment_types where archived_at is null order by id for update;
      select * into v_type from public.appointment_types where id=v_id and archived_at is null;
      if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
      if v_type.version<>v_version then
        return jsonb_build_object('ok',false,'code','stale_version','currentVersion',v_type.version);
      end if;
      select count(*) into v_count from public.appointment_types where archived_at is null;
      if v_position not between 1 and v_count then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
      v_before:=public.portal_scheduling_settings_record('appointment_type',v_id)
        ||jsonb_build_object('order',(select jsonb_agg(id order by sort_order,lower(name),id)
          from public.appointment_types where archived_at is null));
      -- Position counts from 1 in booking order: the moved type takes it and the others close up.
      with others as (
        select id,row_number() over(order by sort_order,lower(name),id) as n
        from public.appointment_types where archived_at is null and id<>v_id
      ), placed as (
        select id,case when n<v_position then n else n+1 end as position from others
        union all select v_id,v_position
      )
      update public.appointment_types t set sort_order=placed.position
        from placed where placed.id=t.id and t.sort_order is distinct from placed.position;
      update public.appointment_types set version=version+1,updated_by=p_actor_id,updated_at=v_now
        where id=v_id returning * into v_type;
      v_after:=public.portal_scheduling_settings_record('appointment_type',v_id)
        ||jsonb_build_object('order',(select jsonb_agg(id order by sort_order,lower(name),id)
          from public.appointment_types where archived_at is null));

    else -- set_appointment_type_active, delete_appointment_type
      if (v_kind='set_appointment_type_active' and (p_command-array['kind','id','expectedVersion','active']<>'{}'::jsonb
          or jsonb_typeof(p_command->'active') is distinct from 'boolean'))
        or (v_kind='delete_appointment_type' and p_command-array['kind','id','expectedVersion']<>'{}'::jsonb) then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
      select * into v_type from public.appointment_types where id=v_id and archived_at is null for update;
      if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
      if v_type.version<>v_version then
        return jsonb_build_object('ok',false,'code','stale_version','currentVersion',v_type.version);
      end if;
      v_before:=public.portal_scheduling_settings_record('appointment_type',v_id);
      if v_kind='set_appointment_type_active' then
        -- Off hides the type from booking; appointments already booked keep it.
        update public.appointment_types set active=(p_command->>'active')::boolean,version=version+1,
          updated_by=p_actor_id,updated_at=v_now where id=v_id returning * into v_type;
      else
        -- Only a type no appointment has used can go; the row stays for its history.
        if exists(select 1 from public.appointments where appointment_type_id=v_id) then
          return jsonb_build_object('ok',false,'code','type_in_use');
        end if;
        update public.appointment_types set active=false,archived_at=v_now,version=version+1,
          updated_by=p_actor_id,updated_at=v_now where id=v_id returning * into v_type;
        delete from public.appointment_type_providers where appointment_type_id=v_id;
      end if;
    end if;
    v_version:=v_type.version;
    v_aspect:=v_type.version;

  ------------------------------------------------------------------ locations
  else
    -- Booking locks the provider before the office, so a change that moves providers' hours here
    -- locks them first too.
    if v_kind in ('save_location_details','retire_location') then
      perform 1 from public.scheduling_providers p where exists(select 1 from public.provider_hours h
        where h.provider_id=p.id and h.location_id=v_id and (h.valid_to is null or h.valid_to>=v_today))
        order by p.id for update;
    end if;
    select * into v_location from public.scheduling_locations where id=v_id for update;
    if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
    v_before:=public.portal_scheduling_settings_record('location',v_id);

    if v_kind='save_location_details' then
      if p_command-array['kind','id','expectedVersion','name','street','city','region','postal','mapsQuery',
          'hours','keepBooked','dryRun']<>'{}'::jsonb
        or not (p_command ?& array['name','street','city','region','postal','mapsQuery','hours','keepBooked','dryRun'])
        or jsonb_typeof(p_command->'name') is distinct from 'string'
        or jsonb_typeof(p_command->'street') is distinct from 'string'
        or jsonb_typeof(p_command->'city') is distinct from 'string'
        or jsonb_typeof(p_command->'region') is distinct from 'string'
        or jsonb_typeof(p_command->'postal') is distinct from 'string'
        or jsonb_typeof(p_command->'mapsQuery') is distinct from 'string'
        or jsonb_typeof(p_command->'keepBooked') is distinct from 'boolean'
        or jsonb_typeof(p_command->'dryRun') is distinct from 'boolean'
        or not public.portal_settings_hours_valid(p_command->'hours',array['weekday','openMinute','closeMinute'])
        or jsonb_array_length(p_command->'hours')=0
        or (select count(distinct value->>'weekday') from jsonb_array_elements(p_command->'hours'))
          <>jsonb_array_length(p_command->'hours') then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
      v_name:=p_command->>'name'; v_hours:=p_command->'hours';
      v_keep:=(p_command->>'keepBooked')::boolean;
      v_dry_run:=(p_command->>'dryRun')::boolean;
      if char_length(v_name) not between 1 and 120 or v_name<>btrim(v_name)
        or char_length(p_command->>'street') not between 1 and 200 or p_command->>'street'<>btrim(p_command->>'street')
        or char_length(p_command->>'city') not between 1 and 120 or p_command->>'city'<>btrim(p_command->>'city')
        or char_length(p_command->>'region') not between 1 and 60 or p_command->>'region'<>btrim(p_command->>'region')
        or p_command->>'postal' !~ '^[0-9]{5}(-[0-9]{4})?$'
        or char_length(p_command->>'mapsQuery') not between 1 and 300
        or p_command->>'mapsQuery'<>btrim(p_command->>'mapsQuery') then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
      if v_location.details_version<>v_version then
        return jsonb_build_object('ok',false,'code','stale_version','currentVersion',v_location.details_version);
      end if;
      -- Providers' hours here follow the office from today. Each row in force here gets its new
      -- edges: an edge on the office's old opening or closing moves with it, any other edge is
      -- kept inside the new hours, and a weekday the office no longer opens drops the row. Only
      -- the rows that change are listed; newOpen is null for a row that goes.
      select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'providerId',c.provider_id,'weekday',c.weekday,
          'validFrom',c.valid_from,'validTo',c.valid_to,
          'newOpen',case when c.new_open is not null and c.new_close>c.new_open then c.new_open end,
          'newClose',case when c.new_open is not null and c.new_close>c.new_open then c.new_close end)),'[]'::jsonb)
        into v_cascade
        from (
          select h.id,h.provider_id,h.weekday,h.open_minute,h.close_minute,h.valid_from,h.valid_to,
            case when n.open_minute is null then null
              when o.open_minute=h.open_minute then n.open_minute
              else greatest(h.open_minute,n.open_minute) end as new_open,
            case when n.open_minute is null then null
              when o.close_minute=h.close_minute then n.close_minute
              else least(h.close_minute,n.close_minute) end as new_close
          from public.provider_hours h
          join public.scheduling_providers p on p.id=h.provider_id and p.active
          left join public.location_hours o on o.location_id=v_id and o.weekday=h.weekday
          left join lateral (select (x->>'openMinute')::integer as open_minute,(x->>'closeMinute')::integer as close_minute
            from jsonb_array_elements(v_hours) x where (x->>'weekday')::integer=h.weekday) n on true
          where h.location_id=v_id and (h.valid_to is null or h.valid_to>=v_today)
        ) c
        where c.new_open is null or c.new_close<=c.new_open
          or c.new_open<>c.open_minute or c.new_close<>c.close_minute;
      select coalesce(jsonb_agg(jsonb_build_object('providerId',p.id,'providerName',p.name,'weekdays',w.days)
          order by p.sort_order,lower(p.name),p.id),'[]'::jsonb)
        into v_adjusted
        from (select (c->>'providerId')::uuid as provider_id,jsonb_agg(distinct (c->>'weekday')::integer) as days
          from jsonb_array_elements(v_cascade) c group by 1) w
        join public.scheduling_providers p on p.id=w.provider_id;
      -- The appointments the providers' new hours would leave outside them.
      v_conflicts:='[]'::jsonb;
      v_provider_before:='{}'::jsonb;
      for v_peer in select distinct (c->>'providerId')::uuid as id from jsonb_array_elements(v_cascade) c loop
        v_schedule:=public.portal_provider_schedule(v_peer.id);
        v_provider_before:=v_provider_before||jsonb_build_object(v_peer.id::text,
          public.portal_scheduling_settings_record('provider',v_peer.id));
        select coalesce(jsonb_agg(r),'[]'::jsonb) into v_new_hours from (
          select jsonb_build_object('locationId',h.location_id,'weekday',h.weekday,'openMinute',h.open_minute,
              'closeMinute',h.close_minute,'validFrom',h.valid_from,'validTo',h.valid_to) as r
            from public.provider_hours h where h.provider_id=v_peer.id
            and not exists(select 1 from jsonb_array_elements(v_cascade) c where (c->>'id')::uuid=h.id)
          union all
          select jsonb_build_object('locationId',v_id,'weekday',h.weekday,'openMinute',h.open_minute,
              'closeMinute',h.close_minute,'validFrom',h.valid_from,'validTo',v_today-1)
            from jsonb_array_elements(v_cascade) c join public.provider_hours h on h.id=(c->>'id')::uuid
            where h.provider_id=v_peer.id and h.valid_from<v_today
          union all
          select jsonb_build_object('locationId',v_id,'weekday',h.weekday,'openMinute',(c->>'newOpen')::integer,
              'closeMinute',(c->>'newClose')::integer,'validFrom',greatest(h.valid_from,v_today),'validTo',h.valid_to)
            from jsonb_array_elements(v_cascade) c join public.provider_hours h on h.id=(c->>'id')::uuid
            where h.provider_id=v_peer.id and c->>'newOpen' is not null
        ) moved;
        v_conflicts:=v_conflicts||public.portal_provider_hours_conflicts(v_peer.id,v_schedule,
          jsonb_build_object('hours',v_new_hours,'exceptions',v_schedule->'exceptions'),v_now);
      end loop;
      if v_dry_run then
        return jsonb_build_object('ok',true,'dryRun',true,'entity','location','id',v_id,
          'version',v_location.details_version,'conflicts',v_conflicts,'adjusted',v_adjusted);
      end if;
      if jsonb_array_length(v_conflicts)>0 and not v_keep then
        return jsonb_build_object('ok',false,'code','schedule_in_use','conflicts',v_conflicts,
          'adjusted',v_adjusted);
      end if;
      update public.scheduling_locations set name=v_name,street=p_command->>'street',city=p_command->>'city',
        region=p_command->>'region',postal=p_command->>'postal',maps_query=p_command->>'mapsQuery',
        details_version=details_version+1,version=version+1,updated_by=p_actor_id,updated_at=v_now
        where id=v_id returning * into v_location;
      delete from public.location_hours where location_id=v_id;
      insert into public.location_hours(location_id,weekday,open_minute,close_minute)
        select v_id,(o->>'weekday')::integer,(o->>'openMinute')::integer,(o->>'closeMinute')::integer
        from jsonb_array_elements(v_hours) o;
      -- A row that began before today keeps its past and continues from today with the new edges.
      insert into public.provider_hours(provider_id,location_id,weekday,open_minute,close_minute,valid_from,valid_to)
        select (c->>'providerId')::uuid,v_id,(c->>'weekday')::integer,(c->>'newOpen')::integer,
          (c->>'newClose')::integer,v_today,(c->>'validTo')::date
        from jsonb_array_elements(v_cascade) c
        where (c->>'validFrom')::date<v_today and c->>'newOpen' is not null;
      update public.provider_hours h set valid_to=v_today-1
        from jsonb_array_elements(v_cascade) c
        where h.id=(c->>'id')::uuid and h.valid_from<v_today;
      update public.provider_hours h set open_minute=(c->>'newOpen')::integer,close_minute=(c->>'newClose')::integer
        from jsonb_array_elements(v_cascade) c
        where h.id=(c->>'id')::uuid and h.valid_from>=v_today and c->>'newOpen' is not null;
      delete from public.provider_hours h using jsonb_array_elements(v_cascade) c
        where h.id=(c->>'id')::uuid and h.valid_from>=v_today and c->>'newOpen' is null;
      if jsonb_array_length(v_adjusted)=0 then v_adjusted:=null; end if;
      if jsonb_array_length(v_conflicts)=0 then v_conflicts:=null; end if;

    elsif v_kind in ('retire_location','restore_location') then
      if p_command-array['kind','id','expectedVersion']<>'{}'::jsonb then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
      if v_location.details_version<>v_version then
        return jsonb_build_object('ok',false,'code','stale_version','currentVersion',v_location.details_version);
      end if;
      if v_kind='retire_location' then
        if v_location.active and (select count(*) from public.scheduling_locations where active)<=1 then
          return jsonb_build_object('ok',false,'code','last_location');
        end if;
        select array_agg(a.id) into v_ids from public.appointments a
          where a.location_id=v_id and a.status in ('scheduled','checked_in') and a.ends_at>v_now;
        if v_ids is not null then
          return jsonb_build_object('ok',false,'code','schedule_in_use',
            'conflicts',public.portal_settings_conflicts(v_ids));
        end if;
        -- Every provider's weekly hours here end yesterday; their other offices keep theirs.
        select coalesce(jsonb_object_agg(p.id::text,public.portal_scheduling_settings_record('provider',p.id)),'{}'::jsonb),
            coalesce(jsonb_agg(jsonb_build_object('providerId',p.id,'providerName',p.name,'weekdays',
              (select jsonb_agg(distinct h.weekday) from public.provider_hours h where h.provider_id=p.id
                and h.location_id=v_id and (h.valid_to is null or h.valid_to>=v_today)))
              order by p.sort_order,lower(p.name),p.id),'[]'::jsonb)
          into v_provider_before,v_adjusted
          from public.scheduling_providers p where exists(select 1 from public.provider_hours h
            where h.provider_id=p.id and h.location_id=v_id and (h.valid_to is null or h.valid_to>=v_today));
        update public.provider_hours set valid_to=v_today-1
          where location_id=v_id and valid_from<v_today and (valid_to is null or valid_to>=v_today);
        delete from public.provider_hours where location_id=v_id and valid_from>=v_today;
        if jsonb_array_length(v_adjusted)=0 then v_adjusted:=null; end if;
      end if;
      update public.scheduling_locations set active=(v_kind='restore_location'),
        details_version=details_version+1,version=version+1,updated_by=p_actor_id,updated_at=v_now
        where id=v_id returning * into v_location;

    elsif v_kind='add_location_closure' then
      if p_command-array['kind','id','closedOn','closedThrough','note','dryRun']<>'{}'::jsonb
        or not (p_command ?& array['closedOn','closedThrough','note','dryRun'])
        or jsonb_typeof(p_command->'closedOn') is distinct from 'string'
        or (p_command->>'closedOn') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        or jsonb_typeof(p_command->'closedThrough') is distinct from 'string'
        or (p_command->>'closedThrough') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        or jsonb_typeof(p_command->'note') not in ('string','null')
        or jsonb_typeof(p_command->'dryRun') is distinct from 'boolean' then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
      v_first:=(p_command->>'closedOn')::date; v_last:=(p_command->>'closedThrough')::date;
      v_text:=p_command->>'note';
      v_dry_run:=(p_command->>'dryRun')::boolean;
      if v_first<v_today or v_last<v_first or v_last-v_first>60 or v_last>v_today+1100
        or (v_text is not null and (char_length(v_text) not between 1 and 120 or v_text<>btrim(v_text))) then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
      if not exists(select 1 from generate_series(v_first::timestamp,v_last::timestamp,interval '1 day') d
        where not exists(select 1 from public.location_closures c where c.location_id=v_id and c.closed_on=d::date)) then
        return jsonb_build_object('ok',false,'code','already_closed');
      end if;
      v_from:=v_first::timestamp at time zone 'America/New_York';
      v_until:=(v_last+1)::timestamp at time zone 'America/New_York';
      -- A closed day never cancels an appointment: the ones those days are returned to be rebooked.
      select array_agg(a.id) into v_ids from public.appointments a
        where a.location_id=v_id and a.status in ('scheduled','checked_in')
        and a.starts_at>=v_from and a.starts_at<v_until;
      v_conflicts:=public.portal_settings_conflicts(coalesce(v_ids,'{}'));
      if v_dry_run then
        return jsonb_build_object('ok',true,'dryRun',true,'entity','location','id',v_id,
          'version',v_location.version,'conflicts',v_conflicts);
      end if;
      insert into public.location_closures(location_id,closed_on,note,created_by,created_at)
        select v_id,d::date,v_text,p_actor_id,v_now
        from generate_series(v_first::timestamp,v_last::timestamp,interval '1 day') d
        where not exists(select 1 from public.location_closures c where c.location_id=v_id and c.closed_on=d::date);
      update public.scheduling_locations set version=version+1,updated_by=p_actor_id,updated_at=v_now
        where id=v_id returning * into v_location;

    else -- remove_location_closure
      if p_command-array['kind','id','closureIds']<>'{}'::jsonb
        or jsonb_typeof(p_command->'closureIds') is distinct from 'array'
        or jsonb_array_length(p_command->'closureIds') not between 1 and 61
        or exists(select 1 from jsonb_array_elements(p_command->'closureIds') x where jsonb_typeof(x) is distinct from 'string') then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
      select array_agg(distinct x::uuid) into v_ids from jsonb_array_elements_text(p_command->'closureIds') x;
      delete from public.location_closures where id=any(v_ids) and location_id=v_id;
      if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
      update public.scheduling_locations set version=version+1,updated_by=p_actor_id,updated_at=v_now
        where id=v_id returning * into v_location;
    end if;
    v_version:=v_location.version;
    v_aspect:=case when v_kind in ('add_location_closure','remove_location_closure') then v_location.version
      else v_location.details_version end;
  end if;

  -- An office change that moved providers' hours records each provider's change as well.
  if v_provider_before is not null and v_provider_before<>'{}'::jsonb then
    for v_peer in select key::uuid as id,value as record_before from jsonb_each(v_provider_before) loop
      update public.scheduling_providers set version=version+1,updated_by=p_actor_id,updated_at=v_now
        where id=v_peer.id returning * into v_provider;
      insert into public.scheduling_changes(entity,entity_id,provider_id,version,command,before_record,
        after_record,actor_id,actor_email,occurred_at)
        values('provider',v_peer.id,v_peer.id,v_provider.version,v_kind,v_peer.record_before,
          public.portal_scheduling_settings_record('provider',v_peer.id),p_actor_id,v_staff.email,v_now);
    end loop;
  end if;

  v_after:=coalesce(v_after,public.portal_scheduling_settings_record(v_entity,v_id));
  insert into public.scheduling_changes(entity,entity_id,provider_id,location_id,appointment_type_id,
    version,command,before_record,after_record,actor_id,actor_email,occurred_at)
    values(v_entity,v_id,case when v_entity='provider' then v_id end,case when v_entity='location' then v_id end,
      case when v_entity='appointment_type' then v_id end,v_version,v_kind,v_before,v_after,p_actor_id,v_staff.email,v_now)
    returning id into v_change_id;
  insert into public.audit_log(actor_email,action,entity,entity_id,source,correlation_id,detail,at)
    values(v_staff.email,'scheduling.'||v_kind,'scheduling',v_id,'staff',p_idempotency_key,
      jsonb_build_object('entity',v_entity,'version',v_version),v_now);
  v_result:=jsonb_build_object('ok',true,'entity',v_entity,'id',v_id,'version',v_aspect);
  if v_conflicts is not null then v_result:=v_result||jsonb_build_object('conflicts',v_conflicts); end if;
  if v_adjusted is not null then v_result:=v_result||jsonb_build_object('adjusted',v_adjusted); end if;
  insert into public.scheduling_command_receipts(idempotency_key,change_id,actor_id,fingerprint,result,created_at)
    values(p_idempotency_key,v_change_id,p_actor_id,p_fingerprint,v_result,v_now);
  return v_result;
exception when invalid_text_representation or datetime_field_overflow or invalid_datetime_format
  or numeric_value_out_of_range then
  return jsonb_build_object('ok',false,'code','invalid_command');
end;
$$;
revoke execute on function public.portal_save_scheduling_settings(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.portal_save_scheduling_settings(uuid,uuid,text,jsonb) to service_role;

-- Everything the Settings window shows. Each provider and office carries the versions of the
-- parts Settings edits, retired ones are listed apart so they can be restored, and needsNewTime
-- lists the upcoming appointments that the current hours, time off or closed days no longer
-- cover, with why.
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
        'credentials',p.credentials,'bookable',p.bookable,'version',p.version,
        'profileVersion',p.profile_version,'hoursVersion',p.hours_version,'typesVersion',p.types_version,
        'sortOrder',p.sort_order,
        -- The week in force from today and any planned from a later day: rows ending before today are history.
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
    'retiredProviders',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,
        'credentials',p.credentials,'profileVersion',p.profile_version) order by lower(p.name),p.id)
      from public.scheduling_providers p where not p.active),'[]'::jsonb),
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
        'detailsVersion',l.details_version,
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
      from public.scheduling_locations l where l.active),'[]'::jsonb),
    'retiredLocations',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'name',l.name,
        'detailsVersion',l.details_version) order by l.name,l.id)
      from public.scheduling_locations l where not l.active),'[]'::jsonb),
    'needsNewTime',coalesce((
      with schedules as (
        select p.id,public.portal_provider_schedule(p.id) as schedule
        from public.scheduling_providers p where p.active
          and exists(select 1 from public.appointments a where a.provider_id=p.id
            and a.status in ('scheduled','checked_in') and a.starts_at>v_now)
      )
      select jsonb_agg(jsonb_build_object('id',a.id,'version',a.version,'startsAt',a.starts_at,
          'endsAt',a.ends_at,'date',(a.starts_at at time zone 'America/New_York')::date,
          'appointmentType',t.name,'appointmentTypeIcon',t.icon,
          'providerId',a.provider_id,'providerName',p.name,'locationId',a.location_id,'locationName',l.name,
          'patientName',pt.name,'patientListName',(regexp_match(pt.name,'(\S+)$'))[1],
          'reason',case when closed.found then 'office_closed' when away.found then 'time_off'
            else 'outside_hours' end)
        order by a.starts_at,a.id)
      from public.appointments a
      join schedules s on s.id=a.provider_id
      join public.scheduling_providers p on p.id=a.provider_id
      join public.scheduling_locations l on l.id=a.location_id and l.active
      join public.appointment_types t on t.id=a.appointment_type_id
      join public.patients pt on pt.id=a.patient_id
      cross join lateral (select exists(select 1 from public.location_closures c where c.location_id=a.location_id
        and c.closed_on=(a.starts_at at time zone 'America/New_York')::date) as found) closed
      cross join lateral (select exists(select 1 from public.provider_time_exceptions e
        where e.provider_id=a.provider_id and e.kind='unavailable' and e.reason is not null
        and (e.location_id is null or e.location_id=a.location_id)
        and e.starts_at<a.reserved_until and e.ends_at>a.reserved_from) as found) away
      where a.status in ('scheduled','checked_in') and a.starts_at>v_now
      and (closed.found or not public.portal_schedule_allows(a.location_id,a.reserved_from,a.reserved_until,
        s.schedule->'hours',s.schedule->'exceptions'))),'[]'::jsonb))
  into v_result;
  return v_result;
end;
$$;
revoke execute on function public.portal_scheduling_settings(uuid) from public,anon,authenticated;
grant execute on function public.portal_scheduling_settings(uuid) to service_role;

notify pgrst,'reload schema';
