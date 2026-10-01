import type {
  MonthAvailability,
  MonthAvailabilityDay,
  MonthAvailabilityReason,
} from "@/lib/portal/scheduling/read-contracts";

/* One booking month's days, read for the record card (issue #344; Figma
   Ypf9ohpRcGWF5C9T9bSvWW, 09d–09e): whether a day has an open start, what
   its disc is called, the starts its popover lists per provider, why a
   closed day is closed, and the providers and offices a typed-in start
   can go to. Days are practice-local YYYY-MM-DD and times HH:MM. */

/* ---- Days ---- */

const LONG_DAY = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});
const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" });

/** "Tuesday, September 22" for a practice-local YYYY-MM-DD. */
export function longDay(day: string): string {
  return LONG_DAY.format(new Date(`${day}T12:00:00Z`));
}

export function dayOf(
  availability: Readonly<MonthAvailability> | null,
  day: string,
): MonthAvailabilityDay | null {
  return availability?.days.find((row) => row.date === day) ?? null;
}

/** Whether a day carries the open disc. A day not read yet looks exactly
   like a day with nothing open: the month never shows a spinner. */
export function dayIsOpen(day: Readonly<MonthAvailabilityDay> | null): boolean {
  return day !== null && !day.past && day.open > 0;
}

function plural(count: number, one: string, many: string): string {
  return `${String(count)} ${count === 1 ? one : many}`;
}

/** The day button's accessible name: the day, then what it holds. */
export function dayAccessibleName(
  date: string,
  day: Readonly<MonthAvailabilityDay> | null,
): string {
  if (day === null || day.past) return longDay(date);
  return `${longDay(date)}, ${day.open === 0 ? "no open times" : plural(day.open, "open time", "open times")}`;
}

/** "4 open · 10 of 14 booked", the popover's subtitle. */
export function daySummary(day: Readonly<MonthAvailabilityDay>): string {
  return `${String(day.open)} open · ${String(day.booked)} of ${String(day.capacity)} booked`;
}

export interface OpenBlock {
  readonly providerId: string;
  readonly providerName: string;
  readonly locationId: string;
  readonly locationName: string;
  /** Open starts, plus the start that was just taken, struck. */
  readonly times: readonly { readonly time: string; readonly taken: boolean }[];
}

export interface TakenTime {
  readonly day: string;
  readonly providerId: string;
  readonly locationId: string;
  readonly time: string;
}

/** The providers with open starts on a day, one block per provider and
   office, in the read's order. A start somebody else just took stays in its
   block, struck, so staff see what moved. */
export function openBlocks(
  day: Readonly<MonthAvailabilityDay>,
  taken: Readonly<TakenTime> | null = null,
): readonly OpenBlock[] {
  const blocks: OpenBlock[] = [];
  for (const entry of day.providers) {
    if (entry.locationId === null || entry.locationName === null) continue;
    const times = entry.open.map((start) => ({ time: start.time, taken: false }));
    if (
      taken !== null &&
      taken.day === day.date &&
      taken.providerId === entry.providerId &&
      taken.locationId === entry.locationId &&
      !times.some((start) => start.time === taken.time)
    ) {
      times.push({ time: taken.time, taken: true });
      times.sort((a, b) => a.time.localeCompare(b.time));
    }
    if (times.length === 0) continue;
    blocks.push({
      providerId: entry.providerId,
      providerName: entry.providerName,
      locationId: entry.locationId,
      locationName: entry.locationName,
      times,
    });
  }
  return blocks;
}

/** The providers in on a day with nothing left, by name, once each. */
export function fullyBooked(day: Readonly<MonthAvailabilityDay>): readonly string[] {
  const open = new Set<string>();
  for (const entry of day.providers) if (entry.open.length > 0) open.add(entry.providerId);
  const names = new Set<string>();
  for (const entry of day.providers) {
    if (entry.reason === "booked_out" && !open.has(entry.providerId)) names.add(entry.providerName);
  }
  return [...names];
}

/** The line under a day's popover title: what the read says of the day. */
export function daySubtitle(
  day: Readonly<MonthAvailabilityDay> | null,
  openCount: number,
  status: "loading" | "ready" | "failed",
): string {
  if (day === null) return status === "failed" ? "Couldn't load open times" : "Finding open times…";
  return openCount === 0 ? "No open times" : daySummary(day);
}

export function reasonLabel(reason: MonthAvailabilityReason | null, date: string): string {
  if (reason === "no_hours") return `Not in on ${WEEKDAY.format(new Date(`${date}T12:00:00Z`))}s`;
  if (reason === "time_off") return "Time off";
  return "Fully booked";
}

/** Why a day has nothing open: one line per provider, the name and the reason. */
export function closedReasons(
  day: Readonly<MonthAvailabilityDay>,
): readonly { readonly providerId: string; readonly name: string; readonly reason: string }[] {
  const lines: { providerId: string; name: string; reason: string }[] = [];
  const seen = new Set<string>();
  for (const entry of day.providers) {
    if (seen.has(entry.providerId)) continue;
    seen.add(entry.providerId);
    lines.push({
      providerId: entry.providerId,
      name: entry.providerName,
      reason: reasonLabel(entry.reason, day.date),
    });
  }
  return lines;
}

function minutesOf(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}

/** The open start closest to one that was just taken: the same provider
   first, then anyone in that day. */
export function nearestOpen(
  day: Readonly<MonthAvailabilityDay>,
  taken: Readonly<TakenTime>,
): { readonly providerId: string; readonly locationId: string; readonly time: string } | null {
  let best: { providerId: string; locationId: string; time: string; score: number } | null = null;
  for (const entry of day.providers) {
    if (entry.locationId === null) continue;
    const same = entry.providerId === taken.providerId;
    for (const start of entry.open) {
      const score =
        (same ? 0 : 10_000) +
        Math.abs(minutesOf(start.time) - minutesOf(taken.time)) * 2 +
        (minutesOf(start.time) < minutesOf(taken.time) ? 1 : 0);
      if (best === null || score < best.score)
        best = {
          providerId: entry.providerId,
          locationId: entry.locationId,
          time: start.time,
          score,
        };
    }
  }
  return best === null
    ? null
    : { providerId: best.providerId, locationId: best.locationId, time: best.time };
}

/* ---- Squeeze-in: a provider and a time staff type themselves ---- */

export interface SqueezeOption {
  readonly value: string;
  readonly providerId: string;
  readonly locationId: string;
  readonly label: string;
}

/** Every provider and office the read covers, the office named only when
   the request could go to more than one. */
export function squeezeOptions(
  availability: Readonly<MonthAvailability>,
): readonly SqueezeOption[] {
  const offices = new Set(availability.locations.map((location) => location.id));
  const options: SqueezeOption[] = [];
  for (const provider of availability.providers) {
    for (const location of provider.locations) {
      if (!offices.has(location.id)) continue;
      options.push({
        value: `${provider.id}:${location.id}`,
        providerId: provider.id,
        locationId: location.id,
        label: offices.size > 1 ? `${provider.name} · ${location.name}` : provider.name,
      });
    }
  }
  return options;
}
