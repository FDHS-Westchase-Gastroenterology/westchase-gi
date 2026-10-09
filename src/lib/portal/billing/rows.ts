import { z } from "zod";

import { billingFailureSchema, billingReadOutcomeSchema } from "./contracts";

const entryDatabaseSchema = z.object({
  id: z.uuid(),
  patient_id: z.uuid(),
  appointment_id: z.uuid().nullable(),
  kind: z.string(),
  amount_cents: z.number(),
  resulting_balance_cents: z.number(),
  version: z.number(),
  description: z.string(),
  service_date: z.string().nullable(),
  payment_method: z.string().nullable(),
  external_reference: z.string().nullable(),
  source_entry_id: z.uuid().nullable(),
  reversed_by: z.uuid().nullable(),
  actor_id: z.uuid(),
  actor_email: z.string(),
  occurred_at: z.string(),
});

export const billingReadDatabaseSchema = z
  .union([
    z.object({
      ok: z.literal(true),
      patientId: z.uuid(),
      currency: z.literal("USD"),
      balanceCents: z.number(),
      version: z.number(),
      entries: z.object({
        items: z.array(entryDatabaseSchema),
        total: z.number(),
        nextVersion: z.number().nullable(),
      }),
    }),
    billingFailureSchema,
  ])
  .transform((result) => {
    if (!result.ok) return result;
    return {
      ...result,
      entries: {
        ...result.entries,
        items: result.entries.items.map((entry) => ({
          id: entry.id,
          patientId: entry.patient_id,
          appointmentId: entry.appointment_id,
          kind: entry.kind,
          amountCents: entry.amount_cents,
          resultingBalanceCents: entry.resulting_balance_cents,
          version: entry.version,
          description: entry.description,
          serviceDate: entry.service_date,
          method: entry.payment_method,
          externalReference: entry.external_reference,
          sourceEntryId: entry.source_entry_id,
          reversedBy: entry.reversed_by,
          actor: { id: entry.actor_id, email: entry.actor_email },
          occurredAt: entry.occurred_at,
        })),
      },
    };
  })
  .pipe(billingReadOutcomeSchema);
