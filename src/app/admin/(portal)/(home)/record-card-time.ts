/* The record card accepts every minute of a full wall-clock day. These
   options do not narrow when another wheel changes. */
export const HOURS: readonly string[] = [
  "12",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
];
export const MINUTES: readonly string[] = Array.from({ length: 60 }, (_, minute) =>
  String(minute).padStart(2, "0"),
);
export const MERIDIEMS: readonly string[] = ["AM", "PM"];

export function timeWithinDay(time: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);
}

const CLOCK = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "UTC",
});

/** Format only the selected value; invalid or unset times have no label. */
export function clockLabel(time: string): string {
  return timeWithinDay(time)
    ? CLOCK.format(
        new Date(Date.UTC(2000, 0, 1, Number(time.slice(0, 2)), Number(time.slice(3, 5)))),
      )
    : "";
}

export interface TimeParts {
  readonly hour: string;
  readonly minute: string;
  readonly meridiem: string;
}

export const NO_TIME_PARTS: TimeParts = { hour: "", minute: "", meridiem: "" };

export function timeParts(time: string): TimeParts {
  if (!timeWithinDay(time)) return NO_TIME_PARTS;
  const hour = Number(time.slice(0, 2));
  return {
    hour: String(hour % 12 || 12),
    minute: time.slice(3, 5),
    meridiem: hour < 12 ? "AM" : "PM",
  };
}

/** The three wheel values as HH:MM, or nothing while incomplete/invalid. */
export function joinTime(parts: Readonly<TimeParts>): string {
  if (parts.hour === "" || parts.minute === "" || parts.meridiem === "") return "";
  const hour = (Number(parts.hour) % 12) + (parts.meridiem === "PM" ? 12 : 0);
  const time = `${String(hour).padStart(2, "0")}:${parts.minute}`;
  return timeWithinDay(time) ? time : "";
}
