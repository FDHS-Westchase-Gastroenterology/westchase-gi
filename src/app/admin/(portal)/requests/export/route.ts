import type { NextRequest } from "next/server";
import { z } from "zod";

import { recordAudit } from "@/lib/portal/audit";
import { PortalAuthorizationError, requireRole } from "@/lib/portal/auth";
import { AUDIT_ACTIONS } from "@/lib/portal/contracts";
import { parseRequestSearch, requestSearchFilter } from "@/lib/portal/request-query";
import { serviceClient } from "@/lib/portal/server";
import { parseRequestStatus } from "@/lib/portal/workflow/contracts";
import type { RequestStatus } from "@/lib/portal/workflow/contracts";

const EXPORT_CHUNK_SIZE = 1000;
const CSV_HEADERS = [
  "id",
  "created_at",
  "status",
  "name",
  "phone",
  "email",
  "location",
  "preferred_time",
  "locale",
  "source_path",
  "message",
] as const;

type CsvColumn = (typeof CSV_HEADERS)[number];
interface CsvRow {
  readonly id: string;
  readonly created_at: string;
  readonly status: string;
  readonly name: string;
  readonly phone: string;
  readonly email: string | null;
  readonly location: string;
  readonly preferred_time: string;
  readonly locale: string;
  readonly source_path: string;
  readonly message: string | null;
}

const csvRowSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  status: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  location: z.string(),
  preferred_time: z.string(),
  locale: z.string(),
  source_path: z.string(),
  message: z.string().nullable(),
}) satisfies z.ZodType<CsvRow>;

function isRequestStatus(value: string | null): value is RequestStatus {
  return value !== null && parseRequestStatus(value) !== null;
}

function csvField(raw: CsvRow[CsvColumn]): string {
  const value = raw ?? "";
  const safeValue = /^[=+\-@\t\r\n]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safeValue) ? `"${safeValue.replaceAll('"', '""')}"` : safeValue;
}

function csvDocument(rows: readonly CsvRow[]): string {
  const lines = [
    CSV_HEADERS.join(","),
    ...rows.map((row) => CSV_HEADERS.map((header) => csvField(row[header])).join(",")),
  ];
  return `${lines.join("\r\n")}\r\n`;
}

export async function GET(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireRole("staff", { unauthenticated: "throw" });
  } catch (error) {
    const status = error instanceof PortalAuthorizationError ? error.status : 401;
    return new Response(status === 401 ? "Unauthenticated" : "Forbidden", { status });
  }

  const hasStatus = request.nextUrl.searchParams.has("status");
  const requestedStatus = request.nextUrl.searchParams.get("status");
  if (hasStatus && !isRequestStatus(requestedStatus)) {
    // Invalid filters fail explicitly instead of silently exporting a broader
    // Set of patient contact rows than the user requested.
    return new Response("Invalid status filter", { status: 400 });
  }
  const search = parseRequestSearch(request.nextUrl.searchParams.get("q") ?? undefined);
  const searchFilter = search ? requestSearchFilter(search) : "";

  const db = serviceClient();
  let countQuery = db.from("requests").select("id", { count: "exact", head: true });
  if (isRequestStatus(requestedStatus)) {
    countQuery = countQuery.eq("status", requestedStatus);
  }
  if (searchFilter) countQuery = countQuery.or(searchFilter);
  const { count: expectedCount, error: countError } = await countQuery;
  if (countError || expectedCount === null) {
    return new Response("Export unavailable", { status: 503 });
  }

  const rows: CsvRow[] = [];
  for (let from = 0; from < expectedCount; from += EXPORT_CHUNK_SIZE) {
    let query = db
      .from("requests")
      .select(
        "id, created_at, status, name, phone, email, location, preferred_time, locale, source_path, message",
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, Math.min(from + EXPORT_CHUNK_SIZE, expectedCount) - 1);
    if (isRequestStatus(requestedStatus)) {
      query = query.eq("status", requestedStatus);
    }
    if (searchFilter) query = query.or(searchFilter);

    const { data, error } = await query;
    const expectedChunkSize = Math.min(EXPORT_CHUNK_SIZE, expectedCount - from);
    if (error || data.length !== expectedChunkSize) {
      return new Response("Export unavailable", { status: 503 });
    }
    const parsedRows = z.array(csvRowSchema).safeParse(data);
    if (!parsedRows.success) {
      return new Response("Export unavailable", { status: 503 });
    }
    rows.push(...parsedRows.data);
  }

  let finalCountQuery = db.from("requests").select("id", { count: "exact", head: true });
  if (isRequestStatus(requestedStatus)) {
    finalCountQuery = finalCountQuery.eq("status", requestedStatus);
  }
  if (searchFilter) finalCountQuery = finalCountQuery.or(searchFilter);
  const { count: finalCount, error: finalCountError } = await finalCountQuery;
  if (
    finalCountError ||
    finalCount !== expectedCount ||
    rows.length !== expectedCount ||
    new Set(rows.map((row) => row.id)).size !== expectedCount
  ) {
    return new Response("Export unavailable", { status: 503 });
  }

  // Export creates a clinic-controlled sensitive copy, so it writes a
  // Metadata-only audit row (actor, row count, filter) — never patient values.
  try {
    await recordAudit(db, {
      actorEmail: session.email,
      action: AUDIT_ACTIONS.REQUESTS_EXPORT,
      entity: "requests",
      entityId: null,
      detail: {
        row_count: rows.length,
        status_filter: isRequestStatus(requestedStatus) ? requestedStatus : "all",
        has_search: Boolean(search),
      },
    });
  } catch {
    return new Response("Export unavailable", { status: 503 });
  }

  const date = new Date().toISOString().slice(0, 10);
  return new Response(csvDocument(rows), {
    status: 200,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `attachment; filename="appointment-requests-${date}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
