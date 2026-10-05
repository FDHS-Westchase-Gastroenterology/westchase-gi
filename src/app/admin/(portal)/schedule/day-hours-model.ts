import type { MinuteSpan } from "@/app/admin/(portal)/settings/providers/providers-model";
import {
  clockOf,
  clockRange,
  dayRuns,
  longDay,
  placeName,
  reasonLabel,
  settingsFailureMessage,
  shortDate,
  shortName,
} from "@/app/admin/(portal)/settings/settings-model";
import type { SchedulingFailureCode } from "@/lib/portal/scheduling/contracts";
import type {
  DayHours,
  DayHoursBooking,
  DayHoursConflict,
  DayHoursLocation,
  DayHoursProvider,
  DayHoursScope,
} from "@/lib/portal/scheduling/day-hours-contracts";
import { TIME_OFF_REASONS } from "@/lib/portal/scheduling/settings-contracts";

import { endMinute, practiceMinute } from "./week-calendar";
import { failureMessage } from "./week-card-model";

/* The Day view's Hours sheet (issue #353): the words and window arithmetic behind it. Minutes
   count from the practice day's midnight. A provider's day is the list of windows they work,
   each at one office; the sheet edits that list for one date, or for the weekday from that date
   on, and the server answers what each change would do before it is saved. On today, the
   quarter hour now falls in is a lock: nothing before it changes, in either scope. */

export interface HoursWindow {
  readonly locationId: string;
  readonly openMinute: number;
  readonly closeMinute: number;
}

/** Each provider's windows, by provider id. */
export type HoursDraft = Readonly<Record<string, readonly HoursWindow[]>>;

/** What the server said about a row's change; an unchanged row has none. */
export type RowCheck =
  | { readonly state: "checking" }
  | { readonly state: "ok"; readonly openCount: number }
  | { readonly state: "conflict"; readonly conflicts: readonly DayHoursConflict[] }
  | { readonly state: "refused"; readonly message: string };

const DAY_MINUTES = 24 * 60;
const QUARTER = 15;

/* ---- The ruler ---- */

/** The ruler's span in whole hours: 7 AM to 6 PM, widened to every office's day. */
export function sheetSpan(locations: readonly DayHoursLocation[]): MinuteSpan {
  const opens = locations.flatMap((place) => (place.openMinute === null ? [] : [place.openMinute]));
  const closes = locations.flatMap((place) =>
    place.closeMinute === null ? [] : [place.closeMinute],
  );
  const earliest = Math.min(8 * 60, ...opens);
  const latest = Math.max(18 * 60, ...closes);
  return {
    open: Math.max(0, Math.floor(earliest / 60) * 60 - 60),
    close: Math.min(DAY_MINUTES, Math.ceil(latest / 60) * 60),
  };
}

/** An office's hours on the sheet's day, or null when it is closed. */
export function officeHours(place: Readonly<DayHoursLocation> | undefined): MinuteSpan | null {
  if (place === undefined || place.closed || place.openMinute === null) return null;
  if (place.closeMinute === null) return null;
  return { open: place.openMinute, close: place.closeMinute };
}

/** The practice's minute now, on today; null on a later day. */
export function nowMinute(hours: Readonly<DayHours>): number | null {
  return hours.date === hours.today ? practiceMinute(hours.observedAt) : null;
}

/** The quarter hour now falls in: the earliest minute a change today can reach. */
export function lockMinute(hours: Readonly<DayHours>): number | null {
  const now = nowMinute(hours);
  return now === null ? null : Math.floor(now / QUARTER) * QUARTER;
}

/* ---- Windows ---- */

function byOpen(a: Readonly<HoursWindow>, b: Readonly<HoursWindow>) {
  return a.openMinute - b.openMinute;
}

export function windowsOf(windows: readonly HoursWindow[]): HoursWindow[] {
  return windows
    .map(({ locationId, openMinute, closeMinute }) => ({ locationId, openMinute, closeMinute }))
    .toSorted(byOpen);
}

