"use client";

import { useRouter } from "next/navigation";
import { useId, useReducer, useRef, useState, useTransition } from "react";

import { usePortalFeedback } from "@/app/admin/(portal)/portal-feedback";
import { practiceLocalDay } from "@/app/admin/(portal)/requests/appointment-input";
import {
  closeRequest,
  confirmBookingHandoff,
  recordContactAttempt,
} from "@/app/admin/(portal)/requests/workflow-actions";
import { Check } from "@/components/icons";
import type { CommandOutcome } from "@/lib/portal/workflow/contracts";

import type { HomeLine } from "./home-line";
import { HomeDayCalendar } from "./parts/calendar";
import { ChevronGlyph, PhoneGlyph } from "./parts/glyphs";
import {
  ANSWER_ROWS,
  cardNoteFor,
  cardReducer,
  cardRowsFor,
  closureReasonFor,
  commandFor,
  dayHorizon,
  failureFor,
  INITIAL_DRAFT,
  needsDay,
  needsTime,
  rowHint,
  savedMessage,
  TIME_OPTIONS,
} from "./record-card-model";
import type {
  CardAnswer,
  CardCommand,
  CardDraft,
  CardEvent,
  CardFailure,
} from "./record-card-model";

/* ---- The record card: one question, one calendar, one Save ----
   "What happened?" is a radio group; the answer prefills the day the
   practice usually means and the registry calendar beneath keeps that day
   adjustable, so the return is stated and visible before anything is
   recorded (PRODUCT.md: every contact schedules its own return). Save is
   the one commit, as Apply is in the Received editor. The rules live in
   record-card-model.ts; optimistic concurrency and an idempotency key ride
   every attempt, mirroring the request detail panel. */

/* The commit: which server action the answer means, the feedback line it
   earns, and the three ways a save can fail. Optimistic concurrency and an
   idempotency key ride every attempt, mirroring the request detail panel;
   `retry` re-runs the last attempt under the same key when the portal could
   not confirm the outcome. */
function useRecordCommit(line: Readonly<HomeLine>, onSaved: () => void) {
  const router = useRouter();
  const { publish } = usePortalFeedback();
  const [pending, startTransition] = useTransition();
  const [failure, setFailure] = useState<CardFailure | null>(null);
  const keyRef = useRef<string | null>(null);
  const lastRun = useRef<(() => void) | null>(null);

  function common() {
    keyRef.current ??= crypto.randomUUID();
    return {
      requestId: line.id,
      expectedVersion: line.version,
      idempotencyKey: keyRef.current,
    };
  }

  async function dispatchCommand(command: Readonly<CardCommand>): Promise<CommandOutcome> {
    if (command.kind === "attempt") {
      return recordContactAttempt({
        ...common(),
        outcome: command.outcome,
        callAgain: command.callAgain,
      });
    }
    if (command.kind === "close") return closeRequest({ ...common(), reason: command.reason });
    return confirmBookingHandoff({ ...common(), appointment: command.appointment });
  }

  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- CommandOutcome carries domain member types that cannot be made readonly
  function settle(result: Readonly<CommandOutcome>, answer: CardAnswer) {
    if (result.ok) {
      keyRef.current = null;
      publish({
        source: "requests-output",
        tone: "status",
        message: savedMessage(answer, line.name, result.callAgainAt),
      });
      onSaved();
      router.refresh();
      return;
    }
    const next = failureFor(result.code);
    if (!next.uncertain) keyRef.current = null;
    setFailure(next);
    if (next.refresh) router.refresh();
  }

  function save(answer: CardAnswer, command: Readonly<CardCommand>) {
    const attempt = () => {
      if (pending) return;
      setFailure(null);
      startTransition(async () => {
        settle(await dispatchCommand(command), answer);
      });
    };
    lastRun.current = attempt;
    attempt();
  }

  return {
    pending,
    failure,
    clearFailure: () => {
      setFailure(null);
    },
    save,
    retry: () => lastRun.current?.(),
  };
}

/* The answers: one native radio per row inside a whole-row label (the
   request detail's decision rows at the card's density), the closing rows
   ruled off beneath the continuing ones. */
