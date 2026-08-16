// Practice-local business context for appointment-request timestamps.
// The staff shell reads time the way the front desk does — "since
// Yesterday", "since Friday", "after hours" — not as raw durations.

// Office-hours envelope: Mon–Fri 8:00 AM – 5:00 PM America/New_York, the
// Wider of the two offices (Tampa closes 5:00 PM, Lutz 4:30 PM), so a
// 4:45 PM submission is never labeled after-hours while an office is open.
const OPEN_MINUTES = 8 * 60;
const CLOSE_MINUTES = 17 * 60;
const PRACTICE_TZ = "America/New_York";
const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const WEEKDAY_INDEX = new Map<string, number>([
  ["Sun", 0],
  ["Mon", 1],
  ["Tue", 2],
  ["Wed", 3],
  ["Thu", 4],
  ["Fri", 5],
  ["Sat", 6],
]);

const NY_CLOCK = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: PRACTICE_TZ,
});

// En-CA renders YYYY-MM-DD, which parses cleanly back into a UTC day number.
const NY_DAY = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "short",
  timeZone: PRACTICE_TZ,
});

const NY_WEEKDAY = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  timeZone: PRACTICE_TZ,
});

const NY_MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  timeZone: PRACTICE_TZ,
});

const NY_WALL = new Intl.DateTimeFormat("en-US", {
  timeZone: PRACTICE_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export type FollowUpChoice =
  | { kind: "this_afternoon" }
  | { kind: "tomorrow_morning" }
  | { kind: "friday" }
  | { kind: "day"; date: string }; // "YYYY-MM-DD", practice-local calendar day

interface PracticeClock {
  weekday: string;
  minutes: number;
}

function nyClock(date: Date): PracticeClock {
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

function ymdToDayNumber(ymd: string): number | null {
  if (!YMD_RE.test(ymd)) return null;
  const ms = Date.parse(`${ymd}T00:00:00Z`);
  if (Number.isNaN(ms)) return null;
  return Math.round(ms / 86_400_000);
}

function dayNumberToYmd(dayNumber: number): string {
  return new Date(dayNumber * 86_400_000).toISOString().slice(0, 10);
}

function isValidCalendarYmd(value: string): boolean {
  const match = YMD_RE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

interface PracticeWall {
  ymd: string;
  hour: number;
  minute: number;
}

function nyWallParts(date: Date): PracticeWall {
  const parts: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  for (const part of NY_WALL.formatToParts(date)) parts[part.type] = part.value;
  return {
    ymd: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

/** Absolute ISO instant for a practice-local wall time on a calendar day. */
function atPracticeLocal(
  ymd: string,
  hour: number,
  minute: number,
): string | null {
  if (!isValidCalendarYmd(ymd)) return null;
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  const utcGuess = Date.parse(`${ymd}T${hh}:${mm}:00.000Z`);
  if (Number.isNaN(utcGuess)) return null;

  // Derive the ET offset for the target day (DST-safe): treat the wall time
  // As UTC, see what NY shows, then shift by the difference.
  const shown = nyWallParts(new Date(utcGuess));
  const desiredDay = ymdToDayNumber(ymd);
  const shownDay = ymdToDayNumber(shown.ymd);
  if (desiredDay === null || shownDay === null) return null;
  const desiredMinutes = desiredDay * 1_440 + hour * 60 + minute;
  const shownMinutes = shownDay * 1_440 + shown.hour * 60 + shown.minute;
  return new Date(utcGuess + (desiredMinutes - shownMinutes) * 60_000).toISOString();
}

function daysUntilComingFriday(now: Date): number {
  const index = WEEKDAY_INDEX.get(nyClock(now).weekday);
  if (index === undefined) return 7;
  const delta = (5 - index + 7) % 7;
  return delta === 0 ? 7 : delta;
}

/**
 * Resolve a staff "call again" chip to an absolute timestamptz.
 * Returns null for unknown kinds, malformed dates, past days, or >90 days out.
 */
export function resolveFollowUpAt(
  choice: Readonly<FollowUpChoice>,
  now: Date = new Date(),
): string | null {
  const todayYmd = NY_DAY.format(now);
  const todayNumber = ymdToDayNumber(todayYmd);
  if (todayNumber === null) return null;

  switch (choice.kind) {
    case "this_afternoon":
      return atPracticeLocal(todayYmd, 13, 0);
    case "tomorrow_morning":
      return atPracticeLocal(dayNumberToYmd(todayNumber + 1), 9, 0);
    case "friday":
      return atPracticeLocal(
        dayNumberToYmd(todayNumber + daysUntilComingFriday(now)),
        9,
        0,
      );
    case "day": {
      if (!isValidCalendarYmd(choice.date)) return null;
      const targetNumber = ymdToDayNumber(choice.date);
      if (targetNumber === null) return null;
      if (targetNumber < todayNumber) return null;
      if (targetNumber > todayNumber + 90) return null;
      return atPracticeLocal(choice.date, 9, 0);
    }
    default:
      return null;
  }
}

export function arrivedOutsideOfficeHours(iso: string): boolean {
  const { weekday, minutes } = nyClock(new Date(iso));
  if (weekday === "Sat" || weekday === "Sun") return true;
  return minutes < OPEN_MINUTES || minutes >= CLOSE_MINUTES;
}

// The instant a silent touched row becomes attention again: the most recent
// Business-day 08:00 ET strictly before `now`. (Before today's 08:00 on a
// Weekday, the boundary is the previous business day's 08:00; on weekends it
// Is Friday 08:00.)
export function previousBusinessMorningBoundary(now: Date = new Date()): Date {
  let day = nyDayNumber(now) - 1;
  for (;;) {
    const ymd = dayNumberToYmd(day);
    const probeIso = atPracticeLocal(ymd, 12, 0);
    if (probeIso === null || probeIso === "") {
      day -= 1;
      continue;
    }
    const { weekday } = nyClock(new Date(probeIso));
    if (weekday !== "Sat" && weekday !== "Sun") {
      const morningIso = atPracticeLocal(ymd, OPEN_MINUTES / 60, 0);
      if (morningIso === null || morningIso === "") {
        day -= 1;
        continue;
      }
      return new Date(morningIso);
    }
    day -= 1;
  }
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
