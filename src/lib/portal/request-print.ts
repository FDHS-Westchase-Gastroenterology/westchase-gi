import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { PRINT_ID_LIMIT } from "./print-selection";
import { requestIdSchema } from "./request-record/contracts";
import type { FullRecord } from "./request-record/contracts";
import { fetchFullRecords, fetchFullRecordsByStoredStatus } from "./request-record/reads";
import { presentationStatus, VIEW_DB_STATUSES } from "./workflow/contracts";
import type { RequestStatus } from "./workflow/contracts";

const POSTGRES_TIMESTAMP_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.(\d{1,6}))?(?:Z|[+-]\d{2}:\d{2})$/;

/**
 * A print packet is whole or it is nothing: patient details render only when
 * every page can print (ARCHITECTURE.md "Atomicity").
 * - `unavailable`: a read failed, or a stored row or the order was invalid.
 * - `missing`: a chosen request no longer exists, so the packet cannot be
 *   the list staff chose.
 * `preparedAt` is the one ISO time the whole packet was read at; every page
 * prints it.
 */
export type RequestPrintPacketResult =
  | { ok: true; records: FullRecord[]; preparedAt: string }
  | { ok: false; reason: "unavailable" | "missing" };

interface PostgresTimestampKey {
  epochMilliseconds: number;
  microsecondsWithinMillisecond: number;
}

function postgresTimestampKey(value: string): PostgresTimestampKey | null {
  const match = POSTGRES_TIMESTAMP_RE.exec(value);
  const epochMilliseconds = Date.parse(value);
  if (match === null || !Number.isFinite(epochMilliseconds)) return null;

  const fraction = match.at(1) ?? "";
  const microseconds = fraction.padEnd(6, "0").slice(3, 6);
  return {
    epochMilliseconds,
    microsecondsWithinMillisecond: Number.parseInt(microseconds, 10),
  };
}

interface OrderKey {
  readonly position: number;
  readonly id: string;
  readonly epochMilliseconds: number;
  readonly microsecondsWithinMillisecond: number;
}

function compareOldestFirst(a: Readonly<OrderKey>, b: Readonly<OrderKey>): number {
  const timeOrder =
    a.epochMilliseconds - b.epochMilliseconds ||
    a.microsecondsWithinMillisecond - b.microsecondsWithinMillisecond;
  if (timeOrder !== 0) return timeOrder;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

/* Oldest first by `created_at` to the microsecond, then `id`: the order the
   database's own `order by created_at, id` gives. Null when a timestamp is
   unreadable or an id repeats, so a packet never prints a guessed order. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the request record carries workflow history entries whose types cannot be made readonly
function oldestFirst(records: readonly FullRecord[]): FullRecord[] | null {
  const keys: OrderKey[] = [];
  const ids = new Set<string>();
  for (const [position, record] of records.entries()) {
    const time = postgresTimestampKey(record.createdAt);
    if (time === null || ids.has(record.id)) return null;
    ids.add(record.id);
    keys.push({ position, id: record.id, ...time });
  }
  return keys.toSorted(compareOldestFirst).flatMap((key) => records.at(key.position) ?? []);
}

/** Every request in the chosen statuses, oldest first. */
export async function prepareStatusRequestPrintPacket(
  input: Readonly<{
    db: SupabaseClient;
    statuses: readonly RequestStatus[];
  }>,
): Promise<RequestPrintPacketResult> {
  if (input.statuses.length === 0) return { ok: false, reason: "unavailable" };

  try {
    const dbStatuses = [...new Set(input.statuses.flatMap((status) => VIEW_DB_STATUSES[status]))];
    const records = await fetchFullRecordsByStoredStatus(input.db, dbStatuses);
    const preparedAt = new Date().toISOString();
    const wanted = new Set<RequestStatus>(input.statuses);
    if (!records.every((record) => wanted.has(presentationStatus(record.state))))
      return { ok: false, reason: "unavailable" };
    const ordered = oldestFirst(records);
    if (ordered === null) return { ok: false, reason: "unavailable" };
    return { ok: true, records: ordered, preparedAt };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

/**
 * Exactly the chosen requests, re-validated here rather than trusted from
 * the URL, oldest first. Every id must still name a request; one that does
 * not fails the whole packet rather than printing part of the list.
 */
export async function prepareIdRequestPrintPacket(
  input: Readonly<{
    db: SupabaseClient;
    ids: readonly string[];
  }>,
): Promise<RequestPrintPacketResult> {
  const ids = [...new Set(input.ids)];
  if (
    ids.length === 0 ||
    ids.length !== input.ids.length ||
    ids.length > PRINT_ID_LIMIT ||
    !ids.every((id) => requestIdSchema.safeParse(id).success)
  )
    return { ok: false, reason: "unavailable" };

  try {
    const records = await fetchFullRecords(input.db, ids);
    const preparedAt = new Date().toISOString();
    if (records.length !== ids.length) return { ok: false, reason: "missing" };
    const ordered = oldestFirst(records);
    if (ordered === null) return { ok: false, reason: "unavailable" };
    return { ok: true, records: ordered, preparedAt };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