function AnswerRows({
  rows,
  draft,
  today,
  locked,
  onPick,
}: Readonly<{
  rows: readonly CardAnswer[];
  draft: Readonly<CardDraft>;
  today: string;
  locked: boolean;
  onPick: (answer: CardAnswer) => void;
}>) {
  const groupName = useId();
  const questionId = useId();
  return (
    <>
      <p id={questionId} className="wgi-record-q">
        What happened?
      </p>
      <div role="radiogroup" aria-labelledby={questionId} className="wgi-record-outcomes">
        {rows.map((row) => (
          <label
            key={row}
            className="wgi-outcome"
            data-closes={closureReasonFor(row) === null ? undefined : "true"}
          >
            <input
              type="radio"
              name={groupName}
              value={row}
              className="sr-only"
              checked={draft.answer === row}
              disabled={locked}
              onChange={() => {
                onPick(row);
              }}
            />
            <span aria-hidden="true" className="wgi-outcome-mark">
              <Check className="wgi-outcome-check" />
            </span>
            <span className="wgi-outcome-label">{ANSWER_ROWS[row].label}</span>
            <small>{rowHint(row, draft, today)}</small>
          </label>
        ))}
      </div>
    </>
  );
}

/* The return: the registry calendar the Received editor uses, bounded to
   the answer's horizon, with the appointment's wall-clock time beneath it
   when the answer is a booking. */
function ReturnPlan({
  draft,
  today,
  locked,
  dispatch,
}: Readonly<{
  draft: Readonly<CardDraft>;
  today: string;
  locked: boolean;
  dispatch: (event: Readonly<CardEvent>) => void;
}>) {
  return (
    <div className="wgi-record-when">
      <HomeDayCalendar
        day={draft.day}
        min={today}
        max={practiceLocalDay(dayHorizon(draft.answer))}
        disabled={locked}
        onChange={(day) => {
          dispatch({ type: "day", day });
        }}
      />
      {needsTime(draft.answer) ? (
        <label className="wgi-record-time">
          Time
          <select
            value={draft.time}
            disabled={locked}
            onChange={(event) => {
              dispatch({ type: "time", time: event.target.value });
            }}
          >
            <option value="">Pick a time</option>
            {TIME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}

function CardAlert({
  failure,
  pending,
  onRetry,
}: Readonly<{ failure: Readonly<CardFailure>; pending: boolean; onRetry: () => void }>) {
  return (
    <p role="alert" className="wgi-record-error">
      {failure.message}{" "}
      {failure.uncertain ? (
        <button type="button" className="wgi-record-retry" disabled={pending} onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </p>
  );
}

export function RecordCard({
  line,
  onClose,
  onOpenFull,
  onSettled,
}: Readonly<{
  line: Readonly<HomeLine>;
  onClose: () => void;
  onOpenFull: () => void;
  onSettled: (id: string) => void;
}>) {
  const [draft, dispatch] = useReducer(cardReducer, INITIAL_DRAFT);
  const commit = useRecordCommit(line, () => {
    onSettled(line.id);
    onClose();
  });

  /* Practice-local today, read once per render so the bounds, the prefill
     and the label agree even across midnight. */
  const today = practiceLocalDay(0);
  const note = cardNoteFor(line.status);
  const locked = commit.pending || commit.failure?.uncertain === true;
  const command = commandFor(draft, today);
  const answer = draft.answer;

  return (
    <>
      <div className="wgi-record-head">
        <p className="wgi-record-name" data-ui-redact="patient-name">
          {line.name}
        </p>
        <p className="wgi-record-meta">
          {line.stamp === null ? null : <span className="portal-stamp">{line.stamp}</span>}
          <span>
            {line.pref} · {line.timing}
          </span>
        </p>
      </div>
      <a href={line.tel} className="wgi-record-call" data-ui-redact="patient-contact">
        <PhoneGlyph size={15} />
        {line.phoneDisplay}
      </a>

      {note === null ? (
        <AnswerRows
          rows={cardRowsFor(line.status)}
          draft={draft}
          today={today}
          locked={locked}
          onPick={(picked) => {
            commit.clearFailure();
            dispatch({ type: "answer", answer: picked, today });
          }}
        />
      ) : (
        <p className="wgi-record-note">{note}</p>
      )}

      {needsDay(answer) ? (
        <ReturnPlan draft={draft} today={today} locked={locked} dispatch={dispatch} />
      ) : null}

      {answer === null ? null : (
        <div className="wgi-record-commit">
          <button
            type="button"
            className="wgi-editor-apply"
            disabled={locked || command === null}
            onClick={() => {
              if (command !== null) commit.save(answer, command);
            }}
          >
            {commit.pending ? "Saving…" : "Save"}
          </button>
        </div>
      )}

      {commit.failure === null ? null : (
        <CardAlert failure={commit.failure} pending={commit.pending} onRetry={commit.retry} />
      )}

      <button type="button" className="wgi-record-foot" onClick={onOpenFull}>
        Open full record
        <ChevronGlyph size={14} />
      </button>
    </>
  );
}
