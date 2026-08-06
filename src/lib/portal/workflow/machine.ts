import type {
  ClosureReason,
  ContactOutcome,
  RequestState,
  WorkflowCommandKind,
} from "./contracts";

export type RequestSnapshot = {
  state: RequestState;
  version: number;
  callAgainAt: string | null;
  bookingConfirmedAt: string | null;
  closedAt: string | null;
  closureReason: ClosureReason | null;
  legacyReviewRequired: boolean;
};

export type WorkflowCommand =
  | { kind: "record_contact_attempt"; outcome: ContactOutcome; callAgainAt: string | null }
  | { kind: "confirm_booking_handoff" }
  | { kind: "close_request"; reason: ClosureReason }
  | { kind: "reopen_request" }
  | { kind: "undo_latest_transition"; restore: Omit<RequestSnapshot, "version"> }
  | { kind: "classify_legacy_closure"; resolution: "booked" | { reason: ClosureReason } };

export type DomainFact = {
  type:
    | "ContactAttemptRecorded"
    | "BookingHandoffConfirmed"
    | "AppointmentRequestClosed"
    | "AppointmentRequestReopened"
    | "AppointmentRequestTransitionUndone"
    | "LegacyClosureClassified";
  code?: string;
};

export type Decision =
  | { accepted: true; next: RequestSnapshot; facts: readonly DomainFact[] }
  | { accepted: false; code: "invalid_command" | "illegal_transition" | "undo_unavailable"; facts: readonly [] };

const reject = (code: "invalid_command" | "illegal_transition" | "undo_unavailable"): Decision => ({ accepted: false, code, facts: [] });

function coherent(value: Omit<RequestSnapshot, "version">): boolean {
  if (value.state === "new") return !value.callAgainAt && !value.bookingConfirmedAt && !value.closedAt && !value.closureReason && !value.legacyReviewRequired;
  if (value.state === "contacted") return !value.bookingConfirmedAt && !value.closedAt && !value.closureReason && !value.legacyReviewRequired;
  if (value.state === "booked") return !!value.bookingConfirmedAt && !value.callAgainAt && !value.closedAt && !value.closureReason && !value.legacyReviewRequired;
  return !value.callAgainAt && !value.bookingConfirmedAt && (value.legacyReviewRequired ? !value.closedAt && !value.closureReason : !!value.closedAt && !!value.closureReason);
}

export function decide(current: RequestSnapshot, command: WorkflowCommand, now: Date): Decision {
  const next = (patch: Partial<RequestSnapshot>, fact: DomainFact): Decision => ({
    accepted: true,
    next: { ...current, ...patch, version: current.version + 1 },
    facts: [fact],
  });
  switch (command.kind) {
    case "record_contact_attempt": {
      if (current.state !== "new" && current.state !== "contacted") return reject("illegal_transition");
      const required = command.outcome === "voicemail" || command.outcome === "no_answer";
      if (required !== Boolean(command.callAgainAt) && (required || command.callAgainAt === "")) return reject("invalid_command");
      return next({ state: "contacted", callAgainAt: command.callAgainAt, bookingConfirmedAt: null, closedAt: null, closureReason: null, legacyReviewRequired: false }, { type: "ContactAttemptRecorded", code: command.outcome });
    }
    case "confirm_booking_handoff":
      if (current.state !== "new" && current.state !== "contacted") return reject("illegal_transition");
      return next({ state: "booked", callAgainAt: null, bookingConfirmedAt: now.toISOString(), closedAt: null, closureReason: null, legacyReviewRequired: false }, { type: "BookingHandoffConfirmed" });
    case "close_request":
      if (current.state !== "new" && current.state !== "contacted") return reject("illegal_transition");
      if (current.state === "new" && command.reason !== "not_actionable") return reject("illegal_transition");
      return next({ state: "closed", callAgainAt: null, bookingConfirmedAt: null, closedAt: now.toISOString(), closureReason: command.reason, legacyReviewRequired: false }, { type: "AppointmentRequestClosed", code: command.reason });
    case "reopen_request":
      if ((current.state !== "booked" && current.state !== "closed") || current.legacyReviewRequired) return reject("illegal_transition");
      return next({ state: "contacted", callAgainAt: null, bookingConfirmedAt: null, closedAt: null, closureReason: null, legacyReviewRequired: false }, { type: "AppointmentRequestReopened" });
    case "undo_latest_transition":
      if (!coherent(command.restore)) return reject("undo_unavailable");
      return next(command.restore, { type: "AppointmentRequestTransitionUndone" });
    case "classify_legacy_closure":
      if (current.state !== "closed" || !current.legacyReviewRequired) return reject("illegal_transition");
      return command.resolution === "booked"
        ? next({ state: "booked", callAgainAt: null, bookingConfirmedAt: now.toISOString(), closedAt: null, closureReason: null, legacyReviewRequired: false }, { type: "LegacyClosureClassified", code: "booked" })
        : next({ state: "closed", callAgainAt: null, bookingConfirmedAt: null, closedAt: now.toISOString(), closureReason: command.resolution.reason, legacyReviewRequired: false }, { type: "LegacyClosureClassified", code: command.resolution.reason });
  }
}

export function commandKind(command: WorkflowCommand): WorkflowCommandKind { return command.kind; }
