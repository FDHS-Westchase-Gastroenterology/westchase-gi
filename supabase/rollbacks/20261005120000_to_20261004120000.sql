-- Reverses 20261005120000_activity_log: removes the activity read, its merged stream and the
-- indexes that serve it. Audit rows the portal wrote meanwhile ('auth.sign_in') stay; they are
-- history, and every earlier reader ignores an action it has no sentence for.

drop function public.portal_read_activity(uuid, text[], text[], uuid, date, date, text, timestamptz,
  uuid, integer);
drop function public.portal_activity_rows(text, boolean, text[], text[], uuid, timestamptz,
  timestamptz, jsonb, integer, timestamptz, uuid, integer);
drop index public.patient_revisions_occurred_idx;
drop index public.scheduling_changes_occurred_idx;
drop index public.audit_log_activity_idx;

notify pgrst, 'reload schema';
