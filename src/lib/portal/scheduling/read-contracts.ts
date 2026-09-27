import { z } from "zod";

import {
  appointmentStatusSchema,
  providerExceptionSchema,
  providerHoursSchema,
  schedulingFailureSchema,
  schedulingRequestSchema,
  schedulingTimestampSchema,
  schedulingVersionSchema,
  dateSchema,
} from "./contracts";
import { appointmentTimeSchema } from "./time";

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
  requestWorkflowManaged: z.boolean(),
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
  requestChange: z
    .object({
      requestId: z.uuid().nullable(),
      before: schedulingRequestSchema.omit({ id: true, version: true }),
      afterVersion: schedulingVersionSchema,
      transitionId: z.uuid().nullable(),
    })
    .nullable(),
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
    request: schedulingRequestSchema.nullable(),
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
