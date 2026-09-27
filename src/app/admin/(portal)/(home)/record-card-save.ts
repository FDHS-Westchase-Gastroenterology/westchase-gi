import type {
  closeRequest,
  confirmBookingHandoff,
  recordContactAndClose,
  recordContactAttempt,
} from "@/app/admin/(portal)/requests/workflow-actions";
import type { CommandOutcome, CommandSuccess } from "@/lib/portal/workflow/contracts";

import { failureFor } from "./record-card-model";
import type { CardCommand, CardFailure } from "./record-card-model";

interface CardActions {
  readonly recordContactAttempt: typeof recordContactAttempt;
  readonly recordContactAndClose: typeof recordContactAndClose;
  readonly closeRequest: typeof closeRequest;
  readonly confirmBookingHandoff: typeof confirmBookingHandoff;
}

/** Dispatch one decision, preserving the version and retry identity supplied by the card. */
export async function saveCardCommand(
  command: Readonly<CardCommand>,
  common: Readonly<{ requestId: string; expectedVersion: number; idempotencyKey: string }>,
  actions: Readonly<CardActions>,
): Promise<CommandOutcome> {
  if (command.kind === "attempt") {
    return actions.recordContactAttempt({
      ...common,
      outcome: command.outcome,
      callAgain: command.callAgain,
    });
  }
  if (command.kind === "complete_contact") {
    return actions.recordContactAndClose({ ...common, outcome: command.outcome });
  }
  if (command.kind === "close") {
    return actions.closeRequest({ ...common, reason: command.reason });
  }
  return actions.confirmBookingHandoff({ ...common, appointment: command.appointment });
}

/** A save that did not succeed, as the rejection the toast follows: the card's
   failure rides on the error, so the toast and the card read one rule. */
export class CardSaveError extends Error {
  readonly failure: CardFailure;

  constructor(failure: Readonly<CardFailure>, options?: Readonly<ErrorOptions>) {
    super(failure.message, options);
    this.name = "CardSaveError";
    this.failure = failure;
  }
}

/** The failure a rejected save means, whatever shape its cause arrived in. A
   thrown action (the network, an expired session) is an uncertain outcome:
   the request may have reached the server. */
export function failureOf(cause: unknown): CardFailure {
  return cause instanceof CardSaveError ? cause.failure : failureFor("unavailable");
}

/** One decision as one promise with the card's meaning of success: it resolves
   only once the server confirmed the command and rejects with a CardSaveError
   otherwise, so `toast.promise` and the card settle on the same outcome. */
export async function followSave(run: () => Promise<CommandOutcome>): Promise<CommandSuccess> {
  let result: CommandOutcome;
  try {
    result = await run();
  } catch (reason) {
    throw new CardSaveError(failureFor("unavailable"), { cause: reason });
  }
  if (result.ok) return result;
  throw new CardSaveError(failureFor(result.code));
}
