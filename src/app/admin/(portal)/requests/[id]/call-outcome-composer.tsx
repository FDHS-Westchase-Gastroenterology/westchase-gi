"use client";

import {
  useEffect,
  useReducer,
  useRef,
  useState,
  useTransition,
  type RefObject,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  RequestClosureDisposition,
  RequestStatus,
} from "@/lib/portal/contracts";
import { Check } from "@/components/icons";
import {
  logCallOutcome,
  undoCallOutcome,
  type CallOutcomeId,
} from "../actions";
import { followUpWhenLabel } from "../format";

// The daily work loop uses the same appointment-request-lifecycle vocabulary as the queue.
// Staff choose the request's next status first, then only the details that
// status needs. Appointment request notes stay in their own single,
// consistent surface instead of appearing as a second input here.

type OutcomeOption = {
  id: CallOutcomeId;
  label: string;
  helper?: string;
};

const CONTACTED_OUTCOMES: OutcomeOption[] = [
  {
    id: "reached_follow_up",
    label: "Reached the patient — follow-up needed",
    helper: "Talked it through; call again to finish.",
  },
  { id: "voicemail", label: "Left a voicemail — call again" },
  { id: "no_answer", label: "No answer — call again" },
];

const CLOSING_OUTCOMES: OutcomeOption[] = [
  {
    id: "wont_schedule",
    label: "Patient won't schedule",
    helper: "Done — no appointment. Leaves the active queue.",
  },
  {
    id: "not_actionable",
    label: "Duplicate or not actionable",
    helper: "Done — no appointment. Leaves the active queue.",
  },
];

const FINISH_OUTCOME: OutcomeOption = {
  id: "scheduled_transferred",
  label: "Appointment booked — request complete",
  helper:
    "The booking is on the practice schedule and no more follow-up is needed.",
};

type LifecycleDestination = Exclude<RequestStatus, "new">;

const STATUS_LABEL: Record<RequestStatus, string> = {
  new: "New",
  contacted: "Contacted",
  scheduled: "Scheduled",
  closed: "Closed",
};

const DESTINATION_COPY: Record<
  LifecycleDestination,
  { label: string; helper: string }
> = {
  contacted: {
    label: "Contacted",
    helper: "The patient was reached or needs another call.",
  },
  scheduled: {
    label: "Scheduled",
    helper: "The appointment is booked and on the practice schedule.",
  },
  closed: {
    label: "Closed",
    helper: "No more work remains on this request.",
  },
};

function destinationsFrom(status: RequestStatus): LifecycleDestination[] {
  switch (status) {
    case "new":
      return ["contacted", "scheduled", "closed"];
    case "contacted":
      return ["scheduled", "closed"];
    case "scheduled":
      return ["closed"];
    case "closed":
      return ["contacted", "scheduled"];
  }
}

type FollowUpKind = "this_afternoon" | "tomorrow_morning" | "friday" | "day";

const FOLLOW_UP_KINDS: Array<{ kind: FollowUpKind; label: string }> = [
  { kind: "this_afternoon", label: "This afternoon" },
  { kind: "tomorrow_morning", label: "Tomorrow morning" },
  { kind: "friday", label: "Friday" },
  { kind: "day", label: "Pick a day…" },
];

const NY_DAY_INPUT = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "short",
  timeZone: "America/New_York",
});

function requiresFollowUp(outcome: CallOutcomeId | null): boolean {
  return outcome === "voicemail" || outcome === "no_answer";
}

function allowsFollowUp(outcome: CallOutcomeId | null): boolean {
  return requiresFollowUp(outcome) || outcome === "reached_follow_up";
}

function confirmationFor(
  outcome: CallOutcomeId,
  followUpAt: string | null,
): string {
  switch (outcome) {
    case "booked":
      return "Saved — appointment booked. It stays on the Scheduled list if you need it.";
    case "reached_follow_up":
    case "voicemail":
    case "no_answer":
      return followUpAt
        ? `Saved — marked Contacted. It will resurface ${followUpWhenLabel(followUpAt)}.`
        : "Saved — marked Contacted.";
    case "wont_schedule":
    case "not_actionable":
      return "Saved — the request is closed.";
    case "scheduled_transferred":
      return "Saved — closed as finished, appointment booked.";
  }
}

