"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import Link from "next/link";
import type { CSSProperties, KeyboardEvent } from "react";

import { TypeIcon } from "@/components/patterns/type-icon";
import { PopoverTrigger } from "@/components/ui/popover";
import type { PopoverHandle } from "@/components/ui/popover-behavior";

import { useMinuteClock } from "./minute-clock";
import { useOpenRecordVisits } from "./schedule-people";
import type {
  ScheduleWeek,
  WeekAppointmentCell,
  WeekCell,
  WeekColumn,
  WeekLane,
  WeekOpenCell,
} from "./schedule-week-model";
import { rememberWeekProvider } from "./week-actions";
import { dayHref, dayTitle, weekHref } from "./week-calendar";
import type { WeekCardPayload } from "./week-cards";
import { nowOffset } from "./week-hours";

/* The week view's grid (issue #345): the hour gutter, then a column per
   day — a strip for a day without hours, lanes for each provider shown,
   and a trigger per cell that opens the one shared card. Its tooltips and
   card are the view's own (schedule-week.tsx), reached through the
   handles in `Grid`. */

type TipSide = "top" | "bottom" | "left" | "right";

export interface TipPayload {
  readonly lines: readonly string[];
  readonly side: TipSide;
}

/** What every piece of the grid shares: the week, the handles, and the
    keyboard flag the card reads. `band` is the tooltip of the tall
    targets, strips and Off lanes, which follows the pointer's height. */
export interface Grid {
  readonly view: ScheduleWeek;
  readonly baseId: string;
  readonly tip: Tooltip.Handle<TipPayload>;
  readonly band: Tooltip.Handle<TipPayload>;
  readonly card: PopoverHandle<WeekCardPayload>;
  readonly onKeyed: (keyed: boolean) => void;
}

type CssVars = CSSProperties & Record<`--${string}`, string | number>;

/** Places a grid piece: its minute offsets and lane as custom properties. */
function place(values: Readonly<Record<`--${string}`, number>>): CssVars {
  return { ...values };
}

function cellDomId(baseId: string, cell: Readonly<WeekCell>): string {
  return `${baseId}-${cell.kind === "appointment" ? cell.id : cell.key}`;
}

/* ---- The grid: the hour gutter, then a column per day ---- */

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Base UI handles carry store member types that cannot be made readonly
export function WeekGrid({ grid }: Readonly<{ grid: Grid }>) {
  const { view } = grid;
  const now = useMinuteClock();
  /* A day without hours folds to a strip beside the days that have them; a
     week without hours anywhere keeps its seven days at full width. */
  const fold = view.columns.some((column) => column.kind === "day");
  const columns: CssVars = {
    "--week-columns": view.columns
      .map((column) => (fold && column.kind === "strip" ? "1.5rem" : "minmax(0, 1fr)"))
      .join(" "),
    "--week-height": view.end - view.start,
    "--lanes": view.providers.length,
  };

  return (
    <div className="wgi-schedule-surface wgi-week-surface">
      <div className="wgi-week-grid" data-compare={view.compare || undefined} style={columns}>
        <div className="wgi-week-gutter" aria-hidden="true">
          <div className="wgi-week-gutter-head" />
          <div className="wgi-week-gutter-body">
            {view.hours.map((hour) => (
              <span
                key={hour.minute}
                className="wgi-week-hour"
                style={place({ "--top": hour.minute })}
              >
                {hour.label}
              </span>
            ))}
          </div>
        </div>
        {view.columns.map((column, index) =>
          column.kind === "strip" ? (
            <WeekStrip key={column.date} grid={grid} column={column} first={index === 0} />
          ) : (
            <WeekDay key={column.date} grid={grid} column={column} now={now} />
          ),
        )}
      </div>
    </div>
  );
}

