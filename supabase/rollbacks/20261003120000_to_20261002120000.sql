-- Reverses 20261003120000_scheduling_settings: restores the schedule, booking and config
-- functions to their previous bodies, then removes the settings commands, eligibility, office
-- hours, closed days and the new columns. Settings changes recorded by the new commands are
-- deleted first, since the restored command check does not allow them.

delete from public.scheduling_changes where command in (
  'add_provider','set_provider_profile','set_provider_weekly_hours','add_time_off','remove_time_off',
  'set_provider_types','reorder_appointment_types','set_appointment_type_active','delete_appointment_type',
  'save_location_details','add_location_closure','remove_location_closure');
alter table public.scheduling_changes drop constraint scheduling_changes_command_check;
alter table public.scheduling_changes add constraint scheduling_changes_command_check check (command in (
  'save_provider','save_location','save_appointment_type',
  'book','reschedule','cancel','check_in','complete','no_show','undo'));

drop function public.portal_save_scheduling_settings(uuid,uuid,text,jsonb);
drop function public.portal_scheduling_settings(uuid);

create or replace function public.portal_save_scheduling_config(
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

create or replace function public.portal_execute_appointment_command(
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
  v_request public.requests%rowtype;
  v_request_version bigint;
  v_request_before jsonb;
  v_request_after_version bigint;
  v_request_transition_id uuid;
  v_request_result jsonb;
  v_call_again_at timestamptz;
  v_managed boolean;
  v_sync_request boolean;
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
      or p_command-array['kind','patientId','providerId','locationId','appointmentTypeId','expectedTypeVersion','sourceRequestId','startsAt','requestVersion']<>'{}'::jsonb
      or jsonb_typeof(p_command->'patientId') is distinct from 'string'
      or jsonb_typeof(p_command->'sourceRequestId') not in ('string','null') then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
    v_patient_id:=(p_command->>'patientId')::uuid;
    v_source_id:=(p_command->>'sourceRequestId')::uuid;
    v_managed:=v_source_id is not null;
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
        or p_command-array['kind','id','expectedVersion','providerId','locationId','appointmentTypeId','expectedTypeVersion','startsAt','reason','requestVersion']<>'{}'::jsonb))
      or (v_kind='cancel' and (not (p_command ? 'reason') or p_command-array['kind','id','expectedVersion','reason','requestVersion','callAgainAt']<>'{}'::jsonb))
      or (v_kind in ('check_in','complete','no_show','undo') and p_command-array['kind','id','expectedVersion','requestVersion']<>'{}'::jsonb) then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
    select patient_id,source_request_id,request_workflow_managed into v_patient_id,v_source_id,v_managed from public.appointments where id=v_id;
    if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
  end if;
  if (p_command ? 'requestVersion' and jsonb_typeof(p_command->'requestVersion') not in ('number','null'))
    or ((p_command->>'requestVersion') is not null and (p_command->>'requestVersion') !~ '^[1-9][0-9]*$') then
    return jsonb_build_object('ok',false,'code','invalid_command');
  end if;
  v_request_version:=(p_command->>'requestVersion')::bigint;
  if v_request_version is not null and v_request_version not between 1 and 9007199254740990 then
    return jsonb_build_object('ok',false,'code','invalid_command');
  end if;
  -- Match request-linking lock order before touching an appointment that may lose its source link.
  if v_source_id is not null then
    select * into v_request from public.requests where id=v_source_id for update;
    if v_kind='book' and not exists(select 1 from public.patient_request_links
      where request_id=v_source_id and patient_id=v_patient_id) then
      return jsonb_build_object('ok',false,'code','request_link_conflict');
    end if;
    if v_kind='book' and exists(select 1 from public.appointments
      where source_request_id=v_source_id and status<>'cancelled') then
      return jsonb_build_object('ok',false,'code','request_already_booked');
    end if;
  end if;
  v_sync_request:=v_source_id is not null and v_request.id is not null and v_managed
    and v_kind in ('book','reschedule','cancel','undo');
  if v_sync_request then
    if v_request_version is null then return jsonb_build_object('ok',false,'code','request_version_required'); end if;
    if v_request.version<>v_request_version then
      return jsonb_build_object('ok',false,'code','request_stale_version','currentVersion',v_request.version);
    end if;
    if (v_kind='book' and v_request.status not in ('new','contacted'))
      or (v_kind in ('reschedule','cancel') and v_request.status<>'booked') then
      return jsonb_build_object('ok',false,'code','request_not_actionable');
    end if;
  elsif v_request_version is not null then
    return jsonb_build_object('ok',false,'code','invalid_command');
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
      v_target.source_request_id:=v_source_id; v_target.request_workflow_managed:=v_managed; v_target.status:='scheduled';
      v_target.version:=1; v_target.created_at:=v_now; v_target.created_by:=p_actor_id;
    end if;
  elsif v_kind='undo' then
    select * into v_latest from public.scheduling_changes
      where entity='appointment' and entity_id=v_id and version=v_current.version;
    if not found or v_latest.command='undo' or v_latest.occurred_at < v_now-interval '15 minutes' then
      return jsonb_build_object('ok',false,'code','undo_unavailable');
    end if;
    if v_sync_request and v_latest.request_after_version is not null
      and (v_latest.request_id is distinct from v_source_id or v_request.version<>v_latest.request_after_version) then
      return jsonb_build_object('ok',false,'code','request_undo_unavailable');
    end if;
    -- Arrival and visit outcomes do not mutate the intake workflow.
    if v_sync_request and v_latest.request_after_version is null then v_sync_request:=false; end if;
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
  if v_kind='cancel' then
    if (p_command ? 'callAgainAt' and jsonb_typeof(p_command->'callAgainAt') not in ('string','null')) then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
    if v_sync_request then
      if (p_command->>'callAgainAt') is null then
        return jsonb_build_object('ok',false,'code','request_follow_up_required');
      end if;
      if (p_command->>'callAgainAt') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T.*(Z|[+-][0-9]{2}:[0-9]{2})$' then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
      v_call_again_at:=(p_command->>'callAgainAt')::timestamptz;
      if not isfinite(v_call_again_at) or v_call_again_at<=v_now
        or (v_call_again_at at time zone 'America/New_York')::time<>time '08:00:00' then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
    elsif (p_command->>'callAgainAt') is not null then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
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
  if v_call_again_at is not null and v_call_again_at<=v_now then
    return jsonb_build_object('ok',false,'code','invalid_command');
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
  if v_sync_request then
    -- Retain only workflow state, never the temporary request's contact or note fields.
    v_request_before:=jsonb_build_object('state',v_request.status,'callAgainAt',v_request.follow_up_at,
      'bookingConfirmedAt',v_request.record_handoff_at,'appointmentAt',v_request.appointment_at,
      'closedAt',v_request.closed_at,'closureReason',v_request.closure_reason,
      'closureDisposition',v_request.closure_disposition,'closureProvenance',v_request.closure_provenance,
      'legacyReviewRequired',v_request.legacy_review_required);
    if v_kind in ('book','cancel') then
      v_request_result:=public.portal_apply_request_command(v_staff.email,v_source_id,v_request.version,
        p_idempotency_key,p_fingerprint,jsonb_build_object(
          'command',case when v_kind='book' then 'confirm_booking_handoff' else 'reopen_request' end,
          'state',case when v_kind='book' then 'booked' else 'contacted' end,
          'callAgainAt',case when v_kind='cancel' then v_call_again_at else null end,
          'bookingConfirmedAt',case when v_kind='book' then v_now else null end,
          'appointmentAt',case when v_kind='book' then v_current.starts_at else null end,
          'closedAt',null,'closureReason',null,'legacyReviewRequired',false,'reasonCode',null,'occurredAt',v_now),null,null);
    elsif v_kind='undo' and v_latest.request_transition_id is not null then
      v_request_result:=public.portal_apply_request_command(v_staff.email,v_source_id,v_request.version,
        p_idempotency_key,p_fingerprint,jsonb_build_object('command','undo_latest_transition','occurredAt',v_now),
        null,v_latest.request_transition_id);
    elsif v_kind='reschedule' then
      update public.requests set appointment_at=v_current.starts_at,version=version+1 where id=v_source_id;
      v_request_result:=jsonb_build_object('ok',true);
    elsif v_kind='undo' then
      update public.requests set status=v_latest.request_before->>'state',
        follow_up_at=(v_latest.request_before->>'callAgainAt')::timestamptz,
        record_handoff_at=(v_latest.request_before->>'bookingConfirmedAt')::timestamptz,
        appointment_at=(v_latest.request_before->>'appointmentAt')::timestamptz,
        closed_at=(v_latest.request_before->>'closedAt')::timestamptz,
        closure_reason=v_latest.request_before->>'closureReason',
        closure_disposition=v_latest.request_before->>'closureDisposition',
        closure_provenance=v_latest.request_before->>'closureProvenance',
        legacy_review_required=(v_latest.request_before->>'legacyReviewRequired')::boolean,
        version=version+1 where id=v_source_id;
      v_request_result:=jsonb_build_object('ok',true);
    end if;
    if (v_request_result->>'ok')::boolean is distinct from true then
      -- An exception rolls back the appointment, request, audit, and receipts together.
      raise exception using errcode='P2001',message='Request workflow rejected the appointment change';
    end if;
    select * into v_request from public.requests where id=v_source_id;
    v_request_after_version:=v_request.version;
    select id into v_request_transition_id from public.request_transitions
      where request_id=v_source_id and resulting_version=v_request.version;
    if v_request_transition_id is null then
      insert into public.audit_log(actor_email,action,entity,entity_id,source,correlation_id,detail,at)
        values(v_staff.email,'request.appointment_change','requests',v_source_id,'staff',p_idempotency_key,
          jsonb_build_object('command',v_kind,'appointment_id',v_id,'resulting_version',v_request.version),v_now);
    end if;
  end if;
  insert into public.scheduling_changes(entity,entity_id,appointment_id,version,command,before_record,
    after_record,compensates_change_id,actor_id,actor_email,occurred_at,
    request_id,request_before,request_after_version,request_transition_id)
    values('appointment',v_id,v_id,v_current.version,v_kind,v_before,to_jsonb(v_current),
      v_compensates,p_actor_id,v_staff.email,v_now,
      case when v_sync_request then v_source_id else null end,v_request_before,v_request_after_version,v_request_transition_id)
      returning id into v_change_id;
  insert into public.audit_log(actor_email,action,entity,entity_id,source,correlation_id,detail,at)
    values(v_staff.email,'appointment.'||v_kind,'appointments',v_id,'staff',p_idempotency_key,
      jsonb_build_object('version',v_current.version,'status',v_current.status,'compensates_change_id',v_compensates),v_now);
  v_result:=jsonb_build_object('ok',true,'entity','appointment','id',v_id,'version',v_current.version);
  if v_current.request_workflow_managed and v_request.id is not null then
    v_result:=v_result||jsonb_build_object('request',jsonb_build_object('id',v_request.id,'state',v_request.status,
      'version',v_request.version,'callAgainAt',v_request.follow_up_at,'appointmentAt',v_request.appointment_at));
  end if;
  insert into public.scheduling_command_receipts(idempotency_key,change_id,actor_id,fingerprint,result,created_at)
    values(p_idempotency_key,v_change_id,p_actor_id,p_fingerprint,v_result,v_now);
  return v_result;
