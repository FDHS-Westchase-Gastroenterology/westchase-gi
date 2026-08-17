// Appointment-request workflow contracts — the UI-facing shape of the
// To-be state machine defined in
// Docs/appointment-request-workflow-specification.md (Parts III–IV).
//
// This module is pure and importable from client and server code alike.
// It owns the vocabulary the staff UI and the command shell share:
// States, commands, typed rejections, and the legal-action derivation
// That keeps rendered controls and server authority in agreement.
//
// Staff-facing language rule (spec §2.2 / DEC-04): the durable state is
// `booked`; every staff surface renders it as **Scheduled**, never
// "Booked". Presentation labels live with the UI (requests/format.ts);
// This module deliberately carries only domain vocabulary.

/** Durable request states. `SCHEDULED` is not a state (spec §4.1). */
export const REQUEST_STATES = ["new", "contacted", "booked", "closed"] as const;
export type RequestState = (typeof REQUEST_STATES)[number];

function included<T extends string>(values: readonly T[], raw: string): T | null {
  for (const value of values) {
    if (value === raw) return value;
  }
  return null;
}

/**
 * Read-side normalization for the deploy-overlap window (spec §14.2 step 3):
 * this application understands the legacy stored value `scheduled` as
 * `booked` but never writes it.
 */
export function normalizeRequestState(raw: string): RequestState | null {
  if (raw === "scheduled") return "booked";
  return included(REQUEST_STATES, raw);
}

/** Contact-attempt outcomes (spec §5.1). */
const CONTACT_OUTCOMES = ["reached_follow_up", "voicemail", "no_answer"] as const;
export type ContactOutcome = (typeof CONTACT_OUTCOMES)[number];

/** Typed unbooked closure reasons (spec §5.3). */
export const CLOSURE_REASONS = ["not_actionable", "wont_schedule"] as const;
export type ClosureReason = (typeof CLOSURE_REASONS)[number];

export function parseClosureReason(raw: string): ClosureReason | null {
  return included(CLOSURE_REASONS, raw);
}

/** Semantic staff lifecycle commands (spec §5). */
export const WORKFLOW_COMMAND_KINDS = [
  "record_contact_attempt",
  "confirm_booking_handoff",
  "close_request",
  "reopen_request",
  "undo_latest_transition",
  "classify_legacy_closure",
] as const;
export type WorkflowCommandKind = (typeof WORKFLOW_COMMAND_KINDS)[number];

export function parseWorkflowCommandKind(raw: string): WorkflowCommandKind | null {
  return included(WORKFLOW_COMMAND_KINDS, raw);
}

/**
 * Typed command rejections (spec §7.1). `unavailable` is the shell's
 * infrastructure failure, distinct from every domain rejection: nothing
 * is known to have been written, and nothing may be presented as saved.
 */
export const COMMAND_REJECTIONS = [
  "unauthorized",
  "not_found",
  "invalid_command",
  "illegal_transition",
  "stale_version",
  "idempotency_conflict",
  "undo_unavailable",
  "unavailable",
] as const;
export type CommandRejection = (typeof COMMAND_REJECTIONS)[number];

/** The durable truth returned alongside a `stale_version` rejection. */
export interface CurrentTruth {
  state: RequestState;
  version: number;
}

/**
 * An eligible Undo affordance: the latest reversible transition and the
 * durable moment its 15-minute correction window closes (spec §5.5).
 */
export interface UndoWindow {
  transitionId: string;
  command: WorkflowCommandKind;
  occurredAt: string;
  expiresAt: string;
}

export interface CommandSuccess {
  ok: true;
  state: RequestState;
  version: number;
  /** Current call-again attention value after the command, if any. */
  callAgainAt: string | null;
  /** Undo eligibility for the transition this command appended. */
  undo: UndoWindow | null;
}

export interface CommandFailure {
  ok: false;
  code: CommandRejection;
  /** Present on `stale_version`: the truth to re-derive legal actions from. */
  current?: CurrentTruth;
}

export type CommandOutcome = CommandSuccess | CommandFailure;

