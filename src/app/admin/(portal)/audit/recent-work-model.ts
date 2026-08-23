// The human vocabulary over the audit record: plain-language entries,
// Grouped by practice-local day. Storage codes stay in the technical table.
// Patient names are deliberately not resolved here; the request is the link.

import { z } from "zod";

import { OUTCOME_HISTORY_LABELS, followUpShortLabel } from "@/app/admin/(portal)/requests/format";
import { asJsonBoolean, asJsonNumber, asJsonObject, asJsonString } from "@/lib/json";
import type { Json, JsonObject } from "@/lib/json";
import type { RequestStatus } from "@/lib/portal/contracts";
import { isPortalReleaseAuditAction } from "@/lib/portal/release-state";

// The human lens over the durable audit record: plain-language, grouped by
// Practice-local day, linked to the work — never an action code. Storage
// Vocabulary stays in the technical table beneath. Patient names are
// Deliberately not resolved here; the request itself is the link.

export interface AuditEntry {
  readonly id: string;
  readonly actor_email: string;
  readonly action: string;
  readonly entity: string;
  readonly entity_id: string | null;
  readonly detail: Json;
  readonly at: string;
}

export interface RecentWorkContext {
  // Email -> display name (staff identity for actors)
  namesByEmail: ReadonlyMap<string, string>;
  // Staff_profiles id -> display name (for staff.* entity references)
  namesByProfileId: ReadonlyMap<string, string>;
  // Notification_recipients id -> email (recipient references; removed
  // Recipients fall back to "a notification recipient")
  recipientsById: ReadonlyMap<string, string>;
  now: Date;
}

export type RecentWorkType = "all" | "requests" | "people" | "output" | "site";

/**
 * The staff-facing work groups. Labels are plain language — never storage
 * codes. Unknown technical actions stay in the Technical record, not in a
 * catch-all Recent-work group.
 */
export const WORK_TYPE_LABELS = {
  requests: "Appointment requests",
  people: "Notifications & staff",
  output: "Printing & exports",
  site: "Website & access",
} as const satisfies Record<Exclude<RecentWorkType, "all">, string>;

export const WORK_TYPE_FILTERS = [
  "all",
  "requests",
  "people",
  "output",
  "site",
] as const satisfies readonly RecentWorkType[];

export interface RecentWorkItem {
  readonly id: string;
  readonly at: string;
  readonly actor: string;
  readonly sentence: string;
  readonly requestId: string | null;
  // True when the action is unknown to the human vocabulary and the entry
  // Falls back to the technical form — an honest fallback, never silence.
  readonly technical: boolean;
  // Work group for the staff-facing filter, classified from the action.
  readonly workType: Exclude<RecentWorkType, "all">;
  // Storage action code. Used only for deterministic grouping; the human
  // View renders the sentence, never this value.
  readonly action: string;
  // Index in the authoritative newest-first audit window. Compaction
  // Requires consecutive source positions so a filtered-out or intervening
  // Row cannot create a fake adjacent run.
  readonly sourceIndex: number;
}

const NY_DAY = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "short",
  timeZone: "America/New_York",
});

const NY_WEEKDAY = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  timeZone: "America/New_York",
});

const NY_MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  timeZone: "America/New_York",
});

function nyDayNumber(date: Date): number {
  return Math.round(Date.parse(`${NY_DAY.format(date)}T00:00:00Z`) / 86_400_000);
}

export function dayGroupLabel(iso: string, now: Date): string {
  const dayDiff = nyDayNumber(now) - nyDayNumber(new Date(iso));
  if (dayDiff <= 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff <= 6) return NY_WEEKDAY.format(new Date(iso));
  return NY_MONTH_DAY.format(new Date(iso));
}

function detailObject(detail: Json): JsonObject {
  return asJsonObject(detail) ?? {};
}

/**
 * Work-group classification for the staff-facing filter. Prefix rules are
 * checked in this exact order so classification is deterministic. Unknown
 * actions return null and stay in the Technical record.
 */
