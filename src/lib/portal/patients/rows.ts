import "server-only";

import { z } from "zod";

import { storedRequestStateSchema } from "@/lib/portal/workflow/contracts";

import {
  patientFailureSchema,
  patientReadOutcomeSchema,
  patientRevisionCommandSchema,
  patientSearchOutcomeSchema,
  patientSummarySchema,
} from "./contracts";

const timestampSchema = z.iso.datetime({ offset: true });
const versionSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const patientRowSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    date_of_birth: z.iso.date().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    archived_at: timestampSchema.nullable(),
    version: versionSchema,
    created_at: timestampSchema,
    updated_at: timestampSchema,
  })
  .transform((row) => ({
    id: row.id,
    name: row.name,
    dateOfBirth: row.date_of_birth,
    phone: row.phone,
    email: row.email,
    archivedAt: row.archived_at,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
  .pipe(patientSummarySchema);

const revisionRowSchema = z
  .object({
    id: z.uuid(),
    version: versionSchema,
    command: patientRevisionCommandSchema,
    before_record: patientRowSchema.nullable(),
    after_record: patientRowSchema,
    request_id: z.uuid().nullable(),
    actor_id: z.uuid(),
    actor_email: z.string(),
    occurred_at: timestampSchema,
  })
  .transform((row) => ({
    id: row.id,
    version: row.version,
    command: row.command,
    before: row.before_record,
    after: row.after_record,
    requestId: row.request_id,
    actor: { id: row.actor_id, email: row.actor_email },
    occurredAt: row.occurred_at,
  }));

const linkedRequestRowSchema = z
  .object({
    request_id: z.uuid(),
    linked_at: timestampSchema,
    linked_by: z.uuid(),
    request_created_at: timestampSchema,
    request_status: storedRequestStateSchema,
  })
  .transform((row) => ({
    requestId: row.request_id,
    linkedAt: row.linked_at,
    linkedBy: row.linked_by,
    receivedAt: row.request_created_at,
    state: row.request_status,
  }));

export const patientSearchDatabaseSchema = z
  .union([
    z.object({
      ok: z.literal(true),
      total: z.number().int().nonnegative(),
      patients: z.array(patientRowSchema),
      next: z.object({ name: z.string(), id: z.uuid() }).nullable(),
    }),
    patientFailureSchema,
  ])
  .pipe(patientSearchOutcomeSchema);

export const patientReadDatabaseSchema = z
  .union([
    z.object({
      ok: z.literal(true),
      patient: patientRowSchema,
      history: z.object({
        items: z.array(revisionRowSchema),
        total: z.number().int().nonnegative(),
        nextVersion: versionSchema.nullable(),
      }),
      requests: z.object({
        items: z.array(linkedRequestRowSchema),
        total: z.number().int().nonnegative(),
        nextRequestId: z.uuid().nullable(),
      }),
    }),
    patientFailureSchema,
  ])
  .pipe(patientReadOutcomeSchema);
