import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { REQUEST_LOCATIONS, REQUEST_TIMES } from "@/lib/portal/contracts";
import type { RequestLocation, RequestTime } from "@/lib/portal/contracts";
import { orderQueueRows } from "@/lib/portal/queue-attention";
import type { AttentiveRow } from "@/lib/portal/queue-attention";
import { readRequestWorklist } from "@/lib/portal/request-worklist/service";
import { presentationStatus, storedRequestStateSchema } from "@/lib/portal/workflow/contracts";
import type { RequestStatus } from "@/lib/portal/workflow/contracts";

// Shared queue reads for Home's list and Schedule's worked-row refresh: one
// Attention derivation, one fetch shape.

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
  /** The linked patient record; the request card books directly when present. */
  patientId: string | null;
}

export type AttentiveQueueRow = AttentiveRow<QueueRow>;

/** A queue row that also knows who last worked it (newest audit actor). */
export type WorkedQueueRow = AttentiveQueueRow & { lastActivityBy: string | null };

const COLUMNS =
  "id, name, phone, location, preferred_time, locale, status, created_at, follow_up_at, legacy_review_required, version, patient_request_links(patient_id)";

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
  // A to-one embed: patient_request_links is keyed by request_id.
  patient_request_links: z.object({ patient_id: z.string() }).nullable(),
});

function toQueueRow({
  patient_request_links: link,
  ...row
}: z.infer<typeof storedQueueRowSchema>): QueueRow {
  return {
    ...row,
    status: presentationStatus(row.status),
    version: Number(row.version),
    patientId: link?.patient_id ?? null,
  };
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
  // Offset pages stay on `requests`. The only embed is the to-one patient
  // Link (keyed by request_id), which cannot fan a row out and shorten a page.
  return parsed.data.map(toQueueRow);
}

const activitySchema = z.array(z.object({ at: z.string(), actor_email: z.string().nullable() }));

/**
 * One request as the worklist reads it: its attention bucket, its newest
 * activity, and who did it, on the same rules as portal_request_worklist_rows
 * (the newest request audit entry, and the newest one with an actor). Null
 * when the request does not exist; throws on a failed read.
 */
export async function fetchWorkedRow(
  db: SupabaseClient,
  requestId: string,
  now: Date = new Date(),
): Promise<WorkedQueueRow | null> {
  const audit = () =>
    db
      .from("audit_log")
      .select("at, actor_email")
      .eq("entity", "requests")
      .eq("entity_id", requestId)
      .order("at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1);
  const [requestRead, activityRead, actorRead] = await Promise.all([
    db.from("requests").select(COLUMNS).eq("id", requestId).maybeSingle(),
    audit(),
    audit().not("actor_email", "is", null).neq("actor_email", ""),
  ]);
  if (requestRead.error || activityRead.error || actorRead.error) {
    throw new Error("Request read failed");
  }
  if (requestRead.data === null) return null;
  const row = storedQueueRowSchema.safeParse(requestRead.data);
  const activity = activitySchema.safeParse(activityRead.data);
  const actor = activitySchema.safeParse(actorRead.data);
  if (!row.success || !activity.success || !actor.success) {
    throw new Error("Request read failed: invalid");
  }
  const newest = activity.data.at(0)?.at;
  const attentive = orderQueueRows(
    [toQueueRow(row.data)],
    new Map(newest === undefined ? [] : [[requestId, newest]]),
    now,
  ).at(0);
  if (attentive === undefined) return null;
  return { ...attentive, lastActivityBy: actor.data.at(0)?.actor_email ?? null };
}
