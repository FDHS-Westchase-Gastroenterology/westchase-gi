import type { PlacementRefusal } from "@/lib/portal/scheduling/grid-contracts";
import { resolveAppointmentStart } from "@/lib/portal/scheduling/time";

import type { DayAppointmentCell, DayCell, ScheduleDay } from "./schedule-day-model";
import { practiceTime, timeRange } from "./week-calendar";

/* Moving a visit by dragging it on the Day view (issue #354; Figma
   Ypf9ohpRcGWF5C9T9bSvWW, page 02, Ap3): where a drag would land, what the
   grid already knows about that time, and the words the readout says. The
   server answers what the grid cannot see (the provider's types, a closed
   office, buffers) and checks every rule again when the card drops. */

/** Drops snap to the quarter hour. */
const SNAP_MINUTES = 15;

/** What the grid says about a time while the card is over it. */
export type DropVerdict =
  | { readonly kind: "origin" }
  | { readonly kind: "checking" }
  | { readonly kind: "open" }
  | {
      readonly kind: "refused";
      readonly refusal: PlacementRefusal;
      /** The visit already holding the time, when the refusal is slot_booked. */
      readonly conflictId: string | null;
    };

export interface DropTarget {
  readonly lane: number;
  /** Minutes from the grid's top, as a cell's `top`. */
  readonly top: number;
  readonly height: number;
  readonly providerId: string;
  readonly providerName: string;
  /** The office of the working window the start falls in; null outside the provider's hours. */
  readonly locationId: string | null;
  readonly locationName: string;
  readonly date: string;
  /** "14:00", the start a reschedule command carries. */
  readonly time: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly verdict: DropVerdict;
}

/** The provider, office and start a drop asks about; one can_place answer each. */
export function targetKey(
  target: Readonly<Pick<DropTarget, "providerId" | "locationId" | "startsAt">>,
) {
  return `${target.providerId}|${target.locationId ?? ""}|${target.startsAt}`;
}

export function durationOf(cell: Readonly<Pick<DayAppointmentCell, "startsAt" | "endsAt">>) {
  return Math.round((Date.parse(cell.endsAt) - Date.parse(cell.startsAt)) / 60_000);
}

