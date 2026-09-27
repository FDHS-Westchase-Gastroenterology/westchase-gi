import { PortalAuthorizationError, requireRole } from "@/lib/portal/auth";
import { clinicalInputSchema } from "@/lib/portal/clinical/contracts";
import { clinicalFailureStatus } from "@/lib/portal/clinical/http";
import { executeClinicalOperation } from "@/lib/portal/clinical/service";
import {
  isPrivateRequestOrigin,
  PRIVATE_API_HEADERS,
  readPrivateJson,
} from "@/lib/portal/private-json";
import { serviceClient } from "@/lib/portal/server";

export async function POST(request: Request) {
  if (!isPrivateRequestOrigin(request))
    return Response.json(
      { ok: false, code: "forbidden" },
      { status: 403, headers: PRIVATE_API_HEADERS },
    );
  try {
    const staff = await requireRole("staff", { unauthenticated: "throw" });
    const parsed = clinicalInputSchema.safeParse(await readPrivateJson(request, 96 * 1024));
    if (!parsed.success)
      return Response.json(
        { ok: false, code: "invalid_command" },
        { status: 400, headers: PRIVATE_API_HEADERS },
      );
    const outcome = await executeClinicalOperation(serviceClient(), staff.id, parsed.data);
    return Response.json(outcome, {
      status: outcome.ok ? 200 : clinicalFailureStatus(outcome.code),
      headers: PRIVATE_API_HEADERS,
    });
  } catch (error) {
    const status = error instanceof PortalAuthorizationError ? error.status : 503;
    const code = status === 401 ? "unauthorized" : status === 403 ? "forbidden" : "unavailable";
    return Response.json({ ok: false, code }, { status, headers: PRIVATE_API_HEADERS });
  }
}
