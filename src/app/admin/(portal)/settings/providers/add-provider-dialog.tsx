"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { officeWeek } from "@/app/admin/(portal)/settings/providers/providers-model";
import type { WeekWindow } from "@/app/admin/(portal)/settings/providers/providers-model";
import { clockRange, dayRuns, placeName } from "@/app/admin/(portal)/settings/settings-model";
import { SettingsSheet } from "@/app/admin/(portal)/settings/settings-sheet";
import { useSettingsCommand } from "@/app/admin/(portal)/settings/use-settings-command";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { SettingsLocation } from "@/lib/portal/scheduling/settings-contracts";

/* Add provider (issue #352): the header's command opens this sheet through
   the address (?add=1), so Back closes it. A new provider needs a name,
   optional credentials and the office they work at. They start Monday to
   Friday for the hours that office is open, seeing every appointment type;
   the line under the office shows exactly those hours, and Edit hours on
   their page changes them. */

/** "Mon–Fri, 8:00 AM – 5:00 PM", or "Mon–Thu, 8:00 AM – 5:00 PM; Fri, 8:00 AM – 12:00 PM". */
function weekSummary(week: readonly WeekWindow[]): string {
  const groups = new Map<string, { days: number[]; open: number; close: number }>();
  for (const window of week) {
    const key = `${String(window.openMinute)}-${String(window.closeMinute)}`;
    const group = groups.get(key);
    if (group === undefined)
      groups.set(key, {
        days: [window.weekday],
        open: window.openMinute,
        close: window.closeMinute,
      });
    else group.days.push(window.weekday);
  }
  return [...groups.values()]
    .map((group) => `${dayRuns(group.days)}, ${clockRange(group.open, group.close)}`)
    .join("; ");
}

export function AddProviderDialog({
  locations,
}: Readonly<{
  locations: readonly SettingsLocation[];
}>) {
  const router = useRouter();
  const send = useSettingsCommand();
  const [name, setName] = useState("");
  const [credentials, setCredentials] = useState("");
  const [locationId, setLocationId] = useState(() => locations.at(0)?.id ?? "");
  const [pending, setPending] = useState(false);
  const location = locations.find((place) => place.id === locationId);
  const week = officeWeek(location);
  const valid = name.trim() !== "" && location !== undefined;

  function leave(provider: string | null) {
    const address = new URL(window.location.href);
    address.searchParams.delete("add");
    if (provider !== null) address.searchParams.set("provider", provider);
    router.replace(`${address.pathname}${address.search}`, { scroll: false });
  }

  async function add() {
    if (!valid) return;
    setPending(true);
    try {
      const outcome = await send({
        kind: "add_provider",
        name: name.trim(),
        credentials: credentials.trim() === "" ? null : credentials.trim(),
        hours: week,
      });
      if (outcome.ok) leave(outcome.id);
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsSheet
      title="Add provider"
      testId="add-provider-dialog"
      busy={pending}
      onClose={() => {
        leave(null);
      }}
      onSubmit={() => {
        void add();
      }}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            data-glass="secondary"
            disabled={pending}
            onClick={() => {
              leave(null);
            }}
          >
            Cancel
          </Button>
          <Button type="submit" data-glass="primary" disabled={!valid || pending}>
            {pending ? "Adding…" : "Add provider"}
          </Button>
        </>
      }
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="provider-name-input">Name</FieldLabel>
          <Input
            id="provider-name-input"
            data-initial-focus
            required
            maxLength={120}
            autoComplete="off"
            placeholder="Dr. Jane Rivera"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="provider-credentials-input">Credentials</FieldLabel>
          <Input
            id="provider-credentials-input"
            maxLength={120}
            autoComplete="off"
            placeholder="MD, Gastroenterology"
            value={credentials}
            onChange={(event) => {
              setCredentials(event.target.value);
            }}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="provider-location-input">Works at</FieldLabel>
          <NativeSelect
            id="provider-location-input"
            aria-describedby="provider-location-hours"
            value={locationId}
            onChange={(event) => {
              setLocationId(event.target.value);
            }}
          >
            {locations.map((place) => (
              <option key={place.id} value={place.id}>
                {placeName(place)}
              </option>
            ))}
          </NativeSelect>
          <FieldDescription id="provider-location-hours">
            {week.length === 0
              ? "That office has no weekday hours, so they start with none."
              : `Starts on ${location === undefined ? "the office" : placeName(location)}'s office hours: ${weekSummary(week)}`}
          </FieldDescription>
        </Field>
      </FieldGroup>
    </SettingsSheet>
  );
}
