-- Removes only the request read model and its indexes; request data is retained.
drop function public.portal_read_request_worklist(uuid,jsonb);
drop function public.portal_request_worklist_rows(text,text,timestamptz,timestamptz,timestamptz);
drop index public.audit_log_request_actor_latest_idx;
drop index public.audit_log_request_latest_idx;
notify pgrst,'reload schema';