export function sameWindows(a: readonly HoursWindow[], b: readonly HoursWindow[]): boolean {
  const left = windowsOf(a);
  const right = windowsOf(b);
  return (
    left.length === right.length &&
    left.every((window, at) => {
      const other = right.at(at);
      return (
        other !== undefined &&
        other.locationId === window.locationId &&
        other.openMinute === window.openMinute &&
        other.closeMinute === window.closeMinute
      );
    })
  );
}

/** The windows a provider works on the sheet's day, before any change: the day as it stands,
    or the weekly hours for that weekday. */
export function baselineOf(
  provider: Readonly<DayHoursProvider>,
  scope: DayHoursScope,
): HoursWindow[] {
  return windowsOf(scope === "date" ? provider.windows : provider.weekly);
}

/** Two windows at one office that touch are one window. */
function joinTouching(windows: readonly HoursWindow[]): HoursWindow[] {
  const joined: HoursWindow[] = [];
  for (const window of windowsOf(windows)) {
    const last = joined.at(-1);
    if (
      last !== undefined &&
      last.locationId === window.locationId &&
      last.closeMinute >= window.openMinute
    )
      joined[joined.length - 1] = {
        ...last,
        closeMinute: Math.max(last.closeMinute, window.closeMinute),
      };
    else joined.push(window);
  }
  return joined;
}

function before(windows: readonly HoursWindow[], lock: number): HoursWindow[] {
  return windows.flatMap((window) =>
    window.openMinute < lock
      ? [{ ...window, closeMinute: Math.min(window.closeMinute, lock) }]
      : [],
  );
}

function after(windows: readonly HoursWindow[], lock: number): HoursWindow[] {
  return windows.flatMap((window) =>
    window.closeMinute > lock ? [{ ...window, openMinute: Math.max(window.openMinute, lock) }] : [],
  );
}

/** `next`, with the day before the lock as `day` has it: what has passed stays as it was. */
export function keepPast(
  next: readonly HoursWindow[],
  day: readonly HoursWindow[],
  lock: number | null,
): HoursWindow[] {
  if (lock === null) return windowsOf(next);
  return joinTouching([...before(day, lock), ...after(next, lock)]);
}

/** Whether the provider works any of the day still to come. */
export function worksAhead(windows: readonly HoursWindow[], lock: number | null): boolean {
  return windows.some((window) => lock === null || window.closeMinute > lock);
}

function clampTo(window: Readonly<HoursWindow>, office: Readonly<MinuteSpan>): HoursWindow | null {
  const openMinute = Math.max(window.openMinute, office.open);
  const closeMinute = Math.min(window.closeMinute, office.close);
  return closeMinute - openMinute >= QUARTER ? { ...window, openMinute, closeMinute } : null;
}

function locationOf(locations: readonly DayHoursLocation[], id: string | null | undefined) {
  return locations.find((place) => place.id === id);
}

/** The office a provider's row sits under: where they work that day, else where they usually do. */
export function homeOf(
  provider: Readonly<DayHoursProvider>,
  locations: readonly DayHoursLocation[],
): string | null {
  return (
    provider.windows.at(0)?.locationId ??
    provider.weekly.at(0)?.locationId ??
    provider.homeLocationId ??
    locations.at(0)?.id ??
    null
  );
}

/** A whole office day at `locationId`, from the lock on. */
function officeDay(
  locations: readonly DayHoursLocation[],
  locationId: string | null,
  lock: number | null,
): HoursWindow[] {
  const office = officeHours(locationOf(locations, locationId));
  if (office === null || locationId === null) return [];
  return after([{ locationId, openMinute: office.open, closeMinute: office.close }], lock ?? 0);
}

/** Switching a provider on fills the rest of the day with their weekly hours for the weekday,
    or with their office's hours, at offices open that day. */
