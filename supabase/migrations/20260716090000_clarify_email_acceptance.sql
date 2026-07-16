update public.request_events
set status = 'accepted'
where type = 'notification'
  and status = 'sent';