const ERROR_COPY = {
  follow_up_required:
    "Choose when to call again — that's how the queue knows when to bring this request back.",
  not_found:
    "This request no longer exists — it may have been removed. Open the queue to see the current list.",
  invalid:
    "Something about that didn't check out. Nothing was recorded — review and try again.",
  unavailable:
    "Something went wrong saving that. Nothing may have been recorded — try again, and check the request before repeating anything.",
} as const;

// Practice-local "today" for the date input's min/max bounds, rendered as
// YYYY-MM-DD. The server re-validates the resolved day; these bounds only
// guide the picker.
function practiceLocalDay(offsetDays: number): string {
  const todayEt = NY_DAY_INPUT.format(new Date());
  const shifted = new Date(
    Date.parse(`${todayEt}T00:00:00Z`) + offsetDays * 86_400_000,
  );
  return shifted.toISOString().slice(0, 10);
}

type Feedback =
  | {
      tone: "success";
      text: string;
      closed: boolean;
      offerNext: boolean;
    }
  | { tone: "error"; text: string };

type ComposerState = {
  destination: LifecycleDestination | null;
  selected: CallOutcomeId | null;
  followUpKind: FollowUpKind | null;
  followUpDay: string;
  attempted: boolean;
  feedback: Feedback | null;
};

type ComposerAction =
  | { type: "select_destination"; destination: LifecycleDestination }
  | { type: "select_outcome"; outcome: CallOutcomeId }
  | { type: "select_follow_up"; kind: FollowUpKind }
  | { type: "set_day"; day: string }
  | { type: "attempt" }
  | {
      type: "succeeded";
      text: string;
      closed: boolean;
      offerNext: boolean;
    }
  | { type: "failed"; text: string };

const INITIAL_STATE: ComposerState = {
  destination: null,
  selected: null,
  followUpKind: null,
  followUpDay: "",
  attempted: false,
  feedback: null,
};

function composerReducer(
  state: ComposerState,
  action: ComposerAction,
): ComposerState {
  switch (action.type) {
    case "select_destination":
      return {
        ...state,
        destination: action.destination,
        selected: action.destination === "scheduled" ? "booked" : null,
        followUpKind: null,
        followUpDay: "",
        attempted: false,
        feedback: null,
      };
    case "select_outcome":
      return {
        ...state,
        selected: action.outcome,
        attempted: false,
        feedback: null,
        ...(allowsFollowUp(action.outcome)
          ? {}
          : { followUpKind: null, followUpDay: "" }),
      };
    case "select_follow_up":
      return { ...state, followUpKind: action.kind, feedback: null };
    case "set_day":
      return { ...state, followUpDay: action.day, feedback: null };
    case "attempt":
      return { ...state, attempted: true };
    case "succeeded":
      return {
        ...INITIAL_STATE,
        feedback: {
          tone: "success",
          text: action.text,
          closed: action.closed,
          offerNext: action.offerNext,
        },
      };
    case "failed":
      return { ...state, feedback: { tone: "error", text: action.text } };
  }
}

function DestinationRow({
  destination,
  checked,
  disabled,
  onSelect,
}: {
  destination: LifecycleDestination;
  checked: boolean;
  disabled: boolean;
  onSelect: (destination: LifecycleDestination) => void;
}) {
  const copy = DESTINATION_COPY[destination];
  return (
    <label className="group block cursor-pointer rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-4 py-3 transition-[border-color,background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] has-[:checked]:border-[var(--color-navy)] has-[:checked]:bg-[var(--color-mint)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--color-teal-ink)] has-[:disabled]:cursor-default has-[:disabled]:opacity-60 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100">
      <input
        type="radio"
        name="request-status"
        value={destination}
        checked={checked}
        disabled={disabled}
        aria-describedby="current-request-status"
        onChange={() => onSelect(destination)}
        className="sr-only"
      />
      <span className="flex items-start justify-between gap-3">
        <span>
          <span className="block text-[0.95rem] font-black leading-snug text-[var(--color-ink)]">
            {copy.label}
          </span>
          <span className="mt-1 block text-[0.82rem] leading-snug text-[var(--color-muted)]">
            {copy.helper}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="grid h-5 w-5 flex-none place-items-center rounded-full border border-[var(--color-line-2)] text-white transition-colors group-has-[:checked]:border-[var(--color-navy)] group-has-[:checked]:bg-[var(--color-navy)]"
        >
          <Check className="h-3 w-3 opacity-0 transition-opacity group-has-[:checked]:opacity-100" />
        </span>
      </span>
    </label>
  );
}

