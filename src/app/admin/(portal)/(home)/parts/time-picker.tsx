"use client";

import { useState } from "react";

import type { TimeParts } from "@/app/admin/(portal)/(home)/record-card-model";
import {
  hourOptions,
  joinTime,
  MERIDIEMS,
  minuteOptions,
  NO_TIME_PARTS,
  timeParts,
} from "@/app/admin/(portal)/(home)/record-card-model";
import { Clock } from "@/components/icons";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/stock/select";

/* The registry select as the record card's time field, asked three times:
   the hour, the minute, then the half of the day, the way the staff say a
   time out loud. Each list is a few rows rather than the whole practice
   day, so the card's strip opens something readable instead of a column
   the height of the screen. The lists are portalled to the body, so their
   paint and their motion are named `wgi-record-times` in home.css;
   item-aligned positioning is off so each opens as a plain dropdown. */
export function TimePicker({
  id,
  time,
  disabled,
  onPick,
}: Readonly<{
  id: string;
  time: string;
  disabled: boolean;
  onPick: (time: string) => void;
}>) {
  /* A complete time is the card's to hold; the partial one on the way to it
     is the picker's, and the two never overlap. */
  const [partial, setPartial] = useState<TimeParts>(NO_TIME_PARTS);
  const parts = time === "" ? partial : timeParts(time);

  function pick(next: TimeParts) {
    /* A half of the day the practice does not book that hour in, or an
       hour without that minute, clears what it contradicts rather than
       leaving an impossible time on screen. */
    const hour = hourOptions(next.meridiem).includes(next.hour) ? next.hour : "";
    const minute = minuteOptions(next.meridiem, hour).includes(next.minute) ? next.minute : "";
    const settled = { hour, minute, meridiem: next.meridiem };
    setPartial(settled);
    onPick(joinTime(settled));
  }

  return (
    <div className="wgi-record-time-parts">
      <Select
        items={hourItems(parts.meridiem)}
        value={parts.hour}
        disabled={disabled}
        onValueChange={(hour) => {
          pick({ ...parts, hour: hour ?? "" });
        }}
      >
        <SelectTrigger id={id} aria-label="Hour">
          <Clock />
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="wgi-record-times" alignItemWithTrigger={false}>
          <SelectGroup>
            {hourOptions(parts.meridiem).map((hour) => (
              <SelectItem key={hour} value={hour}>
                {hour}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Select
        items={minuteItems(parts.meridiem, parts.hour)}
        value={parts.minute}
        disabled={disabled}
        onValueChange={(minute) => {
          pick({ ...parts, minute: minute ?? "" });
        }}
      >
        <SelectTrigger aria-label="Minute">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="wgi-record-times" alignItemWithTrigger={false}>
          <SelectGroup>
            {minuteOptions(parts.meridiem, parts.hour).map((minute) => (
              <SelectItem key={minute} value={minute}>
                {minute}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Select
        items={MERIDIEM_ITEMS}
        value={parts.meridiem}
        disabled={disabled}
        onValueChange={(meridiem) => {
          pick({ ...parts, meridiem: meridiem ?? "" });
        }}
      >
        <SelectTrigger aria-label="AM or PM">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="wgi-record-times" alignItemWithTrigger={false}>
          <SelectGroup>
            {MERIDIEMS.map((meridiem) => (
              <SelectItem key={meridiem} value={meridiem}>
                {meridiem}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

/* Each field also names its empty draft, so a closed trigger reads a
   prompt rather than a blank; that row is never offered in the list. */
interface Choice {
  readonly value: string;
  readonly label: string;
}

function items(placeholder: string, values: readonly string[]): readonly Choice[] {
  return [{ value: "", label: placeholder }, ...values.map((value) => ({ value, label: value }))];
}

function hourItems(meridiem: string): readonly Choice[] {
  return items("Hour", hourOptions(meridiem));
}

function minuteItems(meridiem: string, hour: string): readonly Choice[] {
  return items("Min", minuteOptions(meridiem, hour));
}

const MERIDIEM_ITEMS = items("AM/PM", MERIDIEMS);
