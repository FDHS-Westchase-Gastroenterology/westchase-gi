"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef, useState, useTransition } from "react";
import type { RefObject } from "react";

import { followUpWhenLabel, STATE_LABELS } from "@/app/admin/(portal)/requests/format";
import {
  classifyLegacyClosure,
  closeRequest,
  confirmBookingHandoff,
  recordContactAttempt,
  reopenRequest,
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
// (spec §16.5: UI actions derive from the same legal-action policy as the
// Backend), so the interface can never offer a move the domain would
// Refuse. The old "pick the request's next status" model is retired with
// The generic status setter (DEC-15): staff record facts, and the state
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

const CALL_AGAIN_REQUIRED = {
  reached_follow_up: false,
  voicemail: true,
  no_answer: true,
} as const satisfies Record<ContactOutcome, boolean>;

type FollowUpKind = "this_afternoon" | "tomorrow_morning" | "friday" | "day";

const FOLLOW_UP_KINDS: { kind: FollowUpKind; label: string }[] = [
  { kind: "this_afternoon", label: "This afternoon" },
  { kind: "tomorrow_morning", label: "Tomorrow morning" },
  { kind: "friday", label: "Friday" },
  { kind: "day", label: "Pick a day…" },
];

const NY_DAY_INPUT = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "short",
  timeZone: "America/New_York",
});

const NY_CLOCK = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "America/New_York",
});

