-- Expand/backfill authority for the appointment-request workflow.
alter table public.requests drop constraint requests_status_valid;
alter table public.requests drop constraint requests_closure_state_valid;
alter table public.requests
  add column version bigint not null default 1,
  add column legacy_review_required boolean not null default false,
  add column closure_reason text,
  add column closure_provenance text;

-- Preserve evidence without pretending the coarse legacy value was a typed reason.
update public.requests set
  status = case
    when status = 'scheduled' then 'booked'
    when status = 'closed' and closure_disposition = 'converted' then 'booked'
    else status
  end,
  follow_up_at = case when status = 'contacted' then follow_up_at else null end,
  record_handoff_at = case
    when status = 'scheduled' then pg_catalog.statement_timestamp()
    when status = 'closed' and closure_disposition = 'converted'
      then greatest(coalesce(record_handoff_at, pg_catalog.statement_timestamp()), pg_catalog.statement_timestamp())
    when status in ('new','contacted') then null else record_handoff_at end,
  closed_at = case when status = 'closed' and closure_disposition <> 'unconverted' then null else closed_at end,
  legacy_review_required = status = 'closed' and closure_disposition is null,
  closure_provenance = case when status = 'closed' and closure_disposition = 'unconverted' then 'migration_unconverted' end;

alter table public.requests
  add constraint requests_status_valid check (status in ('new','contacted','booked','closed')),
  add constraint requests_closure_reason_valid check (closure_reason is null or closure_reason in ('not_actionable','wont_schedule')),
  add constraint requests_workflow_shape_valid check (
    (status = 'new' and follow_up_at is null and record_handoff_at is null and closed_at is null and closure_reason is null and not legacy_review_required)
    or (status = 'contacted' and record_handoff_at is null and closed_at is null and closure_reason is null and not legacy_review_required)
    or (status = 'booked' and follow_up_at is null and record_handoff_at is not null and closed_at is null and closure_reason is null and not legacy_review_required)
    or (status = 'closed' and follow_up_at is null and record_handoff_at is null and (
      (legacy_review_required and closed_at is null and closure_reason is null)
      or (not legacy_review_required and closed_at is not null and (closure_reason is not null or closure_provenance = 'migration_unconverted'))
    ))
  );

create table public.request_transitions (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  from_state text not null check (from_state in ('new','contacted','booked','closed')),
  to_state text not null check (to_state in ('new','contacted','booked','closed')),
  command text not null check (command in ('record_contact_attempt','confirm_booking_handoff','close_request','reopen_request','undo_latest_transition','classify_legacy_closure')),
  actor_email text not null check (actor_email = pg_catalog.btrim(actor_email) and actor_email <> '' and pg_catalog.char_length(actor_email) <= 254),
  resulting_version bigint not null check (resulting_version > 0),
  idempotency_key uuid not null,
  occurred_at timestamptz not null,
  reason_code text check (reason_code is null or reason_code in ('reached_follow_up','voicemail','no_answer','not_actionable','wont_schedule','booked')),
  compensates_transition_id uuid references public.request_transitions(id),
  provenance text not null check (provenance in ('staff','migration','legacy_review')),
  prior_snapshot jsonb not null,
  unique (request_id, resulting_version)
);
create index request_transitions_request_idx on public.request_transitions(request_id, occurred_at desc);

create table public.request_command_receipts (
  id uuid primary key default pg_catalog.gen_random_uuid(), request_id uuid not null references public.requests(id) on delete cascade,
  idempotency_key uuid not null, fingerprint text not null check (fingerprint ~ '^[0-9a-f]{64}$'),
  result jsonb not null, created_at timestamptz not null default pg_catalog.now(), unique(request_id,idempotency_key)
);
create index request_command_receipts_request_idx on public.request_command_receipts(request_id);

