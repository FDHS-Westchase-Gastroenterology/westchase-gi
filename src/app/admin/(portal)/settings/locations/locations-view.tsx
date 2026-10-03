"use client";

import Image from "next/image";
import Link from "next/link";

import { initialsOf } from "@/app/admin/(portal)/schedule/week-calendar";
import { ClosedDays } from "@/app/admin/(portal)/settings/locations/closed-days";
import { LocationEditorDialog } from "@/app/admin/(portal)/settings/locations/location-editor-dialog";
import {
  clockRange,
  currentHours,
  dayRuns,
  longDay,
  placeName,
  shortName,
  weekRank,
} from "@/app/admin/(portal)/settings/settings-model";
import { useSettingsCommand } from "@/app/admin/(portal)/settings/use-settings-command";
import type { SettingsSend } from "@/app/admin/(portal)/settings/use-settings-command";
import { ExternalLink, MapPin } from "@/components/icons";
import type {
  SchedulingSettings,
  SettingsLocation,
  SettingsProvider,
} from "@/lib/portal/scheduling/settings-contracts";
import { placeUrl } from "@/lib/site";

/* Locations (issue #352, Figma St5): a card per office with its address,
   a map picture that opens the place in Maps, the hours it is open, the
   providers who work there and the days it is closed. Providers' weekly
   hours at an office stay inside the office's hours; the server holds that
   line. Staff read it; admins edit an office and its closed days. */

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

function LocationCard({
  location,
  settings,
  send,
}: Readonly<{
  location: SettingsLocation;
  settings: SchedulingSettings;
  send: SettingsSend;
}>) {
  const { canEdit, today, providers } = settings;
  const staff = providersHere(location, providers, today);
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
          <Link
            href={`?edit=${location.id}`}
            scroll={false}
            aria-label={`Edit ${location.name}`}
            className="settings-text-command settings-location-edit"
          >
            Edit
          </Link>
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
  const { locations, canEdit } = settings;
  const editing =
    editingId === null ? undefined : locations.find((location) => location.id === editingId);

  return (
    <div className="wgi-settings mt-6 flex flex-col gap-3.5">
      <p className="text-[0.875rem] leading-5 text-(--wgi-muted-ink)">
        Where appointments happen. Providers&apos; hours on the schedule stay inside each
        office&apos;s hours.
      </p>
      <div className="settings-locations">
        {locations.map((location) => (
          <LocationCard key={location.id} location={location} settings={settings} send={send} />
        ))}
      </div>
      {locations.length === 0 ? (
        <p className="text-[0.8125rem] text-(--wgi-muted-ink)">No offices yet.</p>
      ) : null}
      {canEdit && editing !== undefined ? (
        <LocationEditorDialog key={editing.id} location={editing} send={send} />
      ) : null}
    </div>
  );
}