// Practice-local "today" for the date input's min/max bounds. The server
// Re-validates the resolved day; these bounds only guide the picker.
function practiceLocalDay(offsetDays: number): string {
  const todayEt = NY_DAY_INPUT.format(new Date());
  const shifted = new Date(Date.parse(`${todayEt}T00:00:00Z`) + offsetDays * 86_400_000);
  return shifted.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Copy. Success names the staff-facing result (Scheduled, never Booked);
// Failure names what is and is not known to have been saved (spec §16.5:
// Never report false success; `unavailable` may or may not have written).
// ---------------------------------------------------------------------------

function successCopy(
  choice: Readonly<ActionChoice | { kind: "reopen" } | { kind: "classify" }>,
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
      return "Reopened — back to Contacted for more work.";
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
  /** Legacy review: has staff said whether an appointment was booked? */
  readonly reviewResolution: "booked" | ClosureReason | null;
  readonly attempted: boolean;
  readonly feedback: Feedback | null;
}

type PanelAction =
  | { readonly type: "select"; readonly id: ChoiceId }
  | { readonly type: "select_follow_up"; readonly kind: FollowUpKind }
  | { readonly type: "set_day"; readonly day: string }
  | { readonly type: "select_review"; readonly resolution: "booked" | ClosureReason }
  | { readonly type: "attempt" }
  | { readonly type: "succeeded"; readonly text: string; readonly closedOrBooked: boolean }
  | { readonly type: "failed"; readonly text: string }
  | { readonly type: "reset" };

const INITIAL_PANEL: PanelState = {
  selected: null,
  followUpKind: null,
  followUpDay: "",
  reviewResolution: null,
  attempted: false,
  feedback: null,
};

function panelReducer(state: Readonly<PanelState>, action: Readonly<PanelAction>): PanelState {
  switch (action.type) {
    case "select":
      if (action.id.startsWith("attempt:")) {
        return {
          ...state,
          selected: action.id,
          attempted: false,
          feedback: null,
        };
      }
      return {
        ...state,
        selected: action.id,
        attempted: false,
        feedback: null,
        followUpKind: null,
        followUpDay: "",
      };
    case "select_follow_up":
      return { ...state, followUpKind: action.kind, feedback: null };
    case "set_day":
      return { ...state, followUpDay: action.day, feedback: null };
    case "select_review":
      return {
        ...state,
        reviewResolution: action.resolution,
        attempted: false,
        feedback: null,
      };
    case "attempt":
      return { ...state, attempted: true };
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
    case "reset":
      return INITIAL_PANEL;
  }
  return state;
}

// ---------------------------------------------------------------------------
// Presentational pieces (the retired composer's proven row vocabulary:
// Sr-only radios, has-[:checked] treatment, pointer-down scale feedback)
// ---------------------------------------------------------------------------

function ChoiceRadio({
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
    <label className="group block cursor-pointer rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-4 py-3 transition-[border-color,background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-[var(--color-navy)] active:scale-[0.98] has-[:checked]:border-[var(--color-navy)] has-[:checked]:bg-[var(--color-mint)] has-[:disabled]:cursor-default has-[:disabled]:opacity-60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--color-teal-ink)] motion-reduce:transition-none motion-reduce:active:scale-100">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
        className="sr-only"
      />
      <span className="flex items-center justify-between gap-3">
        <span className="text-[0.95rem] leading-snug font-bold text-[var(--color-ink)]">
          {label}
        </span>
        <span
          aria-hidden="true"
          className="grid h-5 w-5 flex-none place-items-center rounded-full border border-[var(--color-line-2)] text-white transition-colors group-has-[:checked]:border-[var(--color-navy)] group-has-[:checked]:bg-[var(--color-navy)]"
        >
          <Check className="h-3 w-3 opacity-0 transition-opacity group-has-[:checked]:opacity-100" />
        </span>
      </span>
      {helper !== undefined && helper !== "" ? (
        <span className="mt-1 block text-[0.82rem] leading-snug text-[var(--color-muted)]">
          {helper}
        </span>
      ) : null}
    </label>
  );
}

function CallAgainFieldset({
  outcome,
  followUpKind,
  followUpDay,
  attempted,
  pending,
  dispatch,
}: Readonly<{
  outcome: ContactOutcome;
  followUpKind: FollowUpKind | null;
  followUpDay: string;
  attempted: boolean;
  pending: boolean;
  dispatch: React.Dispatch<PanelAction>;
}>) {
  const required = CALL_AGAIN_REQUIRED[outcome];
  const followUpMissing = attempted && required && !followUpKind;
  const dayMissing = attempted && followUpKind === "day" && !followUpDay;

  return (
    <fieldset className="mt-5" disabled={pending}>
      <legend className="text-sm font-bold text-[var(--color-ink)]">
        When should this come back to your attention?
      </legend>
      <p className="mt-1 text-[0.85rem] leading-relaxed text-[var(--color-muted)]">
        This tells the queue when to bring the request back.
        {required ? " Required for this outcome." : ""}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {FOLLOW_UP_KINDS.map((chip) => (
          <label
            key={chip.kind}
            className="flex min-h-11 cursor-pointer items-center rounded-full border border-[var(--color-line-2)] bg-white px-4 text-[0.9rem] font-bold text-[var(--color-body)] transition-colors hover:border-[var(--color-navy)] has-[:checked]:border-[var(--color-navy)] has-[:checked]:bg-[var(--color-navy)] has-[:checked]:text-[var(--color-on-dark)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--color-teal-ink)]"
          >
            <input
              type="radio"
              name="call-again"
              value={chip.kind}
              checked={followUpKind === chip.kind}
              onChange={() => {
                dispatch({ type: "select_follow_up", kind: chip.kind });
              }}
              disabled={pending}
              className="sr-only"
            />
            {chip.label}
          </label>
        ))}
        {followUpKind === "day" ? (
          <input
            type="date"
            aria-label="Call again on this day"
            value={followUpDay}
            min={practiceLocalDay(0)}
            max={practiceLocalDay(90)}
            disabled={pending}
            onChange={(event) => {
              dispatch({ type: "set_day", day: event.target.value });
            }}
            className="min-h-11 rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3.5 text-[0.9rem] text-[var(--color-ink)] transition-colors outline-none focus:border-[var(--color-teal-ink)] disabled:opacity-60"
          />
        ) : null}
      </div>
      {followUpMissing ? (
        <p
          role="alert"
          data-testid="follow-up-required"
          className="mt-3 rounded-[var(--radius-sm)] bg-[var(--color-amber-soft)] px-4 py-3 text-[0.9rem] font-bold text-[var(--color-ink)]"
        >
          Choose when to call again so the queue knows when to bring this request back.
        </p>
      ) : null}
      {dayMissing ? (
        <p
          role="alert"
          className="mt-3 rounded-[var(--radius-sm)] bg-[var(--color-amber-soft)] px-4 py-3 text-[0.9rem] font-bold text-[var(--color-ink)]"
        >
          Pick the day to call again.
        </p>
      ) : null}
    </fieldset>
  );
}

function PanelFeedback({
  feedback,
  nextHref,
  feedbackRef,
}: Readonly<{
  feedback: Feedback | null;
  nextHref: string | null;
  feedbackRef: RefObject<HTMLParagraphElement | null>;
}>) {
  if (feedback === null) return null;
  return (
    <p
      ref={feedbackRef}
      tabIndex={-1}
      role={feedback.tone === "success" ? "status" : "alert"}
      data-testid="workflow-feedback"
      className={`mt-4 rounded-[var(--radius-sm)] px-4 py-3 text-[0.92rem] leading-relaxed font-bold text-[var(--color-ink)] outline-none ${
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
  const [inFlight, setInFlight] = useState<"save" | "reopen" | "classify" | "undo" | null>(null);
  const [panel, dispatch] = useReducer(panelReducer, INITIAL_PANEL);
  const [truth, setTruth] = useState<Truth>({
    state,
    version,
    legacyReviewRequired,
    callAgainAt,
    undo,
  });
  const feedbackRef = useRef<HTMLParagraphElement>(null);
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

  // The undo window closing is a fact of time, not of data: a slow tick
  // Retires the affordance while the page sits open. The server filtered
  // Eligibility at read time, so the first render can trust the prop.
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 30_000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (panel.feedback) feedbackRef.current?.focus();
  }, [panel.feedback]);

  const legal = legalActionsFor(truth.state, {
    legacyReviewRequired: truth.legacyReviewRequired,
  });

  const rows: ChoiceRow[] = [
    ...(legal.recordContactAttempt ? ATTEMPT_ROWS : []),
    ...(legal.confirmBookingHandoff ? [BOOKED_ROW] : []),
    ...legal.closeReasons.map((reason) => CLOSE_ROWS[reason]),
  ];

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
      | { readonly kind: "classify" }
      | { readonly kind: "undo" }
    >,
  ) {
    if (result.ok) {
      setTruth({
        state: result.state,
        version: result.version,
        // Any accepted command from a legacy-review row is the classify
        // Repair itself, which clears the flag (spec §5.6).
        legacyReviewRequired: false,
        callAgainAt: result.callAgainAt,
        undo: result.undo,
      });
      freshKey();
      dispatch({
        type: "succeeded",
        text:
          intent.kind === "undo"
            ? `Undone — this request is ${STATE_LABELS[result.state]} again.`
            : successCopy(intent, result),
        closedOrBooked:
          intent.kind !== "undo" && (result.state === "booked" || result.state === "closed"),
      });
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
      dispatch({
        type: "failed",
        text: `Someone else worked this request just now — it is currently ${
          result.current ? STATE_LABELS[result.current.state] : "changed"
        }. Nothing was saved, and this page has been brought up to date.`,
      });
      router.refresh();
      return;
    }
    if (result.code === "illegal_transition") {
      freshKey();
      dispatch({
        type: "failed",
        text: "That action is no longer available for this request — it changed since this page loaded. This page has been brought up to date.",
      });
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
    dispatch({ type: "failed", text: failureCopy(result.code) });
  }

  function save() {
    if (!selectedRow || pending) return;
    dispatch({ type: "attempt" });
    const choice = selectedRow.choice;
    if (choice.kind === "attempt") {
      if (CALL_AGAIN_REQUIRED[choice.outcome] && !panel.followUpKind) return;
      if (panel.followUpKind === "day" && !panel.followUpDay) return;
    }
    const common = {
      requestId,
      expectedVersion: truth.version,
      idempotencyKey: currentKey(),
    };
    setInFlight("save");
    startTransition(async () => {
      const result =
        choice.kind === "attempt"
          ? await recordContactAttempt({
              ...common,
              outcome: choice.outcome,
              callAgain: followUpChoice(panel),
            })
          : choice.kind === "booked"
            ? await confirmBookingHandoff(common)
            : await closeRequest({ ...common, reason: choice.reason });
      applyOutcome(result, choice);
    });
  }

  function reopen() {
    if (pending) return;
    setInFlight("reopen");
    startTransition(async () => {
      const result = await reopenRequest({
        requestId,
        expectedVersion: truth.version,
        idempotencyKey: currentKey(),
      });
      applyOutcome(result, { kind: "reopen" });
    });
  }

  function classify() {
    if (pending || !panel.reviewResolution) return;
    dispatch({ type: "attempt" });
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
      ((CALL_AGAIN_REQUIRED[selectedAttempt] && !panel.followUpKind) ||
        (panel.followUpKind === "day" && !panel.followUpDay)));

  return (
    <WorkflowPanelBody
      classify={classify}
      dispatch={dispatch}
      feedbackRef={feedbackRef}
      inFlight={inFlight}
      legal={legal}
      nextHref={nextHref}
      panel={panel}
      pending={pending}
      reopen={reopen}
      rows={rows}
      save={save}
      saveDisabled={saveDisabled}
      selectedAttempt={selectedAttempt}
      truth={truth}
      undoLatest={undoLatest}
      undoOpen={undoOpen}
    />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function WorkflowPanelBody({
  classify,
  dispatch,
  feedbackRef,
  inFlight,
  legal,
  nextHref,
  panel,
  pending,
  reopen,
  rows,
  save,
  saveDisabled,
  selectedAttempt,
  truth,
  undoLatest,
  undoOpen,
}: Readonly<{
  classify: () => void;
  dispatch: (action: Readonly<PanelAction>) => void;
  feedbackRef: RefObject<HTMLParagraphElement | null>;
  inFlight: "save" | "reopen" | "classify" | "undo" | null;
  legal: LegalActions;
  nextHref: string | null;
  panel: PanelState;
  pending: boolean;
  reopen: () => void;
  rows: ChoiceRow[];
  save: () => void;
  saveDisabled: boolean;
  selectedAttempt: ContactOutcome | null;
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
        className="mt-1.5 text-[0.85rem] font-bold text-[var(--color-body)]"
      >
        Current status: {STATE_LABELS[truth.state]}
        {truth.state === "contacted" && truth.callAgainAt !== null && truth.callAgainAt !== ""
          ? ` — call again ${followUpWhenLabel(truth.callAgainAt)}`
          : ""}
      </p>

      <PanelFeedback feedback={panel.feedback} nextHref={nextHref} feedbackRef={feedbackRef} />

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
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <ChoiceRadio
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
              <ChoiceRadio
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
              <ChoiceRadio
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
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              data-testid="classify-legacy"
              disabled={pending || panel.reviewResolution === null}
              onClick={classify}
              className="btn btn-navy min-h-11 disabled:opacity-60"
            >
              {pending && inFlight === "classify" ? "Saving…" : "Finish record"}
            </button>
            <p className="text-[0.85rem] text-[var(--color-muted)]">
              This review is recorded in Request history.
            </p>
          </div>
        </>
      ) : rows.length > 0 ? (
        <>
          <fieldset className="mt-5" disabled={pending}>
            <legend className="text-sm font-bold text-[var(--color-ink)]">What happened?</legend>
            <p className="mt-1 text-[0.85rem] leading-relaxed text-[var(--color-muted)]">
              Record what happened on the call. The request moves to the right status.
            </p>
            <div data-testid="workflow-choices" className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {rows.map((row) => (
                <ChoiceRadio
                  key={choiceId(row.choice)}
                  name="what-happened"
                  value={choiceId(row.choice)}
                  checked={panel.selected === choiceId(row.choice)}
                  disabled={pending}
                  label={row.label}
                  helper={row.helper}
                  onSelect={() => {
                    dispatch({ type: "select", id: choiceId(row.choice) });
                  }}
                />
              ))}
            </div>
          </fieldset>

          {selectedAttempt !== null ? (
            <CallAgainFieldset
              outcome={selectedAttempt}
              followUpKind={panel.followUpKind}
              followUpDay={panel.followUpDay}
              attempted={panel.attempted}
              pending={pending}
              dispatch={dispatch}
            />
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              data-testid="save-workflow"
              disabled={saveDisabled}
              onClick={save}
              className="btn btn-navy min-h-11 disabled:opacity-60"
            >
              {pending && inFlight === "save" ? "Saving…" : "Save"}
            </button>
            <p className="text-[0.85rem] text-[var(--color-muted)]">
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
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                data-testid="reopen-request"
                disabled={pending}
                onClick={reopen}
                className="btn btn-outline min-h-11 disabled:opacity-60"
              >
                {pending && inFlight === "reopen" ? "Reopening…" : "Reopen for more work"}
              </button>
              <p className="text-[0.85rem] text-[var(--color-muted)]">
                Returns it to Contacted. Its history stays.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function followUpChoice(panel: Readonly<PanelState>): FollowUpChoice | undefined {
  if (panel.followUpKind === null) return undefined;
  return panel.followUpKind === "day"
    ? { kind: "day", date: panel.followUpDay }
    : { kind: panel.followUpKind };
}
