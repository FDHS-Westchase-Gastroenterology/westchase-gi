-- Reverses 20261006120000_day_appointment_actions: removes the placement read and restores the
-- cancel command without requestOutcome. Close transitions written from booked meanwhile stay as
-- history, so the restored constraint is added not valid, as it was originally.

drop function public.portal_can_place_appointment(uuid,uuid,uuid,uuid,timestamptz);

alter table public.request_transitions
  drop constraint request_transitions_semantic_command_valid,
  add constraint request_transitions_semantic_command_valid check (
    provenance = 'migration'
    or (
      command = 'record_contact_attempt'
      and provenance = 'staff'
      and from_state in ('new', 'contacted')
      and to_state = 'contacted'
      and reason_code in ('reached_follow_up', 'voicemail', 'no_answer')
      and compensates_transition_id is null
      and appointment_at is null
    )
    or (
      command = 'record_contact_and_close'
      and provenance = 'staff'
      and from_state in ('new', 'contacted')
      and to_state = 'closed'
      and reason_code is not null
      and reason_code in ('reached', 'voicemail', 'no_answer')
      and compensates_transition_id is null
      and call_again_at is null
      and appointment_at is null
    )
    or (
      command = 'confirm_booking_handoff'
      and provenance = 'staff'
      and from_state in ('new', 'contacted')
      and to_state = 'booked'
      and reason_code is null
      and compensates_transition_id is null
      and appointment_at is not null
    )
    or (
      command = 'close_request'
      and provenance = 'staff'
      and from_state in ('new', 'contacted')
      and to_state = 'closed'
      and (
        (from_state = 'new' and reason_code = 'not_actionable')
        or (from_state = 'contacted' and reason_code in ('not_actionable', 'wont_schedule'))
      )
      and compensates_transition_id is null
      and appointment_at is null
    )
    or (
      command = 'reopen_request'
      and provenance = 'staff'
      and from_state in ('booked', 'closed')
      and to_state = 'contacted'
      and reason_code is null
      and compensates_transition_id is null
      and call_again_at is not null
      and appointment_at is null
    )
    or (
      command = 'set_call_again'
      and provenance = 'staff'
      and from_state = 'contacted'
      and to_state = 'contacted'
      and reason_code is null
      and compensates_transition_id is null
      and call_again_at is not null
      and appointment_at is null
    )
    or (
      command = 'undo_latest_transition'
      and provenance = 'staff'
      and reason_code is null
      and compensates_transition_id is not null
      and call_again_at is null
      and appointment_at is null
    )
    or (
      command = 'classify_legacy_closure'
      and provenance = 'legacy_review'
      and from_state = 'closed'
      and (
        (to_state = 'booked' and reason_code = 'booked')
        or (to_state = 'closed' and reason_code in ('not_actionable', 'wont_schedule'))
      )
      and compensates_transition_id is null
      and call_again_at is null
      and appointment_at is null
    )
  ) not valid;

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
    -- Settings narrow who can be booked: a provider an admin took off booking, a provider who
    -- does not see the type, and a day the office is closed are refused at booking and rescheduling.
    if v_kind in ('book','reschedule') then
      if not exists(select 1 from public.scheduling_providers where id=v_target.provider_id and bookable) then
        return jsonb_build_object('ok',false,'code','provider_not_bookable');
      end if;
      if not exists(select 1 from public.appointment_type_providers
        where appointment_type_id=v_target.appointment_type_id and provider_id=v_target.provider_id) then
        return jsonb_build_object('ok',false,'code','provider_not_eligible');
      end if;
      if exists(select 1 from public.location_closures where location_id=v_target.location_id
        and closed_on=(v_target.starts_at at time zone 'America/New_York')::date) then
        return jsonb_build_object('ok',false,'code','location_closed');
      end if;
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
revoke execute on function public.portal_execute_appointment_command(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.portal_execute_appointment_command(uuid,uuid,text,jsonb) to service_role;

notify pgrst, 'reload schema';
