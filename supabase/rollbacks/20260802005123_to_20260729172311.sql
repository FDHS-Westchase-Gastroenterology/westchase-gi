-- Manual rollback for 20260802005123_atomic_notification_recipient_mutations.
-- Run only with the pre-migration application deployment ready.

drop function public.portal_add_notification_recipient(
  text,
  text,
  text,
  boolean
);
drop function public.portal_toggle_notification_recipient(text, uuid, boolean);
drop function public.portal_remove_notification_recipient(text, uuid);
