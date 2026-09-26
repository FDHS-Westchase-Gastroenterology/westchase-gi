create or replace function public.portal_prepare_new_request_print_packet(p_actor_email text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_actor_email is null
    or p_actor_email = ''
    or p_actor_email <> pg_catalog.btrim(p_actor_email)
    or pg_catalog.char_length(p_actor_email) > 254
  then
    raise exception 'Actor email must be 1-254 trimmed characters'
      using errcode = '22023';
  end if;

  return (
    with packet as materialized (
      select
        request.id,
        request.name,
        request.phone,
        request.email,
        request.location,
        request.preferred_time,
        request.message,
        request.locale,
        request.source_path,
        request.created_at
      from public.requests as request
      where request.status = 'new'
    ),
    snapshot as materialized (
      select
        pg_catalog.statement_timestamp() as generated_at,
        coalesce(
          pg_catalog.jsonb_agg(
            pg_catalog.jsonb_build_object(
              'id', packet.id,
              'name', packet.name,
              'phone', packet.phone,
              'email', packet.email,
              'location', packet.location,
              'preferred_time', packet.preferred_time,
              'message', packet.message,
              'locale', packet.locale,
              'source_path', packet.source_path,
              'created_at', packet.created_at
            ) order by packet.created_at asc, packet.id asc
          ),
          '[]'::jsonb
        ) as requests,
        pg_catalog.count(*) as row_count
      from packet
    ),
    audit as (
      insert into public.audit_log (
        actor_email,
        action,
        entity,
        entity_id,
        source,
        correlation_id,
        detail
      )
      select
        p_actor_email,
        'requests.print_new',
        'requests',
        null,
        'staff',
        pg_catalog.gen_random_uuid(),
        pg_catalog.jsonb_build_object(
          'row_count', snapshot.row_count,
          'status_filter', 'new'
        )
      from snapshot
      returning id
    )
    select pg_catalog.jsonb_build_object(
      'generated_at', snapshot.generated_at,
      'requests', snapshot.requests
    )
    from snapshot
    cross join audit
  );
end;
$$;

revoke execute on function public.portal_prepare_new_request_print_packet(text)
from public, anon, authenticated;
grant execute on function public.portal_prepare_new_request_print_packet(text)
to service_role;
