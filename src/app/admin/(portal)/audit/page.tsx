import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";

import { PortalPageHeader } from "@/app/admin/(portal)/portal-page-header";
import { formatReceived } from "@/app/admin/(portal)/requests/format";
import { asJsonObject, asJsonString, jsonSchema } from "@/lib/json";
import type { Json } from "@/lib/json";
import { requireRole } from "@/lib/portal/auth";
import { PORTAL_RELEASE_BRIEFING } from "@/lib/portal/release-briefing-content";
import { getPortalReleaseEngagement } from "@/lib/portal/release-engagement";
import { parsePage } from "@/lib/portal/request-query";
import { serviceClient } from "@/lib/portal/server";
import { displayNameOrEmail, fetchStaffNameMap } from "@/lib/portal/staff-identity";

import { RecentWorkSection } from "./recent-work";
import { toRecentWorkItems } from "./recent-work-model";
import type { AuditEntry } from "./recent-work-model";
import { ReleaseEngagementSection } from "./release-engagement";

const PAGE_SIZE = 100;

const auditEntrySchema = z.object({
  id: z.string(),
  actor_email: z.string(),
  action: z.string(),
  entity: z.string(),
  entity_id: z.string().nullable(),
  detail: jsonSchema,
  at: z.string(),
}) satisfies z.ZodType<AuditEntry>;

const profileNameSchema = z.object({
  id: z.string(),
  display_name: z.string(),
});

const recipientEmailSchema = z.object({
  id: z.string(),
  email: z.string(),
});

interface ExternalAuditSummary {
  target: string;
  outcome: string;
}

function externalAuditSummary(detail: Json): ExternalAuditSummary | null {
  const value = asJsonObject(detail);
  if (value === null) return null;
  const target = asJsonString(value.target_login);
  if (target === null) return null;
  const outcomeValue = asJsonString(value.outcome);
  const outcome =
    outcomeValue === "succeeded" || outcomeValue === "failed" ? outcomeValue : "unconfirmed";
  return { target, outcome };
}

export default async function AdminAuditPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ page?: string | string[] }>;
}>) {
  const session = await requireRole("staff");
  const page = parsePage((await searchParams).page);
  const from = (page - 1) * PAGE_SIZE;
  const now = new Date();

  const db = serviceClient();
  const [{ data: rows, error, count }, nameMap, profileRows, recipientRows, releaseEngagement] =
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
      session.role === "admin"
        ? getPortalReleaseEngagement(PORTAL_RELEASE_BRIEFING.id)
        : Promise.resolve(null),
    ]);
  if (error) {
    throw new Error(`Audit read failed: ${error.code}`);
  }

  const parsedEntries = z.array(auditEntrySchema).safeParse(rows);
  if (!parsedEntries.success) {
    throw new Error("Audit read failed: invalid");
  }
  const entries = parsedEntries.data;
  const namesByProfileId = new Map<string, string>();
  for (const row of profileRows.data ?? []) {
    const parsed = profileNameSchema.safeParse(row);
    if (!parsed.success) continue;
    const name = parsed.data.display_name.trim();
    if (name.length === 0) continue;
    namesByProfileId.set(parsed.data.id, name);
  }
  const recipientsById = new Map<string, string>();
  for (const row of recipientRows.data ?? []) {
    const parsed = recipientEmailSchema.safeParse(row);
    if (!parsed.success) continue;
    recipientsById.set(parsed.data.id, parsed.data.email);
  }
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
      <PortalPageHeader
        back={{ href: "/admin", label: "Back to Home" }}
        title={<span id="audit-heading">Activity log</span>}
        description="Who did what, in plain language. Administrators can inspect the exact technical record below when they need it."
      />

      {releaseEngagement ? <ReleaseEngagementSection engagement={releaseEngagement} /> : null}

      {entries.length === 0 ? (
        <div className="portal-empty mt-10 p-8 text-center sm:p-12">
          <h2 className="text-[1.1rem] font-black text-[var(--color-ink)]">Nothing recorded yet</h2>
          <p className="mx-auto mt-2 max-w-[52ch] text-[0.95rem] text-[var(--color-body)]">
            The first status change, note, recipient edit, or staff change will appear here
            automatically.
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
            <div
              role="region"
              aria-labelledby="technical-record-heading"
              tabIndex={0}
              className="mt-4 overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white"
            >
              <table data-testid="audit-table" className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="border-b border-[var(--color-line)] text-[0.8rem] tracking-[0.06em] text-[var(--color-muted)] uppercase">
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
                        <td className="px-5 py-3 whitespace-nowrap text-[var(--color-muted)]">
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
                          {entry.entity_id !== null && entry.entity_id !== "" ? (
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
          <p data-testid="audit-page-summary" className="text-[0.9rem] text-[var(--color-muted)]">
            Showing {firstShown}–{lastShown} of {total}
          </p>
          {totalPages > 1 ? (
            <nav aria-label="Activity log pages" className="flex items-center gap-3">
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
                <Link href={`/admin/audit?page=${page + 1}`} rel="next" className="btn btn-outline">
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
