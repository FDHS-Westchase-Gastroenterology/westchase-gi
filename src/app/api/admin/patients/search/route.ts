import { PortalAuthorizationError, requireRole } from "@/lib/portal/auth";
import { patientSearchInputSchema } from "@/lib/portal/patients/contracts";
import {
  isPatientRequestOrigin,
  PATIENT_API_HEADERS,
  patientFailureStatus,
  readPatientJson,
} from "@/lib/portal/patients/http";
import { searchPatients } from "@/lib/portal/patients/reads";
import { serviceClient } from "@/lib/portal/server";

// Search terms and name cursors belong in the private body, never in URLs.
export async function POST(request: Request) {
  if (!isPatientRequestOrigin(request))
    return Response.json(
      { ok: false, code: "forbidden" },
      { status: 403, headers: PATIENT_API_HEADERS },
    );
  try {
    const staff = await requireRole("staff", { unauthenticated: "throw" });
    const parsed = patientSearchInputSchema.safeParse(await readPatientJson(request));
    if (!parsed.success)
      return Response.json(
        { ok: false, code: "invalid_command" },
        { status: 400, headers: PATIENT_API_HEADERS },
      );
    const outcome = await searchPatients(serviceClient(), staff.id, parsed.data);
    return Response.json(outcome, {
      status: outcome.ok ? 200 : patientFailureStatus(outcome.code),
      headers: PATIENT_API_HEADERS,
    });
  } catch (error) {
    const status = error instanceof PortalAuthorizationError ? error.status : 503;
    const code = status === 401 ? "unauthorized" : status === 403 ? "forbidden" : "unavailable";
    return Response.json({ ok: false, code }, { status, headers: PATIENT_API_HEADERS });
  }
}