/* A day without hours folds to a strip; resting on it names the day. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Base UI handles carry store member types that cannot be made readonly
function WeekStrip({
  grid,
  column,
  first,
}: Readonly<{ grid: Grid; column: Extract<WeekColumn, { kind: "strip" }>; first: boolean }>) {
  return (
    <Tooltip.Trigger
      handle={grid.band}
      payload={{ lines: [column.hint], side: first ? "right" : "left" }}
      render={<div role="group" aria-label={column.label} className="wgi-week-strip" />}
    >
      <span className="wgi-week-strip-day" aria-hidden="true">
        {column.weekday}
        <br />
        {column.day}
      </span>
    </Tooltip.Trigger>
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Base UI handles carry store member types that cannot be made readonly
function WeekDay({
  grid,
  column,
  now,
}: Readonly<{ grid: Grid; column: Exclude<WeekColumn, { kind: "strip" }>; now: number | null }>) {
  const { view } = grid;
  const nowTop = now === null ? null : nowOffset(now, column.date, view.start, view.end);

  return (
    <div
      role="group"
      aria-label={column.label}
      className="wgi-week-day"
      data-today={column.today || undefined}
    >
      <div className="wgi-week-day-head">
        {/* The day's head opens it in the day view (issue #351). */}
        <Link
          href={dayHref(column.date)}
          className="wgi-week-day-date"
          aria-label={`Open ${dayTitle(column.date)}`}
        >
          {column.weekday}
          <span className="wgi-week-day-number">{column.day}</span>
        </Link>
        <p className="wgi-week-day-count" aria-hidden="true">
          {column.count === null ? null : column.count.value === null ? (
            <b>{column.count.word}</b>
          ) : (
            <>
              <b>{column.count.value}</b> {column.count.word}
            </>
          )}
        </p>
        {view.compare ? (
          <div className="wgi-week-lane-labels">
            {column.lanes.map((lane) => (
              <LaneLabel key={lane.providerId} grid={grid} lane={lane} />
            ))}
          </div>
        ) : null}
      </div>
      <div className="wgi-week-day-body">
        {column.lanes.map((lane, laneIndex) =>
          lane.shades.map((shade) => (
            <span
              key={`${lane.providerId}:${shade.top}`}
              className="wgi-week-shade"
              aria-hidden="true"
              style={place({ "--top": shade.top, "--height": shade.height, "--lane": laneIndex })}
            />
          )),
        )}
        {view.compare
          ? column.lanes.map((lane, laneIndex) =>
              lane.off ? (
                <Tooltip.Trigger
                  key={`off:${lane.providerId}`}
                  handle={grid.band}
                  payload={{ lines: [lane.offLabel], side: "bottom" }}
                  render={
                    <span
                      className="wgi-week-off"
                      style={place({ "--lane": laneIndex })}
                      aria-hidden="true"
                    />
                  }
                >
                  Off
                </Tooltip.Trigger>
              ) : null,
            )
          : null}
        {column.cells.map((cell) => (
          <WeekCellTrigger
            key={cell.kind === "appointment" ? cell.id : cell.key}
            grid={grid}
            cell={cell}
          />
        ))}
        {nowTop === null ? null : (
          <span className="wgi-week-now" aria-hidden="true" style={place({ "--top": nowTop })} />
        )}
      </div>
    </div>
  );
}

/* In compare mode a lane label names its provider; a click shows that
   provider's week alone. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Base UI handles carry store member types that cannot be made readonly
function LaneLabel({ grid, lane }: Readonly<{ grid: Grid; lane: WeekLane }>) {
  return (
    <Tooltip.Trigger
      handle={grid.tip}
      payload={{ lines: [lane.name], side: "top" }}
      render={
        <Link
          href={weekHref(grid.view.weekStart, [lane.providerId])}
          className="wgi-week-lane-label"
          aria-label={`Show only ${lane.name}`}
          onClick={() => {
            void rememberWeekProvider(lane.providerId);
          }}
        />
      }
    >
      <span className="wgi-week-lane-name">{lane.surname}</span>
    </Tooltip.Trigger>
  );
}

/* Every cell opens the one card through the shared handle. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Base UI handles carry store member types that cannot be made readonly
function WeekCellTrigger({ grid, cell }: Readonly<{ grid: Grid; cell: WeekCell }>) {
  const recordOpen = useOpenRecordVisits();
  const shared = {
    id: cellDomId(grid.baseId, cell),
    handle: grid.card,
    payload:
      cell.kind === "appointment"
        ? ({ kind: "appointment", cell } as const)
        : ({ kind: "open", cell } as const),
    "aria-label": cell.label,
    style: place({ "--top": cell.top, "--height": cell.height, "--lane": cell.lane }),
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "Enter" || event.key === " ") grid.onKeyed(true);
    },
    onPointerDown: () => {
      grid.onKeyed(false);
    },
  };
  if (cell.kind === "open")
    return (
      <PopoverTrigger {...shared} className="wgi-week-open">
        <OpenBody cell={cell} />
      </PopoverTrigger>
    );
  const attrs = {
    ...shared,
    className: "wgi-week-cell",
    "data-state": cell.state,
    "data-short": cell.short || undefined,
    "data-appointment": cell.id,
    "data-record-open": recordOpen.has(cell.id) || undefined,
  };
  if (!grid.view.compare)
    return (
      <PopoverTrigger {...attrs}>
        <AppointmentBody cell={cell} compare={false} />
      </PopoverTrigger>
    );
  return (
    <Tooltip.Trigger
      handle={grid.tip}
      payload={{ lines: cell.tooltip, side: "top" }}
      render={<PopoverTrigger {...attrs} />}
    >
      <AppointmentBody cell={cell} compare />
    </Tooltip.Trigger>
  );
}

/* ---- Cell bodies ---- */

function AppointmentBody({
  cell,
  compare,
}: Readonly<{ cell: WeekAppointmentCell; compare: boolean }>) {
  return (
    <>
      <span className="wgi-week-cell-line">
        <span className="wgi-week-cell-name" data-ui-redact="patient-name">
          {cell.name}
        </span>
        {compare ? null : (
          <span className="wgi-week-cell-type">
            <TypeIcon icon={cell.icon} className="wgi-week-cell-icon" />
            {cell.type}
          </span>
        )}
      </span>
      {cell.status === null ? null : (
        <span className="wgi-week-cell-status" data-status={cell.status}>
          {cell.status}
        </span>
      )}
    </>
  );
}

function OpenBody({ cell }: Readonly<{ cell: WeekOpenCell }>) {
  return (
    <>
      <span className="wgi-week-open-disc" aria-hidden="true" />
      <span className="wgi-week-open-word">Open</span>
      <span className="wgi-week-open-book">Book {cell.time}</span>
    </>
  );
}
