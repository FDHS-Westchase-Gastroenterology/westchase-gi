-- Refuse to discard scheduling records. Export and reconcile them before a rollback.
do $$
begin
  if exists(select 1 from public.appointments)
    or exists(select 1 from public.scheduling_providers)
    or exists(select 1 from public.scheduling_locations)
    or exists(select 1 from public.appointment_types) then
    raise exception 'Scheduling records exist; rollback requires a reviewed data migration';
  end if;
end;
$$;

drop function public.portal_available_appointment_slots(uuid,uuid,uuid,date,uuid,uuid,uuid,integer);
drop function public.portal_read_appointment(uuid,uuid,bigint);
drop function public.portal_list_appointments(uuid,timestamptz,timestamptz,uuid,uuid,uuid,text[],integer,timestamptz,uuid);
drop function public.portal_read_scheduling_config(uuid,text,uuid,bigint);
drop function public.portal_scheduling_catalog(uuid,text,text,boolean,integer,text,uuid);
drop function public.portal_execute_appointment_command(uuid,uuid,text,jsonb);
drop function public.portal_save_scheduling_config(uuid,uuid,text,jsonb);
drop function public.portal_provider_schedule(uuid);
drop function public.portal_schedule_allows(uuid,timestamptz,timestamptz,jsonb,jsonb);
drop table public.scheduling_command_receipts;
drop table public.scheduling_changes;
drop table public.appointments;
drop function public.portal_preserve_appointment_patient();
alter table public.patient_request_links drop constraint patient_request_links_request_patient_unique;
drop table public.provider_time_exceptions;
drop table public.provider_hours;
drop table public.appointment_types;
drop table public.scheduling_providers;
drop table public.scheduling_locations;
-- Keep btree_gist: other features may use the shared extension.
notify pgrst,'reload schema';
