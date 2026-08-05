// The to-be appointment-request machine — pure domain core.
//
// Implements the transition system decided in
// docs/appointment-request-workflow-specification.md (§4–§10): states
// NEW → CONTACTED → BOOKED/CLOSED, semantic commands, guarded exceptional
// paths (Reopen, Undo, legacy classification), and the state-shape
// invariants. Deterministic and side-effect free per §9.1: no Supabase, no
// clock reads, no email — the imperative shell (today: the v2 prototype
// store; build era: the server command authority) supplies current state,
// actor capability, and explicit time, then persists accepted decisions.
//
// This module is the single transition authority for every caller (§13.2).
// It deliberately implements the to-be model, not the running production
// schema; nothing here authorizes a migration or a hosted change.

export type RequestState = "NEW" | "CONTACTED" | "BOOKED" | "CLOSED";

export type ContactOutcome = "reached_follow_up" | "voicemail" | "no_answer";

export type UnbookedClosureReason = "not_actionable" | "wont_schedule";

export type LegacyClassification =
  | { kind: "booked" }
  | { kind: "unbooked"; reason: UnbookedClosureReason };

/** Current-state shape of one appointment request (§12.2, current request). */
export type RequestSnapshot = {
  state: RequestState;
  /** Monotonic optimistic version; every accepted command advances it once. */
  version: number;
  /** Practice-local YYYY-MM-DD; only CONTACTED may carry one (§4.2). */
  callAgainDay: string | null;
  closureReason: UnbookedClosureReason | null;
  closedAt: string | null;
  bookingHandoffAt: string | null;
  legacyReviewRequired: boolean;
};

export type RequestCommand =
  | {
      kind: "record_contact_attempt";
      outcome: ContactOutcome;
      /** Required for voicemail/no_answer, optional for reached_follow_up (§5.1). */
      callAgainDay: string | null;
    }
  /** The staff control for this command is labeled “Scheduled” (§5.2). */
  | { kind: "confirm_booking_handoff" }
  | { kind: "close_request"; reason: UnbookedClosureReason }
  | { kind: "reopen_request" }
  | { kind: "classify_legacy_closure"; classification: LegacyClassification };

export type CommandKind = RequestCommand["kind"];

export type DomainError =
  | "illegal_transition"
  | "invalid_command"
  | "stale_version";

/** Explicit time from the shell — never read from a clock here (§9.1). */
export type DomainClock = {
  /** ISO instant for evidence timestamps. */
  iso: string;
  /** Practice-local calendar day, YYYY-MM-DD, for call-again bounds. */
  day: string;
};

export type TransitionFact = {
  from: RequestState;
  to: RequestState;
  command: CommandKind | "undo_latest_transition";
  /** Non-PHI outcome/reason code where applicable (§6). */
  code: string | null;
  resultingVersion: number;
  occurredAt: string;
  /** Set only on an Undo fact: the compensated transition's version (§6). */
  compensatesVersion?: number;
};

export type Decision =
  | { ok: true; next: RequestSnapshot; fact: TransitionFact }
  | { ok: false; error: DomainError };

export const CALL_AGAIN_MAX_DAYS = 90;

/** Correction boundary for UndoLatestTransition (§5.5) in milliseconds. */
export const UNDO_WINDOW_MS = 15 * 60 * 1000;

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function dayNumber(day: string): number {
  // Parse at UTC noon so the difference math never crosses a DST edge.
  return Math.round(Date.parse(`${day}T12:00:00Z`) / 86_400_000);
}

/** Present-to-90-days, practice-local (§5.1). */
export function callAgainDayInBounds(day: string, today: string): boolean {
  if (!DAY_PATTERN.test(day) || !DAY_PATTERN.test(today)) return false;
  const offset = dayNumber(day) - dayNumber(today);
  return offset >= 0 && offset <= CALL_AGAIN_MAX_DAYS;
}

function accepted(
  current: RequestSnapshot,
  next: Omit<RequestSnapshot, "version">,
  command: CommandKind,
  code: string | null,
  clock: DomainClock,
): Decision {
  const resultingVersion = current.version + 1;
  return {
    ok: true,
    next: { ...next, version: resultingVersion },
    fact: {
      from: current.state,
      to: next.state,
      command,
      code,
      resultingVersion,
      occurredAt: clock.iso,
    },
  };
}

const rejected = (error: DomainError): Decision => ({ ok: false, error });

/**
 * Decide one staff lifecycle command (§9.1):
 *
 *   transition(current, command, expected version, explicit time)
 *     → accepted(next current state, transition fact)
 *     | rejected(typed domain error)
 *
 * Undefined transitions reject without mutation. The shell owns actor
 * authorization, idempotency receipts, persistence atomicity, and the
 * notification outbox; this function owns legality and the resulting shape.
 */
