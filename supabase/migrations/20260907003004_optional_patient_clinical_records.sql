-- Clinical records are optional, independent children of a registered patient.
-- Signing is explicitly assigned; scheduling roles never imply clinical authority.
create table public.clinical_signers (
  user_id uuid primary key references public.staff_profiles(user_id) on delete cascade,
  enabled boolean not null,
  version bigint not null default 1 check(version between 1 and 9007199254740991),
  configured_by uuid not null,
  configured_at timestamptz not null default now()
);

create table public.patient_clinical_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  appointment_id uuid,
  record_kind text not null check(record_kind in ('note','document_reference')),
  title text not null check(title=btrim(title) and char_length(title) between 1 and 120),
  service_date date check(service_date>=date '0001-01-01' and isfinite(service_date)),
  note_text text,
  document_source text,
  document_reference text,
  document_sha256 text check(document_sha256~'^[a-f0-9]{64}$'),
  status text not null default 'draft' check(status in ('draft','signed','entered_in_error')),
  amends_id uuid,
  amends_version bigint,
  version bigint not null default 1 check(version between 1 and 9007199254740991),
  author_id uuid not null,
  author_email text not null,
  signed_by uuid,
  signed_by_email text,
  signed_at timestamptz,
  error_reason text check(error_reason=btrim(error_reason) and char_length(error_reason) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid not null,
  unique(id,patient_id),
  foreign key(appointment_id,patient_id) references public.appointments(id,patient_id) on delete restrict,
  foreign key(amends_id,patient_id) references public.patient_clinical_records(id,patient_id) on delete restrict,
  check((amends_id is null and amends_version is null) or (amends_id is not null and amends_version is not null and amends_version between 1 and 9007199254740991)),
  check(amends_id is distinct from id),
  check(
    (record_kind='note' and note_text is not null and char_length(note_text)<=20000
      and document_source is null and document_reference is null and document_sha256 is null)
    or (record_kind='document_reference' and note_text is null
      and document_source is not null and document_source=btrim(document_source) and char_length(document_source) between 1 and 120
      and document_reference is not null and document_reference=btrim(document_reference) and char_length(document_reference) between 1 and 200)
  ),
  check((signed_at is null and signed_by is null and signed_by_email is null)
    or (signed_at is not null and signed_by is not null and signed_by_email is not null and signed_by=author_id)),
  check((status='draft' and signed_at is null and error_reason is null)
    or (status='signed' and signed_at is not null and error_reason is null and (record_kind<>'note' or note_text~'[^[:space:]]'))
    or (status='entered_in_error' and error_reason is not null))
);
create index patient_clinical_records_patient_idx on public.patient_clinical_records(patient_id,created_at desc,id);
create index patient_clinical_records_appointment_idx on public.patient_clinical_records(appointment_id,patient_id);
create index patient_clinical_records_amends_idx on public.patient_clinical_records(amends_id,patient_id);
create unique index patient_clinical_records_one_amendment_idx on public.patient_clinical_records(amends_id)
  where amends_id is not null and status<>'entered_in_error';

create table public.patient_clinical_revisions (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.patient_clinical_records(id) on delete cascade,
  version bigint not null check(version between 1 and 9007199254740991),
  command text not null check(command in ('create','update_draft','sign','amend','enter_in_error')),
  before_record jsonb,
  after_record jsonb not null,
  actor_id uuid not null,
  actor_email text not null,
  occurred_at timestamptz not null default now(),
  unique(record_id,version)
);
create table public.clinical_command_receipts (
  idempotency_key uuid primary key,
  record_id uuid references public.patient_clinical_records(id) on delete cascade,
  signer_user_id uuid references public.clinical_signers(user_id) on delete cascade,
  actor_id uuid not null,
  fingerprint text not null check(fingerprint~'^[a-f0-9]{64}$'),
  command text not null check(command in ('create','update_draft','sign','amend','enter_in_error','set_signer')),
  result jsonb not null,
  created_at timestamptz not null default now(),
  check((command='set_signer' and signer_user_id is not null and record_id is null)
    or (command<>'set_signer' and record_id is not null and signer_user_id is null))
);
create index clinical_command_receipts_record_idx on public.clinical_command_receipts(record_id);
create index clinical_command_receipts_signer_idx on public.clinical_command_receipts(signer_user_id);

