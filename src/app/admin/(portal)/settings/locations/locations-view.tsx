"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { initialsOf } from "@/app/admin/(portal)/schedule/week-calendar";
import { ClosedDays } from "@/app/admin/(portal)/settings/locations/closed-days";
import { LocationEditorDialog } from "@/app/admin/(portal)/settings/locations/location-editor-dialog";
import { ConflictList, NeedsNewTime } from "@/app/admin/(portal)/settings/needs-new-time";
import {
  appointmentCount,
  clockRange,
  currentHours,
  dayRuns,
  longDay,
  placeName,
  settingsFailureMessage,
  shortName,
  weekRank,
} from "@/app/admin/(portal)/settings/settings-model";
import { SettingsSheet } from "@/app/admin/(portal)/settings/settings-sheet";
import { useSettingsCommand } from "@/app/admin/(portal)/settings/use-settings-command";
import type { SettingsSend } from "@/app/admin/(portal)/settings/use-settings-command";
import { Ellipsis, ExternalLink, MapPin } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuGroup, MenuItem, MenuTrigger } from "@/components/ui/menu";
import type {
  SchedulingSettings,
  SettingsConflict,
  SettingsLocation,
  SettingsProvider,
} from "@/lib/portal/scheduling/settings-contracts";
import { placeUrl } from "@/lib/site";

/* Locations (issue #352, Figma St5): a card per office with its address,
   a map picture that opens the place in Maps, the hours it is open, the
   providers who work there and the days it is closed. Office hours lead:
   changing them moves the hours of the providers who work there to match.
   Staff read it; admins edit an office, close days, and retire or restore
   an office. */

/** "Mon–Fri · 8:00 AM – 5:00 PM", days with the same hours grouped. */
function officeHours(hours: SettingsLocation["hours"]): string {
  if (hours.length === 0) return "Not set";
  const groups = new Map<string, { days: number[]; open: number; close: number }>();
  for (const day of hours.toSorted((a, b) => weekRank(a.weekday) - weekRank(b.weekday))) {
    const key = `${String(day.openMinute)}-${String(day.closeMinute)}`;
    const group = groups.get(key);
    if (group === undefined)
      groups.set(key, { days: [day.weekday], open: day.openMinute, close: day.closeMinute });
    else group.days.push(day.weekday);
  }
  return [...groups.values()]
    .map((group) => `${dayRuns(group.days)} · ${clockRange(group.open, group.close)}`)
    .join("; ");
}

function addressOf(location: Readonly<SettingsLocation>): string {
  const { street, city, region, postal } = location;
  if (street === null || city === null) return "No address yet";
  return `${street}, ${city}, ${region ?? ""} ${postal ?? ""}`.trim();
}

/** Who works here, in the providers' order, each named the way lists name them, with the
    days they are here when that is fewer than the office's: "Dr. Chang (Tuesdays)". */
function providersHere(
  location: Readonly<SettingsLocation>,
  providers: readonly SettingsProvider[],
  today: string,
) {
  const here = new Set(location.providerIds);
  const officeDays = new Set(location.hours.map((day) => day.weekday));
  return providers.flatMap((provider) => {
    if (!here.has(provider.id)) return [];
    const days = new Set(
      currentHours(provider, today).flatMap((row) =>
        row.locationId === location.id ? [row.weekday] : [],
      ),
    );
    const some = days.size > 0 && [...officeDays].some((day) => !days.has(day));
    const only = days.size === 1 ? [...days].at(0) : undefined;
    const when = !some ? "" : only === undefined ? dayRuns(days) : `${longDay(only)}s`;
    return [
      {
        id: provider.id,
        initials: initialsOf(provider.name),
        label: when === "" ? shortName(provider.name) : `${shortName(provider.name)} (${when})`,
      },
    ];
  });
}

