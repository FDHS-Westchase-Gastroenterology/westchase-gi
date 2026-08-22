/**
 * Appointment-request workflow decisions — the pure state machine.
 *
 * decide() is the single write authority for request transitions: it takes
 * the current durable snapshot and one staff command, and returns either
 * the next snapshot plus the domain facts to record, or a typed rejection.
 * It performs no I/O, reads no clock it was not handed, and never mutates
 * its inputs, so every rule below is unit-testable without a database.
 *
 * Invariants the commands preserve:
 * - Contact attempts are append-only evidence. Repeated attempts keep
 *   their own outcomes; CONTACTED never claims the patient was reached.
 * - The call-again day (callAgainAt) survives only while a request is
 *   CONTACTED; every other transition clears it.
 * - Undo restores the previous position without erasing the transition
 *   from Request history: the restore snapshot arrives as a command
 *   argument validated for coherence, never reconstructed here.
 * - A NEW request may only close as not_actionable: staff cannot close
 *   work they never touched as "patient won't schedule".
 *
 * The UI-facing vocabulary and legal-action derivation live in
 * workflow/contracts.ts; the command shell that persists decisions lives
 * in workflow/commands.ts.
 */
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
      readonly callAgainAt: string | null;
    }
  | { readonly kind: "confirm_booking_handoff" }
  | { readonly kind: "close_request"; readonly reason: ClosureReason }
  | { readonly kind: "reopen_request" }
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

/**
 * NEW and CONTACTED are the unresolved states: work a staff member can
 * still act on. BOOKED and CLOSED are terminal for ordinary work until
 * reopened.
 */
function isUnresolved(state: RequestState): boolean {
  return state === "new" || state === "contacted";
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
      : isPresent(value.closedAt) && value.closureReason !== null)
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
      if (!isUnresolved(current.state)) return reject("illegal_transition");
      const required = command.outcome === "voicemail" || command.outcome === "no_answer";
      if (required !== Boolean(command.callAgainAt) && (required || command.callAgainAt === ""))
        return reject("invalid_command");
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
      // The staff action label renders as "Scheduled"; the durable fact is
      // The confirmed booking handoff.
      if (!isUnresolved(current.state)) return reject("illegal_transition");
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
      if (!isUnresolved(current.state)) return reject("illegal_transition");
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
      return next(
        {
          state: "contacted",
          callAgainAt: null,
          bookingConfirmedAt: null,
          closedAt: null,
          closureReason: null,
          legacyReviewRequired: false,
        },
        { type: "AppointmentRequestReopened" },
      );
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
