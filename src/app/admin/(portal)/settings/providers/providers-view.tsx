"use client";

import { cn } from "cn";
import Link from "next/link";
import { useState } from "react";

import { initialsOf } from "@/app/admin/(portal)/schedule/week-calendar";
import { AddProviderDialog } from "@/app/admin/(portal)/settings/providers/add-provider-dialog";
import { TimeOff } from "@/app/admin/(portal)/settings/providers/time-off";
import { WeeklyHours } from "@/app/admin/(portal)/settings/providers/weekly-hours";
import { currentHours, providerSubline } from "@/app/admin/(portal)/settings/settings-model";
import { useSettingsCommand } from "@/app/admin/(portal)/settings/use-settings-command";
import { Check } from "@/components/icons";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type {
  SchedulingSettings,
  SettingsProvider,
} from "@/lib/portal/scheduling/settings-contracts";

/* Providers (issue #352, Figma St1): the list of providers on the left, the
   chosen one's detail on the right. The choice lives in the address
   (?provider=) so a reload or a shared link opens the same provider; the
   row is marked chosen on the click, before the page's next read lands. Every control applies
   its change as it is made and confirms in the Undo toast. */

function providerHref(id: string) {
  return `?provider=${encodeURIComponent(id)}`;
}

export function ProvidersView({
  settings,
  initialId,
  adding,
}: Readonly<{
  settings: SchedulingSettings;
  initialId: string | null;
  adding: boolean;
}>) {
  const [chosenId, setChosenId] = useState(initialId);
  const [seenInitial, setSeenInitial] = useState(initialId);
  if (seenInitial !== initialId) {
    setSeenInitial(initialId);
    setChosenId(initialId);
  }
  const { providers, locations, today } = settings;
  const chosen = providers.find((provider) => provider.id === chosenId) ?? providers.at(0);

  return (
    <div className="wgi-settings settings-split mt-6">
      <nav aria-label="Providers" className="settings-list">
        {providers.map((provider) => (
          <Link
            key={provider.id}
            href={providerHref(provider.id)}
            replace
            scroll={false}
            aria-current={provider.id === chosen?.id ? "page" : undefined}
            className="settings-list-row"
            onClick={() => {
              setChosenId(provider.id);
            }}
          >
            <span aria-hidden="true" className="settings-avatar">
              {initialsOf(provider.name)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[0.875rem] leading-5 font-semibold text-(--wgi-name-ink)">
                {provider.name}
              </span>
              <span className="block truncate text-[0.75rem] leading-4 text-(--wgi-muted-ink)">
                {provider.bookable
                  ? providerSubline(currentHours(provider, today), locations)
                  : "Not taking appointments"}
              </span>
            </span>
          </Link>
        ))}
        {providers.length === 0 ? (
          <p className="p-2.5 text-[0.8125rem] text-(--wgi-muted-ink)" data-tour="providers-empty">
            No providers yet.
          </p>
        ) : null}
      </nav>
      {chosen === undefined ? null : (
        <ProviderDetail key={chosen.id} provider={chosen} settings={settings} />
      )}
      {adding ? <AddProviderDialog locations={locations} /> : null}
    </div>
  );
}

function ProviderDetail({
  provider,
  settings,
}: Readonly<{
  provider: SettingsProvider;
  settings: SchedulingSettings;
}>) {
  const send = useSettingsCommand();
  const { canEdit, types } = settings;
  /* The switch and the type pills show the change at once; the server's
     answer replaces the draft when the provider's version moves on. */
  const [seenVersion, setSeenVersion] = useState(provider.version);
  const [bookable, setBookable] = useState(provider.bookable);
  const [typeIds, setTypeIds] = useState<readonly string[]>(provider.typeIds);
  if (seenVersion !== provider.version) {
    setSeenVersion(provider.version);
    setBookable(provider.bookable);
    setTypeIds(provider.typeIds);
  }
  const seen = new Set(typeIds);
  const shownTypes = types.filter((type) => type.active || seen.has(type.id));

  function setProfile(next: boolean) {
    setBookable(next);
    const profile = {
      kind: "set_provider_profile",
      id: provider.id,
      expectedVersion: provider.version,
      name: provider.name,
      credentials: provider.credentials,
      active: true,
    } as const;
    void send(
      { ...profile, bookable: next },
      {
        undo: {
          headline: next
            ? `${provider.name} takes appointments`
            : `${provider.name} no longer takes appointments`,
          detail: next ? null : "Booked appointments stay. New ones can't be made with them.",
          inverse: { ...profile, bookable: !next },
        },
      },
    ).then((outcome) => {
      if (!outcome.ok) setBookable(provider.bookable);
    });
  }

  function setTypes(next: readonly string[]) {
    const previous = typeIds;
    setTypeIds(next);
    const after = new Set(next);
    const added = types.find((type) => after.has(type.id) && !seen.has(type.id));
    const removed = types.find((type) => seen.has(type.id) && !after.has(type.id));
    const command = {
      kind: "set_provider_types",
      id: provider.id,
      expectedVersion: provider.version,
    } as const;
    void send(
      { ...command, typeIds: next },
      {
        undo: {
          headline:
            added === undefined
              ? `${provider.name} no longer sees ${removed?.name ?? "that type"}`
              : `${provider.name} sees ${added.name}`,
          detail: null,
          inverse: { ...command, typeIds: previous },
        },
      },
    ).then((outcome) => {
      if (!outcome.ok) setTypeIds(provider.typeIds);
    });
  }

  return (
    <section aria-labelledby="provider-name" className="settings-detail">
      <header className="flex items-center gap-4">
        <span aria-hidden="true" className="settings-avatar settings-avatar-large">
          {initialsOf(provider.name)}
        </span>
        <div className="min-w-0 grow">
          <h2
            id="provider-name"
            className="truncate text-[1.375rem] leading-7 font-bold text-(--wgi-name-ink)"
          >
            {provider.name}
          </h2>
          {provider.credentials === null ? null : (
            <p className="text-[0.8125rem] leading-5 text-(--wgi-muted-ink)">
              {provider.credentials}
            </p>
          )}
        </div>
        <label className="flex items-center gap-3 text-[0.8125rem] font-semibold text-(--wgi-name-ink)">
          Takes appointments
          <Switch
            checked={bookable}
            disabled={!canEdit}
            onCheckedChange={(next) => {
              setProfile(next);
            }}
          />
        </label>
      </header>

      <WeeklyHours provider={provider} settings={settings} send={send} />
      <TimeOff provider={provider} settings={settings} send={send} />

      <section aria-labelledby="provider-types" className="flex flex-col gap-3">
        <h3 id="provider-types" className="settings-section-title">
          Sees these appointment types
        </h3>
        {shownTypes.length === 0 ? (
          <p className="text-[0.8125rem] text-(--wgi-muted-ink)">No appointment types yet.</p>
        ) : (
          <ToggleGroup
            multiple
            value={[...typeIds]}
            disabled={!canEdit}
            aria-labelledby="provider-types"
            className="flex-wrap"
            onValueChange={(next: readonly string[]) => {
              setTypes(next);
            }}
          >
            {shownTypes.map((type) => (
              <ToggleGroupItem
                key={type.id}
                value={type.id}
                className={cn("settings-type-pill", !type.active && "is-retired")}
              >
                <Check aria-hidden="true" className="settings-type-pill-check size-3.5" />
                {type.name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </section>
    </section>
  );
}
