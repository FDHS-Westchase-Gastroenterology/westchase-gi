"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { HomeLine } from "@/app/admin/(portal)/(home)/home-line";
import { lineFor } from "@/app/admin/(portal)/(home)/home-line-for";
import { fetchWorkedRow } from "@/app/admin/(portal)/requests/queue";
import { requireRole } from "@/lib/portal/auth";
import type { ClinicalOutcome } from "@/lib/portal/clinical/contracts";
import { executeClinicalOperation } from "@/lib/portal/clinical/service";
import type { FoundPerson, PatientSummary, PatientVisit } from "@/lib/portal/patients/contracts";
import { findPeople, readPatient, searchPatients } from "@/lib/portal/patients/reads";
import type { SchedulingFailureCode, SchedulingOutcome } from "@/lib/portal/scheduling/contracts";
import type { PlacementRefusal } from "@/lib/portal/scheduling/grid-contracts";
import {
  executeSchedulingOperation,
  readSchedulingSettings,
} from "@/lib/portal/scheduling/service";
import { serviceClient } from "@/lib/portal/server";
import { fetchStaffNameMap } from "@/lib/portal/staff-identity";

import type {
  WeekAppointmentCommand,
  WeekAppointmentDetail,
  OpenTimeType,
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

/** The request a request-linked command moved: where it went, which the
   cancel toast says, and its new version, which that command's Undo sends. */
export interface WeekCommandRequest {
  readonly state: string;
  readonly version: number;
  readonly callAgainAt: string | null;
}

/** A command that lands names the appointment and its new version, which
   is what Undo sends back. */
export type WeekCommandOutcome =
  | {
      readonly ok: true;
      readonly id: string;
      readonly version: number;
      readonly request: WeekCommandRequest | null;
    }
  | Failure;

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the scheduling outcome is the service's zod output, whose nested members cannot be made readonly
function landed(outcome: SchedulingOutcome): WeekCommandOutcome {
  if (!outcome.ok) return { ok: false, code: outcome.code };
  if (!("version" in outcome) || !("entity" in outcome)) return { ok: false, code: "unavailable" };
  changed();
  const { request } = outcome;
  return {
    ok: true,
    id: outcome.id,
    version: outcome.version,
    request:
      request === undefined
        ? null
        : { state: request.state, version: request.version, callAgainAt: request.callAgainAt },
  };
}

export async function weekAppointmentCommand(
  input: Readonly<{ idempotencyKey: string; command: WeekAppointmentCommand }>,
): Promise<WeekCommandOutcome> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  const outcome = await executeSchedulingOperation(serviceClient(), session.id, {
    action: "command",
    idempotencyKey: input.idempotencyKey,
    command: input.command,
  });
  return landed(outcome);
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

export type OpenTimeTypesOutcome =
  | { readonly ok: true; readonly types: readonly OpenTimeType[] }
  | { readonly ok: false };

/** The visit types a provider takes, for the open-time card's choice. Only
   the types leave the settings read: it also carries patient names. */
export async function readOpenTimeTypes(providerId: string): Promise<OpenTimeTypesOutcome> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  const settings = await readSchedulingSettings(serviceClient(), session.id);
  if (!settings.ok) return { ok: false };
  return {
    ok: true,
    types: settings.types
      .filter((type) => type.active && type.providerIds.includes(providerId))
      .toSorted((a, b) => a.sortOrder - b.sortOrder)
      .map((type) => ({
        id: type.id,
        name: type.name,
        icon: type.icon,
        durationMinutes: type.durationMinutes,
        version: type.version,
      })),
  };
}

export type OpenTimeFitOutcome =
  | {
      readonly ok: true;
      readonly fits: boolean;
      readonly endsAt: string | null;
      readonly expectedTypeVersion: number;
      readonly next: { readonly startsAt: string; readonly time: string } | null;
    }
  | Failure;

/** Whether one open start still fits a chosen visit type, and when it
   ends; when it does not, the next start that does. */
