-- Manual rollback for 20260729172311_add_atomic_call_outcome_undo.
-- Existing outcome and undo history remains intact; only the undo RPC and
-- upgraded outcome implementation are reverted.

drop function public.portal_undo_call_outcome(text, uuid, uuid);

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
