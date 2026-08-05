"use client";

// The action desk: the machine's verbs, spoken as the front desk speaks.
// One verb opens at a time; each panel captures the version the staff
// member is looking at, so a colleague's concurrent save surfaces as a
// truthful conflict — never a silent overwrite. Terminal saves land as a
// stamp; the 15-minute Undo keeps corrections cheap.

import { useId, useState, type FormEvent, type ReactNode } from "react";
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

/* ---------------------------------------------------------------- */

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

function Fieldset({
  legend,
  children,
}: {
  legend: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="mt-4 first:mt-0">
      <legend className="mb-2 text-[0.85rem] font-semibold text-[var(--ds-faint)]">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

/* ---------------------------------------------------------------- */

export function ActionDesk({ request }: { request: PrototypeRequest }) {
  const store = useStoreApi();
  const today = practiceToday(new Date());
  const { snapshot } = request;

  const [verb, setVerb] = useState<Verb | null>(null);
  // The version this desk is acting against — captured when a verb opens.
  const [viewedVersion, setViewedVersion] = useState(snapshot.version);
  const [conflict, setConflict] = useState<{ latest: HistoryEntry | null } | null>(
    null,
  );
  const [problem, setProblem] = useState<string | null>(null);
  // Version of a terminal save made here — drives the stamp settle.
  const [stampedVersion, setStampedVersion] = useState<number | null>(null);

  // Log-a-call fields.
  const [outcome, setOutcome] = useState<ContactOutcome | null>(null);
  const [dayChoice, setDayChoice] = useState<string | null>(null);
  const [customDay, setCustomDay] = useState("");
  // Shared optional note rider.
  const [note, setNote] = useState("");
  // Close / classify choices.
  const [closeReason, setCloseReason] = useState<UnbookedClosureReason | null>(null);
  const [classifyResult, setClassifyResult] = useState<
    "booked" | UnbookedClosureReason | null
  >(null);

  const open = (next: Verb) => {
    setVerb(verb === next ? null : next);
    setViewedVersion(snapshot.version);
    setConflict(null);
    setProblem(null);
    setOutcome(null);
    setDayChoice(null);
    setCustomDay("");
    setNote("");
    setCloseReason(null);
    setClassifyResult(null);
  };

  const run = (command: RequestCommand) => {
    const result = store.command(
      request.id,
      viewedVersion,
      command,
      note.trim() ? note.trim() : null,
    );
    if (result.ok) {
      if (result.snapshot.state === "BOOKED" || result.snapshot.state === "CLOSED") {
        setStampedVersion(result.snapshot.version);
      }
      setVerb(null);
      setConflict(null);
      setProblem(null);
      return;
    }
    if (result.error === "conflict") {
      setConflict({ latest: result.latest });
      setProblem(null);
      return;
    }
    setProblem(result.message);
  };

  const submitLog = (event: FormEvent) => {
    event.preventDefault();
    if (!outcome) {
      setProblem("Pick how the call went first.");
      return;
    }
    const day =
      dayChoice === "none" ? null : dayChoice === "custom" ? customDay : dayChoice;
    if (!day && outcome !== "reached_follow_up") {
      setProblem("Voicemail and no-answer calls need a call-again day.");
      return;
    }
    if (!day && dayChoice === null) {
      setProblem("Pick a call-again day, or choose “No call-again day.”");
      return;
    }
    if (day && !callAgainDayInBounds(day, today)) {
      setProblem("Pick a day between today and 90 days out.");
      return;
    }
    run({ kind: "record_contact_attempt", outcome, callAgainDay: day });
  };

  const submitNote = (event: FormEvent) => {
    event.preventDefault();
    if (store.addNote(request.id, note).ok) {
      setVerb(null);
      setNote("");
    } else {
      setProblem("Write the note first — up to 2,000 characters.");
    }
  };

  const undo = store.undoAvailability(request.id);
  const working = snapshot.state === "NEW" || snapshot.state === "CONTACTED";

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

  /* -------------------------------- status sentence ------------- */

  let statusLine: ReactNode;
  if (snapshot.state === "NEW") {
    statusLine = (
      <>
        <strong className="text-[var(--ds-flag)]">Not yet called.</strong>{" "}
        {newRequestLine(request, today).text}.
      </>
    );
  } else if (snapshot.state === "CONTACTED") {
    const attempt = lastAttemptLine(request, today);
    if (snapshot.callAgainDay === null) {
      statusLine = (
        <>
          {attempt ? `${attempt}. ` : ""}
          <strong className="text-[var(--ds-flag)]">
            No call-again day — decide what happens next.
          </strong>
        </>
      );
    } else {
      const due = duePhrase(snapshot.callAgainDay, today);
      const isDue = snapshot.callAgainDay <= today;
      statusLine = (
        <>
          {attempt ? `${attempt}. ` : ""}
          {isDue ? (
            <strong className="text-[var(--ds-flag)]">{capitalize(due)}.</strong>
          ) : (
            `Call again ${dayLabel(snapshot.callAgainDay, today)}.`
          )}
        </>
      );
    }
  } else if (snapshot.state === "CLOSED" && snapshot.legacyReviewRequired) {
    statusLine = (
      <strong className="text-[var(--ds-flag)]">
        Closed in the previous system before outcomes were recorded — record how
        it ended.
      </strong>
    );
  } else {
    statusLine = (
      <>
        {resolutionLine(request, today)}.
        {snapshot.state === "BOOKED"
          ? " The visit itself lives in the scheduling system."
          : ""}
      </>
    );
  }

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
        <p className="text-[0.98rem] leading-relaxed text-[var(--ds-body)]">
          {statusLine}
        </p>
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
              if (!result.ok) setProblem(result.message);
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
            <button
              type="button"
              className="ds-verb"
              aria-expanded={verb === "log"}
              onClick={() => open("log")}
            >
              Log a call
            </button>
            <button
              type="button"
              className="ds-verb"
              aria-expanded={verb === "scheduled"}
              onClick={() => open("scheduled")}
            >
              Scheduled
            </button>
            <button
              type="button"
              className="ds-verb"
              aria-expanded={verb === "close"}
              onClick={() => open("close")}
            >
              Close
            </button>
          </>
        ) : null}
        {snapshot.state === "CLOSED" && snapshot.legacyReviewRequired ? (
          <button
            type="button"
            className="ds-verb"
            aria-expanded={verb === "classify"}
            onClick={() => open("classify")}
          >
            Record how it ended
          </button>
        ) : null}
        {terminal ? (
          <button
            type="button"
            className="ds-verb"
            aria-expanded={verb === "reopen"}
            onClick={() => open("reopen")}
          >
            Reopen
          </button>
        ) : null}
        <button
          type="button"
          className="ds-verb"
          aria-expanded={verb === "note"}
          onClick={() => open("note")}
        >
          Add a note
        </button>
      </div>

      {/* A colleague got there first: the truthful conflict, not a swallow. */}
      {conflict !== null || problem !== null ? (
        <div className="mt-3" role="status">
          {conflict !== null ? (
            <div className="rounded-[var(--ds-radius)] bg-[var(--ds-flag-soft)] px-4 py-3">
              <p className="text-[0.9rem] font-semibold text-[var(--ds-ink)]">
                {conflict.latest
                  ? `${conflict.latest.actor} worked this request while this page was open — ${entryLine(conflict.latest, today).toLowerCase()}.`
                  : "A colleague worked this request while this page was open."}
              </p>
              <p className="mt-1 text-[0.85rem] text-[var(--ds-body)]">
                Nothing was saved. The page below now shows the latest — if your
                entry still applies, save it again.
              </p>
              <button
                type="button"
                onClick={() => {
                  setViewedVersion(snapshot.version);
                  setConflict(null);
                }}
                className="ds-btn ds-btn-quiet mt-2 !min-h-9 px-3 text-[0.85rem]"
              >
                Got it — work from the latest
              </button>
            </div>
          ) : (
            <p className="text-[0.9rem] font-semibold text-[var(--ds-flag)]">
              {problem}
            </p>
          )}
        </div>
      ) : null}

      {/* One panel at a time. */}
      {verb === "log" ? (
        <form onSubmit={submitLog} className="ds-panel mt-4">
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
                checked={outcome === value}
                onChange={() => {
                  setOutcome(value);
                  if (value !== "reached_follow_up" && dayChoice === "none") {
                    setDayChoice(null);
                  }
                }}
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
                checked={dayChoice === option.day}
                onChange={() => setDayChoice(option.day)}
              >
                {option.label}
              </Chip>
            ))}
            <Chip
              name="call-again"
              checked={dayChoice === "custom"}
              onChange={() => setDayChoice("custom")}
            >
              Pick a day
            </Chip>
            {outcome === "reached_follow_up" ? (
              <Chip
                name="call-again"
                checked={dayChoice === "none"}
                onChange={() => setDayChoice("none")}
              >
                No call-again day
              </Chip>
            ) : null}
          </Fieldset>

          {dayChoice === "custom" ? (
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
                value={customDay}
                min={today}
                max={addDays(today, 90)}
                onChange={(event) => setCustomDay(event.target.value)}
                className="ds-input max-w-xs"
              />
            </div>
          ) : null}

          <PanelNote value={note} onChange={setNote} />

          <button type="submit" className="ds-btn ds-btn-pen mt-4">
            Save call
          </button>
        </form>
      ) : null}

      {verb === "scheduled" ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            run({ kind: "confirm_booking_handoff" });
          }}
          className="ds-panel mt-4"
        >
          <p className="max-w-[60ch] text-[0.92rem] leading-relaxed text-[var(--ds-body)]">
            Mark this request scheduled because the appointment is now booked in
            the scheduling system. The request is done here; the visit lives
            there.
          </p>
          <PanelNote value={note} onChange={setNote} />
          <button type="submit" className="ds-btn ds-btn-pen mt-4">
            Mark scheduled
          </button>
        </form>
      ) : null}

      {verb === "close" ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!closeReason) {
              setProblem("Pick why this is closing.");
              return;
            }
            run({ kind: "close_request", reason: closeReason });
          }}
          className="ds-panel mt-4"
        >
          <Fieldset legend="Why is this closing without an appointment?">
            <Chip
              name="close-reason"
              checked={closeReason === "wont_schedule"}
              onChange={() => setCloseReason("wont_schedule")}
            >
              Patient won&rsquo;t schedule
            </Chip>
            <Chip
              name="close-reason"
              checked={closeReason === "not_actionable"}
              onChange={() => setCloseReason("not_actionable")}
            >
              Duplicate or not actionable
            </Chip>
          </Fieldset>
          <PanelNote value={note} onChange={setNote} />
          <button type="submit" className="ds-btn ds-btn-pen mt-4">
            Close request
          </button>
        </form>
      ) : null}

      {verb === "classify" ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!classifyResult) {
              setProblem("Pick how it actually ended.");
              return;
            }
            run({
              kind: "classify_legacy_closure",
              classification:
                classifyResult === "booked"
                  ? { kind: "booked" }
                  : { kind: "unbooked", reason: classifyResult },
            });
          }}
          className="ds-panel mt-4"
        >
          <Fieldset legend="How did this one actually end?">
            <Chip
              name="classify"
              checked={classifyResult === "booked"}
              onChange={() => setClassifyResult("booked")}
            >
              The appointment was booked
            </Chip>
            <Chip
              name="classify"
              checked={classifyResult === "wont_schedule"}
              onChange={() => setClassifyResult("wont_schedule")}
            >
              Patient wouldn&rsquo;t schedule
            </Chip>
            <Chip
              name="classify"
              checked={classifyResult === "not_actionable"}
              onChange={() => setClassifyResult("not_actionable")}
            >
              Duplicate or not actionable
            </Chip>
          </Fieldset>
          <p className="mt-3 text-[0.85rem] text-[var(--ds-faint)]">
            This completes the record for a request closed before outcomes were
            tracked. It can&rsquo;t be undone.
          </p>
          <PanelNote value={note} onChange={setNote} />
          <button type="submit" className="ds-btn ds-btn-pen mt-4">
            Save the record
          </button>
        </form>
      ) : null}

      {verb === "reopen" ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            run({ kind: "reopen_request" });
          }}
          className="ds-panel mt-4"
        >
          <p className="max-w-[60ch] text-[0.92rem] leading-relaxed text-[var(--ds-body)]">
            {snapshot.state === "BOOKED"
              ? "The appointment fell through, or this was marked scheduled by mistake. Reopening puts the request back in the working queue."
              : "Reopening puts this request back in the working queue. Everything already recorded stays on the ledger."}
          </p>
          <PanelNote value={note} onChange={setNote} />
          <button type="submit" className="ds-btn ds-btn-pen mt-4">
            Reopen request
          </button>
        </form>
      ) : null}

      {verb === "note" ? (
        <form onSubmit={submitNote} className="ds-panel mt-4">
          <PanelNote
            value={note}
            onChange={setNote}
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