function OutcomeRow({
  option,
  checked,
  disabled,
  onSelect,
}: {
  option: OutcomeOption;
  checked: boolean;
  disabled: boolean;
  onSelect: (id: CallOutcomeId) => void;
}) {
  return (
    <label className="group block cursor-pointer rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-4 py-3 transition-colors has-[:checked]:border-[var(--color-navy)] has-[:checked]:bg-[var(--color-mint)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--color-teal-ink)] has-[:disabled]:cursor-default has-[:disabled]:opacity-60 hover:border-[var(--color-navy)]">
      <input
        type="radio"
        name="call-outcome"
        value={option.id}
        checked={checked}
        disabled={disabled}
        onChange={() => onSelect(option.id)}
        className="sr-only"
      />
      <span className="flex items-center justify-between gap-3">
        <span className="text-[0.95rem] font-bold leading-snug text-[var(--color-ink)]">
          {option.label}
        </span>
        <span
          aria-hidden="true"
          className="grid h-5 w-5 flex-none place-items-center rounded-full border border-[var(--color-line-2)] text-white transition-colors group-has-[:checked]:border-[var(--color-navy)] group-has-[:checked]:bg-[var(--color-navy)]"
        >
          <Check className="h-3 w-3 opacity-0 transition-opacity group-has-[:checked]:opacity-100" />
        </span>
      </span>
      {option.helper ? (
        <span className="mt-1 block text-[0.82rem] leading-snug text-[var(--color-muted)]">
          {option.helper}
        </span>
      ) : null}
    </label>
  );
}

