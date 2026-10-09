-- Lets close_request leave booked (#354). 20261006120000_day_appointment_actions added the
-- booked/wont_schedule case for a cancel that closes the request, but the branch's from_state list
-- still stopped at contacted, so that cancel failed the check. The constraint stays not valid, as
-- the earlier versions were.

alter table public.request_transitions
  drop constraint request_transitions_semantic_command_valid,
  add constraint request_transitions_semantic_command_valid check (
    provenance = 'migration'
    or (
      command = 'record_contact_attempt'
      and provenance = 'staff'
      and from_state in ('new', 'contacted')
      and to_state = 'contacted'
      and reason_code in ('reached_follow_up', 'voicemail', 'no_answer')
      and compensates_transition_id is null
      and appointment_at is null
    )
    or (
      command = 'record_contact_and_close'
      and provenance = 'staff'
      and from_state in ('new', 'contacted')
      and to_state = 'closed'
      and reason_code is not null
      and reason_code in ('reached', 'voicemail', 'no_answer')
      and compensates_transition_id is null
      and call_again_at is null
      and appointment_at is null
    )
    or (
      command = 'confirm_booking_handoff'
      and provenance = 'staff'
      and from_state in ('new', 'contacted')
      and to_state = 'booked'
      and reason_code is null
      and compensates_transition_id is null
      and appointment_at is not null
    )
    or (
      command = 'close_request'
      and provenance = 'staff'
      and from_state in ('new', 'contacted', 'booked')
      and to_state = 'closed'
      and (
        (from_state = 'new' and reason_code = 'not_actionable')
        or (from_state = 'contacted' and reason_code in ('not_actionable', 'wont_schedule'))
        or (from_state = 'booked' and reason_code = 'wont_schedule')
      )
      and compensates_transition_id is null
      and appointment_at is null
    )
    or (
      command = 'reopen_request'
      and provenance = 'staff'
      and from_state in ('booked', 'closed')
      and to_state = 'contacted'
      and reason_code is null
      and compensates_transition_id is null
      and call_again_at is not null
      and appointment_at is null
    )
    or (
      command = 'set_call_again'
      and provenance = 'staff'
      and from_state = 'contacted'
      and to_state = 'contacted'
      and reason_code is null
      and compensates_transition_id is null
      and call_again_at is not null
      and appointment_at is null
    )
    or (
      command = 'undo_latest_transition'
      and provenance = 'staff'
      and reason_code is null
      and compensates_transition_id is not null
      and call_again_at is null
      and appointment_at is null
    )
    or (
      command = 'classify_legacy_closure'
      and provenance = 'legacy_review'
      and from_state = 'closed'
      and (
        (to_state = 'booked' and reason_code = 'booked')
        or (to_state = 'closed' and reason_code in ('not_actionable', 'wont_schedule'))
      )
      and compensates_transition_id is null
      and call_again_at is null
      and appointment_at is null
    )
  ) not valid;
