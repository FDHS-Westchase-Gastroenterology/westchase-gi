"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/portal/auth";
import {
  resolveFollowUpAt,
  type FollowUpChoice,
} from "@/lib/portal/business-time";
import { serviceClient } from "@/lib/portal/server";
import type { ClosureReason, CommandOutcome, ContactOutcome } from "@/lib/portal/workflow/contracts";
import { executeRequestCommand } from "@/lib/portal/workflow/commands";

type Common = { requestId: string; expectedVersion: number; idempotencyKey: string };
function refresh(id: string) { revalidatePath("/admin"); revalidatePath("/admin/requests"); revalidatePath(`/admin/requests/${id}`); }
async function run(input: Common & { command: Parameters<typeof executeRequestCommand>[1]["command"]; note?: string; transitionId?: string }): Promise<CommandOutcome> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  const result = await executeRequestCommand(serviceClient(), { ...input, actorEmail: session.email });
  if (result.ok) refresh(input.requestId);
  return result;
}
export async function recordContactAttempt(input: Common & { outcome: ContactOutcome; callAgain?: FollowUpChoice; note?: string }): Promise<CommandOutcome> {
  // The staff quick picks ("This afternoon", "Tomorrow morning", …) resolve
  // through the same practice-local policy as the legacy composer; the
  // domain command only ever sees the resolved timestamp.
  const callAgainAt = input.callAgain ? resolveFollowUpAt(input.callAgain) : null;
  if (input.callAgain && !callAgainAt) return { ok: false, code: "invalid_command" } as const;
  return run({ ...input, command: { kind: "record_contact_attempt", outcome: input.outcome, callAgainAt } });
}
export async function confirmBookingHandoff(input: Common): Promise<CommandOutcome> {
  return run({ ...input, command: { kind: "confirm_booking_handoff" } });
}
export async function closeRequest(input: Common & { reason: ClosureReason; note?: string }): Promise<CommandOutcome> {
  return run({ ...input, command: { kind: "close_request", reason: input.reason }, note: input.note });
}
export async function reopenRequest(input: Common): Promise<CommandOutcome> {
  return run({ ...input, command: { kind: "reopen_request" } });
}
export async function undoLatestTransition(input: Common & { transitionId: string }): Promise<CommandOutcome> {
  return run({ ...input, command: { kind: "undo_latest_transition", restore: null as never }, transitionId: input.transitionId });
}
export async function classifyLegacyClosure(input: Common & { resolution: "booked" | { reason: ClosureReason } }): Promise<CommandOutcome> {
  return run({ ...input, command: { kind: "classify_legacy_closure", resolution: input.resolution } });
}
