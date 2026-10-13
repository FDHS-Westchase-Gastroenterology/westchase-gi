-- Finding a patient from the schedule (issue #356).
--
-- One read finds people by the start of any word of their name, or by the digits of their phone
-- whatever its formatting, across registry patients and the open requests no patient is linked
-- to yet. Each person carries where they stand right now, computed in the same query: today's
-- appointment, else the next one, else an open request, else their last visit. The patient read
-- gains the appointments the record's Visits tab lists.

create extension if not exists unaccent with schema extensions;

-- A name's words, lowercased and unaccented, with punctuation dropped and every word led by a
-- space, so a word start is a LIKE on ' <token>%'. "Mary-Kate O'Brien" keys as
-- ' mary kate obrien' and "María Pérez" as ' maria perez', so staff need not type the accents.
-- The dictionary is named explicitly, which is what makes unaccent safe to call immutable.
create function public.portal_name_key(p_name text) returns text
language sql immutable parallel safe set search_path = ''
as $$
  select ' ' || btrim(regexp_replace(regexp_replace(
    lower(extensions.unaccent('extensions.unaccent'::regdictionary, p_name)),
    '[^[:alnum:][:space:]-]', '', 'g'), '[[:space:]-]+', ' ', 'g'))
$$;
revoke execute on function public.portal_name_key(text) from public, anon, authenticated;
grant execute on function public.portal_name_key(text) to service_role;

create index patients_name_key_idx on public.patients
  using gin (public.portal_name_key(name) extensions.gin_trgm_ops) where archived_at is null;
create index requests_open_name_key_idx on public.requests
  using gin (public.portal_name_key(name) extensions.gin_trgm_ops) where status <> 'closed';
create index requests_open_phone_digits_idx on public.requests
  using gin (regexp_replace(phone, '[^0-9]', '', 'g') extensions.gin_trgm_ops) where status <> 'closed';

create function public.portal_find_people(
  p_actor_id uuid,
  p_query text,
  p_limit integer default 20
) returns jsonb
language plpgsql stable security invoker set search_path = ''
as $$
declare
  v_query text;
  v_tokens text[];
  v_patterns text[];
  v_lead text;
  v_digits text;
  v_patient_ids uuid[];
  v_request_ids uuid[];
  v_today date := (statement_timestamp() at time zone 'America/New_York')::date;
  v_now timestamptz := statement_timestamp();
  v_anyone boolean;
  v_result jsonb;
begin
  if not exists (select 1 from public.staff_profiles where user_id = p_actor_id and active and onboarded_at is not null) then
    return jsonb_build_object('ok', false, 'code', 'unauthorized');
  end if;
  if p_query is null or char_length(p_query) > 254 or p_limit is null or p_limit not between 1 and 50 then
    return jsonb_build_object('ok', false, 'code', 'invalid_command');
  end if;
  v_anyone := exists (select 1 from public.patients where archived_at is null)
    or exists (select 1 from public.requests where status <> 'closed');
  v_query := btrim(p_query);
  if v_query ~ '[[:alpha:]]' then
    -- A name: every word of the query starts a word of the name, in any order.
    -- The query keys the same way the names do.
    select coalesce(array_agg(token), '{}') into v_tokens
    from regexp_split_to_table(btrim(public.portal_name_key(v_query)), ' ') as token
    where token <> '';
  else
    -- A phone number: its digits, with the country code dropped when it was typed as one ("+1",
    -- "1 (813)", or eleven digits). A bare leading 1 stays, since it can be part of the number.
    v_digits := regexp_replace(v_query, '[^0-9]', '', 'g');
    if v_query ~ '^(\+1|1[^0-9])' or (char_length(v_digits) = 11 and left(v_digits, 1) = '1') then
      v_digits := substr(v_digits, 2);
    end if;
  end if;
  if char_length(v_query) < 2 or (v_tokens is null and char_length(coalesce(v_digits, '')) < 3)
    or (v_tokens is not null and cardinality(v_tokens) = 0) then
    return jsonb_build_object('ok', true, 'anyone', v_anyone, 'total', 0, 'people', '[]'::jsonb);
  end if;

  -- Matching runs first, one indexed LIKE per query kind, so the status work below only sees the
  -- people found. The longest word leads, since it narrows the trigram index the most.
  if v_tokens is not null then
    select array_agg('% ' || t || '%' order by char_length(t) desc, t) into v_patterns from unnest(v_tokens) t;
    v_lead := v_patterns[1];
    select coalesce(array_agg(p.id), '{}') into v_patient_ids from public.patients p
    where p.archived_at is null and public.portal_name_key(p.name) like v_lead
      and public.portal_name_key(p.name) like all (v_patterns);
    select coalesce(array_agg(r.id), '{}') into v_request_ids from public.requests r
    where r.status <> 'closed' and public.portal_name_key(r.name) like v_lead
      and public.portal_name_key(r.name) like all (v_patterns)
      and not exists (select 1 from public.patient_request_links l where l.request_id = r.id);
  else
    select coalesce(array_agg(p.id), '{}') into v_patient_ids from public.patients p
    where p.archived_at is null and p.search_text like '%' || v_digits || '%'
      and regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') like '%' || v_digits || '%';
    select coalesce(array_agg(r.id), '{}') into v_request_ids from public.requests r
    where r.status <> 'closed' and regexp_replace(r.phone, '[^0-9]', '', 'g') like '%' || v_digits || '%'
      and not exists (select 1 from public.patient_request_links l where l.request_id = r.id);
  end if;

  with patient_matches as (
    select p.id, p.name, p.phone from public.patients p where p.id = any (v_patient_ids)
  ), request_matches as (
    select r.id, r.name, r.phone, r.status, r.follow_up_at, r.appointment_at from public.requests r
    where r.id = any (v_request_ids)
  ), patient_people as (
    select m.id, m.name, m.phone, today.id as today_id, upcoming.id as next_id, open_request.request_id,
      case when today.id is not null then 0 when upcoming.id is not null then 1
        when open_request.request_id is not null then 2 else 3 end as bucket,
      case
        when today.id is not null then jsonb_build_object('kind', 'appointment', 'when', 'today',
          'appointmentId', today.id, 'startsAt', today.starts_at, 'status', today.status,
          'providerName', today.provider_name, 'locationName', today.location_name)
        when upcoming.id is not null then jsonb_build_object('kind', 'appointment', 'when', 'next',
          'appointmentId', upcoming.id, 'startsAt', upcoming.starts_at, 'status', upcoming.status,
          'providerName', upcoming.provider_name, 'locationName', upcoming.location_name)
        when open_request.request_id is not null then jsonb_build_object('kind', 'request',
          'requestId', open_request.request_id, 'requestStatus', open_request.status,
          'followUpAt', open_request.follow_up_at, 'appointmentAt', open_request.appointment_at)
        else jsonb_build_object('kind', 'none', 'lastVisitAt', (
          select max(a.starts_at) from public.appointments a
          where a.patient_id = m.id and a.status in ('checked_in', 'completed') and a.starts_at < v_now))
      end as status
    from patient_matches m
    left join lateral (
      -- Today's visit; one still to come or in the room leads one already finished.
      select a.id, a.starts_at, a.status, pr.name as provider_name, lo.name as location_name
      from public.appointments a
      join public.scheduling_providers pr on pr.id = a.provider_id
      join public.scheduling_locations lo on lo.id = a.location_id
      where a.patient_id = m.id and a.status <> 'cancelled'
        and a.starts_at >= (v_today::timestamp at time zone 'America/New_York')
        and a.starts_at < ((v_today + 1)::timestamp at time zone 'America/New_York')
      order by a.status in ('completed', 'no_show'), a.starts_at, a.id limit 1
    ) today on true
    left join lateral (
      select a.id, a.starts_at, a.status, pr.name as provider_name, lo.name as location_name
      from public.appointments a
      join public.scheduling_providers pr on pr.id = a.provider_id
      join public.scheduling_locations lo on lo.id = a.location_id
      where today.id is null and a.patient_id = m.id and a.status = 'scheduled' and a.starts_at >= v_now
      order by a.starts_at, a.id limit 1
    ) upcoming on true
    left join lateral (
      select l.request_id, r.status, r.follow_up_at, r.appointment_at
      from public.patient_request_links l join public.requests r on r.id = l.request_id
      where today.id is null and upcoming.id is null and l.patient_id = m.id
        and r.status in ('new', 'contacted')
      order by r.created_at desc, r.id limit 1
    ) open_request on true
  ), request_people as (
    select m.id, m.name, m.phone,
      case
        when m.status = 'booked' and (m.appointment_at at time zone 'America/New_York')::date = v_today then 0
        when m.status = 'booked' and m.appointment_at >= v_now then 1
        when m.status in ('new', 'contacted') then 2 else 3 end as bucket,
      jsonb_build_object('kind', 'request', 'requestId', m.id, 'requestStatus', m.status,
        'followUpAt', m.follow_up_at, 'appointmentAt', m.appointment_at) as status
    from request_matches m
  ), people as (
    select 'patient' as kind, id, name, phone, bucket, status from patient_people
    union all
    select 'request', id, name, phone, bucket, status from request_people
  )
  select jsonb_build_object('ok', true, 'anyone', v_anyone, 'total', (select count(*) from people),
    'people', coalesce((
      select jsonb_agg(jsonb_build_object('kind', v.kind, 'id', v.id, 'name', v.name, 'phone', v.phone,
        'status', v.status) order by v.bucket, lower(v.name), v.id)
      from (select * from people order by bucket, lower(name), id limit p_limit) v), '[]'::jsonb))
  into v_result;
  return v_result;
end;
$$;
revoke execute on function public.portal_find_people(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.portal_find_people(uuid, text, integer) to service_role;

-- The patient read gains the appointments the record's Visits tab lists: every one that was not
-- cancelled, latest first, up to a hundred.
create or replace function public.portal_read_patient(
  p_actor_id uuid,
  p_patient_id uuid,
  p_history_before bigint default null,
  p_links_after uuid default null
) returns jsonb
language plpgsql stable security invoker set search_path = ''
as $$
declare
  v_patient public.patients%rowtype;
  v_result jsonb;
begin
  if not exists (select 1 from public.staff_profiles where user_id = p_actor_id and active and onboarded_at is not null) then
    return jsonb_build_object('ok', false, 'code', 'unauthorized');
  end if;
  if p_patient_id is null or (p_history_before is not null and p_history_before < 1) then
    return jsonb_build_object('ok', false, 'code', 'invalid_command');
  end if;
  select * into v_patient from public.patients where id = p_patient_id;
  if not found then return jsonb_build_object('ok', false, 'code', 'not_found'); end if;
  with history_page as (
    select * from public.patient_revisions where patient_id = p_patient_id
      and (p_history_before is null or version < p_history_before)
    order by version desc limit 51
  ), history_visible as (
    select * from history_page order by version desc limit 50
  ), links_page as (
    select l.*, r.created_at as request_created_at, r.status as request_status
    from public.patient_request_links l join public.requests r on r.id = l.request_id
    where l.patient_id = p_patient_id and (p_links_after is null or l.request_id > p_links_after)
    order by l.request_id limit 51
  ), links_visible as (
    select * from links_page order by request_id limit 50
  ), visits as (
    select a.id, a.starts_at, a.ends_at, a.status, a.version, a.source_request_id,
      a.provider_id, pr.name as provider_name, a.location_id, lo.name as location_name,
      a.appointment_type_id, ty.name as appointment_type_name
    from public.appointments a
    join public.scheduling_providers pr on pr.id = a.provider_id
    join public.scheduling_locations lo on lo.id = a.location_id
    join public.appointment_types ty on ty.id = a.appointment_type_id
    where a.patient_id = p_patient_id and a.status <> 'cancelled'
    order by a.starts_at desc, a.id limit 100
  )
  select jsonb_build_object('ok', true, 'patient', to_jsonb(v_patient) - 'search_text',
    'history', jsonb_build_object(
      'items', coalesce((select jsonb_agg(to_jsonb(h) order by h.version desc) from history_visible h), '[]'::jsonb),
      'total', (select count(*) from public.patient_revisions where patient_id = p_patient_id),
      'nextVersion', case when (select count(*) from history_page) > 50 then
        (select min(version) from history_visible) else null end),
    'requests', jsonb_build_object(
      'items', coalesce((select jsonb_agg(to_jsonb(l) order by l.request_id) from links_visible l), '[]'::jsonb),
      'total', (select count(*) from public.patient_request_links where patient_id = p_patient_id),
      'nextRequestId', case when (select count(*) from links_page) > 50 then
        (select request_id from links_visible order by request_id desc limit 1) else null end),
    'appointments', jsonb_build_object(
      'items', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'startsAt', v.starts_at,
        'endsAt', v.ends_at, 'status', v.status, 'version', v.version, 'sourceRequestId', v.source_request_id,
        'providerId', v.provider_id, 'providerName', v.provider_name, 'locationId', v.location_id,
        'locationName', v.location_name, 'appointmentTypeId', v.appointment_type_id,
        'appointmentTypeName', v.appointment_type_name) order by v.starts_at desc, v.id) from visits v), '[]'::jsonb),
      'total', (select count(*) from public.appointments where patient_id = p_patient_id and status <> 'cancelled')))
  into v_result;
  return v_result;
end;
$$;

notify pgrst, 'reload schema';
