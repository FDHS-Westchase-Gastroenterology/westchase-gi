import type { WeekDay } from "@/lib/portal/scheduling/grid-contracts";

import { endMinute, practiceDate, practiceMinute } from "./week-calendar";

/* The week grid's hours (issue #345): which hours the grid shows, where a
   span sits in them, and where now is. Every position is in practice-local
   minutes from the top of the grid. */

export interface WeekSpan {
  readonly top: number;
  readonly height: number;
}

/** What the hours read from a day: its working ranges and its visits. The
    week's days and the day view's providers both carry them. */
type Hours = Pick<WeekDay, "working" | "appointments">;

interface HourBounds {
  readonly start: number;
  readonly end: number;
}

/** The hours the grid shows when nobody in the week has any. */
const DEFAULT_HOURS: HourBounds = { start: 8 * 60, end: 17 * 60 };
/* The grid's hours: from the earliest working start to the latest working
   end in the week, in whole hours, widened to hold any appointment booked
   outside them. */
export function hourBounds(days: readonly Hours[]): HourBounds {
  let start = Infinity;
  let end = -Infinity;
  for (const day of days) {
    for (const range of day.working) {
      start = Math.min(start, practiceMinute(range.from));
      end = Math.max(end, endMinute(range.until));
    }
    for (const appointment of day.appointments) {
      start = Math.min(start, practiceMinute(appointment.startsAt));
      end = Math.max(end, endMinute(appointment.endsAt));
    }
  }
  if (!Number.isFinite(start)) return DEFAULT_HOURS;
  return { start: Math.floor(start / 60) * 60, end: Math.min(24 * 60, Math.ceil(end / 60) * 60) };
}

export function hourLabel(minute: number): string {
  const hour = Math.floor(minute / 60) % 24;
  const suffix = hour < 12 ? "AM" : "PM";
  return `${hour % 12 === 0 ? 12 : hour % 12} ${suffix}`;
}

export function shadesFor(
  day: Readonly<Pick<Hours, "working">>,
  start: number,
  end: number,
): WeekSpan[] {
  const working = day.working
    .map((range) => ({ from: practiceMinute(range.from), until: endMinute(range.until) }))
    .toSorted((a, b) => a.from - b.from);
  const shades: WeekSpan[] = [];
  let cursor = start;
  for (const range of working) {
    const from = Math.max(start, range.from);
    if (from > cursor) shades.push({ top: cursor - start, height: from - cursor });
    cursor = Math.max(cursor, Math.min(end, range.until));
  }
  if (cursor < end) shades.push({ top: cursor - start, height: end - cursor });
  return shades;
}

/** A cell's top and height, clipped to the grid and never under 15 minutes. */
export function place(startsAt: string, endsAt: string, start: number, end: number) {
  const from = Math.max(start, practiceMinute(startsAt));
  const until = Math.min(end, endMinute(endsAt));
  return { top: from - start, height: Math.max(until - from, 15) };
}

/** Minutes from the grid's top to now on `date`, or null off that day or the grid. */
export function nowOffset(now: number, date: string, start: number, end: number): number | null {
  const instant = new Date(now);
  if (practiceDate(instant) !== date) return null;
  const minute = practiceMinute(instant.toISOString());
  return minute < start || minute > end ? null : minute - start;
}
