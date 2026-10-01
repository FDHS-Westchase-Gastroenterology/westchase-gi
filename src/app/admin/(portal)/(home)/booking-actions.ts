"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/portal/auth";
import type { RequestLocation } from "@/lib/portal/contracts";
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
   ever the transport. */

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
    patientId: string;
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
  const types = catalog.items.map((item) => ({ id: item.id, name: item.name }));
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
  const outcome = await executeSchedulingOperation(serviceClient(), session.id, {
    action: "command",
    idempotencyKey: input.idempotencyKey,
    command: { kind: "book", ...input.command },
  });
  if (!outcome.ok) return { ok: false, code: outcome.code };
  revalidatePath("/admin");
  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${input.command.sourceRequestId}`);
  return { ok: true };
}
