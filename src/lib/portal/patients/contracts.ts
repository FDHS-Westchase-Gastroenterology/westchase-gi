import { z } from "zod";

import { isMailbox, REQUEST_FIELD_LIMITS } from "@/lib/portal/contracts";
import { REQUEST_STATES } from "@/lib/portal/workflow/contracts";

const versionSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const timestampSchema = z.iso.datetime({ offset: true });

export const patientFieldsSchema = z.strictObject({
  name: z.string().trim().min(1).max(REQUEST_FIELD_LIMITS.name),
  dateOfBirth: z.iso
    .date()
    .refine((date) => !date.startsWith("0000-"))
    .nullable()
    .default(null),
  phone: z
    .string()
    .trim()
    .min(1)
    .max(REQUEST_FIELD_LIMITS.phone)
    .refine((phone) => phone.replace(/\D/g, "").length >= 10)
    .nullable()
    .default(null),
  email: z
    .string()
    .trim()
    .max(REQUEST_FIELD_LIMITS.email)
    .refine(isMailbox)
    .nullable()
    .default(null),
});

const existingPatient = { patientId: z.uuid(), expectedVersion: versionSchema };

export const patientCommandSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("create"),
    patient: patientFieldsSchema,
    requestId: z.uuid().nullable().default(null),
  }),
  z.strictObject({ kind: z.literal("update"), ...existingPatient, patient: patientFieldsSchema }),
  z.strictObject({ kind: z.literal("set_archived"), ...existingPatient, archived: z.boolean() }),
  z.strictObject({ kind: z.literal("link_request"), ...existingPatient, requestId: z.uuid() }),
  z.strictObject({ kind: z.literal("unlink_request"), ...existingPatient, requestId: z.uuid() }),
]);

export const patientCommandInputSchema = z.strictObject({
  idempotencyKey: z.uuid(),
  command: patientCommandSchema,
});
export type PatientCommandInput = z.input<typeof patientCommandInputSchema>;

export const PATIENT_FAILURE_CODES = [
  "invalid_command",
  "unauthorized",
  "forbidden",
  "not_found",
  "request_not_found",
  "request_link_conflict",
  "patient_archived",
  "stale_version",
  "idempotency_conflict",
  "unchanged",
  "unavailable",
] as const;
export type PatientFailureCode = (typeof PATIENT_FAILURE_CODES)[number];

export const patientFailureSchema = z.object({
  ok: z.literal(false),
  code: z.enum(PATIENT_FAILURE_CODES),
  currentVersion: versionSchema.optional(),
});

export const patientCommandOutcomeSchema = z.union([
  z.object({ ok: z.literal(true), patientId: z.uuid(), version: versionSchema }),
  patientFailureSchema,
]);
export type PatientCommandOutcome = z.infer<typeof patientCommandOutcomeSchema>;

export const patientSearchInputSchema = z.strictObject({
  query: z.string().trim().max(254).default(""),
  archived: z.boolean().default(false),
  limit: z.number().int().min(1).max(100).default(50),
  after: z
    .strictObject({ name: z.string().min(1).max(120), id: z.uuid() })
    .nullable()
    .default(null),
});
export type PatientSearchInput = z.input<typeof patientSearchInputSchema>;

export const patientRevisionCommandSchema = z.enum([
  "create",
  "update",
  "set_archived",
  "link_request",
  "unlink_request",
]);

export const patientSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  dateOfBirth: z.iso.date().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  archivedAt: timestampSchema.nullable(),
  version: versionSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type PatientSummary = z.infer<typeof patientSummarySchema>;

export const patientSearchOutcomeSchema = z.union([
  z.object({
    ok: z.literal(true),
    total: z.number().int().nonnegative(),
    patients: z.array(patientSummarySchema),
    next: z.object({ name: z.string(), id: z.uuid() }).nullable(),
  }),
  patientFailureSchema,
]);
export type PatientSearchOutcome = z.output<typeof patientSearchOutcomeSchema>;

export const patientRevisionSchema = z.object({
  id: z.uuid(),
  version: versionSchema,
  command: patientRevisionCommandSchema,
  before: patientSummarySchema.nullable(),
  after: patientSummarySchema,
  requestId: z.uuid().nullable(),
  actor: z.object({ id: z.uuid(), email: z.string() }),
  occurredAt: timestampSchema,
});

export const patientLinkedRequestSchema = z.object({
  requestId: z.uuid(),
  linkedAt: timestampSchema,
  linkedBy: z.uuid(),
  receivedAt: timestampSchema,
  state: z.enum(REQUEST_STATES),
});

export const patientReadInputSchema = z.strictObject({
  patientId: z.uuid(),
  historyBefore: versionSchema.nullable().default(null),
  linksAfter: z.uuid().nullable().default(null),
});
export type PatientReadInput = z.input<typeof patientReadInputSchema>;

export const patientReadOutcomeSchema = z.union([
  z.object({
    ok: z.literal(true),
    patient: patientSummarySchema,
    history: z.object({
      items: z.array(patientRevisionSchema),
      total: z.number().int().nonnegative(),
      nextVersion: versionSchema.nullable(),
    }),
    requests: z.object({
      items: z.array(patientLinkedRequestSchema),
      total: z.number().int().nonnegative(),
      nextRequestId: z.uuid().nullable(),
    }),
  }),
  patientFailureSchema,
]);
export type PatientReadOutcome = z.output<typeof patientReadOutcomeSchema>;
