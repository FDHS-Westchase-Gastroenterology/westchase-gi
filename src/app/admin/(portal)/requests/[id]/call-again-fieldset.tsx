"use client";

import { useEffect, useRef, useState } from "react";

import {
  isValidCustomCallAgainDay,
  practiceLocalDay,
} from "@/app/admin/(portal)/requests/appointment-input";
import { Button } from "@/components/ui/button";
import type { FollowUpChoice } from "@/lib/portal/business-time";

import { FOLLOW_UP_KINDS, followUpChoice } from "./workflow-panel-model";
import type { FollowUpKind, InFlight } from "./workflow-panel-model";

/* Choosing when a request comes back: the four call-again chips with an
   optional custom day, and the two places outside the outcome list that ask
   for one (reopening a resolved request, repairing a Contacted row that has
   no call-again day). */

export function CallAgainFieldset({
  name,
  legend,
  description,
  followUpKind,
  followUpDay,
  pending,
  onKindChange,
  onDayChange,
  className = "mt-5",
}: Readonly<{
  name: string;
  legend: string;
  description: string;
  followUpKind: FollowUpKind | null;
  followUpDay: string;
  pending: boolean;
  onKindChange: (kind: FollowUpKind) => void;
  onDayChange: (day: string) => void;
  className?: string;
}>) {
  const descriptionId = `${name}-description`;
  const dayId = `${name}-day`;
  const dayLabelId = `${name}-day-label`;
  const dayHintId = `${name}-day-hint`;
  const errorId = `${name}-error`;
  const pickADayId = `${name}-kind-day`;
  const customDayInvalid =
    followUpKind === "day" && followUpDay !== "" && !isValidCustomCallAgainDay(followUpDay);
  const dayDescribedBy = customDayInvalid ? `${dayHintId} ${errorId}` : dayHintId;

  return (
    <fieldset
      className={className}
      disabled={pending}
      aria-describedby={customDayInvalid ? `${descriptionId} ${errorId}` : descriptionId}
    >
      <legend className="text-sm font-bold text-[var(--color-ink)]">{legend}</legend>
      <p
        id={descriptionId}
        data-testid={`${name}-required-explanation`}
        className="mt-1 text-sm leading-relaxed text-[var(--color-muted-ink)]"
      >
        {description}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {FOLLOW_UP_KINDS.map((chip) => (
          <label
            key={chip.kind}
            className="flex min-h-11 cursor-pointer items-center rounded-full border border-[var(--color-line-2)] bg-white px-4 text-[0.9rem] font-bold text-[var(--color-body)] transition-colors hover:border-[var(--color-navy)] has-[:checked]:border-[var(--color-navy)] has-[:checked]:bg-[var(--color-navy)] has-[:checked]:text-[var(--color-on-dark)] has-[:disabled]:cursor-default has-[:disabled]:opacity-60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--color-teal-ink)]"
          >
            <input
              type="radio"
              id={chip.kind === "day" ? pickADayId : undefined}
              name={name}
              value={chip.kind}
              checked={followUpKind === chip.kind}
              aria-controls={chip.kind === "day" && followUpKind === "day" ? dayId : undefined}
              onChange={() => {
                onKindChange(chip.kind);
              }}
              disabled={pending}
              className="sr-only"
            />
            {chip.label}
          </label>
        ))}
      </div>
      {followUpKind === "day" ? (
        <div role="group" aria-labelledby={`${pickADayId} ${dayLabelId}`} className="mt-3 max-w-sm">
          <label
            id={dayLabelId}
            htmlFor={dayId}
            className="block text-sm font-bold text-[var(--color-ink)]"
          >
            Call again on <span aria-hidden="true">*</span>
            <span className="sr-only"> (required)</span>
          </label>
          <input
            id={dayId}
            type="date"
            name={`${name}-day`}
            required
            aria-required="true"
            aria-invalid={customDayInvalid || undefined}
            aria-describedby={dayDescribedBy}
            data-testid={dayId}
            value={followUpDay}
            min={practiceLocalDay(0)}
            max={practiceLocalDay(90)}
            disabled={pending}
            onChange={(event) => {
              onDayChange(event.target.value);
            }}
            className="mt-1.5 block min-h-11 w-full rounded-[var(--radius)] border border-[var(--color-line-2)] bg-white px-3.5 text-[0.9rem] text-[var(--color-ink)] transition-colors outline-none focus:border-[var(--color-teal-ink)] focus:ring-2 focus:ring-[var(--color-teal-ink)] disabled:opacity-60 aria-[invalid=true]:border-[oklch(0.5_0.19_25)] aria-[invalid=true]:bg-[color-mix(in_oklch,oklch(0.97_0.018_25)_70%,white)]"
          />
          <p
            id={dayHintId}
            className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted-ink)]"
          >
            Required when Pick a day is selected. Save stays unavailable until this day is valid.
          </p>
          {customDayInvalid ? (
            <p
              id={errorId}
              role="alert"
              className="mt-1.5 text-sm font-bold text-[var(--color-ink)]"
            >
              Choose today or a day within the next 90 days.
            </p>
          ) : null}
        </div>
      ) : null}
    </fieldset>
  );
}

