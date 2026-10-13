-- Two first-sign-in tours replace the single portal tour: front desk and admin. Each account keeps
-- one record per tour it has been offered: pending while it runs, then finished or skipped. Front
-- desk accounts take only their own tour; an admin may take both. Only the server reads or writes
-- the records, through portal_set_staff_tour and the session read.
create table public.staff_tours (
  staff_user_id uuid not null references public.staff_profiles(user_id) on delete cascade,
  tour text not null constraint staff_tours_tour_valid check (tour in ('front_desk','admin')),
  status text not null
    constraint staff_tours_status_valid check (status in ('pending','finished','skipped')),
  recorded_at timestamptz not null default now(),
  primary key (staff_user_id, tour)
);

alter table public.staff_tours enable row level security;
revoke all on table public.staff_tours from public,anon,authenticated;
grant select,insert,update,delete on table public.staff_tours to service_role;

-- Anyone who dismissed or finished the old tour has their role's tour on record, so it does not
-- start again. A finish wrote staff.tour_complete beside the dismissal; anything else was a skip.
insert into public.staff_tours (staff_user_id,tour,status,recorded_at)
select p.user_id,
  case p.role when 'admin' then 'admin' else 'front_desk' end,
  case when exists (
    select 1 from public.audit_log a
    where a.action='staff.tour_complete' and a.actor_email=p.email
      and a.at >= p.portal_tour_dismissed_at - interval '1 minute'
  ) then 'finished' else 'skipped' end,
  p.portal_tour_dismissed_at
from public.staff_profiles p
where p.portal_tour_dismissed_at is not null;

-- Records a tour as pending (started from Help), finished or skipped. A front desk account asking
-- for the admin tour is refused. Returns false when the record already says so.
create function public.portal_set_staff_tour(p_user_id uuid, p_tour text, p_status text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  v_profile_id uuid;
  v_email text;
  v_role text;
  v_current text;
begin
  if p_tour is null or p_tour not in ('front_desk','admin') then
    raise exception 'Unknown tour' using errcode = '22023';
  end if;
  if p_status is null or p_status not in ('pending','finished','skipped') then
    raise exception 'Unknown tour status' using errcode = '22023';
  end if;

  select id, email, role into v_profile_id, v_email, v_role
  from public.staff_profiles
  where user_id = p_user_id and active and onboarded_at is not null
  for update;
  if not found then
    raise exception 'Active onboarded staff profile not found' using errcode = 'P0002';
  end if;
  if v_role <> 'admin' and p_tour <> 'front_desk' then
    raise exception 'That tour is not open to this account' using errcode = '42501';
  end if;

  select status into v_current from public.staff_tours
  where staff_user_id = p_user_id and tour = p_tour;
  if v_current is not distinct from p_status then
    return false;
  end if;

  insert into public.staff_tours as t (staff_user_id,tour,status,recorded_at)
  values (p_user_id,p_tour,p_status,statement_timestamp())
  on conflict (staff_user_id,tour) do update
    set status = excluded.status, recorded_at = excluded.recorded_at;

  insert into public.audit_log (actor_email,action,entity,entity_id,source,correlation_id,detail)
  values (
    v_email,
    case p_status
      when 'pending' then 'staff.tour_restart'
      when 'finished' then 'staff.tour_complete'
      else 'staff.tour_dismiss'
    end,
    'staff_profiles',
    v_profile_id,
    'staff',
    pg_catalog.gen_random_uuid(),
    pg_catalog.jsonb_build_object('tour', p_tour, 'status', p_status)
  );
  return true;
end;
$$;

revoke execute on function public.portal_set_staff_tour(uuid,text,text) from public,anon,authenticated;
grant execute on function public.portal_set_staff_tour(uuid,text,text) to service_role;
