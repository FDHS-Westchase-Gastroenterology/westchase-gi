import type { DayProvider, DaySchedule } from "@/lib/portal/scheduling/grid-contracts";

import { countFor, listJoin } from "./schedule-week-model";
import type { WeekAppointmentCell, WeekCount, WeekOpenCell } from "./schedule-week-model";
import {
  addDays,
  appointmentAt,
  dayHref,
  dayTitle,
  parseDay,
  practiceTime,
  timeRange,
  weekHref,
  weekStartOf,
} from "./week-calendar";
import { hourBounds, hourLabel, openUntil, place, shadesFor } from "./week-hours";
import type { WeekSpan } from "./week-hours";

/* The Schedule's day view (issue #351; Figma Ypf9ohpRcGWF5C9T9bSvWW, page
   02, S5), built from one day read so SSR and hydration read the same
   strings. One column per provider working the date, in name order, on the
   week view's practice-local minutes. A block's tone comes from its status;
   only the now line and the Check in window move with the clock. */

type DayAppointment = DayProvider["appointments"][number];
type AppointmentStatus = DayAppointment["status"];

/** How a block is painted: booked (scheduled), here (checked in), done (completed) or missed. */
export type DayTone = "booked" | "here" | "done" | "missed";

const TONE = {
  scheduled: "booked",
  checked_in: "here",
  completed: "done",
  no_show: "missed",
} as const satisfies Record<AppointmentStatus, DayTone>;

const TAG = {
  scheduled: null,
  checked_in: "Checked in",
  completed: "Done",
  no_show: "No-show",
} as const satisfies Record<AppointmentStatus, string | null>;

/** Check in is offered from an hour before the visit until it ends. */
const CHECK_IN_LEAD_MS = 3_600_000;

export interface DayAppointmentCell extends WeekAppointmentCell {
  readonly version: number;
  readonly providerName: string;
  /** A scheduled visit that has not started can be dragged to another time. */
  readonly movable: boolean;
  readonly tone: DayTone;
  /** The status word on the block: "Checked in", "Done", "No-show", or none. */
  readonly tag: string | null;
  /** "8:00 – 9:00 AM · Follow-up". */
  readonly line: string;
  readonly startsAt: string;
  readonly endsAt: string;
  /** When Check in shows, in epoch milliseconds; null once it cannot. */
  readonly checkIn: { readonly from: number; readonly until: number } | null;
  /** "Wed, Sep 16 at 2:00 PM · Dr. John Chang, Tampa": a toast's second line. */
  readonly detail: string;
}

export interface DayOpenCell extends WeekOpenCell {
  /** "1 hour open". */
  readonly length: string;
  /** "Wed, Sep 16 at 2:00 PM · Dr. John Chang, Tampa": the booked toast's second line. */
  readonly detail: string;
}

export type DayCell = DayAppointmentCell | DayOpenCell;

export interface DayColumn {
  readonly providerId: string;
  readonly name: string;
  /** "Tampa", or "Tampa and Lutz" when the provider works both. */
  readonly place: string;
  readonly count: WeekCount | null;
  readonly shades: readonly WeekSpan[];
  /** Where the provider works when: a drop takes the office of the window it lands in. */
  readonly working: DayProvider["working"];
  readonly label: string;
}

export interface ScheduleDay {
  readonly date: string;
  readonly today: string;
  readonly observedAt: string;
  readonly isToday: boolean;
  /** "Wed, September 16". */
  readonly title: string;
  readonly previous: string | null;
  readonly next: string | null;
  readonly todayHref: string;
  readonly weekHref: string;
  readonly monthHref: string;
  readonly start: number;
  readonly end: number;
  readonly hours: readonly { readonly minute: number; readonly label: string }[];
  readonly columns: readonly DayColumn[];
  /** Sorted by top, then column, so each column reads top to bottom. */
  readonly cells: readonly DayCell[];
  /** "Dr. Alfredo Mendoza is not scheduled today", or null when everyone works. */
  readonly offLine: string | null;
  readonly activeProviderCount: number;
}

/** "30 min open", "1 hour open", "2 hours open", "1 hour 30 min open". */
export function openLength(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  if (rest > 0 || hours === 0) parts.push(`${rest} min`);
  return `${parts.join(" ")} open`;
}

function statusSentence(status: AppointmentStatus): string {
  const tag = TAG[status];
  return tag === null ? "" : `, ${tag.toLowerCase()}`;
}

/** The office a visit is at: the working window it starts in, else the provider's first. */
function placeAt(provider: Readonly<DayProvider>, startsAt: string): string {
  const at = Date.parse(startsAt);
  const window =
    provider.working.find(
      (range) => Date.parse(range.from) <= at && at < Date.parse(range.until),
    ) ?? provider.working.at(0);
  return window?.locationName ?? "";
}

