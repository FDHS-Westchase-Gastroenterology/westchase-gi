import type { DateFilterParam, DateRange } from "./types";

/* `received` travels raw — `?received=1787457600000-1788148799999` — exactly
   like the reference, and renders through the practice clock. Preset ranges
   are *relative*: "Last 7 days" stored an hour ago must still read as
   "Last 7 days", so matching compares span and requires a now-ish end. */

const PRACTICE_TZ = "America/New_York";
const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

const NY_DAY = new Intl.DateTimeFormat("en-CA", { dateStyle: "short", timeZone: PRACTICE_TZ });
const NY_HOUR = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  hourCycle: "h23",
  timeZone: PRACTICE_TZ,
});
const NY_MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: PRACTICE_TZ,
});

/* America/New_York is UTC-5 or UTC-4; try both candidate offsets and keep the
   one that lands on the practice's midnight. Deterministic across DST, no
   wall-clock round-trip hacks. */
export function nyStartOfDayMs(day: string): number | null {
  for (const offset of ["-05:00", "-04:00"]) {
    const ms = Date.parse(`${day}T00:00:00${offset}`);
    if (!Number.isFinite(ms)) return null;
    const at = new Date(ms);
    if (NY_DAY.format(at) === day && NY_HOUR.format(at) === "00") return ms;
  }
  return null;
}

/** An epoch instant as the practice-local `<input type="date">` value. */
export function msToNyDay(ms: number): string {
  return NY_DAY.format(new Date(ms));
}

/** End of a practice-local day: the last millisecond before the next midnight. */
export function nyEndOfDayMs(day: string): number | null {
  const start = nyStartOfDayMs(day);
  if (start === null) return null;
  const nextDay = new Date(Date.parse(`${day}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
  const nextStart = nyStartOfDayMs(nextDay);
  return nextStart === null ? start + DAY_MS - 1 : nextStart - 1;
}

interface DatePreset {
  readonly id: "today" | "last7" | "last30" | "month";
  readonly label: string;
  readonly range: DateRange;
}

/* Snap "now" to the minute so a preset's encoded value string-matches itself
   across renders within the same minute. */
function minuteNow(nowMs: number): number {
  return Math.floor(nowMs / MINUTE_MS) * MINUTE_MS;
}

export function datePresets(nowMs: number): readonly DatePreset[] {
  const now = minuteNow(nowMs);
  const day = NY_DAY.format(new Date(now));
  const startToday = nyStartOfDayMs(day) ?? now - DAY_MS;
  const startMonth = nyStartOfDayMs(`${day.slice(0, 8)}01`) ?? startToday;
  return [
    { id: "today", label: "Today", range: { from: startToday, to: now } },
    { id: "last7", label: "Last 7 days", range: { from: now - 7 * DAY_MS, to: now } },
    { id: "last30", label: "Last 30 days", range: { from: now - 30 * DAY_MS, to: now } },
    { id: "month", label: "This month", range: { from: startMonth, to: now } },
  ];
}

/* A stored range still reads as its preset while its end is "now-ish" (within
   15 minutes) and its span matches — so pill labels and editor checks survive
   the minutes passing after activation, but an old shared link never
   mislabels a stale range as a live preset. */
export function matchesPreset(
  preset: Readonly<DatePreset>,
  value: Readonly<DateRange>,
  nowMs: number,
): boolean {
  if (preset.range.from === value.from && preset.range.to === value.to) return true;
  const presetSpan = preset.range.to - preset.range.from;
  const valueSpan = value.to - value.from;
  if (preset.id === "today" || preset.id === "month") {
    /* Anchored presets share a fixed start; only the end slides. */
    return (
      preset.range.from === value.from && Math.abs(minuteNow(nowMs) - value.to) < 15 * MINUTE_MS
    );
  }
  return (
    Math.abs(presetSpan - valueSpan) < MINUTE_MS &&
    Math.abs(minuteNow(nowMs) - value.to) < 15 * MINUTE_MS
  );
}

/** "Aug 23" for a practice-local day string (YYYY-MM-DD); malformed days echo back. */
export function dayLabel(day: string): string {
  const ms = nyStartOfDayMs(day);
  return ms === null ? day : NY_MONTH_DAY.format(new Date(ms));
}

/** "Aug 23 – 30", practice-local, for ranges that match no preset. */
export function dateRangeLabel(value: Readonly<DateRange>): string {
  return `${NY_MONTH_DAY.format(new Date(value.from))} – ${NY_MONTH_DAY.format(new Date(value.to))}`;
}

export const receivedFilter: DateFilterParam = {
  key: "received",
  label: "Received",
  type: "date",
  anyLabel: "Any date",
  encode: (value) => `${value.from}-${value.to}`,
  decode: (raw) => {
    const match = /^(\d+)-(\d+)$/.exec(raw);
    if (match === null) return null;
    const from = Number(match[1]);
    const to = Number(match[2]);
    return Number.isFinite(from) && Number.isFinite(to) && from <= to ? { from, to } : null;
  },
};
