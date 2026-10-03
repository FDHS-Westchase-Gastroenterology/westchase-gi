"use client";

import { CalendarOffIcon } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { dayHref, endMinute, practiceMinute } from "@/app/admin/(portal)/schedule/week-calendar";
import {
  timeOffDetail,
  upcomingTimeOff,
} from "@/app/admin/(portal)/settings/providers/providers-model";
import {
  QUARTER_HOUR,
  bookedCount,
  clockOf,
  dateRange,
  datesBetween,
  reasonLabel,
  shortDate,
  timeOffDays,
} from "@/app/admin/(portal)/settings/settings-model";
import type { SettingsSend } from "@/app/admin/(portal)/settings/use-settings-command";
import { ChevronDown, Ellipsis, Plus, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { CalendarSpan } from "@/components/ui/calendar";
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "@/components/ui/menu";
import { NativeSelect } from "@/components/ui/native-select";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { TIME_OFF_REASONS } from "@/lib/portal/scheduling/settings-contracts";
import type {
  SchedulingSettings,
  SettingsConflict,
  SettingsProvider,
  TimeOffReason,
} from "@/lib/portal/scheduling/settings-contracts";

/* A provider's time off (issue #352, Figma St2). Upcoming entries list
   soonest first, each removable with Undo. Add time off opens a popover
   beside its link: a month to pick the run of days (or one day and its
   hours), the reason, and before anything is saved a dry run that says how
   many booked appointments the time would cover. Time off never cancels
   them; once it is added they are listed here, each a link to its day on
   the schedule, so staff can choose new times. */

const QUARTERS = Array.from({ length: (24 * 60) / QUARTER_HOUR + 1 }, (_, i) => i * QUARTER_HOUR);

interface Draft {
  readonly from: string;
  readonly to: string;
  readonly allDay: boolean;
  readonly start: number;
  readonly end: number;
  readonly reason: TimeOffReason;
}

const FRESH: Draft = {
  from: "",
  to: "",
  allDay: true,
  start: 9 * 60,
  end: 12 * 60,
  reason: "personal",
};

function draftCommand(provider: Readonly<SettingsProvider>, draft: Draft, dryRun: boolean) {
  const allDay = draft.allDay || draft.from !== draft.to;
  return {
    kind: "add_time_off",
    id: provider.id,
    expectedVersion: provider.version,
    startsOn: draft.from,
    endsOn: draft.to,
    allDay,
    startMinute: allDay ? null : draft.start,
    endMinute: allDay ? null : draft.end,
    reason: draft.reason,
    dryRun,
  } as const;
}

function AddTimeOff({
  provider,
  today,
  taken,
  send,
  onAdded,
}: Readonly<{
  provider: SettingsProvider;
  today: string;
  taken: readonly string[];
  send: SettingsSend;
  onAdded: (conflicts: readonly SettingsConflict[]) => void;
}>) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(FRESH);
  const [booked, setBooked] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const asked = useRef(0);
  const single = draft.from !== "" && draft.from === draft.to;
  const timed = single && !draft.allDay;
  const valid = draft.from !== "" && (!timed || draft.end > draft.start);
  const lastName = provider.name.split(/\s+/u).at(-1) ?? provider.name;
  const title = provider.name.startsWith("Dr.") ? `Dr. ${lastName}` : provider.name;

  /* Each change re-asks the server what the time would cover; an answer to
     an older question is dropped. */
  function change(next: Draft) {
    setDraft(next);
    const ticket = asked.current + 1;
    asked.current = ticket;
    const ready =
      next.from !== "" && (next.allDay || next.from !== next.to || next.end > next.start);
    if (!ready) {
      setBooked(null);
      return;
    }
    void send(draftCommand(provider, next, true), { quiet: true }).then((outcome) => {
      if (asked.current !== ticket) return;
      setBooked(outcome.ok ? (outcome.conflicts?.length ?? 0) : null);
    });
  }

  function reset(next: boolean) {
    setOpen(next);
    if (!next) {
      asked.current += 1;
      setDraft(FRESH);
      setBooked(null);
    }
  }

  async function add() {
    if (!valid) return;
    setPending(true);
    const outcome = await send(draftCommand(provider, draft, false));
    setPending(false);
    if (!outcome.ok) return;
    reset(false);
    onAdded(outcome.conflicts ?? []);
  }

  return (
    <Popover open={open} onOpenChange={reset}>
      <PopoverTrigger className="settings-text-command">
        <Plus aria-hidden="true" className="size-3.5" />
        Add time off
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="wgi-settings-popover settings-time-off-popover"
      >
        <div className="flex flex-col gap-3 p-[18px] pb-4">
          <PopoverTitle>Time off for {title}</PopoverTitle>
          <CalendarSpan
            className="settings-span-calendar"
            from={draft.from}
            to={draft.to}
            min={today}
            off={taken}
            onChange={(from, to) => {
              change({ ...draft, from, to });
            }}
          />
          <div className="flex min-h-6 items-center justify-between gap-3">
            <span
              aria-live="polite"
              className="text-[0.875rem] font-semibold text-(--wgi-name-ink)"
            >
              {draft.from === "" ? "Pick the days" : dateRange(draft.from, draft.to)}
            </span>
            <label className="flex items-center gap-2 text-[0.8125rem] text-(--wgi-name-ink)">
              All day
              <Switch
                checked={!timed}
                disabled={!single}
                onCheckedChange={(allDay) => {
                  change({ ...draft, allDay });
                }}
              />
            </label>
          </div>
          {timed ? (
            <div className="flex items-center gap-2">
              <NativeSelect
                aria-label="From"
                className="settings-time-select"
                value={draft.start}
                onChange={(event) => {
                  change({ ...draft, start: Number(event.target.value) });
                }}
              >
                {QUARTERS.slice(0, -1).map((minute) => (
                  <option key={minute} value={minute}>
                    {clockOf(minute)}
                  </option>
                ))}
              </NativeSelect>
              <span className="text-[0.8125rem] text-(--wgi-muted-ink)">to</span>
              <NativeSelect
                aria-label="Until"
                aria-invalid={draft.end <= draft.start}
                className="settings-time-select"
                value={draft.end}
                onChange={(event) => {
                  change({ ...draft, end: Number(event.target.value) });
                }}
              >
                {QUARTERS.slice(1).map((minute) => (
                  <option key={minute} value={minute}>
                    {clockOf(minute)}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ) : null}
          <Menu>
            <MenuTrigger className="settings-reason">
              <span className="text-(--wgi-muted-ink)">Reason</span>
              <span className="ml-auto font-semibold">{reasonLabel(draft.reason)}</span>
              <ChevronDown aria-hidden="true" className="size-3" />
            </MenuTrigger>
            <MenuContent align="end">
              <MenuRadioGroup
                value={draft.reason}
                onValueChange={(value: string) => {
                  const reason = TIME_OFF_REASONS.find((known) => known === value);
                  if (reason !== undefined) change({ ...draft, reason });
                }}
              >
                {TIME_OFF_REASONS.map((reason) => (
                  <MenuRadioItem key={reason} value={reason} closeOnClick>
                    {reasonLabel(reason)}
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
            </MenuContent>
          </Menu>
          {booked !== null && booked > 0 ? (
            <p role="status" className="settings-notice">
              {bookedCount(booked, single ? "this day" : "these days")} After adding, you&apos;ll
              see them and choose new times.
            </p>
          ) : null}
        </div>
        <div className="settings-popover-actions">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              reset(false);
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!valid || pending}
            onClick={() => {
              void add();
            }}
          >
            {pending ? "Adding…" : "Add time off"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Displaced({
  conflicts,
  onDismiss,
}: Readonly<{
  conflicts: readonly SettingsConflict[];
  onDismiss: () => void;
}>) {
  return (
    <div role="status" className="settings-notice flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <p className="grow font-semibold">
          {conflicts.length === 1
            ? "1 booked appointment falls in this time off. Choose a new time for it."
            : `${String(conflicts.length)} booked appointments fall in this time off. Choose new times for them.`}
        </p>
        <button
          type="button"
          aria-label="Dismiss"
          className="settings-notice-close"
          onClick={onDismiss}
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      </div>
      <ul className="flex flex-col gap-1">
        {conflicts.map((conflict) => (
          <li key={conflict.id}>
            <Link href={dayHref(conflict.date)} className="settings-notice-link">
              <span>
                {shortDate(conflict.date)} · {clockOf(practiceMinute(conflict.startsAt))}–
                {clockOf(endMinute(conflict.endsAt))}
              </span>
              <span data-ui-redact className="font-semibold">
                {conflict.patientListName}
              </span>
              <span>{conflict.appointmentType}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TimeOff({
  provider,
  settings,
  send,
}: Readonly<{
  provider: SettingsProvider;
  settings: SchedulingSettings;
  send: SettingsSend;
}>) {
  const { canEdit, today, observedAt } = settings;
  const [displaced, setDisplaced] = useState<readonly SettingsConflict[]>([]);
  const entries = upcomingTimeOff(provider.timeOff, new Date(observedAt));
  const taken = entries.flatMap((entry) => {
    const { first, last } = timeOffDays(entry);
    return datesBetween(first, last);
  });

  function remove(entry: Readonly<SettingsProvider["timeOff"][number]>) {
    const { first, last } = timeOffDays(entry);
    const command = { id: provider.id, expectedVersion: provider.version } as const;
    void send(
      { ...command, kind: "remove_time_off", timeOffId: entry.id },
      {
        undo: {
          headline: "Time off removed",
          detail: `${provider.name} · ${dateRange(first, last)}`,
          inverse: {
            ...command,
            kind: "add_time_off",
            startsOn: first,
            endsOn: last,
            allDay: entry.allDay,
            startMinute: entry.allDay ? null : practiceMinute(entry.startsAt),
            endMinute: entry.allDay ? null : endMinute(entry.endsAt),
            reason: entry.reason ?? "personal",
            dryRun: false,
          },
        },
      },
    );
  }

  return (
    <section aria-labelledby="time-off" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h3 id="time-off" className="settings-section-title">
          Time off
        </h3>
        {canEdit ? (
          <AddTimeOff
            provider={provider}
            today={today}
            taken={taken}
            send={send}
            onAdded={setDisplaced}
          />
        ) : null}
      </div>
      {displaced.length > 0 ? (
        <Displaced
          conflicts={displaced}
          onDismiss={() => {
            setDisplaced([]);
          }}
        />
      ) : null}
      {entries.length === 0 ? (
        <p className="text-[0.8125rem] text-(--wgi-muted-ink)">No time off coming up.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => {
            const { first, last } = timeOffDays(entry);
            return (
              <li key={entry.id} className="settings-time-off-row">
                <CalendarOffIcon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-(--wgi-muted-ink)"
                />
                <span className="text-[0.8125rem] font-semibold text-(--wgi-name-ink)">
                  {dateRange(first, last)}
                </span>
                <span className="grow text-[0.8125rem] text-(--wgi-muted-ink)">
                  {timeOffDetail(entry)}
                </span>
                {canEdit ? (
                  <Menu>
                    <MenuTrigger
                      className="settings-row-more"
                      aria-label={`More for time off ${dateRange(first, last)}`}
                    >
                      <Ellipsis aria-hidden="true" width={15} height={15} />
                    </MenuTrigger>
                    <MenuContent align="end" className="min-w-44">
                      <MenuGroup>
                        <MenuItem
                          onClick={() => {
                            remove(entry);
                          }}
                        >
                          Remove time off
                        </MenuItem>
                      </MenuGroup>
                    </MenuContent>
                  </Menu>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
