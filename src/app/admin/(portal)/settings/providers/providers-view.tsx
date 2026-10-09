"use client";

import { cn } from "cn";
import Link from "next/link";
import { useState } from "react";

import { initialsOf } from "@/app/admin/(portal)/schedule/week-calendar";
import { NeedsNewTime } from "@/app/admin/(portal)/settings/needs-new-time";
import { AddProviderDialog } from "@/app/admin/(portal)/settings/providers/add-provider-dialog";
import {
  ProfileDialog,
  RetireDialog,
} from "@/app/admin/(portal)/settings/providers/profile-dialogs";
import { TimeOff } from "@/app/admin/(portal)/settings/providers/time-off";
import { WeeklyHours } from "@/app/admin/(portal)/settings/providers/weekly-hours";
import { currentHours, providerSubline } from "@/app/admin/(portal)/settings/settings-model";
import { useSettingsCommand } from "@/app/admin/(portal)/settings/use-settings-command";
import { Check, Ellipsis } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type {
  SchedulingSettings,
  SettingsProvider,
} from "@/lib/portal/scheduling/settings-contracts";

/* Providers (issue #352, Figma St1): the list of providers on the left, the
   chosen one's detail on the right, and anyone retired at the foot of the
   list. The choice lives in the address (?provider=) so a reload or a shared
   link opens the same provider; the row is marked chosen on the click,
   before the page's next read lands. Every control applies its change as it
   is made and confirms in the Undo toast. */

type Retired = SchedulingSettings["retiredProviders"][number];

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
  const { providers, retiredProviders, locations, today } = settings;
  const retired = retiredProviders.find((provider) => provider.id === chosenId);
  const chosen =
    retired === undefined
      ? (providers.find((provider) => provider.id === chosenId) ?? providers.at(0))
      : undefined;
  const currentId = retired?.id ?? chosen?.id;

  function row(id: string, name: string, line: string, isRetired: boolean) {
    return (
      <Link
        key={id}
        href={providerHref(id)}
        replace
        scroll={false}
        aria-current={id === currentId ? "page" : undefined}
        className={cn("settings-list-row", isRetired && "is-retired")}
        onClick={() => {
          setChosenId(id);
        }}
      >
        <span aria-hidden="true" className="settings-avatar">
          {initialsOf(name)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[0.875rem] leading-5 font-semibold text-(--wgi-name-ink)">
            {name}
          </span>
          <span className="block truncate text-[0.75rem] leading-4 text-(--wgi-muted-ink)">
            {line}
          </span>
        </span>
      </Link>
    );
  }

  return (
    <div className="wgi-settings settings-split mt-6">
      <nav aria-label="Providers" className="settings-list">
        {providers.map((provider) =>
          row(
            provider.id,
            provider.name,
            provider.bookable
              ? providerSubline(currentHours(provider, today), locations)
              : "Not taking appointments",
            false,
          ),
        )}
        {providers.length === 0 ? (
          <p className="p-2.5 text-[0.8125rem] text-(--wgi-muted-ink)" data-tour="providers-empty">
            No providers yet.
          </p>
        ) : null}
        {retiredProviders.length === 0 ? null : (
          <>
            <p className="settings-list-label">Retired</p>
            {retiredProviders.map((provider) =>
              row(provider.id, provider.name, provider.credentials ?? "Retired", true),
            )}
          </>
        )}
      </nav>
      {retired === undefined ? null : (
        <RetiredDetail key={retired.id} provider={retired} canEdit={settings.canEdit} />
      )}
      {chosen === undefined ? null : (
        <ProviderDetail key={chosen.id} provider={chosen} settings={settings} />
      )}
      {adding ? <AddProviderDialog locations={locations} /> : null}
    </div>
  );
}