alter table public.clinical_signers enable row level security;
alter table public.patient_clinical_records enable row level security;
alter table public.patient_clinical_revisions enable row level security;
alter table public.clinical_command_receipts enable row level security;
revoke all on public.clinical_signers,public.patient_clinical_records,public.patient_clinical_revisions,public.clinical_command_receipts
  from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.clinical_signers,public.patient_clinical_records to service_role;
grant select,insert on public.patient_clinical_revisions,public.clinical_command_receipts to service_role;

create function public.portal_preserve_clinical_record() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if (new.patient_id,new.appointment_id,new.record_kind,new.amends_id,new.amends_version,new.author_id,new.author_email,new.created_at)
    is distinct from (old.patient_id,old.appointment_id,old.record_kind,old.amends_id,old.amends_version,old.author_id,old.author_email,old.created_at) then
    raise exception using errcode='23514',constraint='clinical_record_ownership_immutable',message='Clinical record ownership cannot change';
  end if;
  if new.version<>old.version+1 or old.status='entered_in_error'
    or (old.status='signed' and (new.status<>'entered_in_error'
      or (new.title,new.service_date,new.note_text,new.document_source,new.document_reference,new.document_sha256,new.signed_by,new.signed_by_email,new.signed_at)
        is distinct from (old.title,old.service_date,old.note_text,old.document_source,old.document_reference,old.document_sha256,old.signed_by,old.signed_by_email,old.signed_at))) then
    raise exception using errcode='23514',constraint='clinical_signed_content_immutable',message='Signed clinical content must be corrected through an amendment';
  end if;
  return new;
end;
$$;
revoke execute on function public.portal_preserve_clinical_record() from public,anon,authenticated;
create trigger patient_clinical_records_preserve before update on public.patient_clinical_records
  for each row execute function public.portal_preserve_clinical_record();

