"use client";

import { useState } from "react";
import type { CSSProperties } from "react";

import {
  addDay,
  canSplit,
  dayDescription,
  dayWindows,
  joinDay,
  moveDay,
  officeDay,
  officeFor,
  restDays,
  rulerAt,
  rulerSpan,
  splitDay,
  weekOf,
  windowBounds,
  withDay,
  workingDays,
} from "@/app/admin/(portal)/settings/providers/providers-model";
import type {
  MinuteSpan,
  WeekWindow,
} from "@/app/admin/(portal)/settings/providers/providers-model";
import {
  QUARTER_HOUR,
  clockOf,
  currentHours,
  dayRuns,
  longDay,
  placeName,
  rulerLabels,
  shortDay,
} from "@/app/admin/(portal)/settings/settings-model";
import type { SettingsSend } from "@/app/admin/(portal)/settings/use-settings-command";
import { ChevronDown, MapPin, Plus } from "@/components/icons";
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import { Slider } from "@/components/ui/slider";
import type {
  SchedulingSettings,
  SettingsLocation,
  SettingsProvider,
} from "@/lib/portal/scheduling/settings-contracts";

/* A provider's weekly hours (issue #352, Figma St1): one row per working
   day, its office in a chip and each working window a bar on an hour ruler
   whose ends drag in quarter hours. The bar follows the pointer; the week is
   sent when the drag ends, and a run of edits keeps one Undo toast, its Undo
   the week before the last edit. Office hours bound every bar, and a bar
   cannot cross its neighbor. */

interface DayRowProps {
  readonly weekday: number;
  readonly week: readonly WeekWindow[];
  readonly span: MinuteSpan;
  readonly locations: readonly SettingsLocation[];
  readonly canEdit: boolean;
  readonly onDrag: (week: readonly WeekWindow[]) => void;
  readonly onCommit: (week: readonly WeekWindow[], weekday: number) => void;
}

function barStyle(span: Readonly<MinuteSpan>, open: number, close: number): CSSProperties {
  const left = rulerAt(span, open);
  return { left: `${String(left)}%`, width: `${String(rulerAt(span, close) - left)}%` };
}

/** The hour track's faint lines, one an hour across the ruler's span. */
function hourLines(span: Readonly<MinuteSpan>): CSSProperties {
  return { backgroundSize: `${String(6000 / (span.close - span.open))}% 100%` };
}

