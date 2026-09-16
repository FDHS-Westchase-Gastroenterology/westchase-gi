"use client";

import { useRouter } from "next/navigation";
import { useId, useReducer, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { practiceLocalDay } from "@/app/admin/(portal)/requests/appointment-input";
import {
  closeRequest,
  confirmBookingHandoff,
  recordContactAttempt,
  recordContactAndClose,
} from "@/app/admin/(portal)/requests/workflow-actions";
import { SETTLED_TOAST } from "@/app/admin/(portal)/toast-follow";
import { Phone, PhoneOff } from "@/components/icons";
import { RadioGroup, RadioGroupItem } from "@/components/stock/radio-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/stock/toggle-group";
import { Field, FieldLabel } from "@/components/ui/field";

import type { HomeLine } from "./home-line";
import { HomeDayCalendar } from "./parts/calendar";
import { ChevronGlyph, PhoneGlyph } from "./parts/glyphs";
import { TimePicker } from "./parts/time-picker";
import {
  ANSWER_LABELS,
  CARD_ANSWERS,
  cardNoteFor,
  cardReducer,
  cardRowsFor,
  closureFor,
  commandFor,
  dayHorizon,
  FOLLOW_UP_LABELS,
  FOLLOW_UPS,
  followUpsFor,
  INITIAL_DRAFT,
  needsDay,
  needsTime,
  savedMessage,
} from "./record-card-model";
import type {
  CardAnswer,
  CardCommand,
  CardDraft,
  CardEvent,
  CardFailure,
  FollowUp,
} from "./record-card-model";
import { failureOf, followSave, saveCardCommand } from "./record-card-save";

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
   earns, and the three ways a save can fail. The save is one promise the
   toast follows (ui/toaster.tsx on Sonner, mounted in the portal layout so
   the result outlives this card): "Saving…" while the action runs, the
   saved line once the server confirmed it, the failure otherwise. An
   uncertain failure keeps its toast open with Try again, which re-runs the
   same attempt under the same idempotency key and updates the same toast,
   mirroring the request detail panel; closing that toast instead is the
   same choice as closing the card: the lock lifts and the next Save is a
   new attempt, which the version check keeps honest. Optimistic
   concurrency rides every attempt. */
const SAVE_TOAST_TEST_ID = "home-save-toast";

function useRecordCommit(line: Readonly<HomeLine>, onSaved: () => void) {
  const router = useRouter();
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

  function save(command: Readonly<CardCommand>) {
    const attempt = () => {
      if (pending) return;
      setFailure(null);
      const input = common();
      const outcome = followSave(async () =>
        saveCardCommand(command, input, {
          recordContactAttempt,
          recordContactAndClose,
          closeRequest,
          confirmBookingHandoff,
        }),
      );

      /* One toast per attempt, keyed by the attempt's identity: Try again
         updates it in place instead of stacking a second. Sonner merges an
         update over the toast it replaces, so the open-ended state an
         uncertain failure set (no timeout, a close button, Try again) is
         reset by name when the retry starts and when it lands. */
      toast.promise(outcome, {
        id: `${SAVE_TOAST_TEST_ID}:${input.idempotencyKey}`,
        testId: SAVE_TOAST_TEST_ID,
        ...SETTLED_TOAST,
        loading: "Saving…",
        success: (result) => ({
          message: savedMessage(command, line.name, result.callAgainAt),
          ...SETTLED_TOAST,
        }),
        error: (cause: unknown) => {
          const next = failureOf(cause);
          if (!next.uncertain) return { message: next.message, ...SETTLED_TOAST };
          return {
            message: next.message,
            duration: Number.POSITIVE_INFINITY,
            closeButton: true,
            action: {
              label: "Try again",
              onClick: (event) => {
                /* Sonner dismisses a toast on its action press; this one
                   stays, and the retry updates it. */
                event.preventDefault();
                lastRun.current?.();
              },
            },
            onDismiss: () => {
              keyRef.current = null;
              setFailure(null);
            },
          };
        },
      });

      startTransition(async () => {
        try {
          await outcome;
        } catch (cause) {
          const next = failureOf(cause);
          if (!next.uncertain) keyRef.current = null;
          setFailure(next);
          if (next.refresh) router.refresh();
          return;
        }
        keyRef.current = null;
        onSaved();
        router.refresh();
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
          data-closes={closureFor(row) === null ? undefined : "true"}
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
          <TimePicker
            id={timeId}
            time={draft.time}
            disabled={locked}
            onPick={(time) => {
              dispatch({ type: "time", time });
            }}
          />
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

export function RecordCard({
  line,
  onClose,
  onOpenFull,
  onSettled,
}: Readonly<{
  line: Readonly<HomeLine>;
  onClose: () => void;
  /** `instant` when the press came from the keyboard: the sheet then opens without motion. */
  onOpenFull: (instant: boolean) => void;
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
        <button
          type="button"
          className="wgi-record-foot"
          onClick={(event) => {
            /* A click with no pointer behind it (Enter or Space) has detail 0. */
            onOpenFull(event.detail === 0);
          }}
        >
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
