"use server";

import { requireRole } from "@/lib/portal/auth";
import { mutatePortalReleaseState } from "@/lib/portal/release-briefing";
import { PORTAL_RELEASE_BRIEFING } from "@/lib/portal/release-briefing-content";
import { parseSupportedPortalReleaseId } from "@/lib/portal/release-state";

export type PortalReleaseActionResult =
  | { ok: true }
  | { ok: false; code: "invalid" | "unavailable" };

type PortalReleaseMutation =
  | "portal_open_staff_release"
  | "portal_acknowledge_staff_release"
  | "portal_hide_staff_release"
  | "portal_record_staff_release_guide_open"
  | "portal_record_staff_release_dismiss";

async function runPortalReleaseAction(
  mutation: PortalReleaseMutation,
  releaseId: unknown,
): Promise<PortalReleaseActionResult> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  const parsedReleaseId = parseSupportedPortalReleaseId(
    releaseId,
    PORTAL_RELEASE_BRIEFING.id,
  );
  if (!parsedReleaseId) return { ok: false, code: "invalid" };

  try {
    await mutatePortalReleaseState(session, mutation, parsedReleaseId);
    return { ok: true };
  } catch {
    return { ok: false, code: "unavailable" };
  }
}

export async function openPortalReleaseAction(
  releaseId: unknown,
): Promise<PortalReleaseActionResult> {
  return runPortalReleaseAction("portal_open_staff_release", releaseId);
}

export async function acknowledgePortalReleaseAction(
  releaseId: unknown,
): Promise<PortalReleaseActionResult> {
  return runPortalReleaseAction("portal_acknowledge_staff_release", releaseId);
}

export async function hidePortalReleaseAction(
  releaseId: unknown,
): Promise<PortalReleaseActionResult> {
  return runPortalReleaseAction("portal_hide_staff_release", releaseId);
}

export async function recordPortalReleaseGuideOpenAction(
  releaseId: unknown,
): Promise<PortalReleaseActionResult> {
  return runPortalReleaseAction(
    "portal_record_staff_release_guide_open",
    releaseId,
  );
}

export async function recordPortalReleaseDismissAction(
  releaseId: unknown,
): Promise<PortalReleaseActionResult> {
  return runPortalReleaseAction(
    "portal_record_staff_release_dismiss",
    releaseId,
  );
}
