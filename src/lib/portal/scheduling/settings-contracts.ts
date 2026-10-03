/* The Settings window's scheduling facts (issue #352): one read of every provider, appointment
   type and location it shows, and the granular commands it applies as staff make each change.
   The commands are admin-only; the database refuses anyone else. */
import { z } from "zod";

import {
  appointmentTypeIconSchema,
  dateSchema,
  schedulingEntitySchema,
  schedulingFailureSchema,
  schedulingTimestampSchema,
  schedulingVersionSchema,
} from "./contracts";

export const TIME_OFF_REASONS = ["personal", "conference", "holiday"] as const;
export type TimeOffReason = (typeof TIME_OFF_REASONS)[number];

const count = z.number().int().nonnegative();
const weekdaySchema = z.number().int().min(0).max(6);
// Settings edit on the 15-minute grid the weekly-hours bars snap to.
const quarterSchema = z
  .number()
  .int()
  .refine((minute) => minute % 15 === 0);
const openMinuteSchema = quarterSchema.pipe(z.number().min(0).max(1425));
const closeMinuteSchema = quarterSchema.pipe(z.number().min(15).max(1440));
const nameSchema = z.string().trim().min(1).max(120);
const credentialsSchema = z.string().trim().min(1).max(120).nullable();

function windowsOverlap(
  hours: readonly Readonly<{ weekday: number; openMinute: number; closeMinute: number }>[],
) {
  return hours.some((a, i) =>
    hours.some(
      (b, j) =>
        i < j &&
        a.weekday === b.weekday &&
        a.openMinute < b.closeMinute &&
        b.openMinute < a.closeMinute,
    ),
  );
}

export const weeklyWindowSchema = z
  .strictObject({
    locationId: z.uuid(),
    weekday: weekdaySchema,
    openMinute: openMinuteSchema,
    closeMinute: closeMinuteSchema,
  })
  .refine((window) => window.closeMinute > window.openMinute)
  .readonly();
// A provider is in one place at a time, so one weekday's windows never overlap.
const weeklyHoursSchema = z
  .array(weeklyWindowSchema)
  .max(50)
  .refine((hours) => !windowsOverlap(hours))
  .readonly();
const officeDaySchema = z
  .strictObject({
    weekday: weekdaySchema,
    openMinute: openMinuteSchema,
    closeMinute: closeMinuteSchema,
  })
  .refine((day) => day.closeMinute > day.openMinute)
  .readonly();

const existing = { id: z.uuid(), expectedVersion: schedulingVersionSchema };
export const settingsCommandSchema = z
  .discriminatedUnion("kind", [
    z.strictObject({
      kind: z.literal("add_provider"),
      name: nameSchema,
      credentials: credentialsSchema,
      hours: weeklyHoursSchema,
    }),
    z.strictObject({
      kind: z.literal("set_provider_profile"),
      ...existing,
      name: nameSchema,
      credentials: credentialsSchema,
      bookable: z.boolean(),
      active: z.boolean(),
    }),
    z.strictObject({
      kind: z.literal("set_provider_weekly_hours"),
      ...existing,
      hours: weeklyHoursSchema,
    }),
    z
      .strictObject({
        kind: z.literal("add_time_off"),
        ...existing,
        startsOn: dateSchema,
        endsOn: dateSchema,
        allDay: z.boolean(),
        startMinute: openMinuteSchema.nullable(),
        endMinute: closeMinuteSchema.nullable(),
        reason: z.enum(TIME_OFF_REASONS),
        dryRun: z.boolean(),
      })
      .refine((command) =>
        command.allDay
          ? command.startMinute === null && command.endMinute === null
          : command.startsOn === command.endsOn &&
            command.startMinute !== null &&
            command.endMinute !== null &&
            command.endMinute > command.startMinute,
      )
      .refine((command) => command.endsOn >= command.startsOn),
    z.strictObject({ kind: z.literal("remove_time_off"), ...existing, timeOffId: z.uuid() }),
    z.strictObject({
      kind: z.literal("set_provider_types"),
      ...existing,
      typeIds: z.array(z.uuid()).max(100).readonly(),
    }),
    z
      .strictObject({
        kind: z.literal("save_appointment_type"),
        id: z.uuid().nullable(),
        expectedVersion: schedulingVersionSchema.nullable(),
        name: nameSchema,
        durationMinutes: z.number().int().min(1).max(1440),
        bufferBeforeMinutes: z.number().int().min(0).max(720),
        bufferAfterMinutes: z.number().int().min(0).max(720),
        icon: appointmentTypeIconSchema,
        description: z.string().trim().min(1).max(200).nullable(),
        providerIds: z.array(z.uuid()).max(100).readonly(),
      })
      .refine((command) => (command.id === null) === (command.expectedVersion === null)),
    z.strictObject({
      kind: z.literal("reorder_appointment_types"),
      ...existing,
      position: z.number().int().positive().max(1000),
    }),
    z.strictObject({
      kind: z.literal("set_appointment_type_active"),
      ...existing,
      active: z.boolean(),
    }),
    z.strictObject({ kind: z.literal("delete_appointment_type"), ...existing }),
    z.strictObject({
      kind: z.literal("save_location_details"),
      ...existing,
      name: nameSchema,
      street: z.string().trim().min(1).max(200),
      city: z.string().trim().min(1).max(120),
      region: z.string().trim().min(1).max(60),
      postal: z.string().regex(/^\d{5}(-\d{4})?$/),
      mapsQuery: z.string().trim().min(1).max(300),
      hours: z
        .array(officeDaySchema)
        .min(1)
        .max(7)
        .refine((hours) => new Set(hours.map((day) => day.weekday)).size === hours.length)
        .readonly(),
    }),
    z.strictObject({
      kind: z.literal("add_location_closure"),
      ...existing,
      closedOn: dateSchema,
      note: z.string().trim().min(1).max(120).nullable(),
      dryRun: z.boolean(),
    }),
    z.strictObject({
      kind: z.literal("remove_location_closure"),
      ...existing,
      closureId: z.uuid(),
    }),
  ])
  .readonly();
