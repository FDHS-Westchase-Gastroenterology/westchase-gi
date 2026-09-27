import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { REQUEST_LOCATIONS, REQUEST_TIMES } from "@/lib/portal/contracts";
import { fetchStaffNameMap } from "@/lib/portal/staff-identity";
import type { RequestWorkSurface } from "@/lib/portal/workflow/contracts";
import {
  REQUEST_EVENT_COLUMNS,
  REQUEST_TRANSITION_COLUMNS,
  REQUEST_WORK_COLUMNS,
  composeRequestWorkSurface,
  fetchRequestWorkSurface,
} from "@/lib/portal/workflow/reads";

import type { FullRecord } from "./contracts";

const RECORD_COLUMNS =
  "id,name,phone,email,location,preferred_time,message,created_at,locale,source_path";

/* One `requests` select for the batched read: the record's own columns and
   the work surface's, each named once. */
const BATCH_REQUEST_COLUMNS = [
  ...new Set([...RECORD_COLUMNS.split(","), ...REQUEST_WORK_COLUMNS.split(",")]),
].join(",");

/** Request ids per `.in(...)` filter, which keeps each PostgREST URL short. */
export const FULL_RECORD_BATCH_SIZE = 100;
/** Rows per page; PostgREST caps a response at its `max_rows`. */
const PAGE_ROWS = 1000;

const recordRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  location: z.enum(REQUEST_LOCATIONS),
  preferred_time: z.enum(REQUEST_TIMES),
  message: z.string().nullable(),
  created_at: z.string(),
  locale: z.string(),
  source_path: z.string(),
});

/* A batched `requests` row: the record's columns, parsed here, with the
   work-surface columns kept for composeRequestWorkSurface to parse. */
const batchRowSchema = recordRowSchema.loose();
type RecordRow = z.infer<typeof recordRowSchema>;
type BatchRow = z.infer<typeof batchRowSchema>;

const requestIdRowSchema = z.object({ request_id: z.string() });

function composeFullRecord(
  row: RecordRow,
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the work surface carries workflow history entries whose types cannot be made readonly
  surface: RequestWorkSurface,
  staffNames: ReadonlyMap<string, string>,
): FullRecord {
  const actorNames: Record<string, string> = {};
  for (const entry of surface.history) {
    if (!("actor" in entry)) continue;
    const email = entry.actor.trim().toLowerCase();
    const name = staffNames.get(email);
    if (name !== undefined) actorNames[email] = name;
  }
  return {
    id: row.id,
    version: surface.version,
    state: surface.state,
    name: row.name,
    phone: row.phone,
    email: row.email,
    location: row.location,
    preferredTime: row.preferred_time,
    message: row.message,
    createdAt: row.created_at,
    locale: row.locale,
    sourcePath: row.source_path,
    callAgainAt: surface.callAgainAt,
    bookingConfirmedAt: surface.bookingConfirmedAt,
    appointmentAt: surface.appointmentAt,
    closedAt: surface.closedAt,
    closureReason: surface.closureReason,
    legacyReviewRequired: surface.legacyReviewRequired,
    history: surface.history,
    actorNames,
  };
}

export async function fetchFullRecord(
  db: SupabaseClient,
  requestId: string,
): Promise<FullRecord | null> {
  const [request, surface, staffNames] = await Promise.all([
    db.from("requests").select(RECORD_COLUMNS).eq("id", requestId).maybeSingle(),
    fetchRequestWorkSurface(db, requestId),
    fetchStaffNameMap(db),
  ]);
  if (request.error) throw new Error("Full record read failed");
  if (request.data === null) return null;
  const row = recordRowSchema.safeParse(request.data);
  if (!row.success) throw new Error("Invalid full record");
  if (surface === null) return null;
  return composeFullRecord(row.data, surface, staffNames);
}

interface PageResult {
  readonly data: unknown;
  readonly error: unknown;
  readonly count?: number | null;
}

/* Every row a filtered, ordered select matches, page by page. The first page
   asks for an exact count and the read continues until it holds that many
   rows, so a server `max_rows` below PAGE_ROWS cannot silently truncate it.
   A read that comes up short (a row removed mid-read) fails rather than
   returning part of a record. */
async function readEveryRow(
  page: (from: number, to: number) => PromiseLike<PageResult>,
): Promise<unknown[]> {
  const rows: unknown[] = [];
  let expected: number | null = null;
  for (;;) {
    const result = await page(rows.length, rows.length + PAGE_ROWS - 1);
    if (result.error !== null && result.error !== undefined)
      throw new Error("Full record read failed");
    if (expected === null) {
      const count = z.number().int().nonnegative().safeParse(result.count);
      if (!count.success) throw new Error("Full record read failed");
      expected = count.data;
    }
    const parsed = z.array(z.unknown()).safeParse(result.data);
    if (!parsed.success) throw new Error("Full record read failed");
    rows.push(...parsed.data);
    if (rows.length >= expected) return rows;
    if (parsed.data.length === 0) throw new Error("Full record read incomplete");
  }
}

