import { addDays, endMinute, practiceMinute } from "@/app/admin/(portal)/schedule/week-calendar";
import {
  clockRange,
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

/* Providers in Settings (issue #352, Figma St1): a provider's week as it
   stands and as it is planned, and the draft the Edit hours sheet works on.
   set_provider_weekly_hours replaces the whole week from a start date; the
   server checks it against the office's hours and the bookings it would
   leave outside it. */

/** One window of the week as the command sends it. A window on office hours takes its
    office's hours for that day and is the only one that day. */
export interface WeekWindow {
  readonly locationId: string;
  readonly weekday: number;
  readonly openMinute: number;
  readonly closeMinute: number;
  readonly followsOffice: boolean;
}

export interface MinuteSpan {
  readonly open: number;
  readonly close: number;
}

function ordered(week: readonly WeekWindow[]): WeekWindow[] {
  return week.toSorted(
    (a, b) => weekRank(a.weekday) - weekRank(b.weekday) || a.openMinute - b.openMinute,
  );
}

function windowOf({
  locationId,
  weekday,
  openMinute,
  closeMinute,
  followsOffice,
}: Readonly<WeekWindow>) {
  return { locationId, weekday, openMinute, closeMinute, followsOffice };
}

/** The week in force on `date`: the rows valid that day, ordered by day and time. */
export function weekOn(hours: readonly WeeklyWindow[], date: string): WeekWindow[] {
  return ordered(
    hours
      .filter((row) => row.validFrom <= date && (row.validTo === null || row.validTo >= date))
      .map(windowOf),
  );
}

function weekKey(week: readonly WeekWindow[]): string {
  return ordered(week)
    .map(
      (w) =>
        `${w.locationId}/${String(w.weekday)}/${String(w.openMinute)}-${String(w.closeMinute)}/${String(w.followsOffice)}`,
    )
    .join(",");
}

export function sameWeek(a: readonly WeekWindow[], b: readonly WeekWindow[]): boolean {
  return weekKey(a) === weekKey(b);
}

/** The days after today the provider's week changes on, each with the week from that day. */
export function plannedWeeks(
  hours: readonly WeeklyWindow[],
  today: string,
): { readonly from: string; readonly week: WeekWindow[] }[] {
  const starts = new Set<string>();
  for (const row of hours) {
    if (row.validFrom > today) starts.add(row.validFrom);
    if (row.validTo !== null && row.validTo >= today) starts.add(addDays(row.validTo, 1));
  }
  const planned: { from: string; week: WeekWindow[] }[] = [];
  let before = weekOn(hours, today);
  for (const from of [...starts].toSorted()) {
    const week = weekOn(hours, from);
    if (!sameWeek(week, before)) planned.push({ from, week });
    before = week;
  }
  return planned;
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

/** A new provider's week: Monday to Friday at the office, for the hours it is open each day. */
export function officeWeek(location: Readonly<SettingsLocation> | undefined): WeekWindow[] {
  if (location === undefined) return [];
  return [1, 2, 3, 4, 5].flatMap((weekday) => {
    const office = officeDay(location, weekday);
    return office === null
      ? []
      : [
          {
            locationId: location.id,
            weekday,
            openMinute: office.open,
            closeMinute: office.close,
            followsOffice: true,
          },
        ];
  });
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

/** A day's hours as one line: "Tampa · Office hours, 8:00 AM – 5:00 PM", "Tampa · 8:00 AM –
    4:00 PM", or "Tampa · 8:00 AM – 12:00 PM, Lutz · 1:00 – 5:00 PM" when the day moves offices. */
export function dayLine(windows: readonly WeekWindow[], locations: readonly SettingsLocation[]) {
  const name = (id: string) => {
    const place = locations.find((location) => location.id === id);
    return place === undefined ? "Office" : placeName(place);
  };
  const first = windows.at(0);
  if (first?.followsOffice === true)
    return `${name(first.locationId)} · Office hours, ${clockRange(first.openMinute, first.closeMinute)}`;
  const oneOffice = windows.every((window) => window.locationId === windows[0]?.locationId);
  if (oneOffice && windows.length > 0)
    return `${name(windows[0]?.locationId ?? "")} · ${windows
      .map((window) => clockRange(window.openMinute, window.closeMinute))
      .join(", ")}`;
  return windows
    .map(
      (window) =>
        `${name(window.locationId)} · ${clockRange(window.openMinute, window.closeMinute)}`,
    )
    .join(", ");
}

/* ---- The Edit hours sheet's draft ---- */

/** One block of a working day. A block on office hours is the whole of its office's day. */
export interface DraftBlock {
  readonly locationId: string;
  readonly open: number;
  readonly close: number;
  readonly followsOffice: boolean;
}

/** Each weekday's blocks, Monday first; a day with none is a day off. */
export type WeekDraft = ReadonlyMap<number, readonly DraftBlock[]>;

export function draftOf(week: readonly WeekWindow[]): WeekDraft {
  return new Map(
    WEEK_ORDER.map((weekday) => [
      weekday,
      dayWindows(week, weekday).map((window) => ({
        locationId: window.locationId,
        open: window.openMinute,
        close: window.closeMinute,
        followsOffice: window.followsOffice,
      })),
    ]),
  );
}

export function weekOfDraft(draft: WeekDraft): WeekWindow[] {
  return WEEK_ORDER.flatMap((weekday) =>
    (draft.get(weekday) ?? []).map((block) => ({
      locationId: block.locationId,
      weekday,
      openMinute: block.open,
      closeMinute: block.close,
      followsOffice: block.followsOffice,
    })),
  );
}

/** Whether `location` has hours of its own on `weekday` to follow. */
export function hasOfficeDay(location: Readonly<SettingsLocation> | undefined, weekday: number) {
  return location?.hours.some((row) => row.weekday === weekday) === true;
}

/** A day turned on: the office the provider works most that is open then, on its hours. */
export function startDay(
  draft: WeekDraft,
  weekday: number,
  locations: readonly SettingsLocation[],
): readonly DraftBlock[] {
  const office = officeFor(weekOfDraft(draft), weekday, locations);
  const hours = officeDay(office ?? undefined, weekday);
  return office === null || hours === null
    ? []
    : [
        {
          locationId: office.id,
          open: hours.open,
          close: hours.close,
          followsOffice: hasOfficeDay(office, weekday),
        },
      ];
}

/** A block moved to another office: one on office hours takes the new office's day; a custom
    one keeps its times inside the new office's hours. */
export function moveBlock(
  block: Readonly<DraftBlock>,
  weekday: number,
  to: Readonly<SettingsLocation>,
): DraftBlock {
  const now = officeDay(to, weekday) ?? { open: block.open, close: block.close };
  if (block.followsOffice)
    return {
      locationId: to.id,
      open: now.open,
      close: now.close,
      followsOffice: hasOfficeDay(to, weekday),
    };
  const open = Math.max(block.open, now.open);
  const close = Math.min(block.close, now.close);
  return close > open
    ? { locationId: to.id, open, close, followsOffice: false }
    : { locationId: to.id, open: now.open, close: now.close, followsOffice: false };
}

/** A day put on office hours: one block, its office's whole day. */
export function officeBlock(
  block: Readonly<DraftBlock>,
  weekday: number,
  locations: readonly SettingsLocation[],
): DraftBlock {
  const location = locations.find((each) => each.id === block.locationId);
  const office = officeDay(location, weekday) ?? { open: block.open, close: block.close };
  return {
    locationId: block.locationId,
    open: office.open,
    close: office.close,
    followsOffice: true,
  };
}

/** More hours later in the day: an hour after the last block ends, to the office's close. */
export function laterBlock(
  blocks: readonly DraftBlock[],
  weekday: number,
  locations: readonly SettingsLocation[],
): DraftBlock | null {
  const last = blocks.at(-1);
  if (last === undefined) return null;
  const office = officeDay(
    locations.find((location) => location.id === last.locationId),
    weekday,
  );
  if (office === null) return null;
  const open = last.close + 60;
  return office.close - open >= 15
    ? { locationId: last.locationId, open, close: office.close, followsOffice: false }
    : null;
}

/** What is wrong with a day's blocks, or null. Blocks keep inside their office's hours, end
    after they start, and leave a gap after one another. */
export function dayProblem(
  blocks: readonly DraftBlock[],
  weekday: number,
  locations: readonly SettingsLocation[],
): string | null {
  const byId = new Map(locations.map((location) => [location.id, location]));
  for (const [index, block] of blocks.entries()) {
    const location = byId.get(block.locationId);
    const office = officeDay(location, weekday);
    if (office === null)
      return `${location === undefined ? "That office" : placeName(location)} is closed that day.`;
    if (block.close <= block.open) return "Each block ends after it starts.";
    if (block.open < office.open || block.close > office.close)
      return `${location === undefined ? "The office" : placeName(location)} is open ${clockRange(office.open, office.close)}.`;
    const before = index === 0 ? undefined : blocks.at(index - 1);
    if (before !== undefined && block.open <= before.close)
      return "Leave a gap between blocks, or join them into one.";
  }
  return null;
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
