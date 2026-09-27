import { expect } from "@playwright/test";

/* Assertions the portal and boundary specs repeat: decoding a zod result
   into a value the test can use, and reading a "denied" from PostgREST. */

type SafeParseResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: unknown };

/** The decoded value, or a failed assertion named in domain language. */
export function requireDecoded<T>(parsed: SafeParseResult<T>, message: string): T {
  expect(parsed.success, message).toBe(true);
  if (!parsed.success) throw new Error(message);
  return parsed.data;
}

export function requireText(value: string | null | undefined, message: string): string {
  if (value === null || value === undefined || value === "") {
    throw new Error(message);
  }
  return value;
}

interface RestResult {
  readonly error: { readonly code?: string } | null;
  readonly status: number;
}

/**
 * PostgREST refused the call: the Postgres permission code and an HTTP
 * status that says so. Row Level Security and revoked grants both land here.
 */
export function expectDenied(result: RestResult): void {
  expect(result.error?.code).toBe("42501");
  expect([401, 403]).toContain(result.status);
}
