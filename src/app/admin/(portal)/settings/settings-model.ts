import { addDays, practiceDate } from "@/app/admin/(portal)/schedule/week-calendar";
import type { SchedulingFailureCode } from "@/lib/portal/scheduling/contracts";
import type {
  SettingsLocation,
  SettingsProvider,
  TimeOffReason,
} from "@/lib/portal/scheduling/settings-contracts";

/* The Settings window's Schedule group (issue #352): the words and times its
   panes share. Minutes count from the practice day's midnight; weekdays are
   0 (Sunday) to 6, listed Monday first the way the practice's week reads. */

/* ---- Failures ---- */

const FAILURE_COPY = new Map<SchedulingFailureCode, string>([
  ["stale_version", "Someone else just changed this. The page has the latest; try again."],
  [
    "schedule_in_use",
    "Upcoming appointments fall outside that. Move them first, then change this.",
  ],
  ["outside_office_hours", "Those hours run past the office's hours for that day."],
  ["type_in_use", "Appointments have used this type, so it can only be turned off."],
  ["already_closed", "The office is already closed that day."],
  ["location_unavailable", "That office isn't taking appointments."],
  ["not_found", "That was just removed. The page has the latest."],
  ["forbidden", "Only an administrator can change Settings."],
  ["invalid_command", "That change isn't valid. Check the values and try again."],
]);

export function settingsFailureMessage(code: SchedulingFailureCode): string {
  return FAILURE_COPY.get(code) ?? "Settings couldn't save that. Try again.";
}

/* ---- Times ---- */

export const QUARTER_HOUR = 15;

/** "8:00 AM", "12:30 PM". */
export function clockOf(minute: number): string {
  const hour = Math.floor(minute / 60) % 24;
  const suffix = hour < 12 ? "AM" : "PM";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:${String(minute % 60).padStart(2, "0")} ${suffix}`;
}

/** "8:00 AM – 5:00 PM", or "8:00 – 11:30 AM" within one half of the day. */
export function clockRange(open: number, close: number): string {
  const from = clockOf(open);
  const until = clockOf(close);
  return from.slice(-2) === until.slice(-2)
    ? `${from.slice(0, -3)} – ${until}`
    : `${from} – ${until}`;
}

/** The hour ruler's labels, every two hours from `first` to `last` (whole hours, in minutes):
    "8 AM", "10", "Noon", "2 PM", "4", "6 PM". The meridiem shows at the ends and after Noon. */
export function rulerLabels(first: number, last: number): { minute: number; label: string }[] {
  const labels: { minute: number; label: string }[] = [];
  for (let minute = first; minute <= last; minute += 120) {
    const hour = minute / 60;
    const twelve = hour % 12 === 0 ? 12 : hour % 12;
    const ends = minute === first || minute + 120 > last || labels.at(-1)?.label === "Noon";
    const label =
      hour === 12 ? "Noon" : ends ? `${String(twelve)} ${hour < 12 ? "AM" : "PM"}` : String(twelve);
    labels.push({ minute, label });
  }
  return labels;
}

/* ---- Weekdays ---- */

export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** A weekday's place in WEEK_ORDER: Monday 0, Sunday 6. */
export function weekRank(weekday: number): number {
  return (weekday + 6) % 7;
}
const SHORT_DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const LONG_DAY = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function shortDay(weekday: number): string {
  return SHORT_DAY[weekday] ?? "";
}

export function longDay(weekday: number): string {
  return LONG_DAY[weekday] ?? "";
}

/** "Mon–Fri", "Mon, Tue, Thu", "Mon–Thu, Sat": runs of three or more read as a span. */
export function dayRuns(weekdays: Iterable<number>): string {
  const set = new Set(weekdays);
  const ordered = WEEK_ORDER.filter((day) => set.has(day));
  const runs: number[][] = [];
  for (const day of ordered) {
    const run = runs.at(-1);
    const last = run?.at(-1);
    if (run !== undefined && last !== undefined && weekRank(last) + 1 === weekRank(day))
      run.push(day);
    else runs.push([day]);
  }
  return runs
    .flatMap((run) =>
      run.length >= 3
        ? [`${shortDay(run[0] ?? 0)}–${shortDay(run.at(-1) ?? 0)}`]
        : run.map((day) => shortDay(day)),
    )
    .join(", ");
}

/* ---- Locations ---- */

/** "Tampa" from "Tampa Office". */
export function placeName(location: Readonly<Pick<SettingsLocation, "name">>): string {
  return location.name.replace(/\s+office$/iu, "");
}

/* ---- Providers ---- */

export type WeeklyWindow = SettingsProvider["hours"][number];

/** The provider's week as it stands today: rows in force today, ordered by day and time. */
export function currentHours(
  provider: Readonly<Pick<SettingsProvider, "hours">>,
  today: string,
): WeeklyWindow[] {
  return provider.hours
    .filter((row) => row.validFrom <= today && (row.validTo === null || row.validTo >= today))
    .toSorted((a, b) => weekRank(a.weekday) - weekRank(b.weekday) || a.openMinute - b.openMinute);
}

/** The list row's second line: "Tampa, Lutz · Mon–Fri", or "No weekly hours". */
export function providerSubline(
  hours: readonly WeeklyWindow[],
  locations: readonly SettingsLocation[],
): string {
  if (hours.length === 0) return "No weekly hours";
  const places = locations.flatMap((location) =>
    hours.some((row) => row.locationId === location.id) ? [placeName(location)] : [],
  );
  return `${places.join(", ")} · ${dayRuns(hours.map((row) => row.weekday))}`;
}

/** How the Appointment types list names a provider: "Dr. Chang" for a doctor, else the
    surname alone ("Ricardo" from "Yanessa Ricardo, APRN"). */
export function shortName(name: string): string {
  const words = (name.split(",")[0] ?? name).trim().split(/\s+/u);
  const surname = words.at(-1) ?? name;
  return /^dr\.?$/iu.test(words[0] ?? "") && words.length > 1 ? `Dr. ${surname}` : surname;
}

/* ---- Time off ---- */

const REASON_LABEL = {
  personal: "Personal",
  conference: "Conference",
  holiday: "Holiday",
} as const satisfies Record<TimeOffReason, string>;

export function reasonLabel(reason: TimeOffReason): string {
  return REASON_LABEL[reason];
}

const SHORT_DATE = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** "Mon, Oct 5". */
export function shortDate(date: string): string {
  return SHORT_DATE.format(new Date(`${date}T12:00:00Z`));
}

/** "Mon, Oct 5 – Fri, Oct 9", or one day alone. */
export function dateRange(first: string, last: string): string {
  return first === last ? shortDate(first) : `${shortDate(first)} – ${shortDate(last)}`;
}

/** The practice dates a time-off row covers, first and last. */
export function timeOffDays(
  entry: Readonly<Pick<SettingsProvider["timeOff"][number], "startsAt" | "endsAt">>,
) {
  const first = practiceDate(new Date(entry.startsAt));
  const last = practiceDate(new Date(new Date(entry.endsAt).getTime() - 1));
  return { first, last: last < first ? first : last };
}

/** Every practice date from `first` to `last`. */
export function datesBetween(first: string, last: string): string[] {
  const days: string[] = [];
  for (let day = first; day <= last && days.length < 400; day = addDays(day, 1)) days.push(day);
  return days;
}

/** "4 appointments are booked on these days." */
export function bookedCount(count: number, span: "these days" | "this day"): string {
  return count === 1
    ? `1 appointment is booked on ${span}.`
    : `${String(count)} appointments are booked on ${span}.`;
}
