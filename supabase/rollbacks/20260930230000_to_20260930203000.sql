-- Restores the worklist rows without the linked patient and removes the card's availability read.
drop function public.portal_schedule_month_availability(uuid,date,uuid,text,uuid);
alter table public.scheduling_locations drop column request_location;
drop function public.portal_request_worklist_rows(text,text,timestamptz,timestamptz,timestamptz);
create function public.portal_request_worklist_rows(
  p_query text, p_location text, p_received_from timestamptz, p_received_to timestamptz,
  p_now timestamptz
) returns table(
  id uuid,name text,phone text,location text,preferred_time text,locale text,status text,
  created_at timestamptz,follow_up_at timestamptz,legacy_review_required boolean,version bigint,
  last_activity_at timestamptz,last_activity_by text,bucket text,bucket_order integer,
  ascending_time timestamptz,descending_time timestamptz
) language sql stable security invoker set search_path='' as $$
  with clock as (
    select (p_now at time zone 'America/New_York')::date today
  ), boundary as (
    select today, ((today-case extract(isodow from today)::int
      when 1 then 3 when 7 then 2 else 1 end)+time '08:00')
      at time zone 'America/New_York' previous_morning from clock
  ), candidates as (
    select r.id,r.name,r.phone,r.location,r.preferred_time,r.locale,
      case when r.status='booked' then 'scheduled' else r.status end status,
      r.created_at,r.follow_up_at,r.legacy_review_required,r.version,
      activity.at last_activity_at,actor.actor_email last_activity_by,
      case
        when r.status='new' then 0
        when r.status='contacted' and r.follow_up_at is not null
          and (r.follow_up_at at time zone 'America/New_York')::date<=b.today then 1
        when r.status='contacted' and r.follow_up_at is null
          and coalesce(activity.at,r.created_at)<b.previous_morning then 2
        when r.status='contacted' then 3
        when r.status in ('booked','scheduled') then 4
        else 5 end bucket_order
    from public.requests r cross join boundary b
    left join lateral (
      select a.at from public.audit_log a where a.entity='requests' and a.entity_id=r.id
      order by a.at desc,a.id desc limit 1
    ) activity on true
    left join lateral (
      select a.actor_email from public.audit_log a
      where a.entity='requests' and a.entity_id=r.id and a.actor_email is not null and a.actor_email<>''
      order by a.at desc,a.id desc limit 1
    ) actor on true
    where (p_query='' or strpos(lower(r.name),lower(p_query))>0
      or strpos(lower(r.phone),lower(p_query))>0 or strpos(lower(coalesce(r.email,'')),lower(p_query))>0)
      and (p_location is null or r.location=p_location)
      and (p_received_from is null or r.created_at>=p_received_from)
      and (p_received_to is null or r.created_at<p_received_to)
  )
  select c.id,c.name,c.phone,c.location,c.preferred_time,c.locale,c.status,c.created_at,
    c.follow_up_at,c.legacy_review_required,c.version,c.last_activity_at,c.last_activity_by,
    (array['new','follow_up','stale','upcoming','scheduled','closed'])[c.bucket_order+1],c.bucket_order,
    case c.bucket_order when 0 then c.created_at when 1 then c.follow_up_at
      when 2 then coalesce(c.last_activity_at,c.created_at) when 3 then c.follow_up_at end,
    case when c.bucket_order>=3 then c.created_at end
  from candidates c;
$$;
revoke execute on function public.portal_request_worklist_rows(text,text,timestamptz,timestamptz,timestamptz)
  from public,anon,authenticated;
grant execute on function public.portal_request_worklist_rows(text,text,timestamptz,timestamptz,timestamptz)
  to service_role;

notify pgrst,'reload schema';
