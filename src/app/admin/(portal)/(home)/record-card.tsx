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
import { Clock, Phone, PhoneOff } from "@/components/icons";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/stock/input-group";
import { RadioGroup, RadioGroupItem } from "@/components/stock/radio-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/stock/toggle-group";
import { Field, FieldLabel } from "@/components/ui/field";
import type { CommandOutcome } from "@/lib/portal/workflow/contracts";

import type { HomeLine } from "./home-line";
import { HomeDayCalendar } from "./parts/calendar";
import { ChevronGlyph, PhoneGlyph } from "./parts/glyphs";
import {
  ANSWER_LABELS,
  CARD_ANSWERS,
  cardNoteFor,
  cardReducer,
  cardRowsFor,
  closureFor,
  commandFor,
  dayHorizon,
  failureFor,
  FOLLOW_UP_LABELS,
  FOLLOW_UPS,
  followUpsFor,
  INITIAL_DRAFT,
  needsDay,
  needsTime,
  savedMessage,
  TIME_MAX,
  TIME_MIN,
  TIME_STEP_SECONDS,
} from "./record-card-model";
import type {
  CardAnswer,
  CardCommand,
  CardDraft,
  CardEvent,
  CardFailure,
  FollowUp,
} from "./record-card-model";

/* ---- The record card: the calendar is the surface ----
   The registry's "date picker with presets" shape, in the portal's words:
   the registry calendar fills the card, six weeks tall, never scrolling,
   with the registry radio group beside it for what happened and a row
   along the month's lower edge for the second question. A contact answer
   puts Call again and No call there; a booking puts the time there. The
   calendar opens blank — no presumed day, no today tint — and shows only
   the day staff click, in either order. Nothing is recorded until Save,
   as nothing is filtered until Apply. Under the sidebar breakpoint the
   column stacks above the month and the card scrolls with Save pinned
   along its lower edge. The rules live in record-card-model.ts. */

/* The commit: which server action the draft means, the feedback line it
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
  function settle(result: Readonly<CommandOutcome>, command: Readonly<CardCommand>) {
    if (result.ok) {
      keyRef.current = null;
      publish({
        source: "requests-output",
        tone: "status",
        message: savedMessage(command, line.name, result.callAgainAt),
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

  function save(command: Readonly<CardCommand>) {
    const attempt = () => {
      if (pending) return;
      setFailure(null);
      startTransition(async () => {
        settle(await dispatchCommand(command), command);
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

/* The answers: the registry radio group, one whole-row label per answer
   (the request detail's decision rows at the card's density), the closing
   row ruled off beneath the others. */
function AnswerRows({
  rows,
  answer,
  locked,
  onPick,
}: Readonly<{
  rows: readonly CardAnswer[];
  answer: CardAnswer | null;
  locked: boolean;
  onPick: (answer: CardAnswer) => void;
}>) {
  return (
    <RadioGroup
      aria-label="What happened"
      className="wgi-record-answers"
      value={answer}
      disabled={locked}
      onValueChange={(value) => {
        const picked = CARD_ANSWERS.find((row) => row === value);
        if (picked !== undefined) onPick(picked);
      }}
    >
      {rows.map((row) => (
        <FieldLabel
          key={row}
          className="wgi-answer"
          data-closes={closureFor(row, null) === null ? undefined : "true"}
        >
          <RadioGroupItem value={row} />
          {ANSWER_LABELS[row]}
        </FieldLabel>
      ))}
    </RadioGroup>
  );
}

/* The second question, along the month's lower edge. A contact answer:
   the registry toggle group, Call again or No call, the pressed one in
   the portal's checked tint. A booking: the registry time field. Any other
   state leaves the strip empty at its height, so the card never jumps. */
function SecondRow({
  draft,
  options,
  locked,
  dispatch,
}: Readonly<{
  draft: Readonly<CardDraft>;
  options: readonly FollowUp[];
  locked: boolean;
  dispatch: (event: Readonly<CardEvent>) => void;
}>) {
  const timeId = useId();
  if (needsTime(draft.answer)) {
    return (
      <div className="wgi-record-second">
        <Field orientation="horizontal" className="wgi-record-when">
          <FieldLabel htmlFor={timeId}>Time</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id={timeId}
              type="time"
              min={TIME_MIN}
              max={TIME_MAX}
              step={TIME_STEP_SECONDS}
              value={draft.time}
              disabled={locked}
              onChange={(event) => {
                dispatch({ type: "time", time: event.target.value });
              }}
            />
            <InputGroupAddon align="inline-end">
              <Clock />
            </InputGroupAddon>
          </InputGroup>
        </Field>
      </div>
    );
  }
  return (
    <div className="wgi-record-second">
      {options.length === 0 ? null : (
        <ToggleGroup
          aria-label="Follow-up"
          className="wgi-record-follow"
          variant="outline"
          size="sm"
          value={draft.followUp === null ? [] : [draft.followUp]}
          disabled={locked}
          onValueChange={(value) => {
            /* One of the two is always chosen: pressing the pressed one
               again is not a way to choose neither. */
            const next = FOLLOW_UPS.find((followUp) => followUp === value[0]);
            if (next !== undefined) dispatch({ type: "followUp", followUp: next });
          }}
        >
          {options.map((followUp) => (
            <ToggleGroupItem key={followUp} value={followUp}>
              {followUp === "call" ? (
                <Phone data-icon="inline-start" />
              ) : (
                <PhoneOff data-icon="inline-start" />
              )}
              {FOLLOW_UP_LABELS[followUp]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
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

  /* Practice-local today, read once per render so the bounds, the horizon
     check and the calendar agree even across midnight. */
  const today = practiceLocalDay(0);
  const note = cardNoteFor(line.status);
  const locked = commit.pending || commit.failure?.uncertain === true;
  const command = commandFor(draft, today);
  const answer = draft.answer;
  /* No day to pick — nothing chosen yet, No call, or a close — leaves the
     calendar in place but quiet, and shows no day, so a day that is not a
     plan never reads as one. */
  const idle = !needsDay(answer, draft.followUp);

  return (
    <>
      <div className="wgi-record-side">
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
            answer={answer}
            locked={locked}
            onPick={(picked) => {
              commit.clearFailure();
              dispatch({ type: "answer", answer: picked, today });
            }}
          />
        ) : (
          <p className="wgi-record-note">{note}</p>
        )}

        {commit.failure === null ? null : (
          <CardAlert failure={commit.failure} pending={commit.pending} onRetry={commit.retry} />
        )}
      </div>

      <div className="wgi-record-main">
        {note === null ? (
          <>
            <div className="wgi-record-cal" data-idle={idle || undefined}>
              <HomeDayCalendar
                day={idle ? "" : draft.day}
                min={today}
                max={practiceLocalDay(dayHorizon(answer))}
                disabled={locked || idle}
                onChange={(day) => {
                  dispatch({ type: "day", day });
                }}
              />
            </div>
            <SecondRow
              draft={draft}
              options={followUpsFor(answer)}
              locked={locked}
              dispatch={dispatch}
            />
          </>
        ) : null}
        <button type="button" className="wgi-record-foot" onClick={onOpenFull}>
          Open full record
          <ChevronGlyph size={14} />
        </button>
      </div>

      {note === null ? (
        <div className="wgi-record-commit">
          <button
            type="button"
            className="wgi-editor-apply"
            disabled={locked || command === null}
            onClick={() => {
              if (command !== null) commit.save(command);
            }}
          >
            {commit.pending ? "Saving…" : "Save"}
          </button>
        </div>
      ) : null}
    </>
  );
}
