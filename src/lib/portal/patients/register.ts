import "server-only";

import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { isMailbox } from "@/lib/portal/contracts";

import { executePatientCommand } from "./commands";

/* The patient a request is booked for (issue #356). Booking needs a
   patient linked to the request it came from; a person known only by
   their request becomes one as staff book them. The request already linked
   keeps its patient. Otherwise the requester is registered from the
   request row itself — its name, its phone when the number has ten digits,
   its email when it is a mailbox — and linked to it in the same patient
   command. Nothing about the person comes from the caller. When another
   desk linked the request first, that link wins and is the answer. */

export type RequestPatientOutcome =
  | { readonly ok: true; readonly patientId: string }
  | { readonly ok: false; readonly code: "request_not_found" | "unavailable" };

const requestRow = z.object({
  name: z.string(),
  phone: z.string(),
  /* A caller who gave no email has none on the request. */
  email: z.string().nullable(),
  patient_request_links: z.object({ patient_id: z.uuid() }).nullable(),
});

type RequestRow = z.infer<typeof requestRow>;

/** The request row, null when there is none, or undefined when it could not be read. */
async function readRequest(
  db: SupabaseClient,
  requestId: string,
): Promise<RequestRow | null | undefined> {
  const result = await db
    .from("requests")
    .select("name, phone, email, patient_request_links(patient_id)")
    .eq("id", requestId)
    .abortSignal(AbortSignal.timeout(10_000))
    .maybeSingle();
  if (result.error !== null) return undefined;
  if (result.data === null) return null;
  const row = requestRow.safeParse(result.data);
  return row.success ? row.data : undefined;
}

/** The phone a patient record accepts: ten digits or more, else none. */
function patientPhone(phone: string): string | null {
  const trimmed = phone.trim();
  return trimmed.replace(/\D/g, "").length >= 10 ? trimmed : null;
}

function patientEmail(email: string | null): string | null {
  const trimmed = email?.trim() ?? "";
  return isMailbox(trimmed) ? trimmed : null;
}

export async function patientForRequest(
  db: SupabaseClient,
  actorId: string,
  requestId: string,
): Promise<RequestPatientOutcome> {
  const row = await readRequest(db, requestId);
  if (row === undefined) return { ok: false, code: "unavailable" };
  if (row === null) return { ok: false, code: "request_not_found" };
  const linked = row.patient_request_links?.patient_id;
  if (linked !== undefined) return { ok: true, patientId: linked };
  const created = await executePatientCommand(db, actorId, {
    idempotencyKey: randomUUID(),
    command: {
      kind: "create",
      patient: {
        name: row.name.trim(),
        phone: patientPhone(row.phone),
        email: patientEmail(row.email),
      },
      requestId,
    },
  });
  if (created.ok) return { ok: true, patientId: created.patientId };
  if (created.code === "request_link_conflict") {
    const again = await readRequest(db, requestId);
    const winner = again?.patient_request_links?.patient_id;
    return winner === undefined
      ? { ok: false, code: "unavailable" }
      : { ok: true, patientId: winner };
  }
  if (created.code === "request_not_found") return { ok: false, code: "request_not_found" };
  return { ok: false, code: "unavailable" };
}
