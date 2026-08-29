"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RefObject } from "react";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import { Check, ChevronRight, Phone } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
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
 * Every outcome's dated question is answered the same way. Each band holds
 * one line — the day chosen so far — and pressing it brings the month
 * forward as a nested dialog that grows out of that line. The grammar used
 * to split: call-again days unfolded chips and a month in place while the
 * appointment day came forward as a dialog, and the in-place month arrived
 * clipped inside a modal already at its height ceiling. Now the calendar is
 * the one answer to "when", learned once. The call-again dialog keeps the
 * three presets as chips above its month, so the common days stay one press,
 * and a single press is the whole answer there — the dialog commits and
 * departs on the pick, no confirm step, while the appointment dialog keeps
 * its "Use this day" because it collects a time as well. See
 * CallAgainDayDialog and AppointmentDayDialog at the foot of this file.
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

/* What the closed call-again line says: the preset's own words, or the picked
   day spelled out. A default preset is always standing, so unlike the booking
   trigger this line never has to ask its question as a prompt. */
function callAgainSummary(kind: CallAgainKind, day: string): string {
  if (kind !== "day") {
    return CALL_AGAIN_PRESETS.find((preset) => preset.kind === kind)?.label ?? "";
  }
  return isValidCustomCallAgainDay(day)
    ? APPOINTMENT_DAY_LABEL.format(new Date(`${day}T00:00:00Z`))
    : "Pick a day";
}

/* The mint landing a trigger flashes when its dialog hands a choice back.
   Stamped for the length of the animation, then removed, so it never replays
   on re-render; `clear` belongs in the owning form's reset. */
