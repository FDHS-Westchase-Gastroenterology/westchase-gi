import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/portal/auth";
import { parsePage } from "@/lib/portal/request-query";
import { serviceClient } from "@/lib/portal/server";
import { fetchStaffNameMap } from "@/lib/portal/staff-identity";
import { displayNameOrEmail } from "@/lib/portal/staff-identity";
import { formatReceived } from "../requests/format";
import { RecentWorkSection, toRecentWorkItems } from "./recent-work";

type AuditRow = {
  id: string;
  actor_email: string;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: unknown;
  at: string;
};

const PAGE_SIZE = 100;

function externalAuditSummary(
  detail: unknown,
): { target: string; outcome: string } | null {
  if (typeof detail !== "object" || detail === null || Array.isArray(detail)) {
    return null;
  }
  const value = detail as Record<string, unknown>;
  if (typeof value.target_login !== "string") return null;
  const outcome =
    value.outcome === "succeeded" || value.outcome === "failed"
      ? value.outcome
      : "unconfirmed";
  return { target: value.target_login, outcome };
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  await requireRole("staff");
  const page = parsePage((await searchParams).page);
  const from = (page - 1) * PAGE_SIZE;
  const now = new Date();

  const db = serviceClient();
  const [{ data: rows, error, count }, nameMap, profileRows, recipientRows] =
    await Promise.all([
      db
        .from("audit_log")
        .select("id, actor_email, action, entity, entity_id, detail, at", {
          count: "exact",
        })
        .order("at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, from + PAGE_SIZE - 1),
      fetchStaffNameMap(db),
      db.from("staff_profiles").select("id, display_name"),
      db.from("notification_recipients").select("id, email"),
    ]);
  if (error) {
    throw new Error(`Audit read failed: ${error.code}`);
  }

  const entries = (rows ?? []) as AuditRow[];
  const namesByProfileId = new Map(
    (profileRows.data ?? [])
      .filter(
        (row): row is { id: string; display_name: string } =>
          typeof row.id === "string" &&
          typeof row.display_name === "string" &&
          row.display_name.trim().length > 0,
      )
      .map((row) => [row.id, row.display_name.trim()]),
  );
  const recipientsById = new Map(
    (recipientRows.data ?? [])
      .filter(
        (row): row is { id: string; email: string } =>
          typeof row.id === "string" && typeof row.email === "string",
      )
      .map((row) => [row.id, row.email]),
  );
  const recentItems = toRecentWorkItems(entries, {
    namesByEmail: nameMap,
    namesByProfileId,
    recipientsById,
    now,
  });
  const total = count ?? entries.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > totalPages) {
    redirect(`/admin/audit${totalPages > 1 ? `?page=${totalPages}` : ""}`);
  }
  const firstShown = total === 0 ? 0 : from + 1;
  const lastShown = from + entries.length;

  return (
    <section aria-labelledby="audit-heading">
      <nav aria-label="Breadcrumb" className="flex items-center text-[0.9rem]">
        <Link
          href="/admin"
          className="inline-flex min-h-11 min-w-11 items-center font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
        >
          Home
        </Link>
        <span aria-hidden="true" className="mx-2 text-[var(--color-muted)]">
          /
        </span>
        <span className="text-[var(--color-muted)]">Activity log</span>
      </nav>

      <h1
        id="audit-heading"
        className="portal-title mt-4"
      >
        Activity log
      </h1>
      <p className="mt-1.5 max-w-[60ch] text-[0.95rem] text-[var(--color-muted)]">
        Who did what, in plain language — with the exact technical record
        beneath for administrators.
      </p>

      {entries.length === 0 ? (
        <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white p-8 text-center sm:p-12">
          <h2 className="text-[1.1rem] font-black text-[var(--color-ink)]">
            Nothing recorded yet
          </h2>
          <p className="mx-auto mt-2 max-w-[52ch] text-[0.95rem] text-[var(--color-body)]">
            The first status change, note, recipient edit, or staff change
            will appear here automatically.
          </p>
        </div>
      ) : (
        <>
          <RecentWorkSection items={recentItems} now={now} />

          <section aria-labelledby="technical-record-heading" className="mt-10">
            <h2
              id="technical-record-heading"
              className="text-[1.05rem] font-black text-[var(--color-ink)]"
            >
              Technical record
            </h2>
            <p className="mt-1.5 max-w-[65ch] text-[0.9rem] leading-relaxed text-[var(--color-muted)]">
              The exact actions behind the entries above, for administrators.
            </p>
            <div className="mt-4 overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white">
              <table data-testid="audit-table" className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="border-b border-[var(--color-line)] text-[0.8rem] uppercase tracking-[0.06em] text-[var(--color-muted)]">
                    <th scope="col" className="px-5 py-3.5 font-bold">
                      When
                    </th>
                    <th scope="col" className="px-5 py-3.5 font-bold">
                      Who
                    </th>
                    <th scope="col" className="px-5 py-3.5 font-bold">
                      Action
                    </th>
                    <th scope="col" className="px-5 py-3.5 font-bold">
                      Entity
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-line)]">
                  {entries.map((entry) => {
                    const external = externalAuditSummary(entry.detail);
                    return (
                      <tr key={entry.id} className="text-[0.9rem]">
                        <td className="whitespace-nowrap px-5 py-3 text-[var(--color-muted)]">
                          {formatReceived(entry.at, true)}
                        </td>
                        <td className="px-5 py-3 font-bold text-[var(--color-ink)]">
                          {displayNameOrEmail(nameMap, entry.actor_email)}
                        </td>
                        <td className="px-5 py-3">
                          <code className="rounded bg-[var(--color-mint)] px-2 py-0.5 text-[0.85rem] text-[var(--color-teal-ink)]">
                            {entry.action}
                          </code>
                        </td>
                        <td className="px-5 py-3 text-[var(--color-body)]">
                          {entry.entity}
                          {entry.entity_id ? (
                            <span className="ml-1.5 text-[0.8rem] text-[var(--color-muted)]">
                              {entry.entity_id.slice(0, 8)}…
                            </span>
                          ) : null}
                          {external ? (
                            <span className="mt-0.5 block text-[0.8rem] text-[var(--color-muted)]">
                              {external.target} · Outcome {external.outcome}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {total > 0 ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p
            data-testid="audit-page-summary"
            className="text-[0.9rem] text-[var(--color-muted)]"
          >
            Showing {firstShown}–{lastShown} of {total}
          </p>
          {totalPages > 1 ? (
            <nav
              aria-label="Activity log pages"
              className="flex items-center gap-3"
            >
              {page > 1 ? (
                <Link
                  href={`/admin/audit${page > 2 ? `?page=${page - 1}` : ""}`}
                  rel="prev"
                  className="btn btn-outline"
                >
                  Previous
                </Link>
              ) : null}
              <span className="text-[0.9rem] font-bold text-[var(--color-body)]">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  href={`/admin/audit?page=${page + 1}`}
                  rel="next"
                  className="btn btn-outline"
                >
                  Next
                </Link>
              ) : null}
            </nav>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
