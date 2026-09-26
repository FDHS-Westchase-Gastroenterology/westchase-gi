"use client";

import type { ReactNode } from "react";

import {
  isValidAppointmentDay,
  practiceLocalDay,
} from "@/app/admin/(portal)/requests/appointment-input";
import { Check } from "@/components/icons";

import { CallAgainFieldset } from "./call-again-fieldset";
import { choiceId } from "./workflow-panel-model";
import type { ChoiceId, ChoiceRow, FollowUpKind } from "./workflow-panel-model";

/* "What happened?" as one native radio group: sr-only inputs inside
   whole-row labels on ruled decision rows, so all outcomes share one
   continuous keyboard sequence and each row's height follows its own copy.
   The dependent plan (call-again chips, or the appointment day and time)
   rides directly beneath the selected row. */

export function DecisionRow({
  name,
  value,
  checked,
  disabled,
  label,
  helper,
  onSelect,
}: Readonly<{
  name: string;
  value: string;
  checked: boolean;
  disabled: boolean;
  label: string;
  helper?: string;
  onSelect: () => void;
}>) {
  return (
    <label className="portal-choice-row">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
        className="sr-only"
      />
      <span aria-hidden="true" className="portal-choice-indicator">
        <Check className="portal-choice-check" />
      </span>
      <span className="portal-choice-copy">
        <span className="portal-choice-label">{label}</span>
        {helper !== undefined && helper !== "" ? (
          <span className="portal-choice-helper">{helper}</span>
        ) : null}
      </span>
    </label>
  );
}

/* The portal owns the appointment calendar, so recording a booking means saying
   when. Two native inputs rather than one datetime-local: staff reach for a day
   first and a time second, and the two fields keep their own labels and errors. */
