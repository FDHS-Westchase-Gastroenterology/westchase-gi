"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { usePortalFeedback } from "@/app/admin/(portal)/portal-feedback";
import {
  appointmentChoice,
  practiceLocalDay,
} from "@/app/admin/(portal)/requests/appointment-input";
import { followUpShortLabel } from "@/app/admin/(portal)/requests/format";
import {
  confirmBookingHandoff,
  recordContactAttempt,
} from "@/app/admin/(portal)/requests/workflow-actions";
import type { FollowUpChoice } from "@/lib/portal/business-time";
import type { CommandOutcome, ContactOutcome } from "@/lib/portal/workflow/contracts";

import type { HomeLine } from "./home-line";
import { LineStatusBadge } from "./parts/badge";
import { ChevronGlyph, PhoneGlyph } from "./parts/glyphs";
import { LineItem } from "./parts/item";
import { HomePopover, HomePopoverContent, HomePopoverTrigger } from "./parts/popover";

/* The flat list (brief §1): one line per request, hairline-ruled, no card
   chrome, no section headings. The whole line is the record affordance — it
   opens the outcome card — and the phone link inside stops the toggle so a
   dial stays a dial. */

interface LineListProps {
  readonly lines: readonly Readonly<HomeLine>[];
  readonly openRowId: string | null;
  readonly settledId: string | null;
  readonly onOpenRow: (id: string | null) => void;
  readonly onOpenFull: (id: string) => void;
  readonly onSettled: (id: string) => void;
}

export function LineList({
  lines,
  openRowId,
  settledId,
  onOpenRow,
  onOpenFull,
  onSettled,
}: LineListProps) {
  return (
    <ul data-line-list="true" data-testid="home-line-list" className="wgi-line-list">
      {lines.map((line) => (
        <LineRow
          key={line.id}
          line={line}
          open={openRowId === line.id}
          settled={settledId === line.id}
          onOpenChange={(open) => {
            onOpenRow(open ? line.id : null);
          }}
          onOpenFull={() => {
            onOpenFull(line.id);
          }}
          onSettled={onSettled}
        />
      ))}
    </ul>
  );
}

function stop(event: Readonly<{ stopPropagation: () => void }>): void {
  event.stopPropagation();
}

function LineRow({
  line,
  open,
  settled,
  onOpenChange,
  onOpenFull,
  onSettled,
}: Readonly<{
  line: Readonly<HomeLine>;
  open: boolean;
  settled: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenFull: () => void;
  onSettled: (id: string) => void;
}>) {
  return (
    <li data-row={line.id} className="wgi-line-row" data-settled={settled || undefined}>
      <HomePopover open={open} onOpenChange={onOpenChange}>
        <HomePopoverTrigger
          nativeButton={false}
          render={<div role="button" className="appt-line-trigger" />}
        >
          <LineItem>
            <span className="appt-name" data-ui-redact="patient-name">
              <span>{line.name}</span>
            </span>
            <a
              href={line.tel}
              className="appt-phone"
              aria-label={`Call ${line.name} at ${line.phoneDisplay}`}
              data-ui-redact="patient-contact"
              onClick={stop}
              onMouseDown={stop}
              onPointerDown={stop}
            >
              <PhoneGlyph size={13} />
              {line.phoneDisplay}
            </a>
            <span data-col="status">
              <LineStatusBadge status={line.status} />
            </span>
            <span data-col="stamp">
              {line.stamp === null ? null : <span className="portal-stamp">{line.stamp}</span>}
            </span>
            <span data-col="pref">{line.pref}</span>
            <span data-col="received" title={`Received ${line.receivedFull}`}>
              {line.receivedRel}
            </span>
            <span
              data-col="avatar"
              data-worked={line.actorName === null ? undefined : "true"}
              title={line.actorName ?? "No staff action yet"}
              aria-label={
                line.actorName === null ? "No staff action yet" : `Last worked by ${line.actorName}`
              }
            >
              {line.actorInitials ?? "—"}
            </span>
          </LineItem>
        </HomePopoverTrigger>
        <HomePopoverContent className="wgi-record-card" side="bottom" align="start" sideOffset={8}>
          <RecordCard
            line={line}
            onClose={() => {
              onOpenChange(false);
            }}
            onOpenFull={onOpenFull}
            onSettled={onSettled}
          />
        </HomePopoverContent>
      </HomePopover>
    </li>
  );
}

/* ---- The record card: the three outcomes staff actually live through ----
   Contact outcomes arrive with the day they usually mean already chosen; the
   booking hand-off asks for its day and wall-clock time because the state
   machine refuses a booking without one. Optimistic concurrency and an
   idempotency key ride every attempt, mirroring the request detail panel. */

const TIME_OPTIONS: readonly { value: string; label: string }[] = Array.from(
  { length: 18 },
  (_, index) => {
    const hour = 8 + Math.floor(index / 2);
    const minute = index % 2 === 0 ? 0 : 30;
    const meridiem = hour < 12 ? "AM" : "PM";
    const clockHour = hour % 12 === 0 ? 12 : hour % 12;
    return {
      value: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      label: `${clockHour}:${String(minute).padStart(2, "0")} ${meridiem}`,
    };
  },
);

