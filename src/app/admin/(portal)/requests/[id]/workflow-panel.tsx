"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";

import { usePortalFeedback } from "@/app/admin/(portal)/portal-feedback";
import {
  appointmentChoice,
  isValidAppointmentDay,
  isValidCustomCallAgainDay,
  practiceLocalDay,
} from "@/app/admin/(portal)/requests/appointment-input";
import { followUpWhenLabel, STATE_LABELS } from "@/app/admin/(portal)/requests/format";
import {
  classifyLegacyClosure,
  closeRequest,
  confirmBookingHandoff,
  recordContactAttempt,
  reopenRequest,
  setCallAgain,
  undoLatestTransition,
} from "@/app/admin/(portal)/requests/workflow-actions";
import { Check } from "@/components/icons";
import type { FollowUpChoice } from "@/lib/portal/business-time";
import { legalActionsFor } from "@/lib/portal/workflow/contracts";
import type {
  ClosureReason,
  CommandOutcome,
  CommandRejection,
  ContactOutcome,
  LegalActions,
  RequestState,
  UndoWindow,
} from "@/lib/portal/workflow/contracts";

// The request work panel. One question — "What happened?" — answered with
// The real-world outcomes staff just lived through. Every rendered choice
// Derives from the legal-action policy the server itself re-decides with
// (spec §7: UI actions derive from the same legal-action policy as the
// Backend), so the interface can never offer a move the domain would
// Refuse. The old "pick the request's next status" model is retired with
// The generic status setter (spec §1): staff record facts, and the state
// Machine decides where the request goes.

// ---------------------------------------------------------------------------
// Choice vocabulary: each radio row IS a semantic command, in the same
// Front-desk words the retired composer taught staff. Serialized ids keep
// Radio semantics native (arrow keys, form semantics) without extra state.
// ---------------------------------------------------------------------------

type ActionChoice =
  | { readonly kind: "attempt"; readonly outcome: ContactOutcome }
  | { readonly kind: "booked" }
  | { readonly kind: "close"; readonly reason: ClosureReason };

type ChoiceId = `attempt:${ContactOutcome}` | "booked" | `close:${ClosureReason}`;

function choiceId(choice: Readonly<ActionChoice>): ChoiceId {
  if (choice.kind === "attempt") return `attempt:${choice.outcome}`;
  if (choice.kind === "close") return `close:${choice.reason}`;
  return "booked";
}

interface ChoiceRow {
  readonly choice: ActionChoice;
  readonly label: string;
  readonly helper?: string;
}

const ATTEMPT_ROWS: ChoiceRow[] = [
  {
    choice: { kind: "attempt", outcome: "reached_follow_up" },
    label: "Reached the patient — follow-up needed",
    helper: "Talked it through; call again to finish.",
  },
  {
    choice: { kind: "attempt", outcome: "voicemail" },
    label: "Left a voicemail — call again",
  },
  {
    choice: { kind: "attempt", outcome: "no_answer" },
    label: "No answer — call again",
  },
];

const BOOKED_ROW: ChoiceRow = {
  choice: { kind: "booked" },
  label: "Appointment booked",
  helper: "Booked in the practice scheduling system — this request becomes Scheduled.",
};

const CLOSE_ROWS = {
  wont_schedule: {
    choice: { kind: "close", reason: "wont_schedule" },
    label: "Patient won't schedule",
    helper: "Done — no appointment. Leaves the active queue.",
  },
  not_actionable: {
    choice: { kind: "close", reason: "not_actionable" },
    label: "Duplicate or not actionable",
    helper: "Done — no appointment. Leaves the active queue.",
  },
} as const satisfies Record<ClosureReason, ChoiceRow>;

type FollowUpKind = "this_afternoon" | "tomorrow_morning" | "friday" | "day";

const FOLLOW_UP_KINDS: { kind: FollowUpKind; label: string }[] = [
  { kind: "this_afternoon", label: "This afternoon" },
  { kind: "tomorrow_morning", label: "Tomorrow morning" },
  { kind: "friday", label: "Friday" },
  { kind: "day", label: "Pick a day…" },
];

const NY_CLOCK = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "America/New_York",
});

// ---------------------------------------------------------------------------
// Copy. Success names the staff-facing result (Scheduled, never Booked);
// Failure names what is and is not known to have been saved (spec §7:
// Never report false success; `unavailable` may or may not have written).
// ---------------------------------------------------------------------------

function successCopy(
  choice: Readonly<
    ActionChoice | { kind: "reopen" } | { kind: "set_call_again" } | { kind: "classify" }
  >,
  outcome: Readonly<{ state: RequestState; callAgainAt: string | null }>,
): string {
  switch (choice.kind) {
    case "attempt":
      return outcome.callAgainAt !== null && outcome.callAgainAt !== ""
        ? `Saved — marked Contacted. It will resurface ${followUpWhenLabel(outcome.callAgainAt)}.`
        : "Saved — marked Contacted.";
    case "booked":
      return "Saved — marked Scheduled. It stays on the Scheduled view if you need it.";
    case "close":
      return "Saved — the request is closed.";
    case "reopen":
      return outcome.callAgainAt !== null && outcome.callAgainAt !== ""
        ? `Reopened — back to Contacted. Call again ${followUpWhenLabel(outcome.callAgainAt)}.`
        : "Reopened — back to Contacted for more work.";
    case "set_call_again":
      return outcome.callAgainAt !== null && outcome.callAgainAt !== ""
        ? `Saved — call again ${followUpWhenLabel(outcome.callAgainAt)}.`
        : "Saved.";
    case "classify":
      return outcome.state === "booked"
        ? "Record finished — marked Scheduled."
        : "Record finished — the request stays closed.";
  }
  return "Saved.";
}

