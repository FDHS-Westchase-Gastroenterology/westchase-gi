-- Keep booked intake records for at least one year after both the booking was
-- recorded and the scheduled appointment time. An unknown appointment time is
-- not evidence that an appointment has passed, so those records stay protected.
-- This only extends the existing intake policy. It does not establish clinical
-- or billing retention, enable a lifecycle scheduler, or alter legal holds.

create or replace function public.portal_preview_data_lifecycle(
  p_now timestamptz
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'receipt_secrets', (
      select pg_catalog.count(*) from public.request_events
      where type = 'receipt' and created_at <= p_now - interval '1 hour'
        and meta ? 'token_hash'
    ),
    'rate_limits', (
      select pg_catalog.count(*) from private.intake_rate_limits
      where expires_at <= p_now
    ),
    'unconverted_requests', (
      select pg_catalog.count(*) from public.requests
      where status = 'closed' and not legacy_review_required
        and retention_hold_at is null
        and closed_at <= p_now - interval '180 days'
    ),
    'converted_requests', (
      select pg_catalog.count(*) from public.requests
      where status = 'booked' and not legacy_review_required
        and retention_hold_at is null
        and record_handoff_at <= p_now - interval '1 year'
        and appointment_at <= p_now - interval '1 year'
    ),
    'held_requests', (
      select pg_catalog.count(*) from public.requests
      where retention_hold_at is not null
    ),
    'legacy_unclassified_requests', (
      select pg_catalog.count(*) from public.requests
      where legacy_review_required
    ),
    'legacy_review_requests', (
      select pg_catalog.count(*) from public.requests
      where legacy_review_required
    ),
    'audits', (
      select pg_catalog.count(*) from public.audit_log as audit
      where audit.at <= p_now - interval '6 years'
        and not (
          audit.entity = 'requests' and exists (
            select 1 from public.requests as request
            where request.id = audit.entity_id
              and request.retention_hold_at is not null
          )
        )
    )
  );
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
  v_correlation_id uuid := pg_catalog.gen_random_uuid();
begin
  if p_actor_email is null or pg_catalog.btrim(p_actor_email) = ''
    or p_now is null
    or p_now < pg_catalog.statement_timestamp() - interval '5 minutes'
    or p_now > pg_catalog.statement_timestamp() + interval '5 minutes'
  then
    raise exception 'Lifecycle actor and a current clock are required'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(20260725, 170000);

  update public.request_events
  set status = case when status = 'issued' then 'expired' else status end,
      meta = meta - 'token_hash'
  where type = 'receipt' and created_at <= p_now - interval '1 hour'
    and meta ? 'token_hash';
  get diagnostics v_receipt_secrets = row_count;

  delete from private.intake_rate_limits where expires_at <= p_now;
  get diagnostics v_rate_limits = row_count;

  with eligible as materialized (
    select id, status, closure_reason, closure_provenance, closed_at,
      record_handoff_at, appointment_at
    from public.requests
    where not legacy_review_required
      and retention_hold_at is null
      and (
        (status = 'closed' and closed_at <= p_now - interval '180 days')
        or (status = 'booked'
          and record_handoff_at <= p_now - interval '1 year'
          and appointment_at <= p_now - interval '1 year')
      )
    for update skip locked
  ), logged as (
    insert into public.audit_log (
      actor_email, action, entity, entity_id, source, correlation_id, detail
    )
    select p_actor_email, 'request.retention_delete', 'requests', eligible.id,
      'system', v_correlation_id,
      pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
        'policy', 'workflow_calendar_v3', 'state', eligible.status,
        'closure_reason', eligible.closure_reason,
        'closure_provenance', eligible.closure_provenance,
        'closed_at', eligible.closed_at,
        'record_handoff_at', eligible.record_handoff_at,
        'appointment_at', eligible.appointment_at
      ))
    from eligible returning entity_id
  ), deleted as (
    delete from public.requests as request using logged
    where request.id = logged.entity_id returning request.id
  )
  select pg_catalog.count(*)::integer into v_requests from deleted;

  with request_audit_state as materialized (
    select audit.id as audit_id, request.retention_hold_at
    from public.audit_log as audit
    join public.requests as request
      on audit.entity = 'requests' and request.id = audit.entity_id
    where audit.at <= p_now - interval '6 years'
    for update of request
  )
  delete from public.audit_log as audit
  where audit.at <= p_now - interval '6 years'
    and (audit.entity <> 'requests'
      or not exists (select 1 from public.requests as request
        where request.id = audit.entity_id)
      or exists (select 1 from request_audit_state as state
        where state.audit_id = audit.id and state.retention_hold_at is null));
  get diagnostics v_audits = row_count;

  if v_audits > 0 then
    insert into public.audit_log (
      actor_email, action, entity, entity_id, source, correlation_id, detail
    ) values (
      p_actor_email, 'audit.retention_delete', 'audit_log', null, 'system',
      v_correlation_id, pg_catalog.jsonb_build_object(
        'policy', 'balanced_v1', 'deleted_count', v_audits,
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

revoke execute on function public.portal_preview_data_lifecycle(timestamptz),
  public.portal_run_data_lifecycle(text, timestamptz) from public, anon, authenticated;
grant execute on function public.portal_preview_data_lifecycle(timestamptz),
  public.portal_run_data_lifecycle(text, timestamptz) to service_role;
