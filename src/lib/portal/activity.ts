import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ACTIVITY_PAGE_SIZE,
  activityCursorSchema,
  activityFiltersSchema,
  activityPageSchema,
} from "./activity-contracts";
import type { ActivityCursor, ActivityFilters, ActivityPage } from "./activity-contracts";

function listOrNull<T>(list: readonly T[] | undefined): T[] | null {
  return list === undefined || list.length === 0 ? null : [...new Set(list)];
}

/**
 * One page of the Activity log for the signed-in staff member, newest first. Who sees what
 * is decided by the database from the actor's own staff profile: front desk gets
 * appointments, requests, the schedule and their own sign-ins; an admin gets everything.
 *
 * Fails with `invalid_command` for filters or a cursor the contract refuses (including a
 * search of more than eight words), `unauthorized` for an actor who is not active, onboarded
 * staff, and `unavailable` when the database cannot answer. The search text is passed to the
 * database and nowhere else.
 */
export async function readActivity(
  db: SupabaseClient,
  actorId: string,
  filters: Readonly<ActivityFilters>,
  cursor: Readonly<ActivityCursor>,
  limit: number = ACTIVITY_PAGE_SIZE,
): Promise<ActivityPage> {
  const parsedFilters = activityFiltersSchema.safeParse(filters);
  const parsedCursor = activityCursorSchema.safeParse(cursor);
  if (!parsedFilters.success || !parsedCursor.success || !Number.isInteger(limit)) {
    return { ok: false, code: "invalid_command" };
  }
  if (limit < 1 || limit > 100) return { ok: false, code: "invalid_command" };
  const f = parsedFilters.data;
  const query = f.query?.trim() ?? "";
  const result = await db
    .rpc("portal_read_activity", {
      p_actor_id: actorId,
      p_categories: listOrNull(f.categories),
      p_appointment_actions: listOrNull(f.appointmentActions),
      p_provider_id: f.providerId ?? null,
      p_from: f.from ?? null,
      p_to: f.to ?? null,
      p_query: query === "" ? null : query,
      p_before_at: parsedCursor.data?.occurredAt ?? null,
      p_before_id: parsedCursor.data?.id ?? null,
      p_limit: limit,
    })
    .abortSignal(AbortSignal.timeout(10_000));
  if (result.error !== null) return { ok: false, code: "unavailable" };
  const page = activityPageSchema.safeParse(result.data);
  return page.success ? page.data : { ok: false, code: "unavailable" };
}
