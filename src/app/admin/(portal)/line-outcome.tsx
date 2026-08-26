"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import type { FollowUpChoice } from "@/lib/portal/business-time";
import type { CommandOutcome, ContactOutcome } from "@/lib/portal/workflow/contracts";

import { usePortalFeedback } from "./portal-feedback";
import {
  appointmentChoice,
  isValidCustomCallAgainDay,
  practiceLocalDay,
} from "./requests/appointment-input";
import { followUpShortLabel } from "./requests/format";
import { confirmBookingHandoff, recordContactAttempt } from "./requests/workflow-actions";

/* Recording an outcome where the call happened.
 *
 * The detail page still exists, and it is still the record: full contact
 * Context, the whole history, undo, closure. But the common case after a call
 * Is one of three facts, and making staff open a page to state one of them
 * Taxed the busiest minute of their day. So the line takes the outcome and the
 * Detail page becomes the place you go to read, not the place you go to type.
 *
 * The three top-level outcomes are the ones staff actually live through. "No
 * Answer" owns "left a voicemail" beneath it, because a voicemail is what
 * Happened *during* a no-answer call rather than a separate result. Every
 * Contact outcome must name its own return day — the state machine refuses a
 * Contacted row with no call-again time — so each outcome arrives with the day
 * It usually means, already chosen.
 */

/* Ordered the way the day goes: the two ways a call fails to finish the job,
   then the one that does. */
const SELECTIONS = ["no_answer", "reached_follow_up", "booked"] as const;
type Selection = (typeof SELECTIONS)[number];

const CALL_AGAIN_PRESETS = [
  { kind: "this_afternoon", label: "This afternoon" },
  { kind: "tomorrow_morning", label: "Tomorrow morning" },
  { kind: "friday", label: "Friday" },
] as const;

type PresetKind = (typeof CALL_AGAIN_PRESETS)[number]["kind"];
type CallAgainKind = PresetKind | "day";

/* The day each outcome usually means. A call that rang out gets tried again
   next morning; a patient who asked to be called back after checking a
   Calendar gets the end of the week. Staff can always say otherwise. */
const DEFAULT_CALL_AGAIN = {
  no_answer: "tomorrow_morning",
  reached_follow_up: "friday",
} as const satisfies Record<"no_answer" | "reached_follow_up", PresetKind>;

const SELECTION_LABELS = {
  no_answer: "No answer",
  reached_follow_up: "Contacted",
  booked: "Appointment scheduled",
} as const satisfies Record<Selection, string>;

function callAgainChoice(kind: CallAgainKind, day: string): FollowUpChoice | undefined {
  if (kind === "day") {
    return isValidCustomCallAgainDay(day) ? { kind: "day", date: day } : undefined;
  }
  return { kind };
}

