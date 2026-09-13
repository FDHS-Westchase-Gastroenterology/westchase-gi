import { z } from "zod";

export const PRACTICE_TIME_ZONE = "America/New_York";
export const appointmentTimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const appointmentStartSchema = z.strictObject({
  date: z.iso.date().refine((date) => !date.startsWith("0000-")),
  time: appointmentTimeSchema,
});
export type AppointmentStart = z.infer<typeof appointmentStartSchema>;

const practiceDateTime = new Intl.DateTimeFormat("en-CA", {
  timeZone: PRACTICE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function resolveAppointmentStart(start: Readonly<AppointmentStart>): string | null {
  if (!appointmentStartSchema.safeParse(start).success) return null;
  const candidates = [];
  // Reject both nonexistent spring times and repeated autumn times.
  for (const offset of ["-04:00", "-05:00"]) {
    const candidate = new Date(`${start.date}T${start.time}:00${offset}`);
    if (!Number.isFinite(candidate.getTime())) continue;
    const parts = practiceDateTime.formatToParts(candidate);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((value) => value.type === type)?.value ?? "";
    const date = `${part("year").padStart(4, "0")}-${part("month")}-${part("day")}`;
    const time = `${part("hour")}:${part("minute")}`;
    if (date === start.date && time === start.time) candidates.push(candidate.toISOString());
  }
  return candidates.length === 1 ? candidates[0] : null;
}
