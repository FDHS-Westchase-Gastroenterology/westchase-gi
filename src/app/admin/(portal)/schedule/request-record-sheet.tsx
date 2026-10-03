"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { RequestSheetHead } from "@/app/admin/(portal)/(home)/full-record-sheet";
import { LatestNoteBlock, MessageQuote } from "@/app/admin/(portal)/(home)/full-record-sheet-body";
import type { HomeLine } from "@/app/admin/(portal)/(home)/home-line";
import { RecordCard } from "@/app/admin/(portal)/(home)/record-card";
import type { CardAnswer } from "@/app/admin/(portal)/(home)/record-card-model";
import { RecordSheetFrame } from "@/app/admin/(portal)/(home)/record-sheet-frame";
import { useRecordRead } from "@/app/admin/(portal)/(home)/use-record-read";
import type { ReadOutcome, RecordSections } from "@/app/admin/(portal)/requests/record-sections";
import { recordSections } from "@/app/admin/(portal)/requests/record-sections";
import { Calendar, ChevronRight, Plus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent } from "@/components/ui/popover";
import type { FullRecord } from "@/lib/portal/request-record/contracts";

import { cameToUs, notBookedText } from "./patient-record-model";
import { RecordNoteComposer } from "./record-note-composer";

/* The Schedule's record of a person known only by a request (issue #356;
   Figma Ypf9ohpRcGWF5C9T9bSvWW, section 13, P3): the patient record's
   sheet without its tabs, led by "Not booked yet". The header is Home's
   request header: the name and the close, where the request stands, how
   many calls it has taken, the phone chip beside the email. The body says
   the appointment is not booked and where and when they would like it,
   the latest note, and their request — where it came from, its history,
   and their own words.

   Book appointment is the primary action. It opens Home's record card
   beside the sheet already answered "Appointment scheduled", so the
   card's month (#344) is up with the request's office filled in; Log a
   call opens the same card on its outcomes. Booking registers the
   requester as a patient on the server as it lands and moves the request
   to booked, as booking from Home does; cancelling creates nothing. The
   card is a popover over the sheet's foot, on the popover recipe's motion
   (ui/popover.tsx), or at once from the keyboard. The sheet's own motion
   is the frame's. */

export function RequestRecordSheet({
  line,
  instant,
  onOpenChange,
  onClosed,
  onChanged,
  returnFocus,
}: Readonly<{
  /** The request the address names; null closes the sheet. */
  line: Readonly<HomeLine> | null;
  instant: boolean;
  onOpenChange: (open: boolean) => void;
  onClosed: () => void;
  /** The card saved or booked: the line has moved on and is read again. */
  onChanged: (id: string) => void;
  returnFocus: () => HTMLElement | null;
}>) {
  /* The line stays rendered while the sheet leaves, so its exit plays on
     the record it showed. */
  const [shown, setShown] = useState(line);
  if (line !== null && line !== shown) setShown(line);

  const shownId = shown?.id ?? null;
  const read = useRecordRead(line, shownId);
  const { outcome, record } = read;
  const sections = useMemo(() => (record === null ? null : recordSections(record)), [record]);

  return (
    <RecordSheetFrame
      open={line !== null}
      contentKey={shownId}
      instant={instant}
      onOpenChange={onOpenChange}
      onExited={() => {
        setShown(null);
        read.release();
        onClosed();
      }}
      finalFocus={returnFocus}
    >
      {shown === null ? null : (
        <>
          <RequestSheetHead
            line={shown}
            record={record}
            sections={sections}
            loading={outcome === null}
            pref={false}
          />
          <div className="wgi-sheet-body">
            <section className="wgi-sheet-section" aria-labelledby="wgi-sheet-visits-label">
              <h3 id="wgi-sheet-visits-label" className="wgi-sheet-label">
                Appointments
              </h3>
              <p className="wgi-sheet-unbooked">
                <Calendar aria-hidden="true" />
                {notBookedText(shown.pref)}
              </p>
            </section>
            <RequestRecordBody
              outcome={outcome}
              record={record}
              sections={sections}
              onRetry={read.retry}
            />
          </div>
          <RequestRecordFoot
            key={shown.id}
            line={shown}
            onChanged={onChanged}
            onNoted={read.refresh}
          />
        </>
      )}
    </RecordSheetFrame>
  );
}

/* What the read produced: a skeleton while it is in flight, a state when
   the request is gone or could not be read, otherwise the latest note and
   their request. */
