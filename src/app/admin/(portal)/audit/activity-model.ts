/* The Activity log's sentences (issue #357): one plain sentence per row, read after the actor's
   name ("Maria Lopez moved Dana Walsh to Thu, Sep 17 at 2:00 PM with Dr. Awad"). Audit rows are
   phrased by recent-work-model's describeAction, so every sentence the log already wrote reads
   the same. Browser-safe: the page and its rows both import it. */

import { asJsonArray, asJsonBoolean, asJsonObject, asJsonString } from "@/lib/json";
import type { Json, JsonObject } from "@/lib/json";
import type { ActivityRow, AppointmentAction } from "@/lib/portal/activity-contracts";

import { describeAction } from "./recent-work-model";
import type { ActionDescription } from "./recent-work-model";

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
  return (asJsonArray(after[list]) ?? [])
    .filter((item) => !had.has(key(item)))
    .map((item) => objectOf(item));
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
      namesByEmail: new Map(),
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