function RetiredDetail({ provider, canEdit }: Readonly<{ provider: Retired; canEdit: boolean }>) {
  const send = useSettingsCommand();
  const [pending, setPending] = useState(false);
  return (
    <section aria-labelledby="provider-name" className="settings-detail">
      <header className="flex items-center gap-4">
        <span aria-hidden="true" className="settings-avatar settings-avatar-large is-retired">
          {initialsOf(provider.name)}
        </span>
        <div className="min-w-0 grow">
          <h2
            id="provider-name"
            className="truncate text-[1.375rem] leading-7 font-bold text-(--wgi-name-ink)"
          >
            {provider.name}
          </h2>
          <p className="text-[0.8125rem] leading-5 text-(--wgi-muted-ink)">
            {provider.credentials === null ? "Retired" : `${provider.credentials} · Retired`}
          </p>
        </div>
        {canEdit ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              setPending(true);
              const command = {
                id: provider.id,
                expectedVersion: provider.profileVersion,
              } as const;
              void send(
                { ...command, kind: "restore_provider" },
                {
                  undo: {
                    headline: `${provider.name} is back on the schedule`,
                    detail: null,
                    inverse: { ...command, kind: "retire_provider" },
                  },
                },
              ).finally(() => {
                setPending(false);
              });
            }}
          >
            {pending ? "Restoring…" : "Restore"}
          </Button>
        ) : null}
      </header>
      <p className="text-[0.875rem] leading-5 text-(--wgi-muted-ink)">
        Restoring brings back their hours, time off and appointment types as they were.
      </p>
    </section>
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
  const { canEdit, types, needsNewTime } = settings;
  const [dialog, setDialog] = useState<"profile" | "retire" | null>(null);
  /* The switch and the type pills show the change at once; the server's
     answer replaces the draft when that part's version moves on. */
  const [seenProfile, setSeenProfile] = useState(provider.profileVersion);
  const [seenTypes, setSeenTypes] = useState(provider.typesVersion);
  const [bookable, setBookable] = useState(provider.bookable);
  const [typeIds, setTypeIds] = useState<readonly string[]>(provider.typeIds);
  if (seenProfile !== provider.profileVersion) {
    setSeenProfile(provider.profileVersion);
    setBookable(provider.bookable);
  }
  if (seenTypes !== provider.typesVersion) {
    setSeenTypes(provider.typesVersion);
    setTypeIds(provider.typeIds);
  }
  const seen = new Set(typeIds);
  const shownTypes = types.filter((type) => type.active || seen.has(type.id));
  const waiting = needsNewTime.filter((entry) => entry.providerId === provider.id);

  function setProfile(next: boolean) {
    setBookable(next);
    const profile = {
      kind: "set_provider_profile",
      id: provider.id,
      expectedVersion: provider.profileVersion,
      name: provider.name,
      credentials: provider.credentials,
    } as const;
    void send(
      { ...profile, bookable: next },
      {
        undo: {
          headline: next
            ? `${provider.name} takes appointments`
            : `${provider.name} no longer takes appointments`,
          detail: next ? null : "Booked appointments stay.",
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
      expectedVersion: provider.typesVersion,
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
        {canEdit ? (
          <Menu>
            <MenuTrigger className="settings-row-more" aria-label={`More for ${provider.name}`}>
              <Ellipsis aria-hidden="true" width={15} height={15} />
            </MenuTrigger>
            <MenuContent align="end" className="min-w-56">
              <MenuGroup>
                <MenuItem
                  onClick={() => {
                    setDialog("profile");
                  }}
                >
                  Edit name and credentials
                </MenuItem>
              </MenuGroup>
              <MenuSeparator />
              <MenuGroup>
                <MenuItem
                  onClick={() => {
                    setDialog("retire");
                  }}
                >
                  Retire…
                </MenuItem>
              </MenuGroup>
            </MenuContent>
          </Menu>
        ) : null}
      </header>

      <NeedsNewTime entries={waiting} withProvider={false} />
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
      {dialog === "profile" ? (
        <ProfileDialog
          provider={provider}
          send={send}
          onClose={() => {
            setDialog(null);
          }}
        />
      ) : null}
      {dialog === "retire" ? (
        <RetireDialog
          provider={provider}
          send={send}
          onClose={() => {
            setDialog(null);
          }}
        />
      ) : null}
    </section>
  );
}
