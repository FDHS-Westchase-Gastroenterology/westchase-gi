import { practiceMinute, endMinute } from "@/app/admin/(portal)/schedule/week-calendar";
import {
  clockRange,
  longDay,
  placeName,
  reasonLabel,
  WEEK_ORDER,
  weekRank,
} from "@/app/admin/(portal)/settings/settings-model";
import type { WeeklyWindow } from "@/app/admin/(portal)/settings/settings-model";
import type {
  SettingsLocation,
  SettingsProvider,
} from "@/lib/portal/scheduling/settings-contracts";

/* Providers in Settings (issue #352, Figma St1): the week edits behind the
   weekly-hours bars. Every edit builds the provider's whole week, because
   set_provider_weekly_hours replaces it from today; the server checks it
   against the office's hours and the bookings it would strand. */

/** One window of the week as the command sends it. */
export interface WeekWindow {
  readonly locationId: string;
  readonly weekday: number;
  readonly openMinute: number;
  readonly closeMinute: number;
}

export interface MinuteSpan {
  readonly open: number;
  readonly close: number;
}

const LUNCH: MinuteSpan = { open: 12 * 60, close: 13 * 60 };

export function weekOf(hours: readonly WeeklyWindow[]): WeekWindow[] {
  return hours.map(({ locationId, weekday, openMinute, closeMinute }) => ({
    locationId,
    weekday,
    openMinute,
    closeMinute,
  }));
}

function ordered(week: readonly WeekWindow[]): WeekWindow[] {
  return week.toSorted(
    (a, b) => weekRank(a.weekday) - weekRank(b.weekday) || a.openMinute - b.openMinute,
  );
}

/** The windows of one weekday, earliest first. */
export function dayWindows(week: readonly WeekWindow[], weekday: number): WeekWindow[] {
  return ordered(week.filter((window) => window.weekday === weekday));
}

/** Weekdays with at least one window, Monday first. */
export function workingDays(week: readonly WeekWindow[]): number[] {
  return WEEK_ORDER.filter((day) => week.some((window) => window.weekday === day));
}

/** Weekdays with no window, Monday first. */
export function restDays(week: readonly WeekWindow[]): number[] {
  return WEEK_ORDER.filter((day) => !week.some((window) => window.weekday === day));
}

/** The office's hours on `weekday`, or null when it is closed that day. An office with no
    hours on record bounds nothing, the way the server reads it. */
export function officeDay(
  location: Readonly<Pick<SettingsLocation, "hours">> | undefined,
  weekday: number,
): MinuteSpan | null {
  if (location === undefined) return null;
  if (location.hours.length === 0) return { open: 0, close: 24 * 60 };
  const day = location.hours.find((row) => row.weekday === weekday);
  return day === undefined ? null : { open: day.openMinute, close: day.closeMinute };
}

/** The week with `weekday`'s windows replaced. */
export function withDay(
  week: readonly WeekWindow[],
  weekday: number,
  windows: readonly WeekWindow[],
): WeekWindow[] {
  return ordered([...week.filter((window) => window.weekday !== weekday), ...windows]);
}

/** `weekday` at another office: each window kept inside that office's hours, and any that
    fall wholly outside them dropped. */
export function moveDay(
  week: readonly WeekWindow[],
  weekday: number,
  location: Readonly<Pick<SettingsLocation, "id" | "hours">>,
): WeekWindow[] {
  const office = officeDay(location, weekday);
  if (office === null) return [...week];
  const moved = dayWindows(week, weekday).flatMap((window) => {
    const openMinute = Math.max(window.openMinute, office.open);
    const closeMinute = Math.min(window.closeMinute, office.close);
    return closeMinute > openMinute
      ? [{ ...window, locationId: location.id, openMinute, closeMinute }]
      : [];
  });
  return withDay(
    week,
    weekday,
    moved.length > 0
      ? moved
      : [{ locationId: location.id, weekday, openMinute: office.open, closeMinute: office.close }],
  );
}

/** Whether `weekday`'s one window runs through lunch, so it can be split around it. */
export function canSplit(windows: readonly WeekWindow[]): boolean {
  const [only] = windows;
  return windows.length === 1 && only.openMinute < LUNCH.open && only.closeMinute > LUNCH.close;
}

