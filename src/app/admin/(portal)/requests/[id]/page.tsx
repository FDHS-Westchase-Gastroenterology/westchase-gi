import Link from "next/link";
import { notFound } from "next/navigation";
import {
  REQUEST_STATUSES,
  type RequestStatus,
} from "@/lib/portal/contracts";
import { requireRole } from "@/lib/portal/auth";
import { serviceClient } from "@/lib/portal/server";
import { StatusBadge, STATUS_LABELS } from "../status-badge";
import {
  formatReceived,
  LOCALE_LABELS,
  LOCATION_LABELS,
  TIME_LABELS,
} from "../format";
import { addRequestNote, updateRequestStatus } from "../actions";

type RequestRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  location: "any" | "tampa" | "lutz";
  preferred_time: "any" | "morning" | "afternoon";
  message: string | null;
  locale: string;
  source_path: string;
  status: RequestStatus;
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

function metaText(meta: Record<string, unknown> | null, key: string): string {
  const value = meta?.[key];
  return typeof value === "string" ? value : "";
}

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("staff");
  const { id } = await params;

  const db = serviceClient();
  const [{ data: request, error }, { data: events, error: eventsError }] =
    await Promise.all([
      db
        .from("requests")
        .select(
          "id, name, phone, email, location, preferred_time, message, locale, source_path, status, created_at",
        )
        .eq("id", id)
        .maybeSingle(),
      db
        .from("request_events")
        .select("id, type, recipient, status, meta, created_at")
        .eq("request_id", id)
        .order("created_at", { ascending: true }),
    ]);

  if (error || !request) notFound();
  if (eventsError) {
    throw new Error(`Event read failed: ${eventsError.code}`);
  }

  const row = request as RequestRow;
  const allEvents = (events ?? []) as EventRow[];
  const notes = allEvents.filter((event) => event.type === "note");
  const notifications = allEvents.filter(
    (event) => event.type === "notification",
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
      value: (
        <a
          href={`mailto:${row.email}`}
          className="break-all font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
        >
          {row.email}
        </a>
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
      <nav aria-label="Breadcrumb" className="text-[0.9rem]">
        <Link
          href="/admin"
          className="font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
        >
          Requests
        </Link>
        <span aria-hidden="true" className="mx-2 text-[var(--color-muted)]">
          /
        </span>
        <span className="text-[var(--color-muted)]">Detail</span>
      </nav>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <h1
          id="request-heading"
          data-testid="request-detail-name"
          className="text-[1.65rem] font-black leading-tight text-[var(--color-ink)]"
        >
          {row.name}
        </h1>
        <StatusBadge status={row.status} />
      </div>

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-6 sm:p-7">
            <h2 className="text-[1.05rem] font-black text-[var(--color-ink)]">
              Request details
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
              Staff notes
            </h2>
            {notes.length === 0 ? (
              <p className="mt-3 text-[0.95rem] text-[var(--color-muted)]">
                No notes yet. Record call outcomes here so the next person
                picks up where you left off.
              </p>
            ) : (
              <ul data-testid="note-list" className="mt-4 space-y-4">
                {notes.map((note) => (
                  <li
                    key={note.id}
                    className="rounded-[var(--radius)] bg-[var(--color-mint)] px-4 py-3"
                  >
                    <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-[var(--color-ink)]">
                      {metaText(note.meta, "text")}
                    </p>
                    <p className="mt-2 text-[0.8rem] font-bold text-[var(--color-teal-ink)]">
                      {metaText(note.meta, "author_email")} ·{" "}
                      {formatReceived(note.created_at, true)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <form
              action={addRequestNote.bind(null, row.id)}
              className="mt-5 border-t border-[var(--color-line)] pt-5"
            >
              <label
                htmlFor="note"
                className="block text-sm font-bold text-[var(--color-ink)]"
              >
                Add a note
              </label>
              <textarea
                id="note"
                name="note"
                rows={3}
                required
                maxLength={2000}
                className="mt-2 w-full rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3.5 py-3 text-[0.95rem] text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-teal-ink)]"
                placeholder="e.g. Left a voicemail at 2:15pm — will try again tomorrow morning."
              />
              <button type="submit" className="btn btn-navy mt-3">
                Save note
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-6 sm:p-7">
            <h2 className="text-[1.05rem] font-black text-[var(--color-ink)]">
              Status
            </h2>
            <p className="mt-1.5 text-[0.9rem] text-[var(--color-muted)]">
              Move the request as you work it. Every change is recorded in
              the audit log.
            </p>
            <div className="mt-4 grid gap-2">
              {REQUEST_STATUSES.map((status) => {
                const isCurrent = row.status === status;
                return (
                  <form
                    key={status}
                    action={updateRequestStatus.bind(null, row.id, status)}
                  >
                    <button
                      type="submit"
                      disabled={isCurrent}
                      data-status-action={status}
                      className={`flex min-h-11 w-full items-center justify-between rounded-[var(--radius)] border px-4 text-[0.95rem] font-bold transition-colors ${
                        isCurrent
                          ? "cursor-default border-[var(--color-navy)] bg-[var(--color-navy)] text-[var(--color-on-dark)]"
                          : "border-[var(--color-line-2)] bg-white text-[var(--color-body)] hover:border-[var(--color-navy)]"
                      }`}
                    >
                      {STATUS_LABELS[status]}
                      {isCurrent && (
                        <span className="text-[0.75rem] uppercase tracking-[0.06em]">
                          Current
                        </span>
                      )}
                    </button>
                  </form>
                );
              })}
            </div>
          </div>

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
                        event.status === "sent"
                          ? "text-[var(--color-teal-ink)]"
                          : "text-[var(--color-amber-deep)]"
                      }`}
                    >
                      {event.status}
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
