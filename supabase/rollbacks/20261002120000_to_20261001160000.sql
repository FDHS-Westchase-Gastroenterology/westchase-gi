-- Removes the day read.
drop function public.portal_schedule_day(uuid,date,uuid);

notify pgrst,'reload schema';
