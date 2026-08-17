"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/portal/auth";
import { resolveFollowUpAt } from "@/lib/portal/business-time";
import type { FollowUpChoice } from "@/lib/portal/business-time";
import { serviceClient } from "@/lib/portal/server";
import { executeRequestCommand } from "@/lib/portal/workflow/commands";
import type {
  ClosureReason,
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
      command: WorkflowCommand;
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
    Common & { outcome: ContactOutcome; callAgain?: Readonly<FollowUpChoice>; note?: string }
  >,
): Promise<CommandOutcome> {
  // The staff quick picks ("This afternoon", "Tomorrow morning", …) resolve
  // Through the same practice-local policy as the legacy composer; the
  // Domain command only ever sees the resolved timestamp.
  const callAgainAt = input.callAgain !== undefined ? resolveFollowUpAt(input.callAgain) : null;
  if (input.callAgain !== undefined && callAgainAt === null) {
    return { ok: false, code: "invalid_command" } as const;
  }
  return run({
    ...input,
    command: { kind: "record_contact_attempt", outcome: input.outcome, callAgainAt },
  });
}

export async function confirmBookingHandoff(input: Readonly<Common>): Promise<CommandOutcome> {
  return run({ ...input, command: { kind: "confirm_booking_handoff" } });
}

export async function closeRequest(
  input: Readonly<Common & { reason: ClosureReason; note?: string }>,
): Promise<CommandOutcome> {
  return run({
    ...input,
    command: { kind: "close_request", reason: input.reason },
    note: input.note,
  });
}

export async function reopenRequest(input: Readonly<Common>): Promise<CommandOutcome> {
  return run({ ...input, command: { kind: "reopen_request" } });
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
  input: Readonly<Common & { resolution: "booked" | Readonly<{ reason: ClosureReason }> }>,
): Promise<CommandOutcome> {
  return run({
    ...input,
    command: { kind: "classify_legacy_closure", resolution: input.resolution },
  });
}
