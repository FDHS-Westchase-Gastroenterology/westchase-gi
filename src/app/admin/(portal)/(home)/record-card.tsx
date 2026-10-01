"use client";

import { useId, useReducer } from "react";
import type { ComponentProps, ReactNode } from "react";

import { practiceLocalDay } from "@/app/admin/(portal)/requests/appointment-input";
import { Phone, PhoneOff } from "@/components/icons";
import { RadioGroup, RadioGroupItem } from "@/components/stock/radio-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/stock/toggle-group";
import { Field, FieldLabel } from "@/components/ui/field";

import { prefersText } from "./home-line";
import type { HomeLine } from "./home-line";
import { LineStatusBadge } from "./parts/badge";
import { HomeDayCalendar } from "./parts/calendar";
import { ChevronGlyph, CloseGlyph, PhoneGlyph } from "./parts/glyphs";
import { BookButton, RecordBookingMain } from "./parts/record-booking";
import { TimePicker } from "./parts/time-picker";
import {
  ANSWER_LABELS,
  CARD_ANSWERS,
  cardNoteFor,
  cardReadoutFor,
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
} from "./record-card-model";
import type { CardAnswer, CardDraft, CardEvent, CardReadout, FollowUp } from "./record-card-model";
import { useRecordBooking } from "./use-record-booking";
import { useRecordCommit } from "./use-record-commit";

/* ---- The record card: the calendar is the surface ----
   The registry's "date picker with presets" shape, in the portal's words:
   the registry calendar fills the card, six weeks tall, never scrolling,
   with the registry radio group beside it for what happened and a strip
   along the month's lower edge for the second question and its answer. A
   contact answer puts Call again and No call there; a booking puts the
   time there; the right of the strip reads back what Save records. The
   calendar opens blank — no presumed day, no today fill — and shows only
   the day staff click, in either order. Nothing is recorded until Save,
   as nothing is filtered until Apply. One footer spans both columns: the
   way into the full record, and Save (Figma Ypf9ohpRcGWF5C9T9bSvWW,
   section 03). Under the sidebar breakpoint the column stacks above the
   month and the card scrolls with the footer pinned along its lower edge.
   The rules live in record-card-model.ts, the save in
   use-record-commit.ts. Dragged by its head, the card detaches into a
   panel (use-card-detach.ts) — the head is the grab surface, and a panel
   carries its own close button where a popover has none (HIG Panels). */

/* The answers: the registry radio group, one whole-row label per answer
   (the request detail's decision rows at the card's density), the closing
   row ruled off beneath the others. */
