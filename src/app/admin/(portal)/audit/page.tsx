import { redirect } from "next/navigation";
import { z } from "zod";

import { PortalPageHeader } from "@/app/admin/(portal)/portal-page-header";
import { formatReceived } from "@/app/admin/(portal)/requests/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { asJsonObject, asJsonString, jsonSchema } from "@/lib/json";
import type { Json } from "@/lib/json";
import { requireRole } from "@/lib/portal/auth";
import { PORTAL_RELEASE_BRIEFING } from "@/lib/portal/release-briefing-content";
import { getPortalReleaseEngagement } from "@/lib/portal/release-engagement";
import { parsePage, parseRequestSearch } from "@/lib/portal/request-query";
import { serviceClient } from "@/lib/portal/server";
import { displayNameOrEmail, fetchStaffNameMap } from "@/lib/portal/staff-identity";

import { RecentWorkSection } from "./recent-work";
import { RecentWorkFocusTarget } from "./recent-work-focus-target";
import {
  compactRepeatedOutput,
  filterRecentWork,
  paginateRecentWork,
  parseRecentWorkType,
  readNewestWindow,
  recentWorkHref,
  RECENT_WORK_LENS_LIMIT,
  TECHNICAL_RECORD_SUMMARY_ID,
  toRecentWorkItems,
} from "./recent-work-model";
import type { AuditEntry } from "./recent-work-model";
import { RecentWorkPagination } from "./recent-work-pagination";
import { ReleaseEngagementSection } from "./release-engagement";

