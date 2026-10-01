"use client";

import { startTransition, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { HomeLine } from "@/app/admin/(portal)/(home)/home-line";

import type { ScheduleWeek } from "./schedule-week-model";
import type { WeekCommandOutcome } from "./week-actions";
import { failureMessage } from "./week-card-model";

/* What the week's click cards (week-cards.tsx) share: their handlers, the
   failure line, and one command in flight at a time. */

export type ReferenceType = ScheduleWeek["referenceType"];

export interface CardHandlers {
  readonly onDone: (message: string) => void;
  readonly onOpenRecord: (line: HomeLine, appointmentId: string) => void;
}

export function CardError({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <p role="alert" className="wgi-week-card-error">
      {children}
    </p>
  );
}

/** One attempt at a command: a fresh idempotency key per attempt, kept
   while it is in flight so a double press cannot send it twice. */
export function useCommand(onDone: (message: string) => void) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  function run(attempt: (idempotencyKey: string) => Promise<WeekCommandOutcome>, done: string) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    startTransition(async () => {
      try {
        const outcome = await attempt(crypto.randomUUID());
        if (outcome.ok) {
          onDone(done);
          return;
        }
        setError(failureMessage(outcome.code));
      } catch {
        setError("The schedule couldn't be reached. Try again.");
      } finally {
        busy.current = false;
        setPending(false);
      }
    });
  }

  return {
    pending,
    error,
    run,
    clear: () => {
      setError(null);
    },
  };
}
