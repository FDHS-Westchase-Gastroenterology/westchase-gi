-- Manual rollback for the two 2026-07-25 candidate migrations.
-- Run only with the pre-migration application deployment ready. This refuses
-- to discard lifecycle state; resolve or export any classified/held rows first.

do $$
begin
  if exists (
    select 1
    from public.requests
    where closure_disposition is not null
      or retention_hold_at is not null
  ) then
    raise exception
      'Rollback blocked: classified or held requests would lose lifecycle state'
      using errcode = '55000';
  end if;
end;
$$;

drop function public.portal_run_data_lifecycle(text, timestamptz);
drop function public.portal_preview_data_lifecycle(timestamptz);
drop function public.portal_delete_request_early(text, uuid, text);
drop function public.portal_set_request_legal_hold(text, uuid, boolean, text);
drop function public.portal_close_request(text, uuid, text);
drop function public.portal_update_request_status(text, uuid, text);

alter table public.requests
  drop column retention_hold_reason,
  drop column retention_hold_by,
  drop column retention_hold_at,
  drop column record_handoff_at,
  drop column closed_at,
  drop column closure_disposition;

create function public.portal_update_request_status(
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
  set status = p_next_status
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
      'to', p_next_status
    )
  );

  return true;
end;
$$;

revoke execute on function public.portal_update_request_status(text, uuid, text)
from public, anon, authenticated;
grant execute on function public.portal_update_request_status(text, uuid, text)
to service_role;

drop function public.portal_check_intake_rate_limit(text, integer, integer);
drop table private.intake_rate_limits;
revoke usage on schema private from service_role;

alter table public.requests
  drop constraint requests_name_length,
  drop constraint requests_phone_length,
  drop constraint requests_email_length;
