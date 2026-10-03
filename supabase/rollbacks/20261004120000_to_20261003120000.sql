-- Reverses 20261004120000_patient_search: restores the patient read without its appointments,
-- then removes the people search, its name key and the indexes that serve it.

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
        (select request_id from links_visible order by request_id desc limit 1) else null end)) into v_result;
  return v_result;
end;
$$;

drop function public.portal_find_people(uuid, text, integer);
drop index public.requests_open_phone_digits_idx;
drop index public.requests_open_name_key_idx;
drop index public.patients_name_key_idx;
drop function public.portal_name_key(text);
drop extension if exists unaccent;

notify pgrst, 'reload schema';