/** One window becomes a morning and an afternoon, with noon to one o'clock between. */
export function splitDay(week: readonly WeekWindow[], weekday: number): WeekWindow[] {
  const windows = dayWindows(week, weekday);
  if (!canSplit(windows)) return [...week];
  const [only] = windows;
  return withDay(week, weekday, [
    { ...only, closeMinute: LUNCH.open },
    { ...only, openMinute: LUNCH.close },
  ]);
}

/** A day's windows become one, from the first opening to the last close, at the first window's
    office. */
export function joinDay(week: readonly WeekWindow[], weekday: number): WeekWindow[] {
  const windows = dayWindows(week, weekday);
  const first = windows.at(0);
  const last = windows.at(-1);
  if (windows.length < 2 || first === undefined || last === undefined) return [...week];
  return withDay(week, weekday, [{ ...first, closeMinute: last.closeMinute }]);
}

/** The office a new working day opens at: the provider's most-worked office open that day,
    else the first office open that day. */
export function officeFor(
  week: readonly WeekWindow[],
  weekday: number,
  locations: readonly SettingsLocation[],
): SettingsLocation | null {
  const open = locations.filter((location) => officeDay(location, weekday) !== null);
  const worked = (location: Readonly<SettingsLocation>) =>
    week.filter((window) => window.locationId === location.id).length;
  return open.toSorted((a, b) => worked(b) - worked(a)).at(0) ?? null;
}

/** `weekday` worked at `location` for the office's whole day. */
export function addDay(
  week: readonly WeekWindow[],
  weekday: number,
  location: Readonly<Pick<SettingsLocation, "id" | "hours">>,
): WeekWindow[] {
  const office = officeDay(location, weekday);
  if (office === null) return [...week];
  return withDay(week, weekday, [
    { locationId: location.id, weekday, openMinute: office.open, closeMinute: office.close },
  ]);
}

/** Where window `index` of a day may run: inside its office's hours and clear of its neighbors. */
export function windowBounds(
  windows: readonly WeekWindow[],
  index: number,
  office: Readonly<MinuteSpan>,
): MinuteSpan {
  return {
    open: Math.max(office.open, windows[index - 1]?.closeMinute ?? 0),
    close: Math.min(office.close, windows[index + 1]?.openMinute ?? 24 * 60),
  };
}

/** The ruler's span in whole hours: 7 AM to 6 PM, widened to every office's day. */
export function rulerSpan(locations: readonly SettingsLocation[]): MinuteSpan {
  const rows = locations.flatMap((location) => location.hours);
  const earliest = Math.min(8 * 60, ...rows.map((row) => row.openMinute));
  const latest = Math.max(18 * 60, ...rows.map((row) => row.closeMinute));
  return {
    open: Math.max(0, Math.floor(earliest / 60) * 60 - 60),
    close: Math.min(24 * 60, Math.ceil(latest / 60) * 60),
  };
}

/** Percent of the ruler at `minute`. */
export function rulerAt(span: Readonly<MinuteSpan>, minute: number): number {
  return ((minute - span.open) / (span.close - span.open)) * 100;
}

/** "Mon–Fri" style list of a day's windows for the Undo toast: "Monday, Tampa · 8:00 AM – 5:00 PM". */
export function dayDescription(
  windows: readonly WeekWindow[],
  weekday: number,
  locations: readonly SettingsLocation[],
): string {
  if (windows.length === 0) return `${longDay(weekday)} · Not working`;
  const place = locations.find((location) => location.id === windows[0]?.locationId);
  const times = windows
    .map((window) => clockRange(window.openMinute, window.closeMinute))
    .join(", ");
  return `${longDay(weekday)}${place === undefined ? "" : `, ${placeName(place)}`} · ${times}`;
}

/* ---- Time off ---- */

type TimeOffEntry = SettingsProvider["timeOff"][number];

/** Time off that has not ended yet, soonest first. */
export function upcomingTimeOff(
  entries: readonly TimeOffEntry[],
  now: Readonly<Date>,
): TimeOffEntry[] {
  return entries
    .filter((entry) => new Date(entry.endsAt).getTime() > now.getTime())
    .toSorted((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** "Conference · all day", or "Personal · 9:00 – 11:00 AM". */
export function timeOffDetail(entry: Readonly<TimeOffEntry>): string {
  const reason = entry.reason === null ? "Time off" : reasonLabel(entry.reason);
  return entry.allDay
    ? `${reason} · all day`
    : `${reason} · ${clockRange(practiceMinute(entry.startsAt), endMinute(entry.endsAt))}`;
}
