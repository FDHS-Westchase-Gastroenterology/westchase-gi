import "server-only";

import { jsonSchema } from "@/lib/json";
import type { Json } from "@/lib/json";

import type { PatientFailureCode } from "./contracts";

export const PATIENT_API_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "Cross-Origin-Resource-Policy": "same-origin",
} as const;

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

export function isPatientRequestOrigin(request: Request): boolean {
  return request.headers.get("origin") === new URL(request.url).origin;
}

export async function readPatientJson(request: Request): Promise<Json> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json"
  )
    return null;
  if (request.body === null) return null;
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let body = "";
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 8192) {
        await reader.cancel();
        return null;
      }
      body += decoder.decode(chunk.value, { stream: true });
    }
    body += decoder.decode();
    const parsed = jsonSchema.safeParse(JSON.parse(body));
    return parsed.success ? parsed.data : null;
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) return null;
    throw error;
  } finally {
    reader.releaseLock();
  }
}
