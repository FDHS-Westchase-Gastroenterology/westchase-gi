"use server";

import { revalidatePath } from "next/cache";

import type { HomeLine } from "@/app/admin/(portal)/(home)/home-line";
import { lineFor } from "@/app/admin/(portal)/(home)/home-line-for";
import { fetchWorkedRow } from "@/app/admin/(portal)/requests/queue";
import { requireRole } from "@/lib/portal/auth";
import { searchPatients } from "@/lib/portal/patients/reads";
import type { SchedulingFailureCode } from "@/lib/portal/scheduling/contracts";
import { executeSchedulingOperation } from "@/lib/portal/scheduling/service";
import { serviceClient } from "@/lib/portal/server";
import { fetchStaffNameMap } from "@/lib/portal/staff-identity";

import type {
  WeekAppointmentCommand,
  WeekAppointmentDetail,
  WeekBookCommand,
  WeekPatient,
  WeekRescheduleTimes,
} from "./week-card-model";

/* The week view's server side (issue #345): the remembered provider, the
   appointment card's read and commands, the open-time card's patient
   search and booking, Reschedule's day of starts, and the line the
   full-record sheet opens with. Each returns an outcome rather than
   throwing, so a throw on the client is only ever the transport. Every
   one goes through the scheduling service, which checks the actor and
   re-checks every start. */

interface Failure {
  readonly ok: false;
  readonly code: SchedulingFailureCode;
}

function changed() {
  revalidatePath("/admin/schedule");
  revalidatePath("/admin");
  revalidatePath("/admin/requests");
}

/** Remember the single provider staff last picked. A failed write never
   blocks the view: the next visit falls back to the first active one. */
export async function rememberWeekProvider(providerId: string): Promise<{ readonly ok: boolean }> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  const outcome = await executeSchedulingOperation(serviceClient(), session.id, {
    action: "remember_week_provider",
    providerId,
  });
  return { ok: outcome.ok };
}

export type WeekAppointmentOutcome =
  | { readonly ok: true; readonly detail: WeekAppointmentDetail }
  | Failure;

export async function readWeekAppointment(id: string): Promise<WeekAppointmentOutcome> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  const read = await executeSchedulingOperation(serviceClient(), session.id, {
    action: "read_appointment",
    id,
    historyBefore: null,
  });
  if (!read.ok) return { ok: false, code: read.code };
  if (!("appointment" in read)) return { ok: false, code: "unavailable" };
  const { appointment, request } = read;
  return {
    ok: true,
    detail: {
      observedAt: read.observedAt,
      id: appointment.id,
      version: appointment.version,
      patientId: appointment.patientId,
      providerId: appointment.providerId,
      locationId: appointment.locationId,
      appointmentTypeId: appointment.appointmentTypeId,
      sourceRequestId: appointment.sourceRequestId,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      status: appointment.status,
      patientName: appointment.patientName,
      providerName: appointment.providerName,
      locationName: appointment.locationName,
      appointmentTypeName: appointment.appointmentTypeName,
      patientPhone: appointment.patientPhone,
      /* The request moves with the appointment only while the workflow
         manages it; then a reschedule or cancel carries its version. */
      requestVersion:
        appointment.requestWorkflowManaged && request !== null ? request.version : null,
    },
  };
}

export type WeekCommandOutcome = { readonly ok: true } | Failure;

export async function weekAppointmentCommand(
  input: Readonly<{ idempotencyKey: string; command: WeekAppointmentCommand }>,
): Promise<WeekCommandOutcome> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  const outcome = await executeSchedulingOperation(serviceClient(), session.id, {
    action: "command",
    idempotencyKey: input.idempotencyKey,
    command: input.command,
  });
  if (!outcome.ok) return { ok: false, code: outcome.code };
  changed();
  return { ok: true };
}

export type WeekRescheduleOutcome =
  | { readonly ok: true; readonly times: WeekRescheduleTimes }
  | Failure;

/** One day's open starts for moving an appointment: its own provider and
   office, keeping its booked duration. */
export async function readRescheduleTimes(
  input: Readonly<{ appointmentId: string; providerId: string; locationId: string; date: string }>,
): Promise<WeekRescheduleOutcome> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  const read = await executeSchedulingOperation(serviceClient(), session.id, {
    action: "availability",
    providerId: input.providerId,
    locationId: input.locationId,
    date: input.date,
    appointmentTypeId: null,
    patientId: null,
    appointmentId: input.appointmentId,
    intervalMinutes: 15,
  });
  if (!read.ok) return { ok: false, code: read.code };
  if (!("slots" in read)) return { ok: false, code: "unavailable" };
  return {
    ok: true,
    times: {
      date: read.date,
      slots: read.slots.map((slot) => ({ startsAt: slot.startsAt, time: slot.time })),
    },
  };
}

export type WeekPatientSearchOutcome =
  | { readonly ok: true; readonly patients: readonly WeekPatient[] }
  | { readonly ok: false };

export async function searchWeekPatients(query: string): Promise<WeekPatientSearchOutcome> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  const outcome = await searchPatients(serviceClient(), session.id, {
    query,
    archived: false,
    limit: 8,
    after: null,
  });
  if (!outcome.ok) return { ok: false };
  return {
    ok: true,
    patients: outcome.patients.map((patient) => ({
      id: patient.id,
      name: patient.name,
      dateOfBirth: patient.dateOfBirth,
    })),
  };
}

export async function bookOpenTime(
  input: Readonly<{ idempotencyKey: string; command: WeekBookCommand }>,
): Promise<WeekCommandOutcome> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  const outcome = await executeSchedulingOperation(serviceClient(), session.id, {
    action: "command",
    idempotencyKey: input.idempotencyKey,
    command: { kind: "book", ...input.command, sourceRequestId: null, requestVersion: null },
  });
  if (!outcome.ok) return { ok: false, code: outcome.code };
  changed();
  return { ok: true };
}

/** The line the full-record sheet opens with for an appointment's request,
   built the way Home builds its rows; null when the request is gone or the
   read failed, and the card says so. */
export async function readWeekRecordLine(requestId: string): Promise<HomeLine | null> {
  await requireRole("staff", { unauthenticated: "throw" });
  const db = serviceClient();
  const now = new Date();
  try {
    const [row, names] = await Promise.all([
      fetchWorkedRow(db, requestId, now),
      fetchStaffNameMap(db),
    ]);
    return row === null ? null : lineFor(row, now, names);
  } catch {
    return null;
  }
}
