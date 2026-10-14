-- The audit log is append-only for the app. service_role reads and adds rows and can no longer
-- change, remove or truncate them, the same grant the other append-only tables carry (see
-- 20260817164844). Supabase granted service_role every table privilege when the table was
-- created, and nothing narrowed it until now.
--
-- Rows still expire after six years. One SECURITY DEFINER function deletes them and records the
-- deletion. It is owned by audit_retention, a NOLOGIN role that may read the three columns the
-- expiry rule needs, add a row and delete one, and nothing else. It bypasses row level security
-- because both tables enable it with no policies: without the bypass the held-request check
-- would see no request and delete a held request's history. The function refuses to run if row
-- level security is ever active for it.
--
-- The lifecycle RPC keeps its advisory lock and still locks each expired request row before the
-- definer reads its hold, so a hold set meanwhile waits for the run.

create role audit_retention nologin noinherit bypassrls nocreatedb nocreaterole noreplication;
-- A CREATEROLE role holds only ADMIN on a role it creates; changing the function's owner needs
-- SET, and acting as owner needs INHERIT.
grant audit_retention to current_user with inherit true, set true;
grant usage on schema public to audit_retention;
grant select (at, entity, entity_id), insert, delete on table public.audit_log to audit_retention;
grant select (id, retention_hold_at) on table public.requests to audit_retention;

revoke all on table public.audit_log from public, anon, authenticated, service_role;
grant select, insert on table public.audit_log to service_role;

create function private.portal_delete_expired_audits(
  p_actor_email text,
  p_now timestamptz,
  p_correlation_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_audits integer;
begin
  if p_actor_email is null or pg_catalog.btrim(p_actor_email) = ''
    or p_correlation_id is null
    or p_now is null
    or p_now < pg_catalog.statement_timestamp() - interval '5 minutes'
    or p_now > pg_catalog.statement_timestamp() + interval '5 minutes'
  then
    raise exception 'Audit expiry needs an actor, a correlation id and a current clock'
      using errcode = '22023';
  end if;

  if pg_catalog.row_security_active('public.audit_log')
    or pg_catalog.row_security_active('public.requests')
  then
    raise exception 'Audit expiry must see every audit and request row'
      using errcode = '42501';
  end if;

  delete from public.audit_log as audit
  where audit.at <= p_now - interval '6 years'
    and not (audit.entity = 'requests' and exists (
      select 1 from public.requests as request
      where request.id = audit.entity_id
        and request.retention_hold_at is not null
    ));
  get diagnostics v_audits = row_count;

  if v_audits > 0 then
    insert into public.audit_log (
      actor_email, action, entity, entity_id, source, correlation_id, detail
    ) values (
      p_actor_email, 'audit.retention_delete', 'audit_log', null, 'system',
      p_correlation_id, pg_catalog.jsonb_build_object(
        'policy', 'balanced_v1', 'deleted_count', v_audits,
        'cutoff', p_now - interval '6 years'
      )
    );
  end if;

  return v_audits;
end;
$$;

revoke all on function private.portal_delete_expired_audits(text, timestamptz, uuid)
  from public, anon, authenticated;
grant execute on function private.portal_delete_expired_audits(text, timestamptz, uuid)
  to service_role;

-- The new owner needs CREATE on the schema only while ownership moves.
grant create on schema private to audit_retention;
alter function private.portal_delete_expired_audits(text, timestamptz, uuid)
  owner to audit_retention;
revoke create on schema private from audit_retention;

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

  perform 1
  from public.audit_log as audit
  join public.requests as request
    on audit.entity = 'requests' and request.id = audit.entity_id
  where audit.at <= p_now - interval '6 years'
  for update of request;
  v_audits := private.portal_delete_expired_audits(p_actor_email, p_now, v_correlation_id);

  return pg_catalog.jsonb_build_object(
    'receipt_secrets_removed', v_receipt_secrets,
    'rate_limits_removed', v_rate_limits,
    'requests_removed', v_requests,
    'audits_removed', v_audits
  );
end;
$$;

revoke execute on function public.portal_run_data_lifecycle(text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.portal_run_data_lifecycle(text, timestamptz) to service_role;
