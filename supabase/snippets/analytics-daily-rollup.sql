-- private.analytics_daily — aggregate, PHI-free patient-site event counters.
-- Daily rollup rows keyed (day, event, route_template, locale, device_class).
-- Readable only via the service role or the Supabase dashboard SQL editor.
-- There is no staff UI in v1; do not expose this table through anon/authenticated
-- Data API grants. Counts are directional, not forensic.

-- Events per day (last 14 days)
select
  day,
  event,
  sum(count) as total
from private.analytics_daily
where day >= current_date - 14
group by day, event
order by day desc, total desc;

-- Form funnel for a single day
select
  event,
  sum(count) as total
from private.analytics_daily
where day = current_date
  and event in (
    'form_view',
    'form_submit',
    'form_success',
    'form_failure',
    'form_unknown',
    'form_throttled'
  )
group by event
order by total desc;

-- Top route_templates for page_view in the last 14 days
select
  route_template,
  sum(count) as total
from private.analytics_daily
where day >= current_date - 14
  and event = 'page_view'
group by route_template
order by total desc
limit 25;
