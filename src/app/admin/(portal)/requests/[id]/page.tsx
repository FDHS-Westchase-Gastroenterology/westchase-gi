import Link from "next/link";
import { notFound } from "next/navigation";
import {
  isMailbox,
  REQUEST_STATUSES,
  type RequestClosureDisposition,
  type RequestStatus,
} from "@/lib/portal/contracts";
import { requireRole } from "@/lib/portal/auth";
import {
  parseRequestSearch,
  requestSearchFilter,
} from "@/lib/portal/request-query";
import { serviceClient } from "@/lib/portal/server";
import {
  fetchAttentiveOpenRows,
  fetchClosedRows,
  OPEN_CANDIDATE_LIMIT,
  OPEN_STATUSES,
} from "../queue";
import { StatusBadge } from "../status-badge";
import {
  formatReceived,
  followUpWhenLabel,
  LOCALE_LABELS,
  LOCATION_LABELS,
  OUTCOME_HISTORY_LABELS,
  TIME_LABELS,
} from "../format";
import { CallOutcomeComposer } from "./call-outcome-composer";

type RequestRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  location: "any" | "tampa" | "lutz";
  preferred_time: "any" | "morning" | "afternoon";
  message: string | null;
  locale: string;
  source_path: string;
  status: RequestStatus;
  closure_disposition: RequestClosureDisposition | null;
  closed_at: string | null;
  record_handoff_at: string | null;
  created_at: string;
};

type EventRow = {
  id: string;
  type: string;
  recipient: string | null;
  status: string;
  meta: Record<string, unknown> | null;
  created_at: string;
};

type AuditRow = {
  id: string;
  actor_email: string | null;
  action: string;
  detail: Record<string, unknown> | null;
  at: string;
};

// The work record shown on the page: notes and call outcomes from the
// request's event stream, plus status moves and closes from the audit
// record (their call-outcome/note audit twins are deliberately excluded —
// the events already carry them, so each human action renders exactly once).
type WorkEntry =
  | { kind: "note"; id: string; text: string; author: string; at: string }
  | {
      kind: "outcome";
      id: string;
      outcome: string;
      followUpAt: string | null;
      author: string;
      at: string;
    }
  | {
      kind: "status";
      id: string;
      to: string;
      legacyClose: boolean;
      author: string;
      at: string;
    }
  | {
      kind: "close";
      id: string;
      disposition: string;
      author: string;
      at: string;
    };

function metaText(meta: Record<string, unknown> | null, key: string): string {
  const value = meta?.[key];
  return typeof value === "string" ? value : "";
}

function firstParam(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function workEntries(events: EventRow[], audits: AuditRow[]): WorkEntry[] {
  const entries: WorkEntry[] = [];
  for (const event of events) {
    if (event.type === "note") {
      entries.push({
        kind: "note",
        id: `event-${event.id}`,
        text: metaText(event.meta, "text"),
        author: metaText(event.meta, "author_email"),
        at: event.created_at,
      });
    } else if (event.type === "call_outcome") {
      entries.push({
        kind: "outcome",
        id: `event-${event.id}`,
        outcome: metaText(event.meta, "outcome"),
        followUpAt: metaText(event.meta, "follow_up_at") || null,
        author: metaText(event.meta, "author_email"),
        at: event.created_at,
      });
    }
  }
  for (const audit of audits) {
    const detail = audit.detail ?? {};
    if (audit.action === "request.status_change") {
      const to = typeof detail.to === "string" ? detail.to : "";
      entries.push({
        kind: "status",
        id: `audit-${audit.id}`,
        to,
        legacyClose:
          to === "closed" && detail.legacy_unclassified_close === true,
        author: audit.actor_email ?? "",
        at: audit.at,
      });
    } else if (audit.action === "request.close") {
      entries.push({
        kind: "close",
        id: `audit-${audit.id}`,
        disposition:
          typeof detail.disposition === "string" ? detail.disposition : "",
        author: audit.actor_email ?? "",
        at: audit.at,
      });
    }
  }
  return entries.sort((a, b) => b.at.localeCompare(a.at));
}

const STATUS_LINE_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  scheduled: "Scheduled",
  closed: "Closed",
};

