import "server-only";

import { z } from "zod";

import type { PortalSessionUser } from "@/lib/portal/auth";
import { serviceClient } from "@/lib/portal/server";

import {
  derivePortalReleaseState,
  parsePortalReleaseId,
  portalReleaseStateRowSchema,
} from "./release-state";
import type { PortalReleaseState } from "./release-state";

export type { PortalReleaseState };

type PortalReleaseMutation =
  | "portal_open_staff_release"
  | "portal_acknowledge_staff_release"
  | "portal_hide_staff_release"
  | "portal_record_staff_release_guide_open"
  | "portal_record_staff_release_dismiss";

export async function getPortalReleaseState(
  session: Readonly<PortalSessionUser>,
  releaseId: string,
  now: Date = new Date(),
): Promise<PortalReleaseState> {
  const parsedReleaseId = parsePortalReleaseId(releaseId);
  if (parsedReleaseId === null) return { status: "unavailable" };

  try {
    const result = await serviceClient()
      .from("portal_release_states")
      .select("first_opened_at, acknowledged_at, hidden_at")
      .eq("staff_user_id", session.id)
      .eq("release_id", parsedReleaseId)
      .maybeSingle();

    if (result.error !== null) return { status: "unavailable" };
    if (result.data === null) return derivePortalReleaseState(null, now);
    const parsed = portalReleaseStateRowSchema.safeParse(result.data);
    if (!parsed.success) return { status: "unavailable" };
    return derivePortalReleaseState(parsed.data, now);
  } catch {
    return { status: "unavailable" };
  }
}

export async function mutatePortalReleaseState(
  session: Readonly<PortalSessionUser>,
  mutation: PortalReleaseMutation,
  releaseId: string,
): Promise<boolean> {
  const result = await serviceClient().rpc(mutation, {
    p_user_id: session.id,
    p_release_id: releaseId,
  });
  const accepted = z.boolean().safeParse(result.data);
  if (result.error !== null || !accepted.success) {
    throw new Error(
      `Portal release state mutation failed: ${result.error !== null ? result.error.code : "invalid_result"}`,
    );
  }
  return accepted.data;
}
