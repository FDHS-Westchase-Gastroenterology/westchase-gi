"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { FullRecordSheet } from "@/app/admin/(portal)/(home)/full-record-sheet";
import type { HomeLine } from "@/app/admin/(portal)/(home)/home-line";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import { Popover } from "@/components/ui/popover";
import { createPopoverHandle } from "@/components/ui/popover-behavior";
import { showUndoToast } from "@/components/ui/undo-toast";

import { DayEmpty } from "./day-empty";
import { DayFoot } from "./day-foot";
import { DayGrid } from "./day-grid";
import type { DayAppointmentCell, ScheduleDay } from "./schedule-day-model";
import { ShortcutsList, useScheduleShortcuts } from "./schedule-shortcuts";
import type { ShortcutTargets } from "./schedule-shortcuts";
import { ScheduleArrow, ScheduleTools } from "./schedule-toolbar";
import { undoAppointmentChange, weekAppointmentCommand } from "./week-actions";
import { failureMessage } from "./week-card-model";
import type { Landed } from "./week-card-parts";
import { WeekCardPopup } from "./week-cards";
import type { WeekCardPayload } from "./week-cards";

import "@/app/admin/(portal)/(home)/home.css";
import "./schedule-week.css";
import "./schedule-day.css";

/* The Schedule's day view (issue #351; Figma Ypf9ohpRcGWF5C9T9bSvWW, page
   02, S5 and B5–B6): every provider working one date, side by side.

   - A click on a block opens #345's appointment card; a click on open
     time opens its booking card. One popover serves every cell through a
     handle, so only one card is open at a time.
   - A booking, or a Check in from a block, re-reads the day and raises
     the undo toast: what landed, when and where, and Undo while the
     server still allows it.
   - The day is one focus group (day-grid.tsx); the Schedule's shortcuts
     (schedule-shortcuts.tsx) move between days and views, and ? or "All
     shortcuts" lists them. */

interface RecordOpen {
  readonly line: HomeLine;
  readonly appointmentId: string;
  readonly instant: boolean;
}

export function ScheduleDayView({ view, admin }: Readonly<{ view: ScheduleDay; admin: boolean }>) {
  const router = useRouter();
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const [card] = useState(() => createPopoverHandle<WeekCardPayload>());
  /* Opened from the keyboard: the card appears and leaves at once. */
  const [keyed, setKeyed] = useState(false);
  const [record, setRecord] = useState<RecordOpen | null>(null);
  const lastRecord = useRef<string | null>(null);
  const [checking, setChecking] = useState<string | null>(null);
  const [hints, setHints] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [shortcutsHandle] = useState(() => createPopoverHandle<undefined>());
  const shortcutsRef = useRef<HTMLButtonElement>(null);

  const targets: ShortcutTargets = {
    today: view.todayHref,
    next: view.next,
    previous: view.previous,
    day: null,
    week: view.weekHref,
    month: view.monthHref,
  };
  useScheduleShortcuts(targets, () => {
    setHints(true);
    setKeyed(true);
    setShortcuts(true);
  });

  /** A change landed: say it with Undo, and re-read the day. */
  function landed(change: Readonly<Pick<Landed, "id" | "version" | "headline" | "detail">>) {
    const idempotencyKey = crypto.randomUUID();
    showUndoToast({
      headline: change.headline,
      detail: change.detail,
      undo: async () => {
        const outcome = await undoAppointmentChange({
          idempotencyKey,
          id: change.id,
          expectedVersion: change.version,
        });
        return outcome.ok
          ? { ok: true, message: "Undone." }
          : { ok: false, message: failureMessage(outcome.code) };
      },
      onSettled: () => {
        router.refresh();
      },
    });
    router.refresh();
  }

  function checkIn(cell: Readonly<DayAppointmentCell>) {
    if (checking !== null) return;
    setChecking(cell.id);
    startTransition(async () => {
      try {
        const outcome = await weekAppointmentCommand({
          idempotencyKey: crypto.randomUUID(),
          command: { kind: "check_in", id: cell.id, expectedVersion: cell.version },
        });
        if (outcome.ok)
          landed({
            id: outcome.id,
            version: outcome.version,
            headline: `${cell.name} is checked in`,
            detail: cell.detail,
          });
        else {
          toast.error(failureMessage(outcome.code));
          router.refresh();
        }
      } catch {
        toast.error("The schedule couldn't be reached. Try again.");
      } finally {
        setChecking(null);
      }
    });
  }

  const nobody = view.activeProviderCount === 0;
  return (
    <section className="wgi-schedule wgi-dayview" aria-labelledby={titleId}>
      <DayHeader view={view} titleId={titleId} targets={targets} />
      <DayGrid
        view={view}
        baseId={baseId}
        card={card}
        onKeyed={setKeyed}
        onArrow={() => {
          setHints(true);
        }}
        onCheckIn={checkIn}
        checking={checking}
        overlay={
          nobody ? (
            <DayEmpty admin={admin} />
          ) : (
            <p className="wgi-dayview-nobody">Nobody is scheduled this day.</p>
          )
        }
        foot={
          nobody ? null : (
            <DayFoot
              hints={hints}
              offLine={view.offLine}
              shortcutsRef={shortcutsRef}
              shortcutsHandle={shortcutsHandle}
            />
          )
        }
      />
      <ShortcutsList
        open={shortcuts}
        onOpenChange={(open, details) => {
          if (open && details.reason === "trigger-press") setKeyed(false);
          setShortcuts(open);
        }}
        handle={shortcutsHandle}
        anchor={shortcutsRef}
        side="top"
        keyed={keyed}
      />
      <Popover handle={card}>
        {({ payload }) =>
          payload === undefined ? null : (
            <WeekCardPopup
              key={payload.kind === "appointment" ? payload.cell.id : payload.cell.key}
              payload={payload}
              keyed={keyed}
              onDone={(_message, change) => {
                card.close();
                landed(change);
              }}
              onOpenRecord={(line, appointmentId) => {
                lastRecord.current = appointmentId;
                card.close();
                setRecord({ line, appointmentId, instant: keyed });
              }}
            />
          )
        }
      </Popover>
      <FullRecordSheet
        line={record?.line ?? null}
        instant={record?.instant ?? false}
        onOpenChange={(open) => {
          if (!open) setRecord(null);
        }}
        onClosed={() => {
          router.refresh();
        }}
        returnFocus={() =>
          lastRecord.current === null
            ? null
            : document.querySelector<HTMLElement>(`[data-appointment="${lastRecord.current}"]`)
        }
      />
    </section>
  );
}

/* ---- The header: the date, a day back or ahead, and the view switch ---- */

function DayHeader({
  view,
  titleId,
  targets,
}: Readonly<{ view: ScheduleDay; titleId: string; targets: ShortcutTargets }>) {
  return (
    <header className="wgi-schedule-head">
      <div className="wgi-schedule-nav">
        <h1 id={titleId} className="wgi-schedule-title">
          {view.title}
        </h1>
        <div className="wgi-schedule-arrows">
          <ScheduleArrow href={view.previous} label="Previous day">
            <ChevronLeft width={20} height={20} />
          </ScheduleArrow>
          <ScheduleArrow href={view.next} label="Next day">
            <ChevronRight width={20} height={20} />
          </ScheduleArrow>
        </div>
        <Link href={view.todayHref} className="wgi-schedule-today">
          Today
        </Link>
      </div>
      <ScheduleTools value="day" targets={targets} />
    </header>
  );
}