/** Reopen a resolved request, or set the missing call-again day on a Contacted one. */
export function ReturnTimeAction({
  kind,
  pending,
  inFlight,
  onSubmit,
}: Readonly<{
  kind: "reopen" | "set_call_again";
  pending: boolean;
  inFlight: InFlight | null;
  onSubmit: (choice: Readonly<FollowUpChoice>) => void;
}>) {
  const [open, setOpen] = useState(kind === "set_call_again");
  const [followUpKind, setFollowUpKind] = useState<FollowUpKind | null>(null);
  const [followUpDay, setFollowUpDay] = useState("");
  const correctionRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const focusAfterOpenRef = useRef(false);
  const restoreTriggerFocusRef = useRef(false);
  const choice = followUpChoice(followUpKind, followUpDay);
  const isCorrection = kind === "set_call_again";
  const headingId = `${kind}-heading`;

  useEffect(() => {
    if (
      open &&
      (focusAfterOpenRef.current || (isCorrection && window.location.hash === "#set-call-again"))
    ) {
      focusAfterOpenRef.current = false;
      correctionRef.current?.focus();
      return;
    }
    if (!open && restoreTriggerFocusRef.current) {
      restoreTriggerFocusRef.current = false;
      triggerRef.current?.focus();
    }
  }, [isCorrection, open]);

  if (!open) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          ref={triggerRef}
          type="button"
          variant="outline"
          data-testid="reopen-request"
          disabled={pending}
          onClick={() => {
            focusAfterOpenRef.current = true;
            setOpen(true);
          }}
          className="disabled:opacity-60"
        >
          Reopen for more work
        </Button>
        <p className="text-sm text-[var(--color-muted-ink)]">
          You will choose when it returns before anything changes.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={correctionRef}
      id={isCorrection ? "set-call-again" : undefined}
      tabIndex={-1}
      role="group"
      aria-labelledby={headingId}
      data-testid={isCorrection ? "set-call-again-controls" : "reopen-controls"}
      className={
        isCorrection
          ? "mt-4 rounded-[var(--radius-sm)] bg-[var(--color-amber-soft)] px-4 py-4 outline-none focus:outline-[3px] focus:outline-offset-2 focus:outline-[var(--color-amber)]"
          : "mt-4 outline-none focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--color-teal-ink)]"
      }
    >
      <h3 id={headingId} className="text-[0.95rem] font-black text-[var(--color-ink)]">
        {isCorrection ? "Set a call-again day" : "Reopen for more work"}
      </h3>
      {isCorrection ? (
        <p className="mt-1 max-w-[68ch] text-sm leading-relaxed text-[var(--color-body)]">
          This Contacted request has no return time. Choose one to put a concrete next action back
          in the shared queue.
        </p>
      ) : null}
      <CallAgainFieldset
        name={isCorrection ? "correction-call-again" : "reopen-call-again"}
        legend={isCorrection ? "When should staff call again?" : "When should this request return?"}
        description={
          isCorrection
            ? "A return choice is required. No date will be guessed for this request."
            : "Choose a return time before reopening. Cancel leaves the resolved request and its history unchanged."
        }
        followUpKind={followUpKind}
        followUpDay={followUpDay}
        pending={pending}
        onKindChange={setFollowUpKind}
        onDayChange={setFollowUpDay}
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant={choice !== undefined || (pending && inFlight === kind) ? "default" : "outline"}
          data-testid={isCorrection ? "set-call-again-submit" : "confirm-reopen"}
          disabled={pending || choice === undefined}
          onClick={() => {
            if (choice !== undefined) onSubmit(choice);
          }}
          className="disabled:opacity-60"
        >
          {pending && inFlight === kind
            ? isCorrection
              ? "Saving…"
              : "Reopening…"
            : isCorrection
              ? "Set call-again day"
              : "Reopen request"}
        </Button>
        {isCorrection ? (
          <p className="text-sm text-[var(--color-body)]">
            The correction is recorded in Request history and can be undone for 15 minutes.
          </p>
        ) : (
          <Button
            type="button"
            variant="outline"
            data-testid="cancel-reopen"
            disabled={pending}
            onClick={() => {
              restoreTriggerFocusRef.current = true;
              setOpen(false);
              setFollowUpKind(null);
              setFollowUpDay("");
            }}
            className="disabled:opacity-60"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
