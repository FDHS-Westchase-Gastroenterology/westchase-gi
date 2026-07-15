import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/portal/auth";
import {
  addNotificationRecipientMutation,
  changeStaffRoleMutation,
  deactivateStaffMutation,
  inviteStaffMutation,
  removeNotificationRecipientMutation,
  resendStaffInviteMutation,
  toggleNotificationRecipientMutation,
  type ManagementFailure,
} from "@/lib/portal/management";
import {
  addRegistryGrantMutation,
  archiveRegistryAssetMutation,
  createRegistryAssetMutation,
  deactivateRegistryGrantMutation,
  updateRegistryAssetMutation,
} from "@/lib/portal/registry";

const JSON_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
} as const;

function json(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: JSON_HEADERS });
}

function authorizationStatus(error: unknown): 401 | 403 | null {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return null;
  }
  const status = error.status;
  return status === 401 || status === 403 ? status : null;
}

function failureStatus(failure: ManagementFailure): number {
  switch (failure.code) {
    case "invalid":
      return 400;
    case "not_found":
      return 404;
    case "conflict":
      return 409;
    case "unavailable":
      return 503;
  }
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  return (
    fetchSite !== "cross-site" &&
    (origin === null || origin === request.nextUrl.origin)
  );
}

/**
 * Explicit HTTP adapter for the settings UI. The mutation implementations are
 * also exported as Server Actions; both transports share the same role checks,
 * validation, compensation, and audit writes.
 */
export async function POST(request: NextRequest): Promise<Response> {
  if (!isSameOrigin(request)) {
    return json({ ok: false, error: "Forbidden" }, 403);
  }
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return json({ ok: false, error: "JSON body required" }, 415);
  }

  try {
    // The adapter itself fails closed with an HTTP status. Each selected
    // mutation then repeats the operation-specific role check at its boundary.
    await requireRole("staff", { unauthenticated: "throw" });

    const body = (await request.json()) as unknown;
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return json({ ok: false, error: "Invalid request" }, 400);
    }

    const payload = body as { operation?: unknown; input?: unknown };
    let result;
    let successStatus = 200;

    switch (payload.operation) {
      case "recipient.add":
        result = await addNotificationRecipientMutation(payload.input);
        successStatus = 201;
        break;
      case "recipient.toggle":
        result = await toggleNotificationRecipientMutation(payload.input);
        break;
      case "recipient.remove":
        result = await removeNotificationRecipientMutation(payload.input);
        break;
      case "staff.invite":
        result = await inviteStaffMutation(payload.input);
        successStatus = 201;
        break;
      case "staff.invite.resend":
        result = await resendStaffInviteMutation(payload.input);
        break;
      case "staff.deactivate":
        result = await deactivateStaffMutation(payload.input);
        break;
      case "staff.role":
        result = await changeStaffRoleMutation(payload.input);
        break;
      case "registry.create":
        result = await createRegistryAssetMutation(payload.input);
        successStatus = 201;
        break;
      case "registry.update":
        result = await updateRegistryAssetMutation(payload.input);
        break;
      case "registry.archive":
        result = await archiveRegistryAssetMutation(payload.input);
        break;
      case "registry.grant.add":
        result = await addRegistryGrantMutation(payload.input);
        successStatus = 201;
        break;
      case "registry.grant.deactivate":
        result = await deactivateRegistryGrantMutation(payload.input);
        break;
      default:
        return json({ ok: false, error: "Unknown operation" }, 400);
    }

    return json(result, result.ok ? successStatus : failureStatus(result));
  } catch (error) {
    const status = authorizationStatus(error);
    if (status !== null) {
      return json(
        { ok: false, error: status === 401 ? "Unauthenticated" : "Forbidden" },
        status,
      );
    }
    return json({ ok: false, error: "Operation failed" }, 500);
  }
}
