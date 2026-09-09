import type {
  closeRequest,
  confirmBookingHandoff,
  recordContactAndClose,
  recordContactAttempt,
} from "@/app/admin/(portal)/requests/workflow-actions";
import type { CommandOutcome } from "@/lib/portal/workflow/contracts";

import type { CardCommand } from "./record-card-model";

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
