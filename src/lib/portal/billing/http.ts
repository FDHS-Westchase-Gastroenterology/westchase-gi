import type { BillingFailureCode } from "./contracts";

const failureStatuses = {
  invalid_command: 400,
  unauthorized: 401,
  forbidden: 403,
  patient_not_found: 404,
  appointment_patient_mismatch: 409,
  entry_not_found: 404,
  entry_reversed: 409,
  payment_has_refunds: 409,
  refund_exceeds_payment: 409,
  amount_out_of_range: 409,
  stale_version: 409,
  idempotency_conflict: 409,
  unavailable: 503,
} satisfies Record<BillingFailureCode, number>;

export function billingFailureStatus(code: BillingFailureCode): number {
  return failureStatuses[code];
}
