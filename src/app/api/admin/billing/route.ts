import { PortalAuthorizationError, requireRole } from "@/lib/portal/auth";
import { billingInputSchema } from "@/lib/portal/billing/contracts";
import { billingFailureStatus } from "@/lib/portal/billing/http";
import { executeBillingOperation } from "@/lib/portal/billing/service";
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
    const parsed = billingInputSchema.safeParse(await readPrivateJson(request));
    if (!parsed.success)
      return Response.json(
        { ok: false, code: "invalid_command" },
        { status: 400, headers: PRIVATE_API_HEADERS },
      );
    const outcome = await executeBillingOperation(serviceClient(), staff.id, parsed.data);
    return Response.json(outcome, {
      status: outcome.ok ? 200 : billingFailureStatus(outcome.code),
      headers: PRIVATE_API_HEADERS,
    });
  } catch (error) {
    const status = error instanceof PortalAuthorizationError ? error.status : 503;
    const code = status === 401 ? "unauthorized" : status === 403 ? "forbidden" : "unavailable";
    return Response.json({ ok: false, code }, { status, headers: PRIVATE_API_HEADERS });
  }
}
