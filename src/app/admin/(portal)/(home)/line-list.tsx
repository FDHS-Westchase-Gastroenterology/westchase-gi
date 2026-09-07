"use client";

import type { HomeLine } from "./home-line";
import { LineStatusBadge } from "./parts/badge";
import { PhoneGlyph } from "./parts/glyphs";
import { LineItem } from "./parts/item";
import { HomePopover, HomePopoverContent, HomePopoverTrigger } from "./parts/popover";
import { RecordCard } from "./record-card";

/* The flat list (brief §1): one line per request, hairline-ruled, no card
   chrome, no section headings. The whole line is the record affordance — it
   opens the outcome card — and the phone link inside stops the toggle so a
   dial stays a dial. */

interface LineListProps {
  readonly lines: readonly Readonly<HomeLine>[];
  readonly openRowId: string | null;
  readonly settledId: string | null;
  readonly onOpenRow: (id: string | null) => void;
  readonly onOpenFull: (id: string, instant: boolean) => void;
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
          onOpenFull={(instant) => {
            onOpenFull(line.id, instant);
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
  onOpenFull: (instant: boolean) => void;
  onSettled: (id: string) => void;
}>) {
  return (
    <li data-row={line.id} className="wgi-line-row" data-settled={settled || undefined}>
      <HomePopover open={open} onOpenChange={onOpenChange}>
        <HomePopoverTrigger
          nativeButton={false}
          // react-doctor-disable-next-line react-doctor/prefer-tag-over-role -- the row nests an interactive <a> (the phone link), which HTML forbids inside a native <button>; Base UI's non-native trigger wires the keyboard and ARIA plumbing
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
