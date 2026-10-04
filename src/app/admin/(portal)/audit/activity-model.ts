/* The Activity log's words (issue #357): one plain sentence per row, read after the actor's
   name ("Maria Lopez moved Dana Walsh to Thu, Sep 17 at 2:00 PM with Dr. Awad"). Audit rows are
   phrased by describeAction in audit-sentences.ts, so every sentence the log already wrote reads
   the same. Browser-safe: the page and its rows both import it. */

import { STATUS_LABELS } from "@/app/admin/(portal)/requests/format";
import { asJsonArray, asJsonBoolean, asJsonNumber, asJsonObject, asJsonString } from "@/lib/json";
import type { Json, JsonObject } from "@/lib/json";
import type { ActivityRow, AppointmentAction } from "@/lib/portal/activity-contracts";
import { intervalLength } from "@/lib/portal/scheduling/booking-interval";
import { parseRequestStatus } from "@/lib/portal/workflow/contracts";

import { describeAction } from "./audit-sentences";
import type { ActionDescription } from "./audit-sentences";

const PRACTICE_TZ = "America/New_York";

const NY_DAY = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: PRACTICE_TZ,
});

const NY_TIME = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: PRACTICE_TZ,
});

const NY_MIDNIGHT = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: PRACTICE_TZ,
});

// A calendar date ("2026-11-26") names the same day everywhere; format it in UTC.
const CALENDAR_DAY = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** "Thu, Sep 17 at 2:00 PM", practice-local. */
export function activitySlotLabel(iso: string): string {
  const at = new Date(iso);
  return `${NY_DAY.format(at)} at ${NY_TIME.format(at)}`;
}

function calendarDayLabel(date: string): string {
  const at = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(at.getTime()) ? date : CALENDAR_DAY.format(at);
}

const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" });

/** "Wednesday" for 2026-10-07. */
function weekdayOf(date: string): string {
  const at = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(at.getTime()) ? "weekday" : WEEKDAY.format(at);
}

function isPracticeMidnight(at: Date): boolean {
  return NY_MIDNIGHT.format(at) === "00:00";
}

/** A time-off span: whole days read as days, anything else with its times. */
function spanLabel(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  if (isPracticeMidnight(start) && isPracticeMidnight(end)) {
    // The end is the midnight after the last day off.
    const last = new Date(end.getTime() - 12 * 3_600_000);
    const first = NY_DAY.format(start);
    const final = NY_DAY.format(last);
    return first === final ? first : `${first} – ${final}`;
  }
  const sameDay = NY_DAY.format(start) === NY_DAY.format(end);
  return sameDay
    ? `${NY_DAY.format(start)}, ${NY_TIME.format(start)} – ${NY_TIME.format(end)}`
    : `${activitySlotLabel(startsAt)} – ${activitySlotLabel(endsAt)}`;
}

function objectOf(value: Json | null | undefined): JsonObject {
  return value === null || value === undefined ? {} : (asJsonObject(value) ?? {});
}

/** The entries of `list` in `after` that `before` lacks, matched by id (or whole value). */
function addedItems(before: JsonObject, after: JsonObject, list: string): JsonObject[] {
  const key = (item: Json): string => asJsonString(objectOf(item).id) ?? JSON.stringify(item);
  const had = new Set((asJsonArray(before[list]) ?? []).map(key));
  const added: JsonObject[] = [];
  for (const item of asJsonArray(after[list]) ?? []) {
    if (!had.has(key(item))) added.push(objectOf(item));
  }
  return added;
}

function possessive(name: string): string {
  return `${name}'s`;
}

/** The person the row is about; a missing name falls back to a plain noun. */
function patientOf(row: Readonly<ActivityRow>): string {
  return row.patientName ?? "a patient";
}

