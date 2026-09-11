import { PortalAuthorizationError, requireRole } from "@/lib/portal/auth";
import {
  isPrivateRequestOrigin,
  PRIVATE_API_HEADERS,
  readPrivateJson,
} from "@/lib/portal/private-json";
import { schedulingInputSchema } from "@/lib/portal/scheduling/contracts";
import { schedulingFailureStatus } from "@/lib/portal/scheduling/http";
import { executeSchedulingOperation } from "@/lib/portal/scheduling/service";
import { serviceClient } from "@/lib/portal/server";

// Calendar filters and patient identifiers stay inside the private request body.
export async function POST(request: Request) {
  if (!isPrivateRequestOrigin(request))
    return Response.json(
      { ok: false, code: "forbidden" },
      { status: 403, headers: PRIVATE_API_HEADERS },
    );
  try {
    const staff = await requireRole("staff", { unauthenticated: "throw" });
    const parsed = schedulingInputSchema.safeParse(await readPrivateJson(request, 65_536));
    if (!parsed.success)
      return Response.json(
        { ok: false, code: "invalid_command" },
        { status: 400, headers: PRIVATE_API_HEADERS },
      );
    const outcome = await executeSchedulingOperation(serviceClient(), staff.id, parsed.data);
    return Response.json(outcome, {
      status: outcome.ok ? 200 : schedulingFailureStatus(outcome.code),
      headers: PRIVATE_API_HEADERS,
    });
  } catch (error) {
    const status = error instanceof PortalAuthorizationError ? error.status : 503;
    const code = status === 401 ? "unauthorized" : status === 403 ? "forbidden" : "unavailable";
    return Response.json({ ok: false, code }, { status, headers: PRIVATE_API_HEADERS });
  }
}
