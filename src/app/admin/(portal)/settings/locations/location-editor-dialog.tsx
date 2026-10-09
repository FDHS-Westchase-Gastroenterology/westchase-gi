"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConflictList } from "@/app/admin/(portal)/settings/needs-new-time";
import {
  QUARTER_HOUR,
  WEEK_ORDER,
  appointmentCount,
  clockOf,
  longDay,
  settingsFailureMessage,
  shortName,
  weekdayList,
} from "@/app/admin/(portal)/settings/settings-model";
import { SettingsSheet } from "@/app/admin/(portal)/settings/settings-sheet";
import type {
  SettingsSend,
  SettingsUndo,
} from "@/app/admin/(portal)/settings/use-settings-command";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import type {
  SettingsAdjusted,
  SettingsConflict,
  SettingsLocation,
} from "@/lib/portal/scheduling/settings-contracts";

/* Edit an office (issue #352, Figma St5): its name, address and the hours
   it is open each day. The card's Edit opens this sheet through the address
   (?edit=<id>), so Back closes it. Office hours lead: when they change, the
   server moves the hours of every provider who works here to match, from
   today. Before saving new hours the sheet asks the server what that would
   move, names those providers, and lists any bookings the new hours would
   leave outside; they stay booked and are listed to be given new times. */

const QUARTERS = Array.from({ length: (24 * 60) / QUARTER_HOUR + 1 }, (_, i) => i * QUARTER_HOUR);
const POSTAL = /^\d{5}(-\d{4})?$/u;

interface DayHours {
  readonly open: boolean;
  readonly from: number;
  readonly until: number;
}

