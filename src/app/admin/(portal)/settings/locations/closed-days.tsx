"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import { addDays } from "@/app/admin/(portal)/schedule/week-calendar";
import {
  appointmentCount,
  bookedCount,
  dateRange,
  placeName,
} from "@/app/admin/(portal)/settings/settings-model";
import type { SettingsSend } from "@/app/admin/(portal)/settings/use-settings-command";
import { Plus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { CalendarSpan } from "@/components/ui/calendar";
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
import type { SettingsLocation } from "@/lib/portal/scheduling/settings-contracts";

/* An office's closed days (issue #352, Figma St5): the days coming up when
   nobody is booked there, holidays mostly. Add opens a month to pick a day
   or a run of days and a short note; before anything is saved a dry run
   says how many booked appointments fall then. Closing never cancels them:
   they join the office's appointments that need a new time. Days in a row
   with the same note show as one run, and a run reopens in one change, with
   Undo. */

/* The longest run the server accepts in one change. */
const LONGEST_RUN = 61;

interface Draft {
  readonly from: string;
  readonly to: string;
  readonly note: string;
}

const FRESH: Draft = { from: "", to: "", note: "" };

interface Run {
  readonly ids: readonly string[];
  readonly first: string;
  readonly last: string;
  readonly note: string | null;
}

/** Closed days in a row that share a note, as one run each. */
function runsOf(closures: SettingsLocation["closures"], today: string): Run[] {
  const runs: { ids: string[]; first: string; last: string; note: string | null }[] = [];
  for (const closure of closures
    .filter((each) => each.closedOn >= today)
    .toSorted((a, b) => a.closedOn.localeCompare(b.closedOn))) {
    const run = runs.at(-1);
    if (
      run !== undefined &&
      addDays(run.last, 1) === closure.closedOn &&
      run.note === closure.note
    ) {
      run.ids.push(closure.id);
      run.last = closure.closedOn;
    } else
      runs.push({
        ids: [closure.id],
        first: closure.closedOn,
        last: closure.closedOn,
        note: closure.note,
      });
  }
  return runs;
}

function closeCommand(location: Readonly<SettingsLocation>, draft: Draft, dryRun: boolean) {
  const note = draft.note.trim();
  return {
    kind: "add_location_closure",
    id: location.id,
    closedOn: draft.from,
    closedThrough: draft.to,
    note: note === "" ? null : note,
    dryRun,
  } as const;
}

function AddClosedDays({
  location,
  today,
  taken,
  send,
}: Readonly<{
  location: SettingsLocation;
  today: string;
  taken: readonly string[];
  send: SettingsSend;
}>) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(FRESH);
  const [booked, setBooked] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const asked = useRef(0);
  const single = draft.from !== "" && draft.from === draft.to;
  const tooLong = draft.from !== "" && addDays(draft.from, LONGEST_RUN - 1) < draft.to;

  /* Picking days asks the server what they would cover; an answer to an
     older question is dropped. The note doesn't change the answer. */
  function pick(from: string, to: string) {
    const next = { ...draft, from, to };
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
    if (draft.from === "" || tooLong) return;
    setPending(true);
    try {
      const outcome = await send(closeCommand(location, draft, false));
      if (!outcome.ok) return;
      reset(false);
      const covered = outcome.conflicts?.length ?? 0;
      toast.success(`${placeName(location)} closed ${dateRange(draft.from, draft.to)}`, {
        description:
          covered === 0
            ? undefined
            : `${appointmentCount(covered)} need${covered === 1 ? "s" : ""} a new time.`,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={reset}>
      <PopoverTrigger
        className="settings-text-command"
        aria-label={`Add closed days for ${location.name}`}
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
          <CalendarSpan
            className="settings-span-calendar"
            from={draft.from}
            to={draft.to}
            min={today}
            off={taken}
            onChange={pick}
          />
          <span aria-live="polite" className="text-[0.875rem] font-semibold text-(--wgi-name-ink)">
            {draft.from === ""
              ? "Pick a day, or the first and last day"
              : dateRange(draft.from, draft.to)}
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
          {tooLong ? (
            <p role="status" className="settings-notice">
              Close up to {LONGEST_RUN} days at a time.
            </p>
          ) : booked !== null && booked > 0 ? (
            <p role="status" className="settings-notice">
              {bookedCount(booked, single ? "this day" : "these days")} They stay booked until each
              has a new time.
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
            disabled={draft.from === "" || tooLong || pending}
            onClick={() => {
              void add();
            }}
          >
            {pending
              ? "Adding…"
              : single || draft.from === ""
                ? "Close this day"
                : "Close these days"}
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
  const runs = runsOf(location.closures, today);

  function reopen(run: Readonly<Run>) {
    void send(
      { kind: "remove_location_closure", id: location.id, closureIds: run.ids },
      {
        undo: {
          headline: `${placeName(location)} open ${dateRange(run.first, run.last)}`,
          detail: run.note,
          inverse: {
            kind: "add_location_closure",
            id: location.id,
            closedOn: run.first < today ? today : run.first,
            closedThrough: run.last,
            note: run.note,
            dryRun: false,
          },
        },
      },
    );
  }

  return (
    <div className="settings-location-row">
      <span className="settings-location-label">Closed days</span>
      {runs.length === 0 ? (
        <span className="settings-location-value">None coming up</span>
      ) : (
        <ul className="settings-closures" aria-label={`${location.name} closed days`}>
          {runs.map((run) =>
            canEdit ? (
              <li key={run.first}>
                <Menu>
                  <MenuTrigger className="settings-closure" title={run.note ?? undefined}>
                    {dateRange(run.first, run.last)}
                  </MenuTrigger>
                  <MenuContent align="end" className="min-w-48">
                    <MenuGroup>
                      {run.note === null ? null : <MenuLabel>{run.note}</MenuLabel>}
                      <MenuItem
                        onClick={() => {
                          reopen(run);
                        }}
                      >
                        {run.ids.length === 1 ? "Open this day" : "Open these days"}
                      </MenuItem>
                    </MenuGroup>
                  </MenuContent>
                </Menu>
              </li>
            ) : (
              <li key={run.first} title={run.note ?? undefined} className="settings-closure">
                {dateRange(run.first, run.last)}
              </li>
            ),
          )}
        </ul>
      )}
      {canEdit ? (
        <AddClosedDays
          location={location}
          today={today}
          taken={location.closures.map((closure) => closure.closedOn)}
          send={send}
        />
      ) : null}
    </div>
  );
}
