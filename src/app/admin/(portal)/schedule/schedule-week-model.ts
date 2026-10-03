import type { WeekDay, WeekSchedule } from "@/lib/portal/scheduling/grid-contracts";

import {
  addDays,
  initialsOf,
  monthOfWeek,
  noon,
  practiceTime,
  shiftWeek,
  surnameOf,
  timeRange,
  weekHref,
  weekRange,
} from "./week-calendar";
import { hourBounds, hourLabel, place, shadesFor } from "./week-hours";
import type { WeekSpan } from "./week-hours";

/* The Schedule's week view (issue #345; Figma Ypf9ohpRcGWF5C9T9bSvWW,
   section 08, W1–W2), built from one week read so SSR and hydration read
   the same strings. Every position is a practice-local minute of the day,
   read through Intl in America/New_York, so a week that crosses a clock
   change still lines up with its hours. A cell's state comes from the
   read's `observedAt`, never the browser's clock; only the now line moves
   with the clock. */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const DAY_HEADING = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});
/** A cell this short or shorter carries its status in place of its type. */
const SHORT_MINUTES = 30;

type AppointmentStatus = WeekDay["appointments"][number]["status"];

const STATUS_WORD = {
  scheduled: "Scheduled",
  checked_in: "Checked in",
  completed: "Completed",
  no_show: "No-show",
} as const satisfies Record<AppointmentStatus, string>;

export type WeekCellState = "past" | "upcoming" | "here";

interface Placed {
  /** Minutes from the top of the grid. */
  readonly top: number;
  readonly height: number;
  /** The provider's lane, in the order they were chosen. */
  readonly lane: number;
  readonly providerId: string;
  readonly label: string;
}

export interface WeekAppointmentCell extends Placed {
  readonly kind: "appointment";
  readonly id: string;
  readonly state: WeekCellState;
  readonly name: string;
  readonly type: string;
  /** "Here" or "No-show": the statuses staff act on; null otherwise. */
  readonly status: string | null;
  readonly short: boolean;
  /** Compare mode's two-line tooltip. */
  readonly tooltip: readonly [string, string];
}

export interface WeekOpenCell extends Placed {
  readonly kind: "open";
  readonly key: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly date: string;
  readonly time: string;
  readonly locationId: string;
  readonly locationName: string;
  readonly providerName: string;
  /** The type this time books: the filtered type, or the provider's shortest eligible one. */
  readonly type: WeekSchedule["referenceType"];
}

export type WeekCell = WeekAppointmentCell | WeekOpenCell;

export type { WeekSpan };

export interface WeekLane {
  readonly providerId: string;
  readonly name: string;
  readonly surname: string;
  /** No hours that day: shaded with "Off", and the lane keeps its place. */
  readonly off: boolean;
  readonly offLabel: string;
  /** Non-working time inside the day, such as lunch. */
  readonly shades: readonly WeekSpan[];
}

export interface WeekCount {
  /** The bold number, or null for a word that stands alone ("Full"). */
  readonly value: string | null;
  readonly word: string;
}

interface ColumnBase {
  readonly date: string;
  readonly weekday: string;
  readonly day: number;
  readonly today: boolean;
  readonly label: string;
}

export type WeekColumn =
  | (ColumnBase & { readonly kind: "strip"; readonly hint: string })
  | (ColumnBase & {
      readonly kind: "day";
      readonly count: WeekCount | null;
      readonly lanes: readonly WeekLane[];
      readonly cells: readonly WeekCell[];
    });

export interface WeekProviderChoice {
  readonly id: string;
  readonly name: string;
  readonly surname: string;
  readonly initials: string;
}

export interface ScheduleWeek {
  readonly weekStart: string;
  readonly today: string;
  readonly observedAt: string;
  readonly compare: boolean;
  readonly providers: readonly WeekProviderChoice[];
  readonly title: string;
  readonly subtitle: string | null;
  readonly triggerLabel: string;
  readonly range: string;
  readonly previous: string | null;
  readonly next: string | null;
  readonly todayHref: string;
  readonly monthHref: string;
  readonly start: number;
  readonly end: number;
  readonly hours: readonly { readonly minute: number; readonly label: string }[];
  readonly columns: readonly WeekColumn[];
  readonly activeProviderCount: number;
}

export function providerChoice(provider: Readonly<{ id: string; name: string }>) {
  return {
    id: provider.id,
    name: provider.name,
    surname: surnameOf(provider.name),
    initials: initialsOf(provider.name),
  } satisfies WeekProviderChoice;
}

