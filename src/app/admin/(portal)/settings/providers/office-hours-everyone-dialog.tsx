"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  ConflictStep,
  HoursFooter,
  StartField,
} from "@/app/admin/(portal)/settings/providers/hours-editor-dialog";
import {
  officeHoursWeek,
  sameWeek,
  weekOn,
} from "@/app/admin/(portal)/settings/providers/providers-model";
import type { WeekWindow } from "@/app/admin/(portal)/settings/providers/providers-model";
import {
  appointmentCount,
  dayRuns,
  placeName,
  settingsFailureMessage,
  shortDate,
} from "@/app/admin/(portal)/settings/settings-model";
import { SettingsSheet } from "@/app/admin/(portal)/settings/settings-sheet";
import { useSettingsCommand } from "@/app/admin/(portal)/settings/use-settings-command";
import { Checkbox } from "@/components/ui/checkbox";
import type {
  SchedulingSettings,
  SettingsCommand,
  SettingsConflict,
  SettingsProvider,
} from "@/lib/portal/scheduling/settings-contracts";

/* Put everyone on office hours: the header's command opens this sheet through
   the address (?everyone=1), so Back closes it. Every provider gets the week
   the offices keep — the office they work that day now when it opens then,
   else the open one they work most — one block on its hours, following them
   from the chosen start. Providers already there are listed, not checked.
   When bookings would fall outside, the sheet lists them once and keeps them
   booked to be given new times; one Undo puts the change back. */

interface Target {
  readonly provider: SettingsProvider;
  readonly current: readonly WeekWindow[];
  readonly week: readonly WeekWindow[];
  readonly already: boolean;
}

/** "Tampa: Mon, Wed–Fri · Lutz: Tue" — where a target week lands, in office order. */
function targetLine(
  week: readonly WeekWindow[],
  locations: SchedulingSettings["locations"],
): string {
  return locations
    .filter((location) => week.some((window) => window.locationId === location.id))
    .map(
      (location) =>
        `${placeName(location)}: ${dayRuns(
          week.flatMap((window) => (window.locationId === location.id ? [window.weekday] : [])),
        )}`,
    )
    .join(" · ");
}

export function OfficeHoursEveryoneDialog({
  settings,
}: Readonly<{
  settings: SchedulingSettings;
}>) {
  const router = useRouter();
  const send = useSettingsCommand();
  const { providers, locations, today } = settings;

  function targetsFor(day: string): Target[] {
    return providers.map((provider) => {
      const current = weekOn(provider.hours, day);
      const week = officeHoursWeek(current, locations);
      return { provider, current, week, already: sameWeek(week, current) };
    });
  }

  const [startsOn, setStartsOn] = useState(today);
  const [checked, setChecked] = useState<ReadonlySet<string>>(
    () =>
      new Set(targetsFor(today).flatMap((target) => (target.already ? [] : [target.provider.id]))),
  );
  const [conflicts, setConflicts] = useState<readonly SettingsConflict[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const targets = targetsFor(startsOn);
  const chosen = targets.filter((target) => checked.has(target.provider.id) && !target.already);

  function leave() {
    const address = new URL(window.location.href);
    address.searchParams.delete("everyone");
    router.replace(`${address.pathname}${address.search}`, { scroll: false });
  }

  function commandOf(target: Target, keepBooked: boolean, dryRun: boolean) {
    return {
      kind: "set_provider_weekly_hours",
      id: target.provider.id,
      expectedVersion: target.provider.hoursVersion,
      startsOn,
      hours: [...target.week],
      keepBooked,
      dryRun,
    } as const;
  }

  async function save(keepBooked: boolean) {
    if (chosen.length === 0) return;
    setPending(true);
    setError(null);
    try {
      if (!keepBooked) {
        const found: SettingsConflict[] = [];
        for (const target of chosen) {
          // react-doctor-disable-next-line react-doctor/async-await-in-loop -- dry runs go through the shared command queue, which serializes sends in order
          const outcome = await send(commandOf(target, false, true), { quiet: true });
          if (!outcome.ok) {
            setError(
              `Couldn't change ${target.provider.name}'s hours: ${settingsFailureMessage(outcome.code)}`,
            );
            return;
          }
          found.push(...(outcome.conflicts ?? []));
        }
        if (found.length > 0) {
          setConflicts(found);
          return;
        }
      }
      const saved: Target[] = [];
      const failed: { name: string; message: string }[] = [];
      for (const target of chosen) {
        // react-doctor-disable-next-line react-doctor/async-await-in-loop -- saves go through the shared command queue, which serializes sends in order
        const outcome = await send(commandOf(target, keepBooked, false), { quiet: true });
        if (outcome.ok) saved.push(target);
        else
          failed.push({
            name: target.provider.name,
            message: settingsFailureMessage(outcome.code),
          });
      }
      if (saved.length > 0) {
        const kept = keepBooked && conflicts !== null ? conflicts.length : 0;
        send.confirm({
          headline: `${saved.length === 1 ? "1 provider is" : `${String(saved.length)} providers are`} on office hours${
            startsOn === today ? "" : ` from ${shortDate(startsOn)}`
          }`,
          detail:
            kept === 0
              ? null
              : `${appointmentCount(kept)} need${kept === 1 ? "s" : ""} a new time.`,
          inverse: saved.map((target): SettingsCommand => ({
            kind: "set_provider_weekly_hours",
            id: target.provider.id,
            expectedVersion: target.provider.hoursVersion,
            startsOn,
            hours: [...target.current],
            keepBooked: true,
            dryRun: false,
          })),
        });
      }
      if (failed.length === 0) leave();
      else
        setError(
          `${failed
            .map((failure) => `Couldn't change ${failure.name}'s hours: ${failure.message}.`)
            .join(" ")}${saved.length === 0 ? "" : " The others are saved."}`,
        );
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsSheet
      title="Put everyone on office hours"
      testId="office-hours-everyone-dialog"
      className="settings-hours-editor"
      busy={pending}
      onClose={leave}
      onSubmit={() => {
        void save(conflicts !== null);
      }}
      footer={
        <HoursFooter
          reviewing={conflicts !== null}
          pending={pending}
          canSave={chosen.length > 0}
          onCancel={leave}
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
            replaces={[]}
            onChange={(day) => {
              setStartsOn(day);
              setChecked(
                new Set(
                  targetsFor(day).flatMap((target) => (target.already ? [] : [target.provider.id])),
                ),
              );
              setError(null);
            }}
          />
          <ul className="flex flex-col gap-1" aria-label="Providers">
            {targets.map((target) => (
              <li key={target.provider.id}>
                <label className="settings-hours-follow w-full">
                  <Checkbox
                    checked={!target.already && checked.has(target.provider.id)}
                    disabled={target.already}
                    onCheckedChange={(on) => {
                      setChecked((current) => {
                        const next = new Set(current);
                        if (on) next.add(target.provider.id);
                        else next.delete(target.provider.id);
                        return next;
                      });
                      setError(null);
                    }}
                  />
                  <span className="flex min-w-0 grow flex-col">
                    <span className="truncate text-[0.9375rem] font-semibold text-(--wgi-name-ink)">
                      {target.provider.name}
                    </span>
                    <span className="truncate text-[0.8125rem] text-(--wgi-muted-ink)">
                      {target.already
                        ? "Already on office hours"
                        : targetLine(target.week, locations) || "No weekly hours"}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ConflictStep conflicts={conflicts} name="each provider" />
      )}
      {error === null ? null : (
        <p role="alert" className="settings-notice">
          {error}
        </p>
      )}
    </SettingsSheet>
  );
}