function clock(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

/** Where a card whose top edge sits `offset` minutes below the grid's top would land in `lane`,
    or null when that start does not exist on the practice's clock. */
export function dropTargetAt(
  view: Readonly<Pick<ScheduleDay, "date" | "start" | "end" | "columns">>,
  cell: Readonly<DayAppointmentCell>,
  lane: number,
  offset: number,
): Omit<DropTarget, "verdict"> | null {
  const column = view.columns.at(lane);
  if (column === undefined) return null;
  const height = durationOf(cell);
  const latest = Math.max(0, view.end - view.start - height);
  const top = Math.min(latest, Math.max(0, Math.round(offset / SNAP_MINUTES) * SNAP_MINUTES));
  const time = clock(view.start + top);
  const startsAt = resolveAppointmentStart({ date: view.date, time });
  if (startsAt === null) return null;
  const at = Date.parse(startsAt);
  const window = column.working.find(
    (range) => Date.parse(range.from) <= at && at < Date.parse(range.until),
  );
  return {
    lane,
    top,
    height,
    providerId: column.providerId,
    providerName: column.name,
    locationId: window?.locationId ?? null,
    locationName: window?.locationName ?? column.place,
    date: view.date,
    time,
    startsAt,
    endsAt: new Date(at + height * 60_000).toISOString(),
  };
}

/** What the grid itself knows: the card's own time, a time already gone, a time outside the
    provider's hours, or a visit already there. Null leaves the answer to the server. */
export function localVerdict(
  cells: readonly DayCell[],
  cell: Readonly<DayAppointmentCell>,
  target: Readonly<Omit<DropTarget, "verdict">>,
  now: number,
): DropVerdict | null {
  if (target.providerId === cell.providerId && target.startsAt === cell.startsAt)
    return { kind: "origin" };
  if (Date.parse(target.startsAt) <= now)
    return { kind: "refused", refusal: "in_past", conflictId: null };
  if (target.locationId === null)
    return { kind: "refused", refusal: "outside_hours", conflictId: null };
  const conflict = cells.find(
    (other) =>
      other.kind === "appointment" &&
      other.id !== cell.id &&
      other.lane === target.lane &&
      other.top < target.top + target.height &&
      target.top < other.top + other.height,
  );
  return conflict?.kind === "appointment"
    ? { kind: "refused", refusal: "slot_booked", conflictId: conflict.id }
    : null;
}

/** "Yanessa Ricardo" from "Yanessa Ricardo, APRN": the readout names people, not credentials. */
function bareName(name: string): string {
  return name.split(",")[0].trim();
}

/** "procedure consultations" from "Procedure consultation", "infusion therapies" from
    "Infusion therapy". */
function typePlural(type: string): string {
  const lower = type.toLowerCase();
  if (lower.endsWith("s")) return lower;
  return /[^aeiou]y$/u.test(lower) ? `${lower.slice(0, -1)}ies` : `${lower}s`;
}

/** The readout over the target: who and when, or why the card cannot land there. */
export function readoutFor(target: Readonly<DropTarget>, type: string): string {
  const time = practiceTime(target.startsAt);
  const who = bareName(target.providerName);
  if (target.verdict.kind !== "refused") return `${target.providerName} · ${time}`;
  switch (target.verdict.refusal) {
    case "slot_booked":
      return `${time} with ${who} is booked`;
    case "type_not_offered":
      return `${who} doesn't see ${typePlural(type)}`;
    case "outside_hours":
      return `${time} is outside ${who}'s hours`;
    case "closed_day":
      return `${target.locationName} is closed this day`;
    case "in_past":
      return `${time} has already passed`;
    default:
      return target.verdict.refusal satisfies never;
  }
}

/** The lifted card's second line: the time it would land at, then the type. */
export function liftedLine(
  cell: Readonly<DayAppointmentCell>,
  target: Readonly<DropTarget> | null,
): string {
  return target === null
    ? cell.line
    : `${timeRange(target.startsAt, target.endsAt)} · ${cell.type}`;
}

/** A move the server has not confirmed yet, drawn where it landed until the day is read again. */
export interface PendingMove {
  /** The day read the move was made on: a fresh read replaces it. */
  readonly view: ScheduleDay;
  readonly id: string;
  readonly target: DropTarget;
}

/** The day with a dropped card already in its new place, and the open time it covers gone. */
export function withMove(view: Readonly<ScheduleDay>, move: Readonly<PendingMove> | null) {
  if (move === null || move.view !== view) return view;
  const { target } = move;
  const cells: DayCell[] = [];
  for (const cell of view.cells) {
    if (cell.kind !== "appointment") {
      const covered =
        cell.lane === target.lane &&
        cell.top < target.top + target.height &&
        target.top < cell.top + cell.height;
      if (!covered) cells.push(cell);
    } else if (cell.id !== move.id) {
      cells.push(cell);
    } else {
      const range = timeRange(target.startsAt, target.endsAt);
      cells.push({
        ...cell,
        lane: target.lane,
        top: target.top,
        height: target.height,
        providerId: target.providerId,
        providerName: target.providerName,
        startsAt: target.startsAt,
        endsAt: target.endsAt,
        movable: false,
        checkIn: null,
        line: `${range} · ${cell.type}`,
        label: `${cell.name}, ${cell.type.toLowerCase()}, ${practiceTime(target.startsAt)} to ${practiceTime(target.endsAt)}, ${target.providerName}`,
      });
    }
  }
  cells.sort((a, b) => a.top - b.top || a.lane - b.lane);
  return { ...view, cells };
}