export function classifyWorkType(action: string): Exclude<RecentWorkType, "all"> | null {
  if (action === "requests.print_new" || action === "requests.export") return "output";
  if (action.startsWith("request.")) return "requests";
  if (action.startsWith("recipients.") || action.startsWith("staff.")) return "people";
  if (action.startsWith("maintainers.")) return "site";
  return null;
}

function isCallOutcomeId(value: string): value is keyof typeof OUTCOME_HISTORY_LABELS {
  return Object.hasOwn(OUTCOME_HISTORY_LABELS, value);
}

function nameOrEmail(namesByEmail: ReadonlyMap<string, string>, email: string): string {
  const name = namesByEmail.get(email.trim().toLowerCase());
  return name !== undefined && name !== "" ? name : email;
}

function recipientLabel(recipientsById: ReadonlyMap<string, string>, id: string | null): string {
  if (id === null || id === "") return "a notification recipient";
  return recipientsById.get(id) ?? "a notification recipient";
}

function profileLabel(namesByProfileId: ReadonlyMap<string, string>, id: string | null): string {
  if (id === null || id === "") return "a colleague";
  return namesByProfileId.get(id) ?? "a colleague";
}

const STATUS_WORDS = {
  new: "New",
  contacted: "Contacted",
  scheduled: "Scheduled",
  closed: "Closed",
} as const satisfies Record<RequestStatus, string>;

function staffStateWord(raw: string): string | null {
  if (raw === "new") return STATUS_WORDS.new;
  if (raw === "contacted") return STATUS_WORDS.contacted;
  if (raw === "booked" || raw === "scheduled") return STATUS_WORDS.scheduled;
  if (raw === "closed") return STATUS_WORDS.closed;
  return null;
}

interface ActionDescription {
  sentence: string;
  technical: boolean;
}