type PanelFailureCode =
  | "invalid_command"
  | "not_found"
  | "idempotency_conflict"
  | "undo_unavailable"
  | "unauthorized"
  | "unavailable";

const FAILURE_COPY = {
  invalid_command:
    "Something about that didn't check out. Nothing was recorded — review and try again.",
  not_found:
    "This request no longer exists — it may have been removed. Open Appointments to see the current list.",
  idempotency_conflict:
    "That save was already recorded differently. The page has been brought up to date — check Request history.",
  undo_unavailable:
    "Undo is no longer available — its 15-minute window closed or the request moved on. Nothing changed.",
  unauthorized:
    "Your session can't make this change. Sign in again, then check Request history before repeating anything.",
  unavailable:
    "Something went wrong saving that. Nothing may have been recorded — check Request history before repeating anything.",
} as const satisfies Record<PanelFailureCode, string>;

function isPanelFailureCode(value: string): value is PanelFailureCode {
  return value in FAILURE_COPY;
}

function failureCopy(code: CommandRejection): string {
  return isPanelFailureCode(code) ? FAILURE_COPY[code] : FAILURE_COPY.unavailable;
}

// ---------------------------------------------------------------------------
// Panel state
// ---------------------------------------------------------------------------

/** The durable truth the panel is acting on. Commands carry its version. */
interface Truth {
  readonly state: RequestState;
  readonly version: number;
  readonly legacyReviewRequired: boolean;
  readonly callAgainAt: string | null;
  readonly undo: UndoWindow | null;
}

type Feedback =
  | { readonly tone: "success"; readonly text: string; readonly closedOrBooked: boolean }
  | { readonly tone: "error"; readonly text: string };

interface PanelState {
  readonly selected: ChoiceId | null;
  readonly followUpKind: FollowUpKind | null;
  readonly followUpDay: string;
  /** The appointment a booking is recording: practice-local day and wall time. */
  readonly appointmentDay: string;
  readonly appointmentTime: string;
  /** Legacy review: has staff said whether an appointment was booked? */
  readonly reviewResolution: "booked" | ClosureReason | null;
  readonly feedback: Feedback | null;
}

type PanelAction =
  | { readonly type: "select"; readonly id: ChoiceId }
  | { readonly type: "select_follow_up"; readonly kind: FollowUpKind }
  | { readonly type: "set_day"; readonly day: string }
  | { readonly type: "set_appointment_day"; readonly day: string }
  | { readonly type: "set_appointment_time"; readonly time: string }
  | { readonly type: "select_review"; readonly resolution: "booked" | ClosureReason }
  | { readonly type: "succeeded"; readonly text: string; readonly closedOrBooked: boolean }
  | { readonly type: "failed"; readonly text: string };

const INITIAL_PANEL: PanelState = {
  selected: null,
  followUpKind: null,
  followUpDay: "",
  appointmentDay: "",
  appointmentTime: "",
  reviewResolution: null,
  feedback: null,
};

function panelReducer(state: Readonly<PanelState>, action: Readonly<PanelAction>): PanelState {
  switch (action.type) {
    case "select":
      if (action.id.startsWith("attempt:")) {
        return {
          ...state,
          selected: action.id,
          feedback: null,
        };
      }
      return {
        ...state,
        selected: action.id,
        feedback: null,
        followUpKind: null,
        followUpDay: "",
      };
    case "select_follow_up":
      return { ...state, followUpKind: action.kind, feedback: null };
    case "set_day":
      return { ...state, followUpDay: action.day, feedback: null };
    case "set_appointment_day":
      return { ...state, appointmentDay: action.day, feedback: null };
    case "set_appointment_time":
      return { ...state, appointmentTime: action.time, feedback: null };
    case "select_review":
      return {
        ...state,
        reviewResolution: action.resolution,
        feedback: null,
      };
    case "succeeded":
      return {
        ...INITIAL_PANEL,
        feedback: {
          tone: "success",
          text: action.text,
          closedOrBooked: action.closedOrBooked,
        },
      };
    case "failed":
      return { ...state, feedback: { tone: "error", text: action.text } };
  }
  return state;
}

// ---------------------------------------------------------------------------
// Presentational pieces. The outcome list is one native radio group.
// Sr-only inputs sit inside whole-row labels on ruled decision rows.
// All five outcomes share one continuous keyboard sequence.
// Each row height follows its own copy. The equal-card matrix is retired.
// ---------------------------------------------------------------------------

function DecisionRow({
  name,
  value,
  checked,
  disabled,
  label,
  helper,
  onSelect,
}: Readonly<{
  name: string;
  value: string;
  checked: boolean;
  disabled: boolean;
  label: string;
  helper?: string;
  onSelect: () => void;
}>) {
  return (
    <label className="portal-choice-row">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
        className="sr-only"
      />
      <span aria-hidden="true" className="portal-choice-indicator">
        <Check className="portal-choice-check" />
      </span>
      <span className="portal-choice-copy">
        <span className="portal-choice-label">{label}</span>
        {helper !== undefined && helper !== "" ? (
          <span className="portal-choice-helper">{helper}</span>
        ) : null}
      </span>
    </label>
  );
}