function chunks<T>(values: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let start = 0; start < values.length; start += size)
    result.push(values.slice(start, start + size));
  return result;
}

function groupByRequest(rows: readonly unknown[]): Map<string, unknown[]> {
  const grouped = new Map<string, unknown[]>();
  for (const raw of rows) {
    const parsed = requestIdRowSchema.safeParse(raw);
    if (!parsed.success) continue;
    const list = grouped.get(parsed.data.request_id);
    if (list === undefined) grouped.set(parsed.data.request_id, [raw]);
    else list.push(raw);
  }
  return grouped;
}

/* The work-surface rows for already-read requests: every transition and
   event for their ids, newest first, paged and chunked, plus staff names
   once. Each request's rows keep the newest-first order the single read
   uses, so composition is identical. */
async function composeFullRecords(
  db: SupabaseClient,
  requestRows: readonly unknown[],
): Promise<FullRecord[]> {
  const parsed = z.array(batchRowSchema).safeParse(requestRows);
  if (!parsed.success) throw new Error("Invalid full record");
  const rows: readonly BatchRow[] = parsed.data;
  const ids = rows.map((row) => row.id);
  if (new Set(ids).size !== ids.length) throw new Error("Invalid full record");
  if (ids.length === 0) return [];

  const transitions: unknown[] = [];
  const events: unknown[] = [];
  const staffNamesRead = fetchStaffNameMap(db);
  for (const chunk of chunks(ids, FULL_RECORD_BATCH_SIZE)) {
    const [chunkTransitions, chunkEvents] = await Promise.all([
      readEveryRow((from, to) =>
        db
          .from("request_transitions")
          .select(`request_id,${REQUEST_TRANSITION_COLUMNS}`, { count: "exact" })
          .in("request_id", chunk)
          .order("occurred_at", { ascending: false })
          .order("id", { ascending: true })
          .range(from, to),
      ),
      readEveryRow((from, to) =>
        db
          .from("request_events")
          .select(`request_id,${REQUEST_EVENT_COLUMNS}`, { count: "exact" })
          .in("request_id", chunk)
          .order("created_at", { ascending: false })
          .order("id", { ascending: true })
          .range(from, to),
      ),
    ]);
    transitions.push(...chunkTransitions);
    events.push(...chunkEvents);
  }
  const staffNames = await staffNamesRead;

  const transitionsByRequest = groupByRequest(transitions);
  const eventsByRequest = groupByRequest(events);
  const now = new Date();
  return rows.map((row) =>
    composeFullRecord(
      row,
      composeRequestWorkSurface({
        requestId: row.id,
        request: row,
        transitions: transitionsByRequest.get(row.id) ?? [],
        events: eventsByRequest.get(row.id) ?? [],
        now,
      }),
      staffNames,
    ),
  );
}

/**
 * Many full records in one bounded read: `requests` by id, then every
 * transition and event for those ids, and staff names once, never one
 * query per request. Records come back in the order of `ids`; an id with
 * no request is left out, so a caller that needs every id compares
 * lengths. Throws when a read fails or a stored row is invalid.
 */
export async function fetchFullRecords(
  db: SupabaseClient,
  ids: readonly string[],
): Promise<FullRecord[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];
  const byId = new Map<string, unknown>();
  for (const chunk of chunks(unique, FULL_RECORD_BATCH_SIZE)) {
    const chunkRows = await readEveryRow((from, to) =>
      db
        .from("requests")
        .select(BATCH_REQUEST_COLUMNS, { count: "exact" })
        .in("id", chunk)
        .order("id", { ascending: true })
        .range(from, to),
    );
    const parsed = z.array(z.object({ id: z.string() }).loose()).safeParse(chunkRows);
    if (!parsed.success) throw new Error("Invalid full record");
    for (const row of parsed.data) byId.set(row.id, row);
  }
  const rows: unknown[] = [];
  for (const id of unique) {
    const row = byId.get(id);
    if (row !== undefined) rows.push(row);
  }
  return composeFullRecords(db, rows);
}

/**
 * Every full record whose stored status is one of `states`, oldest first
 * (`created_at`, then `id`), read the same batched way as
 * `fetchFullRecords`. The status packet's read.
 */
export async function fetchFullRecordsByStoredStatus(
  db: SupabaseClient,
  states: readonly string[],
): Promise<FullRecord[]> {
  if (states.length === 0) return [];
  const rows = await readEveryRow((from, to) =>
    db
      .from("requests")
      .select(BATCH_REQUEST_COLUMNS, { count: "exact" })
      .in("status", [...states])
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
  );
  return composeFullRecords(db, rows);
}