function appointmentSentence(row: Readonly<ActivityRow>, action: AppointmentAction): string {
  const patient = patientOf(row);
  const slot = row.appointmentStart === null ? null : activitySlotLabel(row.appointmentStart);
  const when = slot === null ? "" : ` for ${slot}`;
  const withWhom = row.providerName === null ? "" : ` with ${row.providerName}`;
  const visit = slot === null ? "" : `${slot} `;
  if (row.via === "undo") {
    const undone = {
      booked: `undid booking ${patient}${when}`,
      moved: `undid moving ${patient}${slot === null ? "" : ` — back to ${slot}`}${withWhom}`,
      cancelled: `undid cancelling ${possessive(patient)} ${visit}appointment`,
      checked_in: `undid checking in ${patient}${when}`,
      no_show: `undid marking ${patient} a no-show${when}`,
      completed: `undid completing ${possessive(patient)} ${visit}visit`,
    } satisfies Record<AppointmentAction, string>;
    return undone[action];
  }
  const done = {
    booked: `booked ${patient}${when}${withWhom}`,
    moved: `moved ${patient}${slot === null ? "" : ` to ${slot}`}${withWhom}`,
    cancelled: `cancelled ${possessive(patient)} ${visit}appointment${withWhom}`,
    checked_in: `checked in ${patient}${when}${withWhom}`,
    no_show: `marked ${patient} a no-show${when}${withWhom}`,
    completed: `completed ${possessive(patient)} ${visit}visit${withWhom}`,
  } satisfies Record<AppointmentAction, string>;
  return done[action];
}

function recordName(record: JsonObject): string | null {
  return asJsonString(objectOf(record.provider).name) ?? asJsonString(record.name);
}

/** "Schedule and hours": providers, their hours and time off, appointment types and locations. */
function scheduleSentence(row: Readonly<ActivityRow>): ActionDescription {
  const before = objectOf(row.before);
  const after = objectOf(row.after);
  const provider = row.providerName ?? recordName(after) ?? recordName(before) ?? "a provider";
  const location = row.locationName ?? recordName(after) ?? recordName(before) ?? "an office";
  const type = row.appointmentTypeName ?? recordName(after) ?? recordName(before);
  const theType = type === null ? "an appointment type" : `the ${type} appointment type`;
  const known = (sentence: string): ActionDescription => ({ sentence, technical: false });
  switch (row.action) {
    case "add_provider":
      return known(`added ${provider} to the schedule`);
    case "set_provider_profile":
      return known(`updated ${possessive(provider)} profile`);
    case "set_provider_weekly_hours":
      return known(`changed ${possessive(provider)} weekly hours`);
    case "save_provider":
      return known(`updated ${possessive(provider)} hours and time off`);
    case "add_time_off":
    case "remove_time_off": {
      const span = (
        row.action === "add_time_off"
          ? addedItems(before, after, "exceptions")
          : addedItems(after, before, "exceptions")
      ).at(0);
      const label =
        span === undefined
          ? ""
          : spanLabel(asJsonString(span.startsAt) ?? "", asJsonString(span.endsAt) ?? "");
      const verb = row.action === "add_time_off" ? "added" : "removed";
      return known(`${verb} time off for ${provider}${label === "" ? "" : `, ${label}`}`);
    }
    case "set_provider_types":
      return known(`changed which appointment types ${provider} sees`);
    case "save_appointment_type":
      return known(row.before === null ? `added ${theType}` : `changed ${theType}`);
    case "reorder_appointment_types":
      return known(`moved ${theType} in the booking order`);
    case "set_appointment_type_active":
      return known(`turned ${asJsonBoolean(after.active) === false ? "off" : "on"} ${theType}`);
    case "delete_appointment_type":
      return known(`deleted ${theType}`);
    case "save_location":
    case "save_location_details":
      return known(`updated ${possessive(location)} details and hours`);
    case "add_location_closure":
    case "remove_location_closure": {
      const closure = (
        row.action === "add_location_closure"
          ? addedItems(before, after, "closures")
          : addedItems(after, before, "closures")
      ).at(0);
      const day = closure === undefined ? null : asJsonString(closure.closedOn);
      const on = day === null ? "" : ` on ${calendarDayLabel(day)}`;
      return known(
        row.action === "add_location_closure"
          ? `closed ${location}${on}`
          : `reopened ${location}${on}`,
      );
    }
    case "set_provider_day_hours": {
      // The Day view's Hours sheet (#353): one day, or that weekday from the day on.
      const dayHours = objectOf(after.dayHours);
      const date = asJsonString(dayHours.date);
      if (date === null) return known(`changed ${possessive(provider)} hours`);
      return known(
        asJsonString(dayHours.scope) === "weekday_from"
          ? `changed ${possessive(provider)} ${weekdayOf(date)} hours from ${calendarDayLabel(date)}`
          : `changed ${possessive(provider)} hours for ${calendarDayLabel(date)}`,
      );
    }
    case "set_booking_interval": {
      const minutes = asJsonNumber(after.bookingIntervalMinutes);
      return known(
        minutes === null
          ? "changed the booking interval"
          : `changed the booking interval to ${intervalLength(minutes)}`,
      );
    }
    case "undo":
      return known(`undid a change to ${possessive(provider)} hours`);
    default:
      return { sentence: `${row.action} (${row.entity})`, technical: true };
  }
}

