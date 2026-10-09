"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { ChevronDown, ChevronLeft, ChevronRight } from "@/components/icons";
import { Popover } from "@/components/ui/popover";
import { createPopoverHandle } from "@/components/ui/popover-behavior";
import { TooltipContent } from "@/components/ui/tooltip";

import { useSchedulePeople } from "./schedule-people";
import { ScheduleArrow, ScheduleToolsWithShortcuts, usePendingSection } from "./schedule-toolbar";
import type { ScheduleWeek, WeekProviderChoice } from "./schedule-week-model";
import { rememberWeekProvider } from "./week-actions";
import { dayHref, weekHref } from "./week-calendar";
import { useUndoLanded } from "./week-card-parts";
import { WeekCardPopup } from "./week-cards";
import type { WeekCardPayload } from "./week-cards";
import { WeekGrid } from "./week-grid";
import type { Grid, TipPayload } from "./week-grid";
import { WeekProviderMenu } from "./week-provider-menu";

import "@/app/admin/(portal)/(home)/home.css";
import "./schedule-week.css";

/* The Schedule's week view (issue #345; Figma Ypf9ohpRcGWF5C9T9bSvWW,
   section 08, W1–W2 and H2–H8): one provider's week, or up to three
   providers side by side in lanes. Days without hours fold to a strip.

   - The provider menu in the title switches the week in place, or opens
     the compare picker (week-provider-menu.tsx).
   - A click on an appointment opens its card; a click on an open time
     opens the booking card (week-cards.tsx). One popover serves every
     cell through a handle, so only one card is ever open, and it points
     at its cell without covering it (HIG Popovers).
   - In compare mode the cells are too narrow for the visit type, so a
     resting pointer or keyboard focus shows the full line in a tooltip;
     a lane label names its provider and a click shows that provider's
     week alone.
   - Tab moves through the cells in reading order, a day at a time, top
     to bottom; Enter or Space opens a cell's card.

   The page is the week read the server rendered; the now line is the
   only part that follows the browser's clock. */

/* ---- The page ---- */

function renderTip({ payload }: Readonly<{ payload: TipPayload | undefined }>) {
  return payload === undefined ? null : (
    <TooltipContent side={payload.side} className="wgi-week-tip">
      {payload.lines.map((line) => (
        <span key={line} className="block">
          {line}
        </span>
      ))}
    </TooltipContent>
  );
}

export function ScheduleWeekView({
  view,
  catalog,
}: Readonly<{ view: ScheduleWeek; catalog: readonly WeekProviderChoice[] }>) {
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const pendingSection = usePendingSection();
  const [tip] = useState(() => Tooltip.createHandle<TipPayload>());
  const [band] = useState(() => Tooltip.createHandle<TipPayload>());
  const [card] = useState(() => createPopoverHandle<WeekCardPayload>());
  /* Opened from the keyboard: the card appears and leaves at once. */
  const [keyed, setKeyed] = useState(false);
  const { openRecord } = useSchedulePeople();
  const landed = useUndoLanded();
  const grid: Grid = { view, baseId, tip, band, card, onKeyed: setKeyed };

  return (
    <section className="wgi-schedule wgi-week" aria-labelledby={titleId} {...pendingSection}>
      <WeekHeader view={view} catalog={catalog} titleId={titleId} />
      <WeekGrid grid={grid} />
      <Tooltip.Root handle={tip} disableHoverablePopup>
        {renderTip}
      </Tooltip.Root>
      {/* A strip or an Off lane runs the grid's height, so its tooltip
          meets the pointer where it rests (H5, H8). */}
      <Tooltip.Root handle={band} disableHoverablePopup trackCursorAxis="y">
        {renderTip}
      </Tooltip.Root>
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

/* ---- The header: provider menu, week range, and the view switch ---- */

function WeekHeader({
  view,
  catalog,
  titleId,
}: Readonly<{ view: ScheduleWeek; catalog: readonly WeekProviderChoice[]; titleId: string }>) {
  const router = useRouter();

  return (
    <header className="wgi-schedule-head">
      <div className="wgi-schedule-nav wgi-week-nav">
        <div className="wgi-week-heading">
          <h1 id={titleId} className="wgi-schedule-title">
            <WeekProviderMenu
              view={view}
              catalog={catalog}
              onShowOne={(providerId) => {
                void rememberWeekProvider(providerId);
                router.push(weekHref(view.weekStart, [providerId]));
              }}
              onCompare={(ids) => {
                router.push(weekHref(view.weekStart, ids));
              }}
            >
              {view.title}
              <ChevronDown width={24} height={24} className="wgi-week-trigger-chevron" />
            </WeekProviderMenu>
          </h1>
          {view.subtitle === null ? null : <p className="wgi-week-subtitle">{view.subtitle}</p>}
        </div>
        <div className="wgi-week-controls">
          <p className="wgi-week-range">{view.range}</p>
          <div className="wgi-schedule-arrows">
            <ScheduleArrow href={view.previous} label="Previous week">
              <ChevronLeft width={20} height={20} />
            </ScheduleArrow>
            <ScheduleArrow href={view.next} label="Next week">
              <ChevronRight width={20} height={20} />
            </ScheduleArrow>
          </div>
          <Link href={view.todayHref} className="wgi-schedule-today">
            Today
          </Link>
        </div>
      </div>
      <ScheduleToolsWithShortcuts
        value="week"
        targets={{
          today: view.todayHref,
          next: view.next,
          previous: view.previous,
          /* Today when this week holds it, else the week's first day with hours. */
          day: dayHref(
            view.columns.some((column) => column.today)
              ? null
              : (view.columns.find((column) => column.kind === "day")?.date ?? view.weekStart),
          ),
          week: null,
          month: view.monthHref,
        }}
      />
    </header>
  );
}
