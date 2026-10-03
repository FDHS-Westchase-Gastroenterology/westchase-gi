"use client";

import { Popover } from "@base-ui/react/popover";
import Link from "next/link";

import { ChevronRight } from "@/components/icons";

import type { DayPreview, ScheduleCell } from "./schedule-model";

/* What one day of the month view shows: the cell's contents, the preview
   that opens beside a future day, and the key under the grid that reads
   the cells' tints. The grid that arranges them is schedule-month.tsx. */

export function DayPreviewPopup({
  preview,
  keyed,
}: Readonly<{ preview: DayPreview; keyed: boolean }>) {
  return (
    <Popover.Portal>
      <Popover.Positioner
        side="right"
        align="center"
        sideOffset={10}
        collisionPadding={12}
        arrowPadding={14}
        collisionAvoidance={{ side: "flip", align: "shift", fallbackAxisSide: "end" }}
        className="wgi-day-preview-positioner"
      >
        <Popover.Popup
          className="wgi-day-preview"
          data-keyed={keyed || undefined}
          initialFocus={false}
          finalFocus={false}
        >
          <Popover.Arrow className="wgi-day-preview-arrow" />
          <header className="wgi-day-preview-head">
            <Popover.Title className="wgi-day-preview-title">{preview.heading}</Popover.Title>
            <p className="wgi-day-preview-summary">{preview.summary}</p>
          </header>
          <ul className="wgi-day-preview-providers">
            {preview.providers.map((provider) => (
              <li key={provider.id} className="wgi-day-preview-provider">
                <div className="wgi-day-preview-line">
                  <p className="wgi-day-preview-who">
                    <span className="wgi-day-preview-name">{provider.name}</span>
                    {provider.locations === "" ? null : (
                      <span className="wgi-day-preview-where">{provider.locations}</span>
                    )}
                  </p>
                  <span className="wgi-day-preview-status" data-full={provider.full || undefined}>
                    {provider.status}
                  </span>
                </div>
                {provider.times === "" ? null : (
                  <p className="wgi-day-preview-times">{provider.times}</p>
                )}
              </li>
            ))}
          </ul>
          <Link href={preview.href} className="wgi-day-preview-open">
            Open day
            <ChevronRight width={16} height={16} aria-hidden="true" />
          </Link>
        </Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  );
}

export function CellBody({ cell, narrow }: Readonly<{ cell: ScheduleCell; narrow: boolean }>) {
  if (cell.kind === "blank") return null;
  return (
    <>
      {cell.kind === "closed" && !narrow ? (
        <svg className="wgi-day-outline" aria-hidden="true">
          <rect width="100%" height="100%" rx="12" />
        </svg>
      ) : null}
      <span className="wgi-day-date" data-today={cell.today || undefined}>
        {cell.day}
      </span>
      {cell.kind === "future" ? (
        cell.full ? (
          <span className="wgi-day-full">Full</span>
        ) : (
          <span className="wgi-day-count">
            <b>{cell.count}</b> open
          </span>
        )
      ) : null}
      {cell.kind === "past" ? <span className="wgi-day-note">{cell.text}</span> : null}
      {cell.kind === "closed" && !narrow ? <span className="wgi-day-note">Closed</span> : null}
    </>
  );
}

export function Legend() {
  return (
    <ul className="wgi-schedule-legend" aria-label="Availability key">
      <li>
        More open
        <span className="wgi-schedule-steps" aria-hidden="true">
          <i data-tone="low" />
          <i data-tone="mid" />
          <i data-tone="high" />
          <i data-tone="full" />
        </span>
        Full
      </li>
      <li>
        <i className="wgi-schedule-closed-key" aria-hidden="true" />
        Closed
      </li>
    </ul>
  );
}