// One protected fetch feeds one cohesive request workflow; splitting its JSX
// would add patient-data prop surfaces without isolating reusable behavior.
// react-doctor-disable-next-line react-doctor/no-giant-component
export default async function RequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    status?: string | string[];
    q?: string | string[];
    page?: string | string[];
  }>;
}) {
  await requireRole("staff");
  const { id } = await params;
  const continuity = await searchParams;
  const statusParam = firstParam(continuity.status);
  const search = parseRequestSearch(continuity.q);
  const searchFilter = search ? requestSearchFilter(search) : "";

  const queueParams = new URLSearchParams();
  if (statusParam) queueParams.set("status", statusParam);
  if (search) queueParams.set("q", search);
  const pageParam = firstParam(continuity.page);
  if (pageParam) queueParams.set("page", pageParam);
  const queueQuery = queueParams.toString();
  const queueHref = `/admin/requests${queueQuery ? `?${queueQuery}` : ""}`;
  const continuityParams = new URLSearchParams();
  if (statusParam) continuityParams.set("status", statusParam);
  if (search) continuityParams.set("q", search);
  const continuityQuery = continuityParams.toString();
  const continuityHref = (requestId: string): string =>
    `/admin/requests/${requestId}${continuityQuery ? `?${continuityQuery}` : ""}`;

  const db = serviceClient();
  const [
    { data: request, error },
    { data: events, error: eventsError },
    { data: auditRows, error: auditError },
  ] = await Promise.all([
    db
      .from("requests")
      .select(
        "id, name, phone, email, location, preferred_time, message, locale, source_path, status, closure_disposition, closed_at, record_handoff_at, created_at",
      )
      .eq("id", id)
      .maybeSingle(),
    db
      .from("request_events")
      .select("id, type, recipient, status, meta, created_at")
      .eq("request_id", id)
      .order("created_at", { ascending: true }),
    db
      .from("audit_log")
      .select("id, actor_email, action, detail, at")
      .eq("entity", "requests")
      .eq("entity_id", id)
      .in("action", ["request.status_change", "request.close"])
      .order("at", { ascending: false })
      .limit(50),
  ]);

  if (error || !request) notFound();
  if (eventsError) {
    throw new Error(`Event read failed: ${eventsError.code}`);
  }
  if (auditError) {
    throw new Error(`Work record read failed: ${auditError.code}`);
  }

  // Previous/next within the viewer's queue scope: the same attention
  // ordering the list renders, so staff can keep working without
  // returning to the list each time. A request outside the current scope
  // (e.g. an old closed row beyond the tail window) simply shows no chain.
  const scoped =
    statusParam &&
    statusParam !== "all" &&
    (REQUEST_STATUSES as readonly string[]).includes(statusParam)
      ? (statusParam as RequestStatus)
      : null;
  const neighborIds: string[] = [];
  if (scoped !== "closed") {
    const openStatuses = scoped ? [scoped] : [...OPEN_STATUSES];
    const openRows = await fetchAttentiveOpenRows(db, {
      statuses: openStatuses,
      searchFilter,
    });
    neighborIds.push(...openRows.map((row) => row.id));
  }
  if (scoped === null || scoped === "closed") {
    const closedRows = await fetchClosedRows(db, {
      from: 0,
      limit: OPEN_CANDIDATE_LIMIT,
      searchFilter,
    });
    neighborIds.push(...closedRows.map((row) => row.id));
  }
  const selfIndex = neighborIds.indexOf(id);
  const prevId = selfIndex > 0 ? neighborIds[selfIndex - 1] : null;
  const nextId =
    selfIndex >= 0 && selfIndex < neighborIds.length - 1
      ? neighborIds[selfIndex + 1]
      : null;

  const row = request as RequestRow;
  const mailbox = row.email?.trim();
  const safeMailbox = mailbox && isMailbox(mailbox) ? mailbox : null;
  const allEvents = (events ?? []) as EventRow[];
  const entries = workEntries(allEvents, (auditRows ?? []) as AuditRow[]);
  const notifications = allEvents.filter(
    (event) =>
      event.type === "notification" &&
      event.recipient !== "jason.gitdev@gmail.com",
  );

  const fields: Array<{ label: string; value: React.ReactNode }> = [
    {
      label: "Phone",
      value: (
        <a
          href={`tel:${row.phone}`}
          className="font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
        >
          {row.phone}
        </a>
      ),
    },
    {
      label: "Email",
      value: safeMailbox ? (
        <a
          href={`mailto:${safeMailbox}`}
          className="break-all font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
        >
          {safeMailbox}
        </a>
      ) : (
        <span className="text-[var(--color-muted)]">
          Not provided — call the phone number above
        </span>
      ),
    },
    { label: "Preferred office", value: LOCATION_LABELS[row.location] },
    { label: "Preferred time", value: TIME_LABELS[row.preferred_time] },
    {
      label: "Submitted in",
      value: LOCALE_LABELS[row.locale] ?? row.locale,
    },
    { label: "From page", value: row.source_path },
    { label: "Received", value: formatReceived(row.created_at, true) },
  ];

  return (
    <section aria-labelledby="request-heading">
      <nav aria-label="Breadcrumb" className="flex items-center text-[0.9rem]">
        <Link
          href={queueHref}
          className="inline-flex min-h-11 items-center font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
        >
          Appointment requests
        </Link>
        <span aria-hidden="true" className="mx-2 text-[var(--color-muted)]">
          /
        </span>
        <span className="text-[var(--color-muted)]">Detail</span>
        {prevId || nextId ? (
          <span className="ml-auto flex items-center gap-3">
            {prevId ? (
              <Link
                href={continuityHref(prevId)}
                rel="prev"
                data-testid="prev-request"
                className="inline-flex min-h-11 items-center font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
              >
                ← Previous
              </Link>
            ) : null}
            {nextId ? (
              <Link
                href={continuityHref(nextId)}
                rel="next"
                data-testid="next-request"
                className="inline-flex min-h-11 items-center font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
              >
                Next →
              </Link>
            ) : null}
          </span>
        ) : null}
      </nav>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <h1
          id="request-heading"
          data-testid="request-detail-name"
          className="portal-title"
        >
          {row.name}
        </h1>
        <StatusBadge status={row.status} />
      </div>
      {row.status === "closed" && row.closed_at ? (
        <p
          data-testid="request-lifecycle-summary"
          className="mt-1.5 text-[0.9rem] text-[var(--color-muted)]"
        >
          Closed {formatReceived(row.closed_at, true)}
          {row.closure_disposition
            ? ` — ${
                row.closure_disposition === "converted"
                  ? "appointment booked"
                  : "no appointment booked"
              }`
            : ""}
          .
        </p>
      ) : null}

      <CallOutcomeComposer
        requestId={row.id}
        status={row.status}
        closureDisposition={row.closure_disposition}
        closedAtLabel={row.closed_at ? formatReceived(row.closed_at) : null}
        nextHref={nextId ? continuityHref(nextId) : null}
      />

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-6 sm:p-7">
            <h2 className="text-[1.05rem] font-black text-[var(--color-ink)]">
              Appointment request details
            </h2>
            <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {fields.map((field) => (
                <div key={field.label}>
                  <dt className="text-[0.8rem] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)]">
                    {field.label}
                  </dt>
                  <dd className="mt-1 text-[0.95rem] text-[var(--color-ink)]">
                    {field.value}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 border-t border-[var(--color-line)] pt-5">
              <h3 className="text-[0.8rem] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)]">
                Reason for requesting this appointment
              </h3>
              <p
                data-testid="request-message"
                className="mt-2 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-[var(--color-body)]"
              >
                {row.message?.trim() || "— none provided —"}
              </p>
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-6 sm:p-7">
            <h2 className="text-[1.05rem] font-black text-[var(--color-ink)]">
              Work history
            </h2>
            {entries.length === 0 ? (
              <p className="mt-3 text-[0.95rem] text-[var(--color-muted)]">
                Nothing recorded yet. Record what happens on the call above —
                the next person picks up where you left off.
              </p>
            ) : (
              <ul data-testid="work-history" className="mt-4 space-y-4">
                {entries.map((entry) => {
                  if (entry.kind === "note") {
                    return (
                      <li
                        key={entry.id}
                        className="rounded-[var(--radius)] bg-[var(--color-mint)] px-4 py-3"
                      >
                        <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-[var(--color-ink)]">
                          {entry.text}
                        </p>
                        <p className="mt-2 text-[0.8rem] font-bold text-[var(--color-teal-ink)]">
                          {entry.author} · {formatReceived(entry.at, true)}
                        </p>
                      </li>
                    );
                  }
                  const line =
                    entry.kind === "outcome"
                      ? `${OUTCOME_HISTORY_LABELS[entry.outcome] ?? entry.outcome}${
                          entry.followUpAt
                            ? ` — call again ${followUpWhenLabel(entry.followUpAt)}`
                            : ""
                        }`
                      : entry.kind === "status"
                        ? entry.legacyClose
                          ? "Closed without an outcome"
                          : `Marked ${STATUS_LINE_LABELS[entry.to] ?? entry.to}`
                        : `Closed — ${
                            entry.disposition === "converted"
                              ? "appointment booked"
                              : "no appointment booked"
                          }`;
                  return (
                    <li
                      key={entry.id}
                      className="rounded-[var(--radius)] border border-[var(--color-line)] px-4 py-3"
                    >
                      <p className="text-[0.95rem] font-bold text-[var(--color-ink)]">
                        {line}
                      </p>
                      <p className="mt-1.5 text-[0.8rem] font-bold text-[var(--color-teal-ink)]">
                        {entry.author} · {formatReceived(entry.at, true)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-6 sm:p-7">
            <h2 className="text-[1.05rem] font-black text-[var(--color-ink)]">
              Notifications
            </h2>
            {notifications.length === 0 ? (
              <p className="mt-3 text-[0.9rem] text-[var(--color-muted)]">
                No notification attempts recorded for this request.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {notifications.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-center justify-between gap-3 text-[0.9rem]"
                  >
                    <span className="truncate text-[var(--color-body)]">
                      {event.recipient ?? "—"}
                    </span>
                    <span
                      className={`font-bold ${
                        event.status === "accepted" || event.status === "sent"
                          ? "text-[var(--color-teal-ink)]"
                          : "text-[var(--color-amber-deep)]"
                      }`}
                    >
                      {event.status === "accepted" || event.status === "sent"
                        ? "Accepted for delivery"
                        : "Failed"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