function RetireOfficeDialog({
  location,
  send,
  onClose,
}: Readonly<{
  location: SettingsLocation;
  send: SettingsSend;
  onClose: () => void;
}>) {
  const [blocked, setBlocked] = useState<readonly SettingsConflict[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const place = placeName(location);

  async function retire() {
    setPending(true);
    setError(null);
    try {
      const outcome = await send(
        { kind: "retire_location", id: location.id, expectedVersion: location.detailsVersion },
        { quiet: true },
      );
      if (outcome.ok) {
        toast.success(`${place} is retired`);
        onClose();
      } else if (outcome.code === "schedule_in_use" && outcome.conflicts !== undefined)
        setBlocked(outcome.conflicts);
      else setError(settingsFailureMessage(outcome.code));
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsSheet
      title={blocked === null ? `Retire ${place}?` : `${place} still has bookings`}
      testId="retire-office-dialog"
      busy={pending}
      onClose={onClose}
      onSubmit={() => {
        if (blocked === null) void retire();
        else onClose();
      }}
      footer={
        blocked === null ? (
          <>
            <Button
              type="button"
              variant="outline"
              data-glass="secondary"
              data-initial-focus
              disabled={pending}
              onClick={onClose}
            >
              Keep {place}
            </Button>
            <button
              type="submit"
              disabled={pending}
              className="portal-confirm-dialog-destructive min-h-11 disabled:opacity-60"
            >
              {pending ? "Retiring…" : "Retire"}
            </button>
          </>
        ) : (
          <Button type="submit" data-glass="primary" data-initial-focus>
            Done
          </Button>
        )
      }
    >
      {blocked === null ? (
        <div className="flex flex-col gap-3">
          <p className="text-[0.875rem] leading-5 text-(--wgi-name-ink)">
            {place} leaves the schedule and can&apos;t be booked. Every provider&apos;s hours there
            end today; their hours at other offices stay.
          </p>
          {error === null ? null : (
            <p role="alert" className="settings-notice">
              {error}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-[0.875rem] leading-5 text-(--wgi-name-ink)">
            {appointmentCount(blocked.length)} {blocked.length === 1 ? "is" : "are"} still booked
            there. Move {blocked.length === 1 ? "it" : "them"} to another office or cancel{" "}
            {blocked.length === 1 ? "it" : "them"}, then retire {place}.
          </p>
          <ConflictList conflicts={blocked} />
        </div>
      )}
    </SettingsSheet>
  );
}

function LocationCard({
  location,
  settings,
  send,
  onRetire,
}: Readonly<{
  location: SettingsLocation;
  settings: SchedulingSettings;
  send: SettingsSend;
  onRetire: () => void;
}>) {
  const { canEdit, today, providers, needsNewTime } = settings;
  const staff = providersHere(location, providers, today);
  const waiting = needsNewTime.filter((entry) => entry.locationId === location.id);
  const titleId = `location-${location.id}`;

  return (
    <article aria-labelledby={titleId} className="settings-location">
      <header className="settings-location-head">
        <span aria-hidden="true" className="settings-location-pin">
          <MapPin className="size-[1.125rem]" />
        </span>
        <div className="flex min-w-0 grow flex-col gap-0.5">
          <h2 id={titleId} className="settings-location-name">
            {placeName(location)}
          </h2>
          <p className="settings-location-address-line">{addressOf(location)}</p>
        </div>
        {canEdit ? (
          <>
            <Link
              href={`?edit=${location.id}`}
              scroll={false}
              aria-label={`Edit ${location.name}`}
              className="settings-text-command settings-location-edit"
            >
              Edit
            </Link>
            <Menu>
              <MenuTrigger className="settings-row-more" aria-label={`More for ${location.name}`}>
                <Ellipsis aria-hidden="true" width={15} height={15} />
              </MenuTrigger>
              <MenuContent align="end" className="min-w-48">
                <MenuGroup>
                  <MenuItem onClick={onRetire}>Retire this office…</MenuItem>
                </MenuGroup>
              </MenuContent>
            </Menu>
          </>
        ) : null}
      </header>
      {location.mapsQuery === null ? (
        <div aria-hidden="true" className="settings-location-map" />
      ) : (
        <a
          href={placeUrl(location.mapsQuery)}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${location.name} in Maps`}
          className="settings-location-map"
        >
          {location.requestLocation === null ? null : (
            <Image
              src={`/images/locations/${location.requestLocation}-map.svg`}
              alt=""
              width={518}
              height={140}
              className="settings-location-map-picture"
            />
          )}
          <span aria-hidden="true" className="settings-location-maps-chip">
            <ExternalLink className="size-3.5" />
            Open in Maps
          </span>
        </a>
      )}
      <div className="settings-location-row">
        <span className="settings-location-label">Office hours</span>
        <span className="settings-location-value">{officeHours(location.hours)}</span>
      </div>
      <div className="settings-location-row">
        <span className="settings-location-label">Providers here</span>
        {staff.length === 0 ? (
          <span className="settings-location-value">None yet</span>
        ) : (
          <span className="flex min-w-0 items-center justify-end gap-2.5">
            <span aria-hidden="true" className="flex shrink-0">
              {staff.slice(0, 4).map((provider) => (
                <span key={provider.id} className="settings-location-avatar">
                  {provider.initials}
                </span>
              ))}
            </span>
            <span className="text-end text-[0.8125rem] text-(--wgi-muted-ink)">
              {staff.map((provider) => provider.label).join(", ")}
            </span>
          </span>
        )}
      </div>
      <ClosedDays location={location} today={today} canEdit={canEdit} send={send} />
      {waiting.length === 0 ? null : (
        <div className="settings-location-needs">
          <NeedsNewTime entries={waiting} withProvider />
        </div>
      )}
    </article>
  );
}

export function LocationsView({
  settings,
  editingId,
}: Readonly<{
  settings: SchedulingSettings;
  editingId: string | null;
}>) {
  const send = useSettingsCommand();
  const { locations, retiredLocations, canEdit } = settings;
  const [retiring, setRetiring] = useState<SettingsLocation | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const editing =
    editingId === null ? undefined : locations.find((location) => location.id === editingId);

  return (
    <div className="wgi-settings mt-6 flex flex-col gap-3.5">
      <div className="settings-locations">
        {locations.map((location) => (
          <LocationCard
            key={location.id}
            location={location}
            settings={settings}
            send={send}
            onRetire={() => {
              setRetiring(location);
            }}
          />
        ))}
      </div>
      {locations.length === 0 ? (
        <p className="text-[0.8125rem] text-(--wgi-muted-ink)">No offices yet.</p>
      ) : null}
      {retiredLocations.length === 0 ? null : (
        <section aria-labelledby="retired-offices" className="settings-retired">
          <h2 id="retired-offices" className="settings-section-title">
            Retired offices
          </h2>
          <ul className="flex flex-col gap-2">
            {retiredLocations.map((location) => (
              <li key={location.id} className="settings-time-off-row">
                <MapPin aria-hidden="true" className="size-4 shrink-0 text-(--wgi-muted-ink)" />
                <span className="grow text-[0.875rem] font-semibold text-(--wgi-name-ink)">
                  {placeName(location)}
                </span>
                {canEdit ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={restoring === location.id}
                    onClick={() => {
                      setRestoring(location.id);
                      void send({
                        kind: "restore_location",
                        id: location.id,
                        expectedVersion: location.detailsVersion,
                      }).finally(() => {
                        setRestoring(null);
                      });
                    }}
                  >
                    {restoring === location.id ? "Restoring…" : "Restore"}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}
      {canEdit && editing !== undefined ? (
        <LocationEditorDialog key={editing.id} location={editing} send={send} />
      ) : null}
      {retiring === null ? null : (
        <RetireOfficeDialog
          location={retiring}
          send={send}
          onClose={() => {
            setRetiring(null);
          }}
        />
      )}
    </div>
  );
}
