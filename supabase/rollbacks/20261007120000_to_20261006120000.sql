-- Reverses 20261007120000_provider_day_hours: removes the Hours sheet's read, its two commands and
-- their helpers, and restores the Settings read and the command list. Day-hours changes and their
-- undos leave the change history; the hours and exceptions they wrote stay, so the schedule each
-- provider works is unchanged. A reasonless unavailable range then lists as time off again.

delete from public.scheduling_changes where compensates_change_id in (
  select id from public.scheduling_changes where command='set_provider_day_hours');
delete from public.scheduling_changes where command='set_provider_day_hours';

drop function public.portal_day_hours(uuid,date);
drop function public.portal_undo_provider_day_hours(uuid,uuid,text,jsonb);
drop function public.portal_set_provider_day_hours(uuid,uuid,text,jsonb);
drop function public.portal_provider_hours_conflicts(uuid,jsonb,jsonb,timestamptz);
drop function public.portal_provider_day_past(uuid,date,timestamptz);
drop function public.portal_provider_day_windows(uuid,date);
drop function public.portal_provider_day_layer(uuid,date);

alter table public.scheduling_changes drop constraint scheduling_changes_command_check;
alter table public.scheduling_changes add constraint scheduling_changes_command_check check (command in (
  'save_provider','save_location','save_appointment_type',
  'book','reschedule','cancel','check_in','complete','no_show','undo',
  'add_provider','set_provider_profile','set_provider_weekly_hours','add_time_off','remove_time_off',
  'set_provider_types','reorder_appointment_types','set_appointment_type_active','delete_appointment_type',
  'save_location_details','add_location_closure','remove_location_closure'));

-- Everything the Settings window shows, for any active staff member. canEdit is the admin gate
-- the commands enforce; the window reads it only to hide controls.
create or replace function public.portal_scheduling_settings(p_actor_id uuid)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  v_role text;
  v_now timestamptz:=statement_timestamp();
  v_today date:=(statement_timestamp() at time zone 'America/New_York')::date;
  v_result jsonb;
begin
  select role into v_role from public.staff_profiles where user_id=p_actor_id and active and onboarded_at is not null;
  if not found then return jsonb_build_object('ok',false,'code','unauthorized'); end if;
  select jsonb_build_object('ok',true,'observedAt',v_now,'today',v_today,'timeZone','America/New_York',
    'canEdit',v_role='admin',
    'providers',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,
        'credentials',p.credentials,'bookable',p.bookable,'version',p.version,'sortOrder',p.sort_order,
        -- The week in force from today: rows that end before today are history.
        'hours',coalesce((select jsonb_agg(jsonb_build_object('id',h.id,'locationId',h.location_id,
            'weekday',h.weekday,'openMinute',h.open_minute,'closeMinute',h.close_minute,
            'validFrom',h.valid_from,'validTo',h.valid_to) order by h.weekday,h.open_minute,h.valid_from,h.id)
          from public.provider_hours h where h.provider_id=p.id and (h.valid_to is null or h.valid_to>=v_today)),'[]'::jsonb),
        'timeOff',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'startsAt',e.starts_at,'endsAt',e.ends_at,
            'locationId',e.location_id,'reason',e.reason,
            'allDay',(e.starts_at at time zone 'America/New_York')::time=time '00:00'
              and (e.ends_at at time zone 'America/New_York')::time=time '00:00') order by e.starts_at,e.id)
          from public.provider_time_exceptions e
          where e.provider_id=p.id and e.kind='unavailable' and e.ends_at>v_now),'[]'::jsonb),
        'typeIds',coalesce((select jsonb_agg(x.appointment_type_id order by t.sort_order,t.id)
          from public.appointment_type_providers x join public.appointment_types t on t.id=x.appointment_type_id
          where x.provider_id=p.id and t.archived_at is null),'[]'::jsonb))
      order by p.sort_order,lower(p.name),p.id)
      from public.scheduling_providers p where p.active),'[]'::jsonb),
    'types',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'icon',t.icon,
        'description',t.description,'durationMinutes',t.duration_minutes,
        'bufferBeforeMinutes',t.buffer_before_minutes,'bufferAfterMinutes',t.buffer_after_minutes,
        'active',t.active,'version',t.version,'sortOrder',t.sort_order,
        'providerIds',coalesce((select jsonb_agg(x.provider_id order by p.sort_order,p.id)
          from public.appointment_type_providers x join public.scheduling_providers p on p.id=x.provider_id
          where x.appointment_type_id=t.id and p.active),'[]'::jsonb),
        'used',exists(select 1 from public.appointments a where a.appointment_type_id=t.id))
      order by t.sort_order,lower(t.name),t.id)
      from public.appointment_types t where t.archived_at is null),'[]'::jsonb),
    'locations',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'name',l.name,'version',l.version,
        'street',l.street,'city',l.city,'region',l.region,'postal',l.postal,'mapsQuery',l.maps_query,
        'requestLocation',l.request_location,
        'hours',coalesce((select jsonb_agg(jsonb_build_object('weekday',h.weekday,
            'openMinute',h.open_minute,'closeMinute',h.close_minute) order by h.weekday)
          from public.location_hours h where h.location_id=l.id),'[]'::jsonb),
        'closures',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'closedOn',c.closed_on,'note',c.note)
            order by c.closed_on)
          from public.location_closures c where c.location_id=l.id and c.closed_on>=v_today),'[]'::jsonb),
        'providerIds',coalesce((select jsonb_agg(p.id order by p.sort_order,p.id)
          from public.scheduling_providers p where p.active and exists(select 1 from public.provider_hours h
            where h.provider_id=p.id and h.location_id=l.id and (h.valid_to is null or h.valid_to>=v_today))),'[]'::jsonb))
      order by l.name,l.id)
      from public.scheduling_locations l where l.active),'[]'::jsonb))
  into v_result;
  return v_result;
end;
$$;
revoke execute on function public.portal_scheduling_settings(uuid) from public,anon,authenticated;
grant execute on function public.portal_scheduling_settings(uuid) to service_role;

notify pgrst,'reload schema';
