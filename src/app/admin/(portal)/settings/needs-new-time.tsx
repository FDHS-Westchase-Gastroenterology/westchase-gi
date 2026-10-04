"use client";

import Link from "next/link";

import { dayHref, endMinute, practiceMinute } from "@/app/admin/(portal)/schedule/week-calendar";
import {
  appointmentCount,
  clockOf,
  shortDate,
  shortName,
} from "@/app/admin/(portal)/settings/settings-model";
import { ChevronDown, Clock } from "@/components/icons";
import { Menu, MenuContent, MenuGroup, MenuLinkItem, MenuTrigger } from "@/components/ui/menu";
import type {
  NeedsNewTime as NeedsNewTimeEntry,
  NewTimeReason,
  SettingsConflict,
} from "@/lib/portal/scheduling/settings-contracts";

/* Booked appointments a change left standing. No change cancels one, so the
   Settings read lists every upcoming appointment that its provider's hours,
   time off or a closed day no longer covers. Where it belongs (a provider's
   page, an office's card) one quiet line counts them, and its menu lists
   each, linked to its day on the schedule to pick a new time. The line goes
   away by itself once each has a new time. */

const REASON = {
  outside_hours: "Outside their hours",
  time_off: "Time off",
  office_closed: "Office closed",
} as const satisfies Record<NewTimeReason, string>;

function when(entry: Readonly<Pick<SettingsConflict, "date" | "startsAt" | "endsAt">>) {
  return `${shortDate(entry.date)} · ${clockOf(practiceMinute(entry.startsAt))}–${clockOf(endMinute(entry.endsAt))}`;
}

export function NeedsNewTime({
  entries,
  withProvider,
}: Readonly<{
  entries: readonly NeedsNewTimeEntry[];
  /** On an office's card, each row names who the appointment is with. */
  withProvider: boolean;
}>) {
  if (entries.length === 0) return null;
  const label = `${appointmentCount(entries.length)} need${entries.length === 1 ? "s" : ""} a new time`;
  return (
    <Menu>
      <MenuTrigger className="settings-needs-time" data-testid="needs-new-time">
        <Clock aria-hidden="true" className="size-4 shrink-0" />
        <span className="grow text-start">{label}</span>
        <ChevronDown aria-hidden="true" className="size-3.5 shrink-0" />
      </MenuTrigger>
      <MenuContent align="start" className="max-w-[min(26rem,92vw)] min-w-72">
        <MenuGroup>
          {entries.map((entry) => (
            <MenuLinkItem
              key={entry.id}
              render={<Link href={dayHref(entry.date)} />}
              className="settings-needs-time-item"
            >
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold">{when(entry)}</span>
                <span className="truncate text-[0.8125rem] text-(--wgi-muted-ink)">
                  <span data-ui-redact="patient-name">{entry.patientListName}</span> ·{" "}
                  {entry.appointmentType}
                  {withProvider ? ` · ${shortName(entry.providerName)}` : ""}
                </span>
              </span>
              <span className="ms-auto shrink-0 text-[0.75rem] text-(--wgi-muted-ink)">
                {REASON[entry.reason]}
              </span>
            </MenuLinkItem>
          ))}
        </MenuGroup>
      </MenuContent>
    </Menu>
  );
}

/** The appointments a change would leave outside its provider's hours, inside a sheet. */
export function ConflictList({
  conflicts,
}: Readonly<{
  conflicts: readonly SettingsConflict[];
}>) {
  return (
    <ul className="settings-conflicts" aria-label="Booked appointments in the way">
      {conflicts.map((conflict) => (
        <li key={conflict.id}>
          <span className="font-semibold">{when(conflict)}</span>
          <span>
            <span data-ui-redact="patient-name">{conflict.patientListName}</span> ·{" "}
            {conflict.appointmentType}
            {conflict.providerName === undefined ? "" : ` · ${shortName(conflict.providerName)}`}
          </span>
        </li>
      ))}
    </ul>
  );
}
