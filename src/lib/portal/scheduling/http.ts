import type { SchedulingFailureCode } from "./contracts";

const failureStatuses = {
  invalid_command: 400,
  invalid_local_time: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  patient_not_found: 404,
  unavailable: 503,
  stale_version: 409,
  idempotency_conflict: 409,
  schedule_in_use: 409,
  location_unavailable: 409,
  provider_unavailable: 409,
  type_unavailable: 409,
  type_changed: 409,
  time_unavailable: 409,
  patient_archived: 409,
  provider_conflict: 409,
  patient_conflict: 409,
  request_link_conflict: 409,
  request_already_booked: 409,
  request_version_required: 400,
  request_stale_version: 409,
  request_not_actionable: 409,
  request_follow_up_required: 400,
  request_undo_unavailable: 409,
  request_transition_rejected: 409,
  appointment_in_past: 409,
  illegal_transition: 409,
  undo_unavailable: 409,
} satisfies Record<SchedulingFailureCode, number>;

export function schedulingFailureStatus(code: SchedulingFailureCode): number {
  return failureStatuses[code];
}
