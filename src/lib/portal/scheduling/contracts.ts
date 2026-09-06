import { z } from "zod";

import { appointmentStartSchema, appointmentTimeSchema } from "./time";

export const schedulingVersionSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const schedulingTimestampSchema = z.iso.datetime({ offset: true });
export const schedulingEntitySchema = z.enum(["provider", "location", "appointment_type"]);
export const appointmentStatusSchema = z.enum([
  "scheduled",
  "checked_in",
  "completed",
  "no_show",
  "cancelled",
]);
const dateSchema = z.iso.date().refine((date) => !date.startsWith("0000-"));
const reasonSchema = z.string().trim().min(1).max(500);

const providerHoursFields = {
  locationId: z.uuid(),
  weekday: z.number().int().min(0).max(6),
  openMinute: z.number().int().min(0).max(1439),
  closeMinute: z.number().int().min(1).max(1440),
  validFrom: dateSchema,
  validTo: dateSchema.nullable(),
};
export const providerHoursSchema = z
  .strictObject(providerHoursFields)
  .refine(
    (hours) =>
      hours.closeMinute > hours.openMinute &&
      (hours.validTo === null || hours.validTo >= hours.validFrom),
  );

export const providerExceptionSchema = z
  .strictObject({
    locationId: z.uuid().nullable(),
    kind: z.enum(["available", "unavailable"]),
    startsAt: schedulingTimestampSchema,
    endsAt: schedulingTimestampSchema,
  })
  .refine(
    (exception) =>
      Date.parse(exception.endsAt) > Date.parse(exception.startsAt) &&
      (exception.kind === "unavailable" || exception.locationId !== null),
  );

const configFields = {
  id: z.uuid().nullable().default(null),
  expectedVersion: schedulingVersionSchema.nullable().default(null),
  name: z.string().trim().min(1).max(120),
  active: z.boolean().default(true),
};
export const schedulingConfigCommandSchema = z
  .discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("save_location"), ...configFields }),
    z.strictObject({
      kind: z.literal("save_appointment_type"),
      ...configFields,
      durationMinutes: z.number().int().min(1).max(1440),
      bufferBeforeMinutes: z.number().int().min(0).max(720).default(0),
      bufferAfterMinutes: z.number().int().min(0).max(720).default(0),
    }),
    z.strictObject({
      kind: z.literal("save_provider"),
      ...configFields,
      hours: z
        .array(
          z
            .strictObject({ ...providerHoursFields, validTo: dateSchema.nullable().default(null) })
            .pipe(providerHoursSchema),
        )
        .max(100),
      exceptions: z.array(providerExceptionSchema).max(100),
    }),
  ])
  .refine((command) => (command.id === null) === (command.expectedVersion === null));

const existingAppointment = { id: z.uuid(), expectedVersion: schedulingVersionSchema };
export const appointmentCommandSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("book"),
    patientId: z.uuid(),
    providerId: z.uuid(),
    locationId: z.uuid(),
    appointmentTypeId: z.uuid(),
    expectedTypeVersion: schedulingVersionSchema,
    sourceRequestId: z.uuid().nullable().default(null),
    start: appointmentStartSchema,
  }),
  z
    .strictObject({
      kind: z.literal("reschedule"),
      ...existingAppointment,
      providerId: z.uuid(),
      locationId: z.uuid(),
      appointmentTypeId: z.uuid().nullable().default(null),
      expectedTypeVersion: schedulingVersionSchema.nullable().default(null),
      start: appointmentStartSchema,
      reason: reasonSchema.nullable().default(null),
    })
    .refine(
      (command) => (command.appointmentTypeId === null) === (command.expectedTypeVersion === null),
    ),
  z.strictObject({ kind: z.literal("cancel"), ...existingAppointment, reason: reasonSchema }),
  z.strictObject({ kind: z.literal("check_in"), ...existingAppointment }),
  z.strictObject({ kind: z.literal("complete"), ...existingAppointment }),
  z.strictObject({ kind: z.literal("no_show"), ...existingAppointment }),
  z.strictObject({ kind: z.literal("undo"), ...existingAppointment }),
]);