export function switchedOn(
  provider: Readonly<DayHoursProvider>,
  locations: readonly DayHoursLocation[],
  lock: number | null,
): HoursWindow[] {
  const weekly = windowsOf(provider.weekly).flatMap((window) => {
    const office = officeHours(locationOf(locations, window.locationId));
    const clamped = office === null ? null : clampTo(window, office);
    return clamped === null ? [] : [clamped];
  });
  const ahead = lock === null ? weekly : after(weekly, lock);
  if (ahead.length > 0) return keepPast(ahead, provider.windows, lock);
  const home = homeOf(provider, locations);
  const places = [home, ...locations.map((place) => place.id)];
  for (const place of places) {
    const day = officeDay(locations, place, lock);
    if (day.length > 0) return keepPast(day, provider.windows, lock);
  }
  return keepPast([], provider.windows, lock);
}

/** Switching a provider off closes the rest of their day; what has passed stays. */
export function switchedOff(
  provider: Readonly<DayHoursProvider>,
  lock: number | null,
): HoursWindow[] {
  return keepPast([], provider.windows, lock);
}

/** The day's windows moved to another office, inside that office's hours. */
export function movedTo(
  windows: readonly HoursWindow[],
  locationId: string,
  provider: Readonly<DayHoursProvider>,
  locations: readonly DayHoursLocation[],
  lock: number | null,
): HoursWindow[] {
  const office = officeHours(locationOf(locations, locationId));
  if (office === null) return windowsOf(windows);
  const ahead = lock === null ? windows : after(windows, lock);
  const moved = ahead.flatMap((window) => {
    const clamped = clampTo({ ...window, locationId }, office);
    return clamped === null ? [] : [clamped];
  });
  return keepPast(
    moved.length > 0 ? moved : officeDay(locations, locationId, lock),
    provider.windows,
    lock,
  );
}

/** Where window `index` may run: inside its office's hours, clear of its neighbors, and on today
    no earlier than the lock unless it already started. */
export function windowRange(
  windows: readonly HoursWindow[],
  index: number,
  locations: readonly DayHoursLocation[],
  lock: number | null,
): MinuteSpan {
  const window = windows.at(index);
  const office = officeHours(locationOf(locations, window?.locationId)) ?? {
    open: 0,
    close: DAY_MINUTES,
  };
  const before = index > 0 ? windows.at(index - 1) : undefined;
  const open = Math.max(office.open, before?.closeMinute ?? 0);
  const close = Math.min(office.close, windows.at(index + 1)?.openMinute ?? DAY_MINUTES);
  const started = lock !== null && window !== undefined && window.openMinute < lock;
  return {
    open: started ? window.openMinute : Math.max(open, lock ?? 0),
    close: Math.max(close, window?.closeMinute ?? close),
  };
}

/* ---- Bookings ---- */

export function bookingStart(booking: Readonly<DayHoursBooking>): number {
  return practiceMinute(booking.startsAt);
}

function holds(windows: readonly HoursWindow[], booking: Readonly<DayHoursBooking>) {
  const start = bookingStart(booking);
  const end = endMinute(booking.endsAt);
  return windows.some(
    (window) =>
      window.locationId === booking.locationId &&
      window.openMinute <= start &&
      window.closeMinute >= end,
  );
}

/** The visits this day's windows held and the draft no longer does: the amber ticks. */
export function strandedIds(
  provider: Readonly<DayHoursProvider>,
  draft: readonly HoursWindow[],
): ReadonlySet<string> {
  const stranded = new Set<string>();
  for (const booking of provider.bookings)
    if (
      booking.status !== "completed" &&
      holds(provider.windows, booking) &&
      !holds(draft, booking)
    )
      stranded.add(booking.id);
  return stranded;
}

/* ---- Words ---- */

/** "8 AM", "12:30 PM". */
function clockWords(minute: number): string {
  return clockOf(minute).replace(":00 ", " ");
}

/** "8 AM – 12 PM, 1 – 3 PM". */
export function hoursWords(windows: readonly HoursWindow[]): string {
  return windowsOf(windows)
    .map((window) => {
      const from = clockWords(window.openMinute);
      const until = clockWords(window.closeMinute);
      return from.slice(-2) === until.slice(-2)
        ? `${from.slice(0, -3)} – ${until}`
        : `${from} – ${until}`;
    })
    .join(", ");
}

