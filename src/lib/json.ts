import { z } from "zod";

/** JSON values after a boundary decode. Not a stand-in for domain types. */
export type Json =
  | string
  | number
  | boolean
  | null
  | readonly Json[]
  | { readonly [key: string]: Json };

export type JsonObject = Readonly<Record<string, Json>>;

export const jsonSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonSchema),
    z.record(z.string(), jsonSchema),
  ]),
);

export const jsonObjectSchema: z.ZodType<JsonObject> = z.record(z.string(), jsonSchema);

export function asJsonObject(value: Json): JsonObject | null {
  if (value === null || Array.isArray(value)) return null;
  const parsed = jsonObjectSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function asJsonString(value: Json | undefined): string | null {
  const parsed = z.string().safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function asJsonNumber(value: Json | undefined): number | null {
  const parsed = z.number().safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function asJsonBoolean(value: Json | undefined): boolean | null {
  const parsed = z.boolean().safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function asJsonArray(value: Json | undefined): readonly Json[] | null {
  const parsed = z.array(jsonSchema).safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function asJsonTimestamp(value: Json | undefined): string | null {
  const text = asJsonString(value);
  return text !== null && Number.isFinite(Date.parse(text)) ? text : null;
}