const historyBefore = schedulingVersionSchema.nullable().default(null);
export const schedulingInputSchema = z.discriminatedUnion("action", [
  z
    .strictObject({
      action: z.literal("availability"),
      providerId: z.uuid(),
      locationId: z.uuid(),
      date: dateSchema,
      appointmentTypeId: z.uuid().nullable().default(null),
      patientId: z.uuid().nullable().default(null),
      appointmentId: z.uuid().nullable().default(null),
      intervalMinutes: z
        .union([z.literal(5), z.literal(10), z.literal(15), z.literal(30), z.literal(60)])
        .default(15),
    })
    .refine((input) => input.appointmentTypeId !== null || input.appointmentId !== null),
  z.strictObject({
    action: z.literal("configure"),
    idempotencyKey: z.uuid(),
    command: schedulingConfigCommandSchema,
  }),
  z.strictObject({
    action: z.literal("command"),
    idempotencyKey: z.uuid(),
    command: appointmentCommandSchema,
  }),
  z.strictObject({
    action: z.literal("catalog"),
    entity: schedulingEntitySchema,
    query: z.string().trim().max(120).default(""),
    active: z.boolean().nullable().default(true),
    limit: z.number().int().min(1).max(100).default(50),
    after: z
      .strictObject({ name: z.string().min(1).max(120), id: z.uuid() })
      .nullable()
      .default(null),
  }),
  z.strictObject({
    action: z.literal("read_config"),
    entity: schedulingEntitySchema,
    id: z.uuid(),
    historyBefore,
  }),
  z
    .strictObject({
      action: z.literal("appointments"),
      from: schedulingTimestampSchema.nullable().default(null),
      to: schedulingTimestampSchema.nullable().default(null),
      patientId: z.uuid().nullable().default(null),
      providerId: z.uuid().nullable().default(null),
      locationId: z.uuid().nullable().default(null),
      statuses: z.array(appointmentStatusSchema).min(1).max(5).nullable().default(null),
      limit: z.number().int().min(1).max(100).default(100),
      after: z
        .strictObject({ startsAt: schedulingTimestampSchema, id: z.uuid() })
        .nullable()
        .default(null),
    })
    .refine((input) => {
      if (input.from === null || input.to === null)
        return input.from === null && input.to === null && input.patientId !== null;
      const duration = Date.parse(input.to) - Date.parse(input.from);
      return duration > 0 && duration <= 93 * 86_400_000;
    }),
  z.strictObject({ action: z.literal("read_appointment"), id: z.uuid(), historyBefore }),
]);
type ReadonlyFields<T> = T extends readonly (infer Item)[]
  ? readonly ReadonlyFields<Item>[]
  : T extends object
    ? { readonly [Key in keyof T]: ReadonlyFields<T[Key]> }
    : T;
export type SchedulingInput = ReadonlyFields<z.input<typeof schedulingInputSchema>>;

export const SCHEDULING_FAILURE_CODES = [
  "invalid_command",
  "unauthorized",
  "forbidden",
  "not_found",
  "unavailable",
  "stale_version",
  "idempotency_conflict",
  "schedule_in_use",
  "location_unavailable",
  "provider_unavailable",
  "type_unavailable",
  "type_changed",
  "time_unavailable",
  "patient_not_found",
  "patient_archived",
  "provider_conflict",
  "patient_conflict",
  "request_link_conflict",
  "request_already_booked",
  "appointment_in_past",
  "illegal_transition",
  "undo_unavailable",
  "invalid_local_time",
] as const;
export type SchedulingFailureCode = (typeof SCHEDULING_FAILURE_CODES)[number];
export const schedulingFailureSchema = z.object({
  ok: z.literal(false),
  code: z.enum(SCHEDULING_FAILURE_CODES),
  currentVersion: schedulingVersionSchema.optional(),
});
export const schedulingCommandOutcomeSchema = z.union([
  z.object({
    ok: z.literal(true),
    entity: z.enum([...schedulingEntitySchema.options, "appointment"]),
    id: z.uuid(),
    version: schedulingVersionSchema,
  }),
  schedulingFailureSchema,
]);

