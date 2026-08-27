"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RefObject } from "react";
import { useId, useRef, useState, useTransition } from "react";

import { Check, ChevronRight, Phone } from "@/components/icons";
import type { FollowUpChoice } from "@/lib/portal/business-time";
import type { CommandOutcome, ContactOutcome } from "@/lib/portal/workflow/contracts";

import { PortalCalendar } from "./portal-calendar";
import { usePortalFeedback } from "./portal-feedback";
import { PortalModal } from "./portal-modal";
import {
  appointmentChoice,
  isValidCustomCallAgainDay,
  practiceLocalDay,
} from "./requests/appointment-input";
import { followUpShortLabel, formatPhoneForDisplay, telHref } from "./requests/format";
import { confirmBookingHandoff, recordContactAttempt } from "./requests/workflow-actions";

export interface SheetLine {
  id: string;
  name: string;
  phone: string;
  /** Optimistic-concurrency token, so the outcome can be recorded on the line. */
  version: number;
  /** "Tampa · Morning" — the patient's stated preference. */
  preference: string;
  /** The line's timing fact: waiting since, due, or silent since. */
  timing: string;
  /** The only amber on a row: the exception within its group, or null. */
  stamp: string | null;
}

/* The line lifts off the sheet.
 *
 * The row used to split into a navigation link, a dialable number, and a
 * Record control that opened a form inside the row — and the widest target,
 * the name, spent itself on a page the busiest minute of the day did not
 * need. Now the whole line is one target for one act: press anywhere and the
 * line rises as a modal carrying everything a call needs — the name, the
 * preference, the timing, a dialable number, and the three outcomes. The
 * detail page is still the record; it demotes to one quiet link at the
 * modal's foot. The phone number stays its own target on the row, because a
 * thumb aiming to dial must never open anything.
 *
 * The three top-level outcomes are the ones staff actually live through.
 * "No answer" owns "left a voicemail" beneath it, because a voicemail is
 * what happened *during* a no-answer call rather than a separate result.
 * Every contact outcome must name its own return day — the state machine
 * refuses a contacted row with no call-again time — so each outcome arrives
 * with the day it usually means, already chosen.
 *
 * The working band unfolds rather than swaps. Each dependent section — the
 * voicemail note, the call-again plan, the appointment day — stays mounted
 * and opens on the registry spring / closes on the registry exit, so
 * changing an answer mid-motion retargets instead of restarting. Closed
 * sections are inert: invisible to focus and assistive technology alike.
 *
 * What unfolds stays small. A call-again day is a short list of presets, so
 * its month can afford to open in place; an appointment day is a year of
 * calendar, and unfolding that into a dialog already at its height ceiling
 * only produced a clipped month inside a scroll region that appeared under
 * the reader. So the booked band holds one line — the day chosen so far —
 * and the month itself comes forward as a nested dialog that grows from
 * that line. See AppointmentDayDialog at the foot of this file.
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
   calendar gets the end of the week. Staff can always say otherwise. */
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

const APPOINTMENT_DAY_LABEL = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

/* What the closed trigger says. A half-answered booking states the half it
   has rather than falling back to the prompt, so staff can see at a glance
   which piece the Save button is still waiting on. */
function appointmentSummary(day: string, time: string): string {
  if (day === "") return "Choose a day and time";
  const date = APPOINTMENT_DAY_LABEL.format(new Date(`${day}T00:00:00Z`));
  const clock = /^(\d{2}):(\d{2})$/.exec(time);
  if (clock === null) return `${date} · time needed`;
  const hour = Number(clock[1]);
  return `${date} · ${((hour + 11) % 12) + 1}:${clock[2]} ${hour < 12 ? "AM" : "PM"}`;
}

