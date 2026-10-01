import { useReducer } from "react";

import {
  addMonths,
  bookCommandFor,
  bookingReducer,
  bookingStripLine,
  initialBooking,
} from "./card-booking-model";
import type { BookingEvent, StripAction } from "./card-booking-model";
import type { HomeLine } from "./home-line";
import { useDayPopover } from "./parts/booking-day-popover";
import { useCardBooking } from "./use-card-booking";
import { useCardMonth } from "./use-card-month";

/* The record card's booking (issue #344): a request linked to a patient
   books straight into the schedule. This holds what the card's booking
   month, strip and Book share — the draft, the month read, the day
   popover's handle and the Book attempt — and reads the month only while
   the card is booking. */

export function useRecordBooking(
  line: Readonly<HomeLine>,
  options: Readonly<{
    /** The card is booking a linked patient: read the month. */
    active: boolean;
    /** Practice-local today. */
    today: string;
    onBooked: () => void;
  }>,
) {
  const { patientId } = line;
  const [draft, dispatch] = useReducer(bookingReducer, options.today, initialBooking);
  const month = useCardMonth({
    month: draft.month,
    typeId: draft.typeId,
    location: line.location,
    patientId: options.active ? patientId : null,
  });
  const popover = useDayPopover();
  const book = useCardBooking(line, {
    onBooked: options.onBooked,
    onTaken: () => {
      /* The start went to someone else: strike it, re-read, and put the
         day's popover back up with the nearest open start. */
      const lostDay = draft.day;
      dispatch({ type: "taken" });
      month.reread();
      popover.openNow(lostDay);
    },
  });

  const command =
    patientId === null
      ? null
      : bookCommandFor({ ...draft, typeId: month.typeId }, month.availability, {
          id: line.id,
          version: line.version,
          patientId,
        });

  return {
    draft,
    month,
    popover,
    book,
    command,
    strip: bookingStripLine({
      draft,
      availability: month.availability,
      status: month.status,
      bookFailed: book.failure === "failed",
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
      else if (action === "retry-read") month.reread();
      else dispatch({ type: "month", month: addMonths(draft.month, 1) });
    },
  };
}

export type RecordBooking = ReturnType<typeof useRecordBooking>;
