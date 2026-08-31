import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { RequestStatus } from "@/lib/portal/contracts";
import { orderQueueRows } from "@/lib/portal/queue-attention";
import type { AttentiveRow } from "@/lib/portal/queue-attention";
import { uniqueByRequestId } from "@/lib/portal/request-query";

// Shared queue reads for the requests list and the detail page's
// Previous/next continuity: one attention derivation, one fetch shape.

export interface QueueRow {
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
  /** Migrated closure awaiting staff review (spec §14): stays visible. */
  legacy_review_required: boolean;
  /** Optimistic-concurrency token, so a row can be worked where it is read. */
  version: number;
}

export type AttentiveQueueRow = AttentiveRow<QueueRow>;

/** A queue row that also knows who last worked it (newest audit actor). */
export type WorkedQueueRow = AttentiveQueueRow & { lastActivityBy: string | null };

const COLUMNS =
  "id, name, phone, location, preferred_time, locale, status, created_at, follow_up_at, legacy_review_required, version";

// Open-queue candidates are bounded well past any realistic front-desk
// Backlog; beyond this the attention ordering would need a database view.
// ponytail: if open rows ever approach the cap, revisit with a computed
// Ordering column instead of widening it.
export const OPEN_CANDIDATE_LIMIT = 500;

// The five staff views are presentation vocabulary (spec §3);
// Scheduled is a label over durable `booked` (spec §2). Each view queries
// Its durable statuses here — including legacy `scheduled` rows during
// The compatibility window (spec §14) — and every row
// Normalizes back to presentation vocabulary before rendering.
export const VIEW_DB_STATUSES = {
  new: ["new"],
  contacted: ["contacted"],
  scheduled: ["booked", "scheduled"],
  closed: ["closed"],
} as const satisfies Record<RequestStatus, readonly string[]>;

export const OPEN_STATUSES = ["new", "contacted", "scheduled"] as const;
export type OpenStatus = (typeof OPEN_STATUSES)[number];

const storedStatusSchema = z.enum(["new", "contacted", "scheduled", "booked", "closed"]);

const storedQueueRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  location: z.enum(["any", "tampa", "lutz"]),
  preferred_time: z.enum(["any", "morning", "afternoon"]),
  locale: z.string(),
  status: storedStatusSchema,
  created_at: z.string(),
  follow_up_at: z.string().nullable(),
  legacy_review_required: z.boolean(),
  // Postgres may hand a bigint back as a string, the way the work-surface
  // Read already allows for.
  version: z.union([z.number(), z.string()]),
});

function toQueueRow(row: z.infer<typeof storedQueueRowSchema>): QueueRow {
  return {
    ...row,
    status: row.status === "booked" ? "scheduled" : row.status,
    version: Number(row.version),
  };
}

const activityRowSchema = z.object({
  entity_id: z.string().nullable(),
  at: z.string(),
  actor_email: z.string().nullable(),
});

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
  }: Readonly<{
    statuses?: readonly OpenStatus[];
    searchFilter?: string;
    now?: Date;
  }> = {},
): Promise<WorkedQueueRow[]> {
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
  const parsedRows = z.array(storedQueueRowSchema).safeParse(data);
  if (!parsedRows.success) throw new Error("Queue read failed: invalid");
  // Unique at the request, not the related-row fan-out. Counts on the
  // Page use the same unique `requests` rows, so chips, range, and list
  // Cannot disagree because notes or events matched more than once.
  const rows = uniqueByRequestId(parsedRows.data.map(toQueueRow));

  const activityById = new Map<string, string>();
  // "Last worked by": the newest audit row that names a staff actor. Tracked
  // With its own timestamp so row order inside a chunk cannot change the answer.
  const actorById = new Map<string, { at: string; email: string }>();
  const ids = rows.map((row) => row.id);
  // PostgREST URL limits reject long `in` lists (a 500-row candidate set is
  // ~18KB of UUIDs), so the activity map is fetched in parallel chunks.
  const ACTIVITY_ID_CHUNK = 100;
  const activityChunks = await Promise.all(
    Array.from({ length: Math.ceil(ids.length / ACTIVITY_ID_CHUNK) }, (_, chunkIndex) =>
      db
        .from("audit_log")
        .select("entity_id, at, actor_email")
        .eq("entity", "requests")
        .in(
          "entity_id",
          ids.slice(chunkIndex * ACTIVITY_ID_CHUNK, (chunkIndex + 1) * ACTIVITY_ID_CHUNK),
        ),
    ),
  );
  for (const chunk of activityChunks) {
    if (chunk.error) {
      throw new Error(`Queue read failed: ${chunk.error.code}`);
    }
    for (const row of chunk.data) {
      const parsed = activityRowSchema.safeParse(row);
      if (!parsed.success) continue;
      const { entity_id: id, at, actor_email: actor } = parsed.data;
      if (id === null || id === "") continue;
      const current = activityById.get(id);
      if (current === undefined || current === "" || at > current) {
        activityById.set(id, at);
      }
      if (actor !== null && actor !== "") {
        const knownActor = actorById.get(id);
        if (knownActor === undefined || at > knownActor.at) actorById.set(id, { at, email: actor });
      }
    }
  }

  return orderQueueRows(rows, activityById, now).map((row) => ({
    ...row,
    lastActivityBy: actorById.get(row.id)?.email ?? null,
  }));
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
  }: Readonly<{
    from: number;
    limit: number;
    searchFilter?: string;
  }>,
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
  const parsed = z.array(storedQueueRowSchema).safeParse(data);
  if (!parsed.success) throw new Error("Queue read failed: invalid");
  // Offset pages stay on `requests`. Unique-after-range would hide a join
  // Fan-out by returning a short page, so this query never joins related
  // Tables.
  return parsed.data.map(toQueueRow);
}
