import { PortalAuthorizationError, requireRole } from "@/lib/portal/auth";
import { executePatientCommand } from "@/lib/portal/patients/commands";
import { patientCommandInputSchema } from "@/lib/portal/patients/contracts";
import {
  isPatientRequestOrigin,
  PATIENT_API_HEADERS,
  patientFailureStatus,
  readPatientJson,
} from "@/lib/portal/patients/http";
import { serviceClient } from "@/lib/portal/server";

export async function POST(request: Request) {
  if (!isPatientRequestOrigin(request))
    return Response.json(
      { ok: false, code: "forbidden" },
      { status: 403, headers: PATIENT_API_HEADERS },
    );
  try {
    const staff = await requireRole("staff", { unauthenticated: "throw" });
    const parsed = patientCommandInputSchema.safeParse(await readPatientJson(request));
    if (!parsed.success)
      return Response.json(
        { ok: false, code: "invalid_command" },
        { status: 400, headers: PATIENT_API_HEADERS },
      );
    const outcome = await executePatientCommand(serviceClient(), staff.id, parsed.data);
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
