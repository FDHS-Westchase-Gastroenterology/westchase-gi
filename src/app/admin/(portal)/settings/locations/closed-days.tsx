"use client";

import { useRef, useState } from "react";

import { addDays } from "@/app/admin/(portal)/schedule/week-calendar";
import { Displaced } from "@/app/admin/(portal)/settings/displaced";
import { bookedCount, placeName, shortDate } from "@/app/admin/(portal)/settings/settings-model";
import type { SettingsSend } from "@/app/admin/(portal)/settings/use-settings-command";
import { Plus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { CalendarDay } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuTrigger,
} from "@/components/ui/menu";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import type {
  SettingsConflict,
  SettingsLocation,
} from "@/lib/portal/scheduling/settings-contracts";

/* An office's closed days (issue #352, Figma St5): the days coming up when
   nobody is booked there, holidays mostly. Add closed day opens a month to
   pick the day and a short note; before anything is saved a dry run says
   how many booked appointments fall that day. Closing never cancels them:
   once the day is added they are listed under the card to rebook. Each day
   reopens from its own menu, with Undo. */

/* The furthest day the server accepts, three years out. */
const HORIZON_DAYS = 1100;

interface Draft {
  readonly day: string;
  readonly note: string;
}

const FRESH: Draft = { day: "", note: "" };

function closeCommand(location: Readonly<SettingsLocation>, draft: Draft, dryRun: boolean) {
  const note = draft.note.trim();
  return {
    kind: "add_location_closure",
    id: location.id,
    expectedVersion: location.version,
    closedOn: draft.day,
    note: note === "" ? null : note,
    dryRun,
  } as const;
}

function AddClosedDay({
  location,
  today,
  taken,
  send,
  onAdded,
}: Readonly<{
  location: SettingsLocation;
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

  /* Picking a day asks the server what it would cover; an answer to an
     older question is dropped. The note doesn't change the answer. */
  function pick(day: string) {
    const next = { ...draft, day };
    setDraft(next);
    const ticket = asked.current + 1;
    asked.current = ticket;
    void send(closeCommand(location, next, true), { quiet: true }).then((outcome) => {
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
    if (draft.day === "") return;
    setPending(true);
    try {
      const outcome = await send(closeCommand(location, draft, false));
      if (!outcome.ok) return;
      reset(false);
      onAdded(outcome.conflicts ?? []);
    } finally {
      setPending(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={reset}>
      <PopoverTrigger
        className="settings-text-command"
        aria-label={`Add a closed day for ${location.name}`}
      >
        <Plus aria-hidden="true" className="size-3.5" />
        Add
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="wgi-settings-popover settings-time-off-popover"
      >
        <div className="flex flex-col gap-3 p-[18px] pb-4">
          <PopoverTitle>{placeName(location)} closed</PopoverTitle>
          <CalendarDay
            day={draft.day}
            min={today}
            max={addDays(today, HORIZON_DAYS)}
            disabled={false}
            off={taken}
            onChange={pick}
          />
          <span aria-live="polite" className="text-[0.875rem] font-semibold text-(--wgi-name-ink)">
            {draft.day === "" ? "Pick the day" : shortDate(draft.day)}
          </span>
          <Input
            aria-label="Note"
            maxLength={120}
            autoComplete="off"
            placeholder="Note, like Thanksgiving"
            value={draft.note}
            onChange={(event) => {
              setDraft({ ...draft, note: event.target.value });
            }}
          />
          {booked !== null && booked > 0 ? (
            <p role="status" className="settings-notice">
              {bookedCount(booked, "this day")} After adding, you&apos;ll see them and choose new
              times.
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
            disabled={draft.day === "" || pending}
            onClick={() => {
              void add();
            }}
          >
            {pending ? "Adding…" : "Add closed day"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ClosedDays({
  location,
  today,
  canEdit,
  send,
}: Readonly<{
  location: SettingsLocation;
  today: string;
  canEdit: boolean;
  send: SettingsSend;
}>) {
  const [displaced, setDisplaced] = useState<readonly SettingsConflict[]>([]);
  const upcoming = location.closures
    .filter((closure) => closure.closedOn >= today)
    .toSorted((a, b) => a.closedOn.localeCompare(b.closedOn));

  function reopen(closure: Readonly<SettingsLocation["closures"][number]>) {
    const command = { id: location.id, expectedVersion: location.version } as const;
    void send(
      { ...command, kind: "remove_location_closure", closureId: closure.id },
      {
        undo: {
          headline: `${placeName(location)} open ${shortDate(closure.closedOn)}`,
          detail: closure.note,
          inverse: {
            ...command,
            kind: "add_location_closure",
            closedOn: closure.closedOn,
            note: closure.note,
            dryRun: false,
          },
        },
      },
    );
  }

  return (
    <>
      <div className="settings-location-row">
        <span className="settings-location-label">Closed days</span>
        {upcoming.length === 0 ? (
          <span className="settings-location-value">None coming up</span>
        ) : (
          <ul className="settings-closures" aria-label={`${location.name} closed days`}>
            {upcoming.map((closure) =>
              canEdit ? (
                <li key={closure.id}>
                  <Menu>
                    <MenuTrigger className="settings-closure" title={closure.note ?? undefined}>
                      {shortDate(closure.closedOn)}
                    </MenuTrigger>
                    <MenuContent align="end" className="min-w-48">
                      <MenuGroup>
                        {closure.note === null ? null : <MenuLabel>{closure.note}</MenuLabel>}
                        <MenuItem
                          onClick={() => {
                            reopen(closure);
                          }}
                        >
                          Open this day
                        </MenuItem>
                      </MenuGroup>
                    </MenuContent>
                  </Menu>
                </li>
              ) : (
                <li key={closure.id} title={closure.note ?? undefined} className="settings-closure">
                  {shortDate(closure.closedOn)}
                </li>
              ),
            )}
          </ul>
        )}
        {canEdit ? (
          <AddClosedDay
            location={location}
            today={today}
            taken={location.closures.map((closure) => closure.closedOn)}
            send={send}
            onAdded={setDisplaced}
          />
        ) : null}
      </div>
      {displaced.length > 0 ? (
        <div className="settings-location-displaced">
          <Displaced
            message={
              displaced.length === 1
                ? "1 booked appointment falls on this closed day. Choose a new time for it."
                : `${String(displaced.length)} booked appointments fall on this closed day. Choose new times for them.`
            }
            conflicts={displaced}
            onDismiss={() => {
              setDisplaced([]);
            }}
          />
        </div>
      ) : null}
    </>
  );
}
