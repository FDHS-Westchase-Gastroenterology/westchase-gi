alter table public.requests
  add column closure_disposition text,
  add column closed_at timestamptz,
  add column record_handoff_at timestamptz,
  add column retention_hold_at timestamptz,
  add column retention_hold_by text,
  add column retention_hold_reason text,
  add constraint requests_closure_disposition_valid
    check (
      closure_disposition is null
      or closure_disposition in ('unconverted', 'converted')
    ),
  add constraint requests_closure_state_valid
    check (
      (
        closure_disposition is null
        and closed_at is null
        and record_handoff_at is null
      )
      or (
        status = 'closed'
        and closure_disposition = 'unconverted'
        and closed_at is not null
        and record_handoff_at is null
      )
      or (
        status = 'closed'
        and closure_disposition = 'converted'
        and closed_at is not null
        and record_handoff_at is not null
      )
    ),
  add constraint requests_retention_hold_state_valid
    check (
      (
        retention_hold_at is null
        and retention_hold_by is null
        and retention_hold_reason is null
      )
      or (
        retention_hold_at is not null
        and retention_hold_by is not null
        and retention_hold_by = pg_catalog.btrim(retention_hold_by)
        and retention_hold_by <> ''
        and pg_catalog.char_length(retention_hold_by) <= 254
        and retention_hold_reason is not null
        and retention_hold_reason = pg_catalog.btrim(retention_hold_reason)
        and retention_hold_reason <> ''
        and pg_catalog.char_length(retention_hold_reason) <= 200
      )
    );

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

create function public.portal_close_request(
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

create function public.portal_set_request_legal_hold(
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

create function public.portal_delete_request_early(
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

create function public.portal_preview_data_lifecycle(
  p_now timestamptz
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'receipt_secrets',
      (
        select pg_catalog.count(*)
        from public.request_events
        where type = 'receipt'
          and created_at <= p_now - interval '1 hour'
          and meta ? 'token_hash'
      ),
    'rate_limits',
      (
        select pg_catalog.count(*)
        from private.intake_rate_limits
        where expires_at <= p_now
      ),
    'unconverted_requests',
      (
        select pg_catalog.count(*)
        from public.requests
        where status = 'closed'
          and closure_disposition = 'unconverted'
          and retention_hold_at is null
          and closed_at <= p_now - interval '180 days'
      ),
    'converted_requests',
      (
        select pg_catalog.count(*)
        from public.requests
        where status = 'closed'
          and closure_disposition = 'converted'
          and record_handoff_at is not null
          and retention_hold_at is null
          and greatest(closed_at, record_handoff_at)
            <= p_now - interval '1 year'
      ),
    'held_requests',
      (
        select pg_catalog.count(*)
        from public.requests
        where retention_hold_at is not null
      ),
    'legacy_unclassified_requests',
      (
        select pg_catalog.count(*)
        from public.requests
        where status = 'closed'
          and closure_disposition is null
      ),
    'audits',
      (
        select pg_catalog.count(*)
        from public.audit_log as audit
        where audit.at <= p_now - interval '6 years'
          and not (
            audit.entity = 'requests'
            and exists (
              select 1
              from public.requests as request
              where request.id = audit.entity_id
                and request.retention_hold_at is not null
            )
          )
      )
  );
$$;

create function public.portal_run_data_lifecycle(
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

revoke execute on function public.portal_close_request(text, uuid, text)
from public, anon, authenticated;
revoke execute on function public.portal_set_request_legal_hold(
  text,
  uuid,
  boolean,
  text
) from public, anon, authenticated;
revoke execute on function public.portal_delete_request_early(text, uuid, text)
from public, anon, authenticated;
revoke execute on function public.portal_preview_data_lifecycle(timestamptz)
from public, anon, authenticated;
revoke execute on function public.portal_run_data_lifecycle(text, timestamptz)
from public, anon, authenticated;

grant execute on function public.portal_close_request(text, uuid, text)
to service_role;
grant execute on function public.portal_set_request_legal_hold(
  text,
  uuid,
  boolean,
  text
) to service_role;
grant execute on function public.portal_delete_request_early(text, uuid, text)
to service_role;
grant execute on function public.portal_preview_data_lifecycle(timestamptz)
to service_role;
grant execute on function public.portal_run_data_lifecycle(text, timestamptz)
to service_role;