export type SettingsCommand = z.input<typeof settingsCommandSchema>;

export const schedulingSettingsCommandInputSchema = z.strictObject({
  idempotencyKey: z.uuid(),
  command: settingsCommandSchema,
});
export type SchedulingSettingsCommandInput = z.input<typeof schedulingSettingsCommandInputSchema>;

/* An appointment time off or a closed day would cover. Neither cancels it: the window lists
   them so staff can choose new times. */
export const settingsConflictSchema = z
  .object({
    id: z.uuid(),
    version: schedulingVersionSchema,
    startsAt: schedulingTimestampSchema,
    endsAt: schedulingTimestampSchema,
    date: dateSchema,
    appointmentType: z.string(),
    appointmentTypeIcon: appointmentTypeIconSchema,
    locationName: z.string().optional(),
    providerName: z.string().optional(),
    patientName: z.string(),
    patientListName: z.string(),
  })
  .readonly();
export type SettingsConflict = z.output<typeof settingsConflictSchema>;

export const settingsCommandOutcomeSchema = z.union([
  z
    .object({
      ok: z.literal(true),
      entity: schedulingEntitySchema,
      id: z.uuid(),
      version: schedulingVersionSchema,
      dryRun: z.literal(true).optional(),
      conflicts: z.array(settingsConflictSchema).readonly().optional(),
    })
    .readonly(),
  schedulingFailureSchema,
]);
export type SettingsCommandOutcome = z.output<typeof settingsCommandOutcomeSchema>;

const minuteSchema = z.number().int().min(0).max(1440);
export const settingsProviderSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    credentials: z.string().nullable(),
    bookable: z.boolean(),
    version: schedulingVersionSchema,
    sortOrder: z.number().int(),
    hours: z
      .array(
        z
          .object({
            id: z.uuid(),
            locationId: z.uuid(),
            weekday: weekdaySchema,
            openMinute: minuteSchema,
            closeMinute: minuteSchema,
            validFrom: dateSchema,
            validTo: dateSchema.nullable(),
          })
          .readonly(),
      )
      .readonly(),
    timeOff: z
      .array(
        z
          .object({
            id: z.uuid(),
            startsAt: schedulingTimestampSchema,
            endsAt: schedulingTimestampSchema,
            locationId: z.uuid().nullable(),
            reason: z.enum(TIME_OFF_REASONS).nullable(),
            allDay: z.boolean(),
          })
          .readonly(),
      )
      .readonly(),
    typeIds: z.array(z.uuid()).readonly(),
  })
  .readonly();
export const settingsTypeSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    icon: appointmentTypeIconSchema,
    description: z.string().nullable(),
    durationMinutes: z.number().int().positive(),
    bufferBeforeMinutes: count,
    bufferAfterMinutes: count,
    active: z.boolean(),
    version: schedulingVersionSchema,
    sortOrder: z.number().int(),
    providerIds: z.array(z.uuid()).readonly(),
    used: z.boolean(),
  })
  .readonly();
export const settingsLocationSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    version: schedulingVersionSchema,
    street: z.string().nullable(),
    city: z.string().nullable(),
    region: z.string().nullable(),
    postal: z.string().nullable(),
    mapsQuery: z.string().nullable(),
    requestLocation: z.enum(["tampa", "lutz"]).nullable(),
    hours: z
      .array(
        z
          .object({ weekday: weekdaySchema, openMinute: minuteSchema, closeMinute: minuteSchema })
          .readonly(),
      )
      .readonly(),
    closures: z
      .array(
        z.object({ id: z.uuid(), closedOn: dateSchema, note: z.string().nullable() }).readonly(),
      )
      .readonly(),
    providerIds: z.array(z.uuid()).readonly(),
  })
  .readonly();
export const schedulingSettingsOutcomeSchema = z.union([
  z
    .object({
      ok: z.literal(true),
      observedAt: schedulingTimestampSchema,
      today: dateSchema,
      timeZone: z.literal("America/New_York"),
      canEdit: z.boolean(),
      providers: z.array(settingsProviderSchema).readonly(),
      types: z.array(settingsTypeSchema).readonly(),
      locations: z.array(settingsLocationSchema).readonly(),
    })
    .readonly(),
  schedulingFailureSchema,
]);
export type SchedulingSettingsOutcome = z.output<typeof schedulingSettingsOutcomeSchema>;
export type SettingsProvider = z.output<typeof settingsProviderSchema>;
export type SettingsType = z.output<typeof settingsTypeSchema>;
export type SettingsLocation = z.output<typeof settingsLocationSchema>;
export type SchedulingSettings = Extract<
  z.output<typeof schedulingSettingsOutcomeSchema>,
  { ok: true }
>;
