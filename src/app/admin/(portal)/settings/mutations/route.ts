import type { NextRequest } from "next/server";
import { asJsonString, jsonObjectSchema } from "@/lib/json";
import type { Json } from "@/lib/json";
import {
  PortalAuthorizationError,
  requireRole,
} from "@/lib/portal/auth";
import { addNotificationRecipientMutation, changeStaffRoleMutation, deactivateStaffMutation, inviteStaffMutation, removeNotificationRecipientMutation, resendStaffInviteMutation, toggleNotificationRecipientMutation } from "@/lib/portal/management";
import type { ManagementFailure } from "@/lib/portal/management";
import {
  cancelMaintainerInviteMutation,
  inviteMaintainerMutation,
  revokeMaintainerMutation,
} from "@/lib/portal/maintainers";
import type { MaintainerMutationResult } from "@/lib/portal/maintainer-operation";

const JSON_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
} as const;

function json(body: Json, status: number): Response {
  return Response.json(body, { status, headers: JSON_HEADERS });
}

const FAILURE_STATUSES = {
  invalid: 400,
  not_found: 404,
  conflict: 409,
  forbidden: 403,
  limit: 429,
  unconfirmed: 503,
  unavailable: 503,
} as const satisfies Record<
  ManagementFailure["code"] | Exclude<MaintainerMutationResult, { ok: true }>["code"],
  number
>;

function failureStatus(failure: Readonly<ManagementFailure | Exclude<MaintainerMutationResult, { ok: true }>>): number {
  return FAILURE_STATUSES[failure.code];
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
 * validation, atomic-first database writes, migration compatibility, and
 * failure mapping.
 */
export async function POST(request: NextRequest): Promise<Response> {
  if (!isSameOrigin(request)) {
    return json({ ok: false, error: "Forbidden" }, 403);
  }
  const contentType = request.headers.get("content-type");
  if (
    contentType === null ||
    contentType === "" ||
    !contentType.toLowerCase().startsWith("application/json")
  ) {
    return json({ ok: false, error: "JSON body required" }, 415);
  }

  try {
    // The adapter itself fails closed with an HTTP status. Each selected
    // Mutation then repeats the operation-specific role check at its boundary.
    await requireRole("staff", { unauthenticated: "throw" });

    const parsedBody = jsonObjectSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return json({ ok: false, error: "Invalid request" }, 400);
    }
    const operation = asJsonString(parsedBody.data.operation);
    if (operation === null) {
      return json({ ok: false, error: "Unknown operation" }, 400);
    }
    const input = parsedBody.data.input ?? null;
    let result;
    let successStatus = 200;

    switch (operation) {
      case "recipient.add":
        result = await addNotificationRecipientMutation(input);
        successStatus = 201;
        break;
      case "recipient.toggle":
        result = await toggleNotificationRecipientMutation(input);
        break;
      case "recipient.remove":
        result = await removeNotificationRecipientMutation(input);
        break;
      case "staff.invite":
        result = await inviteStaffMutation(input);
        successStatus = 201;
        break;
      case "staff.invite.resend":
        result = await resendStaffInviteMutation(input);
        break;
      case "staff.deactivate":
        result = await deactivateStaffMutation(input);
        break;
      case "staff.role":
        result = await changeStaffRoleMutation(input);
        break;
      case "maintainer.invite":
        result = await inviteMaintainerMutation(input);
        successStatus = 201;
        break;
      case "maintainer.invite.cancel":
        result = await cancelMaintainerInviteMutation(input);
        break;
      case "maintainer.revoke":
        result = await revokeMaintainerMutation(input);
        break;
      default:
        return json({ ok: false, error: "Unknown operation" }, 400);
    }

    return json(result, result.ok ? successStatus : failureStatus(result));
  } catch (error) {
    const status =
      error instanceof PortalAuthorizationError ? error.status : null;
    if (status !== null) {
      return json(
        { ok: false, error: status === 401 ? "Unauthenticated" : "Forbidden" },
        status,
      );
    }
    return json({ ok: false, error: "Operation failed" }, 500);
  }
}
