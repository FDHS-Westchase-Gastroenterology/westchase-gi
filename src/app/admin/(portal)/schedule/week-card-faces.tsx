"use client";

import { startTransition, useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { readRescheduleTimes } from "./week-actions";
import { practiceDate, practiceTime } from "./week-calendar";
import { nextCallAgainDay } from "./week-card-model";
import type { WeekAppointmentDetail, WeekRescheduleTimes } from "./week-card-model";
import { CardError } from "./week-card-parts";

/* ---- Reschedule: a day and its open starts ---- */

export function RescheduleFace({
  detail,
  pending,
  error,
  onBack,
  onPick,
}: Readonly<{
  detail: WeekAppointmentDetail;
  pending: boolean;
  error: string | null;
  onBack: () => void;
  onPick: (start: Readonly<{ date: string; time: string }>) => void;
}>) {
  const today = practiceDate(new Date(detail.observedAt));
  const booked = practiceDate(new Date(detail.startsAt));
  const [date, setDate] = useState(booked < today ? today : booked);
  const [times, setTimes] = useState<{ date: string; read: WeekRescheduleTimes | null } | null>(
    null,
  );
  const dateId = useId();

  useEffect(() => {
    let live = true;
    startTransition(async () => {
      try {
        // react-doctor-disable-next-line react-doctor/async-defer-await -- the guard below is the staleness check, not a hoistable precondition: `live` is falsified only by this effect's cleanup, which runs while the read is in flight
        const outcome = await readRescheduleTimes({
          appointmentId: detail.id,
          providerId: detail.providerId,
          locationId: detail.locationId,
          date,
        });
        if (live) setTimes({ date, read: outcome.ok ? outcome.times : null });
      } catch {
        if (live) setTimes({ date, read: null });
      }
    });
    return () => {
      live = false;
    };
  }, [detail.id, detail.providerId, detail.locationId, date]);

  const shown = times?.date === date ? times : null;
  const slots = (shown?.read?.slots ?? []).filter((slot) => slot.startsAt !== detail.startsAt);

  return (
    <div className="wgi-week-card-face">
      <label htmlFor={dateId} className="wgi-week-card-label">
        Move to
      </label>
      <Input
        id={dateId}
        type="date"
        value={date}
        min={today}
        onChange={(event) => {
          if (event.currentTarget.value !== "") setDate(event.currentTarget.value);
        }}
      />
      {shown === null ? (
        <p className="wgi-week-card-quiet" aria-live="polite">
          Finding open times…
        </p>
      ) : shown.read === null ? (
        <CardError>The open times couldn&apos;t be read.</CardError>
      ) : slots.length === 0 ? (
        <p className="wgi-week-card-quiet">No open times that day.</p>
      ) : (
        <ul className="wgi-week-card-times" aria-label="Open times">
          {slots.map((slot) => (
            <li key={slot.startsAt}>
              <button
                type="button"
                className="wgi-week-card-time"
                disabled={pending}
                onClick={() => {
                  onPick({ date, time: slot.time });
                }}
              >
                {practiceTime(slot.startsAt)}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error === null ? null : <CardError>{error}</CardError>}
      <div className="wgi-week-card-actions">
        <Button variant="outline" size="sm" onClick={onBack}>
          Back
        </Button>
      </div>
    </div>
  );
}

/* ---- Cancel: why, and when to call again ---- */

export function CancelFace({
  detail,
  pending,
  error,
  onBack,
  onCancel,
}: Readonly<{
  detail: WeekAppointmentDetail;
  pending: boolean;
  error: string | null;
  onBack: () => void;
  onCancel: (reason: string, callAgainOn: string | null) => void;
}>) {
  const today = practiceDate(new Date(detail.observedAt));
  const managed = detail.requestVersion !== null;
  const [reason, setReason] = useState("");
  const [callAgain, setCallAgain] = useState(() => nextCallAgainDay(today));
  const reasonId = useId();
  const callId = useId();
  const trimmed = reason.trim();

  return (
    <form
      className="wgi-week-card-face"
      onSubmit={(event) => {
        event.preventDefault();
        if (trimmed === "") return;
        onCancel(trimmed, managed ? callAgain : null);
      }}
    >
      <label htmlFor={reasonId} className="wgi-week-card-label">
        Reason
      </label>
      <Textarea
        id={reasonId}
        value={reason}
        maxLength={500}
        rows={2}
        required
        onChange={(event) => {
          setReason(event.currentTarget.value);
        }}
      />
      {managed ? (
        <>
          <label htmlFor={callId} className="wgi-week-card-label">
            Call again on
          </label>
          <Input
            id={callId}
            type="date"
            value={callAgain}
            min={today}
            required
            onChange={(event) => {
              setCallAgain(event.currentTarget.value);
            }}
          />
        </>
      ) : null}
      {error === null ? null : <CardError>{error}</CardError>}
      <div className="wgi-week-card-actions">
        <Button
          type="submit"
          size="sm"
          className="wgi-week-card-go"
          disabled={pending || trimmed === ""}
        >
          Cancel appointment
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onBack}>
          Back
        </Button>
      </div>
    </form>
  );
}
