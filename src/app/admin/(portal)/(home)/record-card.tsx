"use client";

import { useId, useReducer } from "react";
import type { ComponentProps } from "react";

import { practiceLocalDay } from "@/app/admin/(portal)/requests/appointment-input";
import { Phone, PhoneOff } from "@/components/icons";
import { RadioGroup, RadioGroupItem } from "@/components/stock/radio-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/stock/toggle-group";
import { Field, FieldLabel } from "@/components/ui/field";

import type { HomeLine } from "./home-line";
import { HomeDayCalendar } from "./parts/calendar";
import { ChevronGlyph, CloseGlyph, PhoneGlyph } from "./parts/glyphs";
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
  saveHintFor,
} from "./record-card-model";
import type { CardAnswer, CardDraft, CardEvent, FollowUp } from "./record-card-model";
import { useRecordCommit } from "./use-record-commit";

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
   along its lower edge. The rules live in record-card-model.ts, the save
   in use-record-commit.ts. Dragged by its head, the card detaches into a
   panel (use-card-detach.ts) — the head is the grab surface, and a panel
   carries its own close button where a popover has none (HIG Panels). */

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
  fullOpen,
  detached,
  dragHandleProps,
  onClose,
  onOpenFull,
  onSettled,
}: Readonly<{
  line: Readonly<HomeLine>;
  /** This record's full-record sheet is open beside the card. */
  fullOpen: boolean;
  /** The card is a detached panel: its head carries the close button a
      popover does not need (an outside press is its close). */
  detached: boolean;
  /** The head's grab surface, from use-card-detach.ts. */
  dragHandleProps: Pick<ComponentProps<"div">, "onPointerDown">;
  onClose: () => void;
  /** Toggles the full record — opens it, or hides it when it already shows
      this record. `instant` when the press came from the keyboard: the
      sheet then opens or closes without motion. */
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
  const hint = saveHintFor(draft, today);
  const answer = draft.answer;
  /* No day to pick — nothing chosen yet, No call, or a close — leaves the
     calendar in place but quiet, and shows no day, so a day that is not a
     plan never reads as one. */
  const idle = !needsDay(answer, draft.followUp);

  return (
    <>
      <div className="wgi-record-side">
        <div className="wgi-record-head" {...dragHandleProps}>
          <p className="wgi-record-name" data-ui-redact="patient-name">
            {line.name}
          </p>
          <p className="wgi-record-meta">
            {line.stamp === null ? null : <span className="portal-stamp">{line.stamp}</span>}
            <span>
              {line.pref} · {line.timing}
            </span>
          </p>
          {detached ? (
            <button type="button" className="wgi-record-close" aria-label="Close" onClick={onClose}>
              <CloseGlyph size={16} />
            </button>
          ) : null}
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
          /* The sheet's toggle: the card detaches into the sheet's
             companion, so the foot that opened it also hides it. */
          aria-expanded={fullOpen}
          aria-controls={fullOpen ? "wgi-full-record" : undefined}
          onClick={(event) => {
            /* A click with no pointer behind it (Enter or Space) has detail 0. */
            onOpenFull(event.detail === 0);
          }}
        >
          {fullOpen ? "Hide full record" : "Open full record"}
          <ChevronGlyph size={14} />
        </button>
      </div>

      {note === null ? (
        <div className="wgi-record-commit">
          {/* A disabled Save says what it waits for; the strip keeps its
              height whether or not there is anything to say, the way the
              second row does, so the card never jumps. */}
          <p className="wgi-record-hint" aria-live="polite">
            {hint}
          </p>
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
