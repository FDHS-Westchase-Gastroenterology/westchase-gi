"use client";

import { useRef, useState } from "react";

import { CloseGlyph, PhoneGlyph } from "@/app/admin/(portal)/(home)/parts/glyphs";
import { BookButton, RecordBookingMain } from "@/app/admin/(portal)/(home)/parts/record-booking";
import { dayHorizon } from "@/app/admin/(portal)/(home)/record-card-model";
import { phoneParts } from "@/app/admin/(portal)/(home)/record-contact";
import { useRecordBooking } from "@/app/admin/(portal)/(home)/use-record-booking";
import { practiceLocalDay } from "@/app/admin/(portal)/requests/appointment-input";
import { Plus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent } from "@/components/ui/popover";

import { RecordNoteComposer } from "./record-note-composer";
import type { SchedulePatientRecord } from "./week-actions";

/* The patient record's foot (issue #356; Figma Ypf9ohpRcGWF5C9T9bSvWW,
   section 13, P2): Book another, then Add a note when a request is linked.
   Book another opens #344's booking month in the record card's frame,
   beside the sheet, as the request record's Book appointment does: the
   name and the call on the left, the month with its open starts, the strip
   that says what Book sends, and Book. The month opens on the office their
   request asked for, or every office when there is none. Book sends the
   patient with no request behind it, the way the Schedule's open time
   books a known patient; the request they came in with stays as it is.

   The card is a popover over the sheet's foot, on the popover recipe's
   motion (ui/popover.tsx), or at once from the keyboard. Its close and
   Escape hand focus back to Book another. */

export function PatientRecordFoot({
  record,
  onChanged,
}: Readonly<{
  record: SchedulePatientRecord;
  /** The record changed underneath: a note or a visit. Read it again. */
  onChanged: () => void;
}>) {
  const foot = useRef<HTMLElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  /* Null while closed; otherwise whether the keyboard opened it. */
  const [keyed, setKeyed] = useState<boolean | null>(null);
  /* The opening stays while the card leaves, so its exit plays on it. */
  const [shownKeyed, setShownKeyed] = useState(keyed);
  if (keyed !== null && keyed !== shownKeyed) setShownKeyed(keyed);
  const { requestLine } = record;

  function close(): void {
    button.current?.focus({ preventScroll: true });
    setKeyed(null);
  }

  return (
    <footer ref={foot} className="wgi-sheet-foot">
      <Button
        ref={button}
        type="button"
        variant="outline"
        className="wgi-sheet-foot-command"
        aria-expanded={keyed !== null}
        onClick={(event) => {
          setKeyed(event.detail === 0);
        }}
      >
        <Plus data-icon="inline-start" aria-hidden="true" />
        Book another
      </Button>
      {requestLine === null ? null : (
        <RecordNoteComposer requestId={requestLine.id} onAdded={onChanged} />
      )}
      <Popover
        open={keyed !== null}
        onOpenChange={(next, details) => {
          if (next) return;
          if (details.reason === "escape-key") {
            close();
            return;
          }
          setKeyed(null);
        }}
        onOpenChangeComplete={(next) => {
          if (!next) setShownKeyed(null);
        }}
      >
        {shownKeyed === null ? null : (
          <PopoverContent
            className="wgi-record-card wgi-sheet-card"
            paint="card"
            anchor={foot}
            side="left"
            align="end"
            sideOffset={12}
            motion={shownKeyed ? "none" : "wgi"}
            finalFocus={button}
          >
            <PatientBookingCard
              record={record}
              onClose={close}
              onBooked={() => {
                onChanged();
                close();
              }}
            />
          </PopoverContent>
        )}
      </Popover>
    </footer>
  );
}

function PatientBookingCard({
  record,
  onClose,
  onBooked,
}: Readonly<{
  record: SchedulePatientRecord;
  onClose: () => void;
  onBooked: () => void;
}>) {
  const { patient, requestLine } = record;
  /* Practice-local today, read once per render so the bounds and the
     calendar agree even across midnight. */
  const today = practiceLocalDay(0);
  const plan = useRecordBooking(
    {
      name: patient.name,
      location: requestLine?.location ?? "any",
      patientId: patient.id,
      request: null,
    },
    { active: true, today, onBooked },
  );
  const locked = plan.book.pending;
  const phone = phoneParts(patient.phone);

  return (
    <>
      <div className="wgi-record-side" inert={locked || undefined}>
        <div className="wgi-record-head">
          <p className="wgi-record-name" data-ui-redact="patient-name">
            {patient.name}
          </p>
          <p className="wgi-record-pref">Another visit</p>
          <button
            type="button"
            className="wgi-record-close"
            aria-label="Close booking card"
            onClick={onClose}
          >
            <CloseGlyph size={16} />
          </button>
        </div>
        {phone.tel === null ? null : (
          <a href={phone.tel} className="wgi-record-call" data-ui-redact="patient-contact">
            <PhoneGlyph size={15} />
            {phone.phoneDisplay}
          </a>
        )}
      </div>
      <RecordBookingMain
        booking={plan}
        today={today}
        last={practiceLocalDay(dayHorizon("booked"))}
        locked={locked}
      />
      <div className="wgi-record-foot">
        <BookButton booking={plan} locked={locked} />
      </div>
    </>
  );
}
