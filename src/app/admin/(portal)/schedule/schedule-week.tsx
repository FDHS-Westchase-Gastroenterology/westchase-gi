"use client";

import { Popover } from "@base-ui/react/popover";
import { Tooltip } from "@base-ui/react/tooltip";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { FullRecordSheet } from "@/app/admin/(portal)/(home)/full-record-sheet";
import type { HomeLine } from "@/app/admin/(portal)/(home)/home-line";
import { ChevronDown, ChevronLeft, ChevronRight, Search } from "@/components/icons";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { SegmentedControlOption } from "@/components/ui/segmented-control";
import { TooltipContent } from "@/components/ui/tooltip";

import type { ScheduleWeek, WeekProviderChoice } from "./schedule-week-model";
import { rememberWeekProvider } from "./week-actions";
import { weekHref } from "./week-calendar";
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

type View = "day" | "week" | "month";

const VIEW_OPTIONS: readonly SegmentedControlOption<View>[] = [
  { value: "day", label: "Day", disabledReason: "Coming soon" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

/* ---- The page ---- */

function WeekArrow({
  href,
  label,
  children,
}: Readonly<{ href: string | null; label: string; children: ReactNode }>) {
  if (href === null)
    return (
      <button type="button" className="wgi-schedule-arrow" disabled aria-label={label}>
        {children}
      </button>
    );
  return (
    <Link href={href} className="wgi-schedule-arrow" aria-label={label}>
      {children}
    </Link>
  );
}

interface RecordOpen {
  readonly line: HomeLine;
  readonly appointmentId: string;
  readonly instant: boolean;
}

export function ScheduleWeekView({
  view,
  catalog,
}: Readonly<{ view: ScheduleWeek; catalog: readonly WeekProviderChoice[] }>) {
  const router = useRouter();
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const [tip] = useState(() => Tooltip.createHandle<TipPayload>());
  const [card] = useState(() => Popover.createHandle<WeekCardPayload>());
  /* Opened from the keyboard: the card appears and leaves at once. */
  const [keyed, setKeyed] = useState(false);
  const [record, setRecord] = useState<RecordOpen | null>(null);
  const lastRecord = useRef<string | null>(null);
  const grid: Grid = { view, baseId, tip, card, onKeyed: setKeyed };

  return (
    <section className="wgi-schedule wgi-week" aria-labelledby={titleId}>
      <WeekHeader view={view} catalog={catalog} titleId={titleId} />
      <WeekGrid grid={grid} />
      <Tooltip.Root handle={tip} disableHoverablePopup>
        {({ payload }) =>
          payload === undefined ? null : (
            <TooltipContent side={payload.side} className="wgi-week-tip">
              {payload.lines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </TooltipContent>
          )
        }
      </Tooltip.Root>
      <Popover.Root handle={card}>
        {({ payload }) =>
          payload === undefined ? null : (
            <WeekCardPopup
              key={payload.kind === "appointment" ? payload.cell.id : payload.cell.key}
              payload={payload}
              keyed={keyed}
              referenceType={view.referenceType}
              onDone={(message) => {
                card.close();
                toast(message);
                router.refresh();
              }}
              onOpenRecord={(line, appointmentId) => {
                lastRecord.current = appointmentId;
                card.close();
                setRecord({ line, appointmentId, instant: keyed });
              }}
            />
          )
        }
      </Popover.Root>
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
            <WeekArrow href={view.previous} label="Previous week">
              <ChevronLeft width={20} height={20} />
            </WeekArrow>
            <WeekArrow href={view.next} label="Next week">
              <ChevronRight width={20} height={20} />
            </WeekArrow>
          </div>
          <Link href={view.todayHref} className="wgi-schedule-today">
            Today
          </Link>
        </div>
      </div>
      <div className="wgi-schedule-tools">
        <label className="wgi-schedule-search">
          <Search width={18} height={18} />
          <input
            type="search"
            placeholder="Search patients"
            aria-label="Search patients"
            disabled
          />
        </label>
        <SegmentedControl<View>
          aria-label="View"
          paper="glass"
          options={VIEW_OPTIONS}
          value="week"
          className="w-auto"
          onValueChange={(next) => {
            if (next === "month") router.push(view.monthHref);
          }}
        />
      </div>
    </header>
  );
}
