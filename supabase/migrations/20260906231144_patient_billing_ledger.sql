create table public.patient_billing_accounts (
  patient_id uuid primary key references public.patients(id) on delete restrict,
  currency text not null default 'USD' check (currency='USD'),
  balance_cents bigint not null default 0 check (balance_cents between -9007199254740991 and 9007199254740991),
  version bigint not null default 0 check (version between 0 and 9007199254740991),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.patient_billing_entries (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patient_billing_accounts(patient_id) on delete cascade,
  appointment_id uuid,
  kind text not null check (kind in ('charge','payment','refund','adjustment','reversal')),
  amount_cents bigint not null check (amount_cents<>0 and amount_cents between -9007199254740991 and 9007199254740991),
  resulting_balance_cents bigint not null check (resulting_balance_cents between -9007199254740991 and 9007199254740991),
  version bigint not null check (version between 1 and 9007199254740991),
  description text not null check (description=btrim(description) and char_length(description) between 1 and 500),
  service_date date check (service_date>=date '0001-01-01' and isfinite(service_date)),
  payment_method text check (payment_method in ('cash','check','card','transfer','external','other')),
  external_reference text check (external_reference=btrim(external_reference) and char_length(external_reference) between 1 and 120),
  source_entry_id uuid,
  actor_id uuid not null,
  actor_email text not null,
  occurred_at timestamptz not null default now(),
  unique(id,patient_id),
  unique(patient_id,version),
  foreign key(appointment_id,patient_id) references public.appointments(id,patient_id) on delete restrict,
  foreign key(source_entry_id,patient_id) references public.patient_billing_entries(id,patient_id) on delete cascade,
  check (
    (kind='charge' and amount_cents>0 and service_date is not null and payment_method is null and source_entry_id is null)
    or (kind='payment' and amount_cents<0 and service_date is null and payment_method is not null and source_entry_id is null)
    or (kind='refund' and amount_cents>0 and service_date is null and payment_method is not null and source_entry_id is not null)
    or (kind='adjustment' and service_date is null and payment_method is null and source_entry_id is null)
    or (kind='reversal' and service_date is null and payment_method is null and external_reference is null and source_entry_id is not null)
  )
);
create index patient_billing_entries_appointment_idx on public.patient_billing_entries(appointment_id,patient_id);
create index patient_billing_entries_source_idx on public.patient_billing_entries(source_entry_id,patient_id);
create unique index patient_billing_entries_one_reversal_idx on public.patient_billing_entries(source_entry_id) where kind='reversal';

create table public.patient_billing_receipts (
  idempotency_key uuid primary key,
  patient_id uuid not null references public.patient_billing_accounts(patient_id) on delete cascade,
  entry_id uuid not null unique references public.patient_billing_entries(id) on delete cascade,
  actor_id uuid not null,
  fingerprint text not null check (fingerprint~'^[a-f0-9]{64}$'),
  result jsonb not null,
  created_at timestamptz not null default now()
);
create index patient_billing_receipts_patient_idx on public.patient_billing_receipts(patient_id);

alter table public.patient_billing_accounts enable row level security;
alter table public.patient_billing_entries enable row level security;
alter table public.patient_billing_receipts enable row level security;
revoke all on public.patient_billing_accounts,public.patient_billing_entries,public.patient_billing_receipts
  from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.patient_billing_accounts to service_role;
grant select,insert on public.patient_billing_entries,public.patient_billing_receipts to service_role;

create function public.portal_execute_billing_command(
  p_actor_id uuid,p_idempotency_key uuid,p_fingerprint text,p_command jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_staff public.staff_profiles%rowtype;
  v_account public.patient_billing_accounts%rowtype;
  v_receipt public.patient_billing_receipts%rowtype;
  v_source public.patient_billing_entries%rowtype;
  v_patient_id uuid;
  v_appointment_id uuid;
  v_source_id uuid;
  v_kind text;
  v_description text;
  v_method text;
  v_reference text;
  v_date date;
  v_amount bigint;
  v_delta bigint;
  v_balance numeric;
  v_refunded numeric;
  v_expected bigint;
  v_entry_id uuid;
  v_now timestamptz;
  v_result jsonb;
begin
  select * into v_staff from public.staff_profiles where user_id=p_actor_id and active and onboarded_at is not null for share;
  if not found then return jsonb_build_object('ok',false,'code','unauthorized'); end if;
  if p_idempotency_key is null or p_fingerprint is null or p_fingerprint!~'^[a-f0-9]{64}$'
    or jsonb_typeof(p_command) is distinct from 'object' then
    return jsonb_build_object('ok',false,'code','invalid_command');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('wgi:billing:receipt:'||p_idempotency_key::text,0));
  select * into v_receipt from public.patient_billing_receipts where idempotency_key=p_idempotency_key;
  if found then
    if v_receipt.actor_id<>p_actor_id or v_receipt.fingerprint<>p_fingerprint then
      return jsonb_build_object('ok',false,'code','idempotency_conflict');
    end if;
    -- Permission changes also apply to privileged commands being retried.
    if v_staff.role<>'admin' and exists(select 1 from public.patient_billing_entries
      where id=v_receipt.entry_id and kind in ('refund','adjustment','reversal')) then
      return jsonb_build_object('ok',false,'code','forbidden');
    end if;
    return v_receipt.result;
  end if;
  v_kind:=p_command->>'kind';
  if v_kind is null or v_kind not in ('charge','payment','refund','adjustment','reverse')
    or not (p_command ?& array['kind','patientId','expectedVersion','description'])
    or jsonb_typeof(p_command->'patientId') is distinct from 'string'
    or jsonb_typeof(p_command->'expectedVersion') is distinct from 'number'
    or jsonb_typeof(p_command->'description') is distinct from 'string' then
    return jsonb_build_object('ok',false,'code','invalid_command');
  end if;
  if v_kind in ('refund','adjustment','reverse') and v_staff.role<>'admin' then
    return jsonb_build_object('ok',false,'code','forbidden');
  end if;
  v_patient_id:=(p_command->>'patientId')::uuid;
  v_expected:=(p_command->>'expectedVersion')::bigint;
  v_description:=p_command->>'description';
  if v_expected not between 0 and 9007199254740991 or char_length(v_description) not between 1 and 500
    or v_description<>btrim(v_description) then
    return jsonb_build_object('ok',false,'code','invalid_command');
  end if;
  if v_kind='reverse' then
    if not (p_command ? 'entryId') or jsonb_typeof(p_command->'entryId') is distinct from 'string'
      or p_command-array['kind','patientId','expectedVersion','description','entryId']<>'{}'::jsonb then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
    v_source_id:=(p_command->>'entryId')::uuid;
  elsif v_kind='refund' then
    if not (p_command ?& array['paymentId','amountCents','externalReference'])
      or jsonb_typeof(p_command->'paymentId') is distinct from 'string'
      or jsonb_typeof(p_command->'amountCents') is distinct from 'number'
      or jsonb_typeof(p_command->'externalReference') not in ('string','null')
      or p_command-array['kind','patientId','expectedVersion','description','paymentId','amountCents','externalReference']<>'{}'::jsonb then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
    v_source_id:=(p_command->>'paymentId')::uuid;
    v_amount:=(p_command->>'amountCents')::bigint;
    v_reference:=p_command->>'externalReference';
  else
    if not (p_command ?& array['appointmentId','amountCents','externalReference'])
      or jsonb_typeof(p_command->'appointmentId') not in ('string','null')
      or jsonb_typeof(p_command->'amountCents') is distinct from 'number'
      or jsonb_typeof(p_command->'externalReference') not in ('string','null') then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
    v_appointment_id:=(p_command->>'appointmentId')::uuid;
    v_amount:=(p_command->>'amountCents')::bigint;
    v_reference:=p_command->>'externalReference';
    if v_kind='charge' then
      if not (p_command ? 'serviceDate') or jsonb_typeof(p_command->'serviceDate') is distinct from 'string'
        or (p_command->>'serviceDate')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        or p_command-array['kind','patientId','expectedVersion','description','appointmentId','amountCents','externalReference','serviceDate']<>'{}'::jsonb then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
      v_date:=(p_command->>'serviceDate')::date;
      if v_date<date '0001-01-01' then return jsonb_build_object('ok',false,'code','invalid_command'); end if;
    elsif v_kind='payment' then
      if not (p_command ? 'method') or jsonb_typeof(p_command->'method') is distinct from 'string'
        or p_command->>'method' not in ('cash','check','card','transfer','external','other')
        or p_command-array['kind','patientId','expectedVersion','description','appointmentId','amountCents','externalReference','method']<>'{}'::jsonb then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
      v_method:=p_command->>'method';
    elsif p_command-array['kind','patientId','expectedVersion','description','appointmentId','amountCents','externalReference']<>'{}'::jsonb then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
  end if;
  if (v_kind<>'reverse' and (v_amount=0 or abs(v_amount::numeric)>9007199254740991
      or (v_kind<>'adjustment' and v_amount<0)))
    or (v_reference is not null and (v_reference<>btrim(v_reference) or char_length(v_reference) not between 1 and 120)) then
    return jsonb_build_object('ok',false,'code','invalid_command');
  end if;
  -- Billing has its own version. An archived patient's existing balance can still be settled.
  perform 1 from public.patients where id=v_patient_id for key share;
  if not found then return jsonb_build_object('ok',false,'code','patient_not_found'); end if;
  perform pg_advisory_xact_lock(hashtextextended('wgi:billing:patient:'||v_patient_id::text,0));
  select * into v_account from public.patient_billing_accounts where patient_id=v_patient_id for update;
  if (case when found then v_account.version else 0 end)<>v_expected then
    return jsonb_build_object('ok',false,'code','stale_version','currentVersion',coalesce(v_account.version,0));
  end if;
  if v_appointment_id is not null then
    perform 1 from public.appointments where id=v_appointment_id and patient_id=v_patient_id for key share;
    if not found then return jsonb_build_object('ok',false,'code','appointment_patient_mismatch'); end if;
  end if;
  if v_source_id is not null then
    select * into v_source from public.patient_billing_entries where id=v_source_id and patient_id=v_patient_id;
    if not found then return jsonb_build_object('ok',false,'code','entry_not_found'); end if;
    if exists(select 1 from public.patient_billing_entries where source_entry_id=v_source_id and kind='reversal') then
      return jsonb_build_object('ok',false,'code','entry_reversed');
    end if;
    v_appointment_id:=v_source.appointment_id;
    if v_kind='refund' then
      if v_source.kind<>'payment' then return jsonb_build_object('ok',false,'code','invalid_command'); end if;
      select coalesce(sum(e.amount_cents),0) into v_refunded from public.patient_billing_entries e
        where e.source_entry_id=v_source_id and e.kind='refund' and not exists(
          select 1 from public.patient_billing_entries r where r.kind='reversal' and r.source_entry_id=e.id);
      if v_amount>-v_source.amount_cents-v_refunded then
        return jsonb_build_object('ok',false,'code','refund_exceeds_payment');
      end if;
      v_method:=v_source.payment_method;
    else
      if v_source.kind='reversal' then return jsonb_build_object('ok',false,'code','invalid_command'); end if;
      if v_source.kind='payment' and exists(select 1 from public.patient_billing_entries e
        where e.source_entry_id=v_source_id and e.kind='refund' and not exists(
          select 1 from public.patient_billing_entries r where r.kind='reversal' and r.source_entry_id=e.id)) then
        return jsonb_build_object('ok',false,'code','payment_has_refunds');
      end if;
      v_amount:=-v_source.amount_cents;
    end if;
  end if;
  v_delta:=case when v_kind='payment' then -v_amount else v_amount end;
  v_balance:=coalesce(v_account.balance_cents,0)::numeric+v_delta;
  if abs(v_balance)>9007199254740991 or v_expected=9007199254740991 then
    return jsonb_build_object('ok',false,'code','amount_out_of_range');
  end if;
  v_now:=clock_timestamp();
  insert into public.patient_billing_accounts(patient_id,balance_cents,version,created_at,updated_at)
    values(v_patient_id,v_balance::bigint,1,v_now,v_now)
    on conflict(patient_id) do update set balance_cents=excluded.balance_cents,
      version=patient_billing_accounts.version+1,updated_at=excluded.updated_at;
  insert into public.patient_billing_entries(patient_id,appointment_id,kind,amount_cents,resulting_balance_cents,
    version,description,service_date,payment_method,external_reference,source_entry_id,actor_id,actor_email,occurred_at)
    values(v_patient_id,v_appointment_id,case when v_kind='reverse' then 'reversal' else v_kind end,
      v_delta,v_balance::bigint,v_expected+1,v_description,v_date,v_method,v_reference,v_source_id,p_actor_id,v_staff.email,v_now)
    returning id into v_entry_id;
  insert into public.audit_log(actor_email,action,entity,entity_id,source,correlation_id,detail,at)
    values(v_staff.email,'billing.'||v_kind,'patient_billing',v_patient_id,'staff',p_idempotency_key,
      jsonb_build_object('entry_id',v_entry_id,'version',v_expected+1),v_now);
  v_result:=jsonb_build_object('ok',true,'patientId',v_patient_id,'entryId',v_entry_id,'version',v_expected+1);
  insert into public.patient_billing_receipts(idempotency_key,patient_id,entry_id,actor_id,fingerprint,result,created_at)
    values(p_idempotency_key,v_patient_id,v_entry_id,p_actor_id,p_fingerprint,v_result,v_now);
  return v_result;
exception when invalid_text_representation or datetime_field_overflow or invalid_datetime_format or numeric_value_out_of_range then
  return jsonb_build_object('ok',false,'code','invalid_command');
end;
$$;
revoke execute on function public.portal_execute_billing_command(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.portal_execute_billing_command(uuid,uuid,text,jsonb) to service_role;

create function public.portal_read_patient_billing(p_actor_id uuid,p_patient_id uuid,p_before_version bigint default null)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare v_account public.patient_billing_accounts%rowtype; v_result jsonb;
begin
  if not exists(select 1 from public.staff_profiles where user_id=p_actor_id and active and onboarded_at is not null) then
    return jsonb_build_object('ok',false,'code','unauthorized');
  end if;
  if p_patient_id is null or (p_before_version is not null and p_before_version not between 1 and 9007199254740991) then
    return jsonb_build_object('ok',false,'code','invalid_command');
  end if;
  if not exists(select 1 from public.patients where id=p_patient_id) then
    return jsonb_build_object('ok',false,'code','patient_not_found');
  end if;
  select * into v_account from public.patient_billing_accounts where patient_id=p_patient_id;
  with page as (
    select e.*,(select r.id from public.patient_billing_entries r where r.source_entry_id=e.id and r.kind='reversal') reversed_by
      from public.patient_billing_entries e where e.patient_id=p_patient_id
      and (p_before_version is null or e.version<p_before_version) order by e.version desc limit 101
  ), visible as (select * from page order by version desc limit 100)
  select jsonb_build_object('ok',true,'patientId',p_patient_id,'currency','USD',
    'balanceCents',coalesce(v_account.balance_cents,0),'version',coalesce(v_account.version,0),
    'entries',jsonb_build_object('total',(select count(*) from public.patient_billing_entries where patient_id=p_patient_id),
      'items',coalesce((select jsonb_agg(to_jsonb(v) order by version desc) from visible v),'[]'::jsonb),
      'nextVersion',case when (select count(*) from page)>100 then (select min(version) from visible) else null end)) into v_result;
  return v_result;
end;
$$;
revoke execute on function public.portal_read_patient_billing(uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.portal_read_patient_billing(uuid,uuid,bigint) to service_role;

comment on table public.patient_billing_entries is 'Optional patient-owned USD ledger. Records transactions already performed elsewhere; it never processes a payment.';
notify pgrst,'reload schema';
