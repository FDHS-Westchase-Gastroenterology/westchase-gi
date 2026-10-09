import { z } from "zod";

/** Contact facts without implying that another call is needed. */
export const CONTACT_COMPLETION_RESULTS = ["reached", "voicemail", "no_answer"] as const;
export type ContactCompletionResult = (typeof CONTACT_COMPLETION_RESULTS)[number];

export const CONTACT_COMPLETION_REASON = "no_further_contact";

const contactCompletionResultSchema = z.enum(CONTACT_COMPLETION_RESULTS);

export function parseContactCompletionResult(
  raw: string | null | undefined,
): ContactCompletionResult | null {
  const parsed = contactCompletionResultSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** A separate finish action makes omission of a callback date an error elsewhere. */
export const contactCompletionInputSchema = z.strictObject({
  requestId: z.uuid(),
  expectedVersion: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  idempotencyKey: z.uuid(),
  outcome: contactCompletionResultSchema,
  note: z
    .string()
    .max(2000)
    .refine((value) => value === value.trim())
    .optional(),
});

export type ContactCompletionInput = z.infer<typeof contactCompletionInputSchema>;