function FollowUpFieldset({
  outcome,
  followUpKind,
  followUpDay,
  attempted,
  pending,
  dispatch,
}: {
  outcome: CallOutcomeId;
  followUpKind: FollowUpKind | null;
  followUpDay: string;
  attempted: boolean;
  pending: boolean;
  dispatch: React.Dispatch<ComposerAction>;
}) {
  const followUpMissing =
    attempted && requiresFollowUp(outcome) && !followUpKind;
  const dayMissing = attempted && followUpKind === "day" && !followUpDay;

  return (
    <fieldset className="mt-5" disabled={pending}>
      <legend className="text-sm font-bold text-[var(--color-ink)]">
        When should this come back to your attention?
      </legend>
      <p className="mt-1 text-[0.85rem] leading-relaxed text-[var(--color-muted)]">
        This tells the queue when to bring the request back.
        {requiresFollowUp(outcome) ? " Required for this outcome." : ""}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {FOLLOW_UP_KINDS.map((chip) => (
          <label
            key={chip.kind}
            className="flex min-h-11 cursor-pointer items-center rounded-full border border-[var(--color-line-2)] bg-white px-4 text-[0.9rem] font-bold text-[var(--color-body)] transition-colors has-[:checked]:border-[var(--color-navy)] has-[:checked]:bg-[var(--color-navy)] has-[:checked]:text-[var(--color-on-dark)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--color-teal-ink)] hover:border-[var(--color-navy)]"
          >
            <input
              type="radio"
              name="follow-up"
              value={chip.kind}
              checked={followUpKind === chip.kind}
              onChange={() =>
                dispatch({ type: "select_follow_up", kind: chip.kind })
              }
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
            onChange={(event) =>
              dispatch({ type: "set_day", day: event.target.value })
            }
            className="min-h-11 rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3.5 text-[0.9rem] text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-teal-ink)] disabled:opacity-60"
          />
        ) : null}
      </div>
      {followUpMissing ? (
        <p
          role="alert"
          data-testid="follow-up-required"
          className="mt-3 rounded-[var(--radius-sm)] bg-[var(--color-amber-soft)] px-4 py-3 text-[0.9rem] font-bold text-[var(--color-ink)]"
        >
          {ERROR_COPY.follow_up_required}
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

function ComposerFeedback({
  feedback,
  nextHref,
  feedbackRef,
}: {
  feedback: Feedback | null;
  nextHref?: string | null;
  feedbackRef: RefObject<HTMLParagraphElement | null>;
}) {
  if (!feedback) return null;

  return (
    <p
      ref={feedbackRef}
      tabIndex={-1}
      role={feedback.tone === "success" ? "status" : "alert"}
      data-testid="composer-feedback"
      className={`mt-4 rounded-[var(--radius-sm)] px-4 py-3 text-[0.92rem] font-bold leading-relaxed text-[var(--color-ink)] outline-none ${
        feedback.tone === "success"
          ? "bg-[var(--color-mint)]"
          : "bg-[var(--color-amber-soft)]"
      }`}
    >
      {feedback.text}{" "}
      {feedback.tone === "success" ? (
        feedback.offerNext && nextHref ? (
          <Link
            href={nextHref}
            data-testid="open-next-request"
            className="inline-flex min-h-11 items-center underline underline-offset-2"
          >
            Open next appointment request
          </Link>
        ) : feedback.closed ? (
          <Link
            href="/admin/requests"
            className="inline-flex min-h-11 items-center underline underline-offset-2"
          >
            Back to appointment requests
          </Link>
        ) : null
      ) : null}
    </p>
  );
}

function StatusActions({
  pending,
  saveDisabled,
  operation,
  saveConfirmed,
  undoAvailable,
  undoConfirmed,
  confirmationMotion,
  onSave,
  onUndo,
}: {
  pending: boolean;
  saveDisabled: boolean;
  operation: "save" | "undo" | null;
  saveConfirmed: boolean;
  undoAvailable: boolean;
  undoConfirmed: boolean;
  confirmationMotion: boolean;
  onSave: (animateConfirmation: boolean) => void;
  onUndo: (animateConfirmation: boolean) => void;
}) {
  const saveLabel =
    operation === "save" ? "Saving…" : saveConfirmed ? "Saved" : "Save";
  const undoLabel =
    operation === "undo" ? "Undoing…" : undoConfirmed ? "Undone" : "Undo";

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <button
        type="button"
        data-testid="save-outcome"
        disabled={saveDisabled}
        onClick={(event) => onSave(event.detail !== 0)}
        className="btn btn-navy min-h-11 disabled:opacity-60"
      >
        <span
          key={saveLabel}
          data-confirmed={saveConfirmed && operation !== "save"}
          data-animate={confirmationMotion}
          className="request-status-action-label"
        >
          {saveConfirmed && operation !== "save" ? (
            <Check aria-hidden="true" className="h-4 w-4" />
          ) : null}
          {saveLabel}
        </span>
      </button>
      {undoAvailable || undoConfirmed ? (
        <button
          type="button"
          data-testid="undo-outcome"
          disabled={pending || undoConfirmed}
          onClick={(event) => onUndo(event.detail !== 0)}
          className="btn btn-outline min-h-11 disabled:opacity-60"
        >
          <span
            key={undoLabel}
            data-confirmed={undoConfirmed && operation !== "undo"}
            data-animate={confirmationMotion}
            className="request-status-action-label"
          >
            {undoConfirmed && operation !== "undo" ? (
              <Check aria-hidden="true" className="h-4 w-4" />
            ) : null}
            {undoLabel}
          </span>
        </button>
      ) : null}
      <p className="text-[0.85rem] text-[var(--color-muted)]">
        {undoAvailable
          ? "Undo restores the previous appointment request status, callback time, and Closed details."
          : "Save creates one Request activity entry."}
      </p>
    </div>
  );
}

export function CallOutcomeComposer({
  requestId,
  status,
  closureDisposition,
  closedAtLabel,
  nextHref = null,
}: {
  requestId: string;
  status: RequestStatus;
  closureDisposition: RequestClosureDisposition | null;
  closedAtLabel: string | null;
  nextHref?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, dispatch] = useReducer(composerReducer, INITIAL_STATE);
  const [operation, setOperation] = useState<"save" | "undo" | null>(null);
  const [undoEventId, setUndoEventId] = useState<string | null>(null);
  const [saveConfirmed, setSaveConfirmed] = useState(false);
  const [undoConfirmed, setUndoConfirmed] = useState(false);
  const [confirmationMotion, setConfirmationMotion] = useState(true);
  const {
    destination,
    selected,
    followUpKind,
    followUpDay,
    attempted,
    feedback,
  } = state;
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  const availableDestinations = destinationsFrom(status);

  useEffect(() => {
    if (feedback) feedbackRef.current?.focus();
  }, [feedback]);

  useEffect(() => {
    if (!undoConfirmed) return;
    const timeout = window.setTimeout(() => setUndoConfirmed(false), 1200);
    return () => window.clearTimeout(timeout);
  }, [undoConfirmed]);

  const outcomeRowProps = (option: OutcomeOption) => ({
    option,
    checked: selected === option.id,
    disabled: pending,
    onSelect: (id: CallOutcomeId) =>
      dispatch({ type: "select_outcome", outcome: id }),
  });

  function submit(animateConfirmation: boolean) {
    if (!selected || pending) return;
    dispatch({ type: "attempt" });
    if (requiresFollowUp(selected) && !followUpKind) return;
    if (followUpKind === "day" && !followUpDay) return;

    const followUp =
      allowsFollowUp(selected) && followUpKind
        ? followUpKind === "day"
          ? { kind: "day" as const, date: followUpDay }
          : { kind: followUpKind }
        : undefined;

    setOperation("save");
    startTransition(async () => {
      try {
        const result = await logCallOutcome({
          requestId,
          outcome: selected,
          followUp,
        });
        if (!result.ok) {
          dispatch({ type: "failed", text: ERROR_COPY[result.code] });
          return;
        }
        setConfirmationMotion(animateConfirmation);
        setUndoEventId(result.eventId);
        setUndoConfirmed(false);
        setSaveConfirmed(true);
        dispatch({
          type: "succeeded",
          text: confirmationFor(selected, result.followUpAt),
          closed: result.status === "closed",
          offerNext: true,
        });
        router.refresh();
      } finally {
        setOperation(null);
      }
    });
  }

  function undo(animateConfirmation: boolean) {
    if (!undoEventId || pending) return;
    setOperation("undo");
    startTransition(async () => {
      try {
        const result = await undoCallOutcome({
          requestId,
          eventId: undoEventId,
        });
        if (!result.ok) {
          if (result.code === "stale" || result.code === "not_found") {
            setUndoEventId(null);
            setSaveConfirmed(false);
            router.refresh();
          }
          dispatch({
            type: "failed",
            text:
              result.code === "stale"
                ? "Undo is unavailable because the appointment request changed after this save. The current appointment request status is shown."
                : result.code === "not_found"
                  ? "This save is no longer available to undo. The current appointment request status is shown."
                  : result.code === "invalid"
                    ? "Undo is unavailable. Nothing changed."
                    : "Undo did not complete. Check the current appointment request status before trying again.",
          });
          return;
        }
        setConfirmationMotion(animateConfirmation);
        setUndoEventId(null);
        setSaveConfirmed(false);
        setUndoConfirmed(true);
        dispatch({
          type: "succeeded",
          text: `Appointment request status restored to ${STATUS_LABEL[result.status]}.`,
          closed: result.status === "closed",
          offerNext: false,
        });
        router.refresh();
      } finally {
        setOperation(null);
      }
    });
  }

  function selectDestination(nextDestination: LifecycleDestination) {
    setSaveConfirmed(false);
    dispatch({
      type: "select_destination",
      destination: nextDestination,
    });
  }

  return (
    <section
      data-testid="call-outcome-composer"
      className="print-hide mt-7 border-t border-[var(--color-line)] pt-7"
    >
      <h2 className="text-[1.05rem] font-black text-[var(--color-ink)]">
        Update appointment request status
      </h2>
      <p className="mt-1.5 max-w-[68ch] text-[0.9rem] leading-relaxed text-[var(--color-muted)]">
        Choose where this request belongs next. The outcome and callback
        timing are saved together.
      </p>
      <p
        id="current-request-status"
        className="mt-3 text-[0.85rem] font-bold text-[var(--color-body)]"
      >
        Current status: {STATUS_LABEL[status]}
      </p>

      {status === "closed" ? (
        <p
          data-testid={
            closureDisposition
              ? "composer-closed-note"
              : "legacy-lifecycle-warning"
          }
          className={`mt-4 rounded-[var(--radius-sm)] px-4 py-3 text-[0.9rem] leading-relaxed text-[var(--color-ink)] ${
            closureDisposition
              ? "bg-[var(--color-mint)]"
              : "bg-[var(--color-amber-soft)] font-bold"
          }`}
        >
          {closureDisposition
            ? `This request is closed${
                closedAtLabel ? ` (${closedAtLabel})` : ""
              } — ${
                closureDisposition === "converted"
                  ? "appointment booked"
                  : "no appointment booked"
              }. Choose Contacted or Scheduled to reopen it.`
            : "Closed before outcomes were recorded. Choose Contacted or Scheduled to reopen it."}
        </p>
      ) : null}

      <ComposerFeedback
        feedback={feedback}
        nextHref={nextHref}
        feedbackRef={feedbackRef}
      />

      <fieldset className="mt-5" disabled={pending}>
        <legend className="text-sm font-bold text-[var(--color-ink)]">
          Where should this request go next?
        </legend>
        <p className="mt-1 text-[0.85rem] leading-relaxed text-[var(--color-muted)]">
          The current status is left out, so every choice moves the request
          forward or reopens it.
        </p>
        <div
          data-testid="lifecycle-destinations"
          className="mt-3 grid gap-2.5 sm:grid-cols-3"
        >
          {availableDestinations.map((nextStatus) => (
            <DestinationRow
              key={nextStatus}
              destination={nextStatus}
              checked={destination === nextStatus}
              disabled={pending}
              onSelect={selectDestination}
            />
          ))}
        </div>
      </fieldset>

      {destination === "contacted" ? (
        <fieldset className="mt-5" disabled={pending}>
          <legend className="text-sm font-bold text-[var(--color-ink)]">
            How did contact go?
          </legend>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {CONTACTED_OUTCOMES.map((option) => (
              <OutcomeRow key={option.id} {...outcomeRowProps(option)} />
            ))}
          </div>
        </fieldset>
      ) : null}

      {destination === "scheduled" ? (
        <div
          data-testid="scheduled-explanation"
          className="mt-5 rounded-[var(--radius)] bg-[var(--color-mint)] px-4 py-3"
        >
          <p className="text-[0.95rem] font-bold text-[var(--color-ink)]">
            Appointment is booked
          </p>
          <p className="mt-1 text-[0.85rem] leading-relaxed text-[var(--color-muted)]">
            This request will stay on the Scheduled list in case staff need it.
          </p>
        </div>
      ) : null}

      {destination === "closed" ? (
        <fieldset className="mt-5" disabled={pending}>
          <legend className="text-sm font-bold text-[var(--color-ink)]">
            Why is this request closed?
          </legend>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {[FINISH_OUTCOME, ...CLOSING_OUTCOMES].map((option) => (
              <OutcomeRow key={option.id} {...outcomeRowProps(option)} />
            ))}
          </div>
        </fieldset>
      ) : null}

      {selected && allowsFollowUp(selected) ? (
        <FollowUpFieldset
          outcome={selected}
          followUpKind={followUpKind}
          followUpDay={followUpDay}
          attempted={attempted}
          pending={pending}
          dispatch={dispatch}
        />
      ) : null}

      <StatusActions
        pending={pending}
        saveDisabled={
          pending ||
          !selected ||
          (requiresFollowUp(selected) && !followUpKind) ||
          (followUpKind === "day" && !followUpDay)
        }
        operation={operation}
        saveConfirmed={saveConfirmed}
        undoAvailable={Boolean(undoEventId)}
        undoConfirmed={undoConfirmed}
        confirmationMotion={confirmationMotion}
        onSave={submit}
        onUndo={undo}
      />
    </section>
  );
}
