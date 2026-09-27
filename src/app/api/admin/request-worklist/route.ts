import { PortalAuthorizationError, requireRole } from "@/lib/portal/auth";
import {
  isPrivateRequestOrigin,
  PRIVATE_API_HEADERS,
  readPrivateJson,
} from "@/lib/portal/private-json";
import { requestWorklistInputSchema } from "@/lib/portal/request-worklist/contracts";
import { readRequestWorklist } from "@/lib/portal/request-worklist/service";
import { serviceClient } from "@/lib/portal/server";

const failureStatuses = {
  invalid_query: 400,
  unauthorized: 401,
  forbidden: 403,
  unavailable: 503,
} as const;

export async function POST(request: Request) {
  if (!isPrivateRequestOrigin(request))
    return Response.json(
      { ok: false, code: "forbidden" },
      { status: 403, headers: PRIVATE_API_HEADERS },
    );
  try {
    const staff = await requireRole("staff", { unauthenticated: "throw" });
    const input = requestWorklistInputSchema.safeParse(await readPrivateJson(request));
    if (!input.success)
      return Response.json(
        { ok: false, code: "invalid_query" },
        { status: 400, headers: PRIVATE_API_HEADERS },
      );
    const result = await readRequestWorklist(serviceClient(), staff.id, input.data);
    return Response.json(result, {
      status: result.ok ? 200 : failureStatuses[result.code],
      headers: PRIVATE_API_HEADERS,
    });
  } catch (error) {
    const status = error instanceof PortalAuthorizationError ? error.status : 503;
    const code = status === 401 ? "unauthorized" : status === 403 ? "forbidden" : "unavailable";
    return Response.json({ ok: false, code }, { status, headers: PRIVATE_API_HEADERS });
  }
}