export function listJoin(names: readonly string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

function surnamesLine(surnames: readonly string[]): string {
  const shown = surnames.slice(0, 2).join(", ");
  return surnames.length > 2 ? `${shown} +${surnames.length - 2}` : shown;
}

function cellState(
  appointment: Readonly<WeekDay["appointments"][number]>,
  observed: number,
): WeekCellState {
  if (appointment.status === "checked_in") return "here";
  if (appointment.status === "scheduled" && Date.parse(appointment.endsAt) > observed)
    return "upcoming";
  return "past";
}

function statusLine(status: AppointmentStatus): string | null {
  if (status === "checked_in") return "Here";
  if (status === "no_show") return "No-show";
  return null;
}

function statusSentence(status: AppointmentStatus, state: WeekCellState): string {
  if (status === "checked_in") return ", here";
  if (status === "no_show") return ", no-show";
  if (status === "completed") return ", completed";
  return state === "past" ? ", past" : "";
}

/** A count line for one or more days: seen once the day is past, else open or Full. */
export function countFor(
  days: readonly Readonly<Pick<WeekDay, "seen" | "openCount">>[],
): WeekCount | null {
  const seen = days.filter((day) => day.seen !== null);
  if (seen.length > 0) {
    const total = seen.reduce((sum, day) => sum + (day.seen ?? 0), 0);
    return total === 0
      ? { value: null, word: "No visits" }
      : { value: String(total), word: "seen" };
  }
  const open = days.filter((day) => day.openCount !== null);
  if (open.length === 0) return null;
  const total = open.reduce((sum, day) => sum + (day.openCount ?? 0), 0);
  return total === 0 ? { value: null, word: "Full" } : { value: String(total), word: "open" };
}

function countSentence(count: WeekCount | null): string {
  if (count === null) return "";
  return count.value === null ? `: ${count.word.toLowerCase()}` : `: ${count.value} ${count.word}`;
}

export function scheduleWeekFor(schedule: Readonly<WeekSchedule>): ScheduleWeek {
  const { weekStart, today, observedAt } = schedule;
  const observed = Date.parse(observedAt);
  const compare = schedule.providers.length > 1;
  const providers = schedule.providers.map((provider) => providerChoice(provider));
  const ids = providers.map((provider) => provider.id);
  const { start, end } = hourBounds(schedule.providers.flatMap((provider) => provider.days));

  const hours: { minute: number; label: string }[] = [];
  for (let minute = start; minute <= end; minute += 60)
    hours.push({ minute: minute - start, label: hourLabel(minute) });

  const columns = Array.from({ length: 7 }, (_, index): WeekColumn => {
    const date = addDays(weekStart, index);
    const weekday = WEEKDAYS[index];
    const weekdayName = WEEKDAY_NAMES[index];
    const days = schedule.providers.map(
      (provider) => provider.days.find((day) => day.date === date) ?? provider.days[index],
    );
    const base = {
      date,
      weekday,
      day: Number(date.slice(8)),
      today: date === today,
    };
    const heading = `${DAY_HEADING.format(noon(date))}${base.today ? ", today" : ""}`;
    const idle = days.every((day) => day.working.length === 0 && day.appointments.length === 0);
    if (idle) {
      const hint = `No hours ${weekdayName}`;
      return { ...base, kind: "strip", hint, label: `${heading}: no hours` };
    }

    const lanes = schedule.providers.map((provider, lane): WeekLane => {
      const day = days[lane];
      const off = day.working.length === 0;
      return {
        providerId: provider.id,
        name: provider.name,
        surname: providers[lane].surname,
        off,
        offLabel: `${provider.name} is off ${weekdayName}`,
        shades: off ? [] : shadesFor(day, start, end),
      };
    });

    const cells: WeekCell[] = [];
    schedule.providers.forEach((provider, lane) => {
      const day = days[lane];
      const who = compare ? `, ${provider.name}` : "";
      for (const appointment of day.appointments) {
        const state = cellState(appointment, observed);
        const minutes = Math.round(
          (Date.parse(appointment.endsAt) - Date.parse(appointment.startsAt)) / 60_000,
        );
        const from = practiceTime(appointment.startsAt);
        const until = practiceTime(appointment.endsAt);
        cells.push({
          kind: "appointment",
          id: appointment.id,
          ...place(appointment.startsAt, appointment.endsAt, start, end),
          lane,
          providerId: provider.id,
          state,
          name: appointment.patientListName,
          type: appointment.appointmentType,
          status: statusLine(appointment.status),
          short: minutes <= SHORT_MINUTES,
          label: `${appointment.patientName}, ${appointment.appointmentType.toLowerCase()}, ${from} to ${until}${statusSentence(appointment.status, state)}${who}`,
          tooltip: [
            `${appointment.patientName} · ${STATUS_WORD[appointment.status]}`,
            `${timeRange(appointment.startsAt, appointment.endsAt)} · ${appointment.appointmentType}`,
          ],
        });
      }
      for (const open of day.open) {
        const minutes = Math.round((Date.parse(open.endsAt) - Date.parse(open.startsAt)) / 60_000);
        const time = practiceTime(open.startsAt);
        cells.push({
          kind: "open",
          key: `${provider.id}:${open.startsAt}`,
          ...place(open.startsAt, open.endsAt, start, end),
          lane,
          providerId: provider.id,
          providerName: provider.name,
          startsAt: open.startsAt,
          endsAt: open.endsAt,
          date,
          time,
          locationId: open.locationId,
          locationName: open.locationName,
          type: open.type,
          label: `Open, ${time}, ${minutes} minutes${who}`,
        });
      }
    });
    cells.sort((a, b) => a.top - b.top || a.lane - b.lane);

    const count = countFor(days);
    const offNote = lanes.reduce(
      (note, lane) => (lane.off ? `${note}. ${lane.offLabel}` : note),
      "",
    );
    return {
      ...base,
      kind: "day",
      count,
      lanes,
      cells,
      label: `${heading}${countSentence(count)}${compare ? offNote : ""}`,
    };
  });

  const names = providers.map((provider) => provider.name);
  return {
    weekStart,
    today,
    observedAt,
    compare,
    providers,
    title: compare ? `${providers.length} providers` : providers[0].name,
    subtitle: compare ? surnamesLine(providers.map((provider) => provider.surname)) : null,
    triggerLabel: compare
      ? `Comparing ${listJoin(names)}, providers, change`
      : `${names[0]} provider, change`,
    range: weekRange(weekStart),
    previous: (() => {
      const week = shiftWeek(weekStart, -1);
      return week === null ? null : weekHref(week, ids);
    })(),
    next: (() => {
      const week = shiftWeek(weekStart, 1);
      return week === null ? null : weekHref(week, ids);
    })(),
    todayHref: weekHref(null, ids),
    monthHref: `/admin/schedule?month=${monthOfWeek(weekStart)}`,
    start,
    end,
    hours,
    columns,
    activeProviderCount: schedule.activeProviderCount,
  };
}