function patientSentence(row: Readonly<ActivityRow>): ActionDescription {
  const patient = patientOf(row);
  switch (row.action) {
    case "create":
      return { sentence: `added ${patient} as a patient`, technical: false };
    case "update":
      return { sentence: `updated ${possessive(patient)} details`, technical: false };
    case "set_archived": {
      const archived = asJsonString(objectOf(row.after).archived_at) !== null;
      return { sentence: `${archived ? "archived" : "restored"} ${patient}`, technical: false };
    }
    case "link_request":
      return { sentence: `linked a request to ${patient}`, technical: false };
    case "unlink_request":
      return { sentence: `unlinked a request from ${patient}`, technical: false };
    default:
      return { sentence: `${row.action} (patient)`, technical: true };
  }
}

function auditSentence(row: Readonly<ActivityRow>, now: Date): ActionDescription {
  if (row.action === "auth.sign_in") return { sentence: "signed in", technical: false };
  const subject = row.entityId ?? "";
  return describeAction(
    {
      id: row.id,
      actor_email: row.actorEmail,
      action: row.action,
      entity: row.entity,
      entity_id: row.entityId,
      detail: row.detail ?? {},
      at: row.occurredAt,
    },
    row.detail ?? {},
    {
      namesByProfileId:
        row.subjectStaffName === null ? new Map() : new Map([[subject, row.subjectStaffName]]),
      recipientsById:
        row.recipientEmail === null ? new Map() : new Map([[subject, row.recipientEmail]]),
      now,
    },
  );
}

/**
 * The row's sentence, read after `activityActor(row)`. `technical` is true only for a row the
 * log has no words for, which the database already leaves out; a page that meets one shows it
 * in the Technical record instead.
 */
export function phraseActivityRow(row: Readonly<ActivityRow>, now: Date): ActionDescription {
  if (row.source === "scheduling") {
    return row.appointmentAction === null
      ? scheduleSentence(row)
      : { sentence: appointmentSentence(row, row.appointmentAction), technical: false };
  }
  if (row.source === "patient") return patientSentence(row);
  return auditSentence(row, now);
}

/** Who did it: the staff member's display name, else the email the row recorded. */
export function activityActor(row: Readonly<ActivityRow>): string {
  return row.actorName !== null && row.actorName !== "" ? row.actorName : row.actorEmail;
}

// ---- The row's frame: its day band, its time, and what opens beneath it ----

const NY_DATE_KEY = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: PRACTICE_TZ,
});

const NY_LONG_DAY = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: PRACTICE_TZ,
});

/** The practice-local day an instant falls on, YYYY-MM-DD. */
export function activityDay(iso: string): string {
  return NY_DATE_KEY.format(new Date(iso));
}

/** A day band: "Today · Wednesday, September 16", "Yesterday · …", or the day alone. */
export function activityDayBand(iso: string, now: Date): string {
  const day = activityDay(iso);
  const long = NY_LONG_DAY.format(new Date(iso));
  const today = NY_DATE_KEY.format(now);
  const yesterday = NY_DATE_KEY.format(new Date(now.getTime() - 86_400_000));
  if (day === today) return `Today · ${long}`;
  if (day === yesterday) return `Yesterday · ${long}`;
  return long;
}

/** The row's time, "2:04 PM", practice-local. */
export function activityTimeLabel(iso: string): string {
  return NY_TIME.format(new Date(iso));
}

/** Two letters for the actor's avatar: the first and last word's initials. */
export function activityInitials(name: string): string {
  const words = name
    .replace(/@.*$/, "")
    .split(/[\s._-]+/)
    .filter((word) => word !== "" && !/^dr\.?$/i.test(word));
  const first = words.at(0)?.at(0) ?? "";
  const last = words.length > 1 ? (words.at(-1)?.at(0) ?? "") : "";
  return `${first}${last}`.toUpperCase() || "?";
}

