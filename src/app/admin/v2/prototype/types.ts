// Shared types for the day-sheet prototype's in-memory queue. The shapes
// mirror the workflow specification's storage responsibilities (§12.2) at
// prototype fidelity: current snapshot, append-only transitions with saved
// prior snapshots (for Undo), and typed request evidence rendered to staff
// as Request history.

import type {
  ContactOutcome,
  RequestSnapshot,
  RequestState,
  TransitionFact,
  UnbookedClosureReason,
} from "@/lib/portal/appointment-request-machine";

export type EntryBody =
  | { t: "received"; via: string }
  | {
      t: "attempt";
      outcome: ContactOutcome;
      callAgainDay: string | null;
      transitionVersion: number;
    }
  | { t: "booked"; transitionVersion: number }
  | {
      t: "closed";
      reason: UnbookedClosureReason;
      transitionVersion: number;
    }
  | { t: "reopened"; from: RequestState; transitionVersion: number }
  | {
      t: "classified";
      result: "booked" | UnbookedClosureReason;
      transitionVersion: number;
    }
  | { t: "undo"; restored: RequestState; compensatedVersion: number }
  | { t: "note"; text: string }
  | { t: "migrated" }
  | {
      t: "notification";
      accepted: number;
      failed: number;
    };

export type HistoryEntry = {
  id: string;
  at: string;
  /** Display name; "the website" for intake. Synthetic in the prototype. */
  actor: string;
  /** True once an Undo compensated this entry — rendered struck through. */
  struck: boolean;
  body: EntryBody;
};

export type StoredTransition = TransitionFact & {
  actor: string;
  /** Complete snapshot before this transition — Undo's restore source. */
  priorSnapshot: RequestSnapshot;
  /** The history entry rendering this action, struck if compensated. */
  entryId: string;
};

export type RequestLocation = "any" | "tampa" | "lutz";
export type RequestTime = "any" | "morning" | "afternoon";

export type PrototypeRequest = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  location: RequestLocation;
  preferredTime: RequestTime;
  /** The patient's own words from the form; may be empty. Synthetic. */
  reason: string | null;
  locale: string;
  receivedAt: string;
  snapshot: RequestSnapshot;
  /** Chronological append order; render newest-first. */
  entries: HistoryEntry[];
  transitions: StoredTransition[];
};

export const LOCATION_LABELS: Record<RequestLocation, string> = {
  any: "Either office",
  tampa: "Tampa",
  lutz: "Lutz",
};

export const TIME_LABELS: Record<RequestTime, string> = {
  any: "Any time",
  morning: "Morning",
  afternoon: "Afternoon",
};

export const LOCALE_FORM_LABELS: Record<string, string> = {
  en: "the English form",
  es: "the Spanish form",
  vi: "the Vietnamese form",
  ko: "the Korean form",
  ar: "the Arabic form",
};

export const OUTCOME_LABELS: Record<ContactOutcome, string> = {
  reached_follow_up: "Reached the patient",
  voicemail: "Left a voicemail",
  no_answer: "No answer",
};

export const CLOSURE_LABELS: Record<UnbookedClosureReason, string> = {
  not_actionable: "Duplicate or not actionable",
  wont_schedule: "Patient won't schedule",
};