function DayRow({ weekday, week, span, locations, canEdit, onDrag, onCommit }: DayRowProps) {
  const windows = dayWindows(week, weekday);
  const place = locations.find((location) => location.id === windows[0]?.locationId);
  const office = officeDay(place, weekday) ?? { open: 0, close: 24 * 60 };
  const day = longDay(weekday);

  return (
    <div className="settings-hours-row">
      <span className="settings-hours-day">{shortDay(weekday)}</span>
      {canEdit ? (
        <Menu>
          <MenuTrigger
            className="settings-hours-chip"
            aria-label={`${day} office: ${place === undefined ? "none" : placeName(place)}`}
          >
            <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{place === undefined ? "Office" : placeName(place)}</span>
            <ChevronDown aria-hidden="true" className="size-3 shrink-0 text-(--wgi-icon-ink)" />
          </MenuTrigger>
          <MenuContent className="min-w-52">
            <MenuRadioGroup
              value={place?.id ?? ""}
              onValueChange={(id: string) => {
                const next = locations.find((location) => location.id === id);
                if (next !== undefined) onCommit(moveDay(week, weekday, next), weekday);
              }}
            >
              {locations.map((location) => (
                <MenuRadioItem
                  key={location.id}
                  value={location.id}
                  closeOnClick
                  disabled={officeDay(location, weekday) === null}
                >
                  <span className="truncate">{placeName(location)}</span>
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
            <MenuSeparator />
            <MenuGroup>
              {canSplit(windows) ? (
                <MenuItem
                  onClick={() => {
                    onCommit(splitDay(week, weekday), weekday);
                  }}
                >
                  Split around lunch
                </MenuItem>
              ) : null}
              {windows.length > 1 ? (
                <MenuItem
                  onClick={() => {
                    onCommit(joinDay(week, weekday), weekday);
                  }}
                >
                  Join into one
                </MenuItem>
              ) : null}
              <MenuItem
                onClick={() => {
                  onCommit(withDay(week, weekday, []), weekday);
                }}
              >
                Not working
              </MenuItem>
            </MenuGroup>
          </MenuContent>
        </Menu>
      ) : (
        <span className="settings-hours-chip">
          <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">{place === undefined ? "Office" : placeName(place)}</span>
        </span>
      )}
      <span className="settings-hours-track" style={hourLines(span)}>
        {windows.map((window, index) => {
          const label = windows.length > 1 ? `${day} window ${String(index + 1)}` : day;
          if (!canEdit)
            return (
              <span
                key={`${String(window.openMinute)}-${String(index)}`}
                className="settings-hours-bar"
                style={barStyle(span, window.openMinute, window.closeMinute)}
                aria-label={`${label}: ${clockOf(window.openMinute)} to ${clockOf(window.closeMinute)}`}
              />
            );
          const bounds = windowBounds(windows, index, office);
          const min = Math.min(Math.max(bounds.open, span.open), window.openMinute);
          const max = Math.max(Math.min(bounds.close, span.close), window.closeMinute);
          return (
            <Slider
              // react-doctor-disable-next-line react-doctor/no-array-index-as-key -- a day's windows are positional: the first stays the first while its ends are dragged, and keying by its minutes would remount the slider under the pointer
              key={index}
              tone="hours"
              className="settings-hours-slider"
              style={barStyle(span, min, max)}
              min={min}
              max={max}
              step={QUARTER_HOUR}
              largeStep={60}
              minStepsBetweenValues={1}
              value={[window.openMinute, window.closeMinute]}
              thumbLabel={(thumb) => `${label} ${thumb === 0 ? "start" : "end"}`}
              thumbValueText={(minute) => clockOf(minute)}
              onValueChange={(value: readonly number[]) => {
                const [open = window.openMinute, close = window.closeMinute] = value;
                onDrag(
                  withDay(
                    week,
                    weekday,
                    windows.map((other, at) =>
                      at === index ? { ...other, openMinute: open, closeMinute: close } : other,
                    ),
                  ),
                );
              }}
              onValueCommitted={(value: readonly number[]) => {
                const [open = window.openMinute, close = window.closeMinute] = value;
                onCommit(
                  withDay(
                    week,
                    weekday,
                    windows.map((other, at) =>
                      at === index ? { ...other, openMinute: open, closeMinute: close } : other,
                    ),
                  ),
                  weekday,
                );
              }}
            />
          );
        })}
      </span>
    </div>
  );
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
  const span = rulerSpan(locations);
  /* `sent` is the last week this page sent, shown until the server's next
     read lands; `live` is the week under a drag, before it is sent. */
  const [seenVersion, setSeenVersion] = useState(provider.version);
  const [sent, setSent] = useState<readonly WeekWindow[] | null>(null);
  const [live, setLive] = useState<readonly WeekWindow[] | null>(null);
  if (seenVersion !== provider.version) {
    setSeenVersion(provider.version);
    setSent(null);
  }
  const base = sent ?? weekOf(currentHours(provider, today));
  const week = live ?? base;
  const rest = restDays(week);
  const addable = rest.filter((day) => officeFor(week, day, locations) !== null);

  function commit(next: readonly WeekWindow[], weekday: number) {
    const previous = base;
    setLive(null);
    setSent(next);
    const command = {
      kind: "set_provider_weekly_hours",
      id: provider.id,
      expectedVersion: provider.version,
    } as const;
    void send(
      { ...command, hours: next },
      {
        undo: {
          headline: `${provider.name}'s hours changed`,
          detail: dayDescription(dayWindows(next, weekday), weekday, locations),
          inverse: { ...command, hours: previous },
          slot: `hours:${provider.id}`,
        },
      },
    ).then((outcome) => {
      if (!outcome.ok) setSent(null);
    });
  }

  const hours = (span.close - span.open) / 60;
  /* An hour on the ruler is at least 36px wide. */
  const grid = { gridTemplateColumns: `3.5rem 8.5rem minmax(${String(hours * 2.25)}rem, 1fr)` };

  return (
    <section aria-labelledby="weekly-hours" className="flex flex-col gap-1">
      <h3 id="weekly-hours" className="settings-section-title">
        Weekly hours
      </h3>
      <p className="text-[0.75rem] leading-4 text-(--wgi-muted-ink)">
        Every week unless a day is changed on the schedule.
        {canEdit ? " Drag the ends of a bar." : null}
      </p>
      <div className="settings-hours" style={grid}>
        <div aria-hidden="true" className="settings-hours-ruler">
          {rulerLabels(span.open + 60, span.close).map(({ minute, label }) => (
            <span key={minute} style={{ left: `${String(rulerAt(span, minute))}%` }}>
              {label}
            </span>
          ))}
        </div>
        {workingDays(week).map((weekday) => (
          <DayRow
            key={weekday}
            weekday={weekday}
            week={week}
            span={span}
            locations={locations}
            canEdit={canEdit}
            onDrag={setLive}
            onCommit={commit}
          />
        ))}
        {rest.length === 0 ? null : (
          <div className="settings-hours-row is-rest">
            <span className="settings-hours-day">{dayRuns(rest)}</span>
            <span className="settings-hours-track" style={hourLines(span)}>
              <span className="settings-hours-rest">
                Not working
                {canEdit && addable.length > 0 ? (
                  <Menu>
                    <MenuTrigger className="settings-text-command">
                      <Plus aria-hidden="true" className="size-3.5 shrink-0" />
                      Add day
                    </MenuTrigger>
                    <MenuContent className="min-w-44">
                      <MenuGroup>
                        {addable.map((day) => (
                          <MenuItem
                            key={day}
                            onClick={() => {
                              const office = officeFor(week, day, locations);
                              if (office !== null) commit(addDay(week, day, office), day);
                            }}
                          >
                            {longDay(day)}
                          </MenuItem>
                        ))}
                      </MenuGroup>
                    </MenuContent>
                  </Menu>
                ) : null}
              </span>
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