create table public.notification_outbox (
  id uuid primary key default pg_catalog.gen_random_uuid(), request_id uuid not null references public.requests(id) on delete cascade,
  kind text not null check (kind = 'new_request'), recipient_id uuid not null references public.notification_recipients(id) on delete cascade,
  delivery_key uuid not null default pg_catalog.gen_random_uuid() unique,
  status text not null default 'pending' check (status in ('pending','processing','delivered','failed','retry_pending','exhausted')),
  attempts integer not null default 0 check (attempts >= 0), available_at timestamptz not null default pg_catalog.now(),
  lease_until timestamptz, normalized_outcome text check (normalized_outcome is null or normalized_outcome in ('accepted','unconfigured','timeout','rate_limited','rejected','transport_failure')),
  created_at timestamptz not null default pg_catalog.now(), updated_at timestamptz not null default pg_catalog.now(), delivered_at timestamptz
);
create index notification_outbox_claim_idx on public.notification_outbox(available_at, created_at) where status in ('pending','retry_pending');
create index notification_outbox_request_idx on public.notification_outbox(request_id);

alter table public.request_transitions enable row level security;
alter table public.request_command_receipts enable row level security;
alter table public.notification_outbox enable row level security;
revoke all on public.request_transitions, public.request_command_receipts, public.notification_outbox from public, anon, authenticated;
grant select,insert on public.request_transitions to service_role;
grant select,insert on public.request_command_receipts to service_role;
grant select,insert,update on public.notification_outbox to service_role;

insert into public.request_transitions(request_id,from_state,to_state,command,actor_email,resulting_version,idempotency_key,occurred_at,provenance,prior_snapshot)
select id, 'closed', 'booked', 'confirm_booking_handoff', 'migration@system.invalid', 1,
  pg_catalog.gen_random_uuid(), pg_catalog.statement_timestamp(), 'migration',
  pg_catalog.jsonb_build_object('state','closed','callAgainAt',null,'bookingConfirmedAt',null,'closedAt',null,'closureReason',null,'legacyReviewRequired',false)
from public.requests where status='booked';

