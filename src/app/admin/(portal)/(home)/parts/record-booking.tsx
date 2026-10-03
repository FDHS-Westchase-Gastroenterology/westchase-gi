"use client";

import { Loader2Icon } from "lucide-react";

import type { RecordBooking } from "@/app/admin/(portal)/(home)/use-record-booking";

import { BookingCalendar } from "./booking-calendar";
import { BookingStrip } from "./booking-strip";

/* The record card's main column and commit while it books a linked patient
   (issue #344; Figma 09d–09f): the booking month with its open-time discs,
   the strip that says what Book sends, and Book itself. */

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the booking carries Base UI handles and callbacks that cannot be made readonly
export function RecordBookingMain({
  booking,
  today,
  last,
  locked,
}: Readonly<{
  booking: RecordBooking;
  today: string;
  /** The last bookable day, practice-local. */
  last: string;
  locked: boolean;
}>) {
  const { draft, month, popover, pick } = booking;
  return (
    <div
      className="wgi-record-main"
      data-tour="home-card-booking"
      inert={booking.book.pending || undefined}
    >
      <div className="wgi-record-cal">
        <BookingCalendar
          month={draft.month}
          day={draft.day}
          today={today}
          last={last}
          availability={month.availability}
          status={month.status}
          taken={draft.taken}
          locked={locked}
          popover={popover}
          onMonth={booking.showMonth}
          onDay={(day) => {
            pick({ type: "day", day });
          }}
          actions={{
            onPickOpen: (start) => {
              pick({ type: "open", ...start });
            },
            onSqueeze: (day) => {
              pick({ type: "squeeze", day });
            },
          }}
        />
      </div>
      <BookingStrip
        types={month.types}
        typeId={month.typeId}
        draft={draft}
        availability={month.availability}
        line={booking.strip}
        locked={locked}
        onType={(typeId) => {
          pick({ type: "typeId", typeId });
        }}
        onAction={booking.onStripAction}
        onSqueezeProvider={(providerId, locationId) => {
          pick({ type: "squeezeProvider", providerId, locationId });
        }}
        onSqueezeTime={(time) => {
          pick({ type: "squeezeTime", time });
        }}
      />
    </div>
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the booking carries Base UI handles and callbacks that cannot be made readonly
export function BookButton({
  booking,
  locked,
}: Readonly<{ booking: RecordBooking; locked: boolean }>) {
  const { book, command } = booking;
  return (
    <button
      type="button"
      className="wgi-record-save"
      data-tour="home-card-booking"
      disabled={locked || command === null}
      onClick={() => {
        if (command !== null) book.book(command);
      }}
    >
      {book.pending ? (
        <>
          <Loader2Icon data-icon="inline-start" className="animate-spin" aria-hidden="true" />
          Booking…
        </>
      ) : (
        "Book"
      )}
    </button>
  );
}