export async function readOpenTimeFit(
  input: Readonly<{
    providerId: string;
    locationId: string;
    date: string;
    appointmentTypeId: string;
    startsAt: string;
  }>,
): Promise<OpenTimeFitOutcome> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  const read = await executeSchedulingOperation(serviceClient(), session.id, {
    action: "availability",
    providerId: input.providerId,
    locationId: input.locationId,
    date: input.date,
    appointmentTypeId: input.appointmentTypeId,
    patientId: null,
    appointmentId: null,
    intervalMinutes: 15,
  });
  if (!read.ok) return { ok: false, code: read.code };
  if (!("slots" in read)) return { ok: false, code: "unavailable" };
  const match = read.slots.find((slot) => slot.startsAt === input.startsAt);
  const next = read.slots.find((slot) => slot.startsAt > input.startsAt);
  return {
    ok: true,
    fits: match !== undefined,
    endsAt: match?.endsAt ?? null,
    expectedTypeVersion: read.expectedTypeVersion,
    next: next === undefined ? null : { startsAt: next.startsAt, time: next.time },
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

export type SchedulePeopleOutcome =
  | {
      readonly ok: true;
      /** False on the portal's first day: no patient and no open request at all. */
      readonly anyone: boolean;
      readonly total: number;
      readonly people: readonly FoundPerson[];
    }
  | { readonly ok: false };

/** The Schedule's search (issue #356): patients and open requests by any
   word of the name or the digits of the phone. A POST, so the query stays
   out of addresses and logs; nothing here records it. An empty query only
   says whether anyone exists yet. */
export async function findSchedulePeople(query: string): Promise<SchedulePeopleOutcome> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  const outcome = await findPeople(serviceClient(), session.id, { query, limit: 20 });
  if (!outcome.ok) return { ok: false };
  return { ok: true, anyone: outcome.anyone, total: outcome.total, people: outcome.people };
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
  return landed(outcome);
}

/** Undo the appointment's latest change: the server reverts it only while
   it is still the latest and under 15 minutes old, and otherwise refuses
   with undo_unavailable. */
export async function undoAppointmentChange(
  input: Readonly<{
    idempotencyKey: string;
    id: string;
    expectedVersion: number;
    requestVersion?: number | null;
  }>,
): Promise<WeekCommandOutcome> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  const outcome = await executeSchedulingOperation(serviceClient(), session.id, {
    action: "command",
    idempotencyKey: input.idempotencyKey,
    command: {
      kind: "undo",
      id: input.id,
      expectedVersion: input.expectedVersion,
      requestVersion: input.requestVersion ?? null,
    },
  });
  return landed(outcome);
}

/** The line the full-record sheet opens with for an appointment's request,
   built the way Home builds its rows; null when the request is gone or the
   read failed, and the card says so. The id may come from the address
   (`?request=`), so anything that isn't one is no record. */
