import { z } from "zod";

/* The practice's calendar for the Schedule's week view (issue #345): the
   week's dates and its links, and practice-local times and names read
   through Intl in America/New_York, so SSR and hydration read the same
   strings and a week that crosses a clock change keeps its hours. */

const PRACTICE_TZ = "America/New_York";
const DAY_MS = 86_400_000;
const WEEK_PARAM = z.iso
  .date()
  .refine((date) => /^2[01]/u.test(date) && new Date(`${date}T12:00:00Z`).getUTCDay() === 0);
const DAY_PARAM = z.iso.date().refine((date) => /^2[01]/u.test(date));
const PROVIDER_ID = z.uuid();
const PROVIDERS_PARAM = z.string().catch("");

const MONTH_NAME = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" });
const CARD_DAY = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: PRACTICE_TZ,
});
const DAY_TITLE = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});
const NY_DAY = new Intl.DateTimeFormat("en-CA", { dateStyle: "short", timeZone: PRACTICE_TZ });
const NY_CLOCK = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: PRACTICE_TZ,
});
const NY_TIME = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: PRACTICE_TZ,
});

export function noon(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

export function addDays(date: string, days: number): string {
  return new Date(noon(date).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** The practice's date for an instant, YYYY-MM-DD. */
export function practiceDate(instant: Readonly<Date>): string {
  return NY_DAY.format(instant);
}

/** The Sunday that starts the practice week holding `now`. */
export function practiceWeekStart(now: Readonly<Date>): string {
  const today = practiceDate(now);
  return addDays(today, -noon(today).getUTCDay());
}

/** A `?week=` value when it names a Sunday the schedule reads, else null. */
export function parseWeekStart(value: string | readonly string[] | undefined): string | null {
  const parsed = WEEK_PARAM.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** A `?date=` value when it names a day the schedule reads, else null. */
export function parseDay(value: string | readonly string[] | undefined): string | null {
  const parsed = DAY_PARAM.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** The Sunday that starts the week holding `date`. */
export function weekStartOf(date: string): string {
  return addDays(date, -noon(date).getUTCDay());
}

/** "Wed, September 16". */
export function dayTitle(date: string): string {
  return DAY_TITLE.format(noon(date));
}

/** The day view of `date`, or of the practice's today when null. */
export function dayHref(date: string | null): string {
  return date === null ? "/admin/schedule?view=day" : `/admin/schedule?view=day&date=${date}`;
}

export function shiftWeek(weekStart: string, by: number): string | null {
  return parseWeekStart(addDays(weekStart, by * 7));
}

/** Provider ids from `?providers=a,b,c`: well-formed, distinct, in order. */
export function parseProviderIds(value: string | readonly string[] | undefined): string[] {
  const ids = new Set<string>();
  for (const part of PROVIDERS_PARAM.parse(value).split(",")) {
    const id = part.trim().toLowerCase();
    if (PROVIDER_ID.safeParse(id).success) ids.add(id);
  }
  return [...ids];
}

/** Minutes since the practice day's midnight, 0–1439. */
export function practiceMinute(instant: string): number {
  const parts = NY_CLOCK.formatToParts(new Date(instant));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((value) => value.type === type)?.value ?? 0);
  return (part("hour") % 24) * 60 + part("minute");
}

/** An end at midnight is the end of the day it closes. */
export function endMinute(instant: string): number {
  const minute = practiceMinute(instant);
  return minute === 0 ? 24 * 60 : minute;
}

export function practiceTime(instant: string): string {
  return NY_TIME.format(new Date(instant));
}

function meridiem(time: string): string {
  return time.slice(-2);
}

/** "1:00 – 1:30 PM", or "11:30 AM – 12:00 PM" across noon. */
export function timeRange(startsAt: string, endsAt: string): string {
  const from = practiceTime(startsAt);
  const until = practiceTime(endsAt);
  return meridiem(from) === meridiem(until)
    ? `${from.slice(0, -3)} – ${until}`
    : `${from} – ${until}`;
}

/** "Thu, Sep 17", the practice's day of an instant. */
export function cardDay(instant: string): string {
  return CARD_DAY.format(new Date(instant));
}

/** "Wed, Sep 16 · 1:00 – 1:30 PM". */
export function appointmentWhen(startsAt: string, endsAt: string): string {
  return `${CARD_DAY.format(new Date(startsAt))} · ${timeRange(startsAt, endsAt)}`;
}

/** "Wed, Sep 16 at 2:00 PM". */
export function appointmentAt(startsAt: string): string {
  return `${CARD_DAY.format(new Date(startsAt))} at ${practiceTime(startsAt)}`;
}

/** "Chang" from "Dr. John Chang"; "Ricardo" from "Yanessa Ricardo, APRN". */
export function surnameOf(name: string): string {
  const words = name.split(",")[0].trim().split(/\s+/u);
  return words.at(-1) ?? name;
}

/** "JC" from "Dr. John Chang"; "YR" from "Yanessa Ricardo, APRN". */
export function initialsOf(name: string): string {
  const words = name
    .split(",")[0]
    .trim()
    .split(/\s+/u)
    .filter((word) => !/^(dr|mr|mrs|ms|mx)\.?$/iu.test(word));
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words.at(-1)?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

/** Which providers the week shows: two or three active `providers=`
    compare in the order given; otherwise an active `provider=`, then the
    remembered provider while still active, then the first active one. */
export function weekProviderIds(
  choice: Readonly<{
    activeIds: readonly string[];
    providers: string | readonly string[] | undefined;
    provider: string | readonly string[] | undefined;
    remembered: string | null;
  }>,
): string[] {
  const active = new Set(choice.activeIds);
  const compared = parseProviderIds(choice.providers).filter((id) => active.has(id));
  if (compared.length >= 2) return compared.slice(0, 3);
  const single = parseProviderIds(choice.provider).find((id) => active.has(id));
  if (single !== undefined) return [single];
  if (choice.remembered !== null && active.has(choice.remembered)) return [choice.remembered];
  return choice.activeIds.slice(0, 1);
}

/** "September 13 – 19", or "September 27 – October 3" across a month. */
export function weekRange(weekStart: string): string {
  const last = addDays(weekStart, 6);
  const from = MONTH_NAME.format(noon(weekStart));
  const until = MONTH_NAME.format(noon(last));
  const fromDay = Number(weekStart.slice(8));
  const untilDay = Number(last.slice(8));
  return from === until
    ? `${from} ${fromDay} – ${untilDay}`
    : `${from} ${fromDay} – ${until} ${untilDay}`;
}

export function weekHref(week: string | null, providerIds: readonly string[]): string {
  const params = new URLSearchParams({ view: "week" });
  if (week !== null) params.set("week", week);
  if (providerIds.length === 1) params.set("provider", providerIds[0]);
  else if (providerIds.length > 1) params.set("providers", providerIds.join(","));
  return `/admin/schedule?${params.toString().replaceAll("%2C", ",")}`;
}

/** The month the week mostly sits in: the one holding its Wednesday. */
export function monthOfWeek(weekStart: string): string {
  return addDays(weekStart, 3).slice(0, 7);
}
