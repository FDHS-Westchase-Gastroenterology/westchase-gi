import type { ClinicalFailureCode } from "./contracts";

const failureStatuses = {
  invalid_command: 400,
  invalid_query: 400,
  unauthorized: 401,
  forbidden: 403,
  unavailable: 503,
  patient_not_found: 404,
  not_found: 404,
  appointment_patient_mismatch: 409,
  staff_unavailable: 409,
  stale_version: 409,
  idempotency_conflict: 409,
  signing_not_enabled: 403,
  not_record_author: 403,
  record_not_draft: 409,
  record_not_signed: 409,
  amendment_exists: 409,
  amendment_source_changed: 409,
  empty_note: 400,
  already_entered_in_error: 409,
} satisfies Record<ClinicalFailureCode, number>;
export function clinicalFailureStatus(code: ClinicalFailureCode): number {
  return failureStatuses[code];
}
