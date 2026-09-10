"use client";

import { AnimatePresence, LazyMotion, m, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import type { TimeParts } from "@/app/admin/(portal)/(home)/record-card-model";
import {
  clockLabel,
  joinTime,
  MERIDIEMS,
  TIME_HOURS,
  TIME_MINUTES,
  timeParts,
} from "@/app/admin/(portal)/(home)/record-card-model";
import { Clock } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { TimePicker as TimeWheels, TimePickerColumn } from "@/components/ui/time-picker";
import type { TimePickerOption } from "@/components/ui/time-picker";
import { arrive, crossfade, leave } from "@/lib/motion";

// Only Done commits the draft; Escape and the scrim discard it.
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
  const [instant, setInstant] = useState(false);
  const [draft, setDraft] = useState<TimeParts>(() => timeParts(OPENING_TIME));

  function raise() {
    setDraft(timeParts(time === "" ? OPENING_TIME : time));
    setInstant(false);
    setOpen(true);
  }

  function dismiss(now: boolean) {
    setInstant(now);
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
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
        <span>{time === "" ? "Choose a start time" : clockLabel(time)}</span>
      </button>
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
  const wheels = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion() === true;

  /* Focus the hour without moving the page or the card. Scrolling the sheet
     into view would follow its translated entrance bounds before it settles. */
  useEffect(() => {
    wheels.current?.querySelector<HTMLElement>("[role=listbox]")?.focus({ preventScroll: true });
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") return;
    /* The card is a popover too, and one Escape closes one surface. */
    event.stopPropagation();
    event.preventDefault();
    onDismiss(true);
  }

  return (
    <>
      {/* Keyboard and screen-reader users dismiss with Escape or Done. */}
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
        role="dialog"
        aria-label="Choose a start time"
        className="wgi-time-sheet"
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
              options={HOURS}
              value={draft.hour}
              onValueChange={(hour) => {
                onDraft({ ...draft, hour });
              }}
            />
            <TimePickerColumn
              label="Minute"
              options={MINUTES}
              value={draft.minute}
              onValueChange={(minute) => {
                onDraft({ ...draft, minute });
              }}
            />
            <TimePickerColumn
              label="AM or PM"
              options={PERIODS}
              value={draft.meridiem}
              onValueChange={(meridiem) => {
                onDraft({ ...draft, meridiem });
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

// Unset fields open at 9 AM, but remain unset until Done.
const OPENING_TIME = "09:00";
const HOURS = labelled(TIME_HOURS);
const MINUTES = labelled(TIME_MINUTES);
const PERIODS = labelled(MERIDIEMS);

function labelled(values: readonly string[]): readonly TimePickerOption[] {
  return values.map((value) => ({ value, label: value }));
}