type RequestRecordBodyProps = Readonly<{
  /** Null while the read is in flight. */
  outcome: ReadOutcome | null;
  record: FullRecord | null;
  sections: RecordSections | null;
  onRetry: () => void;
}>;

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the request record carries workflow history entries whose types cannot be made readonly
function RequestRecordBody({ outcome, record, sections, onRetry }: RequestRecordBodyProps) {
  if (outcome === null) {
    return (
      <div className="wgi-sheet-skeleton" role="status">
        <span className="sr-only">Loading the request</span>
        <i data-stands-for="section-title" />
        <i data-stands-for="detail-row" />
        <i data-stands-for="detail-value" />
      </div>
    );
  }
  if (record === null || sections === null) {
    const gone = outcome.kind === "gone";
    return (
      <div className="wgi-sheet-state" role="alert">
        <p className="wgi-sheet-state-title">
          {gone ? "This request no longer exists." : "The request could not be loaded."}
        </p>
        {gone ? null : (
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    );
  }
  const message = record.message?.trim() ?? "";
  return (
    <>
      {sections.latestNote === null ? null : <LatestNoteBlock note={sections.latestNote} />}
      <section className="wgi-sheet-section" aria-labelledby="wgi-sheet-origin-label">
        <h3 id="wgi-sheet-origin-label" className="wgi-sheet-label">
          Their request
        </h3>
        <p className="wgi-sheet-origin">
          <span>{cameToUs(record)}</span>
          <Link href={`/admin/requests/${record.id}`} className="wgi-sheet-history-link">
            History · {sections.rowCount}
            <ChevronRight aria-hidden="true" />
          </Link>
        </p>
        {message === "" ? null : <MessageQuote message={message} />}
      </section>
    </>
  );
}

type CardOpening = Readonly<{
  answer: CardAnswer | null;
  /** Opened from the keyboard: the card appears at once. */
  keyed: boolean;
  /** The button that opened it, where focus goes back on close. */
  from: HTMLButtonElement;
}>;

/* The foot: Book appointment, then Add a note and Log a call. Book and
   Log a call open the record card over the foot, beside the sheet. */
function RequestRecordFoot({
  line,
  onChanged,
  onNoted,
}: Readonly<{
  line: Readonly<HomeLine>;
  onChanged: (id: string) => void;
  onNoted: () => void;
}>) {
  const foot = useRef<HTMLElement>(null);
  const [card, setCard] = useState<CardOpening | null>(null);
  /* The opening stays while the card leaves, so its exit plays on the
     card it showed. */
  const [shownCard, setShownCard] = useState(card);
  if (card !== null && card !== shownCard) setShownCard(card);

  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- a DOM element carries platform member types that cannot be made readonly
  function open(answer: CardAnswer | null, button: HTMLButtonElement, keyed: boolean): void {
    setCard({ answer, keyed, from: button });
  }

  return (
    <footer ref={foot} className="wgi-sheet-foot">
      <Button
        type="button"
        className="wgi-sheet-foot-command"
        onClick={(event) => {
          open("booked", event.currentTarget, event.detail === 0);
        }}
      >
        <Plus data-icon="inline-start" aria-hidden="true" />
        Book appointment
      </Button>
      <RecordNoteComposer requestId={line.id} onAdded={onNoted} />
      <Button
        type="button"
        variant="outline"
        className="wgi-sheet-foot-command"
        onClick={(event) => {
          open(null, event.currentTarget, event.detail === 0);
        }}
      >
        Log a call
      </Button>
      <Popover
        open={card !== null}
        onOpenChange={(next, details) => {
          if (next) return;
          /* A press on the foot is its own buttons choosing the card. */
          const { event } = details;
          if (
            details.reason === "outside-press" &&
            event.target instanceof Element &&
            foot.current?.contains(event.target) === true
          ) {
            details.cancel();
            return;
          }
          /* Escape returns focus the way the card's close does. */
          if (details.reason === "escape-key") card?.from.focus({ preventScroll: true });
          setCard(null);
        }}
        onOpenChangeComplete={(next) => {
          if (!next) setShownCard(null);
        }}
      >
        {shownCard === null ? null : (
          <PopoverContent
            className="wgi-record-card wgi-sheet-card"
            paint="card"
            anchor={foot}
            side="left"
            align="end"
            sideOffset={12}
            motion={shownCard.keyed ? "none" : "wgi"}
            finalFocus={() => shownCard.from}
          >
            <RecordCard
              /* Each opening starts the card on its own answer. */
              key={`${shownCard.answer ?? "call"}:${line.version}`}
              line={line}
              answer={shownCard.answer}
              booksRequester
              onClose={() => {
                /* The card's own close hands focus back to the button that
                   opened it before the card leaves: once Book and Log a call
                   have traded places, the popover's own return loses it. */
                shownCard.from.focus({ preventScroll: true });
                setCard(null);
              }}
              onSettled={onChanged}
            />
          </PopoverContent>
        )}
      </Popover>
    </footer>
  );
}