function AnswerRows({
  labelId,
  rows,
  answer,
  locked,
  onPick,
}: Readonly<{
  labelId: string;
  rows: readonly CardAnswer[];
  answer: CardAnswer | null;
  locked: boolean;
  onPick: (answer: CardAnswer) => void;
}>) {
  return (
    <RadioGroup
      aria-labelledby={labelId}
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

/* The second question, at the strip's left. A contact answer: the
   registry toggle group as a segmented control, Call again or No call,
   the pressed one raised onto the surface. A booking: the registry time
   field. Any other state leaves the place empty. */
function StripControl({
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
    );
  }
  if (options.length === 0) return <span />;
  return (
    <ToggleGroup
      aria-label="Follow-up"
      className="wgi-record-follow"
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
  );
}

/* The strip's right: a small label over what Save records, or the pick
   it still waits for in the quiet ink — the disabled Save's hint. Polite,
   so a screen reader hears the ask change without losing its place. */
function StripReadout({ readout }: Readonly<{ readout: Readonly<CardReadout> | null }>) {
  return (
    <p className="wgi-record-readout" aria-live="polite">
      {readout === null ? null : (
        <>
          <span className="wgi-record-readout-label">{readout.label}</span>
          <span className="wgi-record-readout-value" data-missing={readout.missing || undefined}>
            {readout.value}
          </span>
        </>
      )}
    </p>
  );
}

/* The month and strip for everything but a linked booking: the day and,
   for a booking, the time Save records. No day to pick — nothing chosen
   yet, No call, or a close — leaves the calendar in place but quiet, and
   shows no day, so a day that is not a plan never reads as one. */
function DayMain({
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
  const idle = !needsDay(draft.answer, draft.followUp);
  return (
    <div className="wgi-record-main">
      <div className="wgi-record-cal" data-idle={idle || undefined}>
        <HomeDayCalendar
          day={idle ? "" : draft.day}
          min={today}
          max={practiceLocalDay(dayHorizon(draft.answer))}
          disabled={locked || idle}
          onChange={(day) => {
            dispatch({ type: "day", day });
          }}
        />
      </div>
      {/* One strip tall in every state, so the card never jumps. */}
      <div className="wgi-record-strip">
        <StripControl
          draft={draft}
          options={followUpsFor(draft.answer)}
          locked={locked}
          dispatch={dispatch}
        />
        <StripReadout readout={cardReadoutFor(draft, today)} />
      </div>
    </div>
  );
}

/* One footer spans both columns: the way into the full record, and the
   card's commit — Save, or Book for a linked booking. */
function RecordFoot({
  fullOpen,
  onOpenFull,
  children,
}: Readonly<{ fullOpen: boolean; onOpenFull: (instant: boolean) => void; children: ReactNode }>) {
  return (
    <div className="wgi-record-foot">
      <button
        type="button"
        className="wgi-record-full"
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
      {children}
    </div>
  );
}

function SaveButton({
  pending,
  disabled,
  onSave,
}: Readonly<{ pending: boolean; disabled: boolean; onSave: () => void }>) {
  return (
    <button type="button" className="wgi-record-save" disabled={disabled} onClick={onSave}>
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

export function RecordCard({
  line,
  fullOpen,
  dragHandleProps,
  onClose,
  onOpenFull,
  onSettled,
}: Readonly<{
  line: Readonly<HomeLine>;
  /** This record's full-record sheet is open beside the card. */
  fullOpen: boolean;
  /** The head's grab surface, from use-card-detach.ts. */
  dragHandleProps: Pick<ComponentProps<"div">, "onPointerDown">;
  onClose: () => void;
  /** Toggles the full record — opens it, or hides it when it already shows
      this record. `instant` when the press came from the keyboard: the
      sheet then opens or closes without motion. */
  onOpenFull: (instant: boolean) => void;
  onSettled: (id: string) => void;
}>) {
  /* Practice-local today, read once per render so the bounds, the horizon
     check and the calendar agree even across midnight. */
  const today = practiceLocalDay(0);
  const [draft, dispatch] = useReducer(cardReducer, INITIAL_DRAFT);
  const commit = useRecordCommit(line, () => {
    onSettled(line.id);
    onClose();
  });
  const answer = draft.answer;

  /* A request linked to a patient books straight into the schedule
     (issue #344): its month shows the open starts, and Book replaces Save.
     An unlinked request keeps the day and time Save hands to scheduling. */
  const booking = line.patientId !== null && needsTime(answer);
  const plan = useRecordBooking(line, {
    active: booking,
    today,
    onBooked: () => {
      onSettled(line.id);
      onClose();
    },
  });

  const note = cardNoteFor(line.status);
  const mode = note !== null ? "note" : booking ? "book" : "save";
  const locked = commit.pending || commit.failure?.uncertain === true || plan.book.pending;
  const command = commandFor(draft, today);

  const outcomeId = useId();

  return (
    <>
      <div className="wgi-record-side" inert={plan.book.pending || undefined}>
        <div className="wgi-record-head" {...dragHandleProps}>
          <p className="wgi-record-name" data-ui-redact="patient-name">
            {line.name}
          </p>
          {/* Where the line stands, as the list says it — its badge, scaled
              to the head — then when it is due, in words. */}
          <p className="wgi-record-queue">
            <LineStatusBadge status={line.status} className="wgi-record-badge" />
            <span data-overdue={line.stamp === null ? undefined : true}>{line.timing}</span>
          </p>
          <p className="wgi-record-pref">{prefersText(line.pref)}</p>
          {/* The card's own close, at the head's right like the sheet's: an
              outside press also closes the popover, but not the panel it
              becomes once dragged, and a pointer should not have to guess. */}
          <button
            type="button"
            className="wgi-record-close"
            aria-label="Close record card"
            onClick={onClose}
          >
            <CloseGlyph size={16} />
          </button>
        </div>
        <a href={line.tel} className="wgi-record-call" data-ui-redact="patient-contact">
          <PhoneGlyph size={15} />
          {line.phoneDisplay}
        </a>

        {note === null ? (
          <>
            <p id={outcomeId} className="wgi-record-label">
              Outcome
            </p>
            <AnswerRows
              labelId={outcomeId}
              rows={cardRowsFor(line.status)}
              answer={answer}
              locked={locked}
              onPick={(picked) => {
                commit.clearFailure();
                dispatch({ type: "answer", answer: picked, today });
              }}
            />
          </>
        ) : (
          <p className="wgi-record-note">{note}</p>
        )}
      </div>

      {mode === "book" ? (
        <RecordBookingMain
          booking={plan}
          today={today}
          last={practiceLocalDay(dayHorizon(answer))}
          locked={locked}
        />
      ) : mode === "save" ? (
        <DayMain draft={draft} today={today} locked={locked} dispatch={dispatch} />
      ) : null}

      <RecordFoot fullOpen={fullOpen} onOpenFull={onOpenFull}>
        {mode === "book" ? <BookButton booking={plan} locked={locked} /> : null}
        {mode === "save" ? (
          <SaveButton
            pending={commit.pending}
            disabled={locked || command === null}
            onSave={() => {
              if (command !== null) commit.save(command);
            }}
          />
        ) : null}
      </RecordFoot>
    </>
  );
}
