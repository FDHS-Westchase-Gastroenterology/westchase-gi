"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/portal/auth";
import type { RequestLocation } from "@/lib/portal/contracts";
import { patientForRequest } from "@/lib/portal/patients/register";
import type { SchedulingFailureCode } from "@/lib/portal/scheduling/contracts";
import type { MonthAvailability } from "@/lib/portal/scheduling/read-contracts";
import { executeSchedulingOperation } from "@/lib/portal/scheduling/service";
import { serviceClient } from "@/lib/portal/server";

import { defaultTypeId } from "./card-booking-model";
import type { CardBookCommand, CardType } from "./card-booking-model";

/* The record card books from its own calendar (issue #344): one read for
   the month a linked patient can be booked into — the active appointment
   types and the open starts per provider for the chosen one — and the
   scheduling `book` command carrying the request it came from. Both
   return outcomes rather than throwing, so a throw on the client is only
   ever the transport.

   The Schedule's request record (issue #356) books a person known only by
   their request: its month is read with no patient, and its Book sends no
   patient either. The server then books the patient linked to the request,
   registering the requester from the request row first when there is none
   (lib/portal/patients/register.ts). A request that is gone answers
   `not_found`; a registration that could not be written answers
   `unavailable`, which the card offers to try again. A retry under the
   same key finds the request already linked and books the same patient,
   so the scheduling command it sends is the one the key first carried.

   The patient record's Book another (issue #356) books a known patient
   with no request behind it, the way the Schedule's open time does: the
   command carries the patient and no source request. A command with
   neither is refused as invalid. */

export type CardMonthOutcome =
  | {
      readonly ok: true;
      readonly types: readonly CardType[];
      readonly availability: MonthAvailability;
    }
  | { readonly ok: false; readonly code: SchedulingFailureCode | "no_types" };

export async function readCardMonth(
  input: Readonly<{
    month: string;
    /** Null on the first read: the server picks the default type. */
    appointmentTypeId: string | null;
    location: RequestLocation;
    /** Null for a requester not registered yet: no patient's visits to avoid. */
    patientId: string | null;
  }>,
): Promise<CardMonthOutcome> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  const db = serviceClient();
  const catalog = await executeSchedulingOperation(db, session.id, {
    action: "catalog",
    entity: "appointment_type",
    query: "",
    active: true,
    limit: 50,
  });
  if (!catalog.ok) return { ok: false, code: catalog.code };
  if (!("entity" in catalog) || catalog.entity !== "appointment_type" || !("items" in catalog))
    return { ok: false, code: "unavailable" };
  // The catalog reads alphabetically; staff see types in the order Settings gives them.
  const types = catalog.items
    .toSorted(
      (a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER),
    )
    .map((item) => ({ id: item.id, name: item.name }));
  const typeId =
    input.appointmentTypeId !== null && types.some((type) => type.id === input.appointmentTypeId)
      ? input.appointmentTypeId
      : defaultTypeId(types);
  if (typeId === null) return { ok: false, code: "no_types" };
  const availability = await executeSchedulingOperation(db, session.id, {
    action: "month_availability",
    month: input.month,
    appointmentTypeId: typeId,
    location: input.location,
    patientId: input.patientId,
  });
  if (!availability.ok) return { ok: false, code: availability.code };
  if (!("providers" in availability) || !("month" in availability))
    return { ok: false, code: "unavailable" };
  return { ok: true, types, availability };
}

export type CardBookOutcome =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: SchedulingFailureCode };

export async function bookFromCard(
  input: Readonly<{ idempotencyKey: string; command: CardBookCommand }>,
): Promise<CardBookOutcome> {
  const session = await requireRole("staff", { unauthenticated: "throw" });
  const db = serviceClient();
  const { sourceRequestId } = input.command;
  let { patientId } = input.command;
  if (patientId === null) {
    if (sourceRequestId === null) return { ok: false, code: "invalid_command" };
    const patient = await patientForRequest(db, session.id, sourceRequestId);
    if (!patient.ok)
      return {
        ok: false,
        code: patient.code === "request_not_found" ? "not_found" : "unavailable",
      };
    patientId = patient.patientId;
  }
  const outcome = await executeSchedulingOperation(db, session.id, {
    action: "command",
    idempotencyKey: input.idempotencyKey,
    command: { kind: "book", ...input.command, patientId },
  });
  if (!outcome.ok) return { ok: false, code: outcome.code };
  revalidatePath("/admin");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/requests");
  if (sourceRequestId !== null) revalidatePath(`/admin/requests/${sourceRequestId}`);
  return { ok: true };
}
