import Link from "next/link";
import {
  REQUEST_STATUSES,
  type RequestStatus,
} from "@/lib/portal/contracts";
import { requireRole } from "@/lib/portal/auth";
import { serviceClient } from "@/lib/portal/server";
import { StatusBadge } from "./requests/status-badge";
import {
  formatReceived,
  LOCATION_LABELS,
  STATUS_LABELS,
  TIME_LABELS,
} from "./requests/format";

type QueueRow = {
  id: string;
  name: string;
  phone: string;
  location: "any" | "tampa" | "lutz";
  preferred_time: "any" | "morning" | "afternoon";
  locale: string;
  status: RequestStatus;
  created_at: string;
};

type SearchParams = Promise<{ status?: string | string[] }>;

function activeFilter(raw: string | string[] | undefined): RequestStatus | "all" {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && (REQUEST_STATUSES as readonly string[]).includes(value)
    ? (value as RequestStatus)
    : "all";
}

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole("staff");
  const filter = activeFilter((await searchParams).status);

  const db = serviceClient();
  let query = db
    .from("requests")
    .select("id, name, phone, location, preferred_time, locale, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter !== "all") query = query.eq("status", filter);

  const [{ data: rows, error }, ...countResults] = await Promise.all([
    query,
    ...REQUEST_STATUSES.map((status) =>
      db
        .from("requests")
        .select("id", { count: "exact", head: true })
        .eq("status", status),
    ),
  ]);
  if (error) {
    throw new Error(`Queue read failed: ${error.code}`);
  }

  const counts = Object.fromEntries(
    REQUEST_STATUSES.map((status, index) => [
      status,
      countResults[index].count ?? 0,
    ]),
  ) as Record<RequestStatus, number>;
  const total = REQUEST_STATUSES.reduce(
    (sum, status) => sum + counts[status],
    0,
  );
  const requests = (rows ?? []) as QueueRow[];

  const filters: Array<{ key: RequestStatus | "all"; label: string; count: number }> = [
    { key: "all", label: "All", count: total },
    ...REQUEST_STATUSES.map((status) => ({
      key: status,
      label: STATUS_LABELS[status],
      count: counts[status],
    })),
  ];

  return (
    <section aria-labelledby="requests-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            id="requests-heading"
            className="text-[1.65rem] font-black leading-tight text-[var(--color-ink)]"
          >
            Appointment requests
          </h1>
          <p className="mt-1.5 max-w-[60ch] text-[0.95rem] text-[var(--color-muted)]">
            Submitted from the website, newest first.
          </p>
        </div>
        <a
          href={
            filter === "all"
              ? "/admin/requests/export"
              : `/admin/requests/export?status=${filter}`
          }
          data-testid="export-csv"
          className="btn btn-outline"
        >
          Export CSV
        </a>
      </div>

      <nav aria-label="Filter by status" className="mt-6 overflow-x-auto">
        <ul className="flex min-w-max gap-2">
          {filters.map((item) => {
            const active = filter === item.key;
            const href =
              item.key === "all" ? "/admin" : `/admin?status=${item.key}`;
            return (
              <li key={item.key}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  data-filter={item.key}
                  className={`flex min-h-10 items-center gap-x-2 rounded-full border px-3.5 text-[0.9rem] font-bold transition-colors ${
                    active
                      ? "border-[var(--color-navy)] bg-[var(--color-navy)] text-[var(--color-on-dark)]"
                      : "border-[var(--color-line-2)] bg-white text-[var(--color-body)] hover:border-[var(--color-navy)]"
                  }`}
                >
                  {item.label}
                  <span
                    data-filter-count={item.key}
                    className={`rounded-full px-1.5 text-[0.75rem] ${
                      active
                        ? "bg-white/15"
                        : "bg-[var(--color-mint)] text-[var(--color-teal-ink)]"
                    }`}
                  >
                    {item.count}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {requests.length === 0 ? (
        <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-8 text-center sm:p-12">
          <h2 className="text-[1.1rem] font-black text-[var(--color-ink)]">
            {filter === "all"
              ? "No appointment requests yet"
              : `Nothing marked ${STATUS_LABELS[filter as RequestStatus].toLowerCase()}`}
          </h2>
          <p className="mx-auto mt-2 max-w-[52ch] text-[0.95rem] leading-relaxed text-[var(--color-body)]">
            {filter === "all"
              ? "When a patient submits the appointment form on the website, the appointment request appears here instantly and the notification list gets an email ping."
              : "Appointment requests move between statuses from their detail page — open one from another filter to triage it."}
          </p>
        </div>
      ) : (
        <ul data-testid="request-list" className="mt-8 space-y-3">
          {requests.map((request) => (
            <li key={request.id}>
              <Link
                href={`/admin/requests/${request.id}`}
                data-testid="request-row"
                className="grid gap-x-6 gap-y-2 rounded-[var(--radius)] border border-[var(--color-line)] bg-white px-5 py-4 transition-colors hover:border-[var(--color-teal)] sm:grid-cols-[1.4fr_1fr_auto] sm:items-center"
              >
                <span className="min-w-0">
                  <span
                    data-testid="request-name"
                    className="block truncate font-bold text-[var(--color-ink)]"
                  >
                    {request.name}
                  </span>
                  <span className="mt-0.5 block text-[0.9rem] text-[var(--color-muted)]">
                    {request.phone}
                  </span>
                </span>
                <span className="text-[0.9rem] text-[var(--color-body)]">
                  <span className="block">
                    {LOCATION_LABELS[request.location]} ·{" "}
                    {TIME_LABELS[request.preferred_time]}
                  </span>
                  <span className="mt-0.5 block text-[var(--color-muted)]">
                    Received {formatReceived(request.created_at)}
                  </span>
                </span>
                <span className="justify-self-start sm:justify-self-end">
                  <StatusBadge status={request.status} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
