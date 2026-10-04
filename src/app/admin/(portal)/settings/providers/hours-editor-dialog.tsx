"use client";

import { useState } from "react";

import { addDays } from "@/app/admin/(portal)/schedule/week-calendar";
import { ConflictList } from "@/app/admin/(portal)/settings/needs-new-time";
import {
  dayProblem,
  draftOf,
  laterBlock,
  moveBlock,
  officeDay,
  plannedWeeks,
  sameWeek,
  startDay,
  weekOfDraft,
  weekOn,
} from "@/app/admin/(portal)/settings/providers/providers-model";
import type {
  DraftBlock,
  WeekDraft,
  WeekWindow,
} from "@/app/admin/(portal)/settings/providers/providers-model";
import {
  QUARTER_HOUR,
  WEEK_ORDER,
  appointmentCount,
  clockOf,
  longDay,
  placeName,
  settingsFailureMessage,
  shortDate,
} from "@/app/admin/(portal)/settings/settings-model";
import { SettingsSheet } from "@/app/admin/(portal)/settings/settings-sheet";
import type { SettingsSend } from "@/app/admin/(portal)/settings/use-settings-command";
import { Plus, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { CalendarDay } from "@/components/ui/calendar";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import type {
  SchedulingSettings,
  SettingsConflict,
  SettingsProvider,
} from "@/lib/portal/scheduling/settings-contracts";

/* Edit hours (issue #352): a provider's whole week, set from a start date.
   Every day is a row: a switch for whether they work it, and for each block
   of the day the office and the times, chosen from that office's open hours.
   A day turned on starts at the office they work at most, for its whole day.
   Saving sends the week; when bookings would fall outside it, the sheet
   lists them and saves only when asked, keeping them booked to be given new
   times. */

const ANOTHER_DAY = "another";

function nextMonday(today: string): string {
  let day = addDays(today, 1);
  while (new Date(`${day}T12:00:00Z`).getUTCDay() !== 1) day = addDays(day, 1);
  return day;
}

function firstOfNextMonth(today: string): string {
  const [year = 0, month = 1] = today.split("-").map(Number);
  const next =
    month === 12
      ? `${String(year + 1)}-01-01`
      : `${String(year)}-${String(month + 1).padStart(2, "0")}-01`;
  return next;
}

function startChoices(today: string, startsOn: string) {
  const choices = new Map<string, string>([
    [today, `Today, ${shortDate(today)}`],
    [nextMonday(today), `Next Monday, ${shortDate(nextMonday(today))}`],
    [firstOfNextMonth(today), `The 1st of next month, ${shortDate(firstOfNextMonth(today))}`],
  ]);
  if (!choices.has(startsOn)) choices.set(startsOn, shortDate(startsOn));
  return [...choices.entries()].toSorted(([a], [b]) => a.localeCompare(b));
}

const QUARTERS = Array.from({ length: (24 * 60) / QUARTER_HOUR + 1 }, (_, i) => i * QUARTER_HOUR);

function timeChoices(open: number, close: number, current: number, edge: "from" | "until") {
  const within = QUARTERS.filter((minute) =>
    edge === "from" ? minute >= open && minute < close : minute > open && minute <= close,
  );
  return within.includes(current) ? within : [...within, current].toSorted((a, b) => a - b);
}

function BlockRow({
  block,
  index,
  weekday,
  settings,
  onChange,
  onRemove,
}: Readonly<{
  block: DraftBlock;
  index: number;
  weekday: number;
  settings: SchedulingSettings;
  onChange: (block: DraftBlock) => void;
  onRemove: (() => void) | null;
}>) {
  const { locations } = settings;
  const day = longDay(weekday);
  const which = index === 0 ? day : `${day}, later`;
  const location = locations.find((each) => each.id === block.locationId);
  const office = officeDay(location, weekday) ?? { open: 0, close: 24 * 60 };
  return (
    <div className="settings-hours-block">
      <NativeSelect
        aria-label={`${which}: office`}
        className="settings-time-select settings-hours-office"
        value={block.locationId}
        onChange={(event) => {
          const next = locations.find((each) => each.id === event.target.value);
          if (next !== undefined) onChange(moveBlock(block, weekday, location, next));
        }}
      >
        {locations.map((each) => (
          <option key={each.id} value={each.id} disabled={officeDay(each, weekday) === null}>
            {placeName(each)}
            {officeDay(each, weekday) === null ? " (closed)" : ""}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        aria-label={`${which}: from`}
        className="settings-time-select"
        value={block.open}
        onChange={(event) => {
          onChange({ ...block, open: Number(event.target.value) });
        }}
      >
        {timeChoices(office.open, office.close, block.open, "from").map((minute) => (
          <option key={minute} value={minute}>
            {clockOf(minute)}
          </option>
        ))}
      </NativeSelect>
      <span className="text-[0.8125rem] text-(--wgi-muted-ink)">to</span>
      <NativeSelect
        aria-label={`${which}: until`}
        className="settings-time-select"
        value={block.close}
        onChange={(event) => {
          onChange({ ...block, close: Number(event.target.value) });
        }}
      >
        {timeChoices(office.open, office.close, block.close, "until").map((minute) => (
          <option key={minute} value={minute}>
            {clockOf(minute)}
          </option>
        ))}
      </NativeSelect>
      {onRemove === null ? null : (
        <button
          type="button"
          className="settings-row-more"
          aria-label={`Remove ${day}'s later hours`}
          onClick={onRemove}
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      )}
    </div>
  );
}

function StartField({
  today,
  startsOn,
  replaces,
  onChange,
}: Readonly<{
  today: string;
  startsOn: string;
  /** The planned changes this week would replace. */
  replaces: readonly string[];
  onChange: (day: string) => void;
}>) {
  const [picking, setPicking] = useState(false);
  return (
    <Field>
      <FieldLabel htmlFor="hours-starts-on">Starting</FieldLabel>
      <NativeSelect
        id="hours-starts-on"
        data-initial-focus
        value={picking ? ANOTHER_DAY : startsOn}
        onChange={(event) => {
          const picked = event.target.value === ANOTHER_DAY;
          setPicking(picked);
          if (!picked) onChange(event.target.value);
        }}
      >
        {startChoices(today, startsOn).map(([day, label]) => (
          <option key={day} value={day}>
            {label}
          </option>
        ))}
        <option value={ANOTHER_DAY}>Another day…</option>
      </NativeSelect>
      {picking ? (
        <CalendarDay
          className="settings-span-calendar"
          day={startsOn}
          min={today}
          max={addDays(today, 366)}
          disabled={false}
          onChange={(day) => {
            onChange(day);
            setPicking(false);
          }}
        />
      ) : null}
      {replaces.length > 0 ? (
        <FieldDescription>
          This replaces the change on {replaces.map((day) => shortDate(day)).join(" and ")}.
        </FieldDescription>
      ) : null}
    </Field>
  );
}

function DayEditor({
  weekday,
  blocks,
  draft,
  problem,
  settings,
  onChange,
}: Readonly<{
  weekday: number;
  blocks: readonly DraftBlock[];
  draft: WeekDraft;
  problem: string | null;
  settings: SchedulingSettings;
  onChange: (blocks: readonly DraftBlock[]) => void;
}>) {
  const { locations } = settings;
  const later = laterBlock(blocks, weekday, locations);
  return (
    <li className="settings-hours-edit-day">
      <label className="settings-hours-edit-switch">
        <Switch
          checked={blocks.length > 0}
          onCheckedChange={(on) => {
            onChange(on ? startDay(draft, weekday, locations) : []);
          }}
        />
        <span className="settings-office-day-name">{longDay(weekday)}</span>
      </label>
      <div className="flex min-w-0 flex-col gap-2">
        {blocks.length === 0 ? <span className="settings-hours-off">Not working</span> : null}
        {blocks.map((block, index) => (
          <BlockRow
            // react-doctor-disable-next-line react-doctor/no-array-index-as-key -- a day's blocks are positional: the first stays the first while its times change
            key={index}
            block={block}
            index={index}
            weekday={weekday}
            settings={settings}
            onChange={(changed) => {
              onChange(blocks.map((each, at) => (at === index ? changed : each)));
            }}
            onRemove={
              index === 0
                ? null
                : () => {
                    onChange(blocks.filter((_, at) => at !== index));
                  }
            }
          />
        ))}
        {later === null || blocks.length >= 3 ? null : (
          <button
            type="button"
            className="settings-text-command self-start"
            onClick={() => {
              onChange([...blocks, later]);
            }}
          >
            <Plus aria-hidden="true" className="size-3.5" />
            Add hours later in the day
          </button>
        )}
        {problem === null ? null : <FieldError>{problem}</FieldError>}
      </div>
    </li>
  );
}

function ConflictStep({
  conflicts,
  name,
}: Readonly<{ conflicts: readonly SettingsConflict[]; name: string }>) {
  return (
    <div className="flex flex-col gap-3">
      <p role="status" className="text-[0.9375rem] leading-6 font-semibold text-(--wgi-name-ink)">
        {appointmentCount(conflicts.length)} {conflicts.length === 1 ? "is" : "are"} booked outside
        these hours.
      </p>
      <ConflictList conflicts={conflicts} />
      <p className="text-[0.8125rem] leading-5 text-(--wgi-muted-ink)">
        They stay booked, and {name}&apos;s page lists them until each has a new time.
      </p>
    </div>
  );
}

function HoursFooter({
  reviewing,
  pending,
  canSave,
  onCancel,
  onBack,
  onKeepBooked,
}: Readonly<{
  reviewing: boolean;
  pending: boolean;
  canSave: boolean;
  onCancel: () => void;
  onBack: () => void;
  onKeepBooked: () => void;
}>) {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        data-glass="secondary"
        disabled={pending}
        onClick={reviewing ? onBack : onCancel}
      >
        {reviewing ? "Back" : "Cancel"}
      </Button>
      {reviewing ? (
        <Button type="button" data-glass="primary" disabled={pending} onClick={onKeepBooked}>
          {pending ? "Saving…" : "Save and keep them booked"}
        </Button>
      ) : (
        <Button type="submit" data-glass="primary" disabled={pending || !canSave}>
          {pending ? "Saving…" : "Save hours"}
        </Button>
      )}
    </>
  );
}

export function HoursEditorDialog({
  provider,
  settings,
  startsOn: initialStart,
  week,
  send,
  onClose,
}: Readonly<{
  provider: SettingsProvider;
  settings: SchedulingSettings;
  startsOn: string;
  week: readonly WeekWindow[];
  send: SettingsSend;
  onClose: () => void;
}>) {
  const { locations, today } = settings;
  const [startsOn, setStartsOn] = useState(initialStart);
  const [draft, setDraft] = useState<WeekDraft>(() => draftOf(week));
  const [conflicts, setConflicts] = useState<readonly SettingsConflict[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const next = weekOfDraft(draft);
  const problems = new Map(
    WEEK_ORDER.flatMap((weekday) => {
      const problem = dayProblem(draft.get(weekday) ?? [], weekday, locations);
      return problem === null ? [] : [[weekday, problem] as const];
    }),
  );
  const before = weekOn(provider.hours, startsOn);
  const canSave = problems.size === 0 && !sameWeek(next, before);

  async function save(keepBooked: boolean) {
    if (!canSave) return;
    setPending(true);
    setError(null);
    const command = {
      kind: "set_provider_weekly_hours",
      id: provider.id,
      expectedVersion: provider.hoursVersion,
      startsOn,
      dryRun: false,
    } as const;
    const kept = keepBooked && conflicts !== null ? conflicts.length : 0;
    try {
      const outcome = await send(
        { ...command, hours: next, keepBooked },
        {
          quiet: true,
          undo: {
            headline:
              startsOn === today
                ? `${provider.name}'s hours changed`
                : `${provider.name}'s hours change on ${shortDate(startsOn)}`,
            detail:
              kept === 0
                ? null
                : `${appointmentCount(kept)} need${kept === 1 ? "s" : ""} a new time.`,
            inverse: { ...command, hours: before, keepBooked: true },
            slot: `hours:${provider.id}`,
          },
        },
      );
      if (outcome.ok) onClose();
      else if (outcome.code === "schedule_in_use" && outcome.conflicts !== undefined)
        setConflicts(outcome.conflicts);
      else setError(settingsFailureMessage(outcome.code));
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsSheet
      title={`${provider.name}'s hours`}
      testId="hours-editor-dialog"
      className="settings-hours-editor"
      busy={pending}
      onClose={onClose}
      onSubmit={() => {
        void save(false);
      }}
      footer={
        <HoursFooter
          reviewing={conflicts !== null}
          pending={pending}
          canSave={canSave}
          onCancel={onClose}
          onBack={() => {
            setConflicts(null);
          }}
          onKeepBooked={() => {
            void save(true);
          }}
        />
      }
    >
      {conflicts === null ? (
        <div className="flex flex-col gap-4">
          <StartField
            today={today}
            startsOn={startsOn}
            replaces={plannedWeeks(provider.hours, today)
              .filter((plan) => plan.from > startsOn)
              .map((plan) => plan.from)}
            onChange={setStartsOn}
          />
          <ul className="settings-hours-edit" aria-label="Days of the week">
            {WEEK_ORDER.map((weekday) => (
              <DayEditor
                key={weekday}
                weekday={weekday}
                blocks={draft.get(weekday) ?? []}
                draft={draft}
                problem={problems.get(weekday) ?? null}
                settings={settings}
                onChange={(blocks) => {
                  setDraft(new Map([...draft, [weekday, blocks]]));
                  setError(null);
                }}
              />
            ))}
          </ul>
          {error === null ? null : (
            <p role="alert" className="settings-notice">
              {error}
            </p>
          )}
        </div>
      ) : (
        <ConflictStep conflicts={conflicts} name={provider.name} />
      )}
    </SettingsSheet>
  );
}
