// The human vocabulary over the audit record: plain-language entries,
// Grouped by practice-local day. Storage codes stay in the technical table.
// Patient names are deliberately not resolved here; the request is the link.

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

export interface RecentWorkItem {
  readonly id: string;
  readonly at: string;
  readonly actor: string;
  readonly sentence: string;
  readonly requestId: string | null;
  // True when the action is unknown to the human vocabulary and the entry
  // Falls back to the technical form — an honest fallback, never silence.
  readonly technical: boolean;
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
  for (const entry of entries) {
    if (isPortalReleaseAuditAction(entry.action)) continue;
    // The dismissal nudge pairs with tour_complete on finish; it stays in
    // The technical record rather than the human view.
    if (entry.action === "staff.tour_dismiss") continue;
    const detail = detailObject(entry.detail);
    const { sentence, technical } = describeAction(entry, detail, ctx);
    items.push({
      id: entry.id,
      at: entry.at,
      actor: nameOrEmail(ctx.namesByEmail, entry.actor_email),
      sentence,
      requestId: entry.entity === "requests" ? entry.entity_id : null,
      technical,
    });
  }
  return items;
}

export function groupByPracticeDay(
  items: readonly RecentWorkItem[],
  now: Date,
): { label: string; items: RecentWorkItem[] }[] {
  const groups: { label: string; items: RecentWorkItem[] }[] = [];
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
