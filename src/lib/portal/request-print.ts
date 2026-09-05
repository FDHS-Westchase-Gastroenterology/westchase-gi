import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { REQUEST_LOCATIONS, REQUEST_TIMES } from "./contracts";
import type { RequestLocation, RequestTime } from "./contracts";
import {
  presentationStatus,
  storedRequestStateSchema,
  VIEW_DB_STATUSES,
} from "./workflow/contracts";
import type { RequestStatus } from "./workflow/contracts";

const RPC_NAME = "portal_prepare_new_request_print_packet";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const POSTGRES_TIMESTAMP_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.(\d{1,6}))?(?:Z|[+-]\d{2}:\d{2})$/;

export interface NewRequestPrintRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  location: RequestLocation;
  preferredTime: RequestTime;
  message: string | null;
  locale: string;
  sourcePath: string;
  createdAt: string;
  status: RequestStatus;
}

export type NewRequestPrintPacketResult =
  | {
      ok: true;
      generatedAt: string;
      requests: NewRequestPrintRow[];
    }
  | { ok: false };

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

const isoTimestampSchema = z.string().refine((value) => postgresTimestampKey(value) !== null);

const printRowSchema = z.strictObject({
  created_at: isoTimestampSchema,
  email: z.string().nullable(),
  id: z.string().regex(UUID_RE),
  locale: z.string().min(1),
  location: z.enum(REQUEST_LOCATIONS),
  message: z.string().nullable(),
  name: z.string().min(1),
  phone: z.string().min(1),
  preferred_time: z.enum(REQUEST_TIMES),
  source_path: z.string().min(1),
});

const packetSchema = z.strictObject({
  generated_at: isoTimestampSchema,
  requests: z.array(printRowSchema),
});

const rpcEnvelopeSchema = z.object({
  data: z.unknown(),
  error: z.unknown().nullable().optional(),
});

const statusPrintRowSchema = printRowSchema.extend({
  status: storedRequestStateSchema,
});

function toPrintRow(
  row: z.infer<typeof printRowSchema>,
  status: RequestStatus = "new",
): NewRequestPrintRow {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    location: row.location,
    preferredTime: row.preferred_time,
    message: row.message,
    locale: row.locale,
    sourcePath: row.source_path,
    createdAt: row.created_at,
    status,
  };
}

function collectOrderedRows(
  values: readonly Readonly<NewRequestPrintRow>[],
): NewRequestPrintRow[] | null {
  const requests: NewRequestPrintRow[] = [];
  const ids = new Set<string>();
  let previous: NewRequestPrintRow | null = null;
  for (const row of values) {
    if (ids.has(row.id)) return null;
    if (previous !== null) {
      const previousTime = postgresTimestampKey(previous.createdAt);
      const currentTime = postgresTimestampKey(row.createdAt);
      if (previousTime === null || currentTime === null) return null;
      const timeOrder =
        previousTime.epochMilliseconds - currentTime.epochMilliseconds ||
        previousTime.microsecondsWithinMillisecond - currentTime.microsecondsWithinMillisecond;
      if (timeOrder > 0 || (timeOrder === 0 && previous.id > row.id)) {
        return null;
      }
    }
    ids.add(row.id);
    requests.push(row);
    previous = row;
  }
  return requests;
}

export async function prepareNewRequestPrintPacket(
  input: Readonly<{
    db: SupabaseClient;
    actorEmail: string;
  }>,
): Promise<NewRequestPrintPacketResult> {
  try {
    const rpcResult = await input.db.rpc(RPC_NAME, {
      p_actor_email: input.actorEmail,
    });
    const envelope = rpcEnvelopeSchema.safeParse(rpcResult);
    if (!envelope.success || envelope.data.error !== null) {
      return { ok: false };
    }

    const packet = packetSchema.safeParse(envelope.data.data);
    if (!packet.success) return { ok: false };

    const requests = collectOrderedRows(packet.data.requests.map((value) => toPrintRow(value)));
    if (requests === null) return { ok: false };

    return { ok: true, generatedAt: packet.data.generated_at, requests };
  } catch {
    return { ok: false };
  }
}

export async function prepareStatusRequestPrintPacket(
  input: Readonly<{
    db: SupabaseClient;
    statuses: readonly RequestStatus[];
  }>,
): Promise<NewRequestPrintPacketResult> {
  if (input.statuses.length === 0) return { ok: false };

  try {
    const dbStatuses = [...new Set(input.statuses.flatMap((status) => VIEW_DB_STATUSES[status]))];
    const query = input.db
      .from("requests")
      .select(
        "id, name, phone, email, location, preferred_time, message, locale, source_path, created_at, status",
      )
      .in("status", dbStatuses)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    const { data, error } = await query;
    if (error) return { ok: false };

    const parsed = z.array(statusPrintRowSchema).safeParse(data);
    if (!parsed.success) return { ok: false };

    const requests = collectOrderedRows(
      parsed.data.map((row) => toPrintRow(row, presentationStatus(row.status))),
    );
    if (requests === null) return { ok: false };

    return {
      ok: true,
      generatedAt: new Date().toISOString(),
      requests,
    };
  } catch {
    return { ok: false };
  }
}
