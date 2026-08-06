import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { RequestStatus } from "@/lib/portal/contracts";
import {
  orderQueueRows,
  type AttentiveRow,
} from "@/lib/portal/queue-attention";

// Shared queue reads for the requests list and the detail page's
// previous/next continuity: one attention derivation, one fetch shape.

export type QueueRow = {
  id: string;
  name: string;
  phone: string;
  location: "any" | "tampa" | "lutz";
  preferred_time: "any" | "morning" | "afternoon";
  locale: string;
  /** Deploy-overlap presentation shape: durable `booked` normalizes to legacy UI `scheduled`. */
  status: RequestStatus;
  created_at: string;
  follow_up_at: string | null;
  /** Migrated closure awaiting staff review (spec DEC-26): stays visible. */
  legacy_review_required: boolean;
};

export type AttentiveQueueRow = AttentiveRow<QueueRow>;

const COLUMNS =
  "id, name, phone, location, preferred_time, locale, status, created_at, follow_up_at, legacy_review_required";

// Open-queue candidates are bounded well past any realistic front-desk
// backlog; beyond this the attention ordering would need a database view.
// ponytail: if open rows ever approach the cap, revisit with a computed
// ordering column instead of widening it.
export const OPEN_CANDIDATE_LIMIT = 500;

// The five staff views are presentation vocabulary (spec DEC-UX-04);
// Scheduled is a label over durable `booked` (DEC-04). Each view queries
// its durable statuses here — including legacy `scheduled` rows during
// the deploy-overlap window (spec §14.2 step 3) — and every row
// normalizes back to presentation vocabulary before rendering.
export const VIEW_DB_STATUSES = {
  new: ["new"],
  contacted: ["contacted"],
  scheduled: ["booked", "scheduled"],
  closed: ["closed"],
} as const satisfies Record<RequestStatus, readonly string[]>;

export const OPEN_STATUSES = ["new", "contacted", "scheduled"] as const;
export type OpenStatus = (typeof OPEN_STATUSES)[number];

/**
 * The attention-ordered open set: open statuses (or one scoped status),
 * each row tagged with its attention bucket and last-activity time.
 * Throws on read failure — the queue's honest-failure path handles it.
 */
export async function fetchAttentiveOpenRows(
  db: SupabaseClient,
  {
    statuses = [...OPEN_STATUSES],
    searchFilter = "",
    now = new Date(),
  }: {
    statuses?: readonly OpenStatus[];
    searchFilter?: string;
    now?: Date;
  } = {},
): Promise<AttentiveQueueRow[]> {
  const dbStatuses = statuses.flatMap((view) => VIEW_DB_STATUSES[view]);
  let query = db
    .from("requests")
    .select(COLUMNS)
    .in("status", dbStatuses)
    .order("created_at", { ascending: false })
    .limit(OPEN_CANDIDATE_LIMIT);
  if (searchFilter) query = query.or(searchFilter);
  const { data, error } = await query;
  if (error) throw new Error(`Queue read failed: ${error.code}`);
  const rows = (data ?? []).map((row) => ({
    ...row,
    status: row.status === "booked" ? "scheduled" : row.status,
  })) as QueueRow[];

  const activityById = new Map<string, string>();
  const ids = rows.map((row) => row.id);
  // PostgREST URL limits reject long `in` lists (a 500-row candidate set is
  // ~18KB of UUIDs), so the activity map is fetched in parallel chunks.
  const ACTIVITY_ID_CHUNK = 100;
  const activityChunks: Array<{
    data: Array<Record<string, unknown>> | null;
    error: { code?: string } | null;
  }> = await Promise.all(
    Array.from(
      { length: Math.ceil(ids.length / ACTIVITY_ID_CHUNK) },
      (_, chunkIndex) =>
        db
          .from("audit_log")
          .select("entity_id, at")
          .eq("entity", "requests")
          .in(
            "entity_id",
            ids.slice(
              chunkIndex * ACTIVITY_ID_CHUNK,
              (chunkIndex + 1) * ACTIVITY_ID_CHUNK,
            ),
          ),
    ),
  );
  for (const chunk of activityChunks) {
    if (chunk.error) {
      throw new Error(`Queue read failed: ${chunk.error.code}`);
    }
    for (const row of chunk.data ?? []) {
      const id = row.entity_id as string | null;
      const at = row.at as string | null;
      if (!id || !at) continue;
      const current = activityById.get(id);
      if (!current || at > current) activityById.set(id, at);
    }
  }

  return orderQueueRows(rows, activityById, now) as AttentiveQueueRow[];
}

/**
 * A window of the closed tail, newest first (the "rest" beneath the
 * attention set). Throws on read failure.
 */
export async function fetchClosedRows(
  db: SupabaseClient,
  {
    from,
    limit,
    searchFilter = "",
  }: {
    from: number;
    limit: number;
    searchFilter?: string;
  },
): Promise<QueueRow[]> {
  let query = db
    .from("requests")
    .select(COLUMNS)
    .eq("status", "closed")
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);
  if (searchFilter) query = query.or(searchFilter);
  const { data, error } = await query;
  if (error) throw new Error(`Queue read failed: ${error.code}`);
  return (data ?? []) as QueueRow[];
}
