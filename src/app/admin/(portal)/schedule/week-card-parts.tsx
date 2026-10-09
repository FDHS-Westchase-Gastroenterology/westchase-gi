"use client";

import { useRouter } from "next/navigation";
import { startTransition, useRef, useState } from "react";
import type { ReactNode } from "react";

import { showUndoToast } from "@/components/ui/undo-toast";

import { undoAppointmentChange } from "./week-actions";
import type { WeekCommandOutcome, WeekCommandRequest } from "./week-actions";
import { failureMessage } from "./week-card-model";

/* What the week's click cards (week-cards.tsx) share: their handlers, the
   failure line, one command in flight at a time, and the undo toast a
   landed command raises on the week and the day. */

/** The words a command's toast says once it lands: the week's sentence is
   the subject and the rest; the day's headline drops what its detail line,
   when and where, already says. */
export interface Said {
  readonly subject: string;
  readonly rest: string;
  /** The day's headline when it is shorter than the sentence: "X is booked". */
  readonly headline?: string;
  /** The line under the headline. */
  readonly detail: string | null;
  /** A cancel's line depends on where the server moved its request, so it
     is read from the landed request and takes the place of `detail`. */
  readonly detailAfter?: (request: WeekCommandRequest | null) => string;
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
  /** The request the command moved with the appointment; its Undo sends
     the request's new version back. */
  readonly request: WeekCommandRequest | null;
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
            detail: said.detailAfter?.(outcome.request) ?? said.detail,
            request: outcome.request,
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

/** Says a landed change with Undo, and re-reads the page. Undo sends the
   appointment's new version, and the request's when the change moved one,
   so the server can tell the change is still the latest. */
export function useUndoLanded() {
  const router = useRouter();
  return function landed(
    change: Readonly<Pick<Landed, "id" | "version" | "headline" | "detail" | "request">>,
  ) {
    const idempotencyKey = crypto.randomUUID();
    showUndoToast({
      headline: change.headline,
      detail: change.detail,
      undo: async () => {
        const outcome = await undoAppointmentChange({
          idempotencyKey,
          id: change.id,
          expectedVersion: change.version,
          requestVersion: change.request?.version ?? null,
        });
        return outcome.ok
          ? { ok: true, message: "Undone." }
          : { ok: false, message: failureMessage(outcome.code) };
      },
      onSettled: () => {
        router.refresh();
      },
    });
    router.refresh();
  };
}
