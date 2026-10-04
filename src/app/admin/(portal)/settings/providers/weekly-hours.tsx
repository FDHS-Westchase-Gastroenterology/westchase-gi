"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { toast } from "sonner";

import { addDays } from "@/app/admin/(portal)/schedule/week-calendar";
import { HoursEditorDialog } from "@/app/admin/(portal)/settings/providers/hours-editor-dialog";
import {
  dayLine,
  dayWindows,
  plannedWeeks,
  restDays,
  rulerAt,
  rulerSpan,
  weekOn,
  workingDays,
} from "@/app/admin/(portal)/settings/providers/providers-model";
import type {
  MinuteSpan,
  WeekWindow,
} from "@/app/admin/(portal)/settings/providers/providers-model";
import {
  appointmentCount,
  dayRuns,
  settingsFailureMessage,
  shortDate,
  shortDay,
} from "@/app/admin/(portal)/settings/settings-model";
import type { SettingsSend } from "@/app/admin/(portal)/settings/use-settings-command";
import { Ellipsis } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuGroup, MenuItem, MenuTrigger } from "@/components/ui/menu";
import type {
  SchedulingSettings,
  SettingsLocation,
  SettingsProvider,
} from "@/lib/portal/scheduling/settings-contracts";

/* A provider's weekly hours (issue #352, Figma St1): each working day with
   its office and its hours in words, beside a bar on the day's span; then
   any change already planned from a later day, which can be edited or
   cancelled. Edit hours opens the sheet that sets the whole week from a
   start date. */

function barStyle(span: Readonly<MinuteSpan>, open: number, close: number): CSSProperties {
  const left = rulerAt(span, open);
  return { left: `${String(left)}%`, width: `${String(rulerAt(span, close) - left)}%` };
}

function WeekTable({
  week,
  locations,
  span,
}: Readonly<{
  week: readonly WeekWindow[];
  locations: readonly SettingsLocation[];
  span: MinuteSpan;
}>) {
  const rest = restDays(week);
  return (
    <dl className="settings-week">
      {workingDays(week).map((weekday) => {
        const windows = dayWindows(week, weekday);
        return (
          <div key={weekday} className="settings-week-row">
            <dt className="settings-week-day">{shortDay(weekday)}</dt>
            <dd className="settings-week-hours">{dayLine(windows, locations)}</dd>
            <dd aria-hidden="true" className="settings-week-track">
              {windows.map((window) => (
                <span
                  key={`${window.locationId}-${String(window.openMinute)}`}
                  className="settings-week-bar"
                  style={barStyle(span, window.openMinute, window.closeMinute)}
                />
              ))}
            </dd>
          </div>
        );
      })}
      {rest.length === 0 ? null : (
        <div className="settings-week-row is-rest">
          <dt className="settings-week-day">{dayRuns(rest)}</dt>
          <dd className="settings-week-hours">Not working</dd>
        </div>
      )}
    </dl>
  );
}

interface Editing {
  readonly startsOn: string;
  readonly week: readonly WeekWindow[];
}

export function WeeklyHours({
  provider,
  settings,
  send,
}: Readonly<{
  provider: SettingsProvider;
  settings: SchedulingSettings;
  send: SettingsSend;
}>) {
  const { locations, today, canEdit } = settings;
  const [editing, setEditing] = useState<Editing | null>(null);
  const span = rulerSpan(locations);
  const current = weekOn(provider.hours, today);
  const planned = plannedWeeks(provider.hours, today);

  /* Cancelling a planned change sets that day's week back to the one before it, which the
     server then joins to it. */
  function cancelPlanned(from: string) {
    const before = weekOn(provider.hours, addDays(from, -1));
    const command = {
      kind: "set_provider_weekly_hours",
      id: provider.id,
      expectedVersion: provider.hoursVersion,
      startsOn: from,
      keepBooked: false,
      dryRun: false,
    } as const;
    void send(
      { ...command, hours: before },
      {
        quiet: true,
        undo: {
          headline: `The change from ${shortDate(from)} is cancelled`,
          detail: null,
          inverse: {
            ...command,
            keepBooked: true,
            hours: planned.find((plan) => plan.from === from)?.week ?? before,
          },
          slot: `hours:${provider.id}`,
        },
      },
    ).then((outcome) => {
      if (outcome.ok) return;
      if (outcome.code === "schedule_in_use" && outcome.conflicts !== undefined)
        toast.error(
          `${appointmentCount(outcome.conflicts.length)} booked under the planned hours would be left outside them. Edit the change instead.`,
        );
      else toast.error(settingsFailureMessage(outcome.code));
    });
  }

  return (
    <section
      aria-labelledby="weekly-hours"
      className="flex flex-col gap-2"
      data-tour="weekly-hours"
    >
      <div className="flex min-h-9 items-center justify-between gap-3">
        <h3 id="weekly-hours" className="settings-section-title">
          Weekly hours
        </h3>
        {canEdit ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setEditing({ startsOn: today, week: current });
            }}
          >
            Edit hours
          </Button>
        ) : null}
      </div>
      <WeekTable week={current} locations={locations} span={span} />
      {planned.map((plan) => (
        <section
          key={plan.from}
          aria-label={`Hours from ${shortDate(plan.from)}`}
          className="settings-planned"
        >
          <div className="flex items-center justify-between gap-3">
            <h4 className="settings-planned-title">Changes on {shortDate(plan.from)}</h4>
            {canEdit ? (
              <Menu>
                <MenuTrigger
                  className="settings-row-more"
                  aria-label={`More for the change on ${shortDate(plan.from)}`}
                >
                  <Ellipsis aria-hidden="true" width={15} height={15} />
                </MenuTrigger>
                <MenuContent align="end" className="min-w-48">
                  <MenuGroup>
                    <MenuItem
                      onClick={() => {
                        setEditing({ startsOn: plan.from, week: plan.week });
                      }}
                    >
                      Edit this change
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        cancelPlanned(plan.from);
                      }}
                    >
                      Cancel this change
                    </MenuItem>
                  </MenuGroup>
                </MenuContent>
              </Menu>
            ) : null}
          </div>
          <WeekTable week={plan.week} locations={locations} span={span} />
        </section>
      ))}
      {editing === null ? null : (
        <HoursEditorDialog
          provider={provider}
          settings={settings}
          startsOn={editing.startsOn}
          week={editing.week}
          send={send}
          onClose={() => {
            setEditing(null);
          }}
        />
      )}
    </section>
  );
}
