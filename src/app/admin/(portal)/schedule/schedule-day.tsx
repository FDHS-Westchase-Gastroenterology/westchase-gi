"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { ChevronLeft, ChevronRight } from "@/components/icons";
import { Popover } from "@/components/ui/popover";
import { createPopoverHandle } from "@/components/ui/popover-behavior";

import type { DropTarget, PendingMove } from "./day-drag-model";
import { withMove } from "./day-drag-model";
import { DayEmpty } from "./day-empty";
import { DayFoot } from "./day-foot";
import { DayGrid } from "./day-grid";
import type { DayAppointmentCell, ScheduleDay } from "./schedule-day-model";
import { useSchedulePeople } from "./schedule-people";
import { ShortcutsList, useScheduleShortcuts } from "./schedule-shortcuts";
import type { ShortcutTargets } from "./schedule-shortcuts";
import { ScheduleArrow, ScheduleTools } from "./schedule-toolbar";
import { weekAppointmentCommand } from "./week-actions";
import type { WeekAppointmentOutcome } from "./week-actions";
import { practiceTime } from "./week-calendar";
import { checkedInDetail, failureMessage, movedFromDetail } from "./week-card-model";
import { useUndoLanded } from "./week-card-parts";
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
   - A visit dragged to open time lands there at once and the server is
     told after (day-drag.tsx); if the server refuses, the day is read
     again and the card is back where it was.
   - The day is one focus group (day-grid.tsx); the Schedule's shortcuts
     (schedule-shortcuts.tsx) move between days and views, and ? or "All
     shortcuts" lists them. */

export function ScheduleDayView({ view, admin }: Readonly<{ view: ScheduleDay; admin: boolean }>) {
  const router = useRouter();
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const [card] = useState(() => createPopoverHandle<WeekCardPayload>());
  /* Opened from the keyboard: the card appears and leaves at once. */
  const [keyed, setKeyed] = useState(false);
  const { openRecord } = useSchedulePeople();
  const [checking, setChecking] = useState<string | null>(null);
  const [move, setMove] = useState<PendingMove | null>(null);
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

  const landed = useUndoLanded();

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
            detail: checkedInDetail(new Date(), cell.startsAt, cell.providerName),
            request: outcome.request,
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

  /* Figma Ap3: an accepted drop lands before the server answers, then the
     undo toast says where it went and where it was. */
  function moveTo(
    cell: Readonly<DayAppointmentCell>,
    target: Readonly<DropTarget>,
    read: Promise<WeekAppointmentOutcome>,
  ) {
    const { locationId } = target;
    if (locationId === null) return;
    setMove({ view, id: cell.id, target });
    startTransition(async () => {
      try {
        const current = await read;
        const outcome = await weekAppointmentCommand({
          idempotencyKey: crypto.randomUUID(),
          command: {
            kind: "reschedule",
            id: cell.id,
            expectedVersion: current.ok ? current.detail.version : cell.version,
            providerId: target.providerId,
            locationId,
            start: { date: target.date, time: target.time },
            requestVersion: current.ok ? current.detail.requestVersion : null,
          },
        });
        if (outcome.ok) {
          landed({
            id: outcome.id,
            version: outcome.version,
            headline: `${cell.name} moved to ${practiceTime(target.startsAt)} with ${target.providerName}`,
            detail: movedFromDetail(cell.startsAt, cell.providerName),
            request: outcome.request,
          });
          return;
        }
        setMove(null);
        toast.error(failureMessage(outcome.code));
        router.refresh();
      } catch {
        setMove(null);
        toast.error("The schedule couldn't be reached. Try again.");
      }
    });
  }

  const shown = withMove(view, move);
  const nobody = view.activeProviderCount === 0;
  return (
    <section className="wgi-schedule wgi-dayview" aria-labelledby={titleId}>
      <DayHeader view={view} titleId={titleId} targets={targets} />
      <DayGrid
        view={shown}
        baseId={baseId}
        card={card}
        onMove={moveTo}
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
              onOpenRecord={(patient, appointmentId) => {
                card.close();
                openRecord(patient, appointmentId, keyed);
              }}
            />
          )
        }
      </Popover>
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
