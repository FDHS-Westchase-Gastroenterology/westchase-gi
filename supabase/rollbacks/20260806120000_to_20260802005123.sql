-- Restore the overlap procedures before removing their new-schema columns.
create or replace function public.portal_update_request_status(p_actor_email text,p_request_id uuid,p_next_status text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare old_status text;
begin
 if p_next_status not in ('new','contacted','scheduled','closed') then raise exception 'Unknown request status' using errcode='22023'; end if;
 select status into old_status from public.requests where id=p_request_id for update; if not found then raise exception 'Request not found' using errcode='P0002'; end if;
 if old_status=p_next_status then return false; end if;
 update public.requests set status=p_next_status,closure_disposition=null,closed_at=null,record_handoff_at=null where id=p_request_id;
 insert into public.audit_log(actor_email,action,entity,entity_id,source,correlation_id,detail) values(p_actor_email,'request.status_change','requests',p_request_id,'staff',pg_catalog.gen_random_uuid(),pg_catalog.jsonb_build_object('from',old_status,'to',p_next_status,'retention_clock_reset',old_status='closed' and p_next_status<>'closed','legacy_unclassified_close',p_next_status='closed'));
 return true;
end $$;

create or replace function public.portal_close_request(p_actor_email text,p_request_id uuid,p_disposition text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare old_status text; old_disposition text; now_at timestamptz:=pg_catalog.statement_timestamp();
begin
 if p_disposition not in ('unconverted','converted') then raise exception 'Invalid closure disposition' using errcode='22023'; end if;
 select status,closure_disposition into old_status,old_disposition from public.requests where id=p_request_id for update; if not found then raise exception 'Request not found' using errcode='P0002'; end if;
 if old_status='closed' and old_disposition=p_disposition then return false; end if;
 update public.requests set status='closed',closure_disposition=p_disposition,closed_at=now_at,record_handoff_at=case when p_disposition='converted' then now_at end where id=p_request_id;
 insert into public.audit_log(actor_email,action,entity,entity_id,source,correlation_id,detail) values(p_actor_email,'request.close','requests',p_request_id,'staff',pg_catalog.gen_random_uuid(),pg_catalog.jsonb_build_object('from',old_status,'previous_disposition',old_disposition,'disposition',p_disposition,'record_handoff_verified',p_disposition='converted'));
 return true;
end $$;

create or replace function public.portal_log_call_outcome(p_actor_email text,p_request_id uuid,p_outcome text,p_note text default null,p_follow_up_at timestamptz default null)
returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.requests%rowtype; ns text; nf timestamptz; nd text; now_at timestamptz:=pg_catalog.statement_timestamp(); event_id uuid; note_length integer; seq bigint;
begin
 if p_outcome is null or p_outcome not in ('booked','scheduled_transferred','reached_follow_up','voicemail','no_answer','wont_schedule','not_actionable') then raise exception 'Unknown call outcome' using errcode='22023'; end if;
 if p_follow_up_at is not null and p_outcome in ('booked','scheduled_transferred','wont_schedule','not_actionable') then raise exception 'This outcome cannot have a follow-up time' using errcode='22023'; end if;
 if p_note is not null then note_length:=pg_catalog.char_length(p_note); if p_note='' or p_note<>pg_catalog.btrim(p_note) or note_length not between 1 and 2000 then raise exception 'Notes must be 1-2000 trimmed characters' using errcode='22023'; end if; end if;
 select * into r from public.requests where id=p_request_id for update; if not found then raise exception 'Request not found' using errcode='P0002'; end if;
 select coalesce(pg_catalog.max((meta#>>'{lifecycle,sequence}')::bigint),0)+1 into seq from public.request_events where request_id=p_request_id and type='call_outcome' and pg_catalog.jsonb_typeof(meta#>'{lifecycle,sequence}')='number' and meta#>>'{lifecycle,sequence}'~'^[0-9]+$';
 ns:=case when p_outcome='booked' then 'scheduled' when p_outcome in ('scheduled_transferred','wont_schedule','not_actionable') then 'closed' else 'contacted' end;
 nf:=case when ns='contacted' then p_follow_up_at end; nd:=case when p_outcome='scheduled_transferred' then 'converted' when p_outcome in ('wont_schedule','not_actionable') then 'unconverted' end;
 update public.requests set status=ns,follow_up_at=nf,closure_disposition=nd,closed_at=case when ns='closed' then now_at end,record_handoff_at=case when nd='converted' then now_at end where id=p_request_id;
 insert into public.request_events(request_id,type,status,meta) values(p_request_id,'call_outcome','recorded',pg_catalog.jsonb_build_object('outcome',p_outcome,'author_email',p_actor_email,'lifecycle',pg_catalog.jsonb_build_object('version',1,'sequence',seq,'before',pg_catalog.jsonb_build_object('status',r.status,'follow_up_at',r.follow_up_at,'closure_disposition',r.closure_disposition,'closed_at',r.closed_at,'record_handoff_at',r.record_handoff_at),'after',pg_catalog.jsonb_build_object('status',ns,'follow_up_at',nf,'closure_disposition',nd,'closed_at',case when ns='closed' then now_at end,'record_handoff_at',case when nd='converted' then now_at end)))||case when p_follow_up_at is not null then pg_catalog.jsonb_build_object('follow_up_at',p_follow_up_at) else '{}'::jsonb end) returning id into event_id;
 if p_note is not null then insert into public.request_events(request_id,type,status,meta) values(p_request_id,'note','recorded',pg_catalog.jsonb_build_object('text',p_note,'author_email',p_actor_email)); end if;
 insert into public.audit_log(actor_email,action,entity,entity_id,source,correlation_id,detail) values(p_actor_email,'request.call_outcome','requests',p_request_id,'staff',pg_catalog.gen_random_uuid(),pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object('outcome',p_outcome,'from',r.status,'to',ns,'previous_disposition',r.closure_disposition,'disposition',nd,'note_attached',p_note is not null,'note_length',note_length,'follow_up_at',p_follow_up_at,'retention_clock_reset',r.status='closed' and ns<>'closed','record_handoff_verified',nd='converted')));
 return event_id;
end $$;

create or replace function public.portal_undo_call_outcome(p_actor_email text,p_request_id uuid,p_event_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.requests%rowtype; e public.request_events%rowtype; life jsonb; b jsonb; a jsonb; seq bigint; undo_id uuid;
begin
 if p_actor_email is null or pg_catalog.btrim(p_actor_email)='' or p_request_id is null or p_event_id is null then raise exception 'Actor, request, and outcome event are required' using errcode='22023'; end if;
 select * into r from public.requests where id=p_request_id for update; if not found then raise exception 'Request not found' using errcode='P0002'; end if;
 select * into e from public.request_events where id=p_event_id for update; if not found or e.request_id<>p_request_id or e.type<>'call_outcome' then raise exception 'Outcome event not found' using errcode='P0002'; end if;
 if e.status<>'recorded' then raise exception 'Outcome save is no longer undoable' using errcode='55000'; end if;
 life:=e.meta->'lifecycle'; b:=life->'before'; a:=life->'after';
 begin seq:=(life->>'sequence')::bigint; exception when others then raise exception 'Outcome event has an invalid lifecycle snapshot' using errcode='22023'; end;
 if not b?&array['status','follow_up_at','closure_disposition','closed_at','record_handoff_at'] or not a?&array['status','follow_up_at','closure_disposition','closed_at','record_handoff_at'] then raise exception 'Outcome event has an invalid lifecycle snapshot' using errcode='22023'; end if;
 if exists(select 1 from public.request_events x where x.request_id=p_request_id and x.type='call_outcome' and x.status='recorded' and x.id<>p_event_id and pg_catalog.jsonb_typeof(x.meta#>'{lifecycle,sequence}')='number' and (x.meta#>>'{lifecycle,sequence}')::bigint>=seq) then raise exception 'A later outcome save supersedes this undo' using errcode='55000'; end if;
 if r.status is distinct from a->>'status' or r.follow_up_at is distinct from (a->>'follow_up_at')::timestamptz or r.closure_disposition is distinct from a->>'closure_disposition' or r.closed_at is distinct from (a->>'closed_at')::timestamptz or r.record_handoff_at is distinct from (a->>'record_handoff_at')::timestamptz then raise exception 'The request lifecycle has changed since this save' using errcode='55000'; end if;
 update public.requests set status=b->>'status',follow_up_at=(b->>'follow_up_at')::timestamptz,closure_disposition=b->>'closure_disposition',closed_at=(b->>'closed_at')::timestamptz,record_handoff_at=(b->>'record_handoff_at')::timestamptz where id=p_request_id;
 update public.request_events set status='undone' where id=p_event_id and status='recorded';
 insert into public.request_events(request_id,type,status,meta) values(p_request_id,'call_outcome_undo','recorded',pg_catalog.jsonb_build_object('target_event_id',p_event_id,'outcome',e.meta->>'outcome','author_email',p_actor_email,'restored_status',b->>'status')) returning id into undo_id;
 insert into public.audit_log(actor_email,action,entity,entity_id,source,correlation_id,detail) values(p_actor_email,'request.call_outcome_undo','requests',p_request_id,'staff',pg_catalog.gen_random_uuid(),pg_catalog.jsonb_build_object('target_event_id',p_event_id,'undo_event_id',undo_id,'outcome',e.meta->>'outcome','from',a->>'status','to',b->>'status','restored_lifecycle',b));
 return pg_catalog.jsonb_build_object('status',b->>'status');
end $$;

-- Pause outbox workers before applying. Evidence is preserved in archival tables.
alter table public.request_transitions rename to appointment_workflow_transitions_archive;
alter table public.request_command_receipts rename to appointment_workflow_receipts_archive;
alter table public.notification_outbox rename to appointment_workflow_outbox_archive;
drop function public.portal_execute_request_command(text,uuid,bigint,uuid,text,jsonb,text,uuid);
drop function public.portal_create_request_with_outbox(jsonb);
alter table public.requests drop constraint requests_workflow_shape_valid;
alter table public.requests drop constraint requests_closure_reason_valid;
alter table public.requests drop constraint requests_status_valid;
update public.requests set status=case when status='booked' then 'scheduled' else status end,
 follow_up_at=case when status='contacted' then follow_up_at else null end,
 closure_disposition=case when status='booked' then null when status='closed' then 'unconverted' else null end,
 closed_at=case when status='closed' then coalesce(closed_at,pg_catalog.statement_timestamp()) else null end,
 record_handoff_at=null;
alter table public.requests drop column version, drop column legacy_review_required, drop column closure_reason, drop column closure_provenance;
alter table public.requests add constraint requests_status_valid check(status in ('new','contacted','scheduled','closed'));
alter table public.requests add constraint requests_closure_state_valid check ((closure_disposition is null and closed_at is null and record_handoff_at is null) or (status='closed' and closure_disposition='unconverted' and closed_at is not null and record_handoff_at is null) or (status='closed' and closure_disposition='converted' and closed_at is not null and record_handoff_at is not null));

-- Restore the lifecycle functions' legacy schema contract as well as the row
-- shape. Archived workflow evidence remains available in the renamed tables.
create or replace function public.portal_preview_data_lifecycle(p_now timestamptz)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select pg_catalog.jsonb_build_object(
    'receipt_secrets', (select pg_catalog.count(*) from public.request_events
      where type='receipt' and created_at <= p_now - interval '1 hour'
        and meta ? 'token_hash'),
    'rate_limits', (select pg_catalog.count(*) from private.intake_rate_limits
      where expires_at <= p_now),
    'unconverted_requests', (select pg_catalog.count(*) from public.requests
      where status='closed' and closure_disposition='unconverted'
        and retention_hold_at is null
        and closed_at <= p_now - interval '180 days'),
    'converted_requests', (select pg_catalog.count(*) from public.requests
      where status='closed' and closure_disposition='converted'
        and record_handoff_at is not null and retention_hold_at is null
        and greatest(closed_at,record_handoff_at)
          <= p_now - interval '1 year'),
    'held_requests', (select pg_catalog.count(*) from public.requests
      where retention_hold_at is not null),
    'legacy_unclassified_requests', (select pg_catalog.count(*)
      from public.requests where status='closed' and closure_disposition is null),
    'audits', (select pg_catalog.count(*) from public.audit_log as audit
      where audit.at <= p_now - interval '6 years'
        and not (audit.entity='requests' and exists (select 1
          from public.requests as request where request.id=audit.entity_id
            and request.retention_hold_at is not null)))
  );
$$;

create or replace function public.portal_run_data_lifecycle(
  p_actor_email text, p_now timestamptz
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_receipt_secrets integer;
  v_rate_limits integer;
  v_requests integer;
  v_audits integer;
  v_correlation_id uuid := pg_catalog.gen_random_uuid();
begin
  if p_actor_email is null or pg_catalog.btrim(p_actor_email)=''
    or p_now is null
    or p_now < pg_catalog.statement_timestamp() - interval '5 minutes'
    or p_now > pg_catalog.statement_timestamp() + interval '5 minutes'
  then raise exception 'Lifecycle actor and a current clock are required'
    using errcode='22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(20260725,170000);
  update public.request_events
    set status=case when status='issued' then 'expired' else status end,
      meta=meta-'token_hash'
    where type='receipt' and created_at <= p_now-interval '1 hour'
      and meta ? 'token_hash';
  get diagnostics v_receipt_secrets = row_count;
  delete from private.intake_rate_limits where expires_at <= p_now;
  get diagnostics v_rate_limits = row_count;
  with eligible as materialized (
    select id,closure_disposition,closed_at,record_handoff_at
    from public.requests where status='closed' and retention_hold_at is null
      and ((closure_disposition='unconverted'
          and closed_at <= p_now-interval '180 days')
        or (closure_disposition='converted' and record_handoff_at is not null
          and greatest(closed_at,record_handoff_at)
            <= p_now-interval '1 year')) for update skip locked
  ), logged as (
    insert into public.audit_log(actor_email,action,entity,entity_id,source,
      correlation_id,detail)
    select p_actor_email,'request.retention_delete','requests',id,'system',
      v_correlation_id,pg_catalog.jsonb_build_object('policy','balanced_v1',
        'disposition',closure_disposition,'closed_at',closed_at,
        'record_handoff_at',record_handoff_at) from eligible returning entity_id
  ), deleted as (
    delete from public.requests as request using logged
      where request.id=logged.entity_id returning request.id
  ) select pg_catalog.count(*)::integer into v_requests from deleted;
  with request_audit_state as materialized (
    select audit.id audit_id,request.retention_hold_at
    from public.audit_log audit join public.requests request
      on audit.entity='requests' and request.id=audit.entity_id
    where audit.at <= p_now-interval '6 years' for update of request
  ) delete from public.audit_log audit
    where audit.at <= p_now-interval '6 years' and (audit.entity<>'requests'
      or not exists(select 1 from public.requests request
        where request.id=audit.entity_id)
      or exists(select 1 from request_audit_state state
        where state.audit_id=audit.id and state.retention_hold_at is null));
  get diagnostics v_audits = row_count;
  if v_audits>0 then
    insert into public.audit_log(actor_email,action,entity,entity_id,source,
      correlation_id,detail) values(p_actor_email,'audit.retention_delete',
      'audit_log',null,'system',v_correlation_id,pg_catalog.jsonb_build_object(
        'policy','balanced_v1','deleted_count',v_audits,
        'cutoff',p_now-interval '6 years'));
  end if;
  return pg_catalog.jsonb_build_object('receipt_secrets_removed',v_receipt_secrets,
    'rate_limits_removed',v_rate_limits,'requests_removed',v_requests,
    'audits_removed',v_audits);
end;
$$;
