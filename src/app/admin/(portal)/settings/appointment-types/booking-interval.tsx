"use client";

import { useState } from "react";

import type { SettingsSend } from "@/app/admin/(portal)/settings/use-settings-command";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { intervalEvery, parseInterval } from "@/lib/portal/scheduling/booking-interval";
import { BOOKING_INTERVAL_MINUTES } from "@/lib/portal/scheduling/settings-contracts";
import type { SchedulingSettings } from "@/lib/portal/scheduling/settings-contracts";

/* The practice's booking interval: how often the Schedule offers each
   provider an opening, one an hour unless an admin sets another. An admin
   types any whole quarter hour up to a working day and saves it; the Undo
   toast confirms it. A booked visit holds its provider for the interval
   the way an opening does. A type longer than the interval keeps its full
   length, and booked appointments never move. Staff read it. */

const { min, max, step } = BOOKING_INTERVAL_MINUTES;

export function BookingIntervalBand({
  practice,
  canEdit,
  send,
}: Readonly<{
  practice: SchedulingSettings["practice"];
  canEdit: boolean;
  send: SettingsSend;
}>) {
  /* The field holds the draft; the server's answer replaces it when the
     practice's version moves on. */
  const [seenVersion, setSeenVersion] = useState(practice.version);
  const [saved, setSaved] = useState(practice.bookingIntervalMinutes);
  const [draft, setDraft] = useState(String(practice.bookingIntervalMinutes));
  if (seenVersion !== practice.version) {
    setSeenVersion(practice.version);
    setSaved(practice.bookingIntervalMinutes);
    setDraft(String(practice.bookingIntervalMinutes));
  }
  const minutes = parseInterval(draft);
  const invalid = draft.trim() !== "" && minutes === null;

  function save() {
    if (minutes === null || minutes === saved) return;
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
          headline: `Openings ${intervalEvery(minutes)}`,
          detail: "Booked appointments keep their times.",
          inverse: { ...command, minutes: previous },
          slot: "booking-interval",
        },
      },
    ).then((outcome) => {
      if (outcome.ok) return;
      setSaved(practice.bookingIntervalMinutes);
      setDraft(String(practice.bookingIntervalMinutes));
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
          The schedule offers each provider one opening {intervalEvery(saved)}. A longer visit keeps
          its full length.
        </p>
      </div>
      <form
        className="settings-interval-form"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <Field data-invalid={invalid || undefined} className="settings-interval-field">
          <div className="flex items-center gap-2">
            <Input
              id="booking-interval-input"
              type="number"
              inputMode="numeric"
              min={min}
              max={max}
              step={step}
              aria-labelledby="booking-interval-title booking-interval-unit"
              aria-describedby={
                invalid ? "booking-interval-line booking-interval-error" : "booking-interval-line"
              }
              aria-invalid={invalid}
              disabled={!canEdit}
              className="w-24"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
              }}
            />
            <span id="booking-interval-unit" className="text-sm text-(--wgi-muted-ink)">
              minutes
            </span>
            {canEdit ? (
              <Button
                type="submit"
                variant="outline"
                disabled={minutes === null || minutes === saved}
              >
                Save
              </Button>
            ) : null}
          </div>
          {invalid ? (
            <FieldError id="booking-interval-error">
              Use a multiple of {step} minutes, from {min} to {max}.
            </FieldError>
          ) : null}
        </Field>
      </form>
    </section>
  );
}
