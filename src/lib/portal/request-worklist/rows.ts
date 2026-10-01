import { z } from "zod";

import {
  requestWorklistFailureSchema,
  requestWorklistOutcomeSchema,
  worklistRowSchema,
} from "./contracts";

const databaseRow = worklistRowSchema
  .omit({ lastActivityAt: true, lastActivityBy: true, patientId: true })
  .extend({
    last_activity_at: z.string().nullable(),
    last_activity_by: z.string().nullable(),
    // Absent until the linked-patient migration lands; the card then keeps the handoff path.
    patient_id: z.uuid().nullable().default(null),
  })
  .transform(({ last_activity_at, last_activity_by, patient_id, ...row }) => ({
    ...row,
    lastActivityAt: last_activity_at,
    lastActivityBy: last_activity_by,
    patientId: patient_id,
  }));

export const requestWorklistDatabaseSchema = z
  .union([
    requestWorklistOutcomeSchema.options[0].extend({ items: z.array(databaseRow) }),
    requestWorklistFailureSchema,
  ])
  .pipe(requestWorklistOutcomeSchema);
