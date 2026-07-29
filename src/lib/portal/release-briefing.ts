import "server-only";

import type { PortalSessionUser } from "@/lib/portal/auth";
import { serviceClient } from "@/lib/portal/server";
import {
  derivePortalReleaseState,
  parsePortalReleaseId,
  PORTAL_RELEASE_WINDOW_MS,
  type PortalReleaseState,
  type PortalReleaseStateRow,
} from "./release-state";

export { PORTAL_RELEASE_WINDOW_MS };
export type { PortalReleaseState };

type PortalReleaseMutation =
  | "portal_open_staff_release"
  | "portal_acknowledge_staff_release"
  | "portal_hide_staff_release";

export async function getPortalReleaseState(
  session: PortalSessionUser,
  releaseId: string,
  now: Date = new Date(),
): Promise<PortalReleaseState> {
  const parsedReleaseId = parsePortalReleaseId(releaseId);
  if (!parsedReleaseId) return { status: "unavailable" };

  try {
    const { data, error } = await serviceClient()
      .from("portal_release_states")
      .select("first_opened_at, acknowledged_at, hidden_at")
      .eq("staff_user_id", session.id)
      .eq("release_id", parsedReleaseId)
      .maybeSingle();

    if (error) return { status: "unavailable" };
    return derivePortalReleaseState(
      (data as PortalReleaseStateRow | null) ?? null,
      now,
    );
  } catch {
    return { status: "unavailable" };
  }
}

export async function mutatePortalReleaseState(
  session: PortalSessionUser,
  mutation: PortalReleaseMutation,
  releaseId: string,
): Promise<boolean> {
  const { data, error } = await serviceClient().rpc(mutation, {
    p_user_id: session.id,
    p_release_id: releaseId,
  });
  if (error || typeof data !== "boolean") {
    throw new Error(
      `Portal release state mutation failed: ${error?.code ?? "invalid_result"}`,
    );
  }
  return data;
}
