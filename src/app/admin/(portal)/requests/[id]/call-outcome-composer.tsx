"use client";

import { useEffect, useReducer, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  RequestClosureDisposition,
  RequestStatus,
} from "@/lib/portal/contracts";
import { Check } from "@/components/icons";
import { logCallOutcome, type CallOutcomeId } from "../actions";
import { followUpWhenLabel } from "../format";

// The daily work loop: one gesture after a call records outcome, status,
// optional note, and optional call-again time together. The vocabulary
// matches how the front desk actually talks about a call — the primary
// success path lands on Scheduled (stays visible), never on a close.
// The separate status buttons and note form are retired into this card.

type OutcomeOption = {
  id: CallOutcomeId;
  label: string;
  helper?: string;
};

const PRIMARY_OUTCOMES: OutcomeOption[] = [
  {
    id: "booked",
    label: "Appointment is booked",
    helper: "On the practice schedule — still visible here if you need it.",
  },
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
  label: "We're finished — appointment was booked",
  helper: "Closes the request as done.",
};

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
  note_failed:
    "The outcome was saved, but the note didn't go through. Add it again and save.",
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
  | { tone: "success"; text: string; closed: boolean }
  | { tone: "error"; text: string };

type ComposerState = {
  selected: CallOutcomeId | null;
  followUpKind: FollowUpKind | null;
  followUpDay: string;
  note: string;
  attempted: boolean;
  feedback: Feedback | null;
};

type ComposerAction =
  | { type: "select_outcome"; outcome: CallOutcomeId }
  | { type: "select_follow_up"; kind: FollowUpKind }
  | { type: "set_day"; day: string }
  | { type: "set_note"; note: string }
  | { type: "attempt" }
  | { type: "succeeded"; text: string; closed: boolean }
  | { type: "failed"; text: string };

const INITIAL_STATE: ComposerState = {
  selected: null,
  followUpKind: null,
  followUpDay: "",
  note: "",
  attempted: false,
  feedback: null,
};

function composerReducer(
  state: ComposerState,
  action: ComposerAction,
): ComposerState {
  switch (action.type) {
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
    case "set_note":
      return { ...state, note: action.note };
    case "attempt":
      return { ...state, attempted: true };
    case "succeeded":
      return {
        ...INITIAL_STATE,
        feedback: { tone: "success", text: action.text, closed: action.closed },
      };
    case "failed":
      return { ...state, feedback: { tone: "error", text: action.text } };
  }
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
  const { selected, followUpKind, followUpDay, note, attempted, feedback } =
    state;
  const feedbackRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (feedback) feedbackRef.current?.focus();
  }, [feedback]);

  const outcomeRowProps = (option: OutcomeOption) => ({
    option,
    checked: selected === option.id,
    disabled: pending,
    onSelect: (id: CallOutcomeId) =>
      dispatch({ type: "select_outcome", outcome: id }),
  });

  function submit(openNext: boolean) {
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

    startTransition(async () => {
      const result = await logCallOutcome({
        requestId,
        outcome: selected,
        note: note.trim() ? note : undefined,
        followUp,
      });
      if (!result.ok) {
        dispatch({ type: "failed", text: ERROR_COPY[result.code] });
        return;
      }
      if (openNext && nextHref) {
        router.push(nextHref);
        router.refresh();
        return;
      }
      dispatch({
        type: "succeeded",
        text: confirmationFor(selected, result.followUpAt),
        closed: result.status === "closed",
      });
      router.refresh();
    });
  }

  return (
    <div
      data-testid="call-outcome-composer"
      className="card-lined mt-7 p-6 sm:p-7"
    >
      <h2 className="text-[1.05rem] font-black text-[var(--color-ink)]">
        Record what happened on the call
      </h2>
      <p className="mt-1.5 max-w-[68ch] text-[0.9rem] leading-relaxed text-[var(--color-muted)]">
        One step — the outcome, an optional note, and when to call again are
        saved together and recorded in the activity log.
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
              }. Recording a call outcome updates or reopens it.`
            : "Closed before outcomes were recorded. Choose an outcome if you know how it ended."}
        </p>
      ) : null}

      {feedback ? (
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
          {feedback.tone === "success" && feedback.closed ? (
            <Link
              href="/admin/requests"
              className="underline underline-offset-2"
            >
              Back to appointment requests
            </Link>
          ) : null}
        </p>
      ) : null}

      <fieldset className="mt-5" disabled={pending}>
        <legend className="text-sm font-bold text-[var(--color-ink)]">
          What happened?
        </legend>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {PRIMARY_OUTCOMES.map((option) => (
            <OutcomeRow key={option.id} {...outcomeRowProps(option)} />
          ))}
        </div>

        <div className="mt-5 border-t border-[var(--color-line)] pt-4">
          <p className="text-sm font-bold text-[var(--color-ink)]">
            Done with this request?
          </p>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {CLOSING_OUTCOMES.map((option) => (
              <OutcomeRow key={option.id} {...outcomeRowProps(option)} />
            ))}
          </div>
          <details className="group mt-2.5">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-[var(--radius)] px-1 text-[0.9rem] font-bold text-[var(--color-teal-ink)] marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="underline underline-offset-2">
                Finished with this request?
              </span>
            </summary>
            <div className="mt-2 max-w-xl">
              <p className="text-[0.85rem] leading-relaxed text-[var(--color-muted)]">
                If the appointment was booked and you&rsquo;re done with this
                request, close it out here.
              </p>
              <div className="mt-2">
                <OutcomeRow {...outcomeRowProps(FINISH_OUTCOME)} />
              </div>
            </div>
          </details>
        </div>
      </fieldset>

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

      <div className="mt-5">
        <label
          htmlFor="outcome-note"
          className="block text-sm font-bold text-[var(--color-ink)]"
        >
          Add a note <span className="font-normal">(optional)</span>
        </label>
        <textarea
          id="outcome-note"
          name="note"
          rows={3}
          maxLength={2000}
          value={note}
          disabled={pending}
          onChange={(event) =>
            dispatch({ type: "set_note", note: event.target.value })
          }
          className="mt-2 w-full rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3.5 py-3 text-[0.95rem] text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-teal-ink)] disabled:opacity-60"
          placeholder="Anything the next person should know? Keep it brief."
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-testid="save-outcome"
          disabled={
            pending ||
            !selected ||
            (requiresFollowUp(selected) && !followUpKind) ||
            (followUpKind === "day" && !followUpDay)
          }
          onClick={() => submit(false)}
          className="btn btn-navy min-h-11 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save outcome"}
        </button>
        {nextHref ? (
          <button
            type="button"
            data-testid="save-outcome-next"
            disabled={
              pending ||
              !selected ||
              (requiresFollowUp(selected) && !followUpKind) ||
              (followUpKind === "day" && !followUpDay)
            }
            onClick={() => submit(true)}
            className="btn btn-outline min-h-11 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save and open next"}
          </button>
        ) : null}
        <p className="text-[0.85rem] text-[var(--color-muted)]">
          Saved together — one entry in the activity log.
        </p>
      </div>
    </div>
  );
}
