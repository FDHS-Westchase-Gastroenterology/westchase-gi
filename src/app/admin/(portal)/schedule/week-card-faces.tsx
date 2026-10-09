"use client";

import { startTransition, useEffect, useId, useRef, useState } from "react";

import { dayHorizon } from "@/app/admin/(portal)/(home)/record-card-model";
import { ChevronDown, CircleAlert } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { CalendarDay } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { readRescheduleTimes } from "./week-actions";
import { addDays, cardDay, noon, practiceDate, practiceTime } from "./week-calendar";
import { CANCEL_REASONS, freedTime, nextCallAgainDay } from "./week-card-model";
import type { CancelReason, WeekAppointmentDetail, WeekRescheduleTimes } from "./week-card-model";
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
      <p id={dateId} className="wgi-week-card-label">
        Move to
      </p>
      <div className="wgi-week-card-cal" role="group" aria-labelledby={dateId}>
        <CalendarDay
          className="wgi-editor-cal"
          day={date}
          min={today}
          max={addDays(today, dayHorizon("booked"))}
          disabled={pending}
          onChange={setDate}
        />
      </div>
      {shown === null ? (
        <p className="wgi-week-card-quiet" aria-live="polite">
          Finding open times…
        </p>
      ) : shown.read === null ? (
        <CardError>The open times couldn&apos;t be read.</CardError>
      ) : slots.length === 0 ? (
        <p className="wgi-week-card-quiet">No open times that day.</p>
      ) : (
        <ToggleGroup
          variant="time"
          className="wgi-week-card-times"
          aria-label="Open times"
          value={[]}
          disabled={pending}
          onValueChange={(picked) => {
            const time = picked.at(0);
            if (time !== undefined) onPick({ date, time });
          }}
        >
          {slots.map((slot) => (
            <ToggleGroupItem key={slot.startsAt} value={slot.time} className="wgi-week-card-time">
              {practiceTime(slot.startsAt)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
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

/* ---- Cancel: why, and what happens to the request ---- */

/** What a cancel tells the server about the request it managed: a day to
   call the patient again, or that the request closes. */
export type CancelAfterwards =
  | { readonly outcome: "call_again"; readonly callAgainOn: string }
  | { readonly outcome: "close" };

/* Figma Ap4: the card turns into the cancel form at 380 wide. A coral well
   says what the cancel frees and asks why; a request-managed visit then
   asks what happens to the request. Nothing here is a form: Return on a
   choice chooses it, and only a press on the coral command cancels. Keep
   appointment comes first and takes the opening focus's neighbor. */
export function CancelFace({
  detail,
  titleId,
  pending,
  error,
  onKeep,
  onCancel,
}: Readonly<{
  detail: WeekAppointmentDetail;
  titleId: string;
  pending: boolean;
  error: string | null;
  onKeep: () => void;
  onCancel: (reason: CancelReason, afterwards: CancelAfterwards | null) => void;
}>) {
  const today = practiceDate(new Date(detail.observedAt));
  const managed = detail.requestVersion !== null;
  const [reason, setReason] = useState<CancelReason>(CANCEL_REASONS[0]);
  const [after, setAfter] = useState<CancelAfterwards["outcome"]>("call_again");
  const [callAgain, setCallAgain] = useState(() => nextCallAgainDay(today));
  const reasonId = useId();
  const afterId = useId();
  const reasonsRef = useRef<HTMLDivElement>(null);

  /* The card turns over from a menu that has just closed: focus lands on
     the chosen reason, so Return there chooses, never cancels. */
  useEffect(() => {
    reasonsRef.current?.querySelector<HTMLElement>("[data-checked]")?.focus();
  }, []);

  return (
    <div className="wgi-week-card-cancel">
      <PopoverTitle id={titleId} className="wgi-week-card-name">
        Cancel appointment
      </PopoverTitle>
      <p className="wgi-week-card-sub">
        <span data-ui-redact="patient-name">{detail.patientName}</span>
        {` · ${cardDay(detail.startsAt)} · ${practiceTime(detail.startsAt)}`}
      </p>
      <div className="wgi-week-card-well">
        <p className="wgi-week-card-warn">
          <CircleAlert width={15} height={15} />
          {freedTime(detail)} opens for booking again.
        </p>
        <p id={reasonId} className="wgi-week-card-caps">
          Reason
        </p>
        <RadioGroup
          ref={reasonsRef}
          aria-labelledby={reasonId}
          className="wgi-week-card-choices"
          value={reason}
          disabled={pending}
          onValueChange={(value) => {
            const picked = CANCEL_REASONS.find((row) => row === value);
            if (picked !== undefined) setReason(picked);
          }}
        >
          {CANCEL_REASONS.map((row) => (
            <Label key={row} className="wgi-week-card-choice">
              <RadioGroupItem value={row} />
              {row}
            </Label>
          ))}
        </RadioGroup>
      </div>
      {managed ? (
        <>
          <p id={afterId} className="wgi-week-card-caps">
            Afterwards
          </p>
          <RadioGroup
            aria-labelledby={afterId}
            className="wgi-week-card-choices"
            value={after}
            disabled={pending}
            onValueChange={(value) => {
              setAfter(value === "close" ? "close" : "call_again");
            }}
          >
            <div className="wgi-week-card-choice-line">
              <Label className="wgi-week-card-choice">
                <RadioGroupItem value="call_again" />
                Call again on
              </Label>
              <CallAgainChip
                day={callAgain}
                today={today}
                disabled={pending}
                onPick={(day) => {
                  setCallAgain(day);
                  setAfter("call_again");
                }}
              />
            </div>
            <Label className="wgi-week-card-choice">
              <RadioGroupItem value="close" />
              Close the request
            </Label>
          </RadioGroup>
        </>
      ) : null}
      {error === null ? null : <CardError>{error}</CardError>}
      <div className="wgi-week-card-band">
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onKeep}>
          Keep appointment
        </Button>
        <Button
          type="button"
          size="sm"
          className="wgi-week-card-stop"
          disabled={pending}
          onClick={() => {
            onCancel(
              reason,
              managed
                ? after === "close"
                  ? { outcome: "close" }
                  : { outcome: "call_again", callAgainOn: callAgain }
                : null,
            );
          }}
        >
          Cancel appointment
        </Button>
      </div>
    </div>
  );
}

/* The day to call again: a chip that opens the registry calendar beside
   it, the next weekday until staff pick another. */
function CallAgainChip({
  day,
  today,
  disabled,
  onPick,
}: Readonly<{
  day: string;
  today: string;
  disabled: boolean;
  onPick: (day: string) => void;
}>) {
  const [open, setOpen] = useState(false);
  const label = cardDay(noon(day).toISOString());
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="wgi-week-card-chip"
        disabled={disabled}
        aria-label={`Call again on ${label}. Change the day`}
      >
        {label}
        <ChevronDown width={12} height={12} />
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" sideOffset={6} className="wgi-week-card-chip-cal">
        <PopoverTitle className="sr-only">Call again on</PopoverTitle>
        <CalendarDay
          className="wgi-editor-cal"
          day={day}
          min={today}
          max={addDays(today, dayHorizon("no_answer"))}
          disabled={false}
          onChange={(next) => {
            onPick(next);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
