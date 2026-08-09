import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const RPC_NAME = "portal_prepare_new_request_print_packet";
const PACKET_KEYS = ["generated_at", "requests"];
const ROW_KEYS = [
  "created_at",
  "email",
  "id",
  "locale",
  "location",
  "message",
  "name",
  "phone",
  "preferred_time",
  "source_path",
];

export type NewRequestPrintRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  location: "any" | "tampa" | "lutz";
  preferredTime: "any" | "morning" | "afternoon";
  message: string | null;
  locale: string;
  sourcePath: string;
  createdAt: string;
};

export type NewRequestPrintPacketResult =
  | {
      ok: true;
      generatedAt: string;
      requests: NewRequestPrintRow[];
    }
  | { ok: false };

type DatabaseRequestRow = {
  id: unknown;
  name: unknown;
  phone: unknown;
  email: unknown;
  location: unknown;
  preferred_time: unknown;
  message: unknown;
  locale: unknown;
  source_path: unknown;
  created_at: unknown;
};

type DatabasePacket = {
  generated_at: unknown;
  requests: unknown;
};

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function hasExactKeys(value: object, expected: string[]): boolean {
  return Object.keys(value).sort().join("\0") === expected.join("\0");
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return false;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && /(?:Z|[+-]\d{2}:\d{2})$/.test(value);
}

function toPrintRow(value: unknown): NewRequestPrintRow | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  if (!hasExactKeys(value, ROW_KEYS)) return null;
  const row = value as DatabaseRequestRow;
  if (
    !isUuid(row.id) ||
    typeof row.name !== "string" || row.name === "" ||
    typeof row.phone !== "string" || row.phone === "" ||
    !isNullableString(row.email) ||
    (row.location !== "any" && row.location !== "tampa" && row.location !== "lutz") ||
    (row.preferred_time !== "any" &&
      row.preferred_time !== "morning" &&
      row.preferred_time !== "afternoon") ||
    !isNullableString(row.message) ||
    typeof row.locale !== "string" || row.locale === "" ||
    typeof row.source_path !== "string" || row.source_path === "" ||
    !isIsoTimestamp(row.created_at)
  ) {
    return null;
  }

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
  };
}

export async function prepareNewRequestPrintPacket(input: {
  db: SupabaseClient;
  actorEmail: string;
}): Promise<NewRequestPrintPacketResult> {
  try {
    const { data, error } = await input.db.rpc(RPC_NAME, {
      p_actor_email: input.actorEmail,
    });
    if (
      error ||
      typeof data !== "object" ||
      data === null ||
      Array.isArray(data) ||
      !hasExactKeys(data, PACKET_KEYS)
    ) return { ok: false };

    const packet = data as DatabasePacket;
    if (!isIsoTimestamp(packet.generated_at) || !Array.isArray(packet.requests)) {
      return { ok: false };
    }

    const requests: NewRequestPrintRow[] = [];
    const ids = new Set<string>();
    let previous: NewRequestPrintRow | null = null;
    for (const value of packet.requests) {
      const row = toPrintRow(value);
      if (!row || ids.has(row.id)) return { ok: false };
      if (previous) {
        const timeOrder = Date.parse(previous.createdAt) - Date.parse(row.createdAt);
        if (timeOrder > 0 || (timeOrder === 0 && previous.id > row.id)) {
          return { ok: false };
        }
      }
      ids.add(row.id);
      requests.push(row);
      previous = row;
    }

    return { ok: true, generatedAt: packet.generated_at, requests };
  } catch {
    return { ok: false };
  }
}
