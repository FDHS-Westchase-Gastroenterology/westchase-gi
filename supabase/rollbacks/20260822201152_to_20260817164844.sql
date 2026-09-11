-- Rollback for 20260822201152_queue_integrity_call_again_authority.sql.
-- Keep the additive transition vocabulary and call_again_at evidence in place:
-- dropping either would destroy append-only, non-PHI evidence for already accepted
-- reopen/set-call-again transitions. Remove only the new conditional constraint so
-- the restored callable interface can again write its prior reopen shape, while
-- refusing the retired command.

alter table public.request_transitions
  drop constraint request_transitions_call_again_at_valid;

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
  r public.requests%rowtype;
  ns text;
  nf timestamptz;
  nr text;
  now_at timestamptz := pg_catalog.statement_timestamp();
  event_id uuid;
  note_length integer;
  seq bigint;
begin
  if p_outcome is null or p_outcome not in (
    'booked', 'scheduled_transferred', 'reached_follow_up', 'voicemail',
    'no_answer', 'wont_schedule', 'not_actionable'
  ) then
    raise exception 'Unknown call outcome' using errcode = '22023';
  end if;
  if p_follow_up_at is not null
    and p_outcome in ('booked', 'scheduled_transferred', 'wont_schedule', 'not_actionable')
  then
    raise exception 'This outcome cannot have a follow-up time' using errcode = '22023';
  end if;
  if p_note is not null then
    note_length := pg_catalog.char_length(p_note);
    if p_note = '' or p_note <> pg_catalog.btrim(p_note) or note_length not between 1 and 2000 then
      raise exception 'Notes must be 1-2000 trimmed characters' using errcode = '22023';
    end if;
  end if;
  select * into r from public.requests where id = p_request_id for update;
  if not found then raise exception 'Request not found' using errcode = 'P0002'; end if;
  select coalesce(pg_catalog.max((meta #>> '{lifecycle,sequence}')::bigint), 0) + 1
    into seq
    from public.request_events
    where request_id = p_request_id
      and type = 'call_outcome'
      and pg_catalog.jsonb_typeof(meta #> '{lifecycle,sequence}') = 'number'
      and meta #>> '{lifecycle,sequence}' ~ '^[0-9]+$';
  ns := case
    when p_outcome in ('booked', 'scheduled_transferred') then 'booked'
    when p_outcome in ('wont_schedule', 'not_actionable') then 'closed'
    else 'contacted'
  end;
  nf := case when ns = 'contacted' then p_follow_up_at end;
  nr := case when p_outcome in ('wont_schedule', 'not_actionable') then p_outcome end;
  update public.requests
  set status = ns,
      version = version + 1,
      follow_up_at = nf,
      closure_disposition = null,
      closed_at = case when ns = 'closed' then now_at end,
      record_handoff_at = case when ns = 'booked' then now_at end,
      closure_reason = nr,
      closure_provenance = null,
      legacy_review_required = false
  where id = p_request_id;
  insert into public.request_events(request_id, type, status, meta)
  values (
    p_request_id,
    'call_outcome',
    'recorded',
    pg_catalog.jsonb_build_object(
      'outcome', p_outcome,
      'author_email', p_actor_email,
      'lifecycle', pg_catalog.jsonb_build_object(
        'version', 1,
        'sequence', seq,
        'before', pg_catalog.jsonb_build_object(
          'status', r.status,
          'follow_up_at', r.follow_up_at,
          'closure_disposition', r.closure_disposition,
          'closed_at', r.closed_at,
          'record_handoff_at', r.record_handoff_at,
          'closure_reason', r.closure_reason,
          'closure_provenance', r.closure_provenance,
          'legacy_review_required', r.legacy_review_required
        ),
        'after', pg_catalog.jsonb_build_object(
          'status', ns,
          'follow_up_at', nf,
          'closure_disposition', null,
          'closed_at', case when ns = 'closed' then now_at end,
          'record_handoff_at', case when ns = 'booked' then now_at end,
          'closure_reason', nr,
          'closure_provenance', null,
          'legacy_review_required', false
        )
      )
    ) || case
      when p_follow_up_at is not null then pg_catalog.jsonb_build_object('follow_up_at', p_follow_up_at)
      else '{}'::jsonb
    end
  ) returning id into event_id;
  if p_note is not null then
    insert into public.request_events(request_id, type, status, meta)
    values (p_request_id, 'note', 'recorded', pg_catalog.jsonb_build_object('text', p_note, 'author_email', p_actor_email));
  end if;
  insert into public.audit_log(actor_email, action, entity, entity_id, source, correlation_id, detail)
  values (
    p_actor_email,
    'request.call_outcome',
    'requests',
    p_request_id,
    'staff',
    pg_catalog.gen_random_uuid(),
    pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
      'outcome', p_outcome,
      'from', r.status,
      'to', ns,
      'previous_disposition', r.closure_disposition,
      'disposition', null,
      'note_attached', p_note is not null,
      'note_length', note_length,
      'follow_up_at', p_follow_up_at,
      'retention_clock_reset', r.status = 'closed' and ns <> 'closed',
      'record_handoff_verified', ns = 'booked'
    ))
  );
  return event_id;
end;
$$;

create or replace function public.portal_execute_request_command(
  p_actor_email text,
  p_request_id uuid,
  p_expected_version bigint,
  p_idempotency_key uuid,
  p_fingerprint text,
  p_decision jsonb,
  p_note text default null,
  p_transition_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v public.requests%rowtype;
  r public.request_command_receipts%rowtype;
  t public.request_transitions%rowtype;
  n jsonb;
  cmd text := p_decision ->> 'command';
  now_at timestamptz := (p_decision ->> 'occurredAt')::timestamptz;
begin
  select * into r
  from public.request_command_receipts
  where request_id = p_request_id and idempotency_key = p_idempotency_key;
  if found then
    return case
      when r.fingerprint = p_fingerprint then r.result
      else '{"ok":false,"code":"idempotency_conflict"}'::jsonb
    end;
  end if;
  if cmd = 'set_call_again' then
    return '{"ok":false,"code":"invalid_command"}'::jsonb;
  end if;
  select * into v from public.requests where id = p_request_id for update;
  if not found then return '{"ok":false,"code":"not_found"}'::jsonb; end if;
  if v.version <> p_expected_version then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'stale_version',
      'current', pg_catalog.jsonb_build_object('state', v.status, 'version', v.version)
    );
  end if;
  if cmd = 'undo_latest_transition' then
    select * into t
    from public.request_transitions
    where id = p_transition_id and request_id = p_request_id;
    if not found
      or t.resulting_version <> v.version
      or t.occurred_at + interval '15 minutes' < now_at
      or t.id <> (
        select id from public.request_transitions
        where request_id = p_request_id
        order by resulting_version desc
        limit 1
      )
      or t.command in ('undo_latest_transition', 'classify_legacy_closure')
    then
      return '{"ok":false,"code":"undo_unavailable"}'::jsonb;
    end if;
  end if;
  update public.requests
  set status = p_decision ->> 'state',
      version = version + 1,
      follow_up_at = (p_decision ->> 'callAgainAt')::timestamptz,
      record_handoff_at = (p_decision ->> 'bookingConfirmedAt')::timestamptz,
      closed_at = (p_decision ->> 'closedAt')::timestamptz,
      closure_reason = p_decision ->> 'closureReason',
      legacy_review_required = (p_decision ->> 'legacyReviewRequired')::boolean
  where id = p_request_id and version = p_expected_version;
  if not found then raise exception 'workflow stale write' using errcode = '40001'; end if;
  if cmd = 'record_contact_attempt' then
    insert into public.request_events(request_id, type, status, meta)
    values (
      p_request_id,
      'contact_attempt',
      'recorded',
      pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
        'outcome', p_decision ->> 'reasonCode',
        'author_email', p_actor_email,
        'follow_up_at', p_decision ->> 'callAgainAt'
      ))
    );
  end if;
  if p_note is not null then
    insert into public.request_events(request_id, type, status, meta)
    values (p_request_id, 'note', 'recorded', pg_catalog.jsonb_build_object('text', p_note, 'author_email', p_actor_email));
  end if;
  insert into public.request_transitions(
    request_id,
    from_state,
    to_state,
    command,
    actor_email,
    resulting_version,
    idempotency_key,
    occurred_at,
    reason_code,
    compensates_transition_id,
    provenance,
    prior_snapshot
  ) values (
    p_request_id,
    v.status,
    p_decision ->> 'state',
    cmd,
    p_actor_email,
    v.version + 1,
    p_idempotency_key,
    now_at,
    p_decision ->> 'reasonCode',
    case when cmd = 'undo_latest_transition' then p_transition_id end,
    case when cmd = 'classify_legacy_closure' then 'legacy_review' else 'staff' end,
    pg_catalog.jsonb_build_object(
      'state', v.status,
      'callAgainAt', v.follow_up_at,
      'bookingConfirmedAt', v.record_handoff_at,
      'closedAt', v.closed_at,
      'closureReason', v.closure_reason,
      'legacyReviewRequired', v.legacy_review_required
    )
  );
  insert into public.audit_log(actor_email, action, entity, entity_id, source, correlation_id, detail)
  values (
    p_actor_email,
    'request.workflow_command',
    'requests',
    p_request_id,
    'staff',
    pg_catalog.gen_random_uuid(),
    pg_catalog.jsonb_build_object(
      'command', cmd,
      'from', v.status,
      'to', p_decision ->> 'state',
      'resulting_version', v.version + 1
    )
  );
  n := pg_catalog.jsonb_build_object(
    'ok', true,
    'state', p_decision ->> 'state',
    'version', v.version + 1,
    'callAgainAt', p_decision -> 'callAgainAt',
    'undo', case
      when cmd in ('undo_latest_transition', 'classify_legacy_closure') then null
      else pg_catalog.jsonb_build_object(
        'transitionId', (
          select id from public.request_transitions
          where request_id = p_request_id and resulting_version = v.version + 1
        ),
        'command', cmd,
        'occurredAt', now_at,
        'expiresAt', now_at + interval '15 minutes'
      )
    end
  );
  insert into public.request_command_receipts(request_id, idempotency_key, fingerprint, result)
  values (p_request_id, p_idempotency_key, p_fingerprint, n);
  return n;
end;
$$;