function CallAgainFieldset({
  name,
  legend,
  description,
  followUpKind,
  followUpDay,
  pending,
  onKindChange,
  onDayChange,
  className = "mt-5",
}: Readonly<{
  name: string;
  legend: string;
  description: string;
  followUpKind: FollowUpKind | null;
  followUpDay: string;
  pending: boolean;
  onKindChange: (kind: FollowUpKind) => void;
  onDayChange: (day: string) => void;
  className?: string;
}>) {
  const descriptionId = `${name}-description`;
  const dayId = `${name}-day`;
  const dayLabelId = `${name}-day-label`;
  const dayHintId = `${name}-day-hint`;
  const errorId = `${name}-error`;
  const pickADayId = `${name}-kind-day`;
  const customDayInvalid =
    followUpKind === "day" && followUpDay !== "" && !isValidCustomCallAgainDay(followUpDay);
  const dayDescribedBy = customDayInvalid ? `${dayHintId} ${errorId}` : dayHintId;

  return (
    <fieldset
      className={className}
      disabled={pending}
      aria-describedby={customDayInvalid ? `${descriptionId} ${errorId}` : descriptionId}
    >
      <legend className="text-sm font-bold text-[var(--color-ink)]">{legend}</legend>
      <p
        id={descriptionId}
        data-testid={`${name}-required-explanation`}
        className="mt-1 text-sm leading-relaxed text-[var(--color-muted-ink)]"
      >
        {description}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {FOLLOW_UP_KINDS.map((chip) => (
          <label
            key={chip.kind}
            className="flex min-h-11 cursor-pointer items-center rounded-full border border-[var(--color-line-2)] bg-white px-4 text-[0.9rem] font-bold text-[var(--color-body)] transition-colors hover:border-[var(--color-navy)] has-[:checked]:border-[var(--color-navy)] has-[:checked]:bg-[var(--color-navy)] has-[:checked]:text-[var(--color-on-dark)] has-[:disabled]:cursor-default has-[:disabled]:opacity-60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--color-teal-ink)]"
          >
            <input
              type="radio"
              id={chip.kind === "day" ? pickADayId : undefined}
              name={name}
              value={chip.kind}
              checked={followUpKind === chip.kind}
              aria-controls={chip.kind === "day" && followUpKind === "day" ? dayId : undefined}
              onChange={() => {
                onKindChange(chip.kind);
              }}
              disabled={pending}
              className="sr-only"
            />
            {chip.label}
          </label>
        ))}
      </div>
      {followUpKind === "day" ? (
        <div role="group" aria-labelledby={`${pickADayId} ${dayLabelId}`} className="mt-3 max-w-sm">
          <label
            id={dayLabelId}
            htmlFor={dayId}
            className="block text-sm font-bold text-[var(--color-ink)]"
          >
            Call again on <span aria-hidden="true">*</span>
            <span className="sr-only"> (required)</span>
          </label>
          <input
            id={dayId}
            type="date"
            name={`${name}-day`}
            required
            aria-required="true"
            aria-invalid={customDayInvalid || undefined}
            aria-describedby={dayDescribedBy}
            data-testid={dayId}
            value={followUpDay}
            min={practiceLocalDay(0)}
            max={practiceLocalDay(90)}
            disabled={pending}
            onChange={(event) => {
              onDayChange(event.target.value);
            }}
            className="mt-1.5 block min-h-11 w-full rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3.5 text-[0.9rem] text-[var(--color-ink)] transition-colors outline-none focus:border-[var(--color-teal-ink)] focus:ring-2 focus:ring-[var(--color-teal-ink)] disabled:opacity-60 aria-[invalid=true]:border-[oklch(0.5_0.19_25)] aria-[invalid=true]:bg-[color-mix(in_oklch,oklch(0.97_0.018_25)_70%,white)]"
          />
          <p
            id={dayHintId}
            className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted-ink)]"
          >
            Required when Pick a day is selected. Save stays unavailable until this day is valid.
          </p>
          {customDayInvalid ? (
            <p
              id={errorId}
              role="alert"
              className="mt-1.5 text-sm font-bold text-[var(--color-ink)]"
            >
              Choose today or a day within the next 90 days.
            </p>
          ) : null}
        </div>
      ) : null}
    </fieldset>
  );
}

