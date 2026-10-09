import type { SchedulingFailureCode } from "@/lib/portal/scheduling/contracts";
import type { MonthAvailability } from "@/lib/portal/scheduling/read-contracts";

import { dayIsOpen, dayOf } from "./card-booking-days";
import type { TakenTime } from "./card-booking-days";
import { readoutDay } from "./record-card-model";
import { clockLabel, timeWithinDay } from "./record-card-time";

/* Booking from the record card (issue #344; Figma Ypf9ohpRcGWF5C9T9bSvWW,
   sections 09d–09f). A request linked to a patient books straight into the
   schedule: the month read marks every day that still has an open start,
   a day's popover lists those starts per provider, and Book sends the
   scheduling `book` command with the request it came from. The read is
   the truth the discs were drawn from — its type version, its today, its
   past days — and the server re-checks every start. Days are
   practice-local YYYY-MM-DD, months YYYY-MM, times HH:MM. */

export interface CardType {
  readonly id: string;
  readonly name: string;
}

/** The type a booking starts on: the practice's new-patient visit when it
   has one by name, otherwise the first active type. */
export function defaultTypeId(types: readonly CardType[]): string | null {
  const named = types.find((type) => /new[\s-]*patient/iu.test(type.name));
  return named?.id ?? types.at(0)?.id ?? null;
}

/* ---- Months ---- */

export function monthOf(day: string): string {
  return day.slice(0, 7);
}

