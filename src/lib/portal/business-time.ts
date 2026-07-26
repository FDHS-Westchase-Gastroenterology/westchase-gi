// Practice-local business context for appointment-request timestamps.
// The staff shell reads time the way the front desk does — "since
// yesterday", "since Friday", "after hours" — not as raw durations.

// Office-hours envelope: Mon–Fri 8:00 AM – 5:00 PM America/New_York, the
// wider of the two offices (Tampa closes 5:00 PM, Lutz 4:30 PM), so a
// 4:45 PM submission is never labeled after-hours while an office is open.
const OPEN_MINUTES = 8 * 60;
const CLOSE_MINUTES = 17 * 60;

const NY_CLOCK = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "America/New_York",
});

// en-CA renders YYYY-MM-DD, which parses cleanly back into a UTC day number.
const NY_DAY = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "short",
  timeZone: "America/New_York",
});

const NY_WEEKDAY = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  timeZone: "America/New_York",
});

const NY_MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  timeZone: "America/New_York",
});

function nyClock(date: Date): { weekday: string; minutes: number } {
  const parts: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  for (const part of NY_CLOCK.formatToParts(date)) parts[part.type] = part.value;
  return {
    weekday: parts.weekday ?? "",
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function nyDayNumber(date: Date): number {
  return Math.round(
    Date.parse(`${NY_DAY.format(date)}T00:00:00Z`) / 86_400_000,
  );
}

export function arrivedOutsideOfficeHours(iso: string): boolean {
  const { weekday, minutes } = nyClock(new Date(iso));
  if (weekday === "Sat" || weekday === "Sun") return true;
  return minutes < OPEN_MINUTES || minutes >= CLOSE_MINUTES;
}

// "yesterday", a weekday name within the past week, or "July 18" beyond it.
// Null while the request arrived on the current practice-local calendar day.
export function waitingSince(
  iso: string,
  now: Date = new Date(),
): string | null {
  const created = new Date(iso);
  const dayDiff = nyDayNumber(now) - nyDayNumber(created);
  if (dayDiff <= 0) return null;
  if (dayDiff === 1) return "yesterday";
  if (dayDiff <= 6) return NY_WEEKDAY.format(created);
  return NY_MONTH_DAY.format(created);
}
