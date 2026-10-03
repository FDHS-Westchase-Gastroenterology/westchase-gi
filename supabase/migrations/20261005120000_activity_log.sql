-- The Activity log (issue #357).
--
-- One read merges the three histories the portal writes into a single newest-first stream: the
-- audit log, the scheduling changes (appointments and the schedule's configuration) and the patient
-- revisions. Every row carries a category the log filters on and the subject it is about, so the
-- page phrases and expands a row without another read. Paging is a keyset on (occurred_at, id).
--
-- The audit log also mirrors every appointment, scheduling and patient command
-- ('appointment.*', 'scheduling.*', 'patient.*'). The richer source row is the one the log shows,
-- so those mirrors, and every action the log has no sentence for, are left out of the stream; a
-- shown row still carries its source row's detail for the Technical record.
--
-- Who sees what is decided here from the viewer's own staff profile, never from the caller:
-- front desk sees appointments, requests, the schedule and their own sign-ins; an admin sees
-- everything, including every sign-in and the settings and staff changes.

-- Only the audit actions the log can phrase; the far more numerous command mirrors stay out.
-- portal_activity_rows repeats this list so the planner can use the index.
create index audit_log_activity_idx on public.audit_log (at desc, id desc) where action in (
    'auth.sign_in', 'request.create', 'request.status_change', 'request.close',
    'request.call_outcome', 'request.note', 'request.authorized_delete', 'request.retention_delete',
    'request.retention_hold', 'request.workflow_command', 'requests.export', 'requests.print_new',
    'recipients.add', 'recipients.remove', 'recipients.toggle', 'recipients.label_update',
    'staff.invite', 'staff.onboard', 'staff.deactivate', 'staff.role', 'staff.password_reset',
    'staff.tour_restart', 'staff.tour_complete', 'maintainers.invite', 'maintainers.cancel',
    'maintainers.revoke');
create index scheduling_changes_occurred_idx on public.scheduling_changes (occurred_at desc, id desc);
create index patient_revisions_occurred_idx on public.patient_revisions (occurred_at desc, id desc);

-- The merged stream, filtered and ordered, as light rows: what a row is and whom it is about.
-- Every bound is applied unconditionally (an absent one is infinite). Each source is filtered,
-- ordered and limited on its own so it walks its (occurred_at, id) index newest first and stops
-- once it has a page; the outer sort then merges at most three pages. Search arrives resolved:
-- p_hits maps each key a row can carry (an actor email, a patient, request, provider, location,
-- appointment type, staff or recipient id, and 'c:'/'a:'/'x:' category, appointment-action and
-- action words) to the bitmask of search tokens it matches; a row matches when its keys together
-- cover p_full, every token.
create function public.portal_activity_rows(
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
              'staff.tour_restart', 'staff.tour_complete', 'maintainers.invite', 'maintainers.cancel',
              'maintainers.revoke') then 'settings'
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
          'staff.tour_restart', 'staff.tour_complete', 'maintainers.invite', 'maintainers.cancel',
          'maintainers.revoke')
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
revoke execute on function public.portal_activity_rows(text, boolean, text[], text[], uuid, timestamptz,
  timestamptz, jsonb, integer, timestamptz, uuid, integer) from public, anon, authenticated;
grant execute on function public.portal_activity_rows(text, boolean, text[], text[], uuid, timestamptz,
  timestamptz, jsonb, integer, timestamptz, uuid, integer) to service_role;

-- One page of the log, newest first. Dates are inclusive practice-local days. The first page
-- (no cursor) also counts the rows the viewer may see and how many of them the filters hide.
create function public.portal_read_activity(
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
          'staff.tour_complete', 'maintainers.invite', 'maintainers.cancel', 'maintainers.revoke',
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
revoke execute on function public.portal_read_activity(uuid, text[], text[], uuid, date, date, text,
  timestamptz, uuid, integer) from public, anon, authenticated;
grant execute on function public.portal_read_activity(uuid, text[], text[], uuid, date, date, text,
  timestamptz, uuid, integer) to service_role;

notify pgrst, 'reload schema';
