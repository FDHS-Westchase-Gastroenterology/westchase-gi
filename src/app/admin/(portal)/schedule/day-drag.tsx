"use client";

import { useEffect, useRef, useState } from "react";
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from "react";
import { createPortal } from "react-dom";

import { CalendarX, CircleAlert } from "@/components/icons";

import { dropTargetAt, liftedLine, localVerdict, readoutFor, targetKey } from "./day-drag-model";
import type { DropTarget, DropVerdict } from "./day-drag-model";
import type { DayAppointmentCell, ScheduleDay } from "./schedule-day-model";
import { canPlaceAppointment, readWeekAppointment } from "./week-actions";
import type { WeekAppointmentOutcome } from "./week-actions";

/* Dragging a visit to another time or provider on the Day view (issue #354;
   Figma Ypf9ohpRcGWF5C9T9bSvWW, page 02, Ap3). HIG Drag and drop: the item
   lifts and follows the pointer from where it was grabbed, its place stays
   behind as a ghost, the destination says whether it accepts the drop
   before the drop, and a refused drop returns the item to where it came
   from.

   - A press becomes a drag after 4px of travel, so a click still opens the
     card; the click that ends a drag is swallowed.
   - Mouse and pen only. Touch scrolls the grid; Reschedule on the card is
     the keyboard's and touch's path to the same move.
   - The grid answers what it can see at once (the card's own time, a time
     gone, outside hours, a visit there); the server answers the rest
     through can_place, one question at a time, and only for where the card
     rests. Escape returns the card. */

type CssVars = CSSProperties & Record<`--${string}`, string | number>;

/** Travel, in CSS pixels, before a press becomes a drag. */
const DRAG_SLOP = 4;
/** How long the card rests over a time before the server is asked about it. */
const ASK_AFTER_MS = 90;
/** The return's fallback when no transitionend arrives. */
const RETURN_FALLBACK_MS = 600;

export interface Lifted {
  readonly cell: DayAppointmentCell;
  /** The block's box when it was lifted: the card is drawn from it. */
  readonly rect: Readonly<{ left: number; top: number; width: number; height: number }>;
  /** Where the card is drawn: above the grid, whose blocks clip their contents. */
  readonly host: HTMLElement;
}

interface Session {
  readonly cell: DayAppointmentCell;
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly grabY: number;
  readonly block: HTMLElement;
  readonly read: Promise<WeekAppointmentOutcome>;
  readonly answers: Map<string, DropVerdict>;
  /** Providers that do not see this visit's type: every time in their column is refused. */
  readonly ineligible: Set<string>;
  target: DropTarget | null;
  dx: number;
  dy: number;
  asking: boolean;
  /** Released over a time the server has not answered for yet: the card waits there. */
  dropped: boolean;
  askTimer: number | null;
  stop: () => void;
}

export interface DayDropHandler {
  (cell: DayAppointmentCell, target: DropTarget, read: Promise<WeekAppointmentOutcome>): void;
}

export interface DayDrag {
  readonly lifted: Lifted | null;
  readonly target: DropTarget | null;
  readonly cardRef: RefObject<HTMLDivElement | null>;
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM events carry framework member types that cannot be made readonly
  readonly onPointerDown: (event: ReactPointerEvent<HTMLElement>, cell: DayAppointmentCell) => void;
  readonly onClickCapture: (event: ReactMouseEvent<HTMLElement>) => void;
}

function verdictFromAnswer(answer: Awaited<ReturnType<typeof canPlaceAppointment>>): DropVerdict {
  if (!answer.ok) return { kind: "checking" };
  return answer.placeable
    ? { kind: "open" }
    : { kind: "refused", refusal: answer.refusal, conflictId: answer.conflictId };
}

