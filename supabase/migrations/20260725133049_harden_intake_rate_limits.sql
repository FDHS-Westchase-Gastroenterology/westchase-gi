alter table public.requests
  add constraint requests_name_length
    check (char_length(name) <= 120),
  add constraint requests_phone_length
    check (char_length(phone) <= 32),
  add constraint requests_email_length
    check (email is null or char_length(email) <= 254);

create table private.intake_rate_limits (
  client_hash text primary key
    constraint intake_rate_limits_client_hash_valid
      check (client_hash ~ '^[0-9a-f]{64}$'),
  request_count integer not null
    constraint intake_rate_limits_request_count_positive
      check (request_count > 0),
  expires_at timestamptz not null
);

create index intake_rate_limits_expires_at_idx
  on private.intake_rate_limits (expires_at);

alter table private.intake_rate_limits enable row level security;

revoke all on table private.intake_rate_limits
  from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update, delete on table private.intake_rate_limits
  to service_role;

create function public.portal_check_intake_rate_limit(
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
    or p_limit not between 1 and 100
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
