import { z } from "zod";

const versionSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const entryVersionSchema = versionSchema.refine((version) => version > 0);
const centsSchema = z.number().int().min(-Number.MAX_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER);
const positiveCentsSchema = centsSchema.refine((amount) => amount > 0);
const paymentMethodSchema = z.enum(["cash", "check", "card", "transfer", "external", "other"]);
const referenceSchema = z.string().trim().min(1).max(120).nullable().default(null);
const existingAccount = {
  patientId: z.uuid(),
  expectedVersion: versionSchema,
  description: z.string().trim().min(1).max(500),
};
const optionalAssociation = {
  appointmentId: z.uuid().nullable().default(null),
  externalReference: referenceSchema,
};

export const billingCommandSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("charge"),
    ...existingAccount,
    ...optionalAssociation,
    amountCents: positiveCentsSchema,
    serviceDate: z.iso.date().refine((date) => !date.startsWith("0000-")),
  }),
  z.strictObject({
    kind: z.literal("payment"),
    ...existingAccount,
    ...optionalAssociation,
    amountCents: positiveCentsSchema,
    method: paymentMethodSchema,
  }),
  z.strictObject({
    kind: z.literal("adjustment"),
    ...existingAccount,
    ...optionalAssociation,
    amountCents: centsSchema.refine((amount) => amount !== 0),
  }),
  z.strictObject({
    kind: z.literal("refund"),
    ...existingAccount,
    amountCents: positiveCentsSchema,
    paymentId: z.uuid(),
    externalReference: referenceSchema,
  }),
  z.strictObject({ kind: z.literal("reverse"), ...existingAccount, entryId: z.uuid() }),
]);

export const billingInputSchema = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("command"),
    idempotencyKey: z.uuid(),
    command: billingCommandSchema,
  }),
  z.strictObject({
    action: z.literal("read"),
    patientId: z.uuid(),
    beforeVersion: entryVersionSchema.nullable().default(null),
  }),
]);
export type BillingInput = z.input<typeof billingInputSchema>;

export const BILLING_FAILURE_CODES = [
  "invalid_command",
  "unauthorized",
  "forbidden",
  "patient_not_found",
  "appointment_patient_mismatch",
  "entry_not_found",
  "entry_reversed",
  "payment_has_refunds",
  "refund_exceeds_payment",
  "amount_out_of_range",
  "stale_version",
  "idempotency_conflict",
  "unavailable",
] as const;
export type BillingFailureCode = (typeof BILLING_FAILURE_CODES)[number];
export const billingFailureSchema = z.object({
  ok: z.literal(false),
  code: z.enum(BILLING_FAILURE_CODES),
  currentVersion: versionSchema.optional(),
});

export const billingCommandOutcomeSchema = z.union([
  z.object({
    ok: z.literal(true),
    patientId: z.uuid(),
    entryId: z.uuid(),
    version: entryVersionSchema,
  }),
  billingFailureSchema,
]);

export const billingEntrySchema = z.object({
  id: z.uuid(),
  patientId: z.uuid(),
  appointmentId: z.uuid().nullable(),
  kind: z.enum(["charge", "payment", "refund", "adjustment", "reversal"]),
  amountCents: centsSchema,
  resultingBalanceCents: centsSchema,
  version: entryVersionSchema,
  description: z.string(),
  serviceDate: z.iso.date().nullable(),
  method: paymentMethodSchema.nullable(),
  externalReference: z.string().nullable(),
  sourceEntryId: z.uuid().nullable(),
  reversedBy: z.uuid().nullable(),
  actor: z.object({ id: z.uuid(), email: z.string() }),
  occurredAt: z.iso.datetime({ offset: true }),
});

export const billingReadOutcomeSchema = z.union([
  z.object({
    ok: z.literal(true),
    patientId: z.uuid(),
    currency: z.literal("USD"),
    balanceCents: centsSchema,
    version: versionSchema,
    entries: z.object({
      items: z.array(billingEntrySchema),
      total: versionSchema,
      nextVersion: entryVersionSchema.nullable(),
    }),
  }),
  billingFailureSchema,
]);
export type BillingReadOutcome = z.output<typeof billingReadOutcomeSchema>;
export type BillingCommandOutcome = z.output<typeof billingCommandOutcomeSchema>;
export type BillingOutcome = BillingReadOutcome | BillingCommandOutcome;
