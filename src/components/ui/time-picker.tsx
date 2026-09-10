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

/* Project-authored wheel control for the record card, modeled on Base
   (Uber). Native scrolling handles touch and trackpad; the pointer handlers
   add mouse dragging, momentum, and interruption. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function TimePicker({ className, size, children, ...props }: TimePickerProps) {
  return (
    <div data-slot="time-picker" className={cn(timePickerVariants({ size }), className)} {...props}>
      {children}

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
  readonly label: string;
  readonly options: readonly TimePickerOption[];
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
  if (chosen < 0) throw new Error("Time picker value must match an option");
  const last = options.length - 1;

  // The highlighted row follows scrolling before the value commits.
  const [centered, setCentered] = useState(chosen);

  // Include overscroll when grabbing a wheel mid-flight.
  function presentation(el: HTMLElement): number {
    return el.scrollTop + stretch.current;
  }

  function bandIndex(el: HTMLElement, tr: HTMLElement): number {
    return clamp(Math.round(presentation(el) / rowHeight(tr)), last);
  }

  // Keep snapping disabled until the wheel is parked or a drag takes over.
  function stopFlight() {
    if (flight.current !== null) {
      flight.current.controls.stop();
      flight.current = null;
    }
  }

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
    // Stopping can complete a final animation tick; ignore that completion.
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

  /* Preserve an in-flight throw to this row. The first value jumps into
     place because the containing sheet already animates its entrance. */
  useEffect(() => {
    const el = scroller.current;
    const tr = track.current;
    if (el === null || tr === null) return;
    const first = !opened.current;
    opened.current = true;
    if (flight.current?.target === chosen) return;
    if (flight.current === null && bandIndex(el, tr) === chosen) return;
    if (first) {
      jumpTo(chosen);
      return;
    }
    travelTo(chosen, 0);
    // Depending on each render would restart an in-flight settle.
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
    const option = options[index];
    if (option.value !== value) onValueChange(option.value);
  }

  // Native scrolling commits after settling; mouse gestures commit on release.
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

  // A null velocity marks a keyboard choice, which must land without motion.
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
    // Held keys can repeat before React renders; step from the live position.
    const next = keyTarget(event.key, bandIndex(el, tr), last);
    if (next === null) return;
    event.preventDefault();
    choose(next, null);
  }

  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React synthetic events carry framework member types that cannot be made readonly
  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    const el = scroller.current;
    if (el === null || disabled || event.pointerType !== "mouse" || event.button !== 0) return;
    // Disable snapping before reading the interrupted position.
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
    while (held.samples.length > 1 && event.timeStamp - held.samples[0].time > VELOCITY_WINDOW) {
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
      travelTo(bandIndex(el, tr), 0);
      delete el.dataset.dragging;
      return;
    }
    /* The row the drag was released onto is not a row anyone clicked. */
    swallowClick.current = true;
    // Project before restoring native snapping, while the offset is still ours.
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
      <div ref={track} data-slot="time-picker-track">
        {/* End rows need padding to reach the central selection band. */}
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