create function public.portal_execute_clinical_command(
  p_actor_id uuid,p_idempotency_key uuid,p_fingerprint text,p_command jsonb
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  v_staff public.staff_profiles%rowtype;
  v_signer public.clinical_signers%rowtype;
  v_receipt public.clinical_command_receipts%rowtype;
  v_current public.patient_clinical_records%rowtype;
  v_parent public.patient_clinical_records%rowtype;
  v_record public.patient_clinical_records%rowtype;
  v_kind text; v_id uuid; v_patient_id uuid; v_appointment_id uuid; v_user_id uuid;
  v_expected bigint; v_enabled boolean; v_can_sign boolean; v_before jsonb; v_content jsonb;
  v_record_kind text; v_title text; v_date date; v_text text; v_source text; v_reference text; v_sha256 text;
  v_reason text; v_now timestamptz; v_result jsonb; v_constraint text;
begin
  select * into v_staff from public.staff_profiles
    where user_id=p_actor_id and active and onboarded_at is not null for share;
  if not found then return jsonb_build_object('ok',false,'code','unauthorized'); end if;
  if p_idempotency_key is null or p_fingerprint is null or p_fingerprint!~'^[a-f0-9]{64}$'
    or jsonb_typeof(p_command) is distinct from 'object' then
    return jsonb_build_object('ok',false,'code','invalid_command');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('wgi:clinical:receipt:'||p_idempotency_key::text,0));
  select * into v_receipt from public.clinical_command_receipts where idempotency_key=p_idempotency_key;
  if found then
    if v_receipt.actor_id<>p_actor_id or v_receipt.fingerprint<>p_fingerprint then
      return jsonb_build_object('ok',false,'code','idempotency_conflict');
    end if;
    if v_receipt.command='set_signer' and v_staff.role<>'admin' then
      return jsonb_build_object('ok',false,'code','forbidden');
    end if;
    if v_receipt.command='sign' then
      select enabled into v_can_sign from public.clinical_signers where user_id=p_actor_id for share;
      if not coalesce(v_can_sign,false) then return jsonb_build_object('ok',false,'code','signing_not_enabled'); end if;
    end if;
    if v_receipt.command='enter_in_error' and v_staff.role<>'admin' then
      select * into v_record from public.patient_clinical_records where id=v_receipt.record_id;
      if v_record.signed_at is not null then
        select enabled into v_can_sign from public.clinical_signers where user_id=p_actor_id for share;
      end if;
      if v_record.author_id<>p_actor_id or (v_record.signed_at is not null and not coalesce(v_can_sign,false)) then
        return jsonb_build_object('ok',false,'code','forbidden');
      end if;
    end if;
    return v_receipt.result;
  end if;
  v_kind:=p_command->>'kind';
  if v_kind is null or v_kind not in ('set_signer','create','update_draft','sign','amend','enter_in_error') then
    return jsonb_build_object('ok',false,'code','invalid_command');
  end if;
  if v_kind='set_signer' then
    if v_staff.role<>'admin' then return jsonb_build_object('ok',false,'code','forbidden'); end if;
    if not (p_command ?& array['userId','expectedVersion','enabled'])
      or p_command-array['kind','userId','expectedVersion','enabled']<>'{}'::jsonb
      or jsonb_typeof(p_command->'userId') is distinct from 'string'
      or jsonb_typeof(p_command->'expectedVersion') is distinct from 'number'
      or jsonb_typeof(p_command->'enabled') is distinct from 'boolean' then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
    v_user_id:=(p_command->>'userId')::uuid;v_expected:=(p_command->>'expectedVersion')::bigint;
    v_enabled:=(p_command->>'enabled')::boolean;
    if v_expected not between 0 and 9007199254740990 then return jsonb_build_object('ok',false,'code','invalid_command'); end if;
    perform 1 from public.staff_profiles where user_id=v_user_id
      and (not v_enabled or (active and onboarded_at is not null)) for share;
    if not found then return jsonb_build_object('ok',false,'code','staff_unavailable'); end if;
    perform pg_advisory_xact_lock(hashtextextended('wgi:clinical:signer:'||v_user_id::text,0));
    select * into v_signer from public.clinical_signers where user_id=v_user_id for update;
    if coalesce(v_signer.version,0)<>v_expected then
      return jsonb_build_object('ok',false,'code','stale_version','currentVersion',coalesce(v_signer.version,0));
    end if;
    v_now:=clock_timestamp();
    insert into public.clinical_signers(user_id,enabled,version,configured_by,configured_at)
      values(v_user_id,v_enabled,1,p_actor_id,v_now) on conflict(user_id) do update
        set enabled=excluded.enabled,version=clinical_signers.version+1,configured_by=p_actor_id,configured_at=v_now
      returning * into v_signer;
    insert into public.audit_log(actor_email,action,entity,entity_id,source,correlation_id,detail,at)
      values(v_staff.email,'clinical.signer_permission_changed','clinical_signers',v_user_id,'staff',p_idempotency_key,
        jsonb_build_object('enabled',v_enabled,'version',v_signer.version),v_now);
    v_result:=jsonb_build_object('ok',true,'entity','signer','id',v_user_id,'version',v_signer.version);
    insert into public.clinical_command_receipts(idempotency_key,signer_user_id,actor_id,fingerprint,command,result,created_at)
      values(p_idempotency_key,v_user_id,p_actor_id,p_fingerprint,v_kind,v_result,v_now);
    return v_result;
  end if;
  if v_kind='create' then
    if not (p_command ?& array['patientId','appointmentId','content'])
      or p_command-array['kind','patientId','appointmentId','content']<>'{}'::jsonb
      or jsonb_typeof(p_command->'patientId') is distinct from 'string'
      or jsonb_typeof(p_command->'appointmentId') not in ('string','null') then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
    v_patient_id:=(p_command->>'patientId')::uuid;
    v_appointment_id:=(p_command->>'appointmentId')::uuid;
    perform 1 from public.patients where id=v_patient_id for key share;
    if not found then return jsonb_build_object('ok',false,'code','patient_not_found'); end if;
    if v_appointment_id is not null then
      perform 1 from public.appointments where id=v_appointment_id and patient_id=v_patient_id for key share;
      if not found then return jsonb_build_object('ok',false,'code','appointment_patient_mismatch'); end if;
    end if;
  else
    if not (p_command ?& array['recordId','expectedVersion'])
      or jsonb_typeof(p_command->'recordId') is distinct from 'string'
      or jsonb_typeof(p_command->'expectedVersion') is distinct from 'number'
      or (v_kind in ('update_draft','amend') and (not (p_command ? 'content')
        or p_command-array['kind','recordId','expectedVersion','content']<>'{}'::jsonb))
      or (v_kind='sign' and p_command-array['kind','recordId','expectedVersion']<>'{}'::jsonb)
      or (v_kind='enter_in_error' and (not (p_command ? 'reason')
        or jsonb_typeof(p_command->'reason') is distinct from 'string'
        or p_command-array['kind','recordId','expectedVersion','reason']<>'{}'::jsonb)) then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
    v_id:=(p_command->>'recordId')::uuid;v_expected:=(p_command->>'expectedVersion')::bigint;
    if v_expected not between 1 and 9007199254740990 then return jsonb_build_object('ok',false,'code','invalid_command'); end if;
    if v_kind='sign' or (v_kind='enter_in_error' and v_staff.role<>'admin') then
      select enabled into v_can_sign from public.clinical_signers where user_id=p_actor_id for share;
    end if;
    -- The immutable amendment parent is locked before its child, including signing and corrections.
    select * into v_current from public.patient_clinical_records where id=v_id;
    if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
    if v_current.amends_id is not null then
      select * into v_parent from public.patient_clinical_records where id=v_current.amends_id for share;
    end if;
    select * into v_current from public.patient_clinical_records where id=v_id for update;
    if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
    if v_current.version<>v_expected then
      return jsonb_build_object('ok',false,'code','stale_version','currentVersion',v_current.version);
    end if;
    v_patient_id:=v_current.patient_id;v_appointment_id:=v_current.appointment_id;
    if v_kind='amend' then
      if v_current.status<>'signed' then return jsonb_build_object('ok',false,'code','record_not_signed'); end if;
      if exists(select 1 from public.patient_clinical_records where amends_id=v_id and status<>'entered_in_error') then
        return jsonb_build_object('ok',false,'code','amendment_exists');
      end if;
    elsif v_kind in ('sign','update_draft') then
      if v_current.author_id<>p_actor_id then return jsonb_build_object('ok',false,'code','not_record_author'); end if;
      if v_current.status<>'draft' then return jsonb_build_object('ok',false,'code','record_not_draft'); end if;
      if v_kind='sign' then
        if not coalesce(v_can_sign,false) then return jsonb_build_object('ok',false,'code','signing_not_enabled'); end if;
        if v_current.record_kind='note' and v_current.note_text!~'[^[:space:]]' then
          return jsonb_build_object('ok',false,'code','empty_note');
        end if;
        if v_current.amends_id is not null and (v_parent.status<>'signed' or v_parent.version<>v_current.amends_version) then
          return jsonb_build_object('ok',false,'code','amendment_source_changed');
        end if;
      end if;
    else
      if v_current.status='entered_in_error' then return jsonb_build_object('ok',false,'code','already_entered_in_error'); end if;
      if v_staff.role<>'admin' and (v_current.author_id<>p_actor_id
        or (v_current.status='signed' and not coalesce(v_can_sign,false))) then
        return jsonb_build_object('ok',false,'code','forbidden');
      end if;
      v_reason:=p_command->>'reason';
      if v_reason<>btrim(v_reason) or char_length(v_reason) not between 1 and 500 then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
    end if;
  end if;
  if v_kind in ('create','update_draft','amend') then
    v_content:=p_command->'content';
    if jsonb_typeof(v_content) is distinct from 'object'
      or not (v_content ?& array['kind','title','serviceDate'])
      or jsonb_typeof(v_content->'kind') is distinct from 'string'
      or jsonb_typeof(v_content->'title') is distinct from 'string'
      or jsonb_typeof(v_content->'serviceDate') not in ('string','null') then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
    v_record_kind:=v_content->>'kind';v_title:=v_content->>'title';
    if v_title<>btrim(v_title) or char_length(v_title) not between 1 and 120
      or v_record_kind not in ('note','document_reference')
      or (v_kind<>'create' and v_record_kind<>v_current.record_kind) then
      return jsonb_build_object('ok',false,'code','invalid_command');
    end if;
    if (v_content->>'serviceDate') is not null then
      if v_content->>'serviceDate' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
      v_date:=(v_content->>'serviceDate')::date;
      if v_date<date '0001-01-01' or not isfinite(v_date) then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
    end if;
    if v_record_kind='note' then
      if v_content-array['kind','title','serviceDate','noteText']<>'{}'::jsonb
        or jsonb_typeof(v_content->'noteText') is distinct from 'string' then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
      v_text:=v_content->>'noteText';
      if char_length(v_text)>20000 then return jsonb_build_object('ok',false,'code','invalid_command'); end if;
    else
      if not (v_content ?& array['documentSource','documentReference','documentSha256'])
        or v_content-array['kind','title','serviceDate','documentSource','documentReference','documentSha256']<>'{}'::jsonb
        or jsonb_typeof(v_content->'documentSource') is distinct from 'string'
        or jsonb_typeof(v_content->'documentReference') is distinct from 'string'
        or jsonb_typeof(v_content->'documentSha256') not in ('string','null') then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
      v_source:=v_content->>'documentSource';v_reference:=v_content->>'documentReference';v_sha256:=v_content->>'documentSha256';
      if v_source<>btrim(v_source) or char_length(v_source) not between 1 and 120
        or v_reference<>btrim(v_reference) or char_length(v_reference) not between 1 and 200
        or (v_sha256 is not null and v_sha256!~'^[a-f0-9]{64}$') then
        return jsonb_build_object('ok',false,'code','invalid_command');
      end if;
    end if;
  end if;
  v_now:=clock_timestamp();
  if v_kind in ('create','amend') then
    v_record.id:=gen_random_uuid();v_record.patient_id:=v_patient_id;v_record.appointment_id:=v_appointment_id;
    v_record.version:=1;v_record.status:='draft';v_record.author_id:=p_actor_id;v_record.author_email:=v_staff.email;
    v_record.created_at:=v_now;
    if v_kind='amend' then v_record.amends_id:=v_current.id;v_record.amends_version:=v_current.version;end if;
  else
    v_record:=v_current;v_before:=to_jsonb(v_current);v_record.version:=v_current.version+1;
  end if;
  v_record.updated_at:=v_now;v_record.updated_by:=p_actor_id;
  if v_kind in ('create','update_draft','amend') then
    v_record.record_kind:=v_record_kind;v_record.title:=v_title;v_record.service_date:=v_date;
    v_record.note_text:=v_text;v_record.document_source:=v_source;
    v_record.document_reference:=v_reference;v_record.document_sha256:=v_sha256;
  elsif v_kind='sign' then
    v_record.status:='signed';v_record.signed_by:=p_actor_id;v_record.signed_by_email:=v_staff.email;v_record.signed_at:=v_now;
  else
    v_record.status:='entered_in_error';v_record.error_reason:=v_reason;
  end if;
  if v_kind in ('create','amend') then
    insert into public.patient_clinical_records select (v_record).*;
  else
    update public.patient_clinical_records set title=v_record.title,service_date=v_record.service_date,
      note_text=v_record.note_text,document_source=v_record.document_source,document_reference=v_record.document_reference,
      document_sha256=v_record.document_sha256,status=v_record.status,version=v_record.version,signed_by=v_record.signed_by,
      signed_by_email=v_record.signed_by_email,signed_at=v_record.signed_at,error_reason=v_record.error_reason,
      updated_at=v_now,updated_by=p_actor_id where id=v_record.id;
  end if;
  insert into public.patient_clinical_revisions(record_id,version,command,before_record,after_record,actor_id,actor_email,occurred_at)
    values(v_record.id,v_record.version,v_kind,v_before,to_jsonb(v_record),p_actor_id,v_staff.email,v_now);
  insert into public.audit_log(actor_email,action,entity,entity_id,source,correlation_id,detail,at)
    values(v_staff.email,'clinical.'||v_kind,'patient_clinical_records',v_record.id,'staff',p_idempotency_key,
      jsonb_build_object('version',v_record.version,'status',v_record.status,'amends_id',v_record.amends_id),v_now);
  v_result:=jsonb_build_object('ok',true,'entity','record','id',v_record.id,'patientId',v_patient_id,'version',v_record.version);
  insert into public.clinical_command_receipts(idempotency_key,record_id,actor_id,fingerprint,command,result,created_at)
    values(p_idempotency_key,v_record.id,p_actor_id,p_fingerprint,v_kind,v_result,v_now);
  return v_result;
