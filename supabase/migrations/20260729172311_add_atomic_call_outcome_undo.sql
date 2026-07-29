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
  v_previous_follow_up_at timestamptz;
  v_previous_disposition text;
  v_previous_closed_at timestamptz;
  v_previous_record_handoff_at timestamptz;
  v_next_status text;
  v_next_follow_up_at timestamptz;
  v_next_disposition text;
  v_next_closed_at timestamptz;
  v_next_record_handoff_at timestamptz;
  v_now timestamptz := pg_catalog.statement_timestamp();
  v_event_id uuid;
  v_note_length integer;
  v_sequence bigint;
begin
  if p_outcome is null
    or p_outcome not in (
      'booked',
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
      'booked',
      'scheduled_transferred',
      'wont_schedule',
      'not_actionable'
    )
  then
    raise exception 'This outcome cannot have a follow-up time'
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

  select
    status,
    follow_up_at,
    closure_disposition,
    closed_at,
    record_handoff_at
  into
    v_previous_status,
    v_previous_follow_up_at,
    v_previous_disposition,
    v_previous_closed_at,
    v_previous_record_handoff_at
  from public.requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;

  select
    coalesce(
      pg_catalog.max(
        (meta #>> '{lifecycle,sequence}')::bigint
      ),
      0::bigint
    ) + 1
  into v_sequence
  from public.request_events
  where request_id = p_request_id
    and type = 'call_outcome'
    and pg_catalog.jsonb_typeof(meta #> '{lifecycle,sequence}') = 'number'
    and meta #>> '{lifecycle,sequence}' ~ '^[0-9]+$';

  v_next_status := case
    when p_outcome = 'booked' then 'scheduled'
    when p_outcome in (
      'scheduled_transferred',
      'wont_schedule',
      'not_actionable'
    ) then 'closed'
    else 'contacted'
  end;
  v_next_follow_up_at := case
    when v_next_status = 'contacted' then p_follow_up_at
    else null
  end;
  v_next_disposition := case
    when p_outcome = 'scheduled_transferred' then 'converted'
    when p_outcome in ('wont_schedule', 'not_actionable') then 'unconverted'
    else null
  end;
  v_next_closed_at := case
    when v_next_status = 'closed' then v_now
    else null
  end;
  v_next_record_handoff_at := case
    when v_next_disposition = 'converted' then v_now
    else null
  end;

  update public.requests
  set
    status = v_next_status,
    follow_up_at = v_next_follow_up_at,
    closure_disposition = v_next_disposition,
    closed_at = v_next_closed_at,
    record_handoff_at = v_next_record_handoff_at
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
    pg_catalog.jsonb_build_object(
      'outcome', p_outcome,
      'author_email', p_actor_email,
      'lifecycle', pg_catalog.jsonb_build_object(
        'version', 1,
        'sequence', v_sequence,
        'before', pg_catalog.jsonb_build_object(
          'status', v_previous_status,
          'follow_up_at', v_previous_follow_up_at,
          'closure_disposition', v_previous_disposition,
          'closed_at', v_previous_closed_at,
          'record_handoff_at', v_previous_record_handoff_at
        ),
        'after', pg_catalog.jsonb_build_object(
          'status', v_next_status,
          'follow_up_at', v_next_follow_up_at,
          'closure_disposition', v_next_disposition,
          'closed_at', v_next_closed_at,
          'record_handoff_at', v_next_record_handoff_at
        )
      )
    ) || case
      when p_follow_up_at is not null
        then pg_catalog.jsonb_build_object('follow_up_at', p_follow_up_at)
      else '{}'::jsonb
    end
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
    source,
    correlation_id,
    detail
  ) values (
    p_actor_email,
    'request.call_outcome',
    'requests',
    p_request_id,
    'staff',
    pg_catalog.gen_random_uuid(),
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

create function public.portal_undo_call_outcome(
  p_actor_email text,
  p_request_id uuid,
  p_event_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current_status text;
  v_current_follow_up_at timestamptz;
  v_current_disposition text;
  v_current_closed_at timestamptz;
  v_current_record_handoff_at timestamptz;
  v_event_request_id uuid;
  v_event_type text;
  v_event_status text;
  v_event_meta jsonb;
  v_lifecycle jsonb;
  v_before jsonb;
  v_after jsonb;
  v_outcome text;
  v_sequence bigint;
  v_before_status text;
  v_before_follow_up_at timestamptz;
  v_before_disposition text;
  v_before_closed_at timestamptz;
  v_before_record_handoff_at timestamptz;
  v_after_status text;
  v_after_follow_up_at timestamptz;
  v_after_disposition text;
  v_after_closed_at timestamptz;
  v_after_record_handoff_at timestamptz;
  v_undo_event_id uuid;
  v_correlation_id uuid := pg_catalog.gen_random_uuid();
begin
  if p_actor_email is null
    or pg_catalog.btrim(p_actor_email) = ''
    or p_request_id is null
    or p_event_id is null
  then
    raise exception 'Actor, request, and outcome event are required'
      using errcode = '22023';
  end if;

  select
    status,
    follow_up_at,
    closure_disposition,
    closed_at,
    record_handoff_at
  into
    v_current_status,
    v_current_follow_up_at,
    v_current_disposition,
    v_current_closed_at,
    v_current_record_handoff_at
  from public.requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;

  select request_id, type, status, meta
  into v_event_request_id, v_event_type, v_event_status, v_event_meta
  from public.request_events
  where id = p_event_id
  for update;

  if not found
    or v_event_request_id <> p_request_id
    or v_event_type <> 'call_outcome'
  then
    raise exception 'Outcome event not found' using errcode = 'P0002';
  end if;

  if v_event_status <> 'recorded' then
    raise exception 'Outcome save is no longer undoable' using errcode = '55000';
  end if;

  v_outcome := v_event_meta ->> 'outcome';
  v_lifecycle := v_event_meta -> 'lifecycle';
  v_before := v_lifecycle -> 'before';
  v_after := v_lifecycle -> 'after';

  if v_outcome is null
    or v_outcome not in (
      'booked',
      'scheduled_transferred',
      'reached_follow_up',
      'voicemail',
      'no_answer',
      'wont_schedule',
      'not_actionable'
    )
    or pg_catalog.jsonb_typeof(v_lifecycle) <> 'object'
    or v_lifecycle ->> 'version' <> '1'
    or pg_catalog.jsonb_typeof(v_lifecycle -> 'sequence') <> 'number'
    or v_lifecycle ->> 'sequence' !~ '^[0-9]+$'
    or pg_catalog.jsonb_typeof(v_before) <> 'object'
    or pg_catalog.jsonb_typeof(v_after) <> 'object'
    or not v_before ?& array[
      'status',
      'follow_up_at',
      'closure_disposition',
      'closed_at',
      'record_handoff_at'
    ]
    or not v_after ?& array[
      'status',
      'follow_up_at',
      'closure_disposition',
      'closed_at',
      'record_handoff_at'
    ]
    or v_before ->> 'status' not in (
      'new',
      'contacted',
      'scheduled',
      'closed'
    )
    or v_after ->> 'status' not in (
      'new',
      'contacted',
      'scheduled',
      'closed'
    )
    or pg_catalog.jsonb_typeof(v_before -> 'status') <> 'string'
    or pg_catalog.jsonb_typeof(v_after -> 'status') <> 'string'
    or pg_catalog.jsonb_typeof(v_before -> 'follow_up_at')
      not in ('null', 'string')
    or pg_catalog.jsonb_typeof(v_before -> 'closure_disposition')
      not in ('null', 'string')
    or pg_catalog.jsonb_typeof(v_before -> 'closed_at')
      not in ('null', 'string')
    or pg_catalog.jsonb_typeof(v_before -> 'record_handoff_at')
      not in ('null', 'string')
    or pg_catalog.jsonb_typeof(v_after -> 'follow_up_at')
      not in ('null', 'string')
    or pg_catalog.jsonb_typeof(v_after -> 'closure_disposition')
      not in ('null', 'string')
    or pg_catalog.jsonb_typeof(v_after -> 'closed_at')
      not in ('null', 'string')
    or pg_catalog.jsonb_typeof(v_after -> 'record_handoff_at')
      not in ('null', 'string')
    or (
      v_before ->> 'closure_disposition' is not null
      and v_before ->> 'closure_disposition' not in ('converted', 'unconverted')
    )
    or (
      v_after ->> 'closure_disposition' is not null
      and v_after ->> 'closure_disposition' not in ('converted', 'unconverted')
    )
  then
    raise exception 'Outcome event has an invalid lifecycle snapshot'
      using errcode = '22023';
  end if;

  begin
    v_sequence := (v_lifecycle ->> 'sequence')::bigint;
    v_before_status := v_before ->> 'status';
    v_before_follow_up_at := (v_before ->> 'follow_up_at')::timestamptz;
    v_before_disposition := v_before ->> 'closure_disposition';
    v_before_closed_at := (v_before ->> 'closed_at')::timestamptz;
    v_before_record_handoff_at :=
      (v_before ->> 'record_handoff_at')::timestamptz;
    v_after_status := v_after ->> 'status';
    v_after_follow_up_at := (v_after ->> 'follow_up_at')::timestamptz;
    v_after_disposition := v_after ->> 'closure_disposition';
    v_after_closed_at := (v_after ->> 'closed_at')::timestamptz;
    v_after_record_handoff_at :=
      (v_after ->> 'record_handoff_at')::timestamptz;
  exception
    when invalid_text_representation
      or numeric_value_out_of_range
      or invalid_datetime_format
      or datetime_field_overflow
    then
      raise exception 'Outcome event has an invalid lifecycle snapshot'
        using errcode = '22023';
  end;

  if exists (
    select 1
    from public.request_events as later_event
    where later_event.request_id = p_request_id
      and later_event.type = 'call_outcome'
      and later_event.status = 'recorded'
      and later_event.id <> p_event_id
      and pg_catalog.jsonb_typeof(
        later_event.meta #> '{lifecycle,sequence}'
      ) = 'number'
      and later_event.meta #>> '{lifecycle,sequence}' ~ '^[0-9]+$'
      and (
        later_event.meta #>> '{lifecycle,sequence}'
      )::bigint >= v_sequence
  ) then
    raise exception 'A later outcome save supersedes this undo'
      using errcode = '55000';
  end if;

  if v_current_status is distinct from v_after_status
    or v_current_follow_up_at is distinct from v_after_follow_up_at
    or v_current_disposition is distinct from v_after_disposition
    or v_current_closed_at is distinct from v_after_closed_at
    or v_current_record_handoff_at
      is distinct from v_after_record_handoff_at
  then
    raise exception 'The request lifecycle has changed since this save'
      using errcode = '55000';
  end if;

  update public.requests
  set
    status = v_before_status,
    follow_up_at = v_before_follow_up_at,
    closure_disposition = v_before_disposition,
    closed_at = v_before_closed_at,
    record_handoff_at = v_before_record_handoff_at
  where id = p_request_id;

  update public.request_events
  set status = 'undone'
  where id = p_event_id
    and status = 'recorded';

  if not found then
    raise exception 'Outcome save is no longer undoable' using errcode = '55000';
  end if;

  insert into public.request_events (
    request_id,
    type,
    status,
    meta
  ) values (
    p_request_id,
    'call_outcome_undo',
    'recorded',
    pg_catalog.jsonb_build_object(
      'target_event_id', p_event_id,
      'outcome', v_outcome,
      'author_email', p_actor_email,
      'restored_status', v_before_status
    )
  )
  returning id into v_undo_event_id;

  insert into public.audit_log (
    actor_email,
    action,
    entity,
    entity_id,
    source,
    correlation_id,
    detail
  ) values (
    p_actor_email,
    'request.call_outcome_undo',
    'requests',
    p_request_id,
    'staff',
    v_correlation_id,
    pg_catalog.jsonb_build_object(
      'target_event_id', p_event_id,
      'undo_event_id', v_undo_event_id,
      'outcome', v_outcome,
      'from', v_after_status,
      'to', v_before_status,
      'restored_lifecycle', pg_catalog.jsonb_build_object(
        'status', v_before_status,
        'follow_up_at', v_before_follow_up_at,
        'closure_disposition', v_before_disposition,
        'closed_at', v_before_closed_at,
        'record_handoff_at', v_before_record_handoff_at
      )
    )
  );

  return pg_catalog.jsonb_build_object('status', v_before_status);
end;
$$;

revoke execute on function public.portal_log_call_outcome(
  text,
  uuid,
  text,
  text,
  timestamptz
)
from public, anon, authenticated;

grant execute on function public.portal_log_call_outcome(
  text,
  uuid,
  text,
  text,
  timestamptz
)
to service_role;

revoke execute on function public.portal_undo_call_outcome(text, uuid, uuid)
from public, anon, authenticated;

grant execute on function public.portal_undo_call_outcome(text, uuid, uuid)
to service_role;