/** "Usually Mon, Tue, Thu". */
export function usualLine(provider: Readonly<DayHoursProvider>): string {
  return provider.usualWeekdays.length === 0
    ? "No weekly hours"
    : `Usually ${dayRuns(provider.usualWeekdays)}`;
}

type TimeOffEntry = DayHoursProvider["timeOff"][number];

/** The first time off that covers the whole ruler, or undefined. */
export function awayEntry(
  provider: Readonly<DayHoursProvider>,
  span: Readonly<MinuteSpan>,
): TimeOffEntry | undefined {
  return provider.timeOff.find(
    (entry) => entry.startMinute <= span.open && entry.endMinute >= span.close,
  );
}

/** The all-day time off the sheet shows for a provider; only "this day only" knows of time off. */
export function rowAway(
  provider: Readonly<DayHoursProvider>,
  scope: DayHoursScope,
  span: Readonly<MinuteSpan>,
): TimeOffEntry | undefined {
  return scope === "date" ? awayEntry(provider, span) : undefined;
}

/** "Conference · all day", or "Conference · 9:00 AM – 1:00 PM". */
export function timeOffLine(entry: Readonly<TimeOffEntry>): string {
  const label = TIME_OFF_REASONS.find((reason) => reason === entry.reason);
  const name = label === undefined ? "Time off" : reasonLabel(label);
  return entry.startMinute <= 0 && entry.endMinute >= DAY_MINUTES
    ? `${name} · all day`
    : `${name} · ${clockRange(entry.startMinute, entry.endMinute)}`;
}

export function offText(scope: DayHoursScope, weekday: number): string {
  return scope === "date" ? "Not working this day" : `Not working ${longDay(weekday)}s`;
}

/** "Sep 16". */
export function monthDay(date: string): string {
  return shortDate(date).split(", ").at(-1) ?? date;
}

export function saveLabel(scope: DayHoursScope, hours: Readonly<DayHours>): string {
  return scope === "date"
    ? `Save for ${monthDay(hours.date)}`
    : `Save for ${longDay(hours.weekday)}s`;
}

export function scopeLine(
  scope: DayHoursScope,
  hours: Readonly<DayHours>,
): { readonly lead: string; readonly rest: string } {
  const day = longDay(hours.weekday);
  return scope === "date"
    ? {
        lead: "",
        rest: `${shortDate(hours.date)} only. Other ${day}s keep their weekly hours.`,
      }
    : {
        lead: `Every ${day} from ${monthDay(hours.date)} on.`,
        rest: " This becomes the weekly pattern in Settings. Days already given their own hours keep them.",
      };
}

export function openTimes(count: number): string {
  return count === 1 ? "1 open time" : `${String(count)} open times`;
}

/** Why no switch can turn on: every office is closed that day, or has closed for today. Null
    while some office still has a quarter hour ahead. */
export function closedLine(hours: Readonly<DayHours>, lock: number | null): string | null {
  const open = hours.locations.flatMap((place) => {
    const office = officeHours(place);
    return office === null ? [] : [office];
  });
  if (open.length === 0) return `The offices are closed ${longDay(hours.weekday)}s.`;
  if (lock !== null && open.every((office) => office.close - QUARTER < lock))
    return "The offices have closed for today.";
  return null;
}

/** The subtitle once a provider who was off is switched on and the server has counted their day. */
export function addedLine(
  name: string,
  scope: DayHoursScope,
  hours: Readonly<DayHours>,
  openCount: number,
): string {
  if (scope === "weekday_from")
    return `${name} is added every ${longDay(hours.weekday)} from ${monthDay(hours.date)}, with ${openTimes(openCount)} that day.`;
  const when = hours.date === hours.today ? "the rest of today" : shortDate(hours.date);
  return `${name} is added for ${when}, with ${openTimes(openCount)}.`;
}

export function savedHeadline(scope: DayHoursScope, hours: Readonly<DayHours>): string {
  return scope === "date"
    ? `Hours saved for ${shortDate(hours.date)}`
    : `Hours saved for ${longDay(hours.weekday)}s from ${monthDay(hours.date)}`;
}

