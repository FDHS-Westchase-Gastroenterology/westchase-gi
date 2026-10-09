"use server";

import { readActivity } from "@/lib/portal/activity";
import type {
  ActivityCursor,
  ActivityFilters,
  ActivityPage,
} from "@/lib/portal/activity-contracts";
import { requireRole } from "@/lib/portal/auth";
import { serviceClient } from "@/lib/portal/server";

/* The Activity log's read (issue #357), for the page's filters and its
   infinite scroll. A POST, so the search stays out of addresses and logs;
   nothing here records it. The viewer's role comes from the session inside
   the database, never from the caller. Returns an outcome rather than
   throwing; a signed-out caller gets a 401 throw from requireRole. */
export async function readActivityPage(
  filters: Readonly<ActivityFilters>,
  cursor: Readonly<ActivityCursor>,
): Promise<ActivityPage> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  try {
    return await readActivity(serviceClient(), session.id, filters, cursor);
  } catch {
    return { ok: false, code: "unavailable" };
  }
}
