import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { formatReceived } from "@/app/admin/(portal)/requests/format";
import { initialsOf, practiceDate } from "@/app/admin/(portal)/schedule/week-calendar";
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
import { readActivity } from "@/lib/portal/activity";
import { activityHref, parseActivitySearchParams } from "@/lib/portal/activity-contracts";
import type { ActivityPage, ActivityUrlFilters } from "@/lib/portal/activity-contracts";
import { requireRole } from "@/lib/portal/auth";
import { PORTAL_RELEASE_BRIEFING } from "@/lib/portal/release-briefing-content";
import { getPortalReleaseEngagement } from "@/lib/portal/release-engagement";
import { parsePage } from "@/lib/portal/request-query";
import { executeSchedulingOperation } from "@/lib/portal/scheduling/service";
import { serviceClient } from "@/lib/portal/server";
import { displayNameOrEmail, fetchStaffNameMap } from "@/lib/portal/staff-identity";

import { ActivityLog } from "./activity-log";
import type { ActivityProvider } from "./activity-log";
import { technicalRecordHref } from "./activity-model";
import type { AuditEntry } from "./audit-sentences";
import { ReleaseEngagementSection } from "./release-engagement";
import { TechnicalRecordPager, TechnicalRecordSummary } from "./technical-record-pager";

/* The Activity log (issue #357). Everyone on staff reads the log; the server
   decides which changes each role sees, and front desk never gets the
   Settings filter. Administrators also get the release engagement and the
   Technical record: the stored audit rows, 100 a page, at `?page=`. */

const PAGE_SIZE = 100;
const AUDIT_COLUMNS = "id, actor_email, action, entity, entity_id, detail, at";

const auditEntrySchema = z.object({
  id: z.string(),
  actor_email: z.string(),
  action: z.string(),
  entity: z.string(),
  entity_id: z.string().nullable(),
  detail: jsonSchema,
  at: z.string(),
}) satisfies z.ZodType<AuditEntry>;

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

function parseAuditEntries(rows: Json): AuditEntry[] {
  const parsed = z.array(auditEntrySchema).safeParse(rows);
  if (!parsed.success) {
    throw new Error("Audit read failed: invalid");
  }
  return parsed.data;
}

async function readFirstPage(
  db: SupabaseClient,
  actorId: string,
  filters: Readonly<ActivityUrlFilters>,
): Promise<ActivityPage> {
  try {
    return await readActivity(db, actorId, filters, null);
  } catch {
    return { ok: false, code: "unavailable" };
  }
}

async function readProviders(db: SupabaseClient, actorId: string): Promise<ActivityProvider[]> {
  try {
    const catalog = await executeSchedulingOperation(db, actorId, {
      action: "catalog",
      entity: "provider",
      query: "",
      active: true,
      limit: 100,
      after: null,
    });
    if (
      !catalog.ok ||
      !("entity" in catalog) ||
      catalog.entity !== "provider" ||
      !("items" in catalog)
    ) {
      return [];
    }
    return catalog.items.map((provider) => ({
      id: provider.id,
      name: provider.name,
      initials: initialsOf(provider.name),
    }));
  } catch {
    return [];
  }
}

export default async function AdminAuditPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const session = await requireRole("staff");
  const params = await searchParams;
  const admin = session.role === "admin";
  const parsed = parseActivitySearchParams(params);
  // Front desk has no Settings filter; the database would refuse it anyway.
  const categories = admin
    ? parsed.categories
    : parsed.categories?.filter((category) => category !== "settings");
  const filters: ActivityUrlFilters = {
    ...parsed,
    categories: categories !== undefined && categories.length > 0 ? categories : undefined,
  };
  const now = new Date();
  const db = serviceClient();
  const [firstPage, providers] = await Promise.all([
    readFirstPage(db, session.id, filters),
    readProviders(db, session.id),
  ]);

  return (
    <ActivityLog
      key={activityHref(filters)}
      initialFilters={filters}
      initialPage={firstPage}
      role={admin ? "admin" : "staff"}
      now={now.toISOString()}
      today={practiceDate(now)}
      providers={providers}
    >
      {admin ? <TechnicalRecord filters={filters} page={parsePage(params.page)} /> : null}
    </ActivityLog>
  );
}

async function TechnicalRecord({
  filters,
  page,
}: Readonly<{
  filters: ActivityUrlFilters;
  page: number;
}>) {
  const db = serviceClient();
  const from = (page - 1) * PAGE_SIZE;
  const [{ data: rows, error, count }, nameMap, releaseEngagement] = await Promise.all([
    db
      .from("audit_log")
      .select(AUDIT_COLUMNS, { count: "exact" })
      .order("at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + PAGE_SIZE - 1),
    fetchStaffNameMap(db),
    getPortalReleaseEngagement(PORTAL_RELEASE_BRIEFING.id),
  ]);
  if (error !== null) {
    throw new Error(`Audit read failed: ${error.code}`);
  }
  const entries = parseAuditEntries(rows);
  const total = count ?? entries.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > totalPages) {
    redirect(technicalRecordHref(activityHref(filters), totalPages));
  }
  const firstShown = total === 0 ? 0 : from + 1;
  const lastShown = from + entries.length;

  return (
    <>
      <ReleaseEngagementSection engagement={releaseEngagement} />
      <section aria-labelledby="technical-record-heading" className="mt-6">
        <h2
          id="technical-record-heading"
          className="text-[1.05rem] font-black text-[var(--color-ink)]"
        >
          Technical record
        </h2>
        <p className="mt-1.5 max-w-[65ch] text-[0.9rem] leading-relaxed text-[var(--color-muted-ink)]">
          The exact stored actions behind the log, for administrators.
        </p>
        {entries.length === 0 ? (
          <p className="mt-4 text-[0.9rem] text-[var(--color-muted-ink)]">Nothing is stored yet.</p>
        ) : (
          <div
            role="region"
            aria-labelledby="technical-record-heading"
            tabIndex={0}
            className="mt-4 overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white"
          >
            <Table data-testid="audit-table" className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
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
        )}
        {total > 0 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <TechnicalRecordSummary renderKey={`${page}\n${total}\n${firstShown}\n${lastShown}`}>
              Showing {firstShown}–{lastShown} of {total}
            </TechnicalRecordSummary>
            <Suspense fallback={null}>
              <TechnicalRecordPager page={page} totalPages={totalPages} />
            </Suspense>
          </div>
        ) : null}
      </section>
    </>
  );
}
