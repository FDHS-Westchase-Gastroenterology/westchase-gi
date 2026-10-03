/* Calendar grid reads: the Schedule's week and day, and each staff member's remembered week
   provider. The month reads stay in read-contracts.ts. */
import { z } from "zod";

import {
  appointmentStatusSchema,
  appointmentTypeIconSchema,
  dateSchema,
  schedulingFailureSchema,
  schedulingTimestampSchema,
  schedulingVersionSchema,
} from "./contracts";

const count = z.number().int().nonnegative();

// The week and day reads share their visit, open-time and reference-type shapes.
const weekAppointmentFields = {
  id: z.uuid(),
  startsAt: schedulingTimestampSchema,
  endsAt: schedulingTimestampSchema,
  status: appointmentStatusSchema.exclude(["cancelled"]),
  appointmentType: z.string(),
  appointmentTypeIcon: appointmentTypeIconSchema,
  patientName: z.string(),
  patientListName: z.string(),
};
const weekAppointmentSchema = z.object(weekAppointmentFields).readonly();
const weekRangeSchema = z
  .object({ from: schedulingTimestampSchema, until: schedulingTimestampSchema })
  .readonly();
const scheduleReferenceTypeSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    durationMinutes: z.number().int().positive(),
    version: schedulingVersionSchema,
  })
  .readonly();
// An open time names the type it fits: the filtered type, or the provider's shortest eligible one.
const scheduleOpenSchema = z
  .object({
    startsAt: schedulingTimestampSchema,
    endsAt: schedulingTimestampSchema,
    locationId: z.uuid(),
    locationName: z.string(),
    type: scheduleReferenceTypeSchema,
  })
  .readonly();
export const weekDaySchema = z
  .object({
    date: dateSchema,
    working: z.array(weekRangeSchema).readonly(),
    appointments: z.array(weekAppointmentSchema).readonly(),
    open: z.array(scheduleOpenSchema).readonly(),
    seen: count.nullable(),
    openCount: count.nullable(),
  })
  .readonly();
export const weekProviderSchema = z
  .object({ id: z.uuid(), name: z.string(), days: z.array(weekDaySchema).length(7).readonly() })
  .readonly();
export const weekScheduleOutcomeSchema = z.union([
  z
    .object({
      ok: z.literal(true),
      observedAt: schedulingTimestampSchema,
      today: dateSchema,
      weekStart: dateSchema,
      timeZone: z.literal("America/New_York"),
      activeProviderCount: count,
      referenceType: scheduleReferenceTypeSchema,
      providers: z.array(weekProviderSchema).min(1).max(3).readonly(),
    })
    .readonly(),
  schedulingFailureSchema,
]);
export type WeekDay = z.output<typeof weekDaySchema>;
export type WeekProvider = z.output<typeof weekProviderSchema>;
export type WeekSchedule = Extract<z.output<typeof weekScheduleOutcomeSchema>, { ok: true }>;

export const weekProviderOutcomeSchema = z.union([
  z
    .object({ ok: z.literal(true), providerId: z.uuid().nullable(), remembered: z.boolean() })
    .readonly(),
  schedulingFailureSchema,
]);
export const rememberWeekProviderOutcomeSchema = z.union([
  z.object({ ok: z.literal(true), providerId: z.uuid() }).readonly(),
  schedulingFailureSchema,
]);

/* The day read: every provider working the date, each location window named, and the visits
   carry their version so the day can check a patient in or undo a booking. */
export const dayProviderSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    bookable: z.boolean(),
    working: z
      .array(
        z
          .object({
            from: schedulingTimestampSchema,
            until: schedulingTimestampSchema,
            locationId: z.uuid(),
            locationName: z.string(),
          })
          .readonly(),
      )
      .readonly(),
    appointments: z
      .array(z.object({ ...weekAppointmentFields, version: schedulingVersionSchema }).readonly())
      .readonly(),
    open: z.array(scheduleOpenSchema).readonly(),
    seen: count.nullable(),
    openCount: count.nullable(),
  })
  .readonly();
export const dayScheduleOutcomeSchema = z.union([
  z
    .object({
      ok: z.literal(true),
      observedAt: schedulingTimestampSchema,
      today: dateSchema,
      date: dateSchema,
      timeZone: z.literal("America/New_York"),
      activeProviderCount: count,
      referenceType: scheduleReferenceTypeSchema,
      providers: z.array(dayProviderSchema).readonly(),
      off: z.array(z.object({ id: z.uuid(), name: z.string() }).readonly()).readonly(),
    })
    .readonly(),
  schedulingFailureSchema,
]);
export type DayProvider = z.output<typeof dayProviderSchema>;
export type DaySchedule = Extract<z.output<typeof dayScheduleOutcomeSchema>, { ok: true }>;