function minutesOf(startsAt: string, endsAt: string): number {
  return Math.round((Date.parse(endsAt) - Date.parse(startsAt)) / 60_000);
}

function countSentence(count: WeekCount | null): string {
  if (count === null) return "";
  return count.value === null ? `, ${count.word.toLowerCase()}` : `, ${count.value} ${count.word}`;
}

function offLineFor(names: readonly string[], isToday: boolean): string | null {
  if (names.length === 0) return null;
  const verb = names.length === 1 ? "is" : "are";
  return `${listJoin(names)} ${verb} not scheduled ${isToday ? "today" : "this day"}`;
}

function sibling(date: string, by: number): string | null {
  const day = parseDay(addDays(date, by));
  return day === null ? null : dayHref(day);
}

export function scheduleDayFor(schedule: Readonly<DaySchedule>): ScheduleDay {
  const { date, today, observedAt } = schedule;
  const isToday = date === today;
  const { start, end } = hourBounds(schedule.providers);

  const hours: { minute: number; label: string }[] = [];
  for (let minute = start; minute <= end; minute += 60)
    hours.push({ minute: minute - start, label: hourLabel(minute) });

  const columns = schedule.providers.map((provider): DayColumn => {
    const places = [...new Set(provider.working.map((range) => range.locationName))];
    const count = countFor([provider]);
    const place = listJoin(places);
    return {
      providerId: provider.id,
      name: provider.name,
      place,
      count,
      shades: shadesFor(provider, start, end),
      working: provider.working,
      label: `${provider.name}${place === "" ? "" : `, ${place}`}${countSentence(count)}`,
    };
  });

  const cells: DayCell[] = [];
  schedule.providers.forEach((provider, lane) => {
    for (const appointment of provider.appointments) {
      const from = practiceTime(appointment.startsAt);
      const until = practiceTime(appointment.endsAt);
      const range = timeRange(appointment.startsAt, appointment.endsAt);
      const where = placeAt(provider, appointment.startsAt);
      cells.push({
        kind: "appointment",
        id: appointment.id,
        version: appointment.version,
        ...place(appointment.startsAt, appointment.endsAt, start, end),
        lane,
        providerId: provider.id,
        providerName: provider.name,
        movable:
          appointment.status === "scheduled" &&
          Date.parse(appointment.startsAt) > Date.parse(observedAt),
        state: appointment.status === "checked_in" ? "here" : "upcoming",
        tone: TONE[appointment.status],
        tag: TAG[appointment.status],
        name: appointment.patientName,
        type: appointment.appointmentType,
        icon: appointment.appointmentTypeIcon,
        status: TAG[appointment.status],
        short: minutesOf(appointment.startsAt, appointment.endsAt) <= 30,
        line: `${range} · ${appointment.appointmentType}`,
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt,
        checkIn:
          appointment.status === "scheduled"
            ? {
                from: Date.parse(appointment.startsAt) - CHECK_IN_LEAD_MS,
                until: Date.parse(appointment.endsAt),
              }
            : null,
        detail: `${appointmentAt(appointment.startsAt)} · ${provider.name}${where === "" ? "" : `, ${where}`}`,
        label: `${appointment.patientName}, ${appointment.appointmentType.toLowerCase()}, ${from} to ${until}${statusSentence(appointment.status)}, ${provider.name}`,
        tooltip: [appointment.patientName, `${range} · ${appointment.appointmentType}`],
      });
    }
    for (const open of provider.open) {
      const time = practiceTime(open.startsAt);
      const until = openUntil(open, provider);
      const length = openLength(minutesOf(open.startsAt, until));
      cells.push({
        kind: "open",
        key: `${provider.id}:${open.startsAt}`,
        ...place(open.startsAt, until, start, end),
        lane,
        providerId: provider.id,
        providerName: provider.name,
        startsAt: open.startsAt,
        endsAt: open.endsAt,
        date,
        time,
        length,
        locationId: open.locationId,
        locationName: open.locationName,
        type: open.type,
        detail: `${appointmentAt(open.startsAt)} · ${provider.name}, ${open.locationName}`,
        label: `Open, ${time}, ${length.replace(/ open$/u, "")}, ${provider.name}`,
      });
    }
  });
  cells.sort((a, b) => a.top - b.top || a.lane - b.lane);

  return {
    date,
    today,
    observedAt,
    isToday,
    title: dayTitle(date),
    previous: sibling(date, -1),
    next: sibling(date, 1),
    todayHref: dayHref(null),
    weekHref: weekHref(weekStartOf(date), []),
    monthHref: `/admin/schedule?month=${date.slice(0, 7)}`,
    start,
    end,
    hours,
    columns,
    cells,
    offLine: offLineFor(
      schedule.off.map((provider) => provider.name),
      isToday,
    ),
    activeProviderCount: schedule.activeProviderCount,
  };
}