export function SheetLineRow({ line }: Readonly<{ line: Readonly<SheetLine> }>) {
  const [open, setOpen] = useState(false);
  /* Mounted from the first open onward, never unmounted: the exit transition
     needs content to fade with, and the form resets itself on every close. */
  const [everOpened, setEverOpened] = useState(false);

  function show() {
    setEverOpened(true);
    setOpen(true);
  }

  return (
    <li className="portal-sheet-row">
      <button
        type="button"
        data-testid={`line-open-${line.id}`}
        aria-haspopup="dialog"
        className="portal-sheet-open"
        onClick={show}
      >
        <span className="portal-sheet-who">
          <span className="portal-sheet-name">
            <strong data-ui-redact="patient-name">{line.name}</strong>
            <ChevronRight className="portal-sheet-disclosure h-4 w-4" aria-hidden="true" />
          </span>
          <small>{line.preference}</small>
        </span>
      </button>
      <a
        href={telHref(line.phone)}
        className="portal-sheet-phone"
        data-ui-redact="patient-contact"
        aria-label={`Call ${line.name} at ${formatPhoneForDisplay(line.phone)}`}
      >
        <Phone className="portal-sheet-phone-icon h-3.5 w-3.5" aria-hidden="true" />
        {formatPhoneForDisplay(line.phone)}
      </a>
      <span className="portal-sheet-when">
        {line.stamp === null ? null : <span className="portal-stamp">{line.stamp}</span>}
        <span>{line.timing}</span>
      </span>
      <button
        type="button"
        data-testid={`line-record-open-${line.id}`}
        aria-haspopup="dialog"
        className="portal-line-record-open"
        onClick={show}
      >
        Record
      </button>
      {everOpened ? (
        <LineRecordModal
          line={line}
          open={open}
          onClose={() => {
            setOpen(false);
          }}
        />
      ) : null}
    </li>
  );
}

