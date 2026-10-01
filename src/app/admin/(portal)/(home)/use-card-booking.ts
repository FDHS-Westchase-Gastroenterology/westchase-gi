import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { followed, SETTLED_TOAST } from "@/app/admin/(portal)/toast-follow";

import { bookFromCard } from "./booking-actions";
import type { CardBookOutcome } from "./booking-actions";
import { startWasTaken } from "./card-booking-model";
import type { CardBookCommand } from "./card-booking-model";
import type { HomeLine } from "./home-line";

/* Book from the record card (issue #344, Figma section 09e). The toast
   follows the attempt the way Save's does — "Booking…", then the scheduled
   line — and closes the card on success. A refusal stays on the card: a
   start somebody else took is `taken`, which re-reads the month and offers
   the nearest open start under a new idempotency key; anything else, the
   transport included, is `failed`, and Try again re-sends the same command
   under the same key, so a booking that did land is not made twice. */

export type CardBookingFailure = "taken" | "failed";

const BOOK_TOAST_TEST_ID = "home-book-toast";

function booked(result: CardBookOutcome): result is { readonly ok: true } {
  return result.ok;
}

export function useCardBooking(
  line: Readonly<HomeLine>,
  handlers: Readonly<{ onBooked: () => void; onTaken: () => void }>,
) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failure, setFailure] = useState<CardBookingFailure | null>(null);
  const keyRef = useRef<string | null>(null);
  const lastCommand = useRef<CardBookCommand | null>(null);

  function book(command: Readonly<CardBookCommand>) {
    if (pending) return;
    keyRef.current ??= crypto.randomUUID();
    const idempotencyKey = keyRef.current;
    lastCommand.current = command;
    setFailure(null);
    const attempt = bookFromCard({ idempotencyKey, command });
    /* No error branch: the card says what went wrong beside Book, and the
       working toast goes when the attempt does. */
    toast.promise(followed(attempt, booked), {
      id: `${BOOK_TOAST_TEST_ID}:${idempotencyKey}`,
      testId: BOOK_TOAST_TEST_ID,
      ...SETTLED_TOAST,
      loading: "Booking…",
      success: { message: `${line.name} is Scheduled.`, ...SETTLED_TOAST },
    });

    startTransition(async () => {
      let outcome: CardBookOutcome;
      try {
        outcome = await attempt;
      } catch {
        setFailure("failed");
        return;
      }
      if (!outcome.ok) {
        if (startWasTaken(outcome.code)) {
          keyRef.current = null;
          setFailure("taken");
          handlers.onTaken();
          return;
        }
        setFailure("failed");
        return;
      }
      keyRef.current = null;
      handlers.onBooked();
      router.refresh();
    });
  }

  return {
    pending,
    failure,
    book,
    /** Try again: the same command under the same key. */
    retry: () => {
      if (lastCommand.current !== null) book(lastCommand.current);
    },
    /** A new pick is a new attempt. */
    reset: () => {
      keyRef.current = null;
      setFailure(null);
    },
  };
}
