import { z } from "zod";

import type { ClosureReason, ContactOutcome, RequestState } from "./contracts";

export interface RequestSnapshot {
  readonly state: RequestState;
  readonly version: number;
  readonly callAgainAt: string | null;
  readonly bookingConfirmedAt: string | null;
  readonly closedAt: string | null;
  readonly closureReason: ClosureReason | null;
  readonly legacyReviewRequired: boolean;
}

export type WorkflowCommand =
  | {
      readonly kind: "record_contact_attempt";
      readonly outcome: ContactOutcome;
      readonly callAgainAt: string;
    }
  | { readonly kind: "confirm_booking_handoff" }
  | { readonly kind: "close_request"; readonly reason: ClosureReason }
  | { readonly kind: "reopen_request"; readonly callAgainAt: string }
  | { readonly kind: "set_call_again"; readonly callAgainAt: string }
  | { readonly kind: "undo_latest_transition"; readonly restore: Omit<RequestSnapshot, "version"> }
  | {
      readonly kind: "classify_legacy_closure";
      readonly resolution: "booked" | { readonly reason: ClosureReason };
    };

export interface DomainFact {
  readonly type:
    | "ContactAttemptRecorded"
    | "BookingHandoffConfirmed"
    | "AppointmentRequestClosed"
    | "AppointmentRequestReopened"
    | "CallAgainSet"
    | "AppointmentRequestTransitionUndone"
    | "LegacyClosureClassified";
  readonly code?: string;
}

export type Decision =
  | { accepted: true; next: RequestSnapshot; facts: readonly DomainFact[] }
  | {
      accepted: false;
      code: "invalid_command" | "illegal_transition" | "undo_unavailable";
      facts: readonly [];
    };

const reject = (code: "invalid_command" | "illegal_transition" | "undo_unavailable"): Decision => ({
  accepted: false,
  code,
  facts: [],
});

function isAbsent(value: string | null): boolean {
  return value === null || value === "";
}

function isPresent(value: string | null): boolean {
  return value !== null && value !== "";
}

const callAgainAtSchema = z.iso
  .datetime({ offset: true })
  .refine((value) => value === value.trim());

function isCallAgainAt(value: string): boolean {
  return callAgainAtSchema.safeParse(value).success;
}

function coherent(value: Readonly<Omit<RequestSnapshot, "version">>): boolean {
  if (value.state === "new")
    return (
      isAbsent(value.callAgainAt) &&
      isAbsent(value.bookingConfirmedAt) &&
      isAbsent(value.closedAt) &&
      value.closureReason === null &&
      !value.legacyReviewRequired
    );
  if (value.state === "contacted")
    return (
      isAbsent(value.bookingConfirmedAt) &&
      isAbsent(value.closedAt) &&
      value.closureReason === null &&
      !value.legacyReviewRequired
    );
  if (value.state === "booked")
    return (
      isPresent(value.bookingConfirmedAt) &&
      isAbsent(value.callAgainAt) &&
      isAbsent(value.closedAt) &&
      value.closureReason === null &&
      !value.legacyReviewRequired
    );
  return (
    isAbsent(value.callAgainAt) &&
    isAbsent(value.bookingConfirmedAt) &&
    (value.legacyReviewRequired
      ? isAbsent(value.closedAt) && value.closureReason === null
      : // Migrated unconverted closures have a close clock but no typed reason.
        // The atomic RPC verifies their stored migration provenance before Undo.
        isPresent(value.closedAt))
  );
}

export function decide(
  current: Readonly<RequestSnapshot>,
  command: Readonly<WorkflowCommand>,
  now: Date,
): Decision {
  const next = (
    patch: Readonly<Partial<RequestSnapshot>>,
    fact: Readonly<DomainFact>,
  ): Decision => ({
    accepted: true,
    next: { ...current, ...patch, version: current.version + 1 },
    facts: [fact],
  });
  switch (command.kind) {
    case "record_contact_attempt": {
      if (current.state !== "new" && current.state !== "contacted")
        return reject("illegal_transition");
      if (!isCallAgainAt(command.callAgainAt)) return reject("invalid_command");
      return next(
        {
          state: "contacted",
          callAgainAt: command.callAgainAt,
          bookingConfirmedAt: null,
          closedAt: null,
          closureReason: null,
          legacyReviewRequired: false,
        },
        { type: "ContactAttemptRecorded", code: command.outcome },
      );
    }
    case "confirm_booking_handoff":
      if (current.state !== "new" && current.state !== "contacted")
        return reject("illegal_transition");
      return next(
        {
          state: "booked",
          callAgainAt: null,
          bookingConfirmedAt: now.toISOString(),
          closedAt: null,
          closureReason: null,
          legacyReviewRequired: false,
        },
        { type: "BookingHandoffConfirmed" },
      );
    case "close_request":
      if (current.state !== "new" && current.state !== "contacted")
        return reject("illegal_transition");
      if (current.state === "new" && command.reason !== "not_actionable")
        return reject("illegal_transition");
      return next(
        {
          state: "closed",
          callAgainAt: null,
          bookingConfirmedAt: null,
          closedAt: now.toISOString(),
          closureReason: command.reason,
          legacyReviewRequired: false,
        },
        { type: "AppointmentRequestClosed", code: command.reason },
      );
    case "reopen_request":
      if (
        (current.state !== "booked" && current.state !== "closed") ||
        current.legacyReviewRequired
      )
        return reject("illegal_transition");
      if (!isCallAgainAt(command.callAgainAt)) return reject("invalid_command");
      return next(
        {
          state: "contacted",
          callAgainAt: command.callAgainAt,
          bookingConfirmedAt: null,
          closedAt: null,
          closureReason: null,
          legacyReviewRequired: false,
        },
        { type: "AppointmentRequestReopened" },
      );
    case "set_call_again":
      if (current.state !== "contacted" || isPresent(current.callAgainAt))
        return reject("illegal_transition");
      if (!isCallAgainAt(command.callAgainAt)) return reject("invalid_command");
      return next({ callAgainAt: command.callAgainAt }, { type: "CallAgainSet" });
    case "undo_latest_transition":
      if (!coherent(command.restore)) return reject("undo_unavailable");
      return next(command.restore, { type: "AppointmentRequestTransitionUndone" });
    case "classify_legacy_closure":
      if (current.state !== "closed" || !current.legacyReviewRequired)
        return reject("illegal_transition");
      return command.resolution === "booked"
        ? next(
            {
              state: "booked",
              callAgainAt: null,
              bookingConfirmedAt: now.toISOString(),
              closedAt: null,
              closureReason: null,
              legacyReviewRequired: false,
            },
            { type: "LegacyClosureClassified", code: "booked" },
          )
        : next(
            {
              state: "closed",
              callAgainAt: null,
              bookingConfirmedAt: null,
              closedAt: now.toISOString(),
              closureReason: command.resolution.reason,
              legacyReviewRequired: false,
            },
            { type: "LegacyClosureClassified", code: command.resolution.reason },
          );
    default:
      return reject("invalid_command");
  }
}