/**
 * The staff work commands legal from a state (spec §8 transition matrix).
 * The UI derives its controls from this; the server re-decides with the
 * same policy. A hidden control is never the authorization.
 */
export interface LegalActions {
  recordContactAttempt: boolean;
  confirmBookingHandoff: boolean;
  /** Closure reasons legal from this state (empty when close is illegal). */
  closeReasons: readonly ClosureReason[];
  reopenRequest: boolean;
  classifyLegacyClosure: boolean;
}

export function legalActionsFor(
  state: RequestState,
  { legacyReviewRequired = false }: Readonly<{ legacyReviewRequired?: boolean }> = {},
): LegalActions {
  if (state === "closed" && legacyReviewRequired) {
    return {
      recordContactAttempt: false,
      confirmBookingHandoff: false,
      closeReasons: [],
      reopenRequest: false,
      classifyLegacyClosure: true,
    };
  }
  switch (state) {
    case "new":
      return {
        recordContactAttempt: true,
        confirmBookingHandoff: true,
        closeReasons: ["not_actionable"],
        reopenRequest: false,
        classifyLegacyClosure: false,
      };
    case "contacted":
      return {
        recordContactAttempt: true,
        confirmBookingHandoff: true,
        closeReasons: ["not_actionable", "wont_schedule"],
        reopenRequest: false,
        classifyLegacyClosure: false,
      };
    case "booked":
    case "closed":
      return {
        recordContactAttempt: false,
        confirmBookingHandoff: false,
        closeReasons: [],
        reopenRequest: true,
        classifyLegacyClosure: false,
      };
    default:
      return {
        recordContactAttempt: false,
        confirmBookingHandoff: false,
        closeReasons: [],
        reopenRequest: false,
        classifyLegacyClosure: false,
      };
  }
}

/** Undo correction boundary (spec §5.5): 15 minutes, a fixed policy. */
export const UNDO_WINDOW_MINUTES = 15;

// ---------------------------------------------------------------------------
// Read-side contracts: the work surface and Request history (spec §6, DEC-05).
// The backend read module composes these; the UI renders them. Actors are
// Staff emails — display-name resolution stays a UI concern.
// ---------------------------------------------------------------------------

/**
 * One Request history entry. History keeps notes, contact attempts,
 * transitions, delivery outcomes, and Undo evidence distinct (DEC-05).
 * Entries render newest-first; `at` is the durable occurrence time.
 */
export type HistoryEntry =
  | { kind: "created"; origin: "staff" | "website"; at: string }
  | {
      kind: "contact_attempt";
      id: string;
      outcome: ContactOutcome;
      callAgainAt: string | null;
      actor: string;
      at: string;
    }
  | { kind: "note"; id: string; text: string; actor: string; at: string }
  | {
      kind: "transition";
      id: string;
      command: WorkflowCommandKind;
      from: RequestState;
      to: RequestState;
      closureReason: ClosureReason | null;
      /** True when a later Undo compensated this transition. */
      undone: boolean;
      actor: string;
      at: string;
    }
  | {
      kind: "undo";
      id: string;
      restoredState: RequestState;
      actor: string;
      at: string;
    }
  | {
      kind: "legacy_classified";
      id: string;
      to: RequestState;
      actor: string;
      at: string;
    }
  | {
      kind: "delivery";
      id: string;
      recipient: string;
      accepted: boolean;
      at: string;
    };

/**
 * Everything the request work surface needs in one read: durable truth,
 * version for optimistic commands, legal-action inputs, Undo eligibility,
 * and composed Request history.
 */
export interface RequestWorkSurface {
  id: string;
  state: RequestState;
  version: number;
  legacyReviewRequired: boolean;
  /** Current call-again attention value (CONTACTED only, spec §7.2). */
  callAgainAt: string | null;
  /** Booking-handoff confirmation time while state is `booked`. */
  bookingConfirmedAt: string | null;
  /** Closure facts while state is `closed` (null for legacy review rows). */
  closedAt: string | null;
  closureReason: ClosureReason | null;
  /** Eligible Undo for the latest reversible transition, if any. */
  undo: UndoWindow | null;
  history: HistoryEntry[];
}