function ReturnTimeAction({
  kind,
  pending,
  inFlight,
  onSubmit,
}: Readonly<{
  kind: "reopen" | "set_call_again";
  pending: boolean;
  inFlight: "save" | "reopen" | "set_call_again" | "classify" | "undo" | null;
  onSubmit: (choice: Readonly<FollowUpChoice>) => void;
}>) {
  const [open, setOpen] = useState(kind === "set_call_again");
  const [followUpKind, setFollowUpKind] = useState<FollowUpKind | null>(null);
  const [followUpDay, setFollowUpDay] = useState("");
  const correctionRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const focusAfterOpenRef = useRef(false);
  const restoreTriggerFocusRef = useRef(false);
  const choice = followUpChoice(followUpKind, followUpDay);
  const isCorrection = kind === "set_call_again";
  const headingId = `${kind}-heading`;

  useEffect(() => {
    if (
      open &&
      (focusAfterOpenRef.current || (isCorrection && window.location.hash === "#set-call-again"))
    ) {
      focusAfterOpenRef.current = false;
      correctionRef.current?.focus();
      return;
    }
    if (!open && restoreTriggerFocusRef.current) {
      restoreTriggerFocusRef.current = false;
      triggerRef.current?.focus();
    }
  }, [isCorrection, open]);

  if (!open) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          ref={triggerRef}
          type="button"
          data-testid="reopen-request"
          disabled={pending}
          onClick={() => {
            focusAfterOpenRef.current = true;
            setOpen(true);
          }}
          className="btn btn-outline min-h-11 disabled:opacity-60"
        >
          Reopen for more work
        </button>
        <p className="text-sm text-[var(--color-muted-ink)]">
          You will choose when it returns before anything changes.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={correctionRef}
      id={isCorrection ? "set-call-again" : undefined}
      tabIndex={-1}
      role="group"
      aria-labelledby={headingId}
      data-testid={isCorrection ? "set-call-again-controls" : "reopen-controls"}
      className={
        isCorrection
          ? "mt-4 rounded-[var(--radius-sm)] bg-[var(--color-amber-soft)] px-4 py-4 outline-none focus:outline-[3px] focus:outline-offset-2 focus:outline-[var(--color-amber)]"
          : "mt-4 outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--color-teal-ink)]"
      }
    >
      <h3 id={headingId} className="text-[0.95rem] font-black text-[var(--color-ink)]">
        {isCorrection ? "Set a call-again day" : "Reopen for more work"}
      </h3>
      {isCorrection ? (
        <p className="mt-1 max-w-[68ch] text-sm leading-relaxed text-[var(--color-body)]">
          This Contacted request has no return time. Choose one to put a concrete next action back
          in the shared queue.
        </p>
      ) : null}
      <CallAgainFieldset
        name={isCorrection ? "correction-call-again" : "reopen-call-again"}
        legend={isCorrection ? "When should staff call again?" : "When should this request return?"}
        description={
          isCorrection
            ? "A return choice is required. No date will be guessed for this request."
            : "Choose a return time before reopening. Cancel leaves the resolved request and its history unchanged."
        }
        followUpKind={followUpKind}
        followUpDay={followUpDay}
        pending={pending}
        onKindChange={setFollowUpKind}
        onDayChange={setFollowUpDay}
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-testid={isCorrection ? "set-call-again-submit" : "confirm-reopen"}
          disabled={pending || choice === undefined}
          onClick={() => {
            if (choice !== undefined) onSubmit(choice);
          }}
          className={`btn min-h-11 ${
            choice !== undefined || (pending && inFlight === kind) ? "btn-navy" : "btn-outline"
          } disabled:opacity-60`}
        >
          {pending && inFlight === kind
            ? isCorrection
              ? "Saving…"
              : "Reopening…"
            : isCorrection
              ? "Set call-again day"
              : "Reopen request"}
        </button>
        {isCorrection ? (
          <p className="text-sm text-[var(--color-body)]">
            The correction is recorded in Request history and can be undone for 15 minutes.
          </p>
        ) : (
          <button
            type="button"
            data-testid="cancel-reopen"
            disabled={pending}
            onClick={() => {
              restoreTriggerFocusRef.current = true;
              setOpen(false);
              setFollowUpKind(null);
              setFollowUpDay("");
            }}
            className="btn btn-outline min-h-11 disabled:opacity-60"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

function PanelFeedback({
  feedback,
  nextHref,
}: Readonly<{
  feedback: Feedback | null;
  nextHref: string | null;
}>) {
  if (feedback === null) return null;
  return (
    <p
      role={feedback.tone === "success" ? "status" : "alert"}
      aria-atomic="true"
      data-testid="workflow-feedback"
      className={`mt-4 rounded-[var(--radius-sm)] px-4 py-3 text-[0.92rem] leading-relaxed font-bold text-[var(--color-ink)] ${
        feedback.tone === "success" ? "bg-[var(--color-mint)]" : "bg-[var(--color-amber-soft)]"
      }`}
    >
      {feedback.text}{" "}
      {feedback.tone === "success" && feedback.closedOrBooked ? (
        nextHref !== null && nextHref !== "" ? (
          <Link
            href={nextHref}
            data-testid="open-next-request"
            className="inline-flex min-h-11 items-center underline underline-offset-2"
          >
            Open next appointment request
          </Link>
        ) : (
          <Link
            href="/admin/requests"
            className="inline-flex min-h-11 items-center underline underline-offset-2"
          >
            Back to Appointments
          </Link>
        )
      ) : null}
    </p>
  );
}

// ---------------------------------------------------------------------------
// The panel
// ---------------------------------------------------------------------------

/* The undo window closing is a fact of time, not of data: a slow tick retires
   the affordance while the page sits open. Null until the first tick, so the
   first render trusts the eligibility the server already filtered. */
function useMinuteClock(): number | null {
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 30_000);
    return () => {
      clearInterval(timer);
    };
  }, []);
  return nowMs;
}

