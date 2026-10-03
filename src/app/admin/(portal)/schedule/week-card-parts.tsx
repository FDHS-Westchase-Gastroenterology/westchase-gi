"use client";

import { startTransition, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { WeekCommandOutcome } from "./week-actions";
import { failureMessage } from "./week-card-model";

/* What the week's click cards (week-cards.tsx) share: their handlers, the
   failure line, and one command in flight at a time. */

/** The words a command's toast says once it lands: the week's sentence is
   the subject and the rest; the day's headline drops what its detail line,
   when and where, already says. */
export interface Said {
  readonly subject: string;
  readonly rest: string;
  /** The day's headline when it is shorter than the sentence: "X is booked". */
  readonly headline?: string;
  readonly detail: string | null;
}

/** What a landed command names: the appointment and its new version, which
   Undo sends back, and the toast's words. */
export interface Landed {
  readonly id: string;
  readonly version: number;
  /** "James Okonkwo is booked at 2:00 PM.": the week's toast. */
  readonly message: string;
  /** "James Okonkwo is booked": the day's toast, over its detail. */
  readonly headline: string;
  readonly detail: string | null;
}

export type DoneHandler = (message: string, landed: Landed) => void;

/** Who a record opens on before it is read: its header is never empty. */
export interface RecordHint {
  readonly id: string;
  readonly name: string;
  readonly phone: string | null;
}

export interface CardHandlers {
  readonly onDone: DoneHandler;
  /** Opens the patient's record from their appointment's card. */
  readonly onOpenRecord: (patient: RecordHint, appointmentId: string) => void;
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
export function useCommand(onDone: DoneHandler) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  function run(
    attempt: (idempotencyKey: string) => Promise<WeekCommandOutcome>,
    said: Readonly<Said>,
  ) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    startTransition(async () => {
      try {
        const outcome = await attempt(crypto.randomUUID());
        if (outcome.ok) {
          const message = `${said.subject}${said.rest}.`;
          onDone(message, {
            id: outcome.id,
            version: outcome.version,
            message,
            headline: said.headline ?? `${said.subject}${said.rest}`,
            detail: said.detail,
          });
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