function LineRecordModal({
  line,
  open,
  onClose,
}: Readonly<{ line: Readonly<SheetLine>; open: boolean; onClose: () => void }>) {
  const router = useRouter();
  const { publish } = usePortalFeedback();
  const [pending, startTransition] = useTransition();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [voicemail, setVoicemail] = useState(false);
  const [callAgain, setCallAgain] = useState<CallAgainKind>("tomorrow_morning");
  const [customDay, setCustomDay] = useState("");
  const [appointmentDay, setAppointmentDay] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [dayOpen, setDayOpen] = useState(false);
  const [justChosen, setJustChosen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keyRef = useRef<string | null>(null);
  const chosenTimerRef = useRef<number | null>(null);
  const dayTriggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const panelId = `line-record-${line.id}`;
  const booking = appointmentChoice(appointmentDay, appointmentTime);
  const returnDay = callAgainChoice(callAgain, customDay);
  const uncertain = error?.startsWith("The portal could not confirm") === true;
  const ready =
    selection === null
      ? false
      : selection === "booked"
        ? booking !== undefined
        : returnDay !== undefined;

  function choose(next: Selection) {
    setSelection(next);
    setError(null);
    if (next !== "booked") {
      setCallAgain(DEFAULT_CALL_AGAIN[next]);
      setDayOpen(false);
    }
    if (next !== "no_answer") setVoicemail(false);
  }

  function reset() {
    setSelection(null);
    setVoicemail(false);
    setCustomDay("");
    setAppointmentDay("");
    setAppointmentTime("");
    setDayOpen(false);
    setError(null);
    if (chosenTimerRef.current !== null) {
      window.clearTimeout(chosenTimerRef.current);
      chosenTimerRef.current = null;
    }
    setJustChosen(false);
  }

  function close() {
    reset();
    onClose();
  }

  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- CommandOutcome carries domain member types that cannot be made readonly
  function settle(result: Readonly<CommandOutcome>, message: string) {
    if (result.ok) {
      keyRef.current = null;
      publish({ source: "requests-output", tone: "status", message });
      close();
      router.refresh();
      return;
    }
    if (result.code === "unavailable") {
      setError(
        "The portal could not confirm whether that saved. Check Request history before repeating it; Try again will safely check the same attempt.",
      );
      return;
    }
    keyRef.current = null;
    if (result.code === "stale_version" || result.code === "illegal_transition") {
      setError(
        "Someone else worked this request just now. Nothing was saved; the line is updating.",
      );
      router.refresh();
      return;
    }
    setError("That did not save. Nothing was recorded, so it is safe to try again.");
  }

  function save() {
    if (selection === null || pending) return;
    keyRef.current ??= crypto.randomUUID();
    const common = {
      requestId: line.id,
      expectedVersion: line.version,
      idempotencyKey: keyRef.current,
    };

    if (selection === "booked") {
      if (booking === undefined) return;
      startTransition(async () => {
        const result = await confirmBookingHandoff({ ...common, appointment: booking });
        settle(result, `${line.name} is Scheduled.`);
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
          ? `${SELECTION_LABELS[selection]} recorded for ${line.name} — back ${followUpShortLabel(result.callAgainAt)}.`
          : `${SELECTION_LABELS[selection]} recorded for ${line.name}.`,
      );
    });
  }

  return (
    <PortalModal
      open={open}
      onClose={close}
      labelledBy={titleId}
      testId={panelId}
      className="portal-confirm-dialog portal-line-modal"
    >
      <header className="portal-line-modal-head">
        <div className="portal-line-modal-title">
          <h2 id={titleId} data-ui-redact="patient-name">
            {line.name}
          </h2>
          <p>
            {line.stamp === null ? null : <span className="portal-stamp">{line.stamp}</span>}
            <span>
              {line.preference} · {line.timing}
            </span>
          </p>
        </div>
        <button type="button" onClick={close} className="portal-confirm-dialog-close">
          Close
        </button>
      </header>

      <a
        href={telHref(line.phone)}
        className="portal-line-modal-call"
        data-ui-redact="patient-contact"
        aria-label={`Call ${line.name} at ${formatPhoneForDisplay(line.phone)}`}
      >
        <Phone className="h-4 w-4" aria-hidden="true" />
        {formatPhoneForDisplay(line.phone)}
      </a>

      <div className="portal-line-record">
        <fieldset className="portal-line-outcomes" disabled={pending || uncertain}>
          <legend>
            What happened
            <span className="sr-only" data-ui-redact="patient-name">
              {" "}
              with {line.name}
            </span>
            ?
          </legend>
          <div className="portal-choice-list">
            {SELECTIONS.map((key) => (
              <label key={key} className="portal-choice-row">
                <input
                  type="radio"
                  name={`${panelId}-outcome`}
                  value={key}
                  checked={selection === key}
                  data-testid={`line-outcome-${key}-${line.id}`}
                  onChange={() => {
                    choose(key);
                  }}
                  className="sr-only"
                />
                <span aria-hidden="true" className="portal-choice-indicator">
                  <Check className="portal-choice-check" />
                </span>
                <span className="portal-choice-copy">
                  <span className="portal-choice-label">{SELECTION_LABELS[key]}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <CallAgainBand
          lineId={line.id}
          panelId={panelId}
          selection={selection}
          disabled={pending || uncertain}
          voicemail={voicemail}
          onVoicemail={setVoicemail}
          callAgain={callAgain}
          onCallAgain={setCallAgain}
          customDay={customDay}
          onCustomDay={setCustomDay}
        />

        <div
          className="portal-line-reveal"
          data-open={selection === "booked"}
          inert={selection !== "booked"}
        >
          <div>
            <div className="portal-line-band">
              <fieldset className="portal-line-when" disabled={pending || uncertain}>
                <legend>When is the appointment?</legend>
                <button
                  ref={dayTriggerRef}
                  type="button"
                  aria-haspopup="dialog"
                  data-chosen={booking === undefined ? undefined : true}
                  data-just-chosen={justChosen || undefined}
                  data-testid={`line-appointment-open-${line.id}`}
                  className="portal-day-trigger"
                  onClick={() => {
                    setDayOpen(true);
                  }}
                >
                  <span>{appointmentSummary(appointmentDay, appointmentTime)}</span>
                  <small>{booking === undefined ? "Choose" : "Change"}</small>
                </button>
              </fieldset>
            </div>
          </div>
        </div>

        {error === null ? null : (
          <p
            role="alert"
            data-testid={`line-record-error-${line.id}`}
            className="portal-line-error"
          >
            {error}
          </p>
        )}

        <div className="portal-line-commit">
          <button
            type="button"
            disabled={!ready || pending}
            data-testid={`line-record-save-${line.id}`}
            className="btn btn-navy portal-line-save"
            onClick={save}
          >
            {pending ? "Saving…" : uncertain ? "Try again" : "Save"}
          </button>
          <button type="button" disabled={pending} className="portal-line-cancel" onClick={close}>
            Cancel
          </button>
        </div>
      </div>

      <footer className="portal-line-modal-foot">
        <Link href={`/admin/requests/${line.id}`}>
          Open full record
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </footer>

      {/* Last, deliberately. A nested dialog renders in the top layer, so its
          position here costs nothing visually — but it is still a DOM
          descendant of this modal, and it borrows this modal's control
          classes. Keeping it after the footer leaves the line's own Save and
          Cancel first in document order, so a selector scoped to the line
          modal reaches the line's controls rather than the day picker's. */}
      <AppointmentDayDialog
        lineId={line.id}
        open={dayOpen}
        originRef={dayTriggerRef}
        day={appointmentDay}
        time={appointmentTime}
        onCancel={() => {
          setDayOpen(false);
        }}
        onCommit={(day, time) => {
          setAppointmentDay(day);
          setAppointmentTime(time);
          setDayOpen(false);
          setJustChosen(true);
          if (chosenTimerRef.current !== null) window.clearTimeout(chosenTimerRef.current);
          chosenTimerRef.current = window.setTimeout(() => {
            setJustChosen(false);
            chosenTimerRef.current = null;
          }, 480);
        }}
      />
    </PortalModal>
  );
}

/* The return-day band: what a call that did not finish the job still owes.
 *
 * Two outcomes share it, so it opens for either and holds the voicemail note
 * in a fold of its own — a voicemail is something that happened during a
 * no-answer call, not a separate result. Every contact must name its own
 * return day, so a preset arrives already chosen and "Pick a day…" unfolds a
 * calendar in place. That month can afford the fold: it reaches ninety days,
 * not four hundred, and it sits in a band that is already open.
 */
function CallAgainBand({
  lineId,
  panelId,
  selection,
  disabled,
  voicemail,
  onVoicemail,
  callAgain,
  onCallAgain,
  customDay,
  onCustomDay,
}: Readonly<{
  lineId: string;
  panelId: string;
  selection: Selection | null;
  disabled: boolean;
  voicemail: boolean;
  onVoicemail: (next: boolean) => void;
  callAgain: CallAgainKind;
  onCallAgain: (next: CallAgainKind) => void;
  customDay: string;
  onCustomDay: (next: string) => void;
}>) {
  const owed = selection === "no_answer" || selection === "reached_follow_up";

  return (
    <div className="portal-line-reveal" data-open={owed} inert={!owed}>
      <div>
        <div className="portal-line-band">
          <div
            className="portal-line-reveal"
            data-open={selection === "no_answer"}
            inert={selection !== "no_answer"}
          >
            <div>
              <label className="portal-line-voicemail">
                <input
                  type="checkbox"
                  checked={voicemail}
                  disabled={disabled}
                  data-testid={`line-voicemail-${lineId}`}
                  onChange={(event) => {
                    onVoicemail(event.target.checked);
                  }}
                />
                <span>I left a voicemail</span>
              </label>
            </div>
          </div>
          <fieldset className="portal-line-when" disabled={disabled}>
            <legend>Call again</legend>
            <div className="portal-line-chips">
              {CALL_AGAIN_PRESETS.map((preset) => (
                <label key={preset.kind} className="portal-line-chip">
                  <input
                    type="radio"
                    name={`${panelId}-call-again`}
                    checked={callAgain === preset.kind}
                    data-testid={`line-call-again-${preset.kind}-${lineId}`}
                    onChange={() => {
                      onCallAgain(preset.kind);
                    }}
                    className="sr-only"
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
                    onCallAgain("day");
                  }}
                  className="sr-only"
                />
                <span>Pick a day…</span>
              </label>
            </div>
            <div
              className="portal-line-reveal"
              data-open={callAgain === "day"}
              inert={callAgain !== "day"}
            >
              <div>
                <div className="portal-line-day-pick">
                  <PortalCalendar
                    value={customDay}
                    min={practiceLocalDay(0)}
                    max={practiceLocalDay(90)}
                    today={practiceLocalDay(0)}
                    label="Call again on"
                    testId={`line-call-again-day-${lineId}`}
                    onSelect={onCustomDay}
                  />
                </div>
              </div>
            </div>
          </fieldset>
        </div>
      </div>
    </div>
  );
}

/* The day, brought forward.
 *
 * Picking a day is its own decision, and it used to be paid for by the line
 * modal: choosing "Appointment scheduled" unfolded a whole month into a
 * dialog already at its height ceiling, so the month arrived clipped, inside
 * a scroll region that appeared under the reader mid-fold. A month is not a
 * detail of the outcome question; it is the next question. So it gets the
 * portal's one modal, nested in the top layer above the line.
 *
 * What differs from every other portal modal is where it comes from. The
 * trigger's centre becomes the dialog's transform origin — a point outside
 * the dialog's own box — so the registry spring's scale reads as the month
 * growing out of the control that was pressed, and the registry exit shrinks
 * it back to the same point. It leaves the way it came.
 *
 * The draft is local and only commits on "Use this day", so an accidental
 * open costs nothing and Escape is always a safe answer. Escape and Cancel
 * both return focus to the trigger, which the platform does for free.
 */
function AppointmentDayDialog({
  lineId,
  open,
  originRef,
  day,
  time,
  onCancel,
  onCommit,
}: Readonly<{
  lineId: string;
  open: boolean;
  originRef: RefObject<HTMLButtonElement | null>;
  day: string;
  time: string;
  onCancel: () => void;
  onCommit: (day: string, time: string) => void;
}>) {
  const titleId = useId();
  const [draftDay, setDraftDay] = useState(day);
  const [draftTime, setDraftTime] = useState(time);

  /* Seed the draft from the committed answer each time the dialog opens, so
     a cancelled edit leaves nothing behind. */
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setDraftDay(day);
      setDraftTime(time);
    }
  }

  const chosen = appointmentChoice(draftDay, draftTime);

  return (
    <PortalModal
      open={open}
      onClose={onCancel}
      labelledBy={titleId}
      originRef={originRef}
      testId={`line-appointment-dialog-${lineId}`}
      className="portal-confirm-dialog portal-day-dialog"
    >
      <div className="portal-day-dialog-body">
        <header className="portal-day-dialog-head">
          <h2 id={titleId}>When is the appointment?</h2>
          <button type="button" onClick={onCancel} className="portal-confirm-dialog-close">
            Close
          </button>
        </header>

        <PortalCalendar
          value={draftDay}
          min={practiceLocalDay(0)}
          max={practiceLocalDay(400)}
          today={practiceLocalDay(0)}
          label="Appointment day"
          testId={`line-appointment-day-${lineId}`}
          onSelect={setDraftDay}
        />

        <label className="portal-line-time">
          <span>Time</span>
          <input
            type="time"
            required
            value={draftTime}
            data-testid={`line-appointment-time-${lineId}`}
            onChange={(event) => {
              setDraftTime(event.target.value);
            }}
            className="portal-line-date"
          />
        </label>

        <div className="portal-day-dialog-actions">
          <button
            type="button"
            disabled={chosen === undefined}
            data-testid={`line-appointment-commit-${lineId}`}
            className="btn btn-navy portal-line-save"
            onClick={() => {
              onCommit(draftDay, draftTime);
            }}
          >
            Use this day
          </button>
          <button type="button" className="portal-line-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </PortalModal>
  );
}
