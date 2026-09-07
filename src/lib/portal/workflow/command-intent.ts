import { z } from "zod";

import { resolveAppointmentAt, resolveFollowUpAt } from "@/lib/portal/business-time";
import type { FollowUpChoice } from "@/lib/portal/business-time";

import type { ContactOutcome } from "./contracts";
import type { WorkflowCommand } from "./machine";

const followUpChoiceSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("this_afternoon") }),
  z.strictObject({ kind: z.literal("tomorrow_morning") }),
  z.strictObject({ kind: z.literal("friday") }),
  z.strictObject({ kind: z.literal("day"), date: z.iso.date() }),
]);

export type FollowUpCommand =
  | {
      readonly kind: "record_contact_attempt";
      readonly outcome: ContactOutcome;
      readonly callAgain: Readonly<FollowUpChoice> | null;
    }
  | {
      readonly kind: "reopen_request" | "set_call_again";
      readonly callAgain: Readonly<FollowUpChoice>;
    };

const appointmentChoiceSchema = z.strictObject({
  date: z.iso.date(),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
});

export type RequestCommandInput =
  | WorkflowCommand
  | FollowUpCommand
  | {
      readonly kind: "confirm_booking_handoff";
      readonly appointment: Readonly<z.infer<typeof appointmentChoiceSchema>>;
    };

/** Resolve a staff choice only after checking its durable retry receipt. */
export function resolveRequestCommand(
  command: Readonly<RequestCommandInput>,
  now: Date,
): WorkflowCommand | null {
  if ("appointment" in command) {
    const parsed = appointmentChoiceSchema.safeParse(command.appointment);
    if (!parsed.success) return null;
    const appointmentAt = resolveAppointmentAt(parsed.data, now);
    return appointmentAt === null ? null : { kind: command.kind, appointmentAt };
  }
  if (!("callAgain" in command)) return command;
  const parsed = followUpChoiceSchema.safeParse(command.callAgain);
  if (!parsed.success) return null;
  const callAgainAt = resolveFollowUpAt(parsed.data, now);
  if (callAgainAt === null) return null;
  return command.kind === "record_contact_attempt"
    ? { kind: command.kind, outcome: command.outcome, callAgainAt }
    : { kind: command.kind, callAgainAt };
}
