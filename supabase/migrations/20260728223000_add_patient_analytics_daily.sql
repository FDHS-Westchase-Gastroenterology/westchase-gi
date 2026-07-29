-- Patient-site telemetry foundation: aggregate, PHI-free daily rollups.
-- Counts are directional, not forensic. Service-role writes only.

-- Widen the shared rate-limit claim ceiling so telemetry's generous
-- {limit: 300, windowSeconds: 600} is accepted; intake still claims at 5.
create or replace function public.portal_check_intake_rate_limit(
  p_client_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := statement_timestamp();
  v_count integer;
begin
  if p_client_hash is null
    or p_client_hash !~ '^[0-9a-f]{64}$'
    or p_limit is null
    or p_limit not between 1 and 1000
    or p_window_seconds is null
    or p_window_seconds not between 1 and 3600
  then
    raise exception 'Invalid intake rate-limit claim'
      using errcode = '22023';
  end if;

  delete from private.intake_rate_limits
  where expires_at <= v_now;

  insert into private.intake_rate_limits as bucket (
    client_hash,
    request_count,
    expires_at
  ) values (
    p_client_hash,
    1,
    v_now + pg_catalog.make_interval(secs => p_window_seconds)
  )
  on conflict (client_hash) do update
  set
    request_count = case
      when bucket.expires_at <= v_now then 1
      else least(bucket.request_count + 1, p_limit + 1)
    end,
    expires_at = case
      when bucket.expires_at <= v_now
        then v_now + pg_catalog.make_interval(secs => p_window_seconds)
      else bucket.expires_at
    end
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke execute on function public.portal_check_intake_rate_limit(
  text,
  integer,
  integer
) from public, anon, authenticated;

grant execute on function public.portal_check_intake_rate_limit(
  text,
  integer,
  integer
) to service_role;

create table private.analytics_daily (
  day date not null,
  event text not null,
  route_template text not null,
  locale text not null,
  device_class text not null,
  count integer not null,
  primary key (day, event, route_template, locale, device_class),
  constraint analytics_daily_event_valid check (
    event in (
      'page_view',
      'form_view',
      'form_submit',
      'form_success',
      'form_failure',
      'form_unknown',
      'form_throttled',
      'cta_tap_call',
      'cta_tap_text',
      'cta_tap_patient_portal',
      'cta_tap_hushforms',
      'cta_tap_review',
      'chooser_shown',
      'chooser_accepted_hint',
      'chooser_switched',
      'chooser_kept_current',
      'chooser_dismissed',
      'banner_dismissed',
      'doc_download',
      'doc_request_by_text'
    )
  ),
  constraint analytics_daily_route_template_valid check (
    char_length(route_template) <= 160
    and (
      route_template ~ '^/'
      or route_template ~ '^documents:[a-z0-9-]+$'
    )
  ),
  constraint analytics_daily_locale_valid check (
    locale in ('en', 'es', 'vi', 'ko', 'ar')
  ),
  constraint analytics_daily_device_class_valid check (
    device_class in ('mobile', 'tablet', 'desktop')
  ),
  constraint analytics_daily_count_positive check (count > 0)
);

alter table private.analytics_daily enable row level security;

revoke all on table private.analytics_daily
  from public, anon, authenticated;
grant select, insert, update, delete on table private.analytics_daily
  to service_role;

create function public.portal_record_analytics_event(
  p_event text,
  p_route_template text,
  p_locale text,
  p_device_class text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_event is null
    or char_length(p_event) > 40
    or p_route_template is null
    or char_length(p_route_template) > 160
    or p_locale is null
    or char_length(p_locale) > 8
    or p_device_class is null
    or char_length(p_device_class) > 16
  then
    raise exception 'Invalid analytics event claim'
      using errcode = '22023';
  end if;

  insert into private.analytics_daily (
    day,
    event,
    route_template,
    locale,
    device_class,
    count
  ) values (
    current_date,
    p_event,
    p_route_template,
    p_locale,
    p_device_class,
    1
  )
  on conflict (day, event, route_template, locale, device_class)
  do update set count = analytics_daily.count + 1;

  return true;
end;
$$;

revoke execute on function public.portal_record_analytics_event(
  text,
  text,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.portal_record_analytics_event(
  text,
  text,
  text,
  text
) to service_role;
