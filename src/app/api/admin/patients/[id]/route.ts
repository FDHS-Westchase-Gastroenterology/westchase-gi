import { PortalAuthorizationError, requireRole } from "@/lib/portal/auth";
import { patientReadInputSchema } from "@/lib/portal/patients/contracts";
import { PATIENT_API_HEADERS, patientFailureStatus } from "@/lib/portal/patients/http";
import { readPatient } from "@/lib/portal/patients/reads";
import { serviceClient } from "@/lib/portal/server";

export async function GET(
  request: Request,
  context: Readonly<{ params: Promise<Readonly<{ id: string }>> }>,
) {
  try {
    const staff = await requireRole("staff", { unauthenticated: "throw" });
    const { id } = await context.params;
    const query = new URL(request.url).searchParams;
    const before = query.get("historyBefore");
    const parsed = patientReadInputSchema.safeParse({
      patientId: id,
      historyBefore: before === null ? null : Number(before),
      linksAfter: query.get("linksAfter"),
    });
    if (!parsed.success)
      return Response.json(
        { ok: false, code: "invalid_command" },
        { status: 400, headers: PATIENT_API_HEADERS },
      );
    const outcome = await readPatient(serviceClient(), staff.id, parsed.data);
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
