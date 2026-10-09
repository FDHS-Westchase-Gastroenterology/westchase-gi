import { startTransition, useEffect, useState } from "react";

import type { RequestLocation } from "@/lib/portal/contracts";
import type { MonthAvailability } from "@/lib/portal/scheduling/read-contracts";

import { readCardMonth } from "./booking-actions";
import type { CardType } from "./card-booking-model";

/* The card's read of one booking month (issue #344): the open starts the
   discs are drawn from. It follows the month on screen, the visit type and
   an explicit re-read (Try again, or a start lost to someone else); a read
   that lands after the card moved on is dropped. Until staff pick a type
   the server picks the default, and that choice sticks for later months.
   A read of the same month and type stays on screen while the next one is
   in flight; any other read is not shown, because its discs would say
   something about a month or a visit length staff are no longer asking
   about. */

export type CardMonthStatus = "loading" | "ready" | "failed";

export interface CardMonth {
  readonly status: CardMonthStatus;
  /** The active visit types, from the latest read that produced them. */
  readonly types: readonly CardType[];
  /** The type on screen: staff's pick, else the server's default. */
  readonly typeId: string | null;
  /** The read for the month and type on screen, or null while there is none. */
  readonly availability: MonthAvailability | null;
  /** The latest read for the type on screen, whatever its month: who can be
     booked and the type's version, so a squeeze-in still books while the
     month on screen is loading or failed to load. */
  readonly roster: MonthAvailability | null;
  readonly reread: () => void;
}

interface Landed {
  readonly key: string;
  readonly ok: boolean;
}

interface Read {
  readonly types: readonly CardType[];
  readonly availability: MonthAvailability;
}

export function useCardMonth(
  input: Readonly<{
    month: string;
    /** Staff's pick, or null to let the server choose. */
    typeId: string | null;
    location: RequestLocation;
    /** The card is booking: read the month. */
    active: boolean;
    /** The patient being booked, or null for a requester not registered yet. */
    patientId: string | null;
  }>,
): CardMonth {
  const { month, typeId, location, active, patientId } = input;
  const [landed, setLanded] = useState<Landed | null>(null);
  const [read, setRead] = useState<Read | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = `${month}|${typeId ?? ""}|${String(attempt)}`;

  useEffect(() => {
    if (!active) return undefined;
    let live = true;
    startTransition(async () => {
      try {
        // react-doctor-disable-next-line react-doctor/async-defer-await -- the guard below is the staleness check, not a hoistable precondition: `live` is falsified only by this effect's cleanup, which runs while the read is in flight
        const outcome = await readCardMonth({
          month,
          appointmentTypeId: typeId,
          location,
          patientId,
        });
        if (!live) return;
        if (outcome.ok) setRead({ types: outcome.types, availability: outcome.availability });
        setLanded({ key, ok: outcome.ok });
      } catch {
        if (live) setLanded({ key, ok: false });
      }
    });
    return () => {
      live = false;
    };
  }, [key, month, typeId, location, active, patientId]);

  const shownType = typeId ?? read?.availability.appointmentType.id ?? null;
  const availability =
    read?.availability.month === month && read.availability.appointmentType.id === shownType
      ? read.availability
      : null;
  const roster = read?.availability.appointmentType.id === shownType ? read.availability : null;
  const current = landed?.key === key ? landed : null;
  return {
    status: current === null ? "loading" : current.ok ? "ready" : "failed",
    types: read?.types ?? [],
    typeId: shownType,
    availability,
    roster,
    reread: () => {
      setAttempt((count) => count + 1);
    },
  };
}
