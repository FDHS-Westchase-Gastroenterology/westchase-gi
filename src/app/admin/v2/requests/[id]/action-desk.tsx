"use client";

// The action desk: the machine's verbs, spoken as the front desk speaks.
// One verb opens at a time; the desk's interaction state is a single
// reducer, and each save carries the version the staff member viewed —
// so a colleague's concurrent save surfaces as a truthful conflict,
// never a silent overwrite. Terminal saves land as a stamp; the
// 15-minute Undo keeps corrections cheap.

import {
  useReducer,
  useRef,
  useState,
  useId,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  callAgainDayInBounds,
  type ContactOutcome,
  type RequestCommand,
  type UnbookedClosureReason,
} from "@/lib/portal/appointment-request-machine";
import { dayLabel, practiceToday, timeLabel } from "../../prototype/format";
import {
  duePhrase,
  entryLine,
  lastAttemptLine,
  newRequestLine,
  resolutionLine,
} from "../../prototype/lines";
import type { HistoryEntry, PrototypeRequest } from "../../prototype/types";
import { useStoreApi } from "../../prototype/store";

type Verb = "log" | "scheduled" | "close" | "classify" | "reopen" | "note";

function addDays(today: string, days: number): string {
  return new Date(Date.parse(`${today}T12:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/* ------------------------------------------------------------------ *
   Desk state: one reducer for the open verb, its fields, and the
   problem/conflict rails. Opening a verb resets everything.
 * ------------------------------------------------------------------ */

type DeskState = {
  verb: Verb | null;
  outcome: ContactOutcome | null;
  /** "none" | "custom" | a YYYY-MM-DD day. */
  dayChoice: string | null;
  customDay: string;
  note: string;
  closeReason: UnbookedClosureReason | null;
  classifyResult: "booked" | UnbookedClosureReason | null;
  problem: string | null;
  conflict: { latest: HistoryEntry | null } | null;
};

const DESK_CLOSED: DeskState = {
  verb: null,
  outcome: null,
  dayChoice: null,
  customDay: "",
  note: "",
  closeReason: null,
  classifyResult: null,
  problem: null,
  conflict: null,
};

type DeskEvent =
  | { type: "toggle"; verb: Verb }
  | {
      type: "field";
      patch: Partial<
        Pick<
          DeskState,
          | "outcome"
          | "dayChoice"
          | "customDay"
          | "note"
          | "closeReason"
          | "classifyResult"
        >
      >;
    }
  | { type: "problem"; message: string }
  | { type: "conflict"; latest: HistoryEntry | null }
  | { type: "conflict_acknowledged" }
  | { type: "saved" };

function deskReducer(state: DeskState, event: DeskEvent): DeskState {
  switch (event.type) {
    case "toggle":
      return state.verb === event.verb
        ? DESK_CLOSED
        : { ...DESK_CLOSED, verb: event.verb };
    case "field": {
      const next = { ...state, ...event.patch, problem: null };
      // Voicemail and no-answer require a day (§5.1); drop a stale "none".
      if (next.outcome !== "reached_follow_up" && next.dayChoice === "none") {
        next.dayChoice = null;
      }
      return next;
    }
    case "problem":
      return { ...state, problem: event.message };
    case "conflict":
      return { ...state, conflict: { latest: event.latest }, problem: null };
    case "conflict_acknowledged":
      return { ...state, conflict: null };
    case "saved":
      return DESK_CLOSED;
  }
}

/* ---------------------------------- shared pieces ----------------- */

function Chip({
  name,
  checked,
  onChange,
  children,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label className="ds-chip">
      <input
        type="radio"
        name={name}
        className="sr-only"
        checked={checked}
        onChange={onChange}
      />
      {children}
    </label>
  );
}

function PanelNote({
  value,
  onChange,
  label = "Anything worth remembering (optional)",
}: {
  value: string;
  onChange: (next: string) => void;
  label?: string;
}) {
  const id = useId();
  return (
    <div className="mt-4">
      <label
        htmlFor={id}
        className="mb-1.5 block text-[0.85rem] font-semibold text-[var(--ds-faint)]"
      >
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={2}
        maxLength={2000}
        className="ds-input resize-y"
      />
    </div>
  );
}

function Fieldset({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="mt-4 first:mt-0">
      <legend className="mb-2 text-[0.85rem] font-semibold text-[var(--ds-faint)]">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function VerbButton({
  verb,
  open,
  onToggle,
  children,
}: {
  verb: Verb;
  open: Verb | null;
  onToggle: (verb: Verb) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="ds-verb"
      aria-expanded={open === verb}
      onClick={() => onToggle(verb)}
    >
      {children}
    </button>
  );
}

/* ---------------------------------- verb panels ------------------- */

function LogCallPanel({
  desk,
  dispatch,
  today,
  onSubmit,
}: {
  desk: DeskState;
  dispatch: (event: DeskEvent) => void;
  today: string;
  onSubmit: (event: FormEvent) => void;
}) {
  const dayOptions = [1, 2, 7, 14].map((offset) => {
    const day = addDays(today, offset);
    return {
      day,
      label:
        offset === 7
          ? "In a week"
          : offset === 14
            ? "In two weeks"
            : capitalize(dayLabel(day, today)),
    };
  });

  return (
    <form onSubmit={onSubmit} className="ds-panel mt-4">
      <Fieldset legend="How did it go?">
        {(
          [
            ["reached_follow_up", "Reached the patient"],
            ["voicemail", "Left a voicemail"],
            ["no_answer", "No answer"],
          ] as const
        ).map(([value, label]) => (
          <Chip
            key={value}
            name="outcome"
            checked={desk.outcome === value}
            onChange={() => dispatch({ type: "field", patch: { outcome: value } })}
          >
            {label}
          </Chip>
        ))}
      </Fieldset>

      <Fieldset legend="When should we call again?">
        {dayOptions.map((option) => (
          <Chip
            key={option.day}
            name="call-again"
            checked={desk.dayChoice === option.day}
            onChange={() =>
              dispatch({ type: "field", patch: { dayChoice: option.day } })
            }
          >
            {option.label}
          </Chip>
        ))}
        <Chip
          name="call-again"
          checked={desk.dayChoice === "custom"}
          onChange={() => dispatch({ type: "field", patch: { dayChoice: "custom" } })}
        >
          Pick a day
        </Chip>
        {desk.outcome === "reached_follow_up" ? (
          <Chip
            name="call-again"
            checked={desk.dayChoice === "none"}
            onChange={() => dispatch({ type: "field", patch: { dayChoice: "none" } })}
          >
            No call-again day
          </Chip>
        ) : null}
      </Fieldset>

      {desk.dayChoice === "custom" ? (
        <div className="mt-3">
          <label
            htmlFor="custom-day"
            className="mb-1.5 block text-[0.85rem] font-semibold text-[var(--ds-faint)]"
          >
            Call again on
          </label>
          <input
            id="custom-day"
            type="date"
            value={desk.customDay}
            min={today}
            max={addDays(today, 90)}
            onChange={(event) =>
              dispatch({ type: "field", patch: { customDay: event.target.value } })
            }
            className="ds-input max-w-xs"
          />
        </div>
      ) : null}

      <PanelNote
        value={desk.note}
        onChange={(note) => dispatch({ type: "field", patch: { note } })}
      />

      <button type="submit" className="ds-btn ds-btn-pen mt-4">
        Save call
      </button>
    </form>
  );
}

/** Scheduled and Reopen share a shape: explanation, note, one button. */
function ConfirmPanel({
  desk,
  dispatch,
  body,
  cta,
  onSubmit,
}: {
  desk: DeskState;
  dispatch: (event: DeskEvent) => void;
  body: string;
  cta: string;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="ds-panel mt-4">
      <p className="max-w-[60ch] text-[0.92rem] leading-relaxed text-[var(--ds-body)]">
        {body}
      </p>
      <PanelNote
        value={desk.note}
        onChange={(note) => dispatch({ type: "field", patch: { note } })}
      />
      <button type="submit" className="ds-btn ds-btn-pen mt-4">
        {cta}
      </button>
    </form>
  );
}

function ClosePanel({
  desk,
  dispatch,
  onSubmit,
}: {
  desk: DeskState;
  dispatch: (event: DeskEvent) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="ds-panel mt-4">
      <Fieldset legend="Why is this closing without an appointment?">
        <Chip
          name="close-reason"
          checked={desk.closeReason === "wont_schedule"}
          onChange={() =>
            dispatch({ type: "field", patch: { closeReason: "wont_schedule" } })
          }
        >
          Patient won&rsquo;t schedule
        </Chip>
        <Chip
          name="close-reason"
          checked={desk.closeReason === "not_actionable"}
          onChange={() =>
            dispatch({ type: "field", patch: { closeReason: "not_actionable" } })
          }
        >
          Duplicate or not actionable
        </Chip>
      </Fieldset>
      <PanelNote
        value={desk.note}
        onChange={(note) => dispatch({ type: "field", patch: { note } })}
      />
      <button type="submit" className="ds-btn ds-btn-pen mt-4">
        Close request
      </button>
    </form>
  );
}

function ClassifyPanel({
  desk,
  dispatch,
  onSubmit,
}: {
  desk: DeskState;
  dispatch: (event: DeskEvent) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="ds-panel mt-4">
      <Fieldset legend="How did this one actually end?">
        {(
          [
            ["booked", "The appointment was booked"],
            ["wont_schedule", "Patient wouldn’t schedule"],
            ["not_actionable", "Duplicate or not actionable"],
          ] as const
        ).map(([value, label]) => (
          <Chip
            key={value}
            name="classify"
            checked={desk.classifyResult === value}
            onChange={() =>
              dispatch({ type: "field", patch: { classifyResult: value } })
            }
          >
            {label}
          </Chip>
        ))}
      </Fieldset>
      <p className="mt-3 text-[0.85rem] text-[var(--ds-faint)]">
        This completes the record for a request closed before outcomes were
        tracked. It can&rsquo;t be undone.
      </p>
      <PanelNote
        value={desk.note}
        onChange={(note) => dispatch({ type: "field", patch: { note } })}
      />
      <button type="submit" className="ds-btn ds-btn-pen mt-4">
        Save the record
      </button>
    </form>
  );
}

/* ---------------------------------- status sentence --------------- */

function StatusLine({
  request,
  today,
}: {
  request: PrototypeRequest;
  today: string;
}) {
  const { snapshot } = request;
  if (snapshot.state === "NEW") {
    return (
      <p className="text-[0.98rem] leading-relaxed text-[var(--ds-body)]">
        <strong className="text-[var(--ds-flag)]">Not yet called.</strong>{" "}
        {newRequestLine(request, today).text}.
      </p>
    );
  }
  if (snapshot.state === "CONTACTED") {
    const attempt = lastAttemptLine(request, today);
    if (snapshot.callAgainDay === null) {
      return (
        <p className="text-[0.98rem] leading-relaxed text-[var(--ds-body)]">
          {attempt ? `${attempt}. ` : ""}
          <strong className="text-[var(--ds-flag)]">
            No call-again day — decide what happens next.
          </strong>
        </p>
      );
    }
    const isDue = snapshot.callAgainDay <= today;
    return (
      <p className="text-[0.98rem] leading-relaxed text-[var(--ds-body)]">
        {attempt ? `${attempt}. ` : ""}
        {isDue ? (
          <strong className="text-[var(--ds-flag)]">
            {capitalize(duePhrase(snapshot.callAgainDay, today))}.
          </strong>
        ) : (
          `Call again ${dayLabel(snapshot.callAgainDay, today)}.`
        )}
      </p>
    );
  }
  if (snapshot.state === "CLOSED" && snapshot.legacyReviewRequired) {
    return (
      <p className="text-[0.98rem] leading-relaxed text-[var(--ds-body)]">
        <strong className="text-[var(--ds-flag)]">
          Closed in the previous system before outcomes were recorded — record
          how it ended.
        </strong>
      </p>
    );
  }
  return (
    <p className="text-[0.98rem] leading-relaxed text-[var(--ds-body)]">
      {resolutionLine(request, today)}.
      {snapshot.state === "BOOKED"
        ? " The visit itself lives in the scheduling system."
        : ""}
    </p>
  );
}

/* ---------------------------------- the desk ---------------------- */

export function ActionDesk({ request }: { request: PrototypeRequest }) {
  const store = useStoreApi();
  const today = practiceToday(new Date());
  const { snapshot } = request;

  const [desk, dispatch] = useReducer(deskReducer, DESK_CLOSED);
  // The version this desk acts against — captured when a verb opens,
  // refreshed when a conflict is acknowledged. Handler-only, so a ref.
  const viewedVersion = useRef(snapshot.version);
  // Version of a terminal save made here — drives the stamp settle.
  const [stampedVersion, setStampedVersion] = useState<number | null>(null);

  const toggle = (verb: Verb) => {
    viewedVersion.current = snapshot.version;
    dispatch({ type: "toggle", verb });
  };

  const run = (command: RequestCommand) => {
    const result = store.command(
      request.id,
      viewedVersion.current,
      command,
      desk.note.trim() ? desk.note.trim() : null,
    );
    if (result.ok) {
      if (result.snapshot.state === "BOOKED" || result.snapshot.state === "CLOSED") {
        setStampedVersion(result.snapshot.version);
      }
      dispatch({ type: "saved" });
      return;
    }
    if (result.error === "conflict") {
      dispatch({ type: "conflict", latest: result.latest });
      return;
    }
    dispatch({ type: "problem", message: result.message });
  };

  const submitLog = (event: FormEvent) => {
    event.preventDefault();
    if (!desk.outcome) {
      dispatch({ type: "problem", message: "Pick how the call went first." });
      return;
    }
    const day =
      desk.dayChoice === "none"
        ? null
        : desk.dayChoice === "custom"
          ? desk.customDay
          : desk.dayChoice;
    if (!day && desk.outcome !== "reached_follow_up") {
      dispatch({
        type: "problem",
        message: "Voicemail and no-answer calls need a call-again day.",
      });
      return;
    }
    if (!day && desk.dayChoice === null) {
      dispatch({
        type: "problem",
        message: "Pick a call-again day, or choose “No call-again day.”",
      });
      return;
    }
    if (day && !callAgainDayInBounds(day, today)) {
      dispatch({
        type: "problem",
        message: "Pick a day between today and 90 days out.",
      });
      return;
    }
    run({ kind: "record_contact_attempt", outcome: desk.outcome, callAgainDay: day });
  };

  const submitNote = (event: FormEvent) => {
    event.preventDefault();
    if (store.addNote(request.id, desk.note).ok) {
      dispatch({ type: "saved" });
    } else {
      dispatch({
        type: "problem",
        message: "Write the note first — up to 2,000 characters.",
      });
    }
  };

  const undo = store.undoAvailability(request.id);
  const working = snapshot.state === "NEW" || snapshot.state === "CONTACTED";
  const terminal = snapshot.state === "BOOKED" || snapshot.state === "CLOSED";

  return (
    <section aria-label="Work this request" className="mt-6">
      {/* Status: one sentence, plus the stamp when the work is done. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {terminal ? (
          <span
            style={{ "--ds-stamp-rotate": "-2deg" } as React.CSSProperties}
            className={`ds-stamp text-[0.78rem] ${
              snapshot.state === "BOOKED" ? "ds-stamp-booked" : "ds-stamp-closed"
            } ${stampedVersion === snapshot.version ? "ds-stamp-settle" : ""}`}
          >
            {snapshot.state === "BOOKED" ? "Scheduled" : "Closed"}
          </span>
        ) : null}
        <StatusLine request={request} today={today} />
      </div>

      {/* Undo: corrections are cheap for 15 minutes. */}
      {undo.available ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-[var(--ds-rule)] py-2">
          <p className="text-[0.85rem] text-[var(--ds-faint)]">
            The last save can be undone until {timeLabel(undo.untilIso)}.
          </p>
          <button
            type="button"
            onClick={() => {
              const result = store.undo(request.id);
              if (!result.ok) dispatch({ type: "problem", message: result.message });
            }}
            className="ds-btn ds-btn-quiet !min-h-9 px-3 text-[0.85rem]"
          >
            Undo
          </button>
        </div>
      ) : null}

      {/* The verbs. */}
      <div
        role="group"
        aria-label="Actions"
        className="mt-4 flex flex-wrap gap-x-2 border-b border-[var(--ds-rule)]"
      >
        {working ? (
          <>
            <VerbButton verb="log" open={desk.verb} onToggle={toggle}>
              Log a call
            </VerbButton>
            <VerbButton verb="scheduled" open={desk.verb} onToggle={toggle}>
              Scheduled
            </VerbButton>
            <VerbButton verb="close" open={desk.verb} onToggle={toggle}>
              Close
            </VerbButton>
          </>
        ) : null}
        {snapshot.state === "CLOSED" && snapshot.legacyReviewRequired ? (
          <VerbButton verb="classify" open={desk.verb} onToggle={toggle}>
            Record how it ended
          </VerbButton>
        ) : null}
        {terminal ? (
          <VerbButton verb="reopen" open={desk.verb} onToggle={toggle}>
            Reopen
          </VerbButton>
        ) : null}
        <VerbButton verb="note" open={desk.verb} onToggle={toggle}>
          Add a note
        </VerbButton>
      </div>

      {/* A colleague got there first: the truthful conflict, not a swallow. */}
      {desk.conflict !== null || desk.problem !== null ? (
        <div className="mt-3" role="status">
          {desk.conflict !== null ? (
            <div className="rounded-[var(--ds-radius)] bg-[var(--ds-flag-soft)] px-4 py-3">
              <p className="text-[0.9rem] font-semibold text-[var(--ds-ink)]">
                {desk.conflict.latest
                  ? `${desk.conflict.latest.actor} worked this request while this page was open — ${entryLine(desk.conflict.latest, today).toLowerCase()}.`
                  : "A colleague worked this request while this page was open."}
              </p>
              <p className="mt-1 text-[0.85rem] text-[var(--ds-body)]">
                Nothing was saved. The page below now shows the latest — if your
                entry still applies, save it again.
              </p>
              <button
                type="button"
                onClick={() => {
                  viewedVersion.current = snapshot.version;
                  dispatch({ type: "conflict_acknowledged" });
                }}
                className="ds-btn ds-btn-quiet mt-2 !min-h-9 px-3 text-[0.85rem]"
              >
                Got it — work from the latest
              </button>
            </div>
          ) : (
            <p className="text-[0.9rem] font-semibold text-[var(--ds-flag)]">
              {desk.problem}
            </p>
          )}
        </div>
      ) : null}

      {/* One panel at a time. */}
      {desk.verb === "log" ? (
        <LogCallPanel desk={desk} dispatch={dispatch} today={today} onSubmit={submitLog} />
      ) : null}
      {desk.verb === "scheduled" ? (
        <ConfirmPanel
          desk={desk}
          dispatch={dispatch}
          body="Mark this request scheduled because the appointment is now booked in the scheduling system. The request is done here; the visit lives there."
          cta="Mark scheduled"
          onSubmit={(event) => {
            event.preventDefault();
            run({ kind: "confirm_booking_handoff" });
          }}
        />
      ) : null}
      {desk.verb === "close" ? (
        <ClosePanel
          desk={desk}
          dispatch={dispatch}
          onSubmit={(event) => {
            event.preventDefault();
            if (!desk.closeReason) {
              dispatch({ type: "problem", message: "Pick why this is closing." });
              return;
            }
            run({ kind: "close_request", reason: desk.closeReason });
          }}
        />
      ) : null}
      {desk.verb === "classify" ? (
        <ClassifyPanel
          desk={desk}
          dispatch={dispatch}
          onSubmit={(event) => {
            event.preventDefault();
            if (!desk.classifyResult) {
              dispatch({ type: "problem", message: "Pick how it actually ended." });
              return;
            }
            run({
              kind: "classify_legacy_closure",
              classification:
                desk.classifyResult === "booked"
                  ? { kind: "booked" }
                  : { kind: "unbooked", reason: desk.classifyResult },
            });
          }}
        />
      ) : null}
      {desk.verb === "reopen" ? (
        <ConfirmPanel
          desk={desk}
          dispatch={dispatch}
          body={
            snapshot.state === "BOOKED"
              ? "The appointment fell through, or this was marked scheduled by mistake. Reopening puts the request back in the working queue."
              : "Reopening puts this request back in the working queue. Everything already recorded stays on the ledger."
          }
          cta="Reopen request"
          onSubmit={(event) => {
            event.preventDefault();
            run({ kind: "reopen_request" });
          }}
        />
      ) : null}
      {desk.verb === "note" ? (
        <form onSubmit={submitNote} className="ds-panel mt-4">
          <PanelNote
            value={desk.note}
            onChange={(note) => dispatch({ type: "field", patch: { note } })}
            label="The note joins the ledger — it never changes the status"
          />
          <button type="submit" className="ds-btn ds-btn-pen mt-4">
            Add note
          </button>
        </form>
      ) : null}
    </section>
  );
}
