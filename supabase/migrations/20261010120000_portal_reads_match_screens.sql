-- Three server reads the portal's screens already ask for, made to answer them.
--
-- The Schedule's month tint. A day's tint was the share of working minutes held by visits, while
-- the cell reads "N of M booked", where M is the visits plus the openings still left. The two
-- disagreed: a day eight of ten booked painted as under half full. The tint is now that same count,
-- booked over booked plus open, and a day with no opening left is fully booked.
--
-- The Activity log. Skipping a role tour writes staff.tour_dismiss, and the log phrases it, but the
-- stream left it out with the other unphrased actions. It now shows beside the restart and finish.
--
-- The Schedule's search. Results start from the second character, a phone number's included; two
-- digits used to return nothing. At the clinic's scale the two-digit scan stays small, and three
-- or more digits still lead with the trigram index.

drop index public.audit_log_activity_idx;
create index audit_log_activity_idx on public.audit_log (at desc, id desc) where action in (
    'auth.sign_in', 'request.create', 'request.status_change', 'request.close',
    'request.call_outcome', 'request.note', 'request.authorized_delete', 'request.retention_delete',
    'request.retention_hold', 'request.workflow_command', 'requests.export', 'requests.print_new',
    'recipients.add', 'recipients.remove', 'recipients.toggle', 'recipients.label_update',
    'staff.invite', 'staff.onboard', 'staff.deactivate', 'staff.role', 'staff.password_reset',
    'staff.tour_restart', 'staff.tour_dismiss', 'staff.tour_complete', 'maintainers.invite',
    'maintainers.cancel', 'maintainers.revoke');