export interface SavedChange {
  readonly provider: DayHoursProvider;
  readonly windows: readonly HoursWindow[];
  readonly openCount: number;
}

/** The toast's second line: "Dr. Alfredo Mendoza added in Tampa · 3 open times". */
export function savedDetail(
  changes: readonly SavedChange[],
  scope: DayHoursScope,
  hours: Readonly<DayHours>,
): string {
  const change = changes.at(0);
  if (change === undefined || changes.length > 1)
    return `${String(changes.length)} providers' hours changed`;
  const { provider, windows, openCount } = change;
  if (baselineOf(provider, scope).length === 0) {
    const place = locationOf(hours.locations, windows[0]?.locationId);
    const where = place === undefined ? "" : ` in ${placeName(place)}`;
    return `${provider.name} added${where} · ${openTimes(openCount)}`;
  }
  if (windows.length === 0) return `${provider.name} · ${offText(scope, hours.weekday)}`;
  return `${provider.name} · ${hoursWords(windows)}`;
}

/** A patient's first name, for "Move James first". */
export function firstName(name: string): string {
  return name.trim().split(/\s+/u)[0] ?? name;
}

/** One end of a window that moved, and where it was; "other" for any larger change. */
type EndMoved = { readonly side: "end" | "start"; readonly minute: number } | "other";

/** The banner's way back: its button, and the words the sentence ends on. */
export interface KeepChoice {
  readonly button: string;
  readonly phrase: string;
}

/** How a conflict banner offers the way back to the row's last good hours. */
export function keepChoice(
  settled: readonly HoursWindow[],
  draft: readonly HoursWindow[],
  provider: Readonly<DayHoursProvider>,
  scope: DayHoursScope,
  weekday: number,
  lock: number | null,
): KeepChoice {
  const name = shortName(provider.name);
  if (worksAhead(settled, lock) && !worksAhead(draft, lock))
    return {
      button: `Keep ${name} working`,
      phrase: `keep ${name} working ${scope === "date" ? "this day" : `${longDay(weekday)}s`}`,
    };
  const was = windowsOf(settled);
  const now = windowsOf(draft);
  if (was.length === now.length) {
    const moved = now.flatMap((window, at): EndMoved[] => {
      const old = was.at(at);
      if (old === undefined || old.locationId !== window.locationId) return ["other"];
      const ends: EndMoved[] =
        old.closeMinute === window.closeMinute ? [] : [{ side: "end", minute: old.closeMinute }];
      const starts: EndMoved[] =
        old.openMinute === window.openMinute ? [] : [{ side: "start", minute: old.openMinute }];
      return [...ends, ...starts];
    });
    const only = moved.at(0);
    if (moved.length === 1 && only !== undefined && only !== "other") {
      const clock = clockOf(only.minute);
      return { button: `Keep ${clock}`, phrase: `keep the ${only.side} at ${clock}` };
    }
  }
  return { button: "Keep the hours", phrase: "keep the hours as they were" };
}

/* ---- Failures ---- */

const FAILURE_COPY = new Map<SchedulingFailureCode, string>([
  ["stale_version", "Someone just changed these hours. Close and open Hours again."],
  ["hours_in_past", "That part of today has passed, so it can't change."],
  ["outside_office_hours", "Those hours run past the office's hours that day."],
  ["location_closed", "That office is closed that day."],
  ["location_unavailable", "That office isn't taking appointments."],
  ["provider_not_bookable", "This provider no longer takes appointments."],
  ["forbidden", "Only an administrator can change hours."],
  ["invalid_command", "Those hours aren't valid. Check the bars and try again."],
]);

export function hoursFailureMessage(code: SchedulingFailureCode): string {
  return FAILURE_COPY.get(code) ?? failureMessage(code);
}

/** An undo refused because the hours changed again reads as every stale Settings change does. */
export function undoFailureMessage(code: SchedulingFailureCode): string {
  return code === "stale_version" ? settingsFailureMessage(code) : hoursFailureMessage(code);
}
