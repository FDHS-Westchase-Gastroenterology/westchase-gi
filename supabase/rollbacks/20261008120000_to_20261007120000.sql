-- Reverses 20261008120000_staff_tours: removes the per-tour records and their command. The old
-- staff_profiles.portal_tour_dismissed_at column is still in place at this version; an account
-- with a finished or skipped tour keeps the old tour dismissed, and one with a tour running from
-- Help sees the old tour's nudge again.

update public.staff_profiles p
set portal_tour_dismissed_at = case
  when exists (select 1 from public.staff_tours t where t.staff_user_id = p.user_id and t.status = 'pending') then null
  else coalesce(p.portal_tour_dismissed_at,
    (select max(t.recorded_at) from public.staff_tours t where t.staff_user_id = p.user_id))
end
where exists (select 1 from public.staff_tours t where t.staff_user_id = p.user_id);

drop function public.portal_set_staff_tour(uuid,text,text);
drop table public.staff_tours;
