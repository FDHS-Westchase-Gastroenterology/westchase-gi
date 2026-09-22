/* The record card's wall clock, on its own because the whole clock is a
   piece of work in itself: the slot list, the staff-facing labels, and the
   hour/minute/half-of-day wheels the picker reads them through. Days are
   the model's; times here are zero-padded HH:MM, and HH:MM compares as
   text. */

/* The whole clock, not the hours the practice usually keeps: an early
   arrival is a real booking, and the server refuses on its own terms. */
export const TIME_MIN = "00:00";
export const TIME_MAX = "23:59";
export const TIME_STEP_SECONDS = 60;

const HM = /^\d{2}:\d{2}$/;

/** A time on the clock; zero-padded HH:MM compares as text. */
export function timeWithinDay(time: string): boolean {
  return HM.test(time) && time >= TIME_MIN && time <= TIME_MAX;
}

const CLOCK = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "UTC",
});

/** The clock a staff member reads: 08:00 becomes 8:00 AM. */
function clockLabel(time: string): string {
  return CLOCK.format(
    new Date(Date.UTC(2000, 0, 1, Number(time.slice(0, 2)), Number(time.slice(3, 5)))),
  );
}

function slots(): readonly TimeSlot[] {
  const step = TIME_STEP_SECONDS / 60;
  const last = Number(TIME_MAX.slice(0, 2)) * 60 + Number(TIME_MAX.slice(3, 5));
  const list: TimeSlot[] = [];
  for (
    let minutes = Number(TIME_MIN.slice(0, 2)) * 60 + Number(TIME_MIN.slice(3, 5));
    minutes <= last;
    minutes += step
  ) {
    const time = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    list.push({ value: time, label: clockLabel(time) });
  }
  return list;
}

interface TimeSlot {
  readonly value: string;
  readonly label: string;
}

/** Every minute of the day, the picker's whole list. */
export const TIME_SLOTS = slots();

/* The picker asks for the three the staff say out loud — the hour, the
   minute, then the half of the day — so each list is short enough to read
   at a glance. Every list is still cut from TIME_SLOTS, so the clock
   stays the one source. */
export interface TimeParts {
  readonly hour: string;
  readonly minute: string;
  readonly meridiem: string;
}

export const NO_TIME_PARTS: TimeParts = { hour: "", minute: "", meridiem: "" };

function partsOf(time: string): TimeParts {
  const hour = Number(time.slice(0, 2));
  return {
    hour: String(hour % 12 === 0 ? 12 : hour % 12),
    minute: time.slice(3, 5),
    meridiem: hour < 12 ? "AM" : "PM",
  };
}

const SLOT_PARTS: readonly TimeParts[] = TIME_SLOTS.map((slot) => partsOf(slot.value));

function collect(
  part: (parts: Readonly<TimeParts>) => string,
  keep: (parts: Readonly<TimeParts>) => boolean,
): readonly string[] {
  const values: string[] = [];
  for (const parts of SLOT_PARTS) {
    const value = part(parts);
    if (keep(parts) && !values.includes(value)) values.push(value);
  }
  return values;
}

/** The parts a chosen time reads as; an unset time has none. */
export function timeParts(time: string): TimeParts {
  return timeWithinDay(time) ? partsOf(time) : NO_TIME_PARTS;
}

/** Both halves of the day, in the order the day runs. */
export const MERIDIEMS = collect(
  (parts) => parts.meridiem,
  () => true,
);

/** The hours on the clock, narrowed once a half of the day is chosen. */
export function hourOptions(meridiem: string): readonly string[] {
  return collect(
    (parts) => parts.hour,
    (parts) => meridiem === "" || parts.meridiem === meridiem,
  );
}

/** The minutes inside the chosen hour. */
export function minuteOptions(meridiem: string, hour: string): readonly string[] {
  return collect(
    (parts) => parts.minute,
    (parts) =>
      (meridiem === "" || parts.meridiem === meridiem) && (hour === "" || parts.hour === hour),
  );
}

/** The three parts as a time, or nothing while they are incomplete. */
export function joinTime(parts: Readonly<TimeParts>): string {
  if (parts.hour === "" || parts.minute === "" || parts.meridiem === "") return "";
  const hour = (Number(parts.hour) % 12) + (parts.meridiem === "PM" ? 12 : 0);
  const time = `${String(hour).padStart(2, "0")}:${parts.minute}`;
  return TIME_SLOTS.some((slot) => slot.value === time) ? time : "";
}
