import "server-only";

import type { PatientFailureCode } from "./contracts";

export {
  PRIVATE_API_HEADERS as PATIENT_API_HEADERS,
  isPrivateRequestOrigin as isPatientRequestOrigin,
  readPrivateJson as readPatientJson,
} from "@/lib/portal/private-json";

const failureStatuses = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  request_not_found: 404,
  invalid_command: 400,
  unavailable: 503,
  idempotency_conflict: 409,
  patient_archived: 409,
  request_link_conflict: 409,
  stale_version: 409,
  unchanged: 409,
} satisfies Record<PatientFailureCode, number>;

export function patientFailureStatus(code: PatientFailureCode): number {
  return failureStatuses[code];
}
