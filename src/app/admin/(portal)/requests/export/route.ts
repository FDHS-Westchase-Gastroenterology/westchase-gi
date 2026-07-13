import type { NextRequest } from "next/server";
import {
  REQUEST_STATUSES,
  type RequestStatus,
} from "@/lib/portal/contracts";
import { requireRole } from "@/lib/portal/auth";
import { serviceClient } from "@/lib/portal/server";

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
type CsvRow = Record<CsvColumn, unknown>;

function isRequestStatus(value: string | null): value is RequestStatus {
  return (
    value !== null &&
    (REQUEST_STATUSES as readonly string[]).includes(value)
  );
}

function authorizationStatus(error: unknown): 401 | 403 | null {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return null;
  }
  const status = error.status;
  return status === 401 || status === 403 ? status : null;
}

function csvField(raw: unknown): string {
  const value = raw === null || raw === undefined ? "" : String(raw);
  return /[",\r\n]/.test(value)
    ? `"${value.replaceAll('"', '""')}"`
    : value;
}

function csvDocument(rows: CsvRow[]): string {
  const lines = [
    CSV_HEADERS.join(","),
    ...rows.map((row) =>
      CSV_HEADERS.map((header) => csvField(row[header])).join(","),
    ),
  ];
  return `${lines.join("\r\n")}\r\n`;
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    await requireRole("staff", { unauthenticated: "throw" });
  } catch (error) {
    const status = authorizationStatus(error) ?? 401;
    return new Response(
      status === 401 ? "Unauthenticated" : "Forbidden",
      { status },
    );
  }

  const hasStatus = request.nextUrl.searchParams.has("status");
  const requestedStatus = request.nextUrl.searchParams.get("status");
  if (hasStatus && !isRequestStatus(requestedStatus)) {
    // Invalid filters fail explicitly instead of silently exporting a broader
    // set of patient contact rows than the user requested.
    return new Response("Invalid status filter", { status: 400 });
  }

  const db = serviceClient();
  let query = db
    .from("requests")
    .select(
      "id, created_at, status, name, phone, email, location, preferred_time, locale, source_path, message",
    )
    .order("created_at", { ascending: false });

  if (isRequestStatus(requestedStatus)) {
    query = query.eq("status", requestedStatus);
  }

  const { data, error } = await query;
  if (error || !data) {
    return new Response("Export unavailable", { status: 503 });
  }

  // Export is a read-only queue operation, so it intentionally does not add an
  // audit row. Every state-changing portal operation remains audited.
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csvDocument(data as CsvRow[]), {
    status: 200,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `attachment; filename="appointment-requests-${date}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
