import { z } from "zod";

import { REQUEST_LOCATIONS, REQUEST_TIMES } from "@/lib/portal/contracts";
import { ATTENTION_BUCKETS } from "@/lib/portal/queue-attention-contracts";
import { REQUEST_STATUSES } from "@/lib/portal/workflow/contracts";

const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const timestamp = z.iso.datetime({ offset: true });
const filters = {
  query: z.string().trim().max(100).default(""),
  statuses: z.array(z.enum(REQUEST_STATUSES)).min(1).max(4).nullable().default(null),
  buckets: z.array(z.enum(ATTENTION_BUCKETS)).min(1).max(6).nullable().default(null),
  location: z.enum(REQUEST_LOCATIONS).nullable().default(null),
  receivedFrom: timestamp.nullable().default(null),
  receivedTo: timestamp.nullable().default(null),
};

export const requestWorklistInputSchema = z
  .discriminatedUnion("action", [
    z.strictObject({
      action: z.literal("page"),
      ...filters,
      offset: count.default(0),
      limit: z.number().int().min(1).max(200).default(50),
    }),
    z.strictObject({ action: z.literal("neighbors"), ...filters, requestId: z.uuid() }),
  ])
  .refine(
    (input) =>
      input.receivedFrom === null ||
      input.receivedTo === null ||
      Date.parse(input.receivedTo) > Date.parse(input.receivedFrom),
  );

type ReadonlyFields<T> = T extends readonly (infer Item)[]
  ? readonly ReadonlyFields<Item>[]
  : T extends object
    ? { readonly [Key in keyof T]: ReadonlyFields<T[Key]> }
    : T;
export type RequestWorklistInput = ReadonlyFields<z.input<typeof requestWorklistInputSchema>>;

export const worklistRowSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  phone: z.string(),
  location: z.enum(REQUEST_LOCATIONS),
  preferred_time: z.enum(REQUEST_TIMES),
  locale: z.string(),
  status: z.enum(REQUEST_STATUSES),
  created_at: timestamp,
  follow_up_at: timestamp.nullable(),
  legacy_review_required: z.boolean(),
  version: count.positive(),
  lastActivityAt: timestamp.nullable(),
  lastActivityBy: z.string().nullable(),
  bucket: z.enum(ATTENTION_BUCKETS),
});

export const requestWorklistFailureSchema = z.object({
  ok: z.literal(false),
  code: z.enum(["invalid_query", "unauthorized", "forbidden", "unavailable"]),
});
export const requestWorklistOutcomeSchema = z.union([
  z.object({
    ok: z.literal(true),
    total: count,
    counts: z.object({ new: count, contacted: count, scheduled: count, closed: count }),
    items: z.array(worklistRowSchema),
    nextOffset: count.nullable(),
    neighbors: z.object({
      prevId: z.uuid().nullable(),
      nextId: z.uuid().nullable(),
      position: count.positive().nullable(),
    }),
  }),
  requestWorklistFailureSchema,
]);
export type RequestWorklistOutcome = z.output<typeof requestWorklistOutcomeSchema>;
export type WorkedRequestRow = z.output<typeof worklistRowSchema>;
