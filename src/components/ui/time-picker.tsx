"use client";

import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { animate, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import type { ComponentProps, KeyboardEvent, PointerEvent } from "react";

import type { Drag, Flight } from "@/components/ui/time-picker-physics";
import {
  clamp,
  keyTarget,
  place,
  projectRest,
  releaseVelocity,
  rowHeight,
  VELOCITY_WINDOW,
} from "@/components/ui/time-picker-physics";
import {
  timePickerColumnVariants,
  timePickerOptionVariants,
  timePickerVariants,
} from "@/components/ui/time-picker-variants";
import { arrive } from "@/lib/motion";

/*
 * Project-authored primitive, not a registry component (DESIGN.md
 * "Component tiers"): shadcn ships no time picker in any style, and
 * `npx shadcn@latest search @shadcn -q "picker"` returns nothing, so there
 * is no registry source to adapt and no upstream feel to name on the
 * motion axis. The behavior model is Base, Uber's design system: a framed
 * window with one selection band, and a wheel per part of the time that
 * scrolls that part under the band.
 *
 * Composition. `TimePicker` is the frame and draws the band; each
 * `TimePickerColumn` is one wheel. Columns are independent listboxes, so
 * the hours a chosen meridiem allows are the caller's decision, not this
 * component's — it knows rows, not clocks.
 *
 *   <TimePicker aria-label="Start time">
 *     <TimePickerColumn label="Hour" options={hours} value={hour} onValueChange={…} />
 *     <TimePickerColumn label="Minute" options={minutes} value={minute} onValueChange={…} />
 *   </TimePicker>
 *
 * Physics. The wheel is a scroll container with a snap point on every row,
 * so touch and trackpad get the platform's own momentum, rubber-banding
 * and mid-flight interruption for free. A mouse has no such gesture, and
 * time-picker-physics.ts is what the platform would have supplied: 1:1
 * tracking, a resting row projected from the release velocity, resistance
 * past either end. The travel to that row is `arrive` handed that same
 * velocity, so there is no seam between the hand and the animation, and a
 * grab mid-flight picks the wheel up from wherever it is on screen.
 *
 * Axes are decoupled (DESIGN.md "Component API rules"): `size` is geometry
 * alone — the row height and how many rows the window shows — and every
 * size keeps the 16px type, because the portal's floor is 15px and this is
 * a primary readout. `motion` is temperament: `wgi` (default) is the
 * registry spring under the wheel and the micro beat on the row's ink;
 * `none` withholds both, and every move lands on the row it asked for.
 * Under reduced motion the travel becomes an instant jump and the ink
 * still tints, which is the gentler equivalent, not silence.
 *
 * Colors resolve through brand tokens: `line-2` the field hairline, `line`
 * the band's rules, `muted-ink` the rows waiting their turn, `ink` the row
 * under the band, `teal` the field recipe's focus ring.
 *
 * Consumers: the staff record card's start time
 * (src/app/admin/(portal)/(home)/parts/time-picker.tsx).
 */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function TimePicker({ className, size, children, ...props }: TimePickerProps) {
  return (
    <div data-slot="time-picker" className={cn(timePickerVariants({ size }), className)} {...props}>
      {children}
      {/* The band is the whole affordance: one row tall, ruled top and
          bottom, and never in the way of the wheel it frames. */}
      <div
        aria-hidden="true"
        data-slot="time-picker-band"
        className="pointer-events-none absolute inset-x-0 top-[calc(50%-var(--tp-row)/2)] h-[var(--tp-row)] border-y border-line"
      />
    </div>
  );
}

type TimePickerProps = ComponentProps<"div"> & VariantProps<typeof timePickerVariants>;

export interface TimePickerOption {
  readonly value: string;
  readonly label: string;
}

interface TimePickerColumnProps extends VariantProps<typeof timePickerColumnVariants> {
  /** Names the wheel to a screen reader: "Hour", "Minute", "AM or PM". */
  readonly label: string;
  readonly options: readonly TimePickerOption[];
  /** The row under the band. A value the options do not carry parks the wheel at its first row. */
  readonly value: string;
  readonly disabled?: boolean;
  readonly onValueChange: (value: string) => void;
  readonly className?: string;
}

function TimePickerColumn({
  label,
  options,
  value,
  disabled = false,
  onValueChange,
  className,
  motion = "wgi",
}: Readonly<TimePickerColumnProps>) {
  const scroller = useRef<HTMLDivElement | null>(null);
  const track = useRef<HTMLDivElement | null>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flight = useRef<Flight | null>(null);
  const drag = useRef<Drag | null>(null);
  const stretch = useRef(0);
  const swallowClick = useRef(false);
  const opened = useRef(false);
  const name = useId();
  const reduced = useReducedMotion() === true;
  const chosen = options.findIndex((option) => option.value === value);
  const last = options.length - 1;

  /* What sits under the band right now, which is the chosen row except
     while a wheel is in flight — the band has to read true mid-scroll. */
  const [centered, setCentered] = useState(chosen < 0 ? 0 : chosen);

  /* Where the wheel is on screen, stretch included. Every interruption
     starts from here rather than from the row it was told to go to, which
     is what keeps a grab mid-flight from jumping. */
  function presentation(el: HTMLElement): number {
    return el.scrollTop + stretch.current;
  }

  function bandIndex(el: HTMLElement, tr: HTMLElement): number {
    return clamp(Math.round(presentation(el) / rowHeight(tr)), last);
  }

  /* The mark stays on: it is what stands snapping down, and lifting it
     lets the next layout re-snap the offset out from under the read. It
     comes off where the wheel is parked on a row, or under the drag's. */
  function stopFlight() {
    if (flight.current !== null) {
      flight.current.controls.stop();
      flight.current = null;
    }
  }

  /* The wheel goes to a row on the registry spring, carrying the velocity
     the hand let go with, so the throw and the settle are one movement.
     Snapping stands down for the length of it and comes back once the
     wheel is parked exactly on the row, where snapping has nothing to do. */
  function travelTo(index: number, velocity: number) {
    const el = scroller.current;
    const tr = track.current;
    if (el === null || tr === null) return;
    stopFlight();
    const to = index * rowHeight(tr);
    const from = presentation(el);
    if (reduced || motion === "none" || from === to) {
      stretch.current = place(el, tr, to);
      delete el.dataset.settling;
      return;
    }
    el.dataset.settling = "true";
    /* A stopped settle has been overtaken and must not also land:
       stopping an animation can emit its own completion, and parking the
       wheel on the row it was headed for is the jump the interruption
       exists to prevent. */
    let overtaken = false;
    const controls = animate(from, to, {
      ...arrive,
      velocity,
      onUpdate: (top: number) => {
        stretch.current = place(el, tr, top);
      },
      onComplete: () => {
        if (overtaken) return;
        flight.current = null;
        stretch.current = place(el, tr, to);
        delete el.dataset.settling;
      },
    });
    flight.current = {
      target: index,
      controls: {
        stop: () => {
          overtaken = true;
          controls.stop();
        },
      },
    };
  }

  function jumpTo(index: number) {
    const el = scroller.current;
    const tr = track.current;
    if (el === null || tr === null) return;
    stopFlight();
    stretch.current = place(el, tr, index * rowHeight(tr));
    delete el.dataset.settling;
  }

  /* The value is the truth; the wheel follows it. A settle already headed
     for that row is left alone rather than restarted from a standstill —
     retargeting a spring with zero velocity is the brick wall the release
     velocity exists to avoid. The first pass is a jump, never a glide: the
     surface carrying the wheel is the thing doing the arriving. */
  useEffect(() => {
    const el = scroller.current;
    const tr = track.current;
    if (el === null || tr === null || chosen < 0) return;
    const first = !opened.current;
    opened.current = true;
    if (flight.current?.target === chosen) return;
    if (flight.current === null && bandIndex(el, tr) === chosen) return;
    if (first) {
      jumpTo(chosen);
      return;
    }
    travelTo(chosen, 0);
    /* The wheel follows the value, and only the value: re-running this on
       every render would restart a settle the wheel is already flying. */
    // oxlint-disable-next-line react/exhaustive-deps
  }, [chosen, reduced]);

  useEffect(
    () => () => {
      if (settle.current !== null) clearTimeout(settle.current);
      flight.current?.controls.stop();
    },
    [],
  );

  function commit(index: number) {
    const option = options.at(index);
    if (option !== undefined && option.value !== value) onValueChange(option.value);
  }

  /* Scroll reports continuously and ends silently, so the band tracks
     every frame and the commit waits for the wheel to stop. A drag and a
     throw commit when the hand leaves; the timer is for the platform's
     own scrolling alone. */
  function handleScroll() {
    const el = scroller.current;
    const tr = track.current;
    if (el === null || tr === null) return;
    const index = bandIndex(el, tr);
    setCentered(index);
    if (el.dataset.dragging !== undefined || el.dataset.settling !== undefined) return;
    if (settle.current !== null) clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      commit(index);
    }, 120);
  }

  /* A row a person aimed at is chosen at once; only the wheel's own drift
     is allowed to lag behind the band. A null velocity is a step rather
     than a throw: it lands on the row it asked for (DESIGN.md
     "Keyboard-initiated actions never animate"). */
  function choose(index: number, velocity: number | null) {
    if (settle.current !== null) clearTimeout(settle.current);
    setCentered(index);
    commit(index);
    if (velocity === null) jumpTo(index);
    else travelTo(index, velocity);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const el = scroller.current;
    const tr = track.current;
    if (el === null || tr === null) return;
    /* The wheel's own position is where it is now. A held arrow repeats
       faster than React commits, and stepping from the last render would
       make every repeat in the burst ask for the same row. */
    const next = keyTarget(event.key, bandIndex(el, tr), last);
    if (next === null) return;
    event.preventDefault();
    choose(next, null);
  }

  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React synthetic events carry framework member types that cannot be made readonly
  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    const el = scroller.current;
    if (el === null || disabled || event.pointerType !== "mouse" || event.button !== 0) return;
    /* The wheel is the hand's from the press, and its mark goes on before
       anything reads the offset. A wheel still travelling is grabbable:
       the settle stops where it is and the drag picks it up from there. */
    el.dataset.dragging = "true";
    stopFlight();
    delete el.dataset.settling;
    swallowClick.current = false;
    el.setPointerCapture(event.pointerId);
    drag.current = {
      startY: event.clientY,
      startTop: presentation(el),
      samples: [{ y: event.clientY, time: event.timeStamp }],
      moved: false,
    };
  }

  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React synthetic events carry framework member types that cannot be made readonly
  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const el = scroller.current;
    const tr = track.current;
    const held = drag.current;
    if (el === null || tr === null || held === null) return;
    const travelled = held.startY - event.clientY;
    /* A few pixels of slack, so a click on a row stays a click. */
    if (!held.moved && Math.abs(travelled) < 4) return;
    held.moved = true;
    stretch.current = place(el, tr, held.startTop + travelled);
    held.samples.push({ y: event.clientY, time: event.timeStamp });
    while (
      held.samples.length > 1 &&
      event.timeStamp - (held.samples.at(0)?.time ?? event.timeStamp) > VELOCITY_WINDOW
    ) {
      held.samples.shift();
    }
  }

  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React synthetic events carry framework member types that cannot be made readonly
  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const el = scroller.current;
    const tr = track.current;
    const held = drag.current;
    drag.current = null;
    if (el === null || tr === null || held === null) return;
    if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
    if (!held.moved) {
      /* A tap stops a flying wheel, and it parks under the drag's mark. */
      travelTo(bandIndex(el, tr), 0);
      delete el.dataset.dragging;
      return;
    }
    /* The row the drag was released onto is not a row anyone clicked. */
    swallowClick.current = true;
    /* Where the throw was going, not where the button came up. The mark
       is still on, so this is the offset the hand left rather than one the
       user agent snapped, and the settle takes over before it comes off. */
    const velocity = releaseVelocity(held.samples, event.clientY, event.timeStamp);
    const rest = presentation(el) + projectRest(velocity);
    choose(clamp(Math.round(rest / rowHeight(tr)), last), velocity);
    delete el.dataset.dragging;
  }

  return (
    <div
      ref={scroller}
      data-slot="time-picker-column"
      role="listbox"
      aria-label={label}
      aria-activedescendant={`${name}-${String(centered)}`}
      aria-disabled={disabled || undefined}
      data-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      className={cn(timePickerColumnVariants({ motion }), className)}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* The rows ride on a track the stretch can move, since a scroll
          container has no room past its own ends to show one. */}
      <div ref={track} data-slot="time-picker-track">
        {/* Half a window of air at each end, so the first and last rows can
            reach the band the middle rows sit on. */}
        <div aria-hidden="true" className="h-[calc(var(--tp-row)*(var(--tp-rows)-1)/2)]" />
        {options.map((option, index) => (
          <div
            key={option.value}
            id={`${name}-${String(index)}`}
            data-slot="time-picker-option"
            role="option"
            aria-selected={index === centered}
            data-selected={index === centered || undefined}
            className={timePickerOptionVariants({ motion })}
            onClick={() => {
              if (swallowClick.current) {
                swallowClick.current = false;
                return;
              }
              choose(index, 0);
            }}
          >
            {option.label}
          </div>
        ))}
        <div aria-hidden="true" className="h-[calc(var(--tp-row)*(var(--tp-rows)-1)/2)]" />
      </div>
    </div>
  );
}

export { TimePicker, TimePickerColumn };