-- The stream itself; only the tour dismissal joins the audit actions it shows.
create or replace function public.portal_activity_rows(
  p_viewer_email text,
  p_admin boolean,
  p_categories text[],
  p_appointment_actions text[],
  p_provider_id uuid,
  p_from timestamptz,
  p_until timestamptz,
  p_hits jsonb,
  p_full integer,
  p_before_at timestamptz,
  p_before_id uuid,
  p_limit integer
) returns table (
  source text,
  id uuid,
  occurred_at timestamptz,
  category text,
  appointment_action text,
  actor_email text,
  action text,
  patient_id uuid,
  request_id uuid,
  provider_id uuid,
  prior_provider_id uuid,
  location_id uuid,
  appointment_type_id uuid,
  subject_staff_id uuid,
  recipient_id uuid
)
language sql stable set search_path = ''
as $$
  select u.source, u.id, u.occurred_at, u.category, u.appointment_action, u.actor_email, u.action,
    u.patient_id, u.request_id, u.provider_id, u.prior_provider_id,
    u.location_id, u.appointment_type_id, u.subject_staff_id, u.recipient_id
  from (
    (
      select f.* from (
        select 'audit'::text as source, a.id, a.at as occurred_at, a.actor_email, a.action,
          case
            when a.action = 'auth.sign_in' then 'sign_ins'
            when a.action in ('request.create', 'request.status_change', 'request.close',
              'request.call_outcome', 'request.note', 'request.authorized_delete',
              'request.retention_delete', 'request.retention_hold', 'requests.print_new')
              then 'requests'
            when a.action = 'request.workflow_command' and a.detail ->> 'command' in (
              'record_contact_attempt', 'confirm_booking_handoff', 'close_request', 'reopen_request',
              'set_call_again', 'undo_latest_transition', 'classify_legacy_closure') then 'requests'
            when a.action in ('requests.export', 'recipients.add',
              'recipients.remove', 'recipients.toggle', 'recipients.label_update', 'staff.invite',
              'staff.onboard', 'staff.deactivate', 'staff.role', 'staff.password_reset',
              'staff.tour_restart', 'staff.tour_dismiss', 'staff.tour_complete', 'maintainers.invite',
              'maintainers.cancel', 'maintainers.revoke') then 'settings'
            else 'technical'
          end as category,
          null::text as appointment_action,
          (select l.patient_id from public.patient_request_links l
            where a.entity = 'requests' and l.request_id = a.entity_id) as patient_id,
          case when a.entity = 'requests' then a.entity_id end as request_id,
          null::uuid as provider_id, null::uuid as prior_provider_id, null::uuid as location_id,
          null::uuid as appointment_type_id,
          case when a.entity = 'staff_profiles' then a.entity_id end as subject_staff_id,
          case when a.action like 'recipients.%' then a.entity_id end as recipient_id
        from public.audit_log a
        where a.action in (
          'auth.sign_in', 'request.create', 'request.status_change', 'request.close',
          'request.call_outcome', 'request.note', 'request.authorized_delete', 'request.retention_delete',
          'request.retention_hold', 'request.workflow_command', 'requests.export', 'requests.print_new',
          'recipients.add', 'recipients.remove', 'recipients.toggle', 'recipients.label_update',
          'staff.invite', 'staff.onboard', 'staff.deactivate', 'staff.role', 'staff.password_reset',
          'staff.tour_restart', 'staff.tour_dismiss', 'staff.tour_complete', 'maintainers.invite',
          'maintainers.cancel', 'maintainers.revoke')
          and a.at >= p_from and a.at < p_until
          and (a.at, a.id) < (p_before_at, p_before_id)
      ) f (source, id, occurred_at, actor_email, action, category, appointment_action, patient_id,
        request_id, provider_id, prior_provider_id, location_id, appointment_type_id, subject_staff_id,
        recipient_id)
      where f.category <> 'technical'
        and (p_admin or f.category in ('appointments', 'requests', 'schedule')
          or (f.category = 'sign_ins' and lower(f.actor_email) = lower(p_viewer_email)))
        and (p_categories is null or f.category = any (p_categories))
        and (p_appointment_actions is null or f.category <> 'appointments'
          or f.appointment_action = any (p_appointment_actions))
        and (p_provider_id is null or f.provider_id = p_provider_id
          or f.prior_provider_id = p_provider_id)
        and (p_hits is null or (coalesce((p_hits ->> lower(f.actor_email))::integer, 0)
          | coalesce((p_hits ->> f.patient_id::text)::integer, 0)
          | coalesce((p_hits ->> f.request_id::text)::integer, 0)
          | coalesce((p_hits ->> f.provider_id::text)::integer, 0)
          | coalesce((p_hits ->> f.prior_provider_id::text)::integer, 0)
          | coalesce((p_hits ->> f.location_id::text)::integer, 0)
          | coalesce((p_hits ->> f.appointment_type_id::text)::integer, 0)
          | coalesce((p_hits ->> f.subject_staff_id::text)::integer, 0)
          | coalesce((p_hits ->> f.recipient_id::text)::integer, 0)
          | coalesce((p_hits ->> ('c:' || f.category))::integer, 0)
          | coalesce((p_hits ->> ('a:' || f.appointment_action))::integer, 0)
          | coalesce((p_hits ->> ('x:' || f.action))::integer, 0)) = p_full)
      order by f.occurred_at desc, f.id desc
      limit p_limit
    )
    union all
    (
      select f.* from (
        select 'scheduling'::text, c.id, c.occurred_at, c.actor_email, c.command,
          case
            when c.entity <> 'appointment' then 'schedule'
            when coalesce(k.command, c.command) in ('book', 'reschedule', 'cancel', 'check_in',
              'complete', 'no_show') then 'appointments'
            else 'technical'
          end,
          case coalesce(k.command, c.command) when 'book' then 'booked' when 'reschedule' then 'moved'
            when 'cancel' then 'cancelled' when 'check_in' then 'checked_in' when 'no_show' then 'no_show'
            when 'complete' then 'completed' end,
          (coalesce(c.after_record, c.before_record) ->> 'patient_id')::uuid,
          c.request_id,
          coalesce(c.provider_id, (coalesce(c.after_record, c.before_record) ->> 'provider_id')::uuid),
          nullif((c.before_record ->> 'provider_id')::uuid, (c.after_record ->> 'provider_id')::uuid),
          coalesce(c.location_id, (coalesce(c.after_record, c.before_record) ->> 'location_id')::uuid),
          coalesce(c.appointment_type_id,
            (coalesce(c.after_record, c.before_record) ->> 'appointment_type_id')::uuid),
          null::uuid, null::uuid
        from public.scheduling_changes c
        left join public.scheduling_changes k on k.id = c.compensates_change_id and c.command = 'undo'
        where c.occurred_at >= p_from and c.occurred_at < p_until
          and (c.occurred_at, c.id) < (p_before_at, p_before_id)
      ) f (source, id, occurred_at, actor_email, action, category, appointment_action, patient_id,
        request_id, provider_id, prior_provider_id, location_id, appointment_type_id, subject_staff_id,
        recipient_id)
      where f.category <> 'technical'
        and (p_admin or f.category in ('appointments', 'requests', 'schedule')
          or (f.category = 'sign_ins' and lower(f.actor_email) = lower(p_viewer_email)))
        and (p_categories is null or f.category = any (p_categories))
        and (p_appointment_actions is null or f.category <> 'appointments'
          or f.appointment_action = any (p_appointment_actions))
        and (p_provider_id is null or f.provider_id = p_provider_id
          or f.prior_provider_id = p_provider_id)
        and (p_hits is null or (coalesce((p_hits ->> lower(f.actor_email))::integer, 0)
          | coalesce((p_hits ->> f.patient_id::text)::integer, 0)
          | coalesce((p_hits ->> f.request_id::text)::integer, 0)
          | coalesce((p_hits ->> f.provider_id::text)::integer, 0)
          | coalesce((p_hits ->> f.prior_provider_id::text)::integer, 0)
          | coalesce((p_hits ->> f.location_id::text)::integer, 0)
          | coalesce((p_hits ->> f.appointment_type_id::text)::integer, 0)
          | coalesce((p_hits ->> f.subject_staff_id::text)::integer, 0)
          | coalesce((p_hits ->> f.recipient_id::text)::integer, 0)
          | coalesce((p_hits ->> ('c:' || f.category))::integer, 0)
          | coalesce((p_hits ->> ('a:' || f.appointment_action))::integer, 0)
          | coalesce((p_hits ->> ('x:' || f.action))::integer, 0)) = p_full)
      order by f.occurred_at desc, f.id desc
      limit p_limit
    )
    union all
    (
      select f.* from (
        select 'patient'::text, r.id, r.occurred_at, r.actor_email, r.command, 'requests'::text,
          null::text, r.patient_id, r.request_id, null::uuid, null::uuid, null::uuid, null::uuid,
          null::uuid, null::uuid
        from public.patient_revisions r
        where r.occurred_at >= p_from and r.occurred_at < p_until
          and (r.occurred_at, r.id) < (p_before_at, p_before_id)
      ) f (source, id, occurred_at, actor_email, action, category, appointment_action, patient_id,
        request_id, provider_id, prior_provider_id, location_id, appointment_type_id, subject_staff_id,
        recipient_id)
      where f.category <> 'technical'
        and (p_admin or f.category in ('appointments', 'requests', 'schedule')
          or (f.category = 'sign_ins' and lower(f.actor_email) = lower(p_viewer_email)))
        and (p_categories is null or f.category = any (p_categories))
        and (p_appointment_actions is null or f.category <> 'appointments'
          or f.appointment_action = any (p_appointment_actions))
        and (p_provider_id is null or f.provider_id = p_provider_id
          or f.prior_provider_id = p_provider_id)
        and (p_hits is null or (coalesce((p_hits ->> lower(f.actor_email))::integer, 0)
          | coalesce((p_hits ->> f.patient_id::text)::integer, 0)
          | coalesce((p_hits ->> f.request_id::text)::integer, 0)
          | coalesce((p_hits ->> f.provider_id::text)::integer, 0)
          | coalesce((p_hits ->> f.prior_provider_id::text)::integer, 0)
          | coalesce((p_hits ->> f.location_id::text)::integer, 0)
          | coalesce((p_hits ->> f.appointment_type_id::text)::integer, 0)
          | coalesce((p_hits ->> f.subject_staff_id::text)::integer, 0)
          | coalesce((p_hits ->> f.recipient_id::text)::integer, 0)
          | coalesce((p_hits ->> ('c:' || f.category))::integer, 0)
          | coalesce((p_hits ->> ('a:' || f.appointment_action))::integer, 0)
          | coalesce((p_hits ->> ('x:' || f.action))::integer, 0)) = p_full)
      order by f.occurred_at desc, f.id desc
      limit p_limit
    )
  ) u
  order by u.occurred_at desc, u.id desc
  limit p_limit
