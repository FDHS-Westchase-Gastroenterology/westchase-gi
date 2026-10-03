import { z } from "zod";

import type { MonthSummary, MonthSummaryDay } from "@/lib/portal/scheduling/read-contracts";

import { dayHref } from "./week-calendar";

/* The Schedule's month view (Figma Ypf9ohpRcGWF5C9T9bSvWW, section 08,
   S1), built on the server from one month summary so SSR and hydration
   read the same strings. Dates are practice-local YYYY-MM-DD; a weekday
   comes from the date itself in UTC, never from the server's clock. */

const PRACTICE_TZ = "America/New_York";
const MONTH_PARAM = z.string().regex(/^2[01]\d{2}-(0[1-9]|1[0-2])$/u);

const MONTH_TITLE = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const DAY_HEADING = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});
const OPEN_TIME = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: PRACTICE_TZ,
});
const NY_DAY = new Intl.DateTimeFormat("en-CA", { dateStyle: "short", timeZone: PRACTICE_TZ });

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Booked share at or above which a day takes the next tint. */
const MID_SHARE = 0.5;
const HIGH_SHARE = 0.75;

/** The four availability steps, emptiest first; the legend reads the same order. */
export type ScheduleTone = "low" | "mid" | "high" | "full";

export interface PreviewProvider {
  readonly id: string;
  readonly name: string;
  readonly locations: string;
  readonly status: string;
  readonly full: boolean;
  /** The first open times, "9:30 AM · 2:00 PM"; empty for a full provider. */
  readonly times: string;
}

export interface DayPreview {
  readonly heading: string;
  /** The day view of this date. */
  readonly href: string;
  readonly summary: string;
  readonly providers: readonly PreviewProvider[];
}

interface CellBase {
  readonly date: string;
  readonly day: number;
  readonly label: string;
  readonly today: boolean;
}

export type ScheduleCell =
  | { readonly kind: "blank"; readonly key: string }
  | (CellBase & { readonly kind: "closed" })
  | (CellBase & { readonly kind: "past"; readonly text: string })
  | (CellBase & {
      readonly kind: "future";
      readonly tone: ScheduleTone;
      readonly count: string;
      readonly full: boolean;
      readonly preview: DayPreview;
    });

export interface ScheduleColumn {
  readonly label: string;
  /** Closed every day this month: the column narrows. */
  readonly narrow: boolean;
}

export interface ScheduleMonth {
  readonly month: string;
  readonly title: string;
  readonly previous: string | null;
  readonly next: string | null;
  readonly columns: readonly ScheduleColumn[];
  readonly weeks: readonly (readonly ScheduleCell[])[];
}

function noon(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

export function weekdayOf(date: string): number {
  return noon(date).getUTCDay();
}

/** The practice's current month, YYYY-MM. */
export function practiceMonth(now: Readonly<Date>): string {
  return NY_DAY.format(now).slice(0, 7);
}

/** A `?month=` value when it names a month the schedule reads, else null. */
export function parseMonth(value: string | readonly string[] | undefined): string | null {
  const parsed = MONTH_PARAM.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function shiftMonth(month: string, by: number): string | null {
  const [year, index] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, index - 1 + by, 1));
  return parseMonth(shifted.toISOString().slice(0, 7));
}

export function toneFor(status: "open" | "full", bookedShare: number): ScheduleTone {
  if (status === "full") return "full";
  if (bookedShare >= HIGH_SHARE) return "high";
  if (bookedShare >= MID_SHARE) return "mid";
  return "low";
}

function previewFor(
  day: Extract<MonthSummaryDay, { readonly status: "open" | "full" }>,
  heading: string,
): DayPreview {
  const lead = day.status === "full" ? "Full" : `${day.open} open`;
  return {
    heading,
    href: dayHref(day.date),
    summary: `${lead} · ${day.booked} of ${day.capacity} booked`,
    providers: day.providers.map((provider) => ({
      id: provider.id,
      name: provider.name,
      locations: provider.locations.join(", "),
      status: provider.open === 0 ? "Full" : `${provider.open} open`,
      full: provider.open === 0,
      times:
        provider.open === 0
          ? ""
          : provider.firstOpen.map((start) => OPEN_TIME.format(new Date(start))).join(" · "),
    })),
  };
}

function cellFor(day: MonthSummaryDay, today: string): ScheduleCell {
  const heading = DAY_HEADING.format(noon(day.date));
  const isToday = day.date === today;
  const base = {
    date: day.date,
    day: Number(day.date.slice(8)),
    today: isToday,
  };
  const named = isToday ? `${heading}, today` : heading;
  if (day.status === "closed") return { ...base, kind: "closed", label: `${named}: closed` };
  if (day.status === "past") {
    const text = day.seen === 0 ? "No visits" : `${day.seen} seen`;
    return { ...base, kind: "past", text, label: `${named}: ${text.toLowerCase()}` };
  }
  const full = day.status === "full";
  return {
    ...base,
    kind: "future",
    tone: toneFor(day.status, day.bookedShare),
    count: String(day.open),
    full,
    label: `${named}: ${full ? "full" : `${day.open} open`}`,
    preview: previewFor(day, heading),
  };
}

export function scheduleMonthFor(summary: MonthSummary): ScheduleMonth {
  const { month, today } = summary;
  const days = summary.days.toSorted((a, b) => a.date.localeCompare(b.date));
  const columns = WEEKDAYS.map((label, weekday) => {
    const ofWeekday = days.filter((day) => weekdayOf(day.date) === weekday);
    return {
      label,
      narrow: ofWeekday.length > 0 && ofWeekday.every((day) => day.status === "closed"),
    };
  });
  const cells: ScheduleCell[] = [];
  const lead = days.length === 0 ? 0 : weekdayOf(days[0].date);
  for (let index = 0; index < lead; index += 1) cells.push({ kind: "blank", key: `lead-${index}` });
  for (const day of days) cells.push(cellFor(day, today));
  for (let index = 0; cells.length % 7 !== 0; index += 1)
    cells.push({ kind: "blank", key: `tail-${index}` });
  const weeks: ScheduleCell[][] = [];
  for (let start = 0; start < cells.length; start += 7) weeks.push(cells.slice(start, start + 7));
  return {
    month,
    title: MONTH_TITLE.format(noon(`${month}-01`)),
    previous: shiftMonth(month, -1),
    next: shiftMonth(month, 1),
    columns,
    weeks,
  };
}