exception
  when unique_violation then
    get stacked diagnostics v_constraint=constraint_name;
    if v_constraint='patient_clinical_records_one_amendment_idx' then
      return jsonb_build_object('ok',false,'code','amendment_exists');
    end if;
    raise;
  when invalid_text_representation or datetime_field_overflow or invalid_datetime_format or numeric_value_out_of_range then
    return jsonb_build_object('ok',false,'code','invalid_command');
end;
$$;
revoke execute on function public.portal_execute_clinical_command(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.portal_execute_clinical_command(uuid,uuid,text,jsonb),public.portal_preserve_clinical_record() to service_role;

create function public.portal_list_patient_clinical_records(
  p_actor_id uuid,p_patient_id uuid,p_query text default '',p_status text default null,
  p_record_kind text default null,p_limit integer default 50,
  p_after_created_at timestamptz default null,p_after_id uuid default null
) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_result jsonb;
begin
  if not exists(select 1 from public.staff_profiles where user_id=p_actor_id and active and onboarded_at is not null) then
    return jsonb_build_object('ok',false,'code','unauthorized');
  end if;
  if p_patient_id is null or p_query is null or p_query<>btrim(p_query) or char_length(p_query)>120
    or (p_status is not null and p_status not in ('draft','signed','entered_in_error'))
    or (p_record_kind is not null and p_record_kind not in ('note','document_reference'))
    or p_limit is null or p_limit not between 1 and 100
    or (p_after_created_at is null)<>(p_after_id is null)
    or (p_after_created_at is not null and not isfinite(p_after_created_at)) then
    return jsonb_build_object('ok',false,'code','invalid_query');
  end if;
  if not exists(select 1 from public.patients where id=p_patient_id) then
    return jsonb_build_object('ok',false,'code','patient_not_found');
  end if;
  with matching as materialized (
    select r.id,r.patient_id,r.appointment_id,r.record_kind,r.title,r.service_date,r.status,
      r.amends_id,r.amends_version,r.version,r.author_id,r.author_email,r.signed_by,r.signed_by_email,r.signed_at,
      r.created_at,r.updated_at,r.updated_by from public.patient_clinical_records r
      where r.patient_id=p_patient_id and (p_status is null or r.status=p_status)
        and (p_record_kind is null or r.record_kind=p_record_kind)
        and (p_query='' or strpos(lower(r.title),lower(p_query))>0)
  ), remaining as (
    select * from matching where p_after_created_at is null or created_at<p_after_created_at
      or (created_at=p_after_created_at and id>p_after_id)
  ), page as materialized (select * from remaining order by created_at desc,id limit p_limit)
  select jsonb_build_object('ok',true,'patientId',p_patient_id,'canSign',exists(
      select 1 from public.clinical_signers where user_id=p_actor_id and enabled),
    'total',(select count(*) from matching),
    'records',coalesce((select jsonb_agg(to_jsonb(p) order by created_at desc,id) from page p),'[]'::jsonb),
    'next',case when (select count(*) from remaining)>p_limit then
      (select jsonb_build_object('createdAt',created_at,'id',id) from page order by created_at,id desc limit 1)
      else null end) into v_result;
  return v_result;
end;
$$;
revoke execute on function public.portal_list_patient_clinical_records(uuid,uuid,text,text,text,integer,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.portal_list_patient_clinical_records(uuid,uuid,text,text,text,integer,timestamptz,uuid) to service_role;

create function public.portal_read_clinical_record(p_actor_id uuid,p_record_id uuid,p_before_version bigint default null)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_record public.patient_clinical_records%rowtype;v_result jsonb;
begin
  if not exists(select 1 from public.staff_profiles where user_id=p_actor_id and active and onboarded_at is not null) then
    return jsonb_build_object('ok',false,'code','unauthorized');
  end if;
  if p_record_id is null or (p_before_version is not null and p_before_version not between 1 and 9007199254740991) then
    return jsonb_build_object('ok',false,'code','invalid_query');
  end if;
  select * into v_record from public.patient_clinical_records where id=p_record_id;
  if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
  with page as materialized (
    select * from public.patient_clinical_revisions where record_id=p_record_id
      and (p_before_version is null or version<p_before_version) order by version desc limit 20
  )
  select jsonb_build_object('ok',true,'record',to_jsonb(v_record),'canSign',exists(
      select 1 from public.clinical_signers where user_id=p_actor_id and enabled),
    'history',jsonb_build_object('total',(select count(*) from public.patient_clinical_revisions where record_id=p_record_id),
      'items',coalesce((select jsonb_agg(to_jsonb(p) order by version desc) from page p),'[]'::jsonb),
      'nextVersion',case when exists(select 1 from public.patient_clinical_revisions
        where record_id=p_record_id and version<(select min(version) from page)) then (select min(version) from page) else null end)) into v_result;
  return v_result;
end;
$$;
revoke execute on function public.portal_read_clinical_record(uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.portal_read_clinical_record(uuid,uuid,bigint) to service_role;

create function public.portal_list_clinical_signers(p_actor_id uuid,p_after_user_id uuid default null,p_limit integer default 100)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_role text;v_result jsonb;
begin
  select role into v_role from public.staff_profiles where user_id=p_actor_id and active and onboarded_at is not null;
  if not found then return jsonb_build_object('ok',false,'code','unauthorized'); end if;
  if v_role<>'admin' then return jsonb_build_object('ok',false,'code','forbidden'); end if;
  if p_limit is null or p_limit not between 1 and 100 then
    return jsonb_build_object('ok',false,'code','invalid_query');
  end if;
  with remaining as materialized (
    select p.user_id,p.email,p.display_name,p.role,p.active,p.onboarded_at,
      coalesce(s.enabled,false) enabled,coalesce(s.version,0) version,s.configured_by,s.configured_at
    from public.staff_profiles p left join public.clinical_signers s on s.user_id=p.user_id
    where p_after_user_id is null or p.user_id>p_after_user_id
  ), page as materialized(select * from remaining order by user_id limit p_limit)
  select jsonb_build_object('ok',true,'total',(select count(*) from public.staff_profiles),
    'signers',coalesce((select jsonb_agg(to_jsonb(p) order by user_id) from page p),'[]'::jsonb),
    'nextUserId',case when (select count(*) from remaining)>p_limit then (select user_id from page order by user_id desc limit 1) else null end) into v_result;
  return v_result;
end;
$$;
revoke execute on function public.portal_list_clinical_signers(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.portal_list_clinical_signers(uuid,uuid,integer) to service_role;
notify pgrst,'reload schema';
