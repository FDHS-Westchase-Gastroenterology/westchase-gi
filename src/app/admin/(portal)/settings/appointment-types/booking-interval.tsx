"use client";

import { useState } from "react";

import type { SettingsSend } from "@/app/admin/(portal)/settings/use-settings-command";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { SegmentedControlOption } from "@/components/ui/segmented-control";
import { BOOKING_INTERVALS } from "@/lib/portal/scheduling/settings-contracts";
import type {
  BookingInterval,
  SchedulingSettings,
} from "@/lib/portal/scheduling/settings-contracts";

/* The practice's booking interval: how often the Schedule offers each
   provider an opening, one an hour unless an admin chooses a finer grid. A
   type longer than the interval keeps its full length, and booked
   appointments never move. Staff read it; admins change it, applied as it
   is chosen and confirmed in the Undo toast. */

const LABELS = {
  15: "15 min",
  30: "30 min",
  60: "1 hour",
} as const satisfies Record<BookingInterval, string>;

const OPTIONS: readonly SegmentedControlOption<`${BookingInterval}`>[] = BOOKING_INTERVALS.map(
  (minutes) => ({ value: `${minutes}`, label: LABELS[minutes] }),
);

function spoken(minutes: BookingInterval): string {
  return minutes === 60 ? "every hour" : `every ${String(minutes)} minutes`;
}

function intervalOf(value: string): BookingInterval {
  return BOOKING_INTERVALS.find((minutes) => `${minutes}` === value) ?? 60;
}

export function BookingIntervalBand({
  practice,
  canEdit,
  send,
}: Readonly<{
  practice: SchedulingSettings["practice"];
  canEdit: boolean;
  send: SettingsSend;
}>) {
  /* The control shows the choice at once; the server's answer replaces it
     when the practice's version moves on. */
  const [seenVersion, setSeenVersion] = useState(practice.version);
  const [minutes, setMinutes] = useState(practice.bookingIntervalMinutes);
  if (seenVersion !== practice.version) {
    setSeenVersion(practice.version);
    setMinutes(practice.bookingIntervalMinutes);
  }

  function choose(next: BookingInterval) {
    if (next === minutes) return;
    const previous = minutes;
    setMinutes(next);
    const command = {
      kind: "set_booking_interval",
      id: practice.id,
      expectedVersion: practice.version,
    } as const;
    void send(
      { ...command, minutes: next },
      {
        undo: {
          headline: `Openings ${spoken(next)}`,
          detail: "Booked appointments keep their times.",
          inverse: { ...command, minutes: previous },
          slot: "booking-interval",
        },
      },
    ).then((outcome) => {
      if (!outcome.ok) setMinutes(practice.bookingIntervalMinutes);
    });
  }

  return (
    <section aria-labelledby="booking-interval-title" className="settings-interval">
      <div className="min-w-0">
        <h2 id="booking-interval-title" className="settings-section-title">
          Booking interval
        </h2>
        <p
          id="booking-interval-line"
          className="text-[0.8125rem] leading-[1.125rem] text-(--wgi-muted-ink)"
        >
          The schedule offers each provider one opening {spoken(minutes)}. A longer visit keeps its
          full length.
        </p>
      </div>
      <SegmentedControl<`${BookingInterval}`>
        aria-labelledby="booking-interval-title"
        aria-describedby="booking-interval-line"
        options={OPTIONS}
        value={`${minutes}`}
        disabled={!canEdit}
        className="settings-interval-switch"
        onValueChange={(value) => {
          choose(intervalOf(value));
        }}
      />
    </section>
  );
}