export function addMonths(month: string, count: number): string {
  const index = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + count;
  return `${String(Math.floor(index / 12))}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** Whether a read month has no open start on any day staff could still book. */
export function monthHasNoOpen(availability: Readonly<MonthAvailability>): boolean {
  return availability.days.every((day) => day.past || day.open === 0);
}

/* ---- The booking draft ---- */

export interface BookingDraft {
  readonly month: string;
  /** Staff's pick of visit type; null leaves the read's default. */
  readonly typeId: string | null;
  readonly day: string;
  readonly providerId: string;
  readonly locationId: string;
  readonly time: string;
  /** "Enter a time…" opened the provider and time row. */
  readonly squeeze: boolean;
  /** A start that went to someone else between the read and Book. */
  readonly taken: TakenTime | null;
}

export function initialBooking(today: string): BookingDraft {
  return {
    month: monthOf(today),
    typeId: null,
    day: "",
    providerId: "",
    locationId: "",
    time: "",
    squeeze: false,
    taken: null,
  };
}

export type BookingEvent =
  | {
      readonly type: "open";
      readonly day: string;
      readonly providerId: string;
      readonly locationId: string;
      readonly time: string;
    }
  | { readonly type: "day"; readonly day: string }
  | { readonly type: "squeeze"; readonly day: string }
  | { readonly type: "squeezeProvider"; readonly providerId: string; readonly locationId: string }
  | { readonly type: "squeezeTime"; readonly time: string }
  | { readonly type: "month"; readonly month: string }
  | { readonly type: "typeId"; readonly typeId: string }
  | { readonly type: "taken" };

export function bookingReducer(
  draft: Readonly<BookingDraft>,
  event: Readonly<BookingEvent>,
): BookingDraft {
  switch (event.type) {
    case "open":
      /* A start chosen from a day's popover: the squeeze-in row folds away. */
      return {
        ...draft,
        day: event.day,
        providerId: event.providerId,
        locationId: event.locationId,
        time: event.time,
        squeeze: false,
        taken: null,
      };
    case "day":
      if (event.day === draft.day) return draft;
      /* A squeeze-in keeps its provider and time for the new day; an open
         start belonged to the old one. */
      return draft.squeeze
        ? { ...draft, day: event.day, taken: null }
        : { ...draft, day: event.day, providerId: "", locationId: "", time: "", taken: null };
    case "squeeze":
      /* Entering a time keeps a time already being entered; a start picked
         from the popover goes. */
      return draft.squeeze
        ? { ...draft, day: event.day, taken: null }
        : {
            ...draft,
            day: event.day,
            squeeze: true,
            providerId: "",
            locationId: "",
            time: "",
            taken: null,
          };
    case "squeezeProvider":
      return { ...draft, providerId: event.providerId, locationId: event.locationId };
    case "squeezeTime":
      return { ...draft, time: event.time };
    case "month":
      return { ...draft, month: event.month };
    case "typeId":
      if (event.typeId === draft.typeId) return draft;
      /* A different visit length opens different starts: a picked start
         goes, the day and a squeeze-in stay. */
      return draft.squeeze
        ? { ...draft, typeId: event.typeId, taken: null }
        : { ...draft, typeId: event.typeId, providerId: "", locationId: "", time: "", taken: null };
    case "taken":
      if (draft.day === "" || draft.time === "") return draft;
      return {
        ...draft,
        taken: {
          day: draft.day,
          providerId: draft.providerId,
          locationId: draft.locationId,
          time: draft.time,
        },
        time: "",
        squeeze: false,
      };
    default:
      return draft;
  }
}

/* ---- What Book sends ---- */

export interface CardBookCommand {
  /** Null books the requester, whom the server registers from the request. */
  readonly patientId: string | null;
  readonly providerId: string;
  readonly locationId: string;
  readonly appointmentTypeId: string;
  readonly expectedTypeVersion: number;
  readonly start: { readonly date: string; readonly time: string };
  /** Null books a patient another visit, with no request behind it. */
  readonly sourceRequestId: string | null;
  readonly requestVersion: number | null;
}

/** Who Book is for: a patient, a request's requester, or both. */
export interface BookingSubject {
  readonly patientId: string | null;
  /** The request the booking answers; null for a patient's next visit. */
  readonly request: { readonly id: string; readonly version: number } | null;
}

/** The `book` command a complete draft means, or null while Book waits. */
export function bookCommandFor(
  draft: Readonly<BookingDraft>,
  availability: Readonly<MonthAvailability> | null,
  subject: Readonly<BookingSubject>,
): CardBookCommand | null {
  if (
    availability === null ||
    draft.typeId === null ||
    availability.appointmentType.id !== draft.typeId ||
    draft.day === "" ||
    draft.day < availability.today ||
    draft.providerId === "" ||
    draft.locationId === "" ||
    !timeWithinDay(draft.time) ||
    (subject.patientId === null && subject.request === null)
  )
    return null;
  return {
    patientId: subject.patientId,
    providerId: draft.providerId,
    locationId: draft.locationId,
    appointmentTypeId: draft.typeId,
    expectedTypeVersion: availability.appointmentType.version,
    start: { date: draft.day, time: draft.time },
    sourceRequestId: subject.request?.id ?? null,
    requestVersion: subject.request?.version ?? null,
  };
}

/** A refusal that means the start itself went: re-read and offer the
   nearest. */
export function startWasTaken(code: SchedulingFailureCode): boolean {
  return code === "time_unavailable" || code === "provider_conflict";
}

/** Why the server refused a Book that sending again would not change: the
   strip's value, its detail, and whether reloading the card can help. */
export interface BookRefusal {
  readonly value: string;
  readonly detail: string;
  readonly reload: boolean;
}

const REFUSALS = new Map<SchedulingFailureCode, BookRefusal>([
  ["request_stale_version", refusal("Request changed", "Someone else just changed this request.")],
  ["request_version_required", refusal("Request changed", "Reload the request to book it.")],
  ["request_already_booked", refusal("Already booked", "Someone else just booked this request.")],
  [
    "request_link_conflict",
    refusal("Linked elsewhere", "This request is now linked to a different patient."),
  ],
  ["request_not_actionable", refusal("Can't be booked", "This request is no longer open.")],
  ["type_changed", refusal("Visit type changed", "The visit type just changed.")],
  ["type_unavailable", refusal("Visit type retired", "That visit type can't be booked now.")],
  ["appointment_in_past", refusal("Time has passed", "That time has already passed.")],
  [
    "patient_conflict",
    refusal("Patient already booked", "This patient has an appointment at that time.", false),
  ],
  ["patient_archived", refusal("Patient archived", "That patient's record is archived.", false)],
  ["patient_not_found", refusal("Patient not found", "That patient's record is gone.", false)],
  ["provider_not_bookable", refusal("Can't book", "That provider is off booking in Settings.")],
  ["provider_not_eligible", refusal("Can't book", "That provider doesn't see this visit type.")],
  ["provider_unavailable", refusal("Can't book", "That provider is no longer on the schedule.")],
  ["location_closed", refusal("Can't book", "The office is closed that day.")],
  ["location_unavailable", refusal("Can't book", "That office is no longer on the schedule.")],
  ["outside_office_hours", refusal("Can't book", "That time is outside office hours.")],
  ["forbidden", refusal("Can't book", "Your role can't book appointments.", false)],
]);

function refusal(value: string, detail: string, reload = true): BookRefusal {
  return { value, detail, reload };
}

/** The refusal a code means, or null when Try again can still land it:
   the server was unreachable or failed before it decided. */
export function bookRefusal(code: SchedulingFailureCode): BookRefusal | null {
  return REFUSALS.get(code) ?? null;
}

/* ---- The strip's readout ---- */

export interface BookingReadout {
  readonly value: string;
  readonly detail: string;
}

function providerName(availability: Readonly<MonthAvailability>, providerId: string): string {
  return availability.providers.find((provider) => provider.id === providerId)?.name ?? "";
}

function locationName(availability: Readonly<MonthAvailability>, locationId: string): string {
  return availability.locations.find((location) => location.id === locationId)?.name ?? "";
}

/** "Tue, Sep 22 · 10:30 AM" over "Yanessa Ricardo, APRN · Lutz", or null
   while the strip still reads Choose a time. */
export function bookingReadout(
  draft: Readonly<BookingDraft>,
  availability: Readonly<MonthAvailability> | null,
): BookingReadout | null {
  if (availability === null || draft.day === "" || !timeWithinDay(draft.time)) return null;
  if (draft.providerId === "" || draft.locationId === "") return null;
  return {
    value: `${readoutDay(draft.day)} · ${clockLabel(draft.time)}`,
    detail: [
      providerName(availability, draft.providerId),
      locationName(availability, draft.locationId),
    ]
      .filter((part) => part !== "")
      .join(" · "),
  };
}

/* ---- The strip's right: what Book sends, or why it waits ---- */

export type StripAction = "retry-read" | "next-month" | "retry-book" | "reload";

export interface BookingStripLine {
  readonly label: string;
  readonly value: string;
  readonly detail: string | null;
  /** `muted` while Book waits, `failed` in the coral ink. */
  readonly tone: "strong" | "muted" | "failed";
  readonly action: StripAction | null;
}

function waiting(value: string, label = "Appointment", action: StripAction | null = null) {
  return { label, value, detail: null, tone: "muted" as const, action };
}

/** The strip's readout in booking mode (Figma 09d–09e): a refused or
   failed Book first, then a failed read, then the pick Book sends, then what the
   month or the day still asks of staff. */
export function bookingStripLine(
  input: Readonly<{
    draft: BookingDraft;
    availability: MonthAvailability | null;
    /** The month's read, else the latest read of the type: what a
       squeeze-in's provider and office are named from. */
    roster: MonthAvailability | null;
    status: "loading" | "ready" | "failed";
    bookFailed: boolean;
    /** A Book the server refused for good. */
    refusal: BookRefusal | null;
  }>,
): BookingStripLine {
  const { draft, availability, status } = input;
  if (input.refusal !== null)
    return {
      label: "Appointment",
      value: input.refusal.value,
      detail: input.refusal.detail,
      tone: "failed",
      action: input.refusal.reload ? "reload" : null,
    };
  if (input.bookFailed)
    return {
      label: "Appointment",
      value: "Couldn't book",
      detail: null,
      tone: "failed",
      action: "retry-book",
    };
  const readout = bookingReadout(draft, input.roster);
  if (readout !== null) return { label: "Appointment", ...readout, tone: "strong", action: null };
  if (status === "failed" && availability === null)
    return waiting("Couldn't load open times", "Appointment", "retry-read");
  if (availability === null) return waiting("Finding open times…");
  if (draft.day === "")
    return monthHasNoOpen(availability)
      ? waiting("No open times this month", "Appointment", "next-month")
      : waiting("Choose a time");
  if (draft.squeeze) return waiting(`${readoutDay(draft.day)} · Enter a time`);
  const day = dayOf(availability, draft.day);
  return dayIsOpen(day)
    ? waiting(`${readoutDay(draft.day)} · Choose a time`)
    : waiting(`${readoutDay(draft.day)} · Enter a time`, "No open times");
}
