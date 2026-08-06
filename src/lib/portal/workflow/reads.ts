import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { HistoryEntry, RequestWorkSurface, WorkflowCommandKind } from "./contracts";
import { UNDO_WINDOW_MINUTES, normalizeRequestState } from "./contracts";

export async function fetchRequestWorkSurface(db: SupabaseClient, requestId: string): Promise<RequestWorkSurface | null> {
  const [request, transitions, events] = await Promise.all([
    db.from("requests").select("id,status,version,follow_up_at,record_handoff_at,closed_at,closure_reason,legacy_review_required,created_at").eq("id",requestId).maybeSingle(),
    db.from("request_transitions").select("*").eq("request_id",requestId).order("occurred_at",{ascending:false}),
    db.from("request_events").select("*").eq("request_id",requestId).order("created_at",{ascending:false}),
  ]);
  if (request.error || transitions.error || events.error) throw new Error("Request work surface read failed");
  if (!request.data) return null;
  const state=normalizeRequestState(request.data.status); if(!state) throw new Error("Invalid request state");
  const compensated=new Set((transitions.data??[]).map(t=>t.compensates_transition_id).filter(Boolean));
  const history: HistoryEntry[]=[{kind:"created",at:request.data.created_at}];
  for(const t of transitions.data??[]){ const from=normalizeRequestState(t.from_state),to=normalizeRequestState(t.to_state); if(!from||!to)continue;
    if(t.command==="undo_latest_transition") history.push({kind:"undo",id:t.id,restoredState:to,actor:t.actor_email,at:t.occurred_at});
    else if(t.command==="classify_legacy_closure") history.push({kind:"legacy_classified",id:t.id,to,actor:t.actor_email,at:t.occurred_at});
    else history.push({kind:"transition",id:t.id,command:t.command as WorkflowCommandKind,from,to,closureReason:t.reason_code==="not_actionable"||t.reason_code==="wont_schedule"?t.reason_code:null,undone:compensated.has(t.id),actor:t.actor_email,at:t.occurred_at}); }
  for(const e of events.data??[]){ const m=e.meta as Record<string,unknown>;
    if(e.type==="note") history.push({kind:"note",id:e.id,text:String(m.text??""),actor:String(m.author_email??"Unknown staff"),at:e.created_at});
    else if(e.type==="contact_attempt"||e.type==="call_outcome"){ const o=m.outcome; if(o==="reached_follow_up"||o==="voicemail"||o==="no_answer") history.push({kind:"contact_attempt",id:e.id,outcome:o,callAgainAt:typeof m.follow_up_at==="string"?m.follow_up_at:null,actor:String(m.author_email??"Unknown staff"),at:e.created_at}); }
    else if(e.type==="notification") history.push({kind:"delivery",id:e.id,recipient:e.recipient??"",accepted:e.status==="accepted",at:e.created_at}); }
  history.sort((a,b)=>b.at.localeCompare(a.at));
  const latest=(transitions.data??[])[0]; const expires=latest?new Date(new Date(latest.occurred_at).getTime()+UNDO_WINDOW_MINUTES*60000):null;
  return {id:requestId,state,version:Number(request.data.version),legacyReviewRequired:request.data.legacy_review_required,callAgainAt:request.data.follow_up_at,bookingConfirmedAt:request.data.record_handoff_at,closedAt:request.data.closed_at,closureReason:request.data.closure_reason,undo:latest&&latest.provenance==="staff"&&latest.command!=="undo_latest_transition"&&latest.command!=="classify_legacy_closure"&&expires&&expires>=new Date()?{transitionId:latest.id,command:latest.command,occurredAt:latest.occurred_at,expiresAt:expires.toISOString()}:null,history};
}

export async function fetchAttentionSummary(db: SupabaseClient, now: Date) {
  const since=new Date(now.getTime()-86400000).toISOString();
  const reads=await Promise.allSettled([
    db.from("requests").select("id",{count:"exact",head:true}).eq("status","new"), db.from("requests").select("id",{count:"exact",head:true}).eq("status","contacted").lte("follow_up_at",now.toISOString()), db.from("requests").select("id",{count:"exact",head:true}).eq("status","contacted").is("follow_up_at",null), db.from("requests").select("id",{count:"exact",head:true}).eq("legacy_review_required",true), db.from("notification_outbox").select("id",{count:"exact",head:true}).in("status",["failed","retry_pending","exhausted"]).gte("updated_at",since)
  ]);
  return Object.fromEntries(["newCount","dueCallAgainCount","silentContactedCount","legacyReviewCount","outboxTrouble"].map((key,i)=>{const r=reads[i]; return [key,r.status==="fulfilled"&&!r.value.error?r.value.count:null];})) as Record<"newCount"|"dueCallAgainCount"|"silentContactedCount"|"legacyReviewCount"|"outboxTrouble",number|null>;
}