exception
  when sqlstate 'P2001' then
    return jsonb_build_object('ok',false,'code','request_transition_rejected');
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

create or replace function public.portal_available_appointment_slots(
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

create or replace function public.portal_schedule_working(
  p_first date, p_last date, p_provider_ids uuid[], p_location_id uuid
) returns table(provider_id uuid, location_id uuid, day date, working tstzmultirange)
language sql stable security invoker set search_path = '' as $$
  with providers as (
    select p.id from public.scheduling_providers p
    where p.active and (p_provider_ids is null or p.id=any(p_provider_ids))
  ), locations as (
    select l.id from public.scheduling_locations l
    where l.active and (p_location_id is null or l.id=p_location_id)
  ), bounds as (
    select p_first::timestamp at time zone 'America/New_York' as range_start,
      (p_last+1)::timestamp at time zone 'America/New_York' as range_end
  ), pairs as (
    select distinct h.provider_id,h.location_id from public.provider_hours h
      join providers p on p.id=h.provider_id join locations l on l.id=h.location_id
    union
    select distinct e.provider_id,e.location_id from public.provider_time_exceptions e
      join providers p on p.id=e.provider_id join locations l on l.id=e.location_id
      cross join bounds b
      where e.kind='available' and e.starts_at<b.range_end and e.ends_at>b.range_start
  ), days as (
    select d::date as day,
      d at time zone 'America/New_York' as day_start,
      (d+interval '1 day') at time zone 'America/New_York' as day_end
    from generate_series(p_first::timestamp,p_last::timestamp,interval '1 day') d
  )
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
      and e.starts_at<dy.day_end and e.ends_at>dy.day_start),'{}'::tstzmultirange)
  from pairs pl cross join days dy;