interface Review {
  readonly adjusted: SettingsAdjusted;
  readonly conflicts: readonly SettingsConflict[];
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

interface Address {
  readonly name: string;
  readonly street: string;
  readonly city: string;
  readonly region: string;
  readonly postal: string;
}

function textField(
  id: string,
  label: string,
  value: string,
  maxLength: number,
  onChange: (value: string) => void,
  extra: Readonly<{ initialFocus?: boolean; invalid?: boolean; numeric?: boolean }> = {},
) {
  return (
    <Field data-invalid={extra.invalid === true || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        data-initial-focus={extra.initialFocus === true || undefined}
        required
        maxLength={maxLength}
        autoComplete="off"
        inputMode={extra.numeric === true ? "numeric" : undefined}
        aria-invalid={extra.invalid === true}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
    </Field>
  );
}

function AddressFields({
  address,
  onChange,
}: Readonly<{ address: Address; onChange: (address: Address) => void }>) {
  const postalInvalid = address.postal !== "" && !POSTAL.test(address.postal.trim());
  return (
    <>
      {textField(
        "location-name-input",
        "Name",
        address.name,
        120,
        (name) => {
          onChange({ ...address, name });
        },
        { initialFocus: true },
      )}
      {textField("location-street-input", "Street", address.street, 200, (street) => {
        onChange({ ...address, street });
      })}
      <div className="settings-location-address">
        {textField("location-city-input", "City", address.city, 120, (city) => {
          onChange({ ...address, city });
        })}
        {textField("location-region-input", "State", address.region, 60, (region) => {
          onChange({ ...address, region });
        })}
        {textField(
          "location-postal-input",
          "ZIP",
          address.postal,
          10,
          (postal) => {
            onChange({ ...address, postal });
          },
          { invalid: postalInvalid, numeric: true },
        )}
      </div>
    </>
  );
}

function OfficeHoursField({
  hours,
  onChange,
}: Readonly<{
  hours: ReadonlyMap<number, DayHours>;
  onChange: (weekday: number, next: Partial<DayHours>) => void;
}>) {
  return (
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
                    onChange(weekday, { open });
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
                      onChange(weekday, { from: Number(event.target.value) });
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
                      onChange(weekday, { until: Number(event.target.value) });
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
    </Field>
  );
}

function OfficeReview({ review }: Readonly<{ review: Review }>) {
  return (
    <>
      {review.adjusted.length === 0 ? null : (
        <>
          <p className="text-[0.9375rem] leading-6 font-semibold text-(--wgi-name-ink)">
            These providers&apos; hours change to match, from today
          </p>
          <ul className="settings-conflicts">
            {review.adjusted.map((entry) => (
              <li key={entry.providerId}>
                <span className="font-semibold">{shortName(entry.providerName)}</span>
                <span>{weekdayList(entry.weekdays)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {review.conflicts.length === 0 ? null : (
        <>
          <p className="text-[0.9375rem] leading-6 font-semibold text-(--wgi-name-ink)">
            {appointmentCount(review.conflicts.length)}{" "}
            {review.conflicts.length === 1 ? "falls" : "fall"} outside the new hours
          </p>
          <ConflictList conflicts={review.conflicts} />
          <p className="text-[0.8125rem] leading-5 text-(--wgi-muted-ink)">
            They stay booked, and this office&apos;s card lists them until each has a new time.
          </p>
        </>
      )}
    </>
  );
}

function officeDays(hours: ReadonlyMap<number, DayHours>) {
  return WEEK_ORDER.flatMap((weekday) => {
    const day = hours.get(weekday);
    return day?.open === true ? [{ weekday, openMinute: day.from, closeMinute: day.until }] : [];
  });
}

function sameHours(
  a: readonly Readonly<{ weekday: number; openMinute: number; closeMinute: number }>[],
  b: readonly Readonly<{ weekday: number; openMinute: number; closeMinute: number }>[],
) {
  const key = (days: typeof a) =>
    days
      .map((day) => `${String(day.weekday)}/${String(day.openMinute)}-${String(day.closeMinute)}`)
      .toSorted()
      .join(",");
  return key(a) === key(b);
}

export function LocationEditorDialog({
  location,
  send,
}: Readonly<{
  location: SettingsLocation;
  send: SettingsSend;
}>) {
  const router = useRouter();
  const [address, setAddress] = useState<Address>(() => ({
    name: location.name,
    street: location.street ?? "",
    city: location.city ?? "",
    region: location.region ?? "FL",
    postal: location.postal ?? "",
  }));
  const [hours, setHours] = useState(() => startingHours(location));
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const openDays = officeDays(hours);
  const hoursChanged = !sameHours(openDays, location.hours);
  const valid =
    [address.name, address.street, address.city, address.region].every(
      (value) => value.trim() !== "",
    ) &&
    POSTAL.test(address.postal.trim()) &&
    openDays.length > 0 &&
    openDays.every((day) => day.closeMinute > day.openMinute);

  function leave() {
    const here = new URL(window.location.href);
    here.searchParams.delete("edit");
    router.replace(`${here.pathname}${here.search}`, { scroll: false });
  }

  function command(keepBooked: boolean, dryRun: boolean) {
    const values = {
      name: address.name.trim(),
      street: address.street.trim(),
      city: address.city.trim(),
      region: address.region.trim(),
      postal: address.postal.trim(),
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
    return {
      kind: "save_location_details",
      id: location.id,
      expectedVersion: location.detailsVersion,
      ...values,
      mapsQuery,
      hours: openDays,
      keepBooked,
      dryRun,
    } as const;
  }

  /* Undo puts the details back. When providers' hours moved, undoing the office would not put
     theirs back exactly, so that save has none; nor does a first save of an office's details. */
  function undoOf(): SettingsUndo | null {
    const { street: wasStreet, city: wasCity, region: wasRegion, postal: wasPostal } = location;
    if (review !== null && review.adjusted.length > 0) return null;
    if (
      wasStreet === null ||
      wasCity === null ||
      wasRegion === null ||
      wasPostal === null ||
      location.mapsQuery === null ||
      location.hours.length === 0
    )
      return null;
    return {
      headline: `${address.name.trim()} saved`,
      detail: null,
      inverse: {
        ...command(true, false),
        name: location.name,
        street: wasStreet,
        city: wasCity,
        region: wasRegion,
        postal: wasPostal,
        mapsQuery: location.mapsQuery,
        hours: location.hours,
      },
      slot: `location:${location.id}`,
    };
  }

  async function save(keepBooked: boolean) {
    const undo = undoOf();
    const outcome = await send(
      command(keepBooked, false),
      undo === null ? { quiet: true } : { quiet: true, undo },
    );
    if (outcome.ok) leave();
    else setError(settingsFailureMessage(outcome.code));
  }

  /* New hours: ask what they would move before saving them. */
  async function preview() {
    const answer = await send(command(false, true), { quiet: true });
    if (!answer.ok) {
      setError(settingsFailureMessage(answer.code));
      return;
    }
    const adjusted = answer.adjusted ?? [];
    const conflicts = answer.conflicts ?? [];
    if (adjusted.length === 0 && conflicts.length === 0) await save(false);
    else setReview({ adjusted, conflicts });
  }

  async function submit() {
    if (!valid) return;
    setPending(true);
    setError(null);
    try {
      if (review !== null) await save(review.conflicts.length > 0);
      else if (hoursChanged) await preview();
      else await save(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsSheet
      title={`Edit ${location.name}`}
      testId="location-editor-dialog"
      className="settings-location-editor"
      busy={pending}
      onClose={leave}
      onSubmit={() => {
        void submit();
      }}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            data-glass="secondary"
            disabled={pending}
            onClick={() => {
              if (review === null) leave();
              else setReview(null);
            }}
          >
            {review === null ? "Cancel" : "Back"}
          </Button>
          <Button type="submit" data-glass="primary" disabled={!valid || pending}>
            {pending ? "Saving…" : review === null ? "Save" : "Save and update their hours"}
          </Button>
        </>
      }
    >
      <div
        className="flex flex-col gap-3"
        data-testid={review === null ? undefined : "office-hours-review"}
      >
        {review === null ? (
          <FieldGroup>
            <AddressFields address={address} onChange={setAddress} />
            <OfficeHoursField
              hours={hours}
              onChange={(weekday, next) => {
                const day = hours.get(weekday);
                if (day === undefined) return;
                setHours(new Map([...hours, [weekday, { ...day, ...next }]]));
                setError(null);
              }}
            />
          </FieldGroup>
        ) : (
          <OfficeReview review={review} />
        )}
        {error === null ? null : (
          <p role="alert" className="settings-notice">
            {error}
          </p>
        )}
      </div>
    </SettingsSheet>
  );
}
