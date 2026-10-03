"use client";

import { useId } from "react";

import { squeezeOptions } from "@/app/admin/(portal)/(home)/card-booking-days";
import type {
  BookingDraft,
  BookingStripLine,
  CardType,
  StripAction,
} from "@/app/admin/(portal)/(home)/card-booking-model";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import type { MonthAvailability } from "@/lib/portal/scheduling/read-contracts";

import { ChevronGlyph } from "./glyphs";
import { TimePicker } from "./time-picker";

/* The strip under the booking month (issue #344; Figma 09d–09e): the visit
   type at its left and, at its right, what Book sends or why it waits —
   with the one step that moves it on (Try again, Next month). "Enter a
   time…" opens a second row for a start the month does not offer: a
   provider and office, and the registry time field. The type and the
   provider are native selects, the portal's compact sizing of the
   project's NativeSelect recipe, each wrapped with a drawn chevron the way
   the registry's native select is (home.css .wgi-booking-pick). */

const ACTION_LABELS = {
  "retry-read": "Try again",
  "next-month": "Next month",
  "retry-book": "Try again",
} satisfies Record<StripAction, string>;

export function BookingStrip({
  types,
  typeId,
  draft,
  availability,
  line,
  locked,
  onType,
  onAction,
  onSqueezeProvider,
  onSqueezeTime,
}: Readonly<{
  types: readonly CardType[];
  typeId: string | null;
  draft: Readonly<BookingDraft>;
  availability: MonthAvailability | null;
  line: Readonly<BookingStripLine>;
  locked: boolean;
  onType: (typeId: string) => void;
  onAction: (action: StripAction) => void;
  onSqueezeProvider: (providerId: string, locationId: string) => void;
  onSqueezeTime: (time: string) => void;
}>) {
  const timeId = useId();
  const options = availability === null ? [] : squeezeOptions(availability);
  const picked = draft.providerId === "" ? "" : `${draft.providerId}:${draft.locationId}`;

  return (
    <div className="wgi-record-strip" data-booking="">
      <div className="wgi-booking-row">
        <span className="wgi-booking-pick">
          <NativeSelect
            aria-label="Visit type"
            className="wgi-booking-select"
            value={typeId ?? ""}
            disabled={locked || types.length === 0}
            onChange={(event) => {
              onType(event.currentTarget.value);
            }}
          >
            {typeId === null ? <option value="">Visit type</option> : null}
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </NativeSelect>
          <ChevronGlyph size={14} />
        </span>
        <div className="wgi-booking-status" aria-live="polite">
          <p className="wgi-record-readout">
            <span className="wgi-record-readout-label">{line.label}</span>
            <span
              className="wgi-record-readout-value"
              data-missing={line.tone === "muted" || undefined}
              data-failed={line.tone === "failed" || undefined}
            >
              {line.value}
            </span>
            {line.detail === null ? null : (
              <span className="wgi-booking-detail" title={line.detail}>
                {line.detail}
              </span>
            )}
          </p>
          {line.action === null ? null : (
            <Button
              variant="ghost"
              size="sm"
              motion="none"
              className="wgi-booking-action"
              disabled={locked}
              onClick={() => {
                if (line.action !== null) onAction(line.action);
              }}
            >
              {ACTION_LABELS[line.action]}
            </Button>
          )}
        </div>
      </div>
      {draft.squeeze ? (
        <div className="wgi-booking-squeeze">
          <span className="wgi-booking-pick">
            <NativeSelect
              aria-label="Provider"
              className="wgi-booking-select"
              value={picked}
              disabled={locked || options.length === 0}
              onChange={(event) => {
                const option = options.find((entry) => entry.value === event.currentTarget.value);
                if (option !== undefined) onSqueezeProvider(option.providerId, option.locationId);
              }}
            >
              {picked === "" ? <option value="">Provider</option> : null}
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
            <ChevronGlyph size={14} />
          </span>
          <Field orientation="horizontal" className="wgi-record-when">
            <FieldLabel htmlFor={timeId}>Time</FieldLabel>
            <TimePicker id={timeId} time={draft.time} disabled={locked} onPick={onSqueezeTime} />
          </Field>
        </div>
      ) : null}
    </div>
  );
}
