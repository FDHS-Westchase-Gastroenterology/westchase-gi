"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/portal/auth";
import type { FollowUpChoice } from "@/lib/portal/business-time";
import { serviceClient } from "@/lib/portal/server";
import type { RequestCommandInput } from "@/lib/portal/workflow/command-intent";
import { executeRequestCommand } from "@/lib/portal/workflow/commands";
import { contactCompletionInputSchema } from "@/lib/portal/workflow/contact-completion";
import type { ContactCompletionInput } from "@/lib/portal/workflow/contact-completion";
import type {
  ManualClosureReason,
  CommandOutcome,
  ContactOutcome,
} from "@/lib/portal/workflow/contracts";
import type { WorkflowCommand } from "@/lib/portal/workflow/machine";

interface Common {
  readonly requestId: string;
  readonly expectedVersion: number;
  readonly idempotencyKey: string;
}

function refresh(id: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${id}`);
}

async function run(
  input: Readonly<
    Common & {
      command: RequestCommandInput;
      note?: string;
      transitionId?: string;
    }
  >,
): Promise<CommandOutcome> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  const result = await executeRequestCommand(serviceClient(), {
    ...input,
    actorEmail: session.email,
  });
  if (result.ok) refresh(input.requestId);
  return result;
}

export async function recordContactAttempt(
  input: Readonly<
    Common & {
      outcome: ContactOutcome;
      /** A missing callback is invalid. Use recordContactAndClose for No call. */
      callAgain: Readonly<FollowUpChoice> | null;
      note?: string;
    }
  >,
): Promise<CommandOutcome> {
  return run({
    ...input,
    command: {
      kind: "record_contact_attempt",
      outcome: input.outcome,
      callAgain: input.callAgain,
    },
  });
}

/** Record the contact fact and finish the request as one reversible decision. */
export async function recordContactAndClose(
  input: Readonly<ContactCompletionInput>,
): Promise<CommandOutcome> {
  const parsed = contactCompletionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_command" };
  return run({
    ...parsed.data,
    command: { kind: "record_contact_and_close", outcome: parsed.data.outcome },
  });
}

export interface AppointmentChoice {
  readonly date: string;
  readonly hour: number;
  readonly minute: number;
}

export async function confirmBookingHandoff(
  input: Readonly<Common & { appointment: Readonly<AppointmentChoice> }>,
): Promise<CommandOutcome> {
  return run({
    ...input,
    command: { kind: "confirm_booking_handoff", appointment: input.appointment },
  });
}

export async function closeRequest(
  input: Readonly<Common & { reason: ManualClosureReason; note?: string }>,
): Promise<CommandOutcome> {
  return run({
    ...input,
    command: { kind: "close_request", reason: input.reason },
    note: input.note,
  });
}

export async function reopenRequest(
  input: Readonly<Common & { callAgain: Readonly<FollowUpChoice> }>,
): Promise<CommandOutcome> {
  return run({ ...input, command: { kind: "reopen_request", callAgain: input.callAgain } });
}

export async function setCallAgain(
  input: Readonly<Common & { callAgain: Readonly<FollowUpChoice> }>,
): Promise<CommandOutcome> {
  return run({ ...input, command: { kind: "set_call_again", callAgain: input.callAgain } });
}

function undoFingerprintCommand(): WorkflowCommand {
  // SAFETY: The command shell replaces restore from the stored transition
  // Before decide() runs. Null is the idempotency fingerprint the shell hashes.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Undo restore is resolved from the stored transition; null is the hashed placeholder.
  return { kind: "undo_latest_transition", restore: null as never };
}

export async function undoLatestTransition(
  input: Readonly<Common & { transitionId: string }>,
): Promise<CommandOutcome> {
  return run({
    ...input,
    command: undoFingerprintCommand(),
    transitionId: input.transitionId,
  });
}

export async function classifyLegacyClosure(
  input: Readonly<Common & { resolution: "booked" | Readonly<{ reason: ManualClosureReason }> }>,
): Promise<CommandOutcome> {
  return run({
    ...input,
    command: { kind: "classify_legacy_closure", resolution: input.resolution },
  });
}
