import type { SchedulingFailureCode, SchedulingInput } from "@/lib/portal/scheduling/contracts";

import { addDays, practiceDate, practiceMinute } from "./week-calendar";

/* The week view's two click cards (issue #345; Figma section 08, H3 and
   H4): the appointment card, which reads one appointment and offers the
   commands its status allows, and the open-time card, which books a
   patient into one open start. Pure and client-safe; the server actions in
   week-actions.ts carry these shapes, and the scheduling service re-checks
   every command against the database's own clock. */

type AppointmentCommand = Extract<SchedulingInput, { action: "command" }>["command"];

/** What the appointment card can send: every command but booking and undo. */
export type WeekAppointmentCommand = Exclude<AppointmentCommand, { kind: "book" | "undo" }>;

/** A booking from an open time. It never comes from a request, so the
   server action fills those two in as null. */
export type WeekBookCommand = Omit<
  Extract<AppointmentCommand, { kind: "book" }>,
  "kind" | "requestVersion" | "sourceRequestId"
>;

export type WeekAppointmentStatus =
  | "scheduled"
  | "checked_in"
  | "completed"
  | "no_show"
  | "cancelled";

export interface WeekAppointmentDetail {
  readonly observedAt: string;
  readonly id: string;
  readonly version: number;
  readonly patientId: string;
  readonly providerId: string;
  readonly locationId: string;
  readonly appointmentTypeId: string;
  /** The request it was booked from; the full-record sheet opens on it. */
  readonly sourceRequestId: string | null;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly status: WeekAppointmentStatus;
  readonly patientName: string;
  readonly providerName: string;
  readonly locationName: string;
  readonly appointmentTypeName: string;
  readonly patientPhone: string | null;
  /** Set while the request workflow manages the appointment: a reschedule
     or cancel then moves the request with it. */
  readonly requestVersion: number | null;
}

export interface WeekPatient {
  readonly id: string;
  readonly name: string;
  readonly dateOfBirth: string | null;
}

export interface WeekRescheduleTimes {
  readonly date: string;
  readonly slots: readonly { readonly startsAt: string; readonly time: string }[];
}

/* ---- What the card offers ---- */

export type MoreCommand = "cancel" | "no_show" | "complete";

export interface CardActions {
  /** Details and Open full record only. */
  readonly readOnly: boolean;
  readonly checkIn: boolean;
  readonly reschedule: boolean;
  readonly more: readonly MoreCommand[];
}

const NO_ACTIONS: CardActions = { readOnly: true, checkIn: false, reschedule: false, more: [] };

/** The commands an appointment's status allows at the read's clock. A
   finished appointment, or one on a day already gone, opens read-only. */
export function cardActions(detail: Readonly<WeekAppointmentDetail>): CardActions {
  const day = practiceDate(new Date(detail.startsAt));
  const today = practiceDate(new Date(detail.observedAt));
  const started = Date.parse(detail.startsAt) <= Date.parse(detail.observedAt);
  if (day < today) return NO_ACTIONS;
  if (detail.status === "scheduled") {
    return {
      readOnly: false,
      checkIn: day === today,
      reschedule: true,
      more: started ? ["cancel", "no_show"] : ["cancel"],
    };
  }
  if (detail.status === "checked_in") {
    return { readOnly: false, checkIn: false, reschedule: false, more: ["complete", "cancel"] };
  }
  return NO_ACTIONS;
}

export const MORE_LABEL = {
  cancel: "Cancel appointment…",
  no_show: "Mark no-show",
  complete: "Mark complete",
} as const satisfies Record<MoreCommand, string>;

export interface StatusBadge {
  readonly label: string;
  readonly variant: "attention" | "current" | "settled" | "quiet";
}

/* Scheduled wears Home's scheduled paint (the .wgi-badge paints in
   home.css), so a booking looks the same on both; a patient who is here is
   current, and a visit that is over recedes. */
const STATUS_BADGE = {
  scheduled: { label: "Scheduled", variant: "settled" },
  checked_in: { label: "Checked in", variant: "current" },
  completed: { label: "Completed", variant: "quiet" },
  no_show: { label: "No-show", variant: "attention" },
  cancelled: { label: "Cancelled", variant: "quiet" },
} as const satisfies Record<WeekAppointmentStatus, StatusBadge>;

export function statusBadge(status: WeekAppointmentStatus): StatusBadge {
  return STATUS_BADGE[status];
}

/* ---- Cancel ---- */

/** A request-managed cancel sets when to call the patient again: the next
   weekday after today, which staff can change. */
export function nextCallAgainDay(today: string): string {
  let day = addDays(today, 1);
  while ([0, 6].includes(new Date(`${day}T12:00:00Z`).getUTCDay())) day = addDays(day, 1);
  return day;
}

/* ---- Times ---- */

/** The practice-local "HH:MM" a command's start carries. */
export function startClock(startsAt: string): string {
  const minute = practiceMinute(startsAt);
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

/* ---- Failures ---- */

const FAILURE_COPY = new Map<SchedulingFailureCode, string>([
  [
    "stale_version",
    "Someone else just changed this appointment. Close the card and open it again.",
  ],
  [
    "request_stale_version",
    "The request behind this appointment just changed. Close the card and open it again.",
  ],
  ["time_unavailable", "That time was just taken. Pick another."],
  ["provider_conflict", "The provider was just booked at that time. Pick another."],
  ["patient_conflict", "This patient already has an appointment at that time."],
  ["appointment_in_past", "That time has already passed."],
  ["illegal_transition", "This appointment's status changed, so that action no longer applies."],
  ["request_follow_up_required", "Choose a day to call the patient again."],
  ["patient_archived", "That patient's record is archived."],
  ["patient_not_found", "That patient's record is gone."],
  ["type_changed", "The visit type just changed. Close the card and try again."],
  ["not_found", "This appointment is no longer on the schedule."],
  ["forbidden", "Your role can't make that change."],
  ["undo_unavailable", "That can no longer be undone: it changed again or 15 minutes passed."],
]);

export function failureMessage(code: SchedulingFailureCode): string {
  return FAILURE_COPY.get(code) ?? "The schedule couldn't save that. Try again.";
}
