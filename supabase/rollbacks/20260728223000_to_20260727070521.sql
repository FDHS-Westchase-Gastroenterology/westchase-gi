-- Manual rollback for 20260728223000_add_patient_analytics_daily.
-- Run only with the pre-migration application deployment ready. This refuses
-- to silently discard gathered daily rollups.

do $$
begin
  if exists (
    select 1
    from private.analytics_daily
  ) then
    raise exception
      'Rollback blocked: analytics_daily rollups would be discarded'
      using errcode = '55000';
  end if;

  execute 'drop function public.portal_record_analytics_event(
    text,
    text,
    text,
    text
  )';
  execute 'drop table private.analytics_daily';
end;
$$;