export function LineOutcome({
  requestId,
  name,
  version,
}: Readonly<{
  requestId: string;
  name: string;
  version: number;
}>) {
  const router = useRouter();
  const { publish } = usePortalFeedback();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [voicemail, setVoicemail] = useState(false);
  const [callAgain, setCallAgain] = useState<CallAgainKind>("tomorrow_morning");
  const [customDay, setCustomDay] = useState("");
  const [appointmentDay, setAppointmentDay] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const keyRef = useRef<string | null>(null);

  const panelId = `line-record-${requestId}`;
  const booking = appointmentChoice(appointmentDay, appointmentTime);
  const returnDay = callAgainChoice(callAgain, customDay);
  const ready =
    selection === null
      ? false
      : selection === "booked"
        ? booking !== undefined
        : returnDay !== undefined;

  function choose(next: Selection) {
    setSelection(next);
    setError(null);
    if (next !== "booked") setCallAgain(DEFAULT_CALL_AGAIN[next]);
    if (next !== "no_answer") setVoicemail(false);
  }

  function reset() {
    setOpen(false);
    setSelection(null);
    setVoicemail(false);
    setCustomDay("");
    setAppointmentDay("");
    setAppointmentTime("");
    setError(null);
  }

  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- CommandOutcome carries domain member types that cannot be made readonly
  function settle(result: Readonly<CommandOutcome>, message: string) {
    if (result.ok) {
      keyRef.current = null;
      publish({ source: "requests-output", tone: "status", message });
      reset();
      router.refresh();
      return;
    }
    keyRef.current = null;
    setError(
      result.code === "stale_version"
        ? "Someone else worked this request just now. Nothing was saved — reload the page to see where it stands."
        : "That did not save. Nothing was recorded, so it is safe to try again.",
    );
  }

  function save() {
    if (selection === null || pending) return;
    keyRef.current ??= crypto.randomUUID();
    const common = {
      requestId,
      expectedVersion: version,
      idempotencyKey: keyRef.current,
    };

    if (selection === "booked") {
      if (booking === undefined) return;
      startTransition(async () => {
        const result = await confirmBookingHandoff({ ...common, appointment: booking });
        settle(result, `${name} is Scheduled.`);
      });
      return;
    }

    if (returnDay === undefined) return;
    const outcome: ContactOutcome =
      selection === "no_answer" && voicemail ? "voicemail" : selection;
    startTransition(async () => {
      const result = await recordContactAttempt({ ...common, outcome, callAgain: returnDay });
      settle(
        result,
        result.ok && result.callAgainAt !== null
          ? `${SELECTION_LABELS[selection]} recorded for ${name} — back ${followUpShortLabel(result.callAgainAt)}.`
          : `${SELECTION_LABELS[selection]} recorded for ${name}.`,
      );
    });
  }

  const trigger = (
    <button
      type="button"
      data-testid={`line-record-open-${requestId}`}
      aria-expanded={open}
      aria-controls={panelId}
      className="portal-line-record-open"
      onClick={() => {
        if (open) reset();
        else setOpen(true);
      }}
    >
      {open ? "Close" : "Record"}
    </button>
  );

  if (!open) return trigger;

  return (
    <>
      {trigger}
      <div id={panelId} data-testid={panelId} className="portal-line-record">
        <fieldset className="portal-line-outcomes" disabled={pending}>
          <legend>What happened with {name}?</legend>
          {SELECTIONS.map((key) => (
            <label key={key} className="portal-line-outcome">
              <input
                type="radio"
                name={`${panelId}-outcome`}
                value={key}
                checked={selection === key}
                data-testid={`line-outcome-${key}-${requestId}`}
                onChange={() => {
                  choose(key);
                }}
              />
              <span>{SELECTION_LABELS[key]}</span>
            </label>
          ))}
        </fieldset>

        {selection === "no_answer" ? (
          <label className="portal-line-voicemail">
            <input
              type="checkbox"
              checked={voicemail}
              disabled={pending}
              data-testid={`line-voicemail-${requestId}`}
              onChange={(event) => {
                setVoicemail(event.target.checked);
              }}
            />
            <span>I left a voicemail</span>
          </label>
        ) : null}

        {selection !== null && selection !== "booked" ? (
          <fieldset className="portal-line-when" disabled={pending}>
            <legend>Call again</legend>
            <div className="portal-line-chips">
              {CALL_AGAIN_PRESETS.map((preset) => (
                <label key={preset.kind} className="portal-line-chip">
                  <input
                    type="radio"
                    name={`${panelId}-call-again`}
                    checked={callAgain === preset.kind}
                    data-testid={`line-call-again-${preset.kind}-${requestId}`}
                    onChange={() => {
                      setCallAgain(preset.kind);
                    }}
                  />
                  <span>{preset.label}</span>
                </label>
              ))}
              <label className="portal-line-chip">
                <input
                  type="radio"
                  name={`${panelId}-call-again`}
                  checked={callAgain === "day"}
                  onChange={() => {
                    setCallAgain("day");
                  }}
                />
                <span>A day</span>
              </label>
            </div>
            {callAgain === "day" ? (
              <input
                type="date"
                aria-label="Call again on"
                value={customDay}
                min={practiceLocalDay(0)}
                max={practiceLocalDay(90)}
                disabled={pending}
                data-testid={`line-call-again-day-${requestId}`}
                onChange={(event) => {
                  setCustomDay(event.target.value);
                }}
                className="portal-line-date"
              />
            ) : null}
          </fieldset>
        ) : null}

        {selection === "booked" ? (
          <fieldset className="portal-line-when" disabled={pending}>
            <legend>When is the appointment?</legend>
            <div className="portal-line-appointment">
              <input
                type="date"
                aria-label="Appointment day"
                required
                value={appointmentDay}
                min={practiceLocalDay(0)}
                max={practiceLocalDay(400)}
                disabled={pending}
                data-testid={`line-appointment-day-${requestId}`}
                onChange={(event) => {
                  setAppointmentDay(event.target.value);
                }}
                className="portal-line-date"
              />
              <input
                type="time"
                aria-label="Appointment time"
                required
                value={appointmentTime}
                disabled={pending}
                data-testid={`line-appointment-time-${requestId}`}
                onChange={(event) => {
                  setAppointmentTime(event.target.value);
                }}
                className="portal-line-date"
              />
            </div>
          </fieldset>
        ) : null}

        {error === null ? null : (
          <p
            role="alert"
            data-testid={`line-record-error-${requestId}`}
            className="portal-line-error"
          >
            {error}
          </p>
        )}

        <div className="portal-line-commit">
          <button
            type="button"
            disabled={!ready || pending}
            data-testid={`line-record-save-${requestId}`}
            className="btn btn-navy portal-line-save"
            onClick={save}
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <button type="button" disabled={pending} className="portal-line-cancel" onClick={reset}>
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