/** The expanded row's line about the change itself: who, when, and how it was made. */
export function activityMeta(row: Readonly<ActivityRow>): string {
  const how =
    row.via === "undo" ? " · Undid an earlier change" : row.via === "system" ? " · Automatic" : "";
  return `${activityActor(row)} · ${activitySlotLabel(row.occurredAt)}${how}`;
}

const APPOINTMENT_STATUS_LABELS = [
  ["scheduled", "Scheduled"],
  ["checked_in", "Checked in"],
  ["completed", "Completed"],
  ["no_show", "No-show"],
  ["cancelled", "Cancelled"],
] as const;

/** What a row changed, as two short lines: how it stood before and after. */
export interface ActivityChange {
  readonly before: string;
  readonly after: string;
}

function appointmentState(record: JsonObject, provider: string | null): string {
  const startsAt = asJsonString(record.starts_at);
  if (startsAt === null) return "No appointment";
  const status = asJsonString(record.status) ?? "scheduled";
  const withWhom = provider === null ? "" : ` with ${provider}`;
  const state =
    status === "scheduled"
      ? ""
      : ` · ${APPOINTMENT_STATUS_LABELS.find(([key]) => key === status)?.[1] ?? status}`;
  return `${activitySlotLabel(startsAt)}${withWhom}${state}`;
}

const PATIENT_FIELDS = [
  ["name", "Name"],
  ["date_of_birth", "Date of birth"],
  ["phone", "Phone"],
  ["email", "Email"],
] as const;

function patientFieldValue(record: JsonObject, field: string): string {
  const value = asJsonString(record[field]);
  if (value === null || value === "") return "none";
  return field === "date_of_birth" ? calendarDayLabel(value) : value;
}

/**
 * Before and after for the rows whose change reads as a state: an appointment's time, provider
 * and status; a patient's changed details or archive; a request's status. Null for the rest,
 * whose sentence already says everything the change holds.
 */
export function activityChange(row: Readonly<ActivityRow>): ActivityChange | null {
  if (row.source === "scheduling" && row.appointmentAction !== null) {
    const before = asJsonObject(row.before ?? null);
    const after = asJsonObject(row.after ?? null);
    return {
      before:
        before === null
          ? "No appointment"
          : appointmentState(before, row.priorProviderName ?? row.providerName),
      after: after === null ? "No appointment" : appointmentState(after, row.providerName),
    };
  }
  if (row.source === "patient") {
    const before = objectOf(row.before);
    const after = objectOf(row.after);
    if (row.action === "set_archived") {
      const state = (record: JsonObject) =>
        asJsonString(record.archived_at) === null ? "Active" : "Archived";
      return { before: state(before), after: state(after) };
    }
    if (row.action !== "update") return null;
    const changed = PATIENT_FIELDS.filter(
      ([field]) => patientFieldValue(before, field) !== patientFieldValue(after, field),
    );
    if (changed.length === 0) return null;
    const read = (record: JsonObject) =>
      changed.map(([field, label]) => `${label} ${patientFieldValue(record, field)}`).join(" · ");
    return { before: read(before), after: read(after) };
  }
  if (row.action === "request.status_change" && row.detail !== null) {
    const label = (raw: string | null): string | null => {
      if (raw === null) return null;
      const status = parseRequestStatus(raw);
      return status === null ? raw : STATUS_LABELS[status];
    };
    const from = label(asJsonString(row.detail.from));
    const to = label(asJsonString(row.detail.to));
    return from === null || to === null ? null : { before: from, after: to };
  }
  return null;
}

// ---- The Technical record's address ----

/** The Technical record's results summary, which paging moves focus to. */
export const TECHNICAL_RECORD_SUMMARY_ID = "audit-page-summary";

/** `/admin/audit?…&page=N#audit-page-summary`, keeping the log's filters. */
export function technicalRecordHref(baseHref: string, page: number): string {
  const [path = "/admin/audit", query = ""] = baseHref.split("?");
  const params = new URLSearchParams(query);
  params.delete("page");
  if (page > 1) params.set("page", String(page));
  const search = params.toString().replaceAll("%2C", ",");
  return `${path}${search === "" ? "" : `?${search}`}#${TECHNICAL_RECORD_SUMMARY_ID}`;
}
