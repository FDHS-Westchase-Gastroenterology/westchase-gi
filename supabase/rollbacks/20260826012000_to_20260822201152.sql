-- Rollback for 20260826012000_add_appointment_calendar.sql.
--
-- Keep both appointment_at columns. requests.appointment_at holds staff-entered
-- calendar truth and request_transitions.appointment_at is append-only, non-PHI
-- transition evidence for bookings that were already accepted; dropping either
-- would destroy a record the practice entered deliberately. Remove only the
-- conditional constraint, then restore the prior callable interface, which
-- ignores the column entirely and leaves existing values untouched.
--
-- After this runs, confirm_booking_handoff again accepts a booking with no
-- appointment time. That is the behaviour this rollback returns to.

alter table public.requests
  drop constraint requests_appointment_at_valid;

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
  cmd text;
  now_at timestamptz;
  next_state text;
  next_call_again_at timestamptz;
  next_booking_confirmed_at timestamptz;
  next_closed_at timestamptz;
  next_closure_reason text;
  next_closure_disposition text;
  next_closure_provenance text;
  next_legacy_review_required boolean;
  next_reason_code text;
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
  if p_decision is null or pg_catalog.jsonb_typeof(p_decision) <> 'object' then
    return '{"ok":false,"code":"invalid_command"}'::jsonb;
  end if;
  cmd := p_decision ->> 'command';
  begin
    now_at := (p_decision ->> 'occurredAt')::timestamptz;
  exception when others then
    return '{"ok":false,"code":"invalid_command"}'::jsonb;
  end;
  if cmd is null or now_at is null then
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
    if pg_catalog.jsonb_typeof(t.prior_snapshot) <> 'object'
      or not (t.prior_snapshot ?& array[
        'state', 'callAgainAt', 'bookingConfirmedAt', 'closedAt', 'closureReason',
        'legacyReviewRequired'
      ])
    then
      return '{"ok":false,"code":"undo_unavailable"}'::jsonb;
    end if;
    begin
      next_state := t.prior_snapshot ->> 'state';
      next_call_again_at := (t.prior_snapshot ->> 'callAgainAt')::timestamptz;
      next_booking_confirmed_at := (t.prior_snapshot ->> 'bookingConfirmedAt')::timestamptz;
      next_closed_at := (t.prior_snapshot ->> 'closedAt')::timestamptz;
      next_closure_reason := t.prior_snapshot ->> 'closureReason';
      next_closure_disposition := t.prior_snapshot ->> 'closureDisposition';
      next_closure_provenance := t.prior_snapshot ->> 'closureProvenance';
      next_legacy_review_required := (t.prior_snapshot ->> 'legacyReviewRequired')::boolean;
    exception when others then
      return '{"ok":false,"code":"undo_unavailable"}'::jsonb;
    end;
    if next_state not in ('new', 'contacted', 'booked', 'closed')
      or next_legacy_review_required is null
      or (next_state = 'new' and (
        next_call_again_at is not null or next_booking_confirmed_at is not null
        or next_closed_at is not null or next_closure_reason is not null
        or next_legacy_review_required
      ))
      or (next_state = 'contacted' and (
        next_booking_confirmed_at is not null or next_closed_at is not null
        or next_closure_reason is not null or next_legacy_review_required
      ))
      or (next_state = 'booked' and (
        next_call_again_at is not null or next_booking_confirmed_at is null
        or next_closed_at is not null or next_closure_reason is not null
        or next_legacy_review_required
      ))
      or (next_state = 'closed' and (
        next_call_again_at is not null or next_booking_confirmed_at is not null
        or (next_legacy_review_required and (
          next_closed_at is not null or next_closure_reason is not null
        ))
        or (not next_legacy_review_required and (
          next_closed_at is null
          or (
            next_closure_reason is null
            and next_closure_provenance is distinct from 'migration_unconverted'
          )
          or next_closure_reason not in ('not_actionable', 'wont_schedule')
        ))
      ))
    then
      return '{"ok":false,"code":"undo_unavailable"}'::jsonb;
    end if;
    next_reason_code := null;
  else
    begin
      next_state := p_decision ->> 'state';
      next_call_again_at := (p_decision ->> 'callAgainAt')::timestamptz;
      next_booking_confirmed_at := (p_decision ->> 'bookingConfirmedAt')::timestamptz;
      next_closed_at := (p_decision ->> 'closedAt')::timestamptz;
      next_closure_reason := p_decision ->> 'closureReason';
      next_closure_disposition := null;
      next_legacy_review_required := (p_decision ->> 'legacyReviewRequired')::boolean;
      next_reason_code := p_decision ->> 'reasonCode';
    exception when others then
      return '{"ok":false,"code":"invalid_command"}'::jsonb;
    end;
    if cmd = 'record_contact_attempt' then
      if v.status not in ('new', 'contacted')
        or next_state is distinct from 'contacted'
        or next_reason_code is null
        or next_reason_code not in ('reached_follow_up', 'voicemail', 'no_answer')
        or next_call_again_at is null
        or p_decision ->> 'callAgainAt' is distinct from pg_catalog.btrim(p_decision ->> 'callAgainAt')
        or p_decision ->> 'bookingConfirmedAt' is not null
        or p_decision ->> 'closedAt' is not null
        or p_decision ->> 'closureReason' is not null
        or p_decision ->> 'legacyReviewRequired' is distinct from 'false'
      then
        return '{"ok":false,"code":"invalid_command"}'::jsonb;
      end if;
    elsif cmd = 'reopen_request' then
      if v.status not in ('booked', 'closed')
        or v.legacy_review_required
        or next_state is distinct from 'contacted'
        or next_call_again_at is null
        or p_decision ->> 'callAgainAt' is distinct from pg_catalog.btrim(p_decision ->> 'callAgainAt')
        or next_reason_code is not null
        or p_decision ->> 'bookingConfirmedAt' is not null
        or p_decision ->> 'closedAt' is not null
        or p_decision ->> 'closureReason' is not null
        or p_decision ->> 'legacyReviewRequired' is distinct from 'false'
      then
        return '{"ok":false,"code":"invalid_command"}'::jsonb;
      end if;
    elsif cmd = 'set_call_again' then
      if v.status <> 'contacted'
        or v.follow_up_at is not null
        or next_state is distinct from 'contacted'
        or next_call_again_at is null
        or p_decision ->> 'callAgainAt' is distinct from pg_catalog.btrim(p_decision ->> 'callAgainAt')
        or next_reason_code is not null
        or p_decision ->> 'bookingConfirmedAt' is not null
        or p_decision ->> 'closedAt' is not null
        or p_decision ->> 'closureReason' is not null
        or p_decision ->> 'legacyReviewRequired' is distinct from 'false'
      then
        return '{"ok":false,"code":"invalid_command"}'::jsonb;
      end if;
    elsif next_state = 'contacted' then
      return '{"ok":false,"code":"invalid_command"}'::jsonb;
    end if;
    next_closure_provenance := case
      when next_state in ('new', 'contacted', 'booked') then null
      when cmd in ('close_request', 'classify_legacy_closure') then null
      else v.closure_provenance
    end;
  end if;

  update public.requests
  set status = next_state,
      version = version + 1,
      follow_up_at = next_call_again_at,
      record_handoff_at = next_booking_confirmed_at,
      closed_at = next_closed_at,
      closure_reason = next_closure_reason,
      closure_disposition = next_closure_disposition,
      closure_provenance = next_closure_provenance,
      legacy_review_required = next_legacy_review_required
  where id = p_request_id and version = p_expected_version;
  if not found then raise exception 'workflow stale write' using errcode = '40001'; end if;
  if cmd = 'record_contact_attempt' then
    insert into public.request_events(request_id, type, status, meta)
    values (
      p_request_id,
      'contact_attempt',
      'recorded',
      pg_catalog.jsonb_build_object(
        'outcome', next_reason_code,
        'author_email', p_actor_email,
        'follow_up_at', next_call_again_at
      )
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
    prior_snapshot,
    call_again_at
  ) values (
    p_request_id,
    v.status,
    next_state,
    cmd,
    p_actor_email,
    v.version + 1,
    p_idempotency_key,
    now_at,
    next_reason_code,
    case when cmd = 'undo_latest_transition' then p_transition_id end,
    case when cmd = 'classify_legacy_closure' then 'legacy_review' else 'staff' end,
    pg_catalog.jsonb_build_object(
      'state', v.status,
      'callAgainAt', v.follow_up_at,
      'bookingConfirmedAt', v.record_handoff_at,
      'closedAt', v.closed_at,
      'closureReason', v.closure_reason,
      'closureDisposition', v.closure_disposition,
      'closureProvenance', v.closure_provenance,
      'legacyReviewRequired', v.legacy_review_required
    ),
    case when cmd in ('reopen_request', 'set_call_again') then next_call_again_at end
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
      'to', next_state,
      'resulting_version', v.version + 1
    )
  );
  n := pg_catalog.jsonb_build_object(
    'ok', true,
    'state', next_state,
    'version', v.version + 1,
    'callAgainAt', next_call_again_at,
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
