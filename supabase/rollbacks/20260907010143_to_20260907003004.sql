-- Reverting is allowed only before any coordinated request/appointment history exists.
do $$ begin
  if exists(select 1 from public.appointments where request_workflow_managed)
    or exists(select 1 from public.scheduling_changes where request_before is not null) then
    raise exception 'Coordinated appointments require a reviewed data-preserving rollback';
  end if;
end $$;
drop trigger requests_appointment_consistent on public.requests;
drop trigger appointments_request_consistent on public.appointments;
drop function public.portal_check_request_appointment();
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
create or replace function public.portal_read_appointment(
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
create or replace function public.portal_preserve_appointment_patient() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.patient_id <> old.patient_id then
    raise exception 'An appointment cannot change patients' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger appointments_preserve_patient on public.appointments;
create trigger appointments_preserve_patient before update of patient_id on public.appointments
  for each row execute function public.portal_preserve_appointment_patient();
drop function public.portal_execute_request_command(text,uuid,bigint,uuid,text,jsonb,text,uuid);
alter function public.portal_apply_request_command(text,uuid,bigint,uuid,text,jsonb,text,uuid)
  rename to portal_execute_request_command;
alter table public.scheduling_changes drop constraint scheduling_request_snapshot_check,
  drop column request_id,drop column request_before,drop column request_after_version,drop column request_transition_id;
alter table public.appointments drop column request_workflow_managed;
notify pgrst,'reload schema';
