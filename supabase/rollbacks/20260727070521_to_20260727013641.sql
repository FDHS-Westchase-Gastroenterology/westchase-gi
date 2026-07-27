-- Manual rollback for 20260727070521_add_audit_provenance_and_recipient_label_update.
-- Run only with the pre-migration application deployment ready. This refuses
-- to discard provenance recorded after the forward migration.

do $$
begin
  if exists (
    select 1
    from public.audit_log
    where source is not null
      or correlation_id is not null
  ) then
    raise exception
      'Rollback blocked: classified audit provenance would be lost'
      using errcode = '55000';
  end if;
end;
$$;

drop function public.portal_update_recipient_label(text, uuid, text);

create or replace function public.portal_add_request_note(
  p_actor_email text,
  p_request_id uuid,
  p_note text,
  p_note_length integer
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_event_id uuid;
begin
  if p_note is null
    or p_note = ''
    or p_note <> pg_catalog.btrim(p_note)
    or p_note_length is null
    or p_note_length not between 1 and 2000
  then
    raise exception 'Notes must be 1-2000 trimmed characters'
      using errcode = '22023';
  end if;

  perform 1
  from public.requests
  where id = p_request_id
  for key share;

  if not found then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;

  insert into public.request_events (
    request_id,
    type,
    status,
    meta
  ) values (
    p_request_id,
    'note',
    'recorded',
    pg_catalog.jsonb_build_object(
      'text', p_note,
      'author_email', p_actor_email
    )
  )
  returning id into v_event_id;

  insert into public.audit_log (
    actor_email,
    action,
    entity,
    entity_id,
    detail
  ) values (
    p_actor_email,
    'request.note',
    'requests',
    p_request_id,
    pg_catalog.jsonb_build_object(
      'length', p_note_length
    )
  );

  return v_event_id;
end;
$$;

create or replace function public.portal_complete_staff_onboarding(
  p_user_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_email text;
begin
  update public.staff_profiles
  set onboarded_at = pg_catalog.now()
  where user_id = p_user_id
    and active
    and onboarded_at is null
  returning id, email into v_profile_id, v_email;

  if not found then
    raise exception 'Active pending staff invitation not found'
      using errcode = 'P0002';
  end if;

  insert into public.audit_log (
    actor_email,
    action,
    entity,
    entity_id,
    detail
  ) values (
    v_email,
    'staff.onboard',
    'staff_profiles',
    v_profile_id,
    pg_catalog.jsonb_build_object('user_id', p_user_id)
  );

  return true;
end;
$$;

create or replace function public.portal_record_staff_password_reset(
  p_user_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_email text;
begin
  select id, email
  into v_profile_id, v_email
  from public.staff_profiles
  where user_id = p_user_id
    and active
    and onboarded_at is not null
  for update;

  if not found then
    raise exception 'Active onboarded staff profile not found'
      using errcode = 'P0002';
  end if;

  insert into public.audit_log (
    actor_email,
    action,
    entity,
    entity_id,
    detail
  ) values (
    v_email,
    'staff.password_reset',
    'staff_profiles',
    v_profile_id,
    pg_catalog.jsonb_build_object('user_id', p_user_id)
  );

  return true;
end;
$$;

create or replace function public.portal_set_staff_tour_dismissed(
  p_user_id uuid,
  p_dismissed boolean
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_email text;
  v_dismissed_at timestamptz;
begin
  if p_dismissed is null then
    raise exception 'Tour dismissal state is required' using errcode = '22023';
  end if;

  select id, email, portal_tour_dismissed_at
  into v_profile_id, v_email, v_dismissed_at
  from public.staff_profiles
  where user_id = p_user_id
    and active
    and onboarded_at is not null
  for update;

  if not found then
    raise exception 'Active onboarded staff profile not found'
      using errcode = 'P0002';
  end if;

  if (p_dismissed and v_dismissed_at is not null)
    or (not p_dismissed and v_dismissed_at is null)
  then
    return false;
  end if;

  update public.staff_profiles
  set portal_tour_dismissed_at = case
    when p_dismissed then pg_catalog.now()
    else null
  end
  where id = v_profile_id;

  insert into public.audit_log (
    actor_email,
    action,
    entity,
    entity_id,
    detail
  ) values (
    v_email,
    case
      when p_dismissed then 'staff.tour_dismiss'
      else 'staff.tour_restart'
    end,
    'staff_profiles',
    v_profile_id,
    pg_catalog.jsonb_build_object('dismissed', p_dismissed)
  );

  return true;
end;
$$;

create or replace function public.portal_update_request_status(
  p_actor_email text,
  p_request_id uuid,
  p_next_status text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_previous_status text;
begin
  if p_next_status not in ('new', 'contacted', 'scheduled', 'closed') then
    raise exception 'Unknown request status' using errcode = '22023';
  end if;

  select status
  into v_previous_status
  from public.requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;

  if v_previous_status = p_next_status then
    return false;
  end if;

  update public.requests
  set
    status = p_next_status,
    closure_disposition = null,
    closed_at = null,
    record_handoff_at = null
  where id = p_request_id;

  insert into public.audit_log (
    actor_email,
    action,
    entity,
    entity_id,
    detail
  ) values (
    p_actor_email,
    'request.status_change',
    'requests',
    p_request_id,
    pg_catalog.jsonb_build_object(
      'from', v_previous_status,
      'to', p_next_status,
      'retention_clock_reset',
        v_previous_status = 'closed' and p_next_status <> 'closed',
      'legacy_unclassified_close', p_next_status = 'closed'
    )
  );

  return true;
end;
$$;

create or replace function public.portal_close_request(
  p_actor_email text,
  p_request_id uuid,
  p_disposition text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_previous_status text;
  v_previous_disposition text;
  v_now timestamptz := statement_timestamp();
begin
  if p_disposition not in ('unconverted', 'converted') then
    raise exception 'Invalid closure disposition' using errcode = '22023';
  end if;

  select status, closure_disposition
  into v_previous_status, v_previous_disposition
  from public.requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;

  if v_previous_status = 'closed'
    and v_previous_disposition = p_disposition
  then
    return false;
  end if;

  update public.requests
  set
    status = 'closed',
    closure_disposition = p_disposition,
    closed_at = v_now,
    record_handoff_at = case
      when p_disposition = 'converted' then v_now
      else null
    end
  where id = p_request_id;

  insert into public.audit_log (
    actor_email,
    action,
    entity,
    entity_id,
    detail
  ) values (
    p_actor_email,
    'request.close',
    'requests',
    p_request_id,
    pg_catalog.jsonb_build_object(
      'from', v_previous_status,
      'previous_disposition', v_previous_disposition,
      'disposition', p_disposition,
      'record_handoff_verified', p_disposition = 'converted'
    )
  );

  return true;
end;
$$;

create or replace function public.portal_set_request_legal_hold(
  p_actor_email text,
  p_request_id uuid,
  p_held boolean,
  p_reason text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_was_held boolean;
  v_reason text := pg_catalog.btrim(p_reason);
begin
  if p_held is null
    or p_reason is null
    or v_reason = ''
    or pg_catalog.char_length(v_reason) > 200
  then
    raise exception 'A 1-200 character legal-hold reason is required'
      using errcode = '22023';
  end if;

  select retention_hold_at is not null
  into v_was_held
  from public.requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;

  if v_was_held = p_held then
    return false;
  end if;

  update public.requests
  set
    retention_hold_at = case when p_held then statement_timestamp() else null end,
    retention_hold_by = case when p_held then p_actor_email else null end,
    retention_hold_reason = case when p_held then v_reason else null end
  where id = p_request_id;

  insert into public.audit_log (
    actor_email,
    action,
    entity,
    entity_id,
    detail
  ) values (
    p_actor_email,
    case
      when p_held then 'request.legal_hold_place'
      else 'request.legal_hold_release'
    end,
    'requests',
    p_request_id,
    pg_catalog.jsonb_build_object(
      'held', p_held,
      'reason', v_reason
    )
  );

  return true;
end;
$$;

create or replace function public.portal_delete_request_early(
  p_actor_email text,
  p_request_id uuid,
  p_authorization_ref text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_disposition text;
  v_held boolean;
begin
  if p_authorization_ref is null
    or p_authorization_ref !~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{0,119}$'
  then
    raise exception 'A non-PHI authorization reference is required'
      using errcode = '22023';
  end if;

  select closure_disposition, retention_hold_at is not null
  into v_disposition, v_held
  from public.requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;

  if v_held then
    raise exception 'Request is under legal hold' using errcode = '55000';
  end if;

  insert into public.audit_log (
    actor_email,
    action,
    entity,
    entity_id,
    detail
  ) values (
    p_actor_email,
    'request.authorized_delete',
    'requests',
    p_request_id,
    pg_catalog.jsonb_build_object(
      'authorization_ref', p_authorization_ref,
      'disposition', v_disposition
    )
  );

  delete from public.requests
  where id = p_request_id;

  return true;
end;
$$;

create or replace function public.portal_run_data_lifecycle(
  p_actor_email text,
  p_now timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_receipt_secrets integer;
  v_rate_limits integer;
  v_requests integer;
  v_audits integer;
begin
  if p_actor_email is null
    or pg_catalog.btrim(p_actor_email) = ''
    or p_now is null
    or p_now < statement_timestamp() - interval '5 minutes'
    or p_now > statement_timestamp() + interval '5 minutes'
  then
    raise exception 'Lifecycle actor and a current clock are required'
      using errcode = '22023';
  end if;

  -- ponytail: one runner avoids cross-batch lock-order deadlocks; split into
  -- multiple workers only if measured lifecycle volume ever requires it.
  perform pg_catalog.pg_advisory_xact_lock(20260725, 170000);

  update public.request_events
  set
    status = case when status = 'issued' then 'expired' else status end,
    meta = meta - 'token_hash'
  where type = 'receipt'
    and created_at <= p_now - interval '1 hour'
    and meta ? 'token_hash';
  get diagnostics v_receipt_secrets = row_count;

  delete from private.intake_rate_limits
  where expires_at <= p_now;
  get diagnostics v_rate_limits = row_count;

  with eligible as materialized (
    select
      id,
      closure_disposition,
      closed_at,
      record_handoff_at
    from public.requests
    where status = 'closed'
      and retention_hold_at is null
      and (
        (
          closure_disposition = 'unconverted'
          and closed_at <= p_now - interval '180 days'
        )
        or (
          closure_disposition = 'converted'
          and record_handoff_at is not null
          and greatest(closed_at, record_handoff_at)
            <= p_now - interval '1 year'
        )
      )
    for update skip locked
  ),
  logged as (
    insert into public.audit_log (
      actor_email,
      action,
      entity,
      entity_id,
      detail
    )
    select
      p_actor_email,
      'request.retention_delete',
      'requests',
      eligible.id,
      pg_catalog.jsonb_build_object(
        'policy', 'balanced_v1',
        'disposition', eligible.closure_disposition,
        'closed_at', eligible.closed_at,
        'record_handoff_at', eligible.record_handoff_at
      )
    from eligible
    returning entity_id
  ),
  deleted as (
    delete from public.requests as request
    using logged
    where request.id = logged.entity_id
    returning request.id
  )
  select pg_catalog.count(*)::integer
  into v_requests
  from deleted;

  with request_audit_state as materialized (
    select
      audit.id as audit_id,
      request.retention_hold_at
    from public.audit_log as audit
    join public.requests as request
      on audit.entity = 'requests'
      and request.id = audit.entity_id
    where audit.at <= p_now - interval '6 years'
    for update of request
  )
  delete from public.audit_log as audit
  where audit.at <= p_now - interval '6 years'
    and (
      audit.entity <> 'requests'
      or not exists (
        select 1
        from public.requests as request
        where request.id = audit.entity_id
      )
      or exists (
        select 1
        from request_audit_state as state
        where state.audit_id = audit.id
          and state.retention_hold_at is null
      )
    );
  get diagnostics v_audits = row_count;

  if v_audits > 0 then
    insert into public.audit_log (
      actor_email,
      action,
      entity,
      entity_id,
      detail
    ) values (
      p_actor_email,
      'audit.retention_delete',
      'audit_log',
      null,
      pg_catalog.jsonb_build_object(
        'policy', 'balanced_v1',
        'deleted_count', v_audits,
        'cutoff', p_now - interval '6 years'
      )
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'receipt_secrets_removed', v_receipt_secrets,
    'rate_limits_removed', v_rate_limits,
    'requests_removed', v_requests,
    'audits_removed', v_audits
  );
end;
$$;

create or replace function public.portal_log_call_outcome(
  p_actor_email text,
  p_request_id uuid,
  p_outcome text,
  p_note text default null,
  p_follow_up_at timestamptz default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_previous_status text;
  v_previous_disposition text;
  v_next_status text;
  v_next_disposition text;
  v_now timestamptz := statement_timestamp();
  v_event_id uuid;
  v_note_length integer;
begin
  if p_outcome is null
    or p_outcome not in (
      'scheduled_transferred',
      'reached_follow_up',
      'voicemail',
      'no_answer',
      'wont_schedule',
      'not_actionable'
    )
  then
    raise exception 'Unknown call outcome' using errcode = '22023';
  end if;

  if p_follow_up_at is not null
    and p_outcome in (
      'scheduled_transferred',
      'wont_schedule',
      'not_actionable'
    )
  then
    raise exception 'Closing outcomes cannot have a follow-up time'
      using errcode = '22023';
  end if;

  if p_note is not null then
    v_note_length := pg_catalog.char_length(p_note);
    if p_note = ''
      or p_note <> pg_catalog.btrim(p_note)
      or v_note_length not between 1 and 2000
    then
      raise exception 'Notes must be 1-2000 trimmed characters'
        using errcode = '22023';
    end if;
  end if;

  select status, closure_disposition
  into v_previous_status, v_previous_disposition
  from public.requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;

  v_next_status := case
    when p_outcome in (
      'scheduled_transferred',
      'wont_schedule',
      'not_actionable'
    ) then 'closed'
    else 'contacted'
  end;
  v_next_disposition := case
    when p_outcome = 'scheduled_transferred' then 'converted'
    when p_outcome in ('wont_schedule', 'not_actionable') then 'unconverted'
    else null
  end;

  update public.requests
  set
    status = v_next_status,
    follow_up_at = case
      when v_next_status = 'contacted' then p_follow_up_at
      else null
    end,
    closure_disposition = v_next_disposition,
    closed_at = case when v_next_status = 'closed' then v_now else null end,
    record_handoff_at = case
      when v_next_disposition = 'converted' then v_now
      else null
    end
  where id = p_request_id;

  insert into public.request_events (
    request_id,
    type,
    status,
    meta
  ) values (
    p_request_id,
    'call_outcome',
    'recorded',
    pg_catalog.jsonb_strip_nulls(
      pg_catalog.jsonb_build_object(
        'outcome', p_outcome,
        'author_email', p_actor_email,
        'follow_up_at', p_follow_up_at
      )
    )
  )
  returning id into v_event_id;

  if p_note is not null then
    insert into public.request_events (
      request_id,
      type,
      status,
      meta
    ) values (
      p_request_id,
      'note',
      'recorded',
      pg_catalog.jsonb_build_object(
        'text', p_note,
        'author_email', p_actor_email
      )
    );
  end if;

  insert into public.audit_log (
    actor_email,
    action,
    entity,
    entity_id,
    detail
  ) values (
    p_actor_email,
    'request.call_outcome',
    'requests',
    p_request_id,
    pg_catalog.jsonb_strip_nulls(
      pg_catalog.jsonb_build_object(
        'outcome', p_outcome,
        'from', v_previous_status,
        'to', v_next_status,
        'previous_disposition', v_previous_disposition,
        'disposition', v_next_disposition,
        'note_attached', p_note is not null,
        'note_length', v_note_length,
        'follow_up_at', p_follow_up_at,
        'retention_clock_reset',
          v_previous_status = 'closed' and v_next_status <> 'closed',
        'record_handoff_verified', v_next_disposition = 'converted'
      )
    )
  );

  return v_event_id;
end;
$$;

alter table public.audit_log
  drop constraint audit_log_source_valid,
  drop column correlation_id,
  drop column source;
