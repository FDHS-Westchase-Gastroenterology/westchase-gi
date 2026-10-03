/* The Day view's Hours sheet (issue #353): one read of every bookable provider's hours on one
   practice day, the command that sets a provider's hours for that day or for that weekday from
   the day on, and its undo. All three are admin-only; the database refuses anyone else. */
import { z } from "zod";

import {
  appointmentStatusSchema,
  dateSchema,
  schedulingFailureSchema,
  schedulingTimestampSchema,
  schedulingVersionSchema,
} from "./contracts";
import { settingsConflictSchema } from "./settings-contracts";

// The sheet's bars snap to the quarter hour, as the weekly-hours bars in Settings do.
const quarterSchema = z
  .number()
  .int()
  .refine((minute) => minute % 15 === 0);
const minuteSchema = z.number().int().min(0).max(1440);

export const dayWindowSchema = z
  .strictObject({
    locationId: z.uuid(),
    openMinute: quarterSchema.pipe(z.number().min(0).max(1425)),
    closeMinute: quarterSchema.pipe(z.number().min(15).max(1440)),
  })
  .refine((window) => window.closeMinute > window.openMinute)
  .readonly();
export type DayWindow = z.output<typeof dayWindowSchema>;

/* A provider is in one place at a time, and two windows that touch at one office are one
   window, so the database refuses both; the shape is checked here first. */
function windowsClash(windows: readonly DayWindow[]) {
  return windows.some((a, i) =>
    windows.some(
      (b, j) =>
        i < j &&
        ((a.openMinute < b.closeMinute && b.openMinute < a.closeMinute) ||
          (a.locationId === b.locationId &&
            (a.closeMinute === b.openMinute || b.closeMinute === a.openMinute))),
    ),
  );
}

export const DAY_HOURS_SCOPES = ["date", "weekday_from"] as const;
export type DayHoursScope = (typeof DAY_HOURS_SCOPES)[number];

export const dayHoursCommandSchema = z
  .strictObject({
    providerId: z.uuid(),
    date: dateSchema,
    scope: z.enum(DAY_HOURS_SCOPES),
    windows: z
      .array(dayWindowSchema)
      .max(24)
      .refine((windows) => !windowsClash(windows))
      .readonly(),
    expectedVersion: schedulingVersionSchema,
    dryRun: z.boolean(),
  })
  .readonly();
export type DayHoursCommand = z.input<typeof dayHoursCommandSchema>;

export const dayHoursCommandInputSchema = z.strictObject({
  idempotencyKey: z.uuid(),
  command: dayHoursCommandSchema,
});
export type DayHoursCommandInput = z.input<typeof dayHoursCommandInputSchema>;

export const dayHoursUndoInputSchema = z.strictObject({
  idempotencyKey: z.uuid(),
  changeId: z.uuid(),
  expectedVersion: schedulingVersionSchema,
});
export type DayHoursUndoInput = z.input<typeof dayHoursUndoInputSchema>;

/* A change that would strand a booking is refused with the bookings it would strand, so the
   sheet can name them; every other refusal is a plain code. */
export const dayHoursCommandOutcomeSchema = z.union([
  z
    .object({
      ok: z.literal(true),
      dryRun: z.boolean(),
      entity: z.literal("provider"),
      id: z.uuid(),
      version: schedulingVersionSchema,
      changeId: z.uuid().optional(),
      openCount: z.number().int().nonnegative(),
    })
    .readonly(),
  z
    .object({
      ok: z.literal(false),
      code: z.literal("schedule_in_use"),
      conflicts: z.array(settingsConflictSchema).readonly(),
    })
    .readonly(),
  schedulingFailureSchema.readonly(),
]);
export type DayHoursCommandOutcome = z.output<typeof dayHoursCommandOutcomeSchema>;

export const dayHoursUndoOutcomeSchema = z.union([
  z
    .object({
      ok: z.literal(true),
      entity: z.literal("provider"),
      id: z.uuid(),
      version: schedulingVersionSchema,
    })
    .readonly(),
  z
    .object({
      ok: z.literal(false),
      code: z.literal("schedule_in_use"),
      conflicts: z.array(settingsConflictSchema).readonly(),
    })
    .readonly(),
  schedulingFailureSchema.readonly(),
]);
export type DayHoursUndoOutcome = z.output<typeof dayHoursUndoOutcomeSchema>;

const readWindowSchema = z
  .object({ locationId: z.uuid(), openMinute: minuteSchema, closeMinute: minuteSchema })
  .readonly();

export const dayHoursLocationSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    // Null when the office keeps no hours that weekday.
    openMinute: minuteSchema.nullable(),
    closeMinute: minuteSchema.nullable(),
    closed: z.boolean(),
  })
  .readonly();

export const dayHoursBookingSchema = z
  .object({
    id: z.uuid(),
    locationId: z.uuid(),
    startsAt: schedulingTimestampSchema,
    endsAt: schedulingTimestampSchema,
    status: appointmentStatusSchema,
    patientName: z.string(),
    patientListName: z.string().nullable(),
  })
  .readonly();

export const dayHoursProviderSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    version: schedulingVersionSchema,
    windows: z.array(readWindowSchema).readonly(),
    weekly: z.array(readWindowSchema).readonly(),
    // The office their weekly hours use most; null for a provider with no weekly hours.
    homeLocationId: z.uuid().nullable(),
    usualWeekdays: z.array(z.number().int().min(0).max(6)).readonly(),
    timeOff: z
      .array(
        z
          .object({ reason: z.string(), startMinute: minuteSchema, endMinute: minuteSchema })
          .readonly(),
      )
      .readonly(),
    bookings: z.array(dayHoursBookingSchema).readonly(),
  })
  .readonly();

export const dayHoursOutcomeSchema = z.union([
  z
    .object({
      ok: z.literal(true),
      observedAt: schedulingTimestampSchema,
      today: dateSchema,
      date: dateSchema,
      weekday: z.number().int().min(0).max(6),
      locations: z.array(dayHoursLocationSchema).readonly(),
      providers: z.array(dayHoursProviderSchema).readonly(),
    })
    .readonly(),
  schedulingFailureSchema.readonly(),
]);
export type DayHoursOutcome = z.output<typeof dayHoursOutcomeSchema>;
export type DayHours = Extract<DayHoursOutcome, { ok: true }>;
export type DayHoursProvider = z.output<typeof dayHoursProviderSchema>;
export type DayHoursLocation = z.output<typeof dayHoursLocationSchema>;
export type DayHoursBooking = z.output<typeof dayHoursBookingSchema>;
export type DayHoursConflict = z.output<typeof settingsConflictSchema>;
