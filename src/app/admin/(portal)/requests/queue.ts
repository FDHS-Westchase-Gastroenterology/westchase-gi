import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { REQUEST_LOCATIONS, REQUEST_TIMES } from "@/lib/portal/contracts";
import type { RequestLocation, RequestTime } from "@/lib/portal/contracts";
import type { AttentiveRow } from "@/lib/portal/queue-attention";
import { readRequestWorklist } from "@/lib/portal/request-worklist/service";
import { presentationStatus, storedRequestStateSchema } from "@/lib/portal/workflow/contracts";
import type { RequestStatus } from "@/lib/portal/workflow/contracts";

// Shared queue reads for the requests list and the detail page's
// Previous/next continuity: one attention derivation, one fetch shape.

export interface QueueRow {
  id: string;
  name: string;
  phone: string;
  location: RequestLocation;
  preferred_time: RequestTime;
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

export type OpenStatus = Exclude<RequestStatus, "closed">;
export const OPEN_STATUSES = [
  "new",
  "contacted",
  "scheduled",
] as const satisfies readonly OpenStatus[];

const storedQueueRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  location: z.enum(REQUEST_LOCATIONS),
  preferred_time: z.enum(REQUEST_TIMES),
  locale: z.string(),
  status: storedRequestStateSchema,
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
    status: presentationStatus(row.status),
    version: Number(row.version),
  };
}

export interface RequestDetailRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  location: RequestLocation;
  preferred_time: RequestTime;
  message: string | null;
  locale: string;
  created_at: string;
}

const requestDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  location: z.enum(REQUEST_LOCATIONS),
  preferred_time: z.enum(REQUEST_TIMES),
  message: z.string().nullable(),
  locale: z.string(),
  created_at: z.string(),
}) satisfies z.ZodType<RequestDetailRow>;

/**
 * The patient-facing columns of one request for the detail page. Null when
 * the request does not exist or its row does not parse; throws on a failed
 * read, which the error boundary handles.
 */
export async function fetchRequestDetail(
  db: SupabaseClient,
  requestId: string,
): Promise<RequestDetailRow | null> {
  const { data, error } = await db
    .from("requests")
    .select("id, name, phone, email, location, preferred_time, message, locale, created_at")
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw new Error("Request detail read failed");
  const parsed = requestDetailSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/**
 * The attention-ordered open set: open statuses (or one scoped status),
 * each row tagged with its attention bucket and last-activity time.
 * Throws on read failure — the queue's honest-failure path handles it.
 */
export async function fetchAttentiveOpenRows(
  db: SupabaseClient,
  {
    actorId,
    statuses = [...OPEN_STATUSES],
    now = new Date(),
  }: Readonly<{
    actorId: string;
    statuses?: readonly OpenStatus[];
    now?: Date;
  }>,
): Promise<WorkedQueueRow[]> {
  const rows: WorkedQueueRow[] = [];
  let offset = 0;
  // The existing Home filters need the full open set. Fetch bounded pages;
  // Consumers with their own paging use the same read operation directly.
  for (;;) {
    const page = await readRequestWorklist(
      db,
      actorId,
      {
        action: "page",
        statuses,
        offset,
        limit: 200,
      },
      now,
    );
    if (!page.ok) throw new Error(`Queue read failed: ${page.code}`);
    rows.push(...page.items);
    if (page.nextOffset === null) return rows;
    if (page.nextOffset <= offset) throw new Error("Queue read failed: invalid page");
    offset = page.nextOffset;
  }
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
    .order("id", { ascending: true })
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
