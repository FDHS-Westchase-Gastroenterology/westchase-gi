-- A populated clinical module requires a reviewed export/restore plan, never silent deletion.
do $$ begin
  if exists(select 1 from public.patient_clinical_records) or exists(select 1 from public.clinical_signers) then
    raise exception 'Clinical records or signer permissions exist; rollback requires an explicit data-preservation plan';
  end if;
end $$;
drop function public.portal_list_clinical_signers(uuid,uuid,integer);
drop function public.portal_read_clinical_record(uuid,uuid,bigint);
drop function public.portal_list_patient_clinical_records(uuid,uuid,text,text,text,integer,timestamptz,uuid);
drop function public.portal_execute_clinical_command(uuid,uuid,text,jsonb);
drop trigger patient_clinical_records_preserve on public.patient_clinical_records;
drop function public.portal_preserve_clinical_record();
drop table public.clinical_command_receipts;
drop table public.patient_clinical_revisions;
drop table public.patient_clinical_records;
drop table public.clinical_signers;
notify pgrst,'reload schema';
