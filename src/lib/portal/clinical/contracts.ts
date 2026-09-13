import { z } from "zod";

import { STAFF_ROLES } from "@/lib/portal/contracts";

const version = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const recordVersion = version.refine((value) => value > 0);
const timestamp = z.iso.datetime({ offset: true });
const recordKind = z.enum(["note", "document_reference"]);
const recordStatus = z.enum(["draft", "signed", "entered_in_error"]);
const contentFields = {
  title: z.string().trim().min(1).max(120),
  serviceDate: z.iso
    .date()
    .refine((date) => !date.startsWith("0000-"))
    .nullable()
    .default(null),
};
export const clinicalContentSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("note"), ...contentFields, noteText: z.string().max(20000) }),
  z.strictObject({
    kind: z.literal("document_reference"),
    ...contentFields,
    documentSource: z.string().trim().min(1).max(120),
    documentReference: z.string().trim().min(1).max(200),
    documentSha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .nullable()
      .default(null),
  }),
]);
const existingRecord = { recordId: z.uuid(), expectedVersion: recordVersion };
export const clinicalCommandSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("create"),
    patientId: z.uuid(),
    appointmentId: z.uuid().nullable().default(null),
    content: clinicalContentSchema,
  }),
  z.strictObject({
    kind: z.literal("update_draft"),
    ...existingRecord,
    content: clinicalContentSchema,
  }),
  z.strictObject({ kind: z.literal("sign"), ...existingRecord }),
  z.strictObject({ kind: z.literal("amend"), ...existingRecord, content: clinicalContentSchema }),
  z.strictObject({
    kind: z.literal("enter_in_error"),
    ...existingRecord,
    reason: z.string().trim().min(1).max(500),
  }),
  z.strictObject({
    kind: z.literal("set_signer"),
    userId: z.uuid(),
    expectedVersion: version,
    enabled: z.boolean(),
  }),
]);
export const clinicalInputSchema = z.discriminatedUnion("action", [
  z.strictObject({
    action: z.literal("command"),
    idempotencyKey: z.uuid(),
    command: clinicalCommandSchema,
  }),
  z.strictObject({
    action: z.literal("list"),
    patientId: z.uuid(),
    query: z.string().trim().max(120).default(""),
    status: recordStatus.nullable().default(null),
    kind: recordKind.nullable().default(null),
    limit: z.number().int().min(1).max(100).default(50),
    after: z.strictObject({ createdAt: timestamp, id: z.uuid() }).nullable().default(null),
  }),
  z.strictObject({
    action: z.literal("read"),
    recordId: z.uuid(),
    beforeVersion: recordVersion.nullable().default(null),
  }),
  z.strictObject({
    action: z.literal("signers"),
    afterUserId: z.uuid().nullable().default(null),
    limit: z.number().int().min(1).max(100).default(100),
  }),
]);
export type ClinicalInput = z.input<typeof clinicalInputSchema>;

export const CLINICAL_FAILURE_CODES = [
  "invalid_command",
  "invalid_query",
  "unauthorized",
  "forbidden",
  "unavailable",
  "patient_not_found",
  "not_found",
  "appointment_patient_mismatch",
  "staff_unavailable",
  "stale_version",
  "idempotency_conflict",
  "signing_not_enabled",
  "not_record_author",
  "record_not_draft",
  "record_not_signed",
  "amendment_exists",
  "amendment_source_changed",
  "empty_note",
  "already_entered_in_error",
] as const;
export type ClinicalFailureCode = (typeof CLINICAL_FAILURE_CODES)[number];
export const clinicalFailureSchema = z.object({
  ok: z.literal(false),
  code: z.enum(CLINICAL_FAILURE_CODES),
  currentVersion: version.optional(),
});
export const clinicalCommandOutcomeSchema = z.union([
  z.object({
    ok: z.literal(true),
    entity: z.literal("record"),
    id: z.uuid(),
    patientId: z.uuid(),
    version: recordVersion,
  }),
  z.object({
    ok: z.literal(true),
    entity: z.literal("signer"),
    id: z.uuid(),
    version: recordVersion,
  }),
  clinicalFailureSchema,
]);
export const clinicalSummarySchema = z.object({
  id: z.uuid(),
  patientId: z.uuid(),
  appointmentId: z.uuid().nullable(),
  kind: recordKind,
  title: z.string(),
  serviceDate: z.iso.date().nullable(),
  status: recordStatus,
  amendsId: z.uuid().nullable(),
  amendsVersion: recordVersion.nullable(),
  version: recordVersion,
  author: z.object({ id: z.uuid(), email: z.string() }),
  signature: z.object({ id: z.uuid(), email: z.string(), at: timestamp }).nullable(),
  createdAt: timestamp,
  updatedAt: timestamp,
  updatedBy: z.uuid(),
});
const correction = { errorReason: z.string().nullable() };
export const clinicalRecordSchema = z.discriminatedUnion("kind", [
  clinicalSummarySchema.extend({
    kind: z.literal("note"),
    noteText: z.string(),
    document: z.null(),
    ...correction,
  }),
  clinicalSummarySchema.extend({
    kind: z.literal("document_reference"),
    noteText: z.null(),
    document: z.object({
      source: z.string(),
      reference: z.string(),
      sha256: z.string().nullable(),
    }),
    ...correction,
  }),
]);
export const clinicalRevisionSchema = z.object({
  id: z.uuid(),
  recordId: z.uuid(),
  version: recordVersion,
  command: z.enum(["create", "update_draft", "sign", "amend", "enter_in_error"]),
  before: clinicalRecordSchema.nullable(),
  after: clinicalRecordSchema,
  actor: z.object({ id: z.uuid(), email: z.string() }),
  occurredAt: timestamp,
});
export const clinicalListOutcomeSchema = z.union([
  z.object({
    ok: z.literal(true),
    patientId: z.uuid(),
    canSign: z.boolean(),
    total: version,
    records: z.array(clinicalSummarySchema),
    next: z.object({ createdAt: timestamp, id: z.uuid() }).nullable(),
  }),
  clinicalFailureSchema,
]);
export const clinicalReadOutcomeSchema = z.union([
  z.object({
    ok: z.literal(true),
    record: clinicalRecordSchema,
    canSign: z.boolean(),
    history: z.object({
      items: z.array(clinicalRevisionSchema),
      total: version,
      nextVersion: recordVersion.nullable(),
    }),
  }),
  clinicalFailureSchema,
]);
export const clinicalSignerSchema = z.object({
  userId: z.uuid(),
  email: z.string(),
  displayName: z.string().nullable(),
  role: z.enum(STAFF_ROLES),
  active: z.boolean(),
  onboardedAt: timestamp.nullable(),
  enabled: z.boolean(),
  version,
  configuredBy: z.uuid().nullable(),
  configuredAt: timestamp.nullable(),
});
export const clinicalSignersOutcomeSchema = z.union([
  z.object({
    ok: z.literal(true),
    total: version,
    signers: z.array(clinicalSignerSchema),
    nextUserId: z.uuid().nullable(),
  }),
  clinicalFailureSchema,
]);
export type ClinicalCommandOutcome = z.output<typeof clinicalCommandOutcomeSchema>;
export type ClinicalListOutcome = z.output<typeof clinicalListOutcomeSchema>;
export type ClinicalReadOutcome = z.output<typeof clinicalReadOutcomeSchema>;
export type ClinicalSignersOutcome = z.output<typeof clinicalSignersOutcomeSchema>;
export type ClinicalOutcome =
  | ClinicalCommandOutcome
  | ClinicalListOutcome
  | ClinicalReadOutcome
  | ClinicalSignersOutcome;
