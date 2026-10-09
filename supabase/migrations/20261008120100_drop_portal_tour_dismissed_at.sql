-- Retires the single portal tour (issue #358). staff_tours carries each account's role tours,
-- backfilled from portal_tour_dismissed_at by 20261008120000_staff_tours, and the portal reads
-- only staff_tours from this version on.

drop function public.portal_set_staff_tour_dismissed(uuid, boolean);
alter table public.staff_profiles drop column portal_tour_dismissed_at;
