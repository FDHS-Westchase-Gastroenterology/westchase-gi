"use client";

import { AnimatePresence, LazyMotion, m, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import type { TimeParts } from "@/app/admin/(portal)/(home)/record-card-model";
import {
  hourOptions,
  joinTime,
  MERIDIEMS,
  minuteOptions,
  TIME_SLOTS,
  timeParts,
} from "@/app/admin/(portal)/(home)/record-card-model";
import { Clock } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { TimePicker as TimeWheels, TimePickerColumn } from "@/components/ui/time-picker";
import type { TimePickerOption } from "@/components/ui/time-picker";
import { arrive, crossfade, leave } from "@/lib/motion";

/* The record card's start time, in Base's shape: the strip along the
   month's lower edge holds one trigger, and pressing it raises a sheet
   over the month with three wheels — the hour, the minute, then the half
   of the day, the way staff say a time out loud.

   The sheet edits a draft and Done is what reaches the card. That is what
   lets the wheels open on a real time rather than a blank: an unset field
   raises them mid-morning, and nothing is recorded until Done, so a wheel
   turned past the right row on the way to it has changed nothing. The
   scrim and Escape discard — the same commit model as the card around
   it. */
export function TimePicker({
  id,
  time,
  disabled,
  onPick,
}: Readonly<{
  id: string;
  time: string;
  disabled: boolean;
  onPick: (time: string) => void;
}>) {
  const trigger = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  /* Escape leaves at once; Done and the scrim leave on the registry exit. */
  const [instant, setInstant] = useState(false);
  const [draft, setDraft] = useState<TimeParts>(() => settle(timeParts(OPENING_TIME)));

  function raise() {
    setDraft(settle(timeParts(time === "" ? OPENING_TIME : time)));
    setInstant(false);
    setOpen(true);
  }

  function dismiss(now: boolean) {
    setInstant(now);
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <>
      <button
        ref={trigger}
        id={id}
        type="button"
        className="wgi-time-trigger"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-empty={time === "" || undefined}
        onClick={raise}
      >
        <Clock />
        <span>{time === "" ? "Choose a start time" : slotLabel(time)}</span>
      </button>
      {/* Only this one surface animates in JavaScript, so it loads the DOM
          feature set on demand rather than shipping the full bundle. */}
      <LazyMotion features={loadMotionFeatures} strict>
        <AnimatePresence>
          {open ? (
            <TimeSheet
              key="sheet"
              draft={draft}
              instant={instant}
              onDismiss={dismiss}
              onDraft={setDraft}
              onDone={() => {
                onPick(joinTime(draft));
                dismiss(false);
              }}
            />
          ) : null}
        </AnimatePresence>
      </LazyMotion>
    </>
  );
}

/* The sheet itself: a scrim that quiets the month and a panel that rises
   from the month's lower edge and leaves the same way. */
function TimeSheet({
  draft,
  instant,
  onDismiss,
  onDraft,
  onDone,
}: Readonly<{
  draft: TimeParts;
  instant: boolean;
  onDismiss: (now: boolean) => void;
  onDraft: (parts: TimeParts) => void;
  onDone: () => void;
}>) {
  const sheet = useRef<HTMLDivElement | null>(null);
  const wheels = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion() === true;

  /* The sheet sits along the month's lower edge, and on a narrow card that
     edge can be below the fold, so the sheet asks for the least scrolling
     that puts it on screen — none on a desktop card, where it already is.
     Then the hour takes focus, because the hour is where a time is decided;
     the scroll that would otherwise cause belongs to the wheel, not the card. */
  useEffect(() => {
    sheet.current?.scrollIntoView({ block: "nearest", behavior: reduced ? "instant" : "smooth" });
    wheels.current?.querySelector<HTMLElement>("[role=listbox]")?.focus({ preventScroll: true });
  }, [reduced]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") return;
    /* The card is a popover too, and one Escape closes one surface. */
    event.stopPropagation();
    event.preventDefault();
    onDismiss(true);
  }

  return (
    <>
      {/* A pointer affordance only, and inert to assistive technology: a
          screen reader dismisses this sheet with Escape or commits it with
          Done, both of which live inside the dialog. */}
      <m.button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className="wgi-time-scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: instant ? INSTANT : leave }}
        transition={reduced ? crossfade : leave}
        onClick={() => {
          onDismiss(false);
        }}
      />
      <m.div
        ref={sheet}
        role="dialog"
        aria-label="Choose a start time"
        className="wgi-time-sheet"
        /* Reduced motion keeps the arrival and drops the travel: the
           sheet cross-fades in place (DESIGN.md "Reduced motion"). */
        initial={reduced ? { opacity: 0 } : { opacity: 0, transform: "translateY(100%)" }}
        animate={{ opacity: 1, transform: "translateY(0%)" }}
        exit={{
          opacity: 0,
          transform: reduced ? "translateY(0%)" : "translateY(100%)",
          transition: instant ? INSTANT : reduced ? crossfade : leave,
        }}
        transition={reduced ? crossfade : arrive}
        onKeyDown={handleKeyDown}
      >
        <p className="wgi-time-title">Choose a start time</p>
        <div ref={wheels} className="wgi-time-wheels">
          <TimeWheels size="sm" aria-label="Start time">
            <TimePickerColumn
              label="Hour"
              options={labelled(hourOptions(draft.meridiem))}
              value={draft.hour}
              onValueChange={(hour) => {
                onDraft(settle({ ...draft, hour }));
              }}
            />
            <TimePickerColumn
              label="Minute"
              options={labelled(minuteOptions(draft.meridiem, draft.hour))}
              value={draft.minute}
              onValueChange={(minute) => {
                onDraft(settle({ ...draft, minute }));
              }}
            />
            <TimePickerColumn
              label="AM or PM"
              options={labelled(MERIDIEMS)}
              value={draft.meridiem}
              onValueChange={(meridiem) => {
                onDraft(settle({ ...draft, meridiem }));
              }}
            />
          </TimeWheels>
        </div>
        <Button size="sm" className="wgi-time-done" onClick={onDone}>
          Done
        </Button>
      </m.div>
    </>
  );
}

const loadMotionFeatures = async () => (await import("motion/react")).domAnimation;

const INSTANT = { duration: 0 } as const;

/* Where an unset field parks the wheels. Every minute of the clock is
   reachable, so the first slot is midnight — never what a booking means —
   and the wheels open instead on the hour the schedule usually starts,
   one flick from anything nearby. */
const OPENING_TIME = "09:00";

function slotLabel(time: string): string {
  return TIME_SLOTS.find((slot) => slot.value === time)?.label ?? "";
}

function labelled(values: readonly string[]): readonly TimePickerOption[] {
  return values.map((value) => ({ value, label: value }));
}

/* A wheel always reads a real time. The clock is whole, so today no part
   contradicts another; the guard stays because the option lists are the
   caller's to narrow, and a draft that survives a narrowing it no longer
   fits should move to a row that exists rather than sit on one that does
   not. */
function settle(parts: Readonly<TimeParts>): TimeParts {
  const hours = hourOptions(parts.meridiem);
  const hour = hours.includes(parts.hour) ? parts.hour : (hours[0] ?? "");
  const minutes = minuteOptions(parts.meridiem, hour);
  const minute = minutes.includes(parts.minute) ? parts.minute : (minutes[0] ?? "");
  return { hour, minute, meridiem: parts.meridiem };
}