export async function readWeekRecordLine(requestId: string): Promise<HomeLine | null> {
  await requireRole("staff", { unauthenticated: "throw" });
  if (!z.uuid().safeParse(requestId).success) return null;
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

/** A clinical record as the patient record's Clinical and Documents tabs list it. */
export interface ScheduleClinicalItem {
  readonly id: string;
  readonly title: string;
  readonly serviceDate: string | null;
  readonly status: "draft" | "signed" | "entered_in_error";
}

/** One clinical list: its records, or why there are none to show. */
export type ScheduleClinicalList =
  | { readonly ok: true; readonly total: number; readonly items: readonly ScheduleClinicalItem[] }
  | { readonly ok: false; readonly forbidden: boolean };

export interface SchedulePatientRecord {
  readonly patient: PatientSummary;
  /** Every visit but the cancelled ones, latest first. */
  readonly visits: readonly PatientVisit[];
  /** The patient's latest linked request, as Home's line; null when none is linked. */
  readonly requestLine: HomeLine | null;
  readonly requestTotal: number;
  readonly notes: ScheduleClinicalList;
  readonly documents: ScheduleClinicalList;
}

export type SchedulePatientOutcome =
  | { readonly ok: true; readonly record: SchedulePatientRecord }
  | { readonly ok: false; readonly code: "not_found" | "unavailable" };

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the clinical outcome carries record rows whose nested types cannot be made readonly
function clinicalList(outcome: ClinicalOutcome): ScheduleClinicalList {
  if (!outcome.ok) return { ok: false, forbidden: outcome.code === "forbidden" };
  if (!("records" in outcome)) return { ok: false, forbidden: false };
  return {
    ok: true,
    total: outcome.total,
    items: outcome.records.map((record) => ({
      id: record.id,
      title: record.title,
      serviceDate: record.serviceDate,
      status: record.status,
    })),
  };
}

/** The Schedule's patient record (issue #356): the patient, their visits,
   the latest request linked to them as the line Home's sheet reads, and
   their clinical notes and documents, read-only. The id may come from the
   address (`?patient=`), so anything that isn't one is no record. */
export async function readSchedulePatient(patientId: string): Promise<SchedulePatientOutcome> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  if (!z.uuid().safeParse(patientId).success) return { ok: false, code: "not_found" };
  const db = serviceClient();
  const clinical = async (kind: "note" | "document_reference"): Promise<ClinicalOutcome> => {
    try {
      return await executeClinicalOperation(db, session.id, {
        action: "list",
        patientId,
        query: "",
        status: null,
        kind,
        limit: 50,
        after: null,
      });
    } catch {
      return { ok: false, code: "unavailable" };
    }
  };
  try {
    const [read, notes, documents] = await Promise.all([
      readPatient(db, session.id, { patientId, historyBefore: null, linksAfter: null }),
      clinical("note"),
      clinical("document_reference"),
    ]);
    if (!read.ok)
      return { ok: false, code: read.code === "not_found" ? "not_found" : "unavailable" };
    const latest = read.requests.items.reduce<(typeof read.requests.items)[number] | null>(
      (best, link) => (best === null || link.receivedAt > best.receivedAt ? link : best),
      null,
    );
    const now = new Date();
    let requestLine: HomeLine | null = null;
    if (latest !== null) {
      const [row, names] = await Promise.all([
        fetchWorkedRow(db, latest.requestId, now),
        fetchStaffNameMap(db),
      ]);
      requestLine = row === null ? null : lineFor(row, now, names);
    }
    return {
      ok: true,
      record: {
        patient: read.patient,
        visits: read.appointments.items,
        requestLine,
        requestTotal: read.requests.total,
        notes: clinicalList(notes),
        documents: clinicalList(documents),
      },
    };
  } catch {
    return { ok: false, code: "unavailable" };
  }
}

export type CanPlaceAnswer =
  | { readonly ok: true; readonly placeable: true }
  | {
      readonly ok: true;
      readonly placeable: false;
      readonly refusal: PlacementRefusal;
      /** The appointment already holding the time, when the refusal is slot_booked. */
      readonly conflictId: string | null;
    }
  | Failure;

/** Whether a dragged appointment can land on one provider, location and
   start. The Day view asks once per destination while the card is over it;
   Reschedule still checks every rule when the card drops. */
export async function canPlaceAppointment(
  input: Readonly<{
    appointmentId: string;
    providerId: string;
    locationId: string;
    startsAt: string;
  }>,
): Promise<CanPlaceAnswer> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  const read = await executeSchedulingOperation(serviceClient(), session.id, {
    action: "can_place",
    ...input,
  });
  if (!read.ok) return { ok: false, code: read.code };
  if (!("placeable" in read)) return { ok: false, code: "unavailable" };
  return read.placeable
    ? { ok: true, placeable: true }
    : { ok: true, placeable: false, refusal: read.refusal, conflictId: read.conflictId ?? null };
}
