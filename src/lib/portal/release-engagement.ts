import "server-only";

import { serviceClient } from "@/lib/portal/server";
import { parsePortalReleaseEngagementRows } from "./release-engagement-model";
import type { PortalReleaseEngagementResult } from "./release-engagement-model";
import { parsePortalReleaseId } from "./release-state";

export type {
  PortalReleaseEngagementResult,
  PortalReleaseEngagementRow,
} from "./release-engagement-model";

export async function getPortalReleaseEngagement(
  releaseId: string,
): Promise<PortalReleaseEngagementResult> {
  const parsedReleaseId = parsePortalReleaseId(releaseId);
  if (parsedReleaseId === null) return { status: "unavailable" };

  try {
    const result = await serviceClient()
      .from("portal_release_states")
      .select(
        `
          staff_user_id,
          first_opened_at,
          last_viewed_at,
          view_count,
          acknowledged_at,
          hidden_at,
          guide_opened_at,
          last_guide_opened_at,
          guide_open_count,
          last_dismissed_at,
          dismiss_count,
          profile:staff_profiles!portal_release_states_staff_user_id_fkey (
            display_name,
            email,
            active
          )
        `,
      )
      .eq("release_id", parsedReleaseId)
      .order("first_opened_at", { ascending: false })
      .order("staff_user_id", { ascending: true });

    if (result.error !== null) return { status: "unavailable" };
    return parsePortalReleaseEngagementRows(result.data);
  } catch {
    return { status: "unavailable" };
  }
}