export const schedulingSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  active: z.boolean(),
  version: schedulingVersionSchema,
  createdAt: schedulingTimestampSchema,
  updatedAt: schedulingTimestampSchema,
});
export const appointmentTypeSchema = schedulingSummarySchema.extend({
  durationMinutes: z.number().int().positive(),
  bufferBeforeMinutes: z.number().int().nonnegative(),
  bufferAfterMinutes: z.number().int().nonnegative(),
});
export const providerScheduleSchema = z.object({
  provider: schedulingSummarySchema,
  hours: z.array(providerHoursSchema),
  exceptions: z.array(providerExceptionSchema),
});
export const appointmentSchema = z.object({
  id: z.uuid(),
  patientId: z.uuid(),
  providerId: z.uuid(),
  locationId: z.uuid(),
  appointmentTypeId: z.uuid(),
  sourceRequestId: z.uuid().nullable(),
  startsAt: schedulingTimestampSchema,
  endsAt: schedulingTimestampSchema,
  durationMinutes: z.number().int().positive(),
  bufferBeforeMinutes: z.number().int().nonnegative(),
  bufferAfterMinutes: z.number().int().nonnegative(),
  reservedFrom: schedulingTimestampSchema,
  reservedUntil: schedulingTimestampSchema,
  status: appointmentStatusSchema,
  reason: z.string().nullable(),
  version: schedulingVersionSchema,
  createdAt: schedulingTimestampSchema,
  updatedAt: schedulingTimestampSchema,
});
export const namedAppointmentSchema = appointmentSchema.extend({
  patientName: z.string(),
  providerName: z.string(),
  locationName: z.string(),
  appointmentTypeName: z.string(),
});
export const schedulingChangeCommandSchema = z.enum([
  "save_provider",
  "save_location",
  "save_appointment_type",
  "book",
  "reschedule",
  "cancel",
  "check_in",
  "complete",
  "no_show",
  "undo",
]);
const snapshotSchema = z.union([
  providerScheduleSchema,
  appointmentTypeSchema,
  appointmentSchema,
  schedulingSummarySchema,
]);
export const schedulingChangeSchema = z.object({
  id: z.uuid(),
  version: schedulingVersionSchema,
  command: schedulingChangeCommandSchema,
  before: snapshotSchema.nullable(),
  after: snapshotSchema,
  compensatesChangeId: z.uuid().nullable(),
  actor: z.object({ id: z.uuid(), email: z.string() }),
  occurredAt: schedulingTimestampSchema,
});
export const schedulingHistorySchema = z.object({
  items: z.array(schedulingChangeSchema),
  total: z.number().int().nonnegative(),
  nextVersion: schedulingVersionSchema.nullable(),
});
const catalogPage = {
  ok: z.literal(true),
  total: z.number().int().nonnegative(),
  next: z.object({ name: z.string(), id: z.uuid() }).nullable(),
};
export const schedulingCatalogOutcomeSchema = z.union([
  z.object({
    ...catalogPage,
    entity: z.enum(["provider", "location"]),
    items: z.array(schedulingSummarySchema),
  }),
  z.object({
    ...catalogPage,
    entity: z.literal("appointment_type"),
    items: z.array(appointmentTypeSchema),
  }),
  schedulingFailureSchema,
]);
export const schedulingConfigReadOutcomeSchema = z.union([
  z.object({
    ok: z.literal(true),
    entity: z.literal("provider"),
    record: providerScheduleSchema,
    history: schedulingHistorySchema,
  }),
  z.object({
    ok: z.literal(true),
    entity: z.literal("location"),
    record: schedulingSummarySchema,
    history: schedulingHistorySchema,
  }),
  z.object({
    ok: z.literal(true),
    entity: z.literal("appointment_type"),
    record: appointmentTypeSchema,
    history: schedulingHistorySchema,
  }),
  schedulingFailureSchema,
]);
export const appointmentListOutcomeSchema = z.union([
  z.object({
    ok: z.literal(true),
    observedAt: schedulingTimestampSchema,
    total: z.number().int().nonnegative(),
    items: z.array(namedAppointmentSchema),
    next: z.object({ startsAt: schedulingTimestampSchema, id: z.uuid() }).nullable(),
  }),
  schedulingFailureSchema,
]);
export const appointmentReadOutcomeSchema = z.union([
  z.object({
    ok: z.literal(true),
    observedAt: schedulingTimestampSchema,
    appointment: namedAppointmentSchema,
    history: schedulingHistorySchema,
    undo: z.object({ changeId: z.uuid(), expiresAt: schedulingTimestampSchema }).nullable(),
  }),
  schedulingFailureSchema,
]);
export const appointmentAvailabilityOutcomeSchema = z.union([
  z.object({
    ok: z.literal(true),
    observedAt: schedulingTimestampSchema,
    date: dateSchema,
    timeZone: z.literal("America/New_York"),
    appointmentTypeId: z.uuid(),
    expectedTypeVersion: schedulingVersionSchema,
    durationMinutes: z.number().int().positive(),
    bufferBeforeMinutes: z.number().int().nonnegative(),
    bufferAfterMinutes: z.number().int().nonnegative(),
    preservesBookedDuration: z.boolean(),
    patientChecked: z.boolean(),
    slots: z.array(
      z.object({
        startsAt: schedulingTimestampSchema,
        endsAt: schedulingTimestampSchema,
        time: appointmentTimeSchema,
      }),
    ),
  }),
  schedulingFailureSchema,
]);

export type SchedulingOutcome =
  | z.output<typeof appointmentAvailabilityOutcomeSchema>
  | z.output<typeof schedulingCommandOutcomeSchema>
  | z.output<typeof schedulingCatalogOutcomeSchema>
  | z.output<typeof schedulingConfigReadOutcomeSchema>
  | z.output<typeof appointmentListOutcomeSchema>
  | z.output<typeof appointmentReadOutcomeSchema>;