function describeAction(
  entry: Readonly<AuditEntry>,
  detail: JsonObject,
  ctx: Readonly<RecentWorkContext>,
): ActionDescription {
  const requestEntity = entry.entity === "requests";
  switch (entry.action) {
    case "request.create":
      return { sentence: "added an appointment request", technical: false };
    case "request.status_change": {
      const to = asJsonString(detail.to) ?? "";
      if (to === "closed" && detail.legacy_unclassified_close === true) {
        return { sentence: "closed a request without an outcome", technical: false };
      }
      return {
        sentence: `marked a request ${
          to === "new" || to === "contacted" || to === "scheduled" || to === "closed"
            ? STATUS_WORDS[to]
            : to
        }`,
        technical: false,
      };
    }
    case "request.close": {
      return {
        sentence: `closed a request — ${
          detail.disposition === "converted" ? "appointment booked" : "no appointment booked"
        }`,
        technical: false,
      };
    }
    case "request.call_outcome": {
      const outcome = asJsonString(detail.outcome) ?? "";
      const followUpAt = asJsonString(detail.follow_up_at);
      const followUp =
        followUpAt !== null && followUpAt !== ""
          ? ` — call again ${followUpShortLabel(followUpAt, ctx.now)}`
          : "";
      switch (outcome) {
        case "reached_follow_up":
          return {
            sentence: `reached the patient on a request${followUp}`,
            technical: false,
          };
        case "voicemail":
          return {
            sentence: `left a voicemail on a request${followUp}`,
            technical: false,
          };
        case "no_answer":
          return {
            sentence: `got no answer on a request${followUp}`,
            technical: false,
          };
        case "wont_schedule":
          return {
            sentence: "closed a request — patient won't schedule",
            technical: false,
          };
        case "not_actionable":
          return {
            sentence: "closed a request — duplicate or not actionable",
            technical: false,
          };
        case "scheduled_transferred":
          return {
            sentence: "finished a request — appointment was booked",
            technical: false,
          };
      }
      return {
        sentence: `recorded an outcome on a request${
          isCallOutcomeId(outcome) ? ` — ${OUTCOME_HISTORY_LABELS[outcome]}` : ""
        }`,
        technical: false,
      };
    }
    case "request.note":
      return { sentence: "added a note to a request", technical: false };
    case "request.authorized_delete":
      return { sentence: "deleted a request early (authorized)", technical: false };
    case "request.retention_delete":
      return { sentence: "a request was removed by the retention policy", technical: false };
    case "request.retention_hold":
      return {
        sentence: `${asJsonBoolean(detail.held) === false ? "released" : "placed"} a legal hold on a request`,
        technical: false,
      };
    case "requests.export": {
      const count = asJsonNumber(detail.row_count);
      return {
        sentence: `exported the request list${
          count !== null ? ` (${count} ${count === 1 ? "request" : "requests"})` : ""
        }`,
        technical: false,
      };
    }
    case "requests.print_new": {
      const count = asJsonNumber(detail.row_count);
      return {
        sentence: `prepared the New-request print packet${
          count !== null ? ` (${count} ${count === 1 ? "request" : "requests"})` : ""
        }`,
        technical: false,
      };
    }
    case "recipients.add":
      return {
        sentence: `added ${recipientLabel(ctx.recipientsById, entry.entity_id)} to notification emails`,
        technical: false,
      };
    case "recipients.remove":
      return {
        sentence: `removed ${recipientLabel(ctx.recipientsById, entry.entity_id)} from notification emails`,
        technical: false,
      };
    case "recipients.toggle":
      return {
        sentence: `${asJsonBoolean(detail.to) === true ? "resumed" : "paused"} notification emails for ${recipientLabel(ctx.recipientsById, entry.entity_id)}`,
        technical: false,
      };
    case "recipients.label_update":
      return {
        sentence: `renamed ${recipientLabel(ctx.recipientsById, entry.entity_id)} on the notification list`,
        technical: false,
      };
    case "staff.invite":
      return {
        sentence: `invited ${profileLabel(ctx.namesByProfileId, entry.entity_id)} to the portal`,
        technical: false,
      };
    case "staff.onboard":
      return { sentence: "completed portal setup", technical: false };
    case "staff.deactivate":
      return {
        sentence: `deactivated ${profileLabel(ctx.namesByProfileId, entry.entity_id)}'s portal access`,
        technical: false,
      };
    case "staff.role":
      return {
        sentence: `changed ${profileLabel(ctx.namesByProfileId, entry.entity_id)}'s role`,
        technical: false,
      };
    case "staff.password_reset":
      return {
        sentence: `sent ${profileLabel(ctx.namesByProfileId, entry.entity_id)} a password reset link`,
        technical: false,
      };
    case "staff.tour_dismiss":
      // Filtered from the human view in toRecentWorkItems (it pairs with
      // Tour_complete on finish); the technical record keeps it.
      return { sentence: "dismissed the portal tour nudge", technical: true };
    case "staff.tour_restart":
      return { sentence: "restarted the portal tour", technical: false };
    case "staff.tour_complete":
      return { sentence: "finished the portal tour", technical: false };
    case "maintainers.invite":
      return {
        sentence: `invited ${asJsonString(detail.target_login) ?? "a maintainer"} to edit the website`,
        technical: false,
      };
    case "maintainers.cancel":
      return {
        sentence: `canceled a website-maintainer invitation for ${asJsonString(detail.target_login) ?? "a maintainer"}`,
        technical: false,
      };
    case "maintainers.revoke":
      return {
        sentence: `removed ${asJsonString(detail.target_login) ?? "a maintainer"}'s website access`,
        technical: false,
      };
    case "request.workflow_command": {
      const command = asJsonString(detail.command) ?? "";
      const to = asJsonString(detail.to) ?? "";
      switch (command) {
        case "record_contact_attempt":
          return { sentence: "recorded a contact attempt on a request", technical: false };
        case "confirm_booking_handoff":
          return { sentence: "marked a request Scheduled", technical: false };
        case "close_request":
          return { sentence: "closed a request", technical: false };
        case "reopen_request":
          return { sentence: "reopened a request", technical: false };
        case "set_call_again":
          return { sentence: "corrected the call-again time on a request", technical: false };
        case "undo_latest_transition": {
          const restored = staffStateWord(to);
          return {
            sentence:
              restored === null
                ? "undid the last change on a request"
                : `undid the last change on a request — back to ${restored}`,
            technical: false,
          };
        }
        case "classify_legacy_closure":
          return { sentence: "classified a closed request", technical: false };
        default:
          return {
            sentence: requestEntity
              ? `${entry.action} on a request`
              : `${entry.action} (${entry.entity})`,
            technical: true,
          };
      }
    }
    default:
      return {
        sentence: requestEntity
          ? `${entry.action} on a request`
          : `${entry.action} (${entry.entity})`,
        technical: true,
      };
  }
}