$$;

drop function public.portal_schedule_greedy_opens(date,date,uuid[],uuid,uuid);
create function public.portal_schedule_greedy_opens(
  p_first date, p_last date, p_provider_ids uuid[], p_location_id uuid, p_type_id uuid
) returns table(provider_id uuid, location_id uuid, day date, starts_at timestamptz, ends_at timestamptz)
language plpgsql stable security invoker set search_path = '' as $$
#variable_conflict use_column
declare
  v_now timestamptz := statement_timestamp();
  v_today date := (statement_timestamp() at time zone 'America/New_York')::date;
  v_type public.appointment_types%rowtype;
  v_range_start timestamptz := p_first::timestamp at time zone 'America/New_York';
  v_range_end timestamptz := (p_last+1)::timestamp at time zone 'America/New_York';
  v_row record;
  v_provider uuid;
  v_until timestamptz;
begin
  select * into v_type from public.appointment_types t where t.id=p_type_id;
  if not found or greatest(p_first,v_today)>p_last then return; end if;
  for v_row in
    with providers as (
      select p.id from public.scheduling_providers p
      where p.active and (p_provider_ids is null or p.id=any(p_provider_ids))
    ), locations as (
      select l.id from public.scheduling_locations l
      where l.active and (p_location_id is null or l.id=p_location_id)
    ), pairs as (
      select distinct h.provider_id,h.location_id from public.provider_hours h
        join providers p on p.id=h.provider_id join locations l on l.id=h.location_id
      union
      select distinct e.provider_id,e.location_id from public.provider_time_exceptions e
        join providers p on p.id=e.provider_id join locations l on l.id=e.location_id
        where e.kind='available' and e.starts_at<v_range_end and e.ends_at>v_range_start
    ), days as (
      select d::date as day from generate_series(greatest(p_first,v_today)::timestamp,p_last::timestamp,interval '1 day') d
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
    select p.provider_id as slot_provider,p.location_id as slot_location,r.day as slot_day,
      r.instant,r.reserved_from,r.reserved_until
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
    order by p.provider_id,r.instant,p.location_id
  loop
    if v_row.slot_provider is distinct from v_provider then
      v_provider:=v_row.slot_provider;
      v_until:='-infinity'::timestamptz;
    end if;
    -- The same instant at a second location is rejected here: its range starts before v_until.
    if v_row.reserved_from>=v_until then
      provider_id:=v_row.slot_provider;
      location_id:=v_row.slot_location;
      day:=v_row.slot_day;
      starts_at:=v_row.instant;
      ends_at:=v_row.instant+make_interval(mins=>v_type.duration_minutes);
      return next;
      v_until:=v_row.reserved_until;
    end if;
  end loop;
end;
$$;
revoke execute on function public.portal_schedule_greedy_opens(date,date,uuid[],uuid,uuid) from public,anon,authenticated;
grant execute on function public.portal_schedule_greedy_opens(date,date,uuid[],uuid,uuid) to service_role;

create or replace function public.portal_schedule_month_summary(
  p_actor_id uuid, p_month date, p_location_id uuid default null, p_appointment_type_id uuid default null
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  v_now timestamptz := statement_timestamp();
  v_today date := (statement_timestamp() at time zone 'America/New_York')::date;
  v_type public.appointment_types%rowtype;
  v_last date;
  v_month_start timestamptz;
  v_month_end timestamptz;
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

  with providers as (
    select id,name from public.scheduling_providers where active
  ), locations as (
    select id,name from public.scheduling_locations where active and (p_location_id is null or id=p_location_id)
  ), days as (
    select d::date as day from generate_series(p_month::timestamp,v_last::timestamp,interval '1 day') d
  ), provider_working as (
    select w.provider_id,w.day,range_agg(r) as working,
      jsonb_agg(distinct l.name) as location_names
    from public.portal_schedule_working(p_month,v_last,null,p_location_id) w
    cross join lateral unnest(w.working) as r
    join locations l on l.id=w.location_id
    group by w.provider_id,w.day
  ), provider_minutes as (
    select pw.provider_id,pw.day,pw.location_names,
      (select sum(extract(epoch from upper(r)-lower(r)))/60 from unnest(pw.working) r) as minutes
    from provider_working pw
  ), slots as (
    select o.provider_id,o.day,o.starts_at
    from public.portal_schedule_greedy_opens(p_month,v_last,null,p_location_id,v_type.id) o
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
      'bufferAfterMinutes',v_type.buffer_after_minutes,'version',v_type.version),
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

create or replace function public.portal_schedule_week(
  p_actor_id uuid, p_week_start date, p_provider_ids uuid[], p_location_id uuid default null,
  p_appointment_type_id uuid default null
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  v_now timestamptz := statement_timestamp();
  v_today date := (statement_timestamp() at time zone 'America/New_York')::date;
  v_type public.appointment_types%rowtype;
  v_last date;
  v_week_start timestamptz;
  v_week_end timestamptz;
  v_result jsonb;
begin
  if not exists(select 1 from public.staff_profiles where user_id=p_actor_id and active and onboarded_at is not null) then
    return jsonb_build_object('ok',false,'code','unauthorized');
  end if;
  if p_week_start is null or not isfinite(p_week_start) or extract(dow from p_week_start)<>0
    or p_week_start<date '2000-01-01' or p_week_start>date '2199-12-31'
    or p_provider_ids is null or cardinality(p_provider_ids) not between 1 and 3
    or array_position(p_provider_ids,null) is not null
    or (select count(distinct x) from unnest(p_provider_ids) x)<>cardinality(p_provider_ids) then
    return jsonb_build_object('ok',false,'code','invalid_command');
  end if;
  if (select count(*) from public.scheduling_providers where active and id=any(p_provider_ids))
    <>cardinality(p_provider_ids) then
    return jsonb_build_object('ok',false,'code','provider_unavailable');
  end if;
  if p_location_id is not null and not exists(
    select 1 from public.scheduling_locations where id=p_location_id and active) then
    return jsonb_build_object('ok',false,'code','location_unavailable');
  end if;
  -- The month summary's reference type: the shortest active type, the earliest created on a tie.
  select * into v_type from public.appointment_types
    where active and (p_appointment_type_id is null or id=p_appointment_type_id)
    order by duration_minutes, created_at, id limit 1;
  if not found then return jsonb_build_object('ok',false,'code','type_unavailable'); end if;

  v_last:=p_week_start+6;
  v_week_start:=p_week_start::timestamp at time zone 'America/New_York';
  v_week_end:=(v_last+1)::timestamp at time zone 'America/New_York';

  with chosen as (
    select u.id,u.ord from unnest(p_provider_ids) with ordinality as u(id,ord)
  ), providers as (
    select c.id,c.ord,p.name from chosen c join public.scheduling_providers p on p.id=c.id
  ), locations as (
    select id,name from public.scheduling_locations where active and (p_location_id is null or id=p_location_id)
  ), days as (
    select d::date as day from generate_series(p_week_start::timestamp,v_last::timestamp,interval '1 day') d
  ), working as (
    select w.provider_id,w.day,range_agg(r) as working
    from public.portal_schedule_working(p_week_start,v_last,p_provider_ids,p_location_id) w
    cross join lateral unnest(w.working) as r
    group by w.provider_id,w.day
  ), slots as (
    select o.provider_id,o.day,o.starts_at,o.ends_at,o.location_id
    from public.portal_schedule_greedy_opens(p_week_start,v_last,p_provider_ids,p_location_id,v_type.id) o
  ), visits as (
    select a.id,a.provider_id,(a.starts_at at time zone 'America/New_York')::date as day,
      a.starts_at,a.ends_at,a.status,t.name as type_name,pt.name as patient_name
    from public.appointments a
    join public.appointment_types t on t.id=a.appointment_type_id
    join public.patients pt on pt.id=a.patient_id
    where a.provider_id=any(p_provider_ids) and a.status<>'cancelled'
      and a.starts_at>=v_week_start and a.starts_at<v_week_end
      and (p_location_id is null or a.location_id=p_location_id)
  )
  select jsonb_build_object('ok',true,'observedAt',v_now,'today',v_today,
    'weekStart',p_week_start,'timeZone','America/New_York',
    'activeProviderCount',(select count(*) from public.scheduling_providers where active),
    'referenceType',jsonb_build_object('id',v_type.id,'name',v_type.name,
      'durationMinutes',v_type.duration_minutes,'version',v_type.version),
    'providers',(select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'days',(
      select jsonb_agg(jsonb_build_object(
        'date',dy.day,
        'working',coalesce((select jsonb_agg(jsonb_build_object('from',lower(r),'until',upper(r)) order by lower(r))
          from working w cross join lateral unnest(w.working) as r
          where w.provider_id=p.id and w.day=dy.day),'[]'::jsonb),
        'appointments',coalesce((select jsonb_agg(jsonb_build_object(
            'id',v.id,'startsAt',v.starts_at,'endsAt',v.ends_at,'status',v.status,
            'appointmentType',v.type_name,'patientName',v.patient_name,
            -- The list name is the surname: the last word of the registry name.
            'patientListName',(regexp_match(v.patient_name,'(\S+)$'))[1])
          order by v.starts_at,v.id)
          from visits v where v.provider_id=p.id and v.day=dy.day),'[]'::jsonb),
        'open',coalesce((select jsonb_agg(jsonb_build_object('startsAt',s.starts_at,'endsAt',s.ends_at,
            'locationId',s.location_id,'locationName',l.name) order by s.starts_at)
          from slots s join locations l on l.id=s.location_id
          where s.provider_id=p.id and s.day=dy.day),'[]'::jsonb),
        'seen',case when dy.day<v_today then (select count(*) from visits v
          where v.provider_id=p.id and v.day=dy.day and v.status in ('checked_in','completed')) end,
        'openCount',case when dy.day>=v_today then (select count(*) from slots s
          where s.provider_id=p.id and s.day=dy.day) end)
        order by dy.day) from days dy))
      order by p.ord) from providers p))
  into v_result;
  return v_result;
end;
$$;

create or replace function public.portal_schedule_day(
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

create or replace function public.portal_schedule_week_provider(p_actor_id uuid)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  v_remembered uuid;
  v_provider uuid;
begin
  if not exists(select 1 from public.staff_profiles where user_id=p_actor_id and active and onboarded_at is not null) then
    return jsonb_build_object('ok',false,'code','unauthorized');
  end if;
  select s.week_provider_id into v_remembered from public.staff_schedule_preferences s
    join public.scheduling_providers p on p.id=s.week_provider_id and p.active
    where s.staff_user_id=p_actor_id;
  v_provider:=coalesce(v_remembered,(select id from public.scheduling_providers
    where active order by lower(name),id limit 1));
  return jsonb_build_object('ok',true,'providerId',v_provider,'remembered',v_remembered is not null);
end;
$$;

create or replace function public.portal_remember_week_provider(p_actor_id uuid, p_provider_id uuid)
returns jsonb language plpgsql volatile security invoker set search_path = '' as $$
begin
  if not exists(select 1 from public.staff_profiles where user_id=p_actor_id and active and onboarded_at is not null) then
    return jsonb_build_object('ok',false,'code','unauthorized');
  end if;
  if p_provider_id is null then return jsonb_build_object('ok',false,'code','invalid_command'); end if;
  if not exists(select 1 from public.scheduling_providers where id=p_provider_id and active) then
    return jsonb_build_object('ok',false,'code','provider_unavailable');
  end if;
  insert into public.staff_schedule_preferences as s (staff_user_id,week_provider_id,updated_at)
    values (p_actor_id,p_provider_id,statement_timestamp())
    on conflict (staff_user_id) do update
      set week_provider_id=excluded.week_provider_id,updated_at=excluded.updated_at;
  return jsonb_build_object('ok',true,'providerId',p_provider_id);
end;
$$;

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

drop function public.portal_office_hours_allow(uuid,integer,integer,integer);
drop function public.portal_settings_hours_valid(jsonb,text[]);
drop function public.portal_scheduling_settings_record(text,uuid);

drop trigger scheduling_providers_default_types on public.scheduling_providers;
drop trigger appointment_types_default_providers on public.appointment_types;
drop function public.portal_default_type_providers_for_provider();
drop function public.portal_default_type_providers_for_type();

drop table public.location_closures;
drop table public.location_hours;
drop table public.appointment_type_providers;

alter table public.provider_time_exceptions drop column reason;
alter table public.scheduling_locations
  drop column street, drop column city, drop column region, drop column postal, drop column maps_query;
alter table public.appointment_types
  drop column sort_order, drop column icon, drop column description, drop column archived_at;
alter table public.scheduling_providers
  drop column credentials, drop column bookable, drop column sort_order;

notify pgrst,'reload schema';
