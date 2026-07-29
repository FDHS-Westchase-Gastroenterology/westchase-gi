-- Manual rollback for 20260729095026_add_portal_release_briefing_state.
-- Run only with the pre-migration application deployment ready. This refuses
-- to silently discard staff acknowledgement state.

do $$
begin
  if exists (
    select 1
    from public.portal_release_states
  ) then
    raise exception
      'Rollback blocked: portal release acknowledgement state would be discarded'
      using errcode = '55000';
  end if;

  execute 'drop function public.portal_hide_staff_release(uuid, text)';
  execute 'drop function public.portal_acknowledge_staff_release(uuid, text)';
  execute 'drop function public.portal_open_staff_release(uuid, text)';
  execute 'drop table public.portal_release_states';
end;
$$;