-- Keep the deploy-overlap RPCs compatible with the authoritative vocabulary.
create or replace function public.portal_update_request_status(p_actor_email text,p_request_id uuid,p_next_status text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare old_status text; next_status text; now_at timestamptz:=pg_catalog.statement_timestamp();
begin
  if p_next_status not in ('new','contacted','scheduled','closed') then raise exception 'Unknown request status' using errcode='22023'; end if;
  if p_next_status='closed' then raise exception 'A typed closure reason is required' using errcode='23514'; end if;
  next_status:=case when p_next_status='scheduled' then 'booked' else p_next_status end;
  select status into old_status from public.requests where id=p_request_id for update;
  if not found then raise exception 'Request not found' using errcode='P0002'; end if;
  if old_status=next_status then return false; end if;
  update public.requests set status=next_status,version=version+1,follow_up_at=null,
    closure_disposition=null,closed_at=null,record_handoff_at=case when next_status='booked' then now_at end,
    closure_reason=null,closure_provenance=null,legacy_review_required=false where id=p_request_id;
  insert into public.audit_log(actor_email,action,entity,entity_id,source,correlation_id,detail)
  values(p_actor_email,'request.status_change','requests',p_request_id,'staff',pg_catalog.gen_random_uuid(),
    pg_catalog.jsonb_build_object('from',old_status,'to',next_status,'retention_clock_reset',old_status='closed','legacy_unclassified_close',false));
  return true;
end;
$$;

create or replace function public.portal_close_request(p_actor_email text,p_request_id uuid,p_disposition text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare old_status text; old_disposition text; now_at timestamptz:=pg_catalog.statement_timestamp();
begin
  if p_disposition not in ('unconverted','converted') then raise exception 'Invalid closure disposition' using errcode='22023'; end if;
  if p_disposition='unconverted' then raise exception 'A typed closure reason is required' using errcode='23514'; end if;
  select status,closure_disposition into old_status,old_disposition from public.requests where id=p_request_id for update;
  if not found then raise exception 'Request not found' using errcode='P0002'; end if;
  if old_status='booked' then return false; end if;
  update public.requests set status='booked',version=version+1,follow_up_at=null,closure_disposition=null,
    closed_at=null,record_handoff_at=now_at,closure_reason=null,closure_provenance=null,legacy_review_required=false where id=p_request_id;
  insert into public.audit_log(actor_email,action,entity,entity_id,source,correlation_id,detail)
  values(p_actor_email,'request.close','requests',p_request_id,'staff',pg_catalog.gen_random_uuid(),
    pg_catalog.jsonb_build_object('from',old_status,'previous_disposition',old_disposition,'disposition',p_disposition,'record_handoff_verified',true));
  return true;
end;
$$;

create or replace function public.portal_log_call_outcome(p_actor_email text,p_request_id uuid,p_outcome text,p_note text default null,p_follow_up_at timestamptz default null)
returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.requests%rowtype; ns text; nf timestamptz; nr text; now_at timestamptz:=pg_catalog.statement_timestamp();
  event_id uuid; note_length integer; seq bigint;
begin
  if p_outcome is null or p_outcome not in ('booked','scheduled_transferred','reached_follow_up','voicemail','no_answer','wont_schedule','not_actionable') then raise exception 'Unknown call outcome' using errcode='22023'; end if;
  if p_follow_up_at is not null and p_outcome in ('booked','scheduled_transferred','wont_schedule','not_actionable') then raise exception 'This outcome cannot have a follow-up time' using errcode='22023'; end if;
  if p_note is not null then note_length:=pg_catalog.char_length(p_note); if p_note='' or p_note<>pg_catalog.btrim(p_note) or note_length not between 1 and 2000 then raise exception 'Notes must be 1-2000 trimmed characters' using errcode='22023'; end if; end if;
  select * into r from public.requests where id=p_request_id for update; if not found then raise exception 'Request not found' using errcode='P0002'; end if;
  select coalesce(pg_catalog.max((meta#>>'{lifecycle,sequence}')::bigint),0)+1 into seq from public.request_events
    where request_id=p_request_id and type='call_outcome' and pg_catalog.jsonb_typeof(meta#>'{lifecycle,sequence}')='number' and meta#>>'{lifecycle,sequence}'~'^[0-9]+$';
  ns:=case when p_outcome in ('booked','scheduled_transferred') then 'booked' when p_outcome in ('wont_schedule','not_actionable') then 'closed' else 'contacted' end;
  nf:=case when ns='contacted' then p_follow_up_at end; nr:=case when p_outcome in ('wont_schedule','not_actionable') then p_outcome end;
  update public.requests set status=ns,version=version+1,follow_up_at=nf,closure_disposition=null,
    closed_at=case when ns='closed' then now_at end,record_handoff_at=case when ns='booked' then now_at end,
    closure_reason=nr,closure_provenance=null,legacy_review_required=false where id=p_request_id;
  insert into public.request_events(request_id,type,status,meta) values(p_request_id,'call_outcome','recorded',
    pg_catalog.jsonb_build_object('outcome',p_outcome,'author_email',p_actor_email,'lifecycle',pg_catalog.jsonb_build_object(
      'version',1,'sequence',seq,'before',pg_catalog.jsonb_build_object('status',r.status,'follow_up_at',r.follow_up_at,'closure_disposition',r.closure_disposition,'closed_at',r.closed_at,'record_handoff_at',r.record_handoff_at,'closure_reason',r.closure_reason,'closure_provenance',r.closure_provenance,'legacy_review_required',r.legacy_review_required),
      'after',pg_catalog.jsonb_build_object('status',ns,'follow_up_at',nf,'closure_disposition',null,'closed_at',case when ns='closed' then now_at end,'record_handoff_at',case when ns='booked' then now_at end,'closure_reason',nr,'closure_provenance',null,'legacy_review_required',false)))
      ||case when p_follow_up_at is not null then pg_catalog.jsonb_build_object('follow_up_at',p_follow_up_at) else '{}'::jsonb end) returning id into event_id;
  if p_note is not null then insert into public.request_events(request_id,type,status,meta) values(p_request_id,'note','recorded',pg_catalog.jsonb_build_object('text',p_note,'author_email',p_actor_email)); end if;
  insert into public.audit_log(actor_email,action,entity,entity_id,source,correlation_id,detail) values(p_actor_email,'request.call_outcome','requests',p_request_id,'staff',pg_catalog.gen_random_uuid(),
    pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object('outcome',p_outcome,'from',r.status,'to',ns,'previous_disposition',r.closure_disposition,'disposition',null,'note_attached',p_note is not null,'note_length',note_length,'follow_up_at',p_follow_up_at,'retention_clock_reset',r.status='closed' and ns<>'closed','record_handoff_verified',ns='booked')));
  return event_id;
end;
$$;

create or replace function public.portal_undo_call_outcome(p_actor_email text,p_request_id uuid,p_event_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare cur public.requests%rowtype; ev public.request_events%rowtype; life jsonb; bef jsonb; aft jsonb; outcome text; seq bigint;
  bs text; bf timestamptz; bd text; bc timestamptz; bh timestamptz; br text; bp text; bl boolean;
  as_ text; af timestamptz; ad text; ac timestamptz; ah timestamptz; ar text; ap text; al boolean; undo_id uuid;
begin
  if p_actor_email is null or pg_catalog.btrim(p_actor_email)='' or p_request_id is null or p_event_id is null then raise exception 'Actor, request, and outcome event are required' using errcode='22023'; end if;
  select * into cur from public.requests where id=p_request_id for update; if not found then raise exception 'Request not found' using errcode='P0002'; end if;
  select * into ev from public.request_events where id=p_event_id for update;
  if not found or ev.request_id<>p_request_id or ev.type<>'call_outcome' then raise exception 'Outcome event not found' using errcode='P0002'; end if;
  if ev.status<>'recorded' then raise exception 'Outcome save is no longer undoable' using errcode='55000'; end if;
  outcome:=ev.meta->>'outcome'; life:=ev.meta->'lifecycle'; bef:=life->'before'; aft:=life->'after';
  if outcome is null or outcome not in ('booked','scheduled_transferred','reached_follow_up','voicemail','no_answer','wont_schedule','not_actionable')
    or pg_catalog.jsonb_typeof(life)<>'object' or life->>'version'<>'1' or pg_catalog.jsonb_typeof(life->'sequence')<>'number'
    or life->>'sequence'!~'^[0-9]+$' or pg_catalog.jsonb_typeof(bef)<>'object' or pg_catalog.jsonb_typeof(aft)<>'object'
    or not bef?&array['status','follow_up_at','closure_disposition','closed_at','record_handoff_at'] or not aft?&array['status','follow_up_at','closure_disposition','closed_at','record_handoff_at']
    or bef->>'status' not in ('new','contacted','scheduled','booked','closed') or aft->>'status' not in ('new','contacted','scheduled','booked','closed')
  then raise exception 'Outcome event has an invalid lifecycle snapshot' using errcode='22023'; end if;
  begin
    seq:=(life->>'sequence')::bigint; bs:=bef->>'status'; bf:=(bef->>'follow_up_at')::timestamptz; bd:=bef->>'closure_disposition'; bc:=(bef->>'closed_at')::timestamptz; bh:=(bef->>'record_handoff_at')::timestamptz;
    br:=bef->>'closure_reason'; bp:=bef->>'closure_provenance'; bl:=coalesce((bef->>'legacy_review_required')::boolean,false);
    as_:=aft->>'status'; af:=(aft->>'follow_up_at')::timestamptz; ad:=aft->>'closure_disposition'; ac:=(aft->>'closed_at')::timestamptz; ah:=(aft->>'record_handoff_at')::timestamptz;
    ar:=aft->>'closure_reason'; ap:=aft->>'closure_provenance'; al:=coalesce((aft->>'legacy_review_required')::boolean,false);
  exception when others then raise exception 'Outcome event has an invalid lifecycle snapshot' using errcode='22023'; end;
  -- Normalize both historical snapshots for comparison/restoration.
  if as_='scheduled' or (as_='closed' and ad='converted') then as_:='booked'; af:=null; ah:=coalesce(ah,ac,ev.created_at); ac:=null; ad:=null; ar:=null; ap:=null; al:=false;
  elsif as_='closed' and ad='unconverted' and ar is null then ad:=null; ap:='migration_unconverted'; al:=false; end if;
  if bs='scheduled' or (bs='closed' and bd='converted') then bs:='booked'; bf:=null; bh:=coalesce(bh,bc,ev.created_at); bc:=null; bd:=null; br:=null; bp:=null; bl:=false;
  elsif bs='closed' and bd='unconverted' and br is null then bd:=null; bp:='migration_unconverted'; bl:=false; end if;
  if exists(select 1 from public.request_events x where x.request_id=p_request_id and x.type='call_outcome' and x.status='recorded' and x.id<>p_event_id and pg_catalog.jsonb_typeof(x.meta#>'{lifecycle,sequence}')='number' and x.meta#>>'{lifecycle,sequence}'~'^[0-9]+$' and (x.meta#>>'{lifecycle,sequence}')::bigint>=seq) then raise exception 'A later outcome save supersedes this undo' using errcode='55000'; end if;
  if cur.status is distinct from as_ or cur.follow_up_at is distinct from af or cur.closed_at is distinct from ac or cur.record_handoff_at is distinct from ah or cur.closure_reason is distinct from ar or cur.closure_provenance is distinct from ap or cur.legacy_review_required is distinct from al then raise exception 'The request lifecycle has changed since this save' using errcode='55000'; end if;
  update public.requests set status=bs,version=version+1,follow_up_at=bf,closure_disposition=bd,closed_at=bc,record_handoff_at=bh,closure_reason=br,closure_provenance=bp,legacy_review_required=bl where id=p_request_id;
  update public.request_events set status='undone' where id=p_event_id and status='recorded'; if not found then raise exception 'Outcome save is no longer undoable' using errcode='55000'; end if;
  insert into public.request_events(request_id,type,status,meta) values(p_request_id,'call_outcome_undo','recorded',pg_catalog.jsonb_build_object('target_event_id',p_event_id,'outcome',outcome,'author_email',p_actor_email,'restored_status',bs)) returning id into undo_id;
  insert into public.audit_log(actor_email,action,entity,entity_id,source,correlation_id,detail) values(p_actor_email,'request.call_outcome_undo','requests',p_request_id,'staff',pg_catalog.gen_random_uuid(),pg_catalog.jsonb_build_object('target_event_id',p_event_id,'undo_event_id',undo_id,'outcome',outcome,'from',as_,'to',bs,'restored_lifecycle',pg_catalog.jsonb_build_object('status',bs,'follow_up_at',bf,'closure_disposition',bd,'closed_at',bc,'record_handoff_at',bh)));
  return pg_catalog.jsonb_build_object('status',bs);
end;
$$;

create function public.portal_execute_request_command(
  p_actor_email text, p_request_id uuid, p_expected_version bigint, p_idempotency_key uuid,
  p_fingerprint text, p_decision jsonb, p_note text default null, p_transition_id uuid default null
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare v public.requests%rowtype; r public.request_command_receipts%rowtype; t public.request_transitions%rowtype;
  n jsonb; cmd text := p_decision->>'command'; now_at timestamptz := (p_decision->>'occurredAt')::timestamptz;
begin
  select * into r from public.request_command_receipts where request_id=p_request_id and idempotency_key=p_idempotency_key;
  if found then return case when r.fingerprint=p_fingerprint then r.result else '{"ok":false,"code":"idempotency_conflict"}'::jsonb end; end if;
  select * into v from public.requests where id=p_request_id for update;
  if not found then return '{"ok":false,"code":"not_found"}'::jsonb; end if;
  if v.version<>p_expected_version then return pg_catalog.jsonb_build_object('ok',false,'code','stale_version','current',pg_catalog.jsonb_build_object('state',v.status,'version',v.version)); end if;
  if cmd='undo_latest_transition' then
    select * into t from public.request_transitions where id=p_transition_id and request_id=p_request_id;
    if not found or t.resulting_version<>v.version or t.occurred_at + interval '15 minutes' < now_at
      or t.id<>(select id from public.request_transitions where request_id=p_request_id order by resulting_version desc limit 1)
      or t.command in ('undo_latest_transition','classify_legacy_closure')
    then return '{"ok":false,"code":"undo_unavailable"}'::jsonb; end if;
  end if;
  update public.requests set status=p_decision->>'state', version=version+1,
    follow_up_at=(p_decision->>'callAgainAt')::timestamptz, record_handoff_at=(p_decision->>'bookingConfirmedAt')::timestamptz,
    closed_at=(p_decision->>'closedAt')::timestamptz, closure_reason=p_decision->>'closureReason', legacy_review_required=(p_decision->>'legacyReviewRequired')::boolean
    where id=p_request_id and version=p_expected_version;
  if not found then raise exception 'workflow stale write' using errcode='40001'; end if;
  if cmd='record_contact_attempt' then insert into public.request_events(request_id,type,status,meta) values(p_request_id,'contact_attempt','recorded',pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object('outcome',p_decision->>'reasonCode','author_email',p_actor_email,'follow_up_at',p_decision->>'callAgainAt'))); end if;
  if p_note is not null then insert into public.request_events(request_id,type,status,meta) values(p_request_id,'note','recorded',pg_catalog.jsonb_build_object('text',p_note,'author_email',p_actor_email)); end if;
  insert into public.request_transitions(request_id,from_state,to_state,command,actor_email,resulting_version,idempotency_key,occurred_at,reason_code,compensates_transition_id,provenance,prior_snapshot)
    values(p_request_id,v.status,p_decision->>'state',cmd,p_actor_email,v.version+1,p_idempotency_key,now_at,p_decision->>'reasonCode',case when cmd='undo_latest_transition' then p_transition_id end,case when cmd='classify_legacy_closure' then 'legacy_review' else 'staff' end,
      pg_catalog.jsonb_build_object('state',v.status,'callAgainAt',v.follow_up_at,'bookingConfirmedAt',v.record_handoff_at,'closedAt',v.closed_at,'closureReason',v.closure_reason,'legacyReviewRequired',v.legacy_review_required));
  insert into public.audit_log(actor_email,action,entity,entity_id,source,correlation_id,detail) values(p_actor_email,'request.workflow_command','requests',p_request_id,'staff',pg_catalog.gen_random_uuid(),pg_catalog.jsonb_build_object('command',cmd,'from',v.status,'to',p_decision->>'state','resulting_version',v.version+1));
  n:=pg_catalog.jsonb_build_object('ok',true,'state',p_decision->>'state','version',v.version+1,'callAgainAt',p_decision->'callAgainAt','undo',case when cmd in ('undo_latest_transition','classify_legacy_closure') then null else pg_catalog.jsonb_build_object('transitionId',(select id from public.request_transitions where request_id=p_request_id and resulting_version=v.version+1),'command',cmd,'occurredAt',now_at,'expiresAt',now_at+interval '15 minutes') end);
  insert into public.request_command_receipts(request_id,idempotency_key,fingerprint,result) values(p_request_id,p_idempotency_key,p_fingerprint,n); return n;
end $$;

create function public.portal_create_request_with_outbox(p_request jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare rid uuid;
begin
 insert into public.requests(name,phone,email,location,preferred_time,message,locale,source_path) values(p_request->>'name',p_request->>'phone',nullif(p_request->>'email',''),p_request->>'location',p_request->>'preferred_time',nullif(p_request->>'message',''),p_request->>'locale',p_request->>'source_path') returning id into rid;
 insert into public.request_events(request_id,type,status,meta) values(rid,'created','recorded','{}');
 insert into public.notification_outbox(request_id,kind,recipient_id) select rid,'new_request',id from public.notification_recipients where active;
 return rid;
end $$;

revoke execute on function public.portal_execute_request_command(text,uuid,bigint,uuid,text,jsonb,text,uuid), public.portal_create_request_with_outbox(jsonb) from public,anon,authenticated;
grant execute on function public.portal_execute_request_command(text,uuid,bigint,uuid,text,jsonb,text,uuid), public.portal_create_request_with_outbox(jsonb) to service_role;

-- Align automatic retention with the workflow's terminal evidence. Keep the
-- established preview keys for operational callers while reporting review work
-- explicitly; review-required rows are never candidates for deletion.
create or replace function public.portal_preview_data_lifecycle(
  p_now timestamptz
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'receipt_secrets', (
      select pg_catalog.count(*) from public.request_events
      where type = 'receipt' and created_at <= p_now - interval '1 hour'
        and meta ? 'token_hash'
    ),
    'rate_limits', (
      select pg_catalog.count(*) from private.intake_rate_limits
      where expires_at <= p_now
    ),
    'unconverted_requests', (
      select pg_catalog.count(*) from public.requests
      where status = 'closed' and not legacy_review_required
        and retention_hold_at is null
        and closed_at <= p_now - interval '180 days'
    ),
    'converted_requests', (
      select pg_catalog.count(*) from public.requests
      where status = 'booked' and not legacy_review_required
        and retention_hold_at is null
        and record_handoff_at <= p_now - interval '1 year'
    ),
    'held_requests', (
      select pg_catalog.count(*) from public.requests
      where retention_hold_at is not null
    ),
    'legacy_unclassified_requests', (
      select pg_catalog.count(*) from public.requests
      where legacy_review_required
    ),
    'legacy_review_requests', (
      select pg_catalog.count(*) from public.requests
      where legacy_review_required
    ),
    'audits', (
      select pg_catalog.count(*) from public.audit_log as audit
      where audit.at <= p_now - interval '6 years'
        and not (
          audit.entity = 'requests' and exists (
            select 1 from public.requests as request
            where request.id = audit.entity_id
              and request.retention_hold_at is not null
          )
        )
    )
  );
$$;

create or replace function public.portal_run_data_lifecycle(
  p_actor_email text,
  p_now timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_receipt_secrets integer;
  v_rate_limits integer;
  v_requests integer;
  v_audits integer;
  v_correlation_id uuid := pg_catalog.gen_random_uuid();
begin
  if p_actor_email is null or pg_catalog.btrim(p_actor_email) = ''
    or p_now is null
    or p_now < pg_catalog.statement_timestamp() - interval '5 minutes'
    or p_now > pg_catalog.statement_timestamp() + interval '5 minutes'
  then
    raise exception 'Lifecycle actor and a current clock are required'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(20260725, 170000);

  update public.request_events
  set status = case when status = 'issued' then 'expired' else status end,
      meta = meta - 'token_hash'
  where type = 'receipt' and created_at <= p_now - interval '1 hour'
    and meta ? 'token_hash';
  get diagnostics v_receipt_secrets = row_count;

  delete from private.intake_rate_limits where expires_at <= p_now;
  get diagnostics v_rate_limits = row_count;

  with eligible as materialized (
    select id, status, closure_reason, closure_provenance, closed_at,
      record_handoff_at
    from public.requests
    where not legacy_review_required
      and retention_hold_at is null
      and (
        (status = 'closed' and closed_at <= p_now - interval '180 days')
        or (status = 'booked'
          and record_handoff_at <= p_now - interval '1 year')
      )
    for update skip locked
  ), logged as (
    insert into public.audit_log (
      actor_email, action, entity, entity_id, source, correlation_id, detail
    )
    select p_actor_email, 'request.retention_delete', 'requests', eligible.id,
      'system', v_correlation_id,
      pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
        'policy', 'workflow_balanced_v2', 'state', eligible.status,
        'closure_reason', eligible.closure_reason,
        'closure_provenance', eligible.closure_provenance,
        'closed_at', eligible.closed_at,
        'record_handoff_at', eligible.record_handoff_at
      ))
    from eligible returning entity_id
  ), deleted as (
    delete from public.requests as request using logged
    where request.id = logged.entity_id returning request.id
  )
  select pg_catalog.count(*)::integer into v_requests from deleted;

  with request_audit_state as materialized (
    select audit.id as audit_id, request.retention_hold_at
    from public.audit_log as audit
    join public.requests as request
      on audit.entity = 'requests' and request.id = audit.entity_id
    where audit.at <= p_now - interval '6 years'
    for update of request
  )
  delete from public.audit_log as audit
  where audit.at <= p_now - interval '6 years'
    and (audit.entity <> 'requests'
      or not exists (select 1 from public.requests as request
        where request.id = audit.entity_id)
      or exists (select 1 from request_audit_state as state
        where state.audit_id = audit.id and state.retention_hold_at is null));
  get diagnostics v_audits = row_count;

  if v_audits > 0 then
    insert into public.audit_log (
      actor_email, action, entity, entity_id, source, correlation_id, detail
    ) values (
      p_actor_email, 'audit.retention_delete', 'audit_log', null, 'system',
      v_correlation_id, pg_catalog.jsonb_build_object(
        'policy', 'balanced_v1', 'deleted_count', v_audits,
        'cutoff', p_now - interval '6 years'
      )
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'receipt_secrets_removed', v_receipt_secrets,
    'rate_limits_removed', v_rate_limits,
    'requests_removed', v_requests,
    'audits_removed', v_audits
  );
end;
$$;
