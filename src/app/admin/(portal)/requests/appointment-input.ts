// Shared date/time input policy for the two surfaces that record an outcome:
// The request detail panel and the line on Home. Both bound their pickers the
// Same way, and the server re-validates every resolved instant regardless.

import type { AppointmentChoice } from "./workflow-actions";

const NY_DAY_INPUT = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "short",
  timeZone: "America/New_York",
});

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** Practice-local "today" shifted by whole days, as a `<input type="date">` value. */
export function practiceLocalDay(offsetDays: number): string {
  const todayEt = NY_DAY_INPUT.format(new Date());
  const shifted = new Date(Date.parse(`${todayEt}T00:00:00Z`) + offsetDays * 86_400_000);
  return shifted.toISOString().slice(0, 10);
}

function isRealDay(value: string): boolean {
  if (!YMD.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** A call-again day staff may pick: today through 90 days out. */
export function isValidCustomCallAgainDay(value: string): boolean {
  if (!isRealDay(value)) return false;
  return value >= practiceLocalDay(0) && value <= practiceLocalDay(90);
}

/* Appointments reach further out than a call-again: a procedure is routinely
   booked months ahead. The server re-validates both bounds. */
export function isValidAppointmentDay(value: string): boolean {
  if (!isRealDay(value)) return false;
  return value >= practiceLocalDay(0) && value <= practiceLocalDay(400);
}

/** The booking a day and a wall-clock time describe, or undefined while incomplete. */
export function appointmentChoice(day: string, time: string): AppointmentChoice | undefined {
  if (!isValidAppointmentDay(day)) return undefined;
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (match === null) return undefined;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return undefined;
  return { date: day, hour, minute };
}