function RecordCard({
  line,
  onClose,
  onOpenFull,
  onSettled,
}: Readonly<{
  line: Readonly<HomeLine>;
  onClose: () => void;
  onOpenFull: () => void;
  onSettled: (id: string) => void;
}>) {
  const router = useRouter();
  const { publish } = usePortalFeedback();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<"outcomes" | "book">("outcomes");
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const keyRef = useRef<string | null>(null);
  const lastRun = useRef<(() => void) | null>(null);

  const uncertain = error?.startsWith("The portal could not confirm") === true;
  const booking = appointmentChoice(day, time);

  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- CommandOutcome carries domain member types that cannot be made readonly
  function settle(result: Readonly<CommandOutcome>, message: string) {
    if (result.ok) {
      keyRef.current = null;
      publish({ source: "requests-output", tone: "status", message });
      onSettled(line.id);
      onClose();
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

  function common() {
    keyRef.current ??= crypto.randomUUID();
    return {
      requestId: line.id,
      expectedVersion: line.version,
      idempotencyKey: keyRef.current,
    };
  }

  function runContact(outcome: ContactOutcome, callAgain: Readonly<FollowUpChoice>, label: string) {
    const attempt = () => {
      if (pending) return;
      setError(null);
      startTransition(async () => {
        const result = await recordContactAttempt({ ...common(), outcome, callAgain });
        settle(
          result,
          result.ok && result.callAgainAt !== null
            ? `${label} recorded for ${line.name} — back ${followUpShortLabel(result.callAgainAt)}.`
            : `${label} recorded for ${line.name}.`,
        );
      });
    };
    lastRun.current = attempt;
    attempt();
  }

  function runBooking() {
    const attempt = () => {
      if (pending || booking === undefined) return;
      setError(null);
      startTransition(async () => {
        const result = await confirmBookingHandoff({ ...common(), appointment: booking });
        settle(result, `${line.name} is Scheduled.`);
      });
    };
    lastRun.current = attempt;
    attempt();
  }

  return (
    <>
      <div className="wgi-record-head">
        <p className="wgi-record-name" data-ui-redact="patient-name">
          {line.name}
        </p>
        <p className="wgi-record-meta">
          {line.stamp === null ? null : <span className="portal-stamp">{line.stamp}</span>}
          <span>
            {line.pref} · {line.timing}
          </span>
        </p>
      </div>
      <a href={line.tel} className="wgi-record-call" data-ui-redact="patient-contact">
        <PhoneGlyph size={15} />
        {line.phoneDisplay}
      </a>

      {step === "outcomes" ? (
        <>
          <p className="wgi-record-q">What happened?</p>
          <div className="wgi-record-outcomes">
            <button
              type="button"
              className="wgi-outcome"
              disabled={pending || uncertain}
              onClick={() => {
                runContact("no_answer", { kind: "tomorrow_morning" }, "No answer");
              }}
            >
              No answer
              <small>call again tomorrow</small>
            </button>
            <button
              type="button"
              className="wgi-outcome"
              disabled={pending || uncertain}
              onClick={() => {
                runContact("reached_follow_up", { kind: "friday" }, "Contacted");
              }}
            >
              Contacted
              <small>call again Friday</small>
            </button>
            <button
              type="button"
              className="wgi-outcome"
              disabled={pending || uncertain}
              onClick={() => {
                setError(null);
                setStep("book");
              }}
            >
              Appointment scheduled
              <small>pick day &amp; time</small>
            </button>
          </div>
        </>
      ) : (
        <div className="wgi-record-book">
          <label>
            Day
            <input
              type="date"
              value={day}
              min={practiceLocalDay(0)}
              max={practiceLocalDay(400)}
              onChange={(event) => {
                setDay(event.target.value);
              }}
            />
          </label>
          <label>
            Time
            <select
              value={time}
              onChange={(event) => {
                setTime(event.target.value);
              }}
            >
              <option value="">Pick a time</option>
              {TIME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="wgi-record-book-actions">
            <button
              type="button"
              className="wgi-mini-btn"
              disabled={pending}
              onClick={() => {
                setStep("outcomes");
              }}
            >
              Back
            </button>
            <button
              type="button"
              className="wgi-mini-btn"
              data-variant="solid"
              disabled={pending || uncertain || booking === undefined}
              onClick={runBooking}
            >
              {pending ? "Saving…" : "Confirm hand-off"}
            </button>
          </div>
        </div>
      )}

      {error === null ? null : (
        <p role="alert" className="wgi-record-error">
          {error}{" "}
          {uncertain ? (
            <button
              type="button"
              className="wgi-record-retry"
              disabled={pending}
              onClick={() => lastRun.current?.()}
            >
              Try again
            </button>
          ) : null}
        </p>
      )}

      <button type="button" className="wgi-record-foot" onClick={onOpenFull}>
        Open full record
        <ChevronGlyph size={14} />
      </button>
    </>
  );
}