export function decideCommand(
  current: RequestSnapshot,
  command: RequestCommand,
  expectedVersion: number,
  clock: DomainClock,
): Decision {
  if (expectedVersion !== current.version) return rejected("stale_version");

  switch (command.kind) {
    case "record_contact_attempt": {
      if (current.state !== "NEW" && current.state !== "CONTACTED") {
        return rejected("illegal_transition");
      }
      const needsDay =
        command.outcome === "voicemail" || command.outcome === "no_answer";
      if (needsDay && command.callAgainDay === null) {
        return rejected("invalid_command");
      }
      if (
        command.callAgainDay !== null &&
        !callAgainDayInBounds(command.callAgainDay, clock.day)
      ) {
        return rejected("invalid_command");
      }
      return accepted(
        current,
        {
          state: "CONTACTED",
          callAgainDay: command.callAgainDay,
          closureReason: null,
          closedAt: null,
          bookingHandoffAt: null,
          legacyReviewRequired: false,
        },
        command.kind,
        command.outcome,
        clock,
      );
    }

    case "confirm_booking_handoff": {
      if (current.state !== "NEW" && current.state !== "CONTACTED") {
        return rejected("illegal_transition");
      }
      return accepted(
        current,
        {
          state: "BOOKED",
          callAgainDay: null,
          closureReason: null,
          closedAt: null,
          bookingHandoffAt: clock.iso,
          legacyReviewRequired: false,
        },
        command.kind,
        null,
        clock,
      );
    }

    case "close_request": {
      if (current.state !== "NEW" && current.state !== "CONTACTED") {
        return rejected("illegal_transition");
      }
      // wont_schedule asserts a contact-dependent outcome (§5.3).
      if (current.state === "NEW" && command.reason === "wont_schedule") {
        return rejected("illegal_transition");
      }
      return accepted(
        current,
        {
          state: "CLOSED",
          callAgainDay: null,
          closureReason: command.reason,
          closedAt: clock.iso,
          bookingHandoffAt: null,
          legacyReviewRequired: false,
        },
        command.kind,
        command.reason,
        clock,
      );
    }

    case "reopen_request": {
      if (current.state !== "BOOKED" && current.state !== "CLOSED") {
        return rejected("illegal_transition");
      }
      if (current.legacyReviewRequired) return rejected("illegal_transition");
      return accepted(
        current,
        {
          state: "CONTACTED",
          callAgainDay: null,
          closureReason: null,
          closedAt: null,
          bookingHandoffAt: null,
          legacyReviewRequired: false,
        },
        command.kind,
        null,
        clock,
      );
    }

    case "classify_legacy_closure": {
      if (current.state !== "CLOSED" || !current.legacyReviewRequired) {
        return rejected("illegal_transition");
      }
      if (command.classification.kind === "booked") {
        // Retention starts no earlier than the review (§5.6); no historical
        // visit or handoff time is invented.
        return accepted(
          current,
          {
            state: "BOOKED",
            callAgainDay: null,
            closureReason: null,
            closedAt: null,
            bookingHandoffAt: clock.iso,
            legacyReviewRequired: false,
          },
          command.kind,
          "booked",
          clock,
        );
      }
      return accepted(
        current,
        {
          state: "CLOSED",
          callAgainDay: null,
          closureReason: command.classification.reason,
          closedAt: clock.iso,
          bookingHandoffAt: null,
          legacyReviewRequired: false,
        },
        command.kind,
        command.classification.reason,
        clock,
      );
    }
  }
}

export type UndoIneligibility =
  | "not_latest"
  | "stale_version"
  | "window_closed"
  | "not_reversible";

/**
 * UndoLatestTransition eligibility (§5.5, §10.3). The shell passes the
 * candidate transition fact, the request's durable current version, and
 * explicit time; the saved prior snapshot itself is shell-held evidence.
 * Intake creation, migration backfills, and legacy classification are not
 * reversible through this staff command.
 */
export function undoEligibility(
  candidate: TransitionFact,
  latestTransitionVersion: number,
  currentVersion: number,
  nowIso: string,
): { eligible: true } | { eligible: false; reason: UndoIneligibility } {
  if (candidate.command === "classify_legacy_closure") {
    return { eligible: false, reason: "not_reversible" };
  }
  if (candidate.resultingVersion !== latestTransitionVersion) {
    return { eligible: false, reason: "not_latest" };
  }
  if (candidate.resultingVersion !== currentVersion) {
    return { eligible: false, reason: "stale_version" };
  }
  const elapsed = Date.parse(nowIso) - Date.parse(candidate.occurredAt);
  if (!(elapsed >= 0 && elapsed <= UNDO_WINDOW_MS)) {
    return { eligible: false, reason: "window_closed" };
  }
  return { eligible: true };
}

/**
 * Apply an eligible Undo: restore the saved prior snapshot while the
 * version advances again rather than moving backward, and append a
 * compensating fact referencing the compensated transition (§5.5, §6).
 * History is never deleted or rewritten.
 */
export function applyUndo(
  current: RequestSnapshot,
  compensated: TransitionFact,
  priorSnapshot: RequestSnapshot,
  clock: DomainClock,
): { next: RequestSnapshot; fact: TransitionFact } {
  const resultingVersion = current.version + 1;
  return {
    next: { ...priorSnapshot, version: resultingVersion },
    fact: {
      from: current.state,
      to: priorSnapshot.state,
      command: "undo_latest_transition",
      code: null,
      resultingVersion,
      occurredAt: clock.iso,
      compensatesVersion: compensated.resultingVersion,
    },
  };
}
