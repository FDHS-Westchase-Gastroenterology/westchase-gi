"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import {
  QUARTER_HOUR,
  WEEK_ORDER,
  clockOf,
  longDay,
} from "@/app/admin/(portal)/settings/settings-model";
import type { SettingsSend } from "@/app/admin/(portal)/settings/use-settings-command";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import type { SettingsLocation } from "@/lib/portal/scheduling/settings-contracts";

/* Edit an office (issue #352, Figma St5): its name, address and the hours
   it is open each day. The card's Edit opens this modal through the address
   (?edit=<id>), so Back closes it. The server keeps every provider's hours
   inside the office's, so hours that would cut into them are refused with
   the reason. Saving confirms with Undo. */

const QUARTERS = Array.from({ length: (24 * 60) / QUARTER_HOUR + 1 }, (_, i) => i * QUARTER_HOUR);
const POSTAL = /^\d{5}(-\d{4})?$/u;

interface DayHours {
  readonly open: boolean;
  readonly from: number;
  readonly until: number;
}

function startingHours(location: Readonly<SettingsLocation>): ReadonlyMap<number, DayHours> {
  const known = new Map(location.hours.map((day) => [day.weekday, day]));
  return new Map(
    WEEK_ORDER.map((weekday) => {
      const day = known.get(weekday);
      return [
        weekday,
        day === undefined
          ? { open: false, from: 8 * 60, until: 17 * 60 }
          : { open: true, from: day.openMinute, until: day.closeMinute },
      ];
    }),
  );
}

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

