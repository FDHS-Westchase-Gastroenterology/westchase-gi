// Appointment-request workflow contracts — the UI-facing shape of the
// To-be state machine defined in
// Docs/appointment-request-workflow-specification.md (Parts III–IV).
//
// This module is pure and importable from client and server code alike.
// It owns the vocabulary the staff UI and the command shell share:
// States, commands, typed rejections, and the legal-action derivation
// That keeps rendered controls and server authority in agreement.
//
// Staff-facing language rule (spec §2): the durable state is
// `booked`; every staff surface renders it as **Scheduled**, never
// "Booked". Presentation labels live with the UI (requests/format.ts);
// This module deliberately carries only domain vocabulary.

import { z } from "zod";

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
 * Read-side normalization for retained legacy rows (spec §14):
 * this application understands the legacy stored value `scheduled` as
 * `booked` but never writes it.
 */
export function normalizeRequestState(raw: string): RequestState | null {
  if (raw === "scheduled") return "booked";
  return included(REQUEST_STATES, raw);
}

/**
 * A stored `status` column parsed into the durable state. Every row reader
 * decodes through this, so no reader spells the legacy alias itself.
 */
export const storedRequestStateSchema = z.string().transform((raw, ctx) => {
  const state = normalizeRequestState(raw);
  if (state === null) {
    ctx.addIssue({ code: "custom", message: `Unknown request state: ${raw}` });
    return z.NEVER;
  }
  return state;
});

// ---------------------------------------------------------------------------
// Staff-facing status (spec §2–§3). Staff views, URL filters, print
// Selections and the CSV export address requests by status, in which the
// Durable `booked` reads as `scheduled`. A status is never stored:
// `presentationStatus` is the one translation out of a state, and
// `VIEW_DB_STATUSES` the one translation back into stored values for a query.
// ---------------------------------------------------------------------------

export const REQUEST_STATUSES = ["new", "contacted", "scheduled", "closed"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export function parseRequestStatus(raw: string): RequestStatus | null {
  return included(REQUEST_STATUSES, raw);
}

export function presentationStatus(state: RequestState): RequestStatus {
  return state === "booked" ? "scheduled" : state;
}

/**
 * The stored `status` values a staff-facing status selects. Scheduled also
 * reads any retained legacy `scheduled` row (spec §14), the query-side twin
 * of `normalizeRequestState`.
 */
export const VIEW_DB_STATUSES = {
  new: ["new"],
  contacted: ["contacted"],
  scheduled: ["booked", "scheduled"],
  closed: ["closed"],
} as const satisfies Record<RequestStatus, readonly string[]>;

/** Per-status request counts for a staff surface; null marks a count whose read failed. */
export type StatusCounts = Readonly<Partial<Record<RequestStatus, number | null>>>;

/** Contact-attempt outcomes (spec §5.1). */
export const CONTACT_OUTCOMES = ["reached_follow_up", "voicemail", "no_answer"] as const;
export type ContactOutcome = (typeof CONTACT_OUTCOMES)[number];

export function parseContactOutcome(raw: string): ContactOutcome | null {
  return included(CONTACT_OUTCOMES, raw);
}

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
  "set_call_again",
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
  /** When the appointment is, once booked. Null means the time is unknown. */
  appointmentAt: string | null;
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
  /** Repair path for a legacy Contacted row whose call-again day is missing. */
  setCallAgain: boolean;
  classifyLegacyClosure: boolean;
}

export function legalActionsFor(
  state: RequestState,
  {
    legacyReviewRequired = false,
    callAgainAt,
  }: Readonly<{
    legacyReviewRequired?: boolean;
    callAgainAt?: string | null;
  }> = {},
): LegalActions {
  if (state === "closed" && legacyReviewRequired) {
    return {
      recordContactAttempt: false,
      confirmBookingHandoff: false,
      closeReasons: [],
      reopenRequest: false,
      setCallAgain: false,
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
        setCallAgain: false,
        classifyLegacyClosure: false,
      };
    case "contacted":
      return {
        recordContactAttempt: true,
        confirmBookingHandoff: true,
        closeReasons: ["not_actionable", "wont_schedule"],
        reopenRequest: false,
        setCallAgain: callAgainAt === null || callAgainAt === "",
        classifyLegacyClosure: false,
      };
    case "booked":
    case "closed":
      return {
        recordContactAttempt: false,
        confirmBookingHandoff: false,
        closeReasons: [],
        reopenRequest: true,
        setCallAgain: false,
        classifyLegacyClosure: false,
      };
    default:
      return {
        recordContactAttempt: false,
        confirmBookingHandoff: false,
        closeReasons: [],
        reopenRequest: false,
        setCallAgain: false,
        classifyLegacyClosure: false,
      };
  }
}

/** Undo correction boundary (spec §5.5): 15 minutes, a fixed policy. */
export const UNDO_WINDOW_MINUTES = 15;

// ---------------------------------------------------------------------------
// Read-side contracts: the work surface and Request history (spec §6).
// The backend read module composes these; the UI renders them. Actors are
// Staff emails — display-name resolution stays a UI concern.
// ---------------------------------------------------------------------------

/**
 * One Request history entry. History keeps notes, contact attempts,
 * transitions, delivery outcomes, and Undo evidence distinct.
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
      /** Immutable call-again time selected by reopen or a legacy correction. */
      callAgainAt: string | null;
      /** Immutable appointment time recorded by a booking handoff. */
      appointmentAt: string | null;
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
  /**
   * When the appointment is, while state is `booked`. Null means the time is
   * unknown — a booking recorded before the portal owned the calendar, or a
   * legacy closure reclassified as booked — never "no appointment".
   */
  appointmentAt: string | null;
  /** Closure facts while state is `closed` (null for legacy review rows). */
  closedAt: string | null;
  closureReason: ClosureReason | null;
  /** Eligible Undo for the latest reversible transition, if any. */
  undo: UndoWindow | null;
  history: HistoryEntry[];
}
