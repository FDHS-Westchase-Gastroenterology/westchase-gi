// Pinned mission contracts — the bridge between the intake pipeline, the
// admin portal, and the E2E suite. Both the patient form and the server
// route validate against THIS schema; the portal and audit trail consume
// THESE types and constants. Field names are the wire format (camelCase);
// the database layer maps time -> preferred_time and sourcePath ->
// source_path at the insert boundary.

import { z } from "zod";
import { locales, type Locale } from "@/lib/site";

/** Same pattern the patient form has always enforced client-side. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const REQUEST_LOCATIONS = ["any", "tampa", "lutz"] as const;
export type RequestLocation = (typeof REQUEST_LOCATIONS)[number];

const REQUEST_TIMES = ["any", "morning", "afternoon"] as const;
export type RequestTime = (typeof REQUEST_TIMES)[number];

export const REQUEST_STATUSES = [
  "new",
  "contacted",
  "scheduled",
  "closed",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export type StaffRole = "admin" | "staff";

/**
 * Validation rules mirror the client rules the form has always applied:
 * name required, phone >= 10 digits once formatting is stripped, email per
 * EMAIL_RE, message optional and capped at 2000 characters. The honeypot
 * field (HONEYPOT_FIELD) is deliberately NOT part of this schema — the
 * route inspects and discards it before validation.
 */
export const requestInputSchema = z.object({
  name: z.string().trim().min(1, "name_required"),
  phone: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, "").length >= 10, "phone_invalid"),
  email: z.string().trim().regex(EMAIL_RE, "email_invalid"),
  location: z.enum(REQUEST_LOCATIONS),
  time: z.enum(REQUEST_TIMES),
  message: z.string().trim().max(2000, "message_too_long").optional(),
  locale: z.enum(locales as [Locale, ...Locale[]]),
  sourcePath: z.string().trim().min(1).max(300).startsWith("/"),
});

export type RequestInput = z.infer<typeof requestInputSchema>;

export type IntakeFailureCode = "validation" | "rate_limited" | "unavailable";

/** The only response shapes POST /api/requests may produce. */
export type IntakeResponse =
  | { ok: true; id: string }
  | {
      ok: false;
      code: IntakeFailureCode;
      fieldErrors?: Record<string, string>;
    };

/** Flatten a zod failure into the IntakeResponse fieldErrors shape. */
export function zodFieldErrors(
  error: z.ZodError<unknown>,
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "_";
    if (!(key in fieldErrors)) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

/** Every staff-visible mutation writes one of these audit_log actions. */
export const AUDIT_ACTIONS = {
  REQUEST_STATUS_CHANGE: "request.status_change",
  REQUEST_NOTE: "request.note",
  RECIPIENTS_ADD: "recipients.add",
  RECIPIENTS_REMOVE: "recipients.remove",
  RECIPIENTS_TOGGLE: "recipients.toggle",
  STAFF_INVITE: "staff.invite",
  STAFF_DEACTIVATE: "staff.deactivate",
  STAFF_ROLE: "staff.role",
  REGISTRY_CREATE: "registry.create",
  REGISTRY_UPDATE: "registry.update",
  REGISTRY_ARCHIVE: "registry.archive",
} as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

/** JS-enabled submissions POST JSON here. */
export const INTAKE_API = "/api/requests";

/** Pre-hydration/no-JS submissions POST form data here (native form action). */
export const INTAKE_NOJS_ACTION = "/api/requests/form";

/** Server-rendered receipt page for the no-JS path. */
export function receiptPath(locale: Locale): string {
  return `/${locale}/appointment/received`;
}

/** Honeypot input name — filled means bot; drop silently, persist nothing. */
export const HONEYPOT_FIELD = "company";

/** In-memory per-instance rate limit for the intake route. */
export const INTAKE_RATE_LIMIT = {
  limit: 5,
  windowMs: 10 * 60 * 1000,
} as const;
