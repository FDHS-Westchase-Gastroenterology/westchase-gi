"use client";

import { useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";

import { Check } from "@/components/icons";
import { TypeIcon } from "@/components/patterns/type-icon";
import { PopoverTrigger } from "@/components/ui/popover";
import type { PopoverHandle } from "@/components/ui/popover-behavior";

import { moveFor, nextCell } from "./day-keyboard";
import { useMinuteClock } from "./minute-clock";
import type {
  DayAppointmentCell,
  DayCell,
  DayColumn,
  DayOpenCell,
  ScheduleDay,
} from "./schedule-day-model";
import { practiceTime } from "./week-calendar";
import type { WeekCardPayload } from "./week-cards";
import { nowOffset } from "./week-hours";

/* The day view's grid (issue #351; Figma Ypf9ohpRcGWF5C9T9bSvWW, page 02,
   S5, B6 and the keyboard frame): the hour gutter, then a column per
   provider working the date. Every block and open time opens the view's
   one card through `card`, the handle #345's week shares.

   - A scheduled visit offers Check in on its block from an hour before it
     starts until it ends, the window the server accepts; pointing at the
     block or focusing it shows the pill.
   - The day is one focus group: Tab enters it once, at the last block it
     left, and the arrows move through it (day-keyboard.ts). Return or
     Space opens the focused block's card, as a click does.
   - The now line and the Check in window follow the browser's clock; the
     rest is the day read the server rendered. */

type CssVars = CSSProperties & Record<`--${string}`, string | number>;

function place(values: Readonly<Record<`--${string}`, number>>): CssVars {
  return { ...values };
}

function cellKey(cell: Readonly<DayCell>): string {
  return cell.kind === "appointment" ? cell.id : cell.key;
}

function cellDomId(baseId: string, cell: Readonly<DayCell>): string {
  return `${baseId}-${cellKey(cell)}`;
}

function canCheckIn(cell: Readonly<DayAppointmentCell>, now: number | null): boolean {
  return (
    now !== null && cell.checkIn !== null && cell.checkIn.from <= now && now <= cell.checkIn.until
  );
}

/** "11:45 AM" → "11:45": the gutter's pill drops the half of day the hours already say. */
function clockOnly(now: number): string {
  return practiceTime(new Date(now).toISOString()).replace(/\s?[AP]M$/u, "");
}

export interface DayGridProps {
  readonly view: ScheduleDay;
  readonly baseId: string;
  readonly card: PopoverHandle<WeekCardPayload>;
  readonly onKeyed: (keyed: boolean) => void;
  /** The first arrow press: the view shows its keyboard hints. */
  readonly onArrow: () => void;
  readonly onCheckIn: (cell: DayAppointmentCell) => void;
  /** The visit whose Check in is in flight, if any. */
  readonly checking: string | null;
  /** The row under the grid: the hints, and who is not working. */
  readonly foot: ReactNode;
  /** What stands over the hours when there are no columns to show. */
  readonly overlay: ReactNode;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Base UI handles carry store member types that cannot be made readonly
export function DayGrid(props: DayGridProps) {
  const { view, baseId, onArrow } = props;
  const now = useMinuteClock();
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const activeIndex = Math.max(
    0,
    view.cells.findIndex((cell) => cellKey(cell) === activeKey),
  );
  const nowTop = now === null ? null : nowOffset(now, view.date, view.start, view.end);
  const style: CssVars = {
    "--dayview-columns": view.columns.length,
    "--dayview-height": view.end - view.start,
  };

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const move = moveFor(event.key);
    if (move === null || event.metaKey || event.ctrlKey || event.altKey) return;
    event.preventDefault();
    onArrow();
    const index = nextCell(view.cells, activeIndex, move);
    const next = view.cells.at(index);
    if (next === undefined) return;
    setActiveKey(cellKey(next));
    document.getElementById(cellDomId(baseId, next))?.focus();
  }

  return (
    <div className="wgi-schedule-surface wgi-dayview-surface">
      <div className="wgi-dayview-scroll">
        <div className="wgi-dayview-grid" style={style}>
          <div className="wgi-dayview-heads">
            <span className="wgi-dayview-gutter-head" aria-hidden="true" />
            {view.columns.map((column) => (
              <ColumnHead key={column.providerId} column={column} />
            ))}
          </div>
          {/* The arrows move focus inside the group; Tab leaves it. */}
          <div
            role="group"
            aria-label={`${view.title} by provider`}
            className="wgi-dayview-body"
            onKeyDown={onKeyDown}
          >
            <div className="wgi-dayview-gutter" aria-hidden="true">
              {view.hours.map((hour) => (
                <span
                  key={hour.minute}
                  className="wgi-dayview-hour"
                  style={place({ "--top": hour.minute })}
                >
                  {hour.label}
                </span>
              ))}
            </div>
            {view.columns.length === 0 ? (
              <div className="wgi-dayview-column" aria-hidden="true" />
            ) : null}
            {view.columns.map((column, lane) => (
              <div
                key={column.providerId}
                role="group"
                aria-label={column.label}
                className="wgi-dayview-column"
              >
                {column.shades.map((shade) => (
                  <span
                    key={shade.top}
                    className="wgi-dayview-shade"
                    aria-hidden="true"
                    style={place({ "--top": shade.top, "--height": shade.height })}
                  />
                ))}
                {view.cells.map((cell, index) =>
                  cell.lane === lane ? (
                    <DayCellView
                      key={cellKey(cell)}
                      {...props}
                      cell={cell}
                      now={now}
                      active={index === activeIndex}
                      onFocus={() => {
                        setActiveKey(cellKey(cell));
                      }}
                    />
                  ) : null,
                )}
              </div>
            ))}
            {nowTop === null || now === null ? null : (
              <span
                className="wgi-dayview-now"
                aria-hidden="true"
                style={place({ "--top": nowTop })}
              >
                <span className="wgi-dayview-now-time">{clockOnly(now)}</span>
              </span>
            )}
          </div>
        </div>
      </div>
      {view.columns.length === 0 ? (
        <div className="wgi-dayview-overlay">{props.overlay}</div>
      ) : null}
      {props.foot}
    </div>
  );
}

function ColumnHead({ column }: Readonly<{ column: DayColumn }>) {
  return (
    <div className="wgi-dayview-head" aria-hidden="true">
      <p className="wgi-dayview-name">{column.name}</p>
      <p className="wgi-dayview-place">
        {column.place}
        {column.count === null ? null : (
          <>
            {column.place === "" ? null : <span className="wgi-dayview-dot"> · </span>}
            {column.count.value === null ? (
              <b>{column.count.word}</b>
            ) : (
              <>
                <b>{column.count.value}</b> {column.count.word}
              </>
            )}
          </>
        )}
      </p>
    </div>
  );
}

interface CellViewProps extends DayGridProps {
  readonly cell: DayCell;
  readonly now: number | null;
  readonly active: boolean;
  readonly onFocus: () => void;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Base UI handles carry store member types that cannot be made readonly
function DayCellView({
  baseId,
  card,
  onKeyed,
  onCheckIn,
  checking,
  cell,
  now,
  active,
  onFocus,
}: CellViewProps) {
  const shared = {
    id: cellDomId(baseId, cell),
    handle: card,
    tabIndex: active ? 0 : -1,
    "aria-label": cell.label,
    onFocus,
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "Enter" || event.key === " ") onKeyed(true);
    },
    onPointerDown: () => {
      onKeyed(false);
    },
  };
  const position = place({ "--top": cell.top, "--height": cell.height });

  if (cell.kind === "open")
    return (
      <PopoverTrigger
        {...shared}
        payload={{ kind: "open", cell }}
        className="wgi-dayview-open"
        style={position}
      >
        <OpenBody cell={cell} />
      </PopoverTrigger>
    );

  const offer = canCheckIn(cell, now);
  return (
    <div className="wgi-dayview-block" data-tone={cell.tone} style={position}>
      <PopoverTrigger
        {...shared}
        payload={{ kind: "appointment", cell }}
        className="wgi-dayview-block-open"
        data-appointment={cell.id}
      >
        <span className="wgi-dayview-block-name" data-ui-redact="patient-name">
          {cell.name}
        </span>
        <span className="wgi-dayview-block-line">
          <TypeIcon icon={cell.icon} className="wgi-dayview-block-icon" />
          <span className="truncate">{cell.line}</span>
        </span>
        {cell.tag === null ? null : <span className="wgi-dayview-block-tag">{cell.tag}</span>}
      </PopoverTrigger>
      {offer ? (
        <button
          type="button"
          className="wgi-dayview-checkin"
          tabIndex={active ? 0 : -1}
          disabled={checking === cell.id}
          aria-label={`Check in ${cell.name}`}
          onFocus={onFocus}
          onClick={() => {
            onCheckIn(cell);
          }}
        >
          <Check width={14} height={14} aria-hidden="true" />
          {checking === cell.id ? "Checking in…" : "Check in"}
        </button>
      ) : null}
    </div>
  );
}

function OpenBody({ cell }: Readonly<{ cell: DayOpenCell }>) {
  return (
    <>
      <span className="wgi-dayview-open-disc" aria-hidden="true" />
      <span className="wgi-dayview-open-word">Open · {cell.time}</span>
      <span className="wgi-dayview-open-book">Book {cell.time}</span>
      <span className="wgi-dayview-open-length">{cell.length}</span>
    </>
  );
}