function AppointmentFieldset({
  className,
  day,
  time,
  pending,
  onDayChange,
  onTimeChange,
}: Readonly<{
  className: string;
  day: string;
  time: string;
  pending: boolean;
  onDayChange: (day: string) => void;
  onTimeChange: (time: string) => void;
}>) {
  const dayId = "appointment-day";
  const timeId = "appointment-time";
  const hintId = "appointment-hint";
  const dayInvalid = day !== "" && !isValidAppointmentDay(day);
  const fieldClass =
    "mt-1.5 block min-h-11 w-full rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3.5 text-[0.9rem] text-[var(--color-ink)] transition-colors outline-none focus:border-[var(--color-teal-ink)] focus:ring-2 focus:ring-[var(--color-teal-ink)] disabled:opacity-60 aria-[invalid=true]:border-[oklch(0.5_0.19_25)] aria-[invalid=true]:bg-[color-mix(in_oklch,oklch(0.97_0.018_25)_70%,white)]";

  return (
    <fieldset className={className} disabled={pending} aria-describedby={hintId}>
      <legend className="text-sm font-bold text-[var(--color-ink)]">
        When is the appointment?
      </legend>
      <p id={hintId} className="mt-1 text-sm leading-relaxed text-[var(--color-muted-ink)]">
        Required before Save. This is what the practice reads to see who is coming in.
      </p>
      <div className="mt-3 flex max-w-md flex-wrap gap-3">
        <div className="min-w-[10rem] flex-1">
          <label htmlFor={dayId} className="block text-sm font-bold text-[var(--color-ink)]">
            Day <span aria-hidden="true">*</span>
            <span className="sr-only"> (required)</span>
          </label>
          <input
            id={dayId}
            type="date"
            required
            aria-required="true"
            aria-invalid={dayInvalid || undefined}
            data-testid="appointment-day"
            value={day}
            min={practiceLocalDay(0)}
            max={practiceLocalDay(400)}
            disabled={pending}
            onChange={(event) => {
              onDayChange(event.target.value);
            }}
            className={fieldClass}
          />
        </div>
        <div className="min-w-[8rem] flex-1">
          <label htmlFor={timeId} className="block text-sm font-bold text-[var(--color-ink)]">
            Time <span aria-hidden="true">*</span>
            <span className="sr-only"> (required)</span>
          </label>
          <input
            id={timeId}
            type="time"
            required
            aria-required="true"
            data-testid="appointment-time"
            value={time}
            disabled={pending}
            onChange={(event) => {
              onTimeChange(event.target.value);
            }}
            className={fieldClass}
          />
        </div>
      </div>
    </fieldset>
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
export function OutcomeChoiceList({
  rows,
  pending,
  selected,
  followUpKind,
  followUpDay,
  appointmentDay,
  appointmentTime,
  onSelect,
  onSelectFollowUp,
  onDayChange,
  onAppointmentDayChange,
  onAppointmentTimeChange,
}: Readonly<{
  rows: ChoiceRow[];
  pending: boolean;
  selected: ChoiceId | null;
  followUpKind: FollowUpKind | null;
  followUpDay: string;
  appointmentDay: string;
  appointmentTime: string;
  onSelect: (id: ChoiceId) => void;
  onSelectFollowUp: (kind: FollowUpKind) => void;
  onDayChange: (day: string) => void;
  onAppointmentDayChange: (day: string) => void;
  onAppointmentTimeChange: (time: string) => void;
}>) {
  const segments: { id: string; caption: string; rows: ChoiceRow[] }[] = [];
  const attemptRows = rows.filter((row) => row.choice.kind === "attempt");
  if (attemptRows.length > 0) {
    segments.push({ id: "continue", caption: "Continue working", rows: attemptRows });
  }
  const bookedRows = rows.filter((row) => row.choice.kind === "booked");
  if (bookedRows.length > 0) {
    segments.push({ id: "complete", caption: "Appointment completed", rows: bookedRows });
  }
  const closeRows = rows.filter((row) => row.choice.kind === "close");
  if (closeRows.length > 0) {
    segments.push({ id: "close", caption: "Close without an appointment", rows: closeRows });
  }

  // The plan is one keyed node in a single child array, so React relocates
  // It when the selection moves between rows: a chosen return time and a
  // Finished reveal survive the move.
  const choiceItems: ReactNode[] = [];
  for (const segment of segments) {
    choiceItems.push(
      <p key={`caption-${segment.id}`} className="portal-choice-caption">
        {segment.caption}
      </p>,
    );
    for (const row of segment.rows) {
      const id = choiceId(row.choice);
      choiceItems.push(
        <DecisionRow
          key={id}
          name="what-happened"
          value={id}
          checked={selected === id}
          disabled={pending}
          label={row.label}
          helper={row.helper}
          onSelect={() => {
            onSelect(id);
          }}
        />,
      );
      if (row.choice.kind === "attempt" && selected === id) {
        choiceItems.push(
          <div key="call-again-plan" className="portal-choice-reveal">
            <div>
              <CallAgainFieldset
                name="call-again"
                className="portal-choice-plan"
                legend="When should this come back to your attention?"
                description="Choose one before Save. The shared queue uses it to show staff the next call."
                followUpKind={followUpKind}
                followUpDay={followUpDay}
                pending={pending}
                onKindChange={onSelectFollowUp}
                onDayChange={onDayChange}
              />
            </div>
          </div>,
        );
      }
      if (row.choice.kind === "booked" && selected === id) {
        choiceItems.push(
          <div key="appointment-plan" className="portal-choice-reveal">
            <div>
              <AppointmentFieldset
                className="portal-choice-plan"
                day={appointmentDay}
                time={appointmentTime}
                pending={pending}
                onDayChange={onAppointmentDayChange}
                onTimeChange={onAppointmentTimeChange}
              />
            </div>
          </div>,
        );
      }
    }
  }

  return (
    <fieldset className="mt-5" disabled={pending}>
      <legend className="text-sm font-bold text-[var(--color-ink)]">What happened?</legend>
      <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted-ink)]">
        Record what happened on the call. The request moves to the right status.
      </p>
      <div data-testid="workflow-choices" className="portal-choice-list">
        {choiceItems}
      </div>
    </fieldset>
  );
}
