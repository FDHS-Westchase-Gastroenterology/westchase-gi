import "server-only";

import { z } from "zod";

import {
  appointmentStatusSchema,
  providerExceptionSchema,
  providerHoursSchema,
  schedulingFailureSchema,
  schedulingRequestSchema,
  schedulingTimestampSchema,
  schedulingVersionSchema,
} from "./contracts";
import {
  appointmentListOutcomeSchema,
  appointmentReadOutcomeSchema,
  schedulingCatalogOutcomeSchema,
  schedulingChangeCommandSchema,
  schedulingConfigReadOutcomeSchema,
} from "./read-contracts";

const summaryRow = z.object({
  id: z.uuid(),
  name: z.string(),
  active: z.boolean(),
  version: schedulingVersionSchema,
  created_at: schedulingTimestampSchema,
  updated_at: schedulingTimestampSchema,
});
function summary(row: Readonly<z.infer<typeof summaryRow>>) {
  return {
    id: row.id,
    name: row.name,
    active: row.active,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
const summaryDatabaseSchema = summaryRow.transform(summary);
const typeDatabaseSchema = summaryRow
  .extend({
    duration_minutes: z.number().int().positive(),
    buffer_before_minutes: z.number().int().nonnegative(),
    buffer_after_minutes: z.number().int().nonnegative(),
  })
  .transform((row) => ({
    ...summary(row),
    durationMinutes: row.duration_minutes,
    bufferBeforeMinutes: row.buffer_before_minutes,
    bufferAfterMinutes: row.buffer_after_minutes,
  }));
const providerDatabaseSchema = z.object({
  provider: summaryDatabaseSchema,
  hours: z.array(providerHoursSchema),
  exceptions: z.array(providerExceptionSchema),
});
const appointmentRow = z.object({
  id: z.uuid(),
  patient_id: z.uuid(),
  provider_id: z.uuid(),
  location_id: z.uuid(),
  appointment_type_id: z.uuid(),
  source_request_id: z.uuid().nullable(),
  request_workflow_managed: z.boolean().default(false),
  starts_at: schedulingTimestampSchema,
  ends_at: schedulingTimestampSchema,
  duration_minutes: z.number().int().positive(),
  buffer_before_minutes: z.number().int().nonnegative(),
  buffer_after_minutes: z.number().int().nonnegative(),
  reserved_from: schedulingTimestampSchema,
  reserved_until: schedulingTimestampSchema,
  status: appointmentStatusSchema,
  reason: z.string().nullable(),
  version: schedulingVersionSchema,
  created_at: schedulingTimestampSchema,
  updated_at: schedulingTimestampSchema,
});
function appointment(row: Readonly<z.infer<typeof appointmentRow>>) {
  return {
    id: row.id,
    patientId: row.patient_id,
    providerId: row.provider_id,
    locationId: row.location_id,
    appointmentTypeId: row.appointment_type_id,
    sourceRequestId: row.source_request_id,
    requestWorkflowManaged: row.request_workflow_managed,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    durationMinutes: row.duration_minutes,
    bufferBeforeMinutes: row.buffer_before_minutes,
    bufferAfterMinutes: row.buffer_after_minutes,
    reservedFrom: row.reserved_from,
    reservedUntil: row.reserved_until,
    status: row.status,
    reason: row.reason,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
const appointmentDatabaseSchema = appointmentRow.transform(appointment);
const namedAppointmentDatabaseSchema = appointmentRow
  .extend({
    patient_name: z.string(),
    provider_name: z.string(),
    location_name: z.string(),
    appointment_type_name: z.string(),
  })
  .transform((row) => ({
    ...appointment(row),
    patientName: row.patient_name,
    providerName: row.provider_name,
    locationName: row.location_name,
    appointmentTypeName: row.appointment_type_name,
  }));
const changeFields = {
  id: z.uuid(),
  version: schedulingVersionSchema,
  command: schedulingChangeCommandSchema,
  compensates_change_id: z.uuid().nullable(),
  actor_id: z.uuid(),
  actor_email: z.string(),
  occurred_at: schedulingTimestampSchema,
  request_id: z.uuid().nullable().default(null),
  request_before: schedulingRequestSchema
    .omit({ id: true, version: true })
    .nullable()
    .default(null),
  request_after_version: schedulingVersionSchema.nullable().default(null),
  request_transition_id: z.uuid().nullable().default(null),
};
const changeDatabaseSchema = z
  .discriminatedUnion("entity", [
    z.object({
      ...changeFields,
      entity: z.literal("provider"),
      before_record: providerDatabaseSchema.nullable(),
      after_record: providerDatabaseSchema,
    }),
    z.object({
      ...changeFields,
      entity: z.literal("location"),
      before_record: summaryDatabaseSchema.nullable(),
      after_record: summaryDatabaseSchema,
    }),
    z.object({
      ...changeFields,
      entity: z.literal("appointment_type"),
      before_record: typeDatabaseSchema.nullable(),
      after_record: typeDatabaseSchema,
    }),
    z.object({
      ...changeFields,
      entity: z.literal("appointment"),
      before_record: appointmentDatabaseSchema.nullable(),
      after_record: appointmentDatabaseSchema,
    }),
  ])
  .transform((row) => ({
    id: row.id,
    version: row.version,
    command: row.command,
    before: row.before_record,
    after: row.after_record,
    compensatesChangeId: row.compensates_change_id,
    actor: { id: row.actor_id, email: row.actor_email },
    occurredAt: row.occurred_at,
    requestChange:
      row.request_before !== null && row.request_after_version !== null
        ? {
            requestId: row.request_id,
            before: row.request_before,
            afterVersion: row.request_after_version,
            transitionId: row.request_transition_id,
          }
        : null,
  }));
const historyDatabaseSchema = z.object({
  items: z.array(changeDatabaseSchema),
  total: z.number().int().nonnegative(),
  nextVersion: schedulingVersionSchema.nullable(),
});
const catalogFields = {
  ok: z.literal(true),
  total: z.number().int().nonnegative(),
  next: z.object({ name: z.string(), id: z.uuid() }).nullable(),
};
export const schedulingCatalogDatabaseSchema = z
  .union([
    z.object({
      ...catalogFields,
      entity: z.enum(["provider", "location"]),
      items: z.array(summaryDatabaseSchema),
    }),
    z.object({
      ...catalogFields,
      entity: z.literal("appointment_type"),
      items: z.array(typeDatabaseSchema),
    }),
    schedulingFailureSchema,
  ])
  .pipe(schedulingCatalogOutcomeSchema);
export const schedulingConfigDatabaseSchema = z
  .union([
    z.object({
      ok: z.literal(true),
      entity: z.literal("provider"),
      record: providerDatabaseSchema,
      history: historyDatabaseSchema,
    }),
    z.object({
      ok: z.literal(true),
      entity: z.literal("location"),
      record: summaryDatabaseSchema,
      history: historyDatabaseSchema,
    }),
    z.object({
      ok: z.literal(true),
      entity: z.literal("appointment_type"),
      record: typeDatabaseSchema,
      history: historyDatabaseSchema,
    }),
    schedulingFailureSchema,
  ])
  .pipe(schedulingConfigReadOutcomeSchema);
export const appointmentListDatabaseSchema = z
  .union([
    z.object({
      ok: z.literal(true),
      observedAt: schedulingTimestampSchema,
      total: z.number().int().nonnegative(),
      items: z.array(namedAppointmentDatabaseSchema),
      next: z.object({ startsAt: schedulingTimestampSchema, id: z.uuid() }).nullable(),
    }),
    schedulingFailureSchema,
  ])
  .pipe(appointmentListOutcomeSchema);
export const appointmentReadDatabaseSchema = z
  .union([
    z.object({
      ok: z.literal(true),
      observedAt: schedulingTimestampSchema,
      appointment: namedAppointmentDatabaseSchema,
      request: schedulingRequestSchema.nullable().default(null),
      history: historyDatabaseSchema,
      undo: z.object({ changeId: z.uuid(), expiresAt: schedulingTimestampSchema }).nullable(),
    }),
    schedulingFailureSchema,
  ])
  .pipe(appointmentReadOutcomeSchema);
