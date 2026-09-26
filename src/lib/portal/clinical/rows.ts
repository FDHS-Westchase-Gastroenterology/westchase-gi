import { z } from "zod";

import { STAFF_ROLES } from "@/lib/portal/contracts";

import {
  clinicalFailureSchema,
  clinicalListOutcomeSchema,
  clinicalReadOutcomeSchema,
  clinicalRecordSchema,
  clinicalRevisionSchema,
  clinicalSignersOutcomeSchema,
  clinicalSummarySchema,
} from "./contracts";

const summaryFields = z.object({
  id: z.uuid(),
  patient_id: z.uuid(),
  appointment_id: z.uuid().nullable(),
  record_kind: z.enum(["note", "document_reference"]),
  title: z.string(),
  service_date: z.string().nullable(),
  status: z.enum(["draft", "signed", "entered_in_error"]),
  amends_id: z.uuid().nullable(),
  amends_version: z.number().nullable(),
  version: z.number(),
  author_id: z.uuid(),
  author_email: z.string(),
  signed_by: z.uuid().nullable(),
  signed_by_email: z.string().nullable(),
  signed_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  updated_by: z.uuid(),
});
type StoredClinicalSummary = z.infer<typeof summaryFields>;
function toSummary(row: Readonly<StoredClinicalSummary>) {
  return {
    id: row.id,
    patientId: row.patient_id,
    appointmentId: row.appointment_id,
    kind: row.record_kind,
    title: row.title,
    serviceDate: row.service_date,
    status: row.status,
    amendsId: row.amends_id,
    amendsVersion: row.amends_version,
    version: row.version,
    author: { id: row.author_id, email: row.author_email },
    signature:
      row.signed_at === null
        ? null
        : { id: row.signed_by, email: row.signed_by_email, at: row.signed_at },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}
const summaryDatabaseSchema = summaryFields.transform(toSummary).pipe(clinicalSummarySchema);
const recordDatabaseSchema = summaryFields
  .extend({
    note_text: z.string().nullable(),
    document_source: z.string().nullable(),
    document_reference: z.string().nullable(),
    document_sha256: z.string().nullable(),
    error_reason: z.string().nullable(),
  })
  .transform((row) => ({
    ...toSummary(row),
    noteText: row.note_text,
    errorReason: row.error_reason,
    document:
      row.record_kind === "note"
        ? null
        : {
            source: row.document_source,
            reference: row.document_reference,
            sha256: row.document_sha256,
          },
  }))
  .pipe(clinicalRecordSchema);
const revisionDatabaseSchema = clinicalRevisionSchema
  .pick({ id: true, version: true, command: true })
  .extend({
    id: z.uuid(),
    record_id: z.uuid(),
    version: z.number(),
    before_record: recordDatabaseSchema.nullable(),
    after_record: recordDatabaseSchema,
    actor_id: z.uuid(),
    actor_email: z.string(),
    occurred_at: z.string(),
  })
  .transform((row) => ({
    id: row.id,
    recordId: row.record_id,
    version: row.version,
    command: row.command,
    before: row.before_record,
    after: row.after_record,
    actor: { id: row.actor_id, email: row.actor_email },
    occurredAt: row.occurred_at,
  }))
  .pipe(clinicalRevisionSchema);

export const clinicalListDatabaseSchema = z
  .union([
    clinicalListOutcomeSchema.options[0].extend({ records: z.array(summaryDatabaseSchema) }),
    clinicalFailureSchema,
  ])
  .pipe(clinicalListOutcomeSchema);
export const clinicalReadDatabaseSchema = z
  .union([
    clinicalReadOutcomeSchema.options[0].extend({
      record: recordDatabaseSchema,
      history: z.object({
        items: z.array(revisionDatabaseSchema),
        total: z.number(),
        nextVersion: z.number().nullable(),
      }),
    }),
    clinicalFailureSchema,
  ])
  .pipe(clinicalReadOutcomeSchema);
const signerDatabaseSchema = z
  .object({
    user_id: z.uuid(),
    email: z.string(),
    display_name: z.string().nullable(),
    role: z.enum(STAFF_ROLES),
    active: z.boolean(),
    onboarded_at: z.string().nullable(),
    enabled: z.boolean(),
    version: z.number(),
    configured_by: z.uuid().nullable(),
    configured_at: z.string().nullable(),
  })
  .transform((row) => ({
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    active: row.active,
    onboardedAt: row.onboarded_at,
    enabled: row.enabled,
    version: row.version,
    configuredBy: row.configured_by,
    configuredAt: row.configured_at,
  }));
export const clinicalSignersDatabaseSchema = z
  .union([
    clinicalSignersOutcomeSchema.options[0].extend({ signers: z.array(signerDatabaseSchema) }),
    clinicalFailureSchema,
  ])
  .pipe(clinicalSignersOutcomeSchema);