export function useDayDrag({
  view,
  bodyRef,
  onLift,
  onDrop,
}: Readonly<{
  view: ScheduleDay;
  bodyRef: RefObject<HTMLDivElement | null>;
  onLift: () => void;
  onDrop: DayDropHandler;
}>): DayDrag {
  const [lifted, setLifted] = useState<Lifted | null>(null);
  const [target, setTarget] = useState<DropTarget | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const session = useRef<Session | null>(null);
  const swallowClick = useRef(false);
  /* The listeners outlive a render; they read the latest day and handlers here. */
  const latest = useRef({ view, onLift, onDrop });
  useEffect(() => {
    latest.current = { view, onLift, onDrop };
  });

  useEffect(
    () => () => {
      session.current?.stop();
    },
    [],
  );

  function show(next: DropTarget | null) {
    const live = session.current;
    if (live === null) return;
    live.target = next;
    setTarget(next);
  }

  /* One can_place question in flight at a time (Server Actions run one by
     one), always about where the card is now. */
  function ask() {
    const live = session.current;
    const want = live?.target;
    if (live === null || want === null || want === undefined || live.asking) return;
    if (want.verdict.kind !== "checking" || want.locationId === null) return;
    const key = targetKey(want);
    live.asking = true;
    void canPlaceAppointment({
      appointmentId: live.cell.id,
      providerId: want.providerId,
      locationId: want.locationId,
      startsAt: want.startsAt,
    })
      .then(verdictFromAnswer, (): DropVerdict => ({ kind: "checking" }))
      .then((verdict) => {
        if (session.current !== live) return;
        live.asking = false;
        if (verdict.kind !== "checking") live.answers.set(key, verdict);
        if (verdict.kind === "refused" && verdict.refusal === "type_not_offered")
          live.ineligible.add(want.providerId);
        const now = live.target;
        const current = now !== null && targetKey(now) === key;
        if (current) show({ ...now, verdict });
        if (!live.dropped) {
          if (!current) schedule();
        } else if (!current && now?.verdict.kind === "checking") ask();
        else land();
      });
  }

  function schedule() {
    const live = session.current;
    if (live === null) return;
    if (live.askTimer !== null) window.clearTimeout(live.askTimer);
    live.askTimer = window.setTimeout(() => {
      live.askTimer = null;
      ask();
    }, ASK_AFTER_MS);
  }

  function aim(clientX: number, clientY: number) {
    const live = session.current;
    const body = bodyRef.current;
    if (live === null || body === null) return;
    const { view: day } = latest.current;
    const lanes = body.querySelectorAll<HTMLElement>("[data-lane]");
    let next: DropTarget | null = null;
    for (const column of lanes) {
      const box = column.getBoundingClientRect();
      const inside =
        box.left <= clientX &&
        clientX < box.right &&
        box.top - 24 <= clientY &&
        clientY <= box.bottom + 24;
      if (!inside) continue;
      const lane = Number(column.dataset.lane);
      const minute = box.height / (day.end - day.start);
      const spot = dropTargetAt(day, live.cell, lane, (clientY - live.grabY - box.top) / minute);
      if (spot === null) break;
      const key = targetKey(spot);
      const verdict: DropVerdict =
        localVerdict(day.cells, live.cell, spot, Date.now()) ??
        live.answers.get(key) ??
        (live.ineligible.has(spot.providerId)
          ? { kind: "refused", refusal: "type_not_offered", conflictId: null }
          : { kind: "checking" });
      next = { ...spot, verdict };
      break;
    }
    const before = live.target;
    if (before === null && next === null) return;
    if (before !== null && next !== null && targetKey(before) === targetKey(next)) return;
    show(next);
    if (next?.verdict.kind === "checking") schedule();
  }

  function follow(clientX: number, clientY: number) {
    const live = session.current;
    if (live === null) return;
    live.dx = clientX - live.startX;
    live.dy = clientY - live.startY;
    if (cardRef.current !== null) cardRef.current.style.translate = `${live.dx}px ${live.dy}px`;
    aim(clientX, clientY);
  }

  function end() {
    const live = session.current;
    if (live === null) return;
    live.stop();
    session.current = null;
    setTarget(null);
  }

  /* A refused drop, Escape or a lost pointer: the card glides back to its
     ghost and the ghost fills in again. */
  function sendHome() {
    const live = session.current;
    const card = cardRef.current;
    if (live === null) return;
    const from = live.block.getBoundingClientRect();
    end();
    if (card === null) {
      setLifted(null);
      return;
    }
    const origin = card.getBoundingClientRect();
    const dx = live.dx + from.left - origin.left;
    const dy = live.dy + from.top - origin.top;
    let done = false;
    const settle = () => {
      if (done) return;
      done = true;
      setLifted(null);
    };
    card.dataset.returning = "";
    card.addEventListener("transitionend", settle, { once: true });
    window.setTimeout(settle, RETURN_FALLBACK_MS);
    card.style.translate = `${dx}px ${dy}px`;
  }

  /* A drop over a time still being checked waits for that answer: a
     refusal returns the card like any other. If the answer cannot be had,
     the drop lands and the server's own check on the move decides. */
  function drop() {
    const live = session.current;
    if (live === null) return;
    live.stop();
    live.dropped = true;
    if (live.target?.verdict.kind === "checking") {
      if (!live.asking) ask();
      return;
    }
    land();
  }

  function land() {
    const live = session.current;
    if (live === null) return;
    const landing = live.target;
    if (
      landing === null ||
      landing.verdict.kind === "origin" ||
      landing.verdict.kind === "refused"
    ) {
      sendHome();
      return;
    }
    const { cell, read } = live;
    end();
    setLifted(null);
    latest.current.onDrop(cell, landing, read);
  }

  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM events carry framework member types that cannot be made readonly
  function onPointerDown(event: ReactPointerEvent<HTMLElement>, cell: DayAppointmentCell) {
    swallowClick.current = false;
    if (!cell.movable || event.button !== 0 || event.pointerType === "touch") return;
    if (session.current !== null || lifted !== null) return;
    const handle = event.currentTarget;
    const block = handle.parentElement;
    if (block === null) return;
    const { pointerId, clientX: startX, clientY: startY } = event;
    let dragging = false;

    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM events carry framework member types that cannot be made readonly
    const move = (moved: PointerEvent) => {
      if (moved.pointerId !== pointerId) return;
      if (!dragging) {
        if (Math.hypot(moved.clientX - startX, moved.clientY - startY) < DRAG_SLOP) return;
        dragging = true;
        begin();
      }
      moved.preventDefault();
      follow(moved.clientX, moved.clientY);
    };
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM events carry framework member types that cannot be made readonly
    const up = (released: PointerEvent) => {
      if (released.pointerId !== pointerId) return;
      if (!dragging) {
        stop();
        return;
      }
      swallowClick.current = true;
      if (released.type === "pointercancel") sendHome();
      else drop();
    };
    const key = (pressed: KeyboardEvent) => {
      if (pressed.key !== "Escape" || !dragging) return;
      pressed.preventDefault();
      pressed.stopPropagation();
      swallowClick.current = true;
      sendHome();
    };
    function stop() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("keydown", key, true);
      const live = session.current;
      if (live?.askTimer != null) window.clearTimeout(live.askTimer);
      if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
    }
    function begin() {
      const box = block!.getBoundingClientRect();
      handle.setPointerCapture(pointerId);
      session.current = {
        cell,
        pointerId,
        startX,
        startY,
        grabY: startY - box.top,
        block: block!,
        read: readWeekAppointment(cell.id).catch((): WeekAppointmentOutcome => ({
          ok: false,
          code: "unavailable",
        })),
        answers: new Map(),
        ineligible: new Set(),
        target: null,
        dx: 0,
        dy: 0,
        asking: false,
        dropped: false,
        askTimer: null,
        stop,
      };
      latest.current.onLift();
      setLifted({
        cell,
        rect: { left: box.left, top: box.top, width: box.width, height: box.height },
        host: handle.ownerDocument.body,
      });
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("keydown", key, true);
  }

  function onClickCapture(event: ReactMouseEvent<HTMLElement>) {
    if (!swallowClick.current) return;
    swallowClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  return { lifted, target, cardRef, onPointerDown, onClickCapture };
}

function toneOf(verdict: Readonly<DropVerdict>): "checking" | "open" | "booked" | "refused" {
  if (verdict.kind === "checking") return "checking";
  if (verdict.kind !== "refused") return "open";
  return verdict.refusal === "slot_booked" ? "booked" : "refused";
}

/** The card under the pointer: the visit's name, the time it would land at, and over it the
    readout, who and when or why not. */
export function LiftedCard({ drag }: Readonly<{ drag: DayDrag }>) {
  const { lifted, target, cardRef } = drag;
  if (lifted === null) return null;
  const { rect, cell, host } = lifted;
  const shown = target !== null && target.verdict.kind !== "origin";
  const tone = shown ? toneOf(target.verdict) : null;
  return createPortal(
    <div
      ref={cardRef}
      className="wgi-dayview-lifted"
      aria-hidden="true"
      style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
    >
      <span className="wgi-dayview-block-open">
        <span className="wgi-dayview-block-name" data-ui-redact="patient-name">
          {cell.name}
        </span>
        <span className="wgi-dayview-block-line">
          <span className="truncate">{liftedLine(cell, target)}</span>
        </span>
      </span>
      {shown ? (
        <span className="wgi-dayview-readout" data-verdict={tone}>
          {tone === "booked" ? <CalendarX width={13} height={13} /> : null}
          {tone === "refused" ? <CircleAlert width={13} height={13} /> : null}
          {readoutFor(target, cell.type)}
        </span>
      ) : null}
    </div>,
    host,
  );
}

/** Where the card would land: teal when it can, coral when it cannot. */
export function DropMark({ target }: Readonly<{ target: DropTarget }>) {
  if (target.verdict.kind === "origin") return null;
  const style: CssVars = { "--top": target.top, "--height": target.height };
  return (
    <span
      className="wgi-dayview-target"
      data-verdict={toneOf(target.verdict)}
      aria-hidden="true"
      style={style}
    />
  );
}