$$;

-- The page read; only the search words gain the tour dismissal.
create or replace function public.portal_read_activity(
  p_actor_id uuid,
  p_categories text[] default null,
  p_appointment_actions text[] default null,
  p_provider_id uuid default null,
  p_from date default null,
  p_to date default null,
  p_query text default null,
  p_before_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 50
) returns jsonb
language plpgsql stable security invoker set search_path = ''
as $$
declare
  v_viewer public.staff_profiles%rowtype;
  v_admin boolean;
  v_from timestamptz;
  v_until timestamptz;
  v_tokens text[];
  v_hits jsonb;
  v_full integer;
  v_rows jsonb;
  v_count integer;
  v_last jsonb;
  v_counts jsonb := null;
  v_total bigint;
  v_matching bigint;
begin
  select * into v_viewer from public.staff_profiles
    where user_id = p_actor_id and active and onboarded_at is not null;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'unauthorized');
  end if;
  v_admin := v_viewer.role = 'admin';

  if p_limit is null or p_limit not between 1 and 100
    or (p_before_at is null) <> (p_before_id is null)
    or (p_before_at is not null and not isfinite(p_before_at))
    or (p_categories is not null and (cardinality(p_categories) = 0 or not p_categories <@
      array['appointments', 'requests', 'schedule', 'sign_ins', 'settings']))
    or (p_appointment_actions is not null and (cardinality(p_appointment_actions) = 0
      or not p_appointment_actions <@ array['booked', 'moved', 'cancelled', 'checked_in', 'no_show', 'completed']))
    or (p_from is not null and p_to is not null and p_to < p_from)
    or (p_query is not null and char_length(p_query) > 200) then
    return jsonb_build_object('ok', false, 'code', 'invalid_command');
  end if;

  v_from := coalesce(p_from::timestamp at time zone 'America/New_York', '-infinity'::timestamptz);
  v_until := coalesce((p_to + 1)::timestamp at time zone 'America/New_York', 'infinity'::timestamptz);
  if p_query is not null then
    select array_agg(token order by ord) into v_tokens
    from regexp_split_to_table(btrim(public.portal_name_key(p_query)), ' ') with ordinality as t(token, ord)
    where token <> '';
    if cardinality(v_tokens) > 8 then
      return jsonb_build_object('ok', false, 'code', 'invalid_command');
    end if;
  end if;

  -- Resolve the search once: which keys each token matches as a word prefix.
  if v_tokens is not null then
    v_full := (1 << cardinality(v_tokens)) - 1;
    with t as (
      select token, (1 << (ord - 1)::integer) as bit
      from unnest(v_tokens) with ordinality as u(token, ord)
    ), keyed (k, words) as (
      select lower(s.email), concat_ws(' ', s.display_name, translate(s.email, '@._+', '    '))
        from public.staff_profiles s
      union all select s.id::text, s.display_name from public.staff_profiles s
      union all select p.id::text, p.name from public.patients p
      union all select q.id::text, q.name from public.requests q
      union all select v.id::text, v.name from public.scheduling_providers v
      union all select l.id::text, l.name from public.scheduling_locations l
      union all select y.id::text, y.name from public.appointment_types y
      union all select n.id::text, translate(n.email, '@._+', '    ')
        from public.notification_recipients n
      union all select 'c:' || w.key, w.words from (values
        ('appointments', 'appointment appointments'),
        ('requests', 'request requests patient patients'),
        ('schedule', 'schedule hours'),
        ('sign_ins', 'sign in signed in sign ins'),
        ('settings', 'settings')) as w(key, words)
      union all select 'a:' || w.key, w.words from (values
        ('booked', 'booked book'),
        ('moved', 'moved rescheduled reschedule'),
        ('cancelled', 'cancelled canceled cancel'),
        ('checked_in', 'checked in check in arrived'),
        ('no_show', 'no show'),
        ('completed', 'completed complete')) as w(key, words)
      union all select 'x:' || w.action, replace(replace(w.action, '.', ' '), '_', ' ')
        from unnest(array[
          'auth.sign_in', 'request.create', 'request.status_change', 'request.close',
          'request.call_outcome', 'request.note', 'request.authorized_delete',
          'request.retention_delete', 'request.retention_hold', 'request.workflow_command',
          'requests.export', 'requests.print_new', 'recipients.add', 'recipients.remove',
          'recipients.toggle', 'recipients.label_update', 'staff.invite', 'staff.onboard',
          'staff.deactivate', 'staff.role', 'staff.password_reset', 'staff.tour_restart',
          'staff.tour_dismiss', 'staff.tour_complete', 'maintainers.invite', 'maintainers.cancel',
          'maintainers.revoke',
          'save_provider', 'save_location', 'save_appointment_type', 'book', 'reschedule', 'cancel',
          'check_in', 'complete', 'no_show', 'undo', 'add_provider', 'set_provider_profile',
          'set_provider_weekly_hours', 'add_time_off', 'remove_time_off', 'set_provider_types',
          'reorder_appointment_types', 'set_appointment_type_active', 'delete_appointment_type',
          'save_location_details', 'add_location_closure', 'remove_location_closure', 'create',
          'update', 'set_archived', 'link_request', 'unlink_request']) as w(action)
    )
    select coalesce(jsonb_object_agg(m.k, m.mask), '{}'::jsonb) into v_hits
    from (
      select keyed.k, bit_or(t.bit) as mask
      from keyed join t on public.portal_name_key(keyed.words) like '% ' || t.token || '%'
      group by keyed.k
    ) m;
  end if;

  with page as (
    select r.*, r.ordinality as n
    from public.portal_activity_rows(v_viewer.email, v_admin, p_categories, p_appointment_actions,
      p_provider_id, v_from, v_until, v_hits, v_full, coalesce(p_before_at, 'infinity'::timestamptz),
      coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid), p_limit + 1)
      with ordinality as r
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'source', g.source,
      'id', g.id,
      'occurredAt', g.occurred_at,
      'category', g.category,
      'action', g.action,
      'appointmentAction', g.appointment_action,
      'via', case
        when g.source = 'scheduling' and g.action = 'undo' then 'undo'
        when g.source = 'audit' and a.detail ->> 'command' = 'undo_latest_transition' then 'undo'
        when g.source = 'audit' and a.source = 'system' then 'system'
      end,
      'actorEmail', g.actor_email,
      'actorName', (select s.display_name from public.staff_profiles s where s.email = g.actor_email),
      'patientId', g.patient_id,
      'patientName', (select p.name from public.patients p where p.id = g.patient_id),
      'requestId', g.request_id,
      'requestName', (select q.name from public.requests q where q.id = g.request_id),
      'appointmentId', c.appointment_id,
      'providerId', g.provider_id,
      'providerName', (select v.name from public.scheduling_providers v where v.id = g.provider_id),
      'priorProviderId', g.prior_provider_id,
      'priorProviderName', (select v.name from public.scheduling_providers v where v.id = g.prior_provider_id),
      'locationId', g.location_id,
      'locationName', (select l.name from public.scheduling_locations l where l.id = g.location_id),
      'appointmentTypeId', g.appointment_type_id,
      'appointmentTypeName', (select y.name from public.appointment_types y where y.id = g.appointment_type_id),
      'appointmentStart', case when c.entity = 'appointment'
        then coalesce(c.after_record, c.before_record) -> 'starts_at' end,
      'priorAppointmentStart', case when c.entity = 'appointment'
        and c.before_record -> 'starts_at' is distinct from c.after_record -> 'starts_at'
        then c.before_record -> 'starts_at' end,
      'subjectStaffName', (select s.display_name from public.staff_profiles s where s.id = g.subject_staff_id),
      'recipientEmail', (select n.email from public.notification_recipients n where n.id = g.recipient_id),
      'entity', coalesce(a.entity, c.entity, 'patient'),
      'entityId', coalesce(a.entity_id, c.entity_id, pr.patient_id),
      'detail', a.detail,
      'before', coalesce(c.before_record, pr.before_record),
      'after', coalesce(c.after_record, pr.after_record)
    ) order by g.n) filter (where g.n <= p_limit), '[]'::jsonb),
    count(*),
    (select jsonb_build_object('occurredAt', l.occurred_at, 'id', l.id) from page l where l.n = p_limit)
  into v_rows, v_count, v_last
  from page g
  left join public.audit_log a on g.source = 'audit' and a.id = g.id
  left join public.scheduling_changes c on g.source = 'scheduling' and c.id = g.id
  left join public.patient_revisions pr on g.source = 'patient' and pr.id = g.id;

  -- The first page says how many rows the viewer could see that the filters hide. Unfiltered,
  -- nothing is hidden and nothing needs counting.
  if p_before_at is null then
    if p_categories is null and p_appointment_actions is null and p_provider_id is null
      and p_from is null and p_to is null and v_tokens is null then
      v_counts := jsonb_build_object('hidden', 0);
    else
      select count(*) into v_total from public.portal_activity_rows(v_viewer.email, v_admin, null,
        null, null, '-infinity', 'infinity', null, null, 'infinity',
        'ffffffff-ffff-ffff-ffff-ffffffffffff', null);
      select count(*) into v_matching from public.portal_activity_rows(v_viewer.email, v_admin,
        p_categories, p_appointment_actions, p_provider_id, v_from, v_until, v_hits, v_full,
        'infinity', 'ffffffff-ffff-ffff-ffff-ffffffffffff', null);
      v_counts := jsonb_build_object('hidden', v_total - v_matching);
    end if;
  end if;

  return jsonb_build_object('ok', true,
    'rows', v_rows,
    'nextCursor', case when v_count > p_limit then v_last end,
    'counts', v_counts);
