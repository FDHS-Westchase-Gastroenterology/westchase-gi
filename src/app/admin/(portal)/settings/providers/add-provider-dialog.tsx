"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import { addDay } from "@/app/admin/(portal)/settings/providers/providers-model";
import type { WeekWindow } from "@/app/admin/(portal)/settings/providers/providers-model";
import { placeName } from "@/app/admin/(portal)/settings/settings-model";
import { useSettingsCommand } from "@/app/admin/(portal)/settings/use-settings-command";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { SettingsLocation } from "@/lib/portal/scheduling/settings-contracts";

/* Add provider (issue #352): the header's command opens this modal through
   the address (?add=1), so Back closes it. A new provider starts with a name,
   optional credentials and the office they work at, Monday to Friday at that
   office's hours; the rest is set on their page once they exist. */

const WEEKDAYS = [1, 2, 3, 4, 5];

function keepFocusInDialog(event: ReactKeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return;
  const controls = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(
      "button:not([disabled]), input:not([disabled]), select:not([disabled])",
    ),
  );
  const first = controls.at(0);
  const last = controls.at(-1);
  if (first === undefined || last === undefined) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function startingWeek(location: Readonly<SettingsLocation> | undefined): WeekWindow[] {
  if (location === undefined) return [];
  return WEEKDAYS.reduce<WeekWindow[]>((week, weekday) => addDay(week, weekday, location), []);
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
        hours: startingWeek(location),
      });
      if (outcome.ok) leave(outcome.id);
    } finally {
      setPending(false);
    }
  }

  return (
    <dialog
      ref={(dialog) => {
        if (dialog !== null && !dialog.open) dialog.showModal();
      }}
      aria-modal="true"
      aria-labelledby="add-provider-title"
      data-testid="add-provider-dialog"
      className="portal-confirm-dialog"
      onKeyDown={keepFocusInDialog}
      onClickCapture={(event) => {
        event.currentTarget.toggleAttribute("data-instant", event.detail === 0);
      }}
      onCancel={(event) => {
        event.preventDefault();
        event.currentTarget.toggleAttribute("data-instant", true);
        if (!pending) leave(null);
      }}
    >
      <form
        className="contents"
        onSubmit={(event) => {
          event.preventDefault();
          void add();
        }}
      >
        <div className="portal-confirm-dialog-body">
          <div className="portal-confirm-dialog-heading">
            <h2 id="add-provider-title" className="portal-confirm-dialog-title">
              Add provider
            </h2>
            <button
              type="button"
              disabled={pending}
              className="portal-confirm-dialog-close"
              onClick={() => {
                leave(null);
              }}
            >
              Close
            </button>
          </div>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="provider-name-input">Name</FieldLabel>
              <Input
                id="provider-name-input"
                autoFocus
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
              <FieldDescription>
                Monday to Friday at the office&apos;s hours. Change them on their page.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </div>
        <div className="portal-confirm-dialog-actions">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              leave(null);
            }}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!valid || pending}>
            {pending ? "Adding…" : "Add provider"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
