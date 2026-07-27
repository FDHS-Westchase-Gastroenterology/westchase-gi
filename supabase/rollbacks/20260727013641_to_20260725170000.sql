-- Manual rollback for 20260727013641_add_atomic_call_outcome.
-- Run only with the pre-migration application deployment ready. This refuses
-- to discard call-outcome state recorded after the forward migration.

do $$
begin
  if exists (
    select 1
    from public.requests
    where follow_up_at is not null
  )
  or exists (
    select 1
    from public.request_events
    where type = 'call_outcome'
  )
  or exists (
    select 1
    from public.audit_log
    where action = 'request.call_outcome'
  ) then
    raise exception
      'Rollback blocked: recorded call outcomes would lose their schema support'
      using errcode = '55000';
  end if;

  execute 'drop function public.portal_log_call_outcome(
    text,
    uuid,
    text,
    text,
    timestamptz
  )';
  execute 'alter table public.requests drop column follow_up_at';
end;
$$;