function choiceRowsFor(
  legal: Readonly<{
    recordContactAttempt: boolean;
    confirmBookingHandoff: boolean;
    closeReasons: readonly ClosureReason[];
  }>,
): ChoiceRow[] {
  return [
    ...(legal.recordContactAttempt ? ATTEMPT_ROWS : []),
    ...(legal.confirmBookingHandoff ? [BOOKED_ROW] : []),
    ...legal.closeReasons.map((reason) => CLOSE_ROWS[reason]),
  ];
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
export function WorkflowPanel({
  requestId,
  state,
  version,
  legacyReviewRequired,
  callAgainAt,
  undo,
  nextHref = null,
}: Readonly<{
  requestId: string;
  state: RequestState;
  version: number;
  legacyReviewRequired: boolean;
  callAgainAt: string | null;
  undo: UndoWindow | null;
  nextHref?: string | null;
}>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Which control started the in-flight transition. `pending` alone can't
  // Label buttons: it also covers the router.refresh() that follows a
  // Success, and during that window every button would falsely claim to be
  // The one working ("Reopening…" after a save). A button only wears an
  // In-progress verb for the action the user actually took.
  const [inFlight, setInFlight] = useState<
    "save" | "reopen" | "set_call_again" | "classify" | "undo" | null
  >(null);
  const [panel, dispatch] = useReducer(panelReducer, INITIAL_PANEL);
  const [truth, setTruth] = useState<Truth>({
    state,
    version,
    legacyReviewRequired,
    callAgainAt,
    undo,
  });
  const {
    feedback: pageFeedback,
    publish: publishPageFeedback,
    dismiss: dismissPageFeedback,
  } = usePortalFeedback();
  const currentWorkflowFeedback = pageFeedback?.source === "request-workflow" ? pageFeedback : null;
  // One idempotency key per staff attempt: a retry after an ambiguous
  // Failure replays the same command; changing the input mints a new one.
  const keyRef = useRef<string | null>(null);

  // Server truth wins whenever it is newer than what the panel acted on
  // (another tab, another staff member, or our own refresh landing).
  // Guarded render-phase adoption — the React "adjust state on prop
  // Change" pattern — so fresher truth applies before paint.
  if (version > truth.version) {
    setTruth({ state, version, legacyReviewRequired, callAgainAt, undo });
  }

  const nowMs = useMinuteClock();

  useEffect(() => {
    if (panel.feedback === null) dismissPageFeedback("request-workflow");
  }, [dismissPageFeedback, panel.feedback]);

  const legal = legalActionsFor(truth.state, {
    legacyReviewRequired: truth.legacyReviewRequired,
    callAgainAt: truth.callAgainAt,
  });

  const rows = choiceRowsFor(legal);

  const selectedRow = rows.find((row) => choiceId(row.choice) === panel.selected) ?? null;
  const selectedAttempt =
    selectedRow?.choice.kind === "attempt" ? selectedRow.choice.outcome : null;

  function currentKey(): string {
    keyRef.current ??= crypto.randomUUID();
    return keyRef.current;
  }

  function freshKey() {
    keyRef.current = crypto.randomUUID();
  }

  function applyOutcome(
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- CommandOutcome carries domain member types that cannot be made readonly
    result: Readonly<CommandOutcome>,
    intent: Readonly<
      | ActionChoice
      | { readonly kind: "reopen" }
      | { readonly kind: "set_call_again" }
      | { readonly kind: "classify" }
      | { readonly kind: "undo" }
    >,
  ) {
    if (result.ok) {
      setTruth({
        state: result.state,
        version: result.version,
        // Any accepted command from a legacy-review row is the classify
        // Repair itself, which clears the flag (spec §5.7).
        legacyReviewRequired: false,
        callAgainAt: result.callAgainAt,
        undo: result.undo,
      });
      freshKey();
      const text =
        intent.kind === "undo"
          ? `Undone — this request is ${STATE_LABELS[result.state]} again.`
          : successCopy(intent, result);
      dispatch({
        type: "succeeded",
        text,
        closedOrBooked:
          intent.kind !== "undo" && (result.state === "booked" || result.state === "closed"),
      });
      publishPageFeedback({ source: "request-workflow", tone: "status", message: text });
      router.refresh();
      return;
    }
    if (result.code === "stale_version") {
      if (result.current) {
        setTruth({
          state: result.current.state,
          version: result.current.version,
          legacyReviewRequired: truth.legacyReviewRequired,
          callAgainAt: truth.callAgainAt,
          undo: null,
        });
      }
      freshKey();
      const text = `Someone else worked this request just now — it is currently ${
        result.current ? STATE_LABELS[result.current.state] : "changed"
      }. Nothing was saved, and this page has been brought up to date.`;
      dispatch({
        type: "failed",
        text,
      });
      publishPageFeedback({ source: "request-workflow", tone: "alert", message: text });
      router.refresh();
      return;
    }
    if (result.code === "illegal_transition") {
      freshKey();
      const text =
        "That action is no longer available for this request — it changed since this page loaded. This page has been brought up to date.";
      dispatch({
        type: "failed",
        text,
      });
      publishPageFeedback({ source: "request-workflow", tone: "alert", message: text });
      router.refresh();
      return;
    }
    if (
      result.code === "idempotency_conflict" ||
      result.code === "undo_unavailable" ||
      result.code === "not_found"
    ) {
      freshKey();
      router.refresh();
    }
    // `unavailable` deliberately keeps the same key: a retry of an
    // Ambiguous failure must replay, not repeat, the command.
    const text = failureCopy(result.code);
    dispatch({ type: "failed", text });
    publishPageFeedback({ source: "request-workflow", tone: "alert", message: text });
  }

  function save() {
    if (!selectedRow || pending) return;
    const choice = selectedRow.choice;
    const common = {
      requestId,
      expectedVersion: truth.version,
      idempotencyKey: currentKey(),
    };
    if (choice.kind === "attempt") {
      const callAgain = followUpChoice(panel.followUpKind, panel.followUpDay);
      if (callAgain === undefined) return;
      setInFlight("save");
      startTransition(async () => {
        const result = await recordContactAttempt({
          ...common,
          outcome: choice.outcome,
          callAgain,
        });
        applyOutcome(result, choice);
      });
      return;
    }
    if (choice.kind === "booked") {
      const appointment = appointmentChoice(panel.appointmentDay, panel.appointmentTime);
      if (appointment === undefined) return;
      setInFlight("save");
      startTransition(async () => {
        const result = await confirmBookingHandoff({ ...common, appointment });
        applyOutcome(result, choice);
      });
      return;
    }
    setInFlight("save");
    startTransition(async () => {
      const result = await closeRequest({ ...common, reason: choice.reason });
      applyOutcome(result, choice);
    });
  }

  function reopen(callAgain: Readonly<FollowUpChoice>) {
    if (pending) return;
    setInFlight("reopen");
    startTransition(async () => {
      const result = await reopenRequest({
        requestId,
        expectedVersion: truth.version,
        idempotencyKey: currentKey(),
        callAgain,
      });
      applyOutcome(result, { kind: "reopen" });
    });
  }

  function correctCallAgain(callAgain: Readonly<FollowUpChoice>) {
    if (pending) return;
    setInFlight("set_call_again");
    startTransition(async () => {
      const result = await setCallAgain({
        requestId,
        expectedVersion: truth.version,
        idempotencyKey: currentKey(),
        callAgain,
      });
      applyOutcome(result, { kind: "set_call_again" });
    });
  }

  function classify() {
    if (pending || !panel.reviewResolution) return;
    const resolution = panel.reviewResolution;
    setInFlight("classify");
    startTransition(async () => {
      const result = await classifyLegacyClosure({
        requestId,
        expectedVersion: truth.version,
        idempotencyKey: currentKey(),
        resolution: resolution === "booked" ? "booked" : { reason: resolution },
      });
      applyOutcome(result, { kind: "classify" });
    });
  }

  function undoLatest() {
    if (pending || !truth.undo) return;
    setInFlight("undo");
    startTransition(async () => {
      const result = await undoLatestTransition({
        requestId,
        expectedVersion: truth.version,
        idempotencyKey: currentKey(),
        transitionId: truth.undo!.transitionId,
      });
      applyOutcome(result, { kind: "undo" });
    });
  }

  const undoOpen =
    truth.undo && (nowMs === null || Date.parse(truth.undo.expiresAt) > nowMs) ? truth.undo : null;

  const saveDisabled =
    pending ||
    !selectedRow ||
    (selectedAttempt !== null &&
      followUpChoice(panel.followUpKind, panel.followUpDay) === undefined) ||
    (selectedRow.choice.kind === "booked" &&
      appointmentChoice(panel.appointmentDay, panel.appointmentTime) === undefined);

  return (
    <WorkflowPanelBody
      classify={classify}
      correctCallAgain={correctCallAgain}
      dispatch={dispatch}
      inFlight={inFlight}
      legal={legal}
      nextHref={nextHref}
      panel={panel}
      pending={pending}
      reopen={reopen}
      rows={rows}
      save={save}
      saveDisabled={saveDisabled}
      showFeedback={panel.feedback?.tone === "error" || currentWorkflowFeedback !== null}
      truth={truth}
      undoLatest={undoLatest}
      undoOpen={undoOpen}
    />
  );
}

// ---------------------------------------------------------------------------
// The outcome choice list renders one native radio group as ruled rows.
// Segment captions mark the three decision kinds inside the one group.
// The dependent call-again plan rides directly beneath the selected continuing-work row.
// ---------------------------------------------------------------------------

/* The portal owns the appointment calendar, so recording a booking means saying
   when. Two native inputs rather than one datetime-local: staff reach for a day
   first and a time second, and the two fields keep their own labels and errors. */
function AppointmentFieldset({
  className,
  day,
  time,
  pending,
  onDayChange,
  onTimeChange,
}: Readonly<{
  className: string;
  day: string;
  time: string;
  pending: boolean;
  onDayChange: (day: string) => void;
  onTimeChange: (time: string) => void;
}>) {
  const dayId = "appointment-day";
  const timeId = "appointment-time";
  const hintId = "appointment-hint";
  const dayInvalid = day !== "" && !isValidAppointmentDay(day);
  const fieldClass =
    "mt-1.5 block min-h-11 w-full rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3.5 text-[0.9rem] text-[var(--color-ink)] transition-colors outline-none focus:border-[var(--color-teal-ink)] focus:ring-2 focus:ring-[var(--color-teal-ink)] disabled:opacity-60 aria-[invalid=true]:border-[oklch(0.5_0.19_25)] aria-[invalid=true]:bg-[color-mix(in_oklch,oklch(0.97_0.018_25)_70%,white)]";

  return (
    <fieldset className={className} disabled={pending} aria-describedby={hintId}>
      <legend className="text-sm font-bold text-[var(--color-ink)]">
        When is the appointment?
      </legend>
      <p id={hintId} className="mt-1 text-sm leading-relaxed text-[var(--color-muted-ink)]">
        Required before Save. This is what the practice reads to see who is coming in.
      </p>
      <div className="mt-3 flex max-w-md flex-wrap gap-3">
        <div className="min-w-[10rem] flex-1">
          <label htmlFor={dayId} className="block text-sm font-bold text-[var(--color-ink)]">
            Day <span aria-hidden="true">*</span>
            <span className="sr-only"> (required)</span>
          </label>
          <input
            id={dayId}
            type="date"
            required
            aria-required="true"
            aria-invalid={dayInvalid || undefined}
            data-testid="appointment-day"
            value={day}
            min={practiceLocalDay(0)}
            max={practiceLocalDay(400)}
            disabled={pending}
            onChange={(event) => {
              onDayChange(event.target.value);
            }}
            className={fieldClass}
          />
        </div>
        <div className="min-w-[8rem] flex-1">
          <label htmlFor={timeId} className="block text-sm font-bold text-[var(--color-ink)]">
            Time <span aria-hidden="true">*</span>
            <span className="sr-only"> (required)</span>
          </label>
          <input
            id={timeId}
            type="time"
            required
            aria-required="true"
            data-testid="appointment-time"
            value={time}
            disabled={pending}
            onChange={(event) => {
              onTimeChange(event.target.value);
            }}
            className={fieldClass}
          />
        </div>
      </div>
    </fieldset>
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function OutcomeChoiceList({
  rows,
  pending,
  selected,
  followUpKind,
  followUpDay,
  appointmentDay,
  appointmentTime,
  onSelect,
  onSelectFollowUp,
  onDayChange,
  onAppointmentDayChange,
  onAppointmentTimeChange,
}: Readonly<{
  rows: ChoiceRow[];
  pending: boolean;
  selected: ChoiceId | null;
  followUpKind: FollowUpKind | null;
  followUpDay: string;
  appointmentDay: string;
  appointmentTime: string;
  onSelect: (id: ChoiceId) => void;
  onSelectFollowUp: (kind: FollowUpKind) => void;
  onDayChange: (day: string) => void;
  onAppointmentDayChange: (day: string) => void;
  onAppointmentTimeChange: (time: string) => void;
}>) {
  const segments: { id: string; caption: string; rows: ChoiceRow[] }[] = [];
  const attemptRows = rows.filter((row) => row.choice.kind === "attempt");
  if (attemptRows.length > 0) {
    segments.push({ id: "continue", caption: "Continue working", rows: attemptRows });
  }
  const bookedRows = rows.filter((row) => row.choice.kind === "booked");
  if (bookedRows.length > 0) {
    segments.push({ id: "complete", caption: "Appointment completed", rows: bookedRows });
  }
  const closeRows = rows.filter((row) => row.choice.kind === "close");
  if (closeRows.length > 0) {
    segments.push({ id: "close", caption: "Close without an appointment", rows: closeRows });
  }

  // The plan is one keyed node in a single child array.
  // React relocates that node when the selection moves between rows.
  // A chosen return time and a finished reveal survive the move.
  const choiceItems: ReactNode[] = [];
  for (const segment of segments) {
    choiceItems.push(
      <p key={`caption-${segment.id}`} className="portal-choice-caption">
        {segment.caption}
      </p>,
    );
    for (const row of segment.rows) {
      const id = choiceId(row.choice);
      choiceItems.push(
        <DecisionRow
          key={id}
          name="what-happened"
          value={id}
          checked={selected === id}
          disabled={pending}
          label={row.label}
          helper={row.helper}
          onSelect={() => {
            onSelect(id);
          }}
        />,
      );
      if (row.choice.kind === "attempt" && selected === id) {
        choiceItems.push(
          <div key="call-again-plan" className="portal-choice-reveal">
            <div>
              <CallAgainFieldset
                name="call-again"
                className="portal-choice-plan"
                legend="When should this come back to your attention?"
                description="Choose one before Save. The shared queue uses it to show staff the next call."
                followUpKind={followUpKind}
                followUpDay={followUpDay}
                pending={pending}
                onKindChange={onSelectFollowUp}
                onDayChange={onDayChange}
              />
            </div>
          </div>,
        );
      }
      if (row.choice.kind === "booked" && selected === id) {
        choiceItems.push(
          <div key="appointment-plan" className="portal-choice-reveal">
            <div>
              <AppointmentFieldset
                className="portal-choice-plan"
                day={appointmentDay}
                time={appointmentTime}
                pending={pending}
                onDayChange={onAppointmentDayChange}
                onTimeChange={onAppointmentTimeChange}
              />
            </div>
          </div>,
        );
      }
    }
  }

  return (
    <fieldset className="mt-5" disabled={pending}>
      <legend className="text-sm font-bold text-[var(--color-ink)]">What happened?</legend>
      <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted-ink)]">
        Record what happened on the call. The request moves to the right status.
      </p>
      <div data-testid="workflow-choices" className="portal-choice-list">
        {choiceItems}
      </div>
    </fieldset>
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function WorkflowPanelBody({
  classify,
  correctCallAgain,
  dispatch,
  inFlight,
  legal,
  nextHref,
  panel,
  pending,
  reopen,
  rows,
  save,
  saveDisabled,
  showFeedback,
  truth,
  undoLatest,
  undoOpen,
}: Readonly<{
  classify: () => void;
  correctCallAgain: (choice: Readonly<FollowUpChoice>) => void;
  dispatch: (action: Readonly<PanelAction>) => void;
  inFlight: "save" | "reopen" | "set_call_again" | "classify" | "undo" | null;
  legal: LegalActions;
  nextHref: string | null;
  panel: PanelState;
  pending: boolean;
  reopen: (choice: Readonly<FollowUpChoice>) => void;
  rows: ChoiceRow[];
  save: () => void;
  saveDisabled: boolean;
  showFeedback: boolean;
  truth: Truth;
  undoLatest: () => void;
  undoOpen: UndoWindow | null;
}>) {
  return (
    <section
      data-testid="workflow-panel"
      className="print-hide mt-7 border-t border-[var(--color-line)] pt-7"
    >
      <h2 className="text-[1.05rem] font-black text-[var(--color-ink)]">
        {legal.classifyLegacyClosure
          ? "Finish this request's record"
          : truth.state === "new" || truth.state === "contacted"
            ? "Record what happened"
            : "This request is resolved"}
      </h2>

      <p
        id="workflow-current-state"
        data-testid="workflow-current-state"
        className="mt-1.5 text-sm font-bold text-[var(--color-body)]"
      >
        Current status: {STATE_LABELS[truth.state]}
        {truth.state === "contacted" && truth.callAgainAt !== null && truth.callAgainAt !== ""
          ? ` — call again ${followUpWhenLabel(truth.callAgainAt)}`
          : truth.state === "contacted"
            ? " — call-again day missing"
            : ""}
      </p>

      <PanelFeedback feedback={showFeedback ? panel.feedback : null} nextHref={nextHref} />

      {undoOpen !== null ? (
        <div
          data-testid="undo-affordance"
          className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-white px-4 py-3"
        >
          <p className="text-[0.9rem] text-[var(--color-body)]">
            The last change can be undone until{" "}
            <strong className="font-bold">{NY_CLOCK.format(new Date(undoOpen.expiresAt))}</strong>.
          </p>
          <button
            type="button"
            data-testid="undo-latest"
            disabled={pending}
            onClick={undoLatest}
            className="btn btn-outline min-h-11 disabled:opacity-60"
          >
            {pending && inFlight === "undo" ? "Undoing…" : "Undo"}
          </button>
        </div>
      ) : null}

      {legal.setCallAgain && panel.selected === null ? (
        <ReturnTimeAction
          kind="set_call_again"
          pending={pending}
          inFlight={inFlight}
          onSubmit={correctCallAgain}
        />
      ) : null}

      {legal.classifyLegacyClosure ? (
        <>
          <p className="mt-4 max-w-[68ch] rounded-[var(--radius-sm)] bg-[var(--color-amber-soft)] px-4 py-3 text-[0.9rem] leading-relaxed font-bold text-[var(--color-ink)]">
            This request was closed before outcomes were recorded, so its record is incomplete. Say
            how it actually ended — nothing else about the request changes.
          </p>
          <fieldset className="mt-5" disabled={pending}>
            <legend className="text-sm font-bold text-[var(--color-ink)]">
              How did this request actually end?
            </legend>
            <div className="portal-choice-list">
              <DecisionRow
                name="legacy-review"
                value="booked"
                checked={panel.reviewResolution === "booked"}
                disabled={pending}
                label="An appointment was booked"
                helper="The record will show Scheduled."
                onSelect={() => {
                  dispatch({ type: "select_review", resolution: "booked" });
                }}
              />
              <DecisionRow
                name="legacy-review"
                value="wont_schedule"
                checked={panel.reviewResolution === "wont_schedule"}
                disabled={pending}
                label="No appointment — patient wouldn't schedule"
                onSelect={() => {
                  dispatch({
                    type: "select_review",
                    resolution: "wont_schedule",
                  });
                }}
              />
              <DecisionRow
                name="legacy-review"
                value="not_actionable"
                checked={panel.reviewResolution === "not_actionable"}
                disabled={pending}
                label="No appointment — duplicate or not actionable"
                onSelect={() => {
                  dispatch({
                    type: "select_review",
                    resolution: "not_actionable",
                  });
                }}
              />
            </div>
          </fieldset>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <button
              type="button"
              data-testid="classify-legacy"
              disabled={pending || panel.reviewResolution === null}
              onClick={classify}
              className={`btn min-h-11 ${
                panel.reviewResolution !== null || (pending && inFlight === "classify")
                  ? "btn-navy"
                  : "btn-outline"
              } disabled:opacity-60`}
            >
              {pending && inFlight === "classify" ? "Saving…" : "Finish record"}
            </button>
            <p className="text-sm text-[var(--color-muted-ink)]">
              This review is recorded in Request history.
            </p>
          </div>
        </>
      ) : rows.length > 0 ? (
        <>
          <OutcomeChoiceList
            rows={rows}
            pending={pending}
            selected={panel.selected}
            followUpKind={panel.followUpKind}
            followUpDay={panel.followUpDay}
            appointmentDay={panel.appointmentDay}
            appointmentTime={panel.appointmentTime}
            onSelect={(id) => {
              dispatch({ type: "select", id });
            }}
            onSelectFollowUp={(kind) => {
              dispatch({ type: "select_follow_up", kind });
            }}
            onDayChange={(day) => {
              dispatch({ type: "set_day", day });
            }}
            onAppointmentDayChange={(day) => {
              dispatch({ type: "set_appointment_day", day });
            }}
            onAppointmentTimeChange={(time) => {
              dispatch({ type: "set_appointment_time", time });
            }}
          />

          <div
            className={`mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 ${
              panel.selected !== null ? "portal-commit-shelf" : ""
            }`}
          >
            <button
              type="button"
              data-testid="save-workflow"
              disabled={saveDisabled}
              onClick={save}
              className={`btn min-h-11 ${
                !saveDisabled || (pending && inFlight === "save") ? "btn-navy" : "btn-outline"
              } disabled:opacity-60`}
            >
              {pending && inFlight === "save" ? "Saving…" : "Save"}
            </button>
            <p className="text-sm text-[var(--color-muted-ink)]">
              Save records one entry in Request history. You can undo for 15 minutes.
            </p>
          </div>
        </>
      ) : (
        <div className="mt-4">
          <p className="max-w-[68ch] rounded-[var(--radius-sm)] bg-[var(--color-mint)] px-4 py-3 text-[0.9rem] leading-relaxed text-[var(--color-ink)]">
            {truth.state === "booked"
              ? "The appointment is booked and this request is complete. It stays on the Scheduled view if staff need it."
              : "This request is closed — no appointment was booked."}
          </p>
          {legal.reopenRequest ? (
            <ReturnTimeAction
              kind="reopen"
              pending={pending}
              inFlight={inFlight}
              onSubmit={reopen}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}

function followUpChoice(
  followUpKind: FollowUpKind | null,
  followUpDay: string,
): FollowUpChoice | undefined {
  if (followUpKind === null) return undefined;
  if (followUpKind === "day") {
    return isValidCustomCallAgainDay(followUpDay) ? { kind: "day", date: followUpDay } : undefined;
  }
  return { kind: followUpKind };
}
