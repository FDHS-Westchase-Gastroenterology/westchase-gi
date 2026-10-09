import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { requestWorklistInputSchema } from "./contracts";
import type { RequestWorklistInput, RequestWorklistOutcome } from "./contracts";
import { requestWorklistDatabaseSchema } from "./rows";

export async function readRequestWorklist(
  db: SupabaseClient,
  actorId: string,
  input: Readonly<RequestWorklistInput>,
  now = new Date(),
): Promise<RequestWorklistOutcome> {
  const parsed = requestWorklistInputSchema.safeParse(input);
  if (!parsed.success || !Number.isFinite(now.getTime()))
    return { ok: false, code: "invalid_query" };
  const operation = parsed.data;
  const filter = {
    query: operation.query,
    statuses: operation.statuses,
    buckets: operation.buckets,
    location: operation.location,
    receivedFrom: operation.receivedFrom,
    receivedTo: operation.receivedTo,
    ...(operation.action === "page"
      ? { offset: operation.offset, limit: operation.limit }
      : { neighborId: operation.requestId }),
  };
  const result = await db
    .rpc("portal_read_request_worklist", {
      p_actor_id: actorId,
      p_filter: { ...filter, now: now.toISOString() },
    })
    .abortSignal(AbortSignal.timeout(10_000));
  if (result.error !== null) return { ok: false, code: "unavailable" };
  const outcome = requestWorklistDatabaseSchema.safeParse(result.data);
  return outcome.success ? outcome.data : { ok: false, code: "unavailable" };
}
