-- Request pages, counts, and previous/next links share one complete read.
-- The audit indexes read the latest row directly, regardless of history length.
create index audit_log_request_latest_idx on public.audit_log(entity_id,at desc,id desc)
  where entity='requests';
create index audit_log_request_actor_latest_idx on public.audit_log(entity_id,at desc,id desc)
  where entity='requests' and actor_email is not null and actor_email<>'';

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

create function public.portal_read_request_worklist(p_actor_id uuid,p_filter jsonb default '{}')
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare
  v_query text; v_location text; v_from timestamptz; v_to timestamptz; v_now timestamptz;
  v_statuses text[]; v_buckets text[]; v_offset bigint; v_limit integer; v_neighbor uuid;
  v_result jsonb;
begin
  if not exists(select 1 from public.staff_profiles
    where user_id=p_actor_id and active and onboarded_at is not null) then
    return jsonb_build_object('ok',false,'code','unauthorized');
  end if;
  if p_filter is null or jsonb_typeof(p_filter)<>'object'
    or p_filter-array['query','location','receivedFrom','receivedTo','now','statuses','buckets','offset','limit','neighborId']<>'{}'::jsonb
    or (p_filter ? 'query' and jsonb_typeof(p_filter->'query')<>'string')
    or (p_filter ? 'location' and jsonb_typeof(p_filter->'location') not in ('string','null'))
    or (p_filter ? 'statuses' and jsonb_typeof(p_filter->'statuses') not in ('array','null'))
    or (p_filter ? 'buckets' and jsonb_typeof(p_filter->'buckets') not in ('array','null'))
    or (p_filter ? 'offset' and jsonb_typeof(p_filter->'offset')<>'number')
    or (p_filter ? 'limit' and jsonb_typeof(p_filter->'limit')<>'number')
    or (p_filter ? 'neighborId' and jsonb_typeof(p_filter->'neighborId') not in ('string','null')) then
    return jsonb_build_object('ok',false,'code','invalid_query');
  end if;
  if exists(select 1 from jsonb_each(p_filter) pair
    where pair.key in ('receivedFrom','receivedTo','now') and pair.value<>'null'::jsonb
      and (jsonb_typeof(pair.value)<>'string' or pair.value#>>'{}' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T.*(Z|[+-][0-9]{2}:[0-9]{2})$')) then
    return jsonb_build_object('ok',false,'code','invalid_query');
  end if;
  v_query:=coalesce(p_filter->>'query',''); v_location:=p_filter->>'location';
  v_from:=(p_filter->>'receivedFrom')::timestamptz; v_to:=(p_filter->>'receivedTo')::timestamptz;
  v_now:=coalesce((p_filter->>'now')::timestamptz,statement_timestamp());
  v_offset:=coalesce((p_filter->>'offset')::bigint,0); v_limit:=coalesce((p_filter->>'limit')::int,50);
  v_neighbor:=(p_filter->>'neighborId')::uuid;
  if p_filter->'statuses' is not null and p_filter->'statuses'<>'null'::jsonb then
    select array_agg(value) into v_statuses from jsonb_array_elements_text(p_filter->'statuses');
    if coalesce(cardinality(v_statuses),0) not between 1 and 4
      or not (v_statuses<@array['new','contacted','scheduled','closed']) then
      return jsonb_build_object('ok',false,'code','invalid_query');
    end if;
  end if;
  if p_filter->'buckets' is not null and p_filter->'buckets'<>'null'::jsonb then
    select array_agg(value) into v_buckets from jsonb_array_elements_text(p_filter->'buckets');
    if coalesce(cardinality(v_buckets),0) not between 1 and 6
      or not (v_buckets<@array['new','follow_up','stale','upcoming','scheduled','closed']) then
      return jsonb_build_object('ok',false,'code','invalid_query');
    end if;
  end if;
  if char_length(v_query)>100 or v_query<>btrim(v_query)
    or (v_location is not null and v_location not in ('any','tampa','lutz'))
    or not isfinite(v_now) or (v_from is not null and not isfinite(v_from))
    or (v_to is not null and not isfinite(v_to)) or (v_from is not null and v_to<=v_from)
    or v_offset not between 0 and 9007199254740991 or v_limit not between 1 and 200
    or (p_filter ? 'offset' and (p_filter->>'offset')::numeric<>v_offset)
    or (p_filter ? 'limit' and (p_filter->>'limit')::numeric<>v_limit) then
    return jsonb_build_object('ok',false,'code','invalid_query');
  end if;
  with base as materialized (
    select * from public.portal_request_worklist_rows(v_query,v_location,v_from,v_to,v_now)
  ), scoped as (
    select * from base where (v_statuses is null or status=any(v_statuses))
      and (v_buckets is null or bucket=any(v_buckets))
  ), ordered as materialized (
    select s.*,row_number() over w position,lag(id) over w prev_id,lead(id) over w next_id
    from scoped s window w as (order by bucket_order,ascending_time asc nulls last,
      descending_time desc nulls last,id)
  ), page as (
    select * from ordered where v_neighbor is null and position>v_offset and position<=v_offset+v_limit
  )
  select jsonb_build_object('ok',true,'total',(select count(*) from scoped),
    'counts',jsonb_build_object('new',(select count(*) from base where status='new'),
      'contacted',(select count(*) from base where status='contacted'),
      'scheduled',(select count(*) from base where status='scheduled'),
      'closed',(select count(*) from base where status='closed')),
    'items',coalesce((select jsonb_agg(to_jsonb(p)-array['bucket_order','ascending_time','descending_time','position','prev_id','next_id']
      order by position) from page p),'[]'::jsonb),
    'nextOffset',case when v_neighbor is null and v_offset+v_limit<(select count(*) from scoped)
      then v_offset+v_limit else null end,
    'neighbors',coalesce((select jsonb_build_object('prevId',prev_id,'nextId',next_id,'position',position)
      from ordered where id=v_neighbor),jsonb_build_object('prevId',null,'nextId',null,'position',null))) into v_result;
  return v_result;
exception when invalid_text_representation or datetime_field_overflow or invalid_datetime_format
  or numeric_value_out_of_range then return jsonb_build_object('ok',false,'code','invalid_query');
end;
$$;
revoke execute on function public.portal_read_request_worklist(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.portal_read_request_worklist(uuid,jsonb) to service_role;

notify pgrst,'reload schema';
