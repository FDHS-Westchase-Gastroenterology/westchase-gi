"use client";

import { useState } from "react";

import { Check, ChevronDown } from "@/components/icons";
import { CalendarRange } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/* The Activity log's date filter (issue #357; Figma 511:8877): a pull-down
   whose popover holds the common spans on the left and a month on the
   right (HIG Pull-down buttons; the Calendar app's range picking). A span
   applies the moment it is picked, and so does each click on the month, so
   there is no Apply step: the list behind the popover is the preview. The
   month ends today, because nothing is logged after it. Days are the
   practice's (America/New_York) YYYY-MM-DD strings throughout; `today`
   comes from the server so the server and the browser agree on it. */

type Range = Readonly<{ from?: string; to?: string }>;

const PRESETS = ["any", "today", "yesterday", "last7", "last30", "thisMonth", "lastMonth"] as const;
type Preset = (typeof PRESETS)[number];

const PRESET_LABELS = {
  any: "Any date",
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 days",
  last30: "Last 30 days",
  thisMonth: "This month",
  lastMonth: "Last month",
} as const satisfies Record<Preset, string>;

function dayToUtc(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

function utcToDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(day: string, days: number): string {
  const date = dayToUtc(day);
  date.setUTCDate(date.getUTCDate() + days);
  return utcToDay(date);
}

function lastMonth(today: string): Range {
  const date = dayToUtc(today);
  const first = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 0));
  return { from: utcToDay(first), to: utcToDay(last) };
}

const PRESET_RANGES = {
  any: () => ({}),
  today: (today) => ({ from: today, to: today }),
  yesterday: (today) => ({ from: addDays(today, -1), to: addDays(today, -1) }),
  last7: (today) => ({ from: addDays(today, -6), to: today }),
  last30: (today) => ({ from: addDays(today, -29), to: today }),
  thisMonth: (today) => ({ from: `${today.slice(0, 8)}01`, to: today }),
  lastMonth,
} as const satisfies Record<Preset, (today: string) => Range>;

function presetRange(preset: Preset, today: string): Range {
  return PRESET_RANGES[preset](today);
}

function matchingPreset(range: Range, today: string): Preset | null {
  return (
    PRESETS.find((preset) => {
      const candidate = presetRange(preset, today);
      return candidate.from === range.from && candidate.to === range.to;
    }) ?? null
  );
}

const MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const WEEKDAY_MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** The trigger's words: "Any date", a span's name, or "Sep 14 – 16". */
function activityRangeLabel(range: Range, today: string): string {
  const preset = matchingPreset(range, today);
  if (preset !== null) return PRESET_LABELS[preset];
  const from = range.from ?? range.to;
  const to = range.to ?? range.from;
  if (from === undefined || to === undefined) return PRESET_LABELS.any;
  if (from === to) return MONTH_DAY.format(dayToUtc(from));
  if (from.slice(0, 7) === to.slice(0, 7)) {
    return `${MONTH_DAY.format(dayToUtc(from))} – ${String(dayToUtc(to).getUTCDate())}`;
  }
  return `${MONTH_DAY.format(dayToUtc(from))} – ${MONTH_DAY.format(dayToUtc(to))}`;
}

/** The popover's footer: "Mon, Sep 14 – Wed, Sep 16 · 3 days". */
function rangeReadout(range: Range): string {
  if (range.from === undefined || range.to === undefined) return "Every day the log holds";
  const days =
    Math.round((dayToUtc(range.to).getTime() - dayToUtc(range.from).getTime()) / 86_400_000) + 1;
  const from = WEEKDAY_MONTH_DAY.format(dayToUtc(range.from));
  if (days === 1) return `${from} · 1 day`;
  return `${from} – ${WEEKDAY_MONTH_DAY.format(dayToUtc(range.to))} · ${String(days)} days`;
}

export function ActivityDateRange({
  from,
  to,
  today,
  onChange,
}: Readonly<{
  from?: string;
  to?: string;
  today: string;
  onChange: (range: Range) => void;
}>) {
  const [open, setOpen] = useState(false);
  const range: Range = { from, to };
  const preset = matchingPreset(range, today);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="wgi-activity-pick" data-testid="activity-date-trigger">
        <span>{activityRangeLabel(range, today)}</span>
        <ChevronDown width={14} height={14} aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        paint="card"
        className="wgi-activity-popover wgi-activity-dates"
        aria-label="Dates"
        data-testid="activity-date-popover"
      >
        <div className="wgi-activity-dates-body">
          <div className="wgi-activity-presets">
            <ToggleGroup
              orientation="vertical"
              className="wgi-activity-preset-list"
              aria-label="Common spans"
              value={preset === null ? [] : [preset]}
              onValueChange={(value: readonly string[]) => {
                const picked = PRESETS.find((candidate) => candidate === value.at(0));
                if (picked === undefined) return;
                onChange(presetRange(picked, today));
                setOpen(false);
              }}
            >
              {PRESETS.map((candidate) => (
                <ToggleGroupItem key={candidate} value={candidate} className="wgi-activity-preset">
                  <span>{PRESET_LABELS[candidate]}</span>
                  {preset === candidate ? (
                    <Check width={14} height={14} aria-hidden="true" />
                  ) : null}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            {preset === null ? (
              <p className="wgi-activity-preset" data-pressed="">
                <span>Custom range</span>
                <Check width={14} height={14} aria-hidden="true" />
              </p>
            ) : null}
          </div>
          <CalendarRange
            className="wgi-activity-cal"
            from={from ?? ""}
            to={to ?? from ?? ""}
            fallbackMonth={today}
            max={today}
            onChange={(nextFrom, nextTo) => {
              if (nextFrom === "") {
                onChange({});
                return;
              }
              onChange({ from: nextFrom, to: nextTo === "" ? nextFrom : nextTo });
            }}
          />
        </div>
        <footer className="wgi-activity-dates-foot">
          <span data-testid="activity-date-readout">{rangeReadout(range)}</span>
          <span>Nothing is logged after today</span>
        </footer>
      </PopoverContent>
    </Popover>
  );
}