function useJustChosen() {
  const timerRef = useRef<number | null>(null);
  const [stamped, setStamped] = useState(false);
  return {
    stamped,
    stamp: () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      setStamped(true);
      timerRef.current = window.setTimeout(() => {
        setStamped(false);
        timerRef.current = null;
      }, 480);
    },
    clear: () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setStamped(false);
    },
  };
}

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
    <Item render={<li />} variant="outline" className="portal-sheet-row">
      {/* The whole line is the target: this button stretches an invisible hit
          area across the Item, so a press anywhere that is not the phone
          number lifts the line into its modal. Focus rings the name block. */}
      <button
        type="button"
        data-testid={`line-open-${line.id}`}
        aria-haspopup="dialog"
        className="portal-sheet-open basis-full min-[60rem]:flex-1 min-[60rem]:basis-auto"
        onClick={show}
      >
        <ItemContent>
          <ItemTitle className="portal-sheet-name text-base font-semibold tracking-[-0.01em]">
            <span data-ui-redact="patient-name">{line.name}</span>
            <ChevronRight className="portal-sheet-disclosure h-4 w-4" aria-hidden="true" />
          </ItemTitle>
          <ItemDescription>{line.preference}</ItemDescription>
        </ItemContent>
      </button>
      <a
        href={telHref(line.phone)}
        className="portal-sheet-phone min-[60rem]:w-44"
        data-ui-redact="patient-contact"
        aria-label={`Call ${line.name} at ${formatPhoneForDisplay(line.phone)}`}
      >
        <Phone className="portal-sheet-phone-icon h-3.5 w-3.5" aria-hidden="true" />
        {formatPhoneForDisplay(line.phone)}
      </a>
      <ItemActions className="portal-sheet-when ml-auto min-[60rem]:w-48">
        {line.stamp === null ? null : <span className="portal-stamp">{line.stamp}</span>}
        <span>{line.timing}</span>
      </ItemActions>
      {everOpened ? (
        <LineRecordModal
          line={line}
          open={open}
          onClose={() => {
            setOpen(false);
          }}
        />
      ) : null}
    </Item>
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
  const [callAgainOpen, setCallAgainOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keyRef = useRef<string | null>(null);
  const dayTriggerRef = useRef<HTMLButtonElement>(null);
  const callAgainTriggerRef = useRef<HTMLButtonElement>(null);
  const bookingChosen = useJustChosen();
  const callAgainChosen = useJustChosen();
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
      setCustomDay("");
      setDayOpen(false);
    } else {
      setCallAgainOpen(false);
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
    setCallAgainOpen(false);
    setError(null);
    bookingChosen.clear();
    callAgainChosen.clear();
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
          selection={selection}
          disabled={pending || uncertain}
          voicemail={voicemail}
          onVoicemail={setVoicemail}
          summary={callAgainSummary(callAgain, customDay)}
          justChosen={callAgainChosen.stamped}
          triggerRef={callAgainTriggerRef}
          onOpen={() => {
            setCallAgainOpen(true);
          }}
        />

        <BookedBand
          lineId={line.id}
          selection={selection}
          disabled={pending || uncertain}
          summary={appointmentSummary(appointmentDay, appointmentTime)}
          chosen={booking !== undefined}
          justChosen={bookingChosen.stamped}
          triggerRef={dayTriggerRef}
          onOpen={() => {
            setDayOpen(true);
          }}
        />

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
          <Button
            type="button"
            disabled={!ready || pending}
            data-testid={`line-record-save-${line.id}`}
            className="portal-line-save"
            onClick={save}
          >
            {pending ? "Saving…" : uncertain ? "Try again" : "Save"}
          </Button>
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

      {/* Last, deliberately. Nested dialogs render in the top layer, so their
          position here costs nothing visually — but they are still DOM
          descendants of this modal, and they borrow this modal's control
          classes. Keeping them after the footer leaves the line's own Save and
          Cancel first in document order, so a selector scoped to the line
          modal reaches the line's controls rather than the day pickers'. */}
      <CallAgainDayDialog
        lineId={line.id}
        panelId={panelId}
        open={callAgainOpen}
        originRef={callAgainTriggerRef}
        kind={callAgain}
        day={customDay}
        onCancel={() => {
          setCallAgainOpen(false);
        }}
        onCommit={(kind, day) => {
          setCallAgain(kind);
          setCustomDay(day);
        }}
        onSettled={() => {
          setCallAgainOpen(false);
          callAgainChosen.stamp();
        }}
      />
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
          bookingChosen.stamp();
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
 * return day, so the day each outcome usually means arrives already chosen
 * and the band holds one line stating it. Pressing the line brings the
 * calendar forward — the same nested-dialog answer the booked band gives,
 * so "when" is asked one way everywhere. See CallAgainDayDialog below.
 */
function CallAgainBand({
  lineId,
  selection,
  disabled,
  voicemail,
  onVoicemail,
  summary,
  justChosen,
  triggerRef,
  onOpen,
}: Readonly<{
  lineId: string;
  selection: Selection | null;
  disabled: boolean;
  voicemail: boolean;
  onVoicemail: (next: boolean) => void;
  summary: string;
  justChosen: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onOpen: () => void;
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
            <button
              ref={triggerRef}
              type="button"
              aria-haspopup="dialog"
              data-chosen={true}
              data-just-chosen={justChosen || undefined}
              data-testid={`line-call-again-open-${lineId}`}
              className="portal-day-trigger"
              onClick={onOpen}
            >
              <span>{summary}</span>
              <small>Change</small>
            </button>
          </fieldset>
        </div>
      </div>
    </div>
  );
}

/* The booked band: one line stating the appointment day and time chosen so
   far. Unlike the call-again line it starts as a prompt — no honest default
   exists for an appointment — so it earns its navy "chosen" ink only once
   the dialog has handed a day back. */
function BookedBand({
  lineId,
  selection,
  disabled,
  summary,
  chosen,
  justChosen,
  triggerRef,
  onOpen,
}: Readonly<{
  lineId: string;
  selection: Selection | null;
  disabled: boolean;
  summary: string;
  chosen: boolean;
  justChosen: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onOpen: () => void;
}>) {
  return (
    <div
      className="portal-line-reveal"
      data-open={selection === "booked"}
      inert={selection !== "booked"}
    >
      <div>
        <div className="portal-line-band">
          <fieldset className="portal-line-when" disabled={disabled}>
            <legend>When is the appointment?</legend>
            <button
              ref={triggerRef}
              type="button"
              aria-haspopup="dialog"
              data-chosen={chosen || undefined}
              data-just-chosen={justChosen || undefined}
              data-testid={`line-appointment-open-${lineId}`}
              className="portal-day-trigger"
              onClick={onOpen}
            >
              <span>{summary}</span>
              <small>{chosen ? "Change" : "Choose"}</small>
            </button>
          </fieldset>
        </div>
      </div>
    </div>
  );
}

/* The return day, brought forward the same way the appointment day is.
 *
 * One question, both of its honest answers on one surface: the three days
 * the desk actually says — this afternoon, tomorrow morning, Friday — as
 * chips above the month for any other day within ninety. A single press is
 * the whole answer here (there is no time to collect), so the dialog
 * commits on the pick and departs after the pick's settle has had its
 * 150ms — long enough to read as "taken", never as a wait. Cancel and
 * Escape stay free: the standing choice only changes when a chip or a day
 * is pressed.
 */
function CallAgainDayDialog({
  lineId,
  panelId,
  open,
  originRef,
  kind,
  day,
  onCancel,
  onCommit,
  onSettled,
}: Readonly<{
  lineId: string;
  panelId: string;
  open: boolean;
  originRef: RefObject<HTMLButtonElement | null>;
  kind: CallAgainKind;
  day: string;
  onCancel: () => void;
  onCommit: (kind: CallAgainKind, day: string) => void;
  onSettled: () => void;
}>) {
  const titleId = useId();
  const settleRef = useRef<number | null>(null);

  /* The departure timer lives and dies with the dialog: closed early by
     Escape or Cancel, nothing left behind fires later. */
  useEffect(() => {
    if (open) return;
    if (settleRef.current !== null) {
      window.clearTimeout(settleRef.current);
      settleRef.current = null;
    }
  }, [open]);

  function pick(nextKind: CallAgainKind, nextDay: string) {
    onCommit(nextKind, nextDay);
    if (settleRef.current !== null) window.clearTimeout(settleRef.current);
    settleRef.current = window.setTimeout(() => {
      settleRef.current = null;
      onSettled();
    }, 200);
  }

  return (
    <PortalModal
      open={open}
      onClose={onCancel}
      labelledBy={titleId}
      originRef={originRef}
      testId={`line-call-again-dialog-${lineId}`}
      className="portal-confirm-dialog portal-day-dialog"
    >
      <div className="portal-day-dialog-body">
        <header className="portal-day-dialog-head">
          <h2 id={titleId}>When should we call again?</h2>
          <button type="button" onClick={onCancel} className="portal-confirm-dialog-close">
            Close
          </button>
        </header>

        <div className="portal-line-chips">
          {CALL_AGAIN_PRESETS.map((preset) => (
            <label key={preset.kind} className="portal-line-chip">
              <input
                type="radio"
                name={`${panelId}-call-again`}
                checked={kind === preset.kind}
                data-testid={`line-call-again-${preset.kind}-${lineId}`}
                onChange={() => {
                  pick(preset.kind, "");
                }}
                className="sr-only"
              />
              <span>{preset.label}</span>
            </label>
          ))}
        </div>

        <p className="portal-day-dialog-or" aria-hidden="true">
          or pick a day
        </p>

        <PortalCalendar
          value={kind === "day" ? day : ""}
          min={practiceLocalDay(0)}
          max={practiceLocalDay(90)}
          today={practiceLocalDay(0)}
          label="Call again on"
          testId={`line-call-again-day-${lineId}`}
          onSelect={(picked) => {
            pick("day", picked);
          }}
        />

        <div className="portal-day-dialog-actions">
          <button type="button" className="portal-line-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </PortalModal>
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
          <Button
            type="button"
            disabled={chosen === undefined}
            data-testid={`line-appointment-commit-${lineId}`}
            className="portal-line-save"
            onClick={() => {
              onCommit(draftDay, draftTime);
            }}
          >
            Use this day
          </Button>
          <button type="button" className="portal-line-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </PortalModal>
  );
}