const PAGE_SIZE = 100;
const AUDIT_LENS_COLUMNS = "id, actor_email, action, entity, entity_id, detail, at";

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
  searchParams: Promise<{
    page?: string | string[];
    q?: string | string[];
    type?: string | string[];
    rw?: string | string[];
  }>;
}>) {
  const session = await requireRole("staff");
  const params = await searchParams;
  const page = parsePage(params.page);
  // Staff-facing lens state lives in the URL: q (search text), type (work
  // Group), rw (Recent-work page). The Technical record keeps `page`.
  const search = parseRequestSearch(params.q);
  const workType = parseRecentWorkType(params.type);
  const recentPage = parsePage(params.rw);
  const from = (page - 1) * PAGE_SIZE;
  const now = new Date();

  const db = serviceClient();
  const [
    { data: rows, error, count },
    lensWindow,
    nameMap,
    profileRows,
    recipientRows,
    releaseEngagement,
  ] = await Promise.all([
    db
      .from("audit_log")
      .select(AUDIT_LENS_COLUMNS, {
        count: "exact",
      })
      .order("at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + PAGE_SIZE - 1),
    readNewestWindow(async (lensFrom, lensTo) => {
      const result = await db
        .from("audit_log")
        .select(AUDIT_LENS_COLUMNS)
        .order("at", { ascending: false })
        .order("id", { ascending: false })
        .range(lensFrom, lensTo);
      return { rows: result.data ?? [], error: result.error };
    }),
    fetchStaffNameMap(db),
    db.from("staff_profiles").select("id, display_name"),
    db.from("notification_recipients").select("id, email"),
    session.role === "admin"
      ? getPortalReleaseEngagement(PORTAL_RELEASE_BRIEFING.id)
      : Promise.resolve(null),
  ]);
  if (error !== null || lensWindow.error !== null) {
    throw new Error(`Audit read failed: ${error?.code ?? lensWindow.error?.code}`);
  }

  const parsedEntries = z.array(auditEntrySchema).safeParse(rows);
  if (!parsedEntries.success) {
    throw new Error("Audit read failed: invalid");
  }
  const entries = parsedEntries.data;
  const parsedLensEntries = z.array(auditEntrySchema).safeParse(lensWindow.rows);
  if (!parsedLensEntries.success) {
    throw new Error("Audit read failed: invalid");
  }
  const lensEntries = parsedLensEntries.data;
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
  const recentItems = toRecentWorkItems(lensEntries, {
    namesByEmail: nameMap,
    namesByProfileId,
    recipientsById,
    now,
  });
  // Staff-facing pipeline: filter by search + work group, compact repeated
  // Print/export runs, then paginate. Every count shown on the page
  // Describes this same result set.
  const matchedItems = filterRecentWork(recentItems, { search, type: workType });
  const recentEntries = compactRepeatedOutput(matchedItems);
  const recentView = paginateRecentWork(recentEntries, recentPage);

  const total = count ?? entries.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > totalPages) {
    redirect(
      recentWorkHref({
        page: Math.min(page, totalPages),
        q: search,
        type: workType,
        rw: recentPage,
      }),
    );
  }
  if (recentPage > recentView.totalPages) {
    redirect(recentWorkHref({ rw: recentView.totalPages, q: search, type: workType, page }));
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
          <RecentWorkSection
            entries={recentView.slice}
            now={now}
            search={search}
            type={workType}
            total={recentView.total}
            firstShown={recentView.firstShown}
            lastShown={recentView.lastShown}
            recentPage={recentPage}
            technicalPage={page}
            totalPages={recentView.totalPages}
            lensCapped={total > RECENT_WORK_LENS_LIMIT}
            lensLimit={RECENT_WORK_LENS_LIMIT}
          />

          <section aria-labelledby="technical-record-heading" className="mt-10">
            <h2
              id="technical-record-heading"
              className="text-[1.05rem] font-black text-[var(--color-ink)]"
            >
              Technical record
            </h2>
            <p className="mt-1.5 max-w-[65ch] text-[0.9rem] leading-relaxed text-[var(--color-muted-ink)]">
              The exact actions behind the entries above, for administrators.
            </p>
            <div
              role="region"
              aria-labelledby="technical-record-heading"
              tabIndex={0}
              className="mt-4 overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white"
            >
              <Table data-testid="audit-table" className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">When</TableHead>
                    <TableHead scope="col">Who</TableHead>
                    <TableHead scope="col">Action</TableHead>
                    <TableHead scope="col">Entity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => {
                    const external = externalAuditSummary(entry.detail);
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap text-[var(--color-muted-ink)]">
                          {formatReceived(entry.at, true)}
                        </TableCell>
                        <TableCell className="font-bold text-[var(--color-ink)]">
                          {displayNameOrEmail(nameMap, entry.actor_email)}
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-[var(--color-mint)] px-2 py-0.5 text-[0.85rem] text-[var(--color-teal-ink)]">
                            {entry.action}
                          </code>
                        </TableCell>
                        <TableCell className="text-[var(--color-body)]">
                          {entry.entity}
                          {entry.entity_id !== null && entry.entity_id !== "" ? (
                            <span className="ml-1.5 text-[0.8rem] text-[var(--color-muted-ink)]">
                              {entry.entity_id.slice(0, 8)}…
                            </span>
                          ) : null}
                          {external ? (
                            <span className="mt-0.5 block text-[0.8rem] text-[var(--color-muted-ink)]">
                              {external.target} · Outcome {external.outcome}
                            </span>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </section>
        </>
      )}

      {total > 0 ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <RecentWorkFocusTarget
            id={TECHNICAL_RECORD_SUMMARY_ID}
            testId="audit-page-summary"
            renderKey={`${search}\n${workType}\n${recentPage}\n${page}\n${total}\n${firstShown}\n${lastShown}`}
            className="text-[0.9rem] text-[var(--color-muted-ink)]"
          >
            Showing {firstShown}–{lastShown} of {total}
          </RecentWorkFocusTarget>
          <RecentWorkPagination
            ariaLabel="Activity log pages"
            recentPage={recentPage}
            technicalPage={page}
            totalPages={totalPages}
            q={search}
            type={workType}
            param="page"
            summaryId={TECHNICAL_RECORD_SUMMARY_ID}
            testId="audit-pagination"
          />
        </div>
      ) : null}
    </section>
  );
}
