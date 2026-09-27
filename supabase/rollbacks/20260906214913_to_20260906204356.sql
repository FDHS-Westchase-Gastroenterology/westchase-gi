-- Used registries are corrected forward. Keep the shared pg_trgm extension installed.
do $$ begin
  if exists (select 1 from public.patients) then
    raise exception 'Patient registry contains records; rollback would discard patient information'
      using errcode = '55000';
  end if;
end $$;

drop function public.portal_read_patient(uuid, uuid, bigint, uuid);
drop function public.portal_search_patients(uuid, text, boolean, integer, text, uuid);
drop function public.portal_execute_patient_command(uuid, uuid, text, jsonb);
drop table public.patient_command_receipts;
drop table public.patient_revisions;
drop table public.patient_request_links;
drop table public.patients;
notify pgrst, 'reload schema';
