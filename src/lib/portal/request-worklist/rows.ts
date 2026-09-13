import { z } from "zod";

import {
  requestWorklistFailureSchema,
  requestWorklistOutcomeSchema,
  worklistRowSchema,
} from "./contracts";

const databaseRow = worklistRowSchema
  .omit({ lastActivityAt: true, lastActivityBy: true })
  .extend({
    last_activity_at: z.string().nullable(),
    last_activity_by: z.string().nullable(),
  })
  .transform(({ last_activity_at, last_activity_by, ...row }) => ({
    ...row,
    lastActivityAt: last_activity_at,
    lastActivityBy: last_activity_by,
  }));

export const requestWorklistDatabaseSchema = z
  .union([
    requestWorklistOutcomeSchema.options[0].extend({ items: z.array(databaseRow) }),
    requestWorklistFailureSchema,
  ])
  .pipe(requestWorklistOutcomeSchema);
