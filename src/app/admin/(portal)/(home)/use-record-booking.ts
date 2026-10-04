import { useEffect, useReducer, useRef } from "react";

import type { RequestLocation } from "@/lib/portal/contracts";

import {
  addMonths,
  bookCommandFor,
  bookingReducer,
  bookingStripLine,
  initialBooking,
} from "./card-booking-model";
import type { BookingEvent, BookingSubject, StripAction } from "./card-booking-model";
import { useDayPopover } from "./parts/booking-day-popover";
import { useCardBooking } from "./use-card-booking";
import { useCardMonth } from "./use-card-month";

/* The record card's booking (issue #344): a request linked to a patient
   books straight into the schedule. Home and the Schedule's request record
   also book a requester no patient is linked to yet; the server
   registers them from the request as Book lands (booking-actions.ts). Its
   patient record books a patient another visit with no request at all.
   This holds what the card's booking
   month, strip and Book share — the draft, the month read, the day
   popover's handle and the Book attempt — and reads the month only while
   the card is booking. */

export function useRecordBooking(
  subject: Readonly<
    BookingSubject & {
      /** Who the toast names. */
      name: string;
      /** The office the month opens on. */
      location: RequestLocation;
    }
  >,
  options: Readonly<{
    /** The card is booking an appointment: read the month. */
    active: boolean;
    /** Practice-local today. */
    today: string;
    onBooked: () => void;
  }>,
) {
  const { patientId } = subject;
  const [draft, dispatch] = useReducer(bookingReducer, options.today, initialBooking);
  const month = useCardMonth({
    month: draft.month,
    typeId: draft.typeId,
    location: subject.location,
    active: options.active,
    patientId,
  });
  const popover = useDayPopover();
  /* The day whose popover goes back up once Book lets go of the card. */
  const reopen = useRef<string | null>(null);
  const book = useCardBooking(subject.name, {
    onBooked: options.onBooked,
    onTaken: () => {
      /* The start went to someone else: strike it, re-read, and put the
         day's popover back up with the nearest open start. */
      reopen.current = draft.day;
      dispatch({ type: "taken" });
      month.reread();
    },
  });
  /* While Book is pending the card is locked and its days are not popover
     triggers, so the lost day's popover opens when the attempt settles. */
  useEffect(() => {
    if (book.pending || reopen.current === null) return;
    const day = reopen.current;
    reopen.current = null;
    popover.openNow(day);
  }, [book.pending, popover]);

  /* The month's read, or while it loads or failed, the last read of the
     type: a squeeze-in names its provider and time itself (issue #344:
     the disc is a hint, never a gate). */
  const known = month.availability ?? month.roster;
  const command = bookCommandFor({ ...draft, typeId: month.typeId }, known, subject);

  return {
    draft,
    month,
    popover,
    book,
    command,
    strip: bookingStripLine({
      draft,
      availability: month.availability,
      roster: known,
      status: month.status,
      bookFailed: book.failure === "failed",
      refusal: book.failure === "refused" ? book.refusal : null,
    }),
    /** A new pick is a new attempt: a failed Book's key goes with it. */
    pick: (event: Readonly<BookingEvent>) => {
      book.reset();
      dispatch(event);
    },
    showMonth: (next: string) => {
      dispatch({ type: "month", month: next });
    },
    onStripAction: (action: StripAction) => {
      if (action === "retry-book") book.retry();
      else if (action === "reload") {
        book.reload();
        month.reread();
      } else if (action === "retry-read") month.reread();
      else dispatch({ type: "month", month: addMonths(draft.month, 1) });
    },
  };
}

export type RecordBooking = ReturnType<typeof useRecordBooking>;
