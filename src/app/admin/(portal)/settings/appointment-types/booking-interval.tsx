"use client";

import { useState } from "react";

import type { SettingsSend } from "@/app/admin/(portal)/settings/use-settings-command";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { SegmentedControlOption } from "@/components/ui/segmented-control";
import { clockMarks, intervalEvery } from "@/lib/portal/scheduling/booking-interval";
import type { SchedulingSettings } from "@/lib/portal/scheduling/settings-contracts";

/* The practice clock: the marks an opening may start on, counted from
   midnight. On the hour unless an admin picks the half or quarter hour;
   the choice saves at once and the Undo toast confirms it. A visit that
   runs past a mark pushes its provider's next opening to the mark after
   it, a type longer than the interval keeps its full length, and booked
   appointments never move. Staff read it. A value set before the clock
   (90 minutes, say) shows as its own choice until an admin picks another. */

const CLOCK_CHOICES = [60, 30, 15] as const;

const CHOICE_LABEL = {
  60: "On the hour",
  30: "Half hour",
  15: "Quarter hour",
} as const satisfies Record<(typeof CLOCK_CHOICES)[number], string>;

function optionsFor(saved: number): SegmentedControlOption<string>[] {
  const options: SegmentedControlOption<string>[] = CLOCK_CHOICES.map((minutes) => ({
    value: String(minutes),
    label: CHOICE_LABEL[minutes],
  }));
  if (!CLOCK_CHOICES.some((minutes) => minutes === saved))
    options.push({ value: String(saved), label: `Every ${String(saved)} min` });
  return options;
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
  /* The choice moves at once; the server's answer replaces it when the
     practice's version moves on, or puts it back when the save fails. */
  const [seenVersion, setSeenVersion] = useState(practice.version);
  const [saved, setSaved] = useState(practice.bookingIntervalMinutes);
  if (seenVersion !== practice.version) {
    setSeenVersion(practice.version);
    setSaved(practice.bookingIntervalMinutes);
  }

  function choose(minutes: number) {
    if (minutes === saved) return;
    const previous = saved;
    setSaved(minutes);
    const command = {
      kind: "set_booking_interval",
      id: practice.id,
      expectedVersion: practice.version,
    } as const;
    void send(
      { ...command, minutes },
      {
        undo: {
          headline: `Openings start ${clockMarks(minutes)}`,
          detail: "Booked appointments keep their times.",
          inverse: { ...command, minutes: previous },
          slot: "booking-interval",
        },
      },
    ).then((outcome) => {
      if (!outcome.ok) setSaved(practice.bookingIntervalMinutes);
    });
  }

  return (
    <section aria-labelledby="booking-interval-title" className="settings-interval">
      <div className="min-w-0">
        <h2 id="booking-interval-title" className="settings-section-title">
          Appointment start times
        </h2>
        <p
          id="booking-interval-line"
          className="text-[0.8125rem] leading-[1.125rem] text-(--wgi-muted-ink)"
        >
          Suggest available starts {clockMarks(saved)} ({intervalEvery(saved)}). Visit length is set
          separately below. Existing bookings stay as they are.
        </p>
      </div>
      <div className="settings-interval-form">
        <SegmentedControl<string>
          aria-labelledby="booking-interval-title"
          aria-describedby="booking-interval-line"
          options={optionsFor(saved)}
          value={String(saved)}
          readOnly={!canEdit}
          className="settings-interval-clock"
          onValueChange={(value) => {
            choose(Number(value));
          }}
        />
      </div>
    </section>
  );
}