export function toRecentWorkItems(
  entries: readonly AuditEntry[],
  ctx: Readonly<RecentWorkContext>,
): RecentWorkItem[] {
  const items: RecentWorkItem[] = [];
  for (const [sourceIndex, entry] of entries.entries()) {
    if (isPortalReleaseAuditAction(entry.action)) continue;
    // The dismissal nudge pairs with tour_complete on finish; it stays in
    // The technical record rather than the human view.
    if (entry.action === "staff.tour_dismiss") continue;
    const detail = detailObject(entry.detail);
    const { sentence, technical } = describeAction(entry, detail, ctx);
    const workType = classifyWorkType(entry.action);
    // Unknown actions fall back to their raw identifier, which never
    // Belongs in the human view: technical items stay in the technical
    // Table beneath Recent work.
    if (technical || workType === null) continue;
    items.push({
      id: entry.id,
      at: entry.at,
      actor: nameOrEmail(ctx.namesByEmail, entry.actor_email),
      sentence,
      requestId: entry.entity === "requests" ? entry.entity_id : null,
      technical,
      workType,
      action: entry.action,
      sourceIndex,
    });
  }
  return items;
}

export function groupByPracticeDay<T extends { readonly at: string }>(
  items: readonly T[],
  now: Date,
): { label: string; items: T[] }[] {
  const groups: { label: string; items: T[] }[] = [];
  for (const item of items) {
    const label = dayGroupLabel(item.at, now);
    const current = groups.at(-1);
    if (current?.label === label) {
      current.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }
  return groups;
}

// ---- Staff-facing search, filters, compaction, and URL state ----
//
// These helpers operate on the staff-facing lens only. They never touch the
// Technical read path: the Technical record query, its row order, and its
// Counts are unaffected by Recent-work search, filtering, or grouping.

/** The practice-local day key for one timestamp (compact ISO date). */
function nyDayKey(iso: string): string {
  return NY_DAY.format(new Date(iso));
}

/**
 * Everything Recent-work search may match: the actor exactly as displayed
 * (display name when known, email only as already shown), the
 * plain-language sentence, and a linked request's id — which Recent work
 * already renders as the "open request" link target. Raw detail JSON,
 * entity UUIDs, storage codes, tokens, secrets, and any field the page does
 * not already show staff are deliberately excluded from the haystack.
 */
function recentWorkHaystack(item: Readonly<RecentWorkItem>): string {
  return `${item.actor}\n${item.sentence}\n${item.requestId ?? ""}`.toLowerCase();
}

function matchesRecentWork(
  item: Readonly<RecentWorkItem>,
  type: RecentWorkType,
  needle: string,
): boolean {
  if (type !== "all" && item.workType !== type) return false;
  if (needle === "") return true;
  return recentWorkHaystack(item).includes(needle);
}

const workTypeParamSchema = z.union([z.string(), z.array(z.string())]);

/**
 * Parse the `type` URL parameter into a staff-facing work group; anything
 * unrecognized falls back to "all" so an old or mistyped link still shows
 * every entry.
 */
export function parseRecentWorkType(
  param: Readonly<string | string[] | undefined>,
): RecentWorkType {
  const parsed = workTypeParamSchema.safeParse(param ?? "");
  const rawValues = parsed.success
    ? Array.isArray(parsed.data)
      ? parsed.data
      : [parsed.data]
    : [];
  const present = new Set(rawValues);
  for (const candidate of WORK_TYPE_FILTERS) {
    if (present.has(candidate)) return candidate;
  }
  return "all";
}

/**
 * Filter the staff-facing lens by search text and work group. Input order is
 * preserved; an empty search with "all" returns every item.
 */
export function filterRecentWork(
  items: readonly RecentWorkItem[],
  options: Readonly<{ search: string; type: RecentWorkType }>,
): RecentWorkItem[] {
  const needle = options.search.trim().toLowerCase();
  return items.filter((item) => matchesRecentWork(item, options.type, needle));
}

/**
 * Adjacent low-value print/export events collapse into one summary.
 *
 * Safety boundaries — a run joins only while every condition holds against
 * the previous event in the existing (newest-first) order:
 *
 * 1. same storage action, and it is a known print/export action rendered in
 *    plain language (technical fallbacks never group);
 * 2. same actor and same linked request (never combines people);
 * 3. same practice-local day;
 * 4. consecutive sourceIndex values in the authoritative newest-first
 *    window (a filtered-out or intervening audit row breaks the run);
 * 5. within OUTPUT_GROUP_MAX_GAP_MS of the previous event (widely separated
 *    actions stay separate even with identical sentences).
 *
 * The rule is a pure scan of the ordered input: deterministic across runs,
 * never reorders or drops an event — singles pass through untouched and
 * every grouped member stays reachable through its summary's expansion.
 */
export const OUTPUT_GROUP_MAX_GAP_MS = 30 * 60 * 1000;

const OUTPUT_GROUP_PHRASES = {
  "requests.print_new": "prepared the New-request print packet",
  "requests.export": "exported the request list",
} as const;

/** The plain-language phrase for a compactable output action, else null. */
function outputPhrase(action: string): string | null {
  if (action === "requests.print_new") return OUTPUT_GROUP_PHRASES["requests.print_new"];
  if (action === "requests.export") return OUTPUT_GROUP_PHRASES["requests.export"];
  return null;
}

export type RecentWorkEntry =
  | { readonly kind: "single"; readonly at: string; readonly item: RecentWorkItem }
  | {
      readonly kind: "group";
      readonly key: string;
      // Display time: the newest event in the group.
      readonly at: string;
      readonly actor: string;
      readonly phrase: string;
      readonly count: number;
      // Span endpoints: toAt is the newest event, fromAt the oldest.
      readonly fromAt: string;
      readonly toAt: string;
      readonly items: readonly RecentWorkItem[];
    };

export function compactRepeatedOutput(items: readonly RecentWorkItem[]): RecentWorkEntry[] {
  const entries: RecentWorkEntry[] = [];
  let run: RecentWorkItem[] = [];
  const flush = (): void => {
    if (run.length === 0) return;
    const phrase = outputPhrase(run[0].action);
    if (run.length === 1 || phrase === null) {
      entries.push({ kind: "single", at: run[0].at, item: run[0] });
    } else {
      entries.push({
        kind: "group",
        key: `repeated-${run[0].action}-${run[run.length - 1].id}`,
        at: run[0].at,
        actor: run[0].actor,
        phrase,
        count: run.length,
        fromAt: run[run.length - 1].at,
        toAt: run[0].at,
        items: [...run],
      });
    }
    run = [];
  };
  for (const item of items) {
    const previous = run.at(-1);
    const gapMs =
      previous === undefined
        ? Number.POSITIVE_INFINITY
        : Date.parse(previous.at) - Date.parse(item.at);
    const joins =
      previous !== undefined &&
      !item.technical &&
      outputPhrase(item.action) !== null &&
      item.action === previous.action &&
      item.actor === previous.actor &&
      item.requestId === previous.requestId &&
      nyDayKey(item.at) === nyDayKey(previous.at) &&
      item.sourceIndex === previous.sourceIndex + 1 &&
      gapMs >= 0 &&
      gapMs <= OUTPUT_GROUP_MAX_GAP_MS;
    if (!joins) flush();
    run.push(item);
  }
  flush();
  return entries;
}

export const RECENT_WORK_SEARCH_ID = "recent-work-search";
export const RECENT_WORK_SUMMARY_ID = "recent-work-summary";
export const TECHNICAL_RECORD_SUMMARY_ID = "audit-page-summary";

export const RECENT_WORK_PAGE_SIZE = 50;
// Hosted PostgREST max_rows is 1,000. The staff-facing lens is 2,000 newest
// Rows, read in provider-safe chunks so a 1,260-row fixture is complete.
export const AUDIT_PROVIDER_PAGE_SIZE = 1000;
export const RECENT_WORK_LENS_LIMIT = 2000;

export interface AuditWindowPage<T> {
  readonly rows: readonly T[];
  readonly error: { readonly code?: string } | null;
}

/**
 * Newest-first window reader. Each range is at most `pageSize` and never
 * larger than the provider ceiling. Stops at `limit` or the first short page.
 */
export async function readNewestWindow<T>(
  readRange: (from: number, to: number) => Promise<AuditWindowPage<T>>,
  options: Readonly<{ limit?: number; pageSize?: number }> = {},
): Promise<AuditWindowPage<T>> {
  const limit = options.limit ?? RECENT_WORK_LENS_LIMIT;
  const pageSize = Math.min(options.pageSize ?? AUDIT_PROVIDER_PAGE_SIZE, AUDIT_PROVIDER_PAGE_SIZE);
  if (limit <= 0 || pageSize <= 0) return { rows: [], error: null };
  const rows: T[] = [];
  while (rows.length < limit) {
    const from = rows.length;
    const wanted = Math.min(pageSize, limit - rows.length);
    const page = await readRange(from, from + wanted - 1);
    if (page.error !== null) return { rows, error: page.error };
    const chunk = page.rows.slice(0, wanted);
    rows.push(...chunk);
    if (chunk.length < wanted) break;
  }
  return { rows, error: null };
}

export interface RecentWorkPage<T> {
  readonly slice: readonly T[];
  readonly total: number;
  readonly totalPages: number;
  readonly firstShown: number;
  readonly lastShown: number;
}

/** Deterministic offset window over an ordered result set. */
export function paginateRecentWork<T>(
  entries: readonly T[],
  page: number,
  pageSize: number = RECENT_WORK_PAGE_SIZE,
): RecentWorkPage<T> {
  const total = entries.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = (safePage - 1) * pageSize;
  const slice = entries.slice(from, from + pageSize);
  return {
    slice,
    total,
    totalPages,
    firstShown: total === 0 ? 0 : from + 1,
    lastShown: from + slice.length,
  };
}

export interface RecentWorkQuery {
  readonly q?: string;
  readonly type?: RecentWorkType;
  readonly rw?: number;
  readonly page?: number;
  readonly hash?: string;
}

/**
 * The Activity route's shareable URL state. Defaults are omitted so a
 * cleared view collapses to `/admin/audit`.
 */
export function recentWorkHref(query: Readonly<RecentWorkQuery>): string {
  const params = new URLSearchParams();
  const trimmedQ = query.q?.trim() ?? "";
  if (trimmedQ !== "") params.set("q", trimmedQ);
  if (query.type !== undefined && query.type !== "all") params.set("type", query.type);
  if (query.rw !== undefined && query.rw > 1) params.set("rw", String(query.rw));
  if (query.page !== undefined && query.page > 1) params.set("page", String(query.page));
  const queryString = params.toString();
  const hash = query.hash !== undefined && query.hash !== "" ? `#${query.hash}` : "";
  return `/admin/audit${queryString !== "" ? `?${queryString}` : ""}${hash}`;
}