export function LocationEditorDialog({
  location,
  send,
}: Readonly<{
  location: SettingsLocation;
  send: SettingsSend;
}>) {
  const router = useRouter();
  const [name, setName] = useState(() => location.name);
  const [street, setStreet] = useState(() => location.street ?? "");
  const [city, setCity] = useState(() => location.city ?? "");
  const [region, setRegion] = useState(() => location.region ?? "FL");
  const [postal, setPostal] = useState(() => location.postal ?? "");
  const [hours, setHours] = useState(() => startingHours(location));
  const [pending, setPending] = useState(false);
  const openDays = WEEK_ORDER.flatMap((weekday) => {
    const day = hours.get(weekday);
    return day?.open === true ? [{ weekday, openMinute: day.from, closeMinute: day.until }] : [];
  });
  const postalValid = POSTAL.test(postal.trim());
  const hoursValid =
    openDays.length > 0 && openDays.every((day) => day.closeMinute > day.openMinute);
  const valid =
    name.trim() !== "" &&
    street.trim() !== "" &&
    city.trim() !== "" &&
    region.trim() !== "" &&
    postalValid &&
    hoursValid;

  function leave() {
    const address = new URL(window.location.href);
    address.searchParams.delete("edit");
    router.replace(`${address.pathname}${address.search}`, { scroll: false });
  }

  function changeDay(weekday: number, next: Partial<DayHours>) {
    const day = hours.get(weekday);
    if (day === undefined) return;
    setHours(new Map([...hours, [weekday, { ...day, ...next }]]));
  }

  async function save() {
    if (!valid) return;
    setPending(true);
    const values = {
      name: name.trim(),
      street: street.trim(),
      city: city.trim(),
      region: region.trim(),
      postal: postal.trim(),
    };
    const moved =
      values.street !== location.street ||
      values.city !== location.city ||
      values.region !== location.region ||
      values.postal !== location.postal;
    const mapsQuery =
      !moved && location.mapsQuery !== null
        ? location.mapsQuery
        : `Westchase Gastroenterology, ${values.street}, ${values.city}, ${values.region} ${values.postal}`;
    const command = {
      kind: "save_location_details",
      id: location.id,
      expectedVersion: location.version,
    } as const;
    const { street: wasStreet, city: wasCity, region: wasRegion, postal: wasPostal } = location;
    try {
      const outcome = await send(
        { ...command, ...values, mapsQuery, hours: openDays },
        wasStreet === null ||
          wasCity === null ||
          wasRegion === null ||
          wasPostal === null ||
          location.mapsQuery === null ||
          location.hours.length === 0
          ? {}
          : {
              undo: {
                headline: `${values.name} saved`,
                detail: null,
                inverse: {
                  ...command,
                  name: location.name,
                  street: wasStreet,
                  city: wasCity,
                  region: wasRegion,
                  postal: wasPostal,
                  mapsQuery: location.mapsQuery,
                  hours: location.hours,
                },
                slot: `location:${location.id}`,
              },
            },
      );
      if (outcome.ok) leave();
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
      aria-labelledby="location-editor-title"
      data-testid="location-editor-dialog"
      className="portal-confirm-dialog settings-location-editor"
      onKeyDown={keepFocusInDialog}
      onClickCapture={(event) => {
        event.currentTarget.toggleAttribute("data-instant", event.detail === 0);
      }}
      onCancel={(event) => {
        event.preventDefault();
        event.currentTarget.toggleAttribute("data-instant", true);
        if (!pending) leave();
      }}
    >
      <form
        className="contents"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="portal-confirm-dialog-body">
          <div className="portal-confirm-dialog-heading">
            <h2 id="location-editor-title" className="portal-confirm-dialog-title">
              Edit {location.name}
            </h2>
            <button
              type="button"
              disabled={pending}
              className="portal-confirm-dialog-close"
              onClick={leave}
            >
              Close
            </button>
          </div>
          <FieldGroup className="wgi-settings">
            <Field>
              <FieldLabel htmlFor="location-name-input">Name</FieldLabel>
              <Input
                id="location-name-input"
                autoFocus
                required
                maxLength={120}
                autoComplete="off"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                }}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="location-street-input">Street</FieldLabel>
              <Input
                id="location-street-input"
                required
                maxLength={200}
                autoComplete="off"
                value={street}
                onChange={(event) => {
                  setStreet(event.target.value);
                }}
              />
            </Field>
            <div className="settings-location-address">
              <Field>
                <FieldLabel htmlFor="location-city-input">City</FieldLabel>
                <Input
                  id="location-city-input"
                  required
                  maxLength={120}
                  autoComplete="off"
                  value={city}
                  onChange={(event) => {
                    setCity(event.target.value);
                  }}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="location-region-input">State</FieldLabel>
                <Input
                  id="location-region-input"
                  required
                  maxLength={60}
                  autoComplete="off"
                  value={region}
                  onChange={(event) => {
                    setRegion(event.target.value);
                  }}
                />
              </Field>
              <Field data-invalid={postal !== "" && !postalValid ? true : undefined}>
                <FieldLabel htmlFor="location-postal-input">ZIP</FieldLabel>
                <Input
                  id="location-postal-input"
                  required
                  inputMode="numeric"
                  maxLength={10}
                  autoComplete="off"
                  aria-invalid={postal !== "" && !postalValid}
                  value={postal}
                  onChange={(event) => {
                    setPostal(event.target.value);
                  }}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel id="location-hours-label">Office hours</FieldLabel>
              <ul aria-labelledby="location-hours-label" className="settings-office-hours">
                {WEEK_ORDER.map((weekday) => {
                  const day = hours.get(weekday);
                  if (day === undefined) return null;
                  return (
                    <li key={weekday} className="settings-office-day">
                      <label className="flex items-center gap-2.5">
                        <Switch
                          checked={day.open}
                          onCheckedChange={(open) => {
                            changeDay(weekday, { open });
                          }}
                        />
                        <span className="settings-office-day-name">{longDay(weekday)}</span>
                      </label>
                      {day.open ? (
                        <div className="flex items-center gap-2">
                          <NativeSelect
                            aria-label={`${longDay(weekday)} opens`}
                            className="settings-time-select"
                            value={day.from}
                            onChange={(event) => {
                              changeDay(weekday, { from: Number(event.target.value) });
                            }}
                          >
                            {QUARTERS.slice(0, -1).map((minute) => (
                              <option key={minute} value={minute}>
                                {clockOf(minute)}
                              </option>
                            ))}
                          </NativeSelect>
                          <span className="text-[0.8125rem] text-(--wgi-muted-ink)">to</span>
                          <NativeSelect
                            aria-label={`${longDay(weekday)} closes`}
                            aria-invalid={day.until <= day.from}
                            className="settings-time-select"
                            value={day.until}
                            onChange={(event) => {
                              changeDay(weekday, { until: Number(event.target.value) });
                            }}
                          >
                            {QUARTERS.slice(1).map((minute) => (
                              <option key={minute} value={minute}>
                                {clockOf(minute)}
                              </option>
                            ))}
                          </NativeSelect>
                        </div>
                      ) : (
                        <span className="text-[0.8125rem] text-(--wgi-muted-ink)">Closed</span>
                      )}
                    </li>
                  );
                })}
              </ul>
              <FieldDescription>
                Providers&apos; hours here stay inside these. To shorten a day, move their hours
                first.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </div>
        <div className="portal-confirm-dialog-actions">
          <Button type="button" variant="outline" disabled={pending} onClick={leave}>
            Cancel
          </Button>
          <Button type="submit" disabled={!valid || pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