end;
$$;

-- The month summary; only the day's bookedShare changes.
create or replace function public.portal_schedule_month_summary(
  p_actor_id uuid, p_month date, p_location_id uuid default null, p_appointment_type_id uuid default null
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  v_now timestamptz := statement_timestamp();
  v_today date := (statement_timestamp() at time zone 'America/New_York')::date;
  v_type public.appointment_types%rowtype;
  v_last date;
  v_month_start timestamptz;
  v_month_end timestamptz;
  v_result jsonb;
begin
  if not exists(select 1 from public.staff_profiles where user_id=p_actor_id and active and onboarded_at is not null) then
    return jsonb_build_object('ok',false,'code','unauthorized');
  end if;
  if p_month is null or not isfinite(p_month) or p_month<>date_trunc('month',p_month)::date
    or p_month<date '2000-01-01' or p_month>date '2199-12-01' then
    return jsonb_build_object('ok',false,'code','invalid_command');
  end if;
  if p_location_id is not null and not exists(
    select 1 from public.scheduling_locations where id=p_location_id and active) then
    return jsonb_build_object('ok',false,'code','location_unavailable');
  end if;
  -- The reference type is the shortest active type; the earliest created wins a tie.
  select * into v_type from public.appointment_types
    where active and (p_appointment_type_id is null or id=p_appointment_type_id)
    order by duration_minutes, created_at, id limit 1;
  if not found then return jsonb_build_object('ok',false,'code','type_unavailable'); end if;

  v_last:=(p_month+interval '1 month'-interval '1 day')::date;
  v_month_start:=p_month::timestamp at time zone 'America/New_York';
  v_month_end:=(v_last+1)::timestamp at time zone 'America/New_York';

  with providers as (
    select id,name,sort_order from public.scheduling_providers where active and bookable
  ), locations as (
    select id,name from public.scheduling_locations where active and (p_location_id is null or id=p_location_id)
  ), days as (
    select d::date as day from generate_series(p_month::timestamp,v_last::timestamp,interval '1 day') d
  ), provider_working as (
    select w.provider_id,w.day,range_agg(r) as working,
      jsonb_agg(distinct l.name) as location_names
    from public.portal_schedule_working(p_month,v_last,null,p_location_id) w
    cross join lateral unnest(w.working) as r
    join locations l on l.id=w.location_id
    group by w.provider_id,w.day
  ), provider_minutes as (
    select pw.provider_id,pw.day,pw.location_names,
      (select sum(extract(epoch from upper(r)-lower(r)))/60 from unnest(pw.working) r) as minutes
    from provider_working pw
  ), slots as (
    select o.provider_id,o.day,o.starts_at
    from public.portal_schedule_greedy_opens(p_month,v_last,null,p_location_id,p_appointment_type_id) o
  ), provider_rows as (
    select pm.day,
      sum(pm.minutes) as working_minutes,
      sum((select count(*) from slots s where s.provider_id=pm.provider_id and s.day=pm.day)) as open,
      jsonb_agg(jsonb_build_object(
        'id',p.id,'name',p.name,
        'locations',(select jsonb_agg(n order by n) from jsonb_array_elements_text(pm.location_names) n),
        'open',(select count(*) from slots s where s.provider_id=pm.provider_id and s.day=pm.day),
        'firstOpen',coalesce((select jsonb_agg(x.starts_at order by x.starts_at) from (
          select s.starts_at from slots s where s.provider_id=pm.provider_id and s.day=pm.day
          order by s.starts_at limit 2) x),'[]'::jsonb))
        order by p.sort_order,lower(p.name),p.id) as providers
    from provider_minutes pm join providers p on p.id=pm.provider_id
    where pm.minutes>0
    group by pm.day
  ), visits as (
    select (a.starts_at at time zone 'America/New_York')::date as day,
      count(*) filter (where a.status in ('scheduled','checked_in','completed','no_show')
        and p.id is not null and l.id is not null) as booked,
      coalesce(sum(extract(epoch from a.reserved_until-a.reserved_from)/60) filter (
        where a.status in ('scheduled','checked_in','completed','no_show')
        and p.id is not null and l.id is not null),0) as reserved_minutes,
      count(*) filter (where a.status in ('checked_in','completed')) as seen
    from public.appointments a
    left join providers p on p.id=a.provider_id
    left join locations l on l.id=a.location_id
    where a.starts_at>=v_month_start and a.starts_at<v_month_end
      and (p_location_id is null or a.location_id=p_location_id)
    group by 1
  )
  select jsonb_build_object('ok',true,'observedAt',v_now,'today',v_today,
    'month',to_char(p_month,'YYYY-MM'),'timeZone','America/New_York',
    'referenceType',jsonb_build_object('id',v_type.id,'name',v_type.name,
      'durationMinutes',v_type.duration_minutes,'bufferBeforeMinutes',v_type.buffer_before_minutes,
      'bufferAfterMinutes',v_type.buffer_after_minutes,'version',v_type.version),
    'days',jsonb_agg(case
      when coalesce(pr.working_minutes,0)=0 then jsonb_build_object('date',dy.day,'status','closed',
        'open',null,'bookedShare',null,'seen',null)
      when dy.day<v_today then jsonb_build_object('date',dy.day,'status','past',
        'open',null,'bookedShare',null,'seen',coalesce(v.seen,0))
      else jsonb_build_object('date',dy.day,
        'status',case when pr.open=0 then 'full' else 'open' end,
        'open',pr.open,
        'bookedShare',case when pr.open=0 then 1 else
          round(coalesce(v.booked,0)::numeric/(coalesce(v.booked,0)+pr.open),4) end,
        'seen',null,
        'booked',coalesce(v.booked,0),
        'capacity',coalesce(v.booked,0)+pr.open,
        'providers',pr.providers)
    end order by dy.day))
  into v_result
  from days dy
  left join provider_rows pr on pr.day=dy.day
  left join visits v on v.day=dy.day;
  return v_result;
end;
$$;

-- The search; only the shortest phone query changes.
create or replace function public.portal_find_people(
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
  if char_length(v_query) < 2 or (v_tokens is null and char_length(coalesce(v_digits, '')) < 2)
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
