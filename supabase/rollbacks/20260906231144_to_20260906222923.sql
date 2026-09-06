-- Never discard a ledger through an automatic rollback.
do $$
begin
  if exists(select 1 from public.patient_billing_accounts) then
    raise exception 'Billing accounts exist; rollback requires a reviewed data migration';
  end if;
end;
$$;
drop function public.portal_read_patient_billing(uuid,uuid,bigint);
drop function public.portal_execute_billing_command(uuid,uuid,text,jsonb);
drop table public.patient_billing_receipts;
drop table public.patient_billing_entries;
drop table public.patient_billing_accounts;
notify pgrst,'reload schema';
