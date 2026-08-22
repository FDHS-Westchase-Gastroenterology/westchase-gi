/**
 * Pinned portal contracts — the bridge between the intake pipeline, the
 * staff portal, and the E2E suite. Both the patient form and the server
 * route validate against THIS schema; the portal and audit trail consume
 * THESE types and constants. Field names are the wire format (camelCase);
 * the database layer maps time -> preferred_time and sourcePath ->
 * source_path at the insert boundary.
 *
 * Domain language, enforced here by construction:
 *
 * - "Appointment request" is the portal's unit of work — a patient's ask
 *   for a callback to schedule a visit. It is never an "Appointment":
 *   that reserved word means the real booked visit in the practice
 *   scheduling system, which this codebase never creates or owns. The
 *   portal only records that a booking handoff was confirmed.
 * - Storage spells the terminal resolved state `scheduled`; the workflow
 *   domain spells it `booked` (workflow/contracts.ts). This module keeps
 *   the storage spelling because it owns the wire and database shapes;
 *   presentationStatus() in the requests route is the only place the two
 *   vocabularies meet, and nothing translates a label back into a state.
 * - PHI-free bar: everything that leaves the queue (notification emails,
 *   logs, telemetry, audit metadata) carries no patient-supplied data.
 *   The schemas below bound what may enter; each outbound writer owns the
 *   bar on the way out.
 */

import { z } from "zod";

import { locales } from "@/lib/site";
import type { Locale } from "@/lib/site";

import { RELEASE_AUDIT_ACTIONS } from "./release-state";

const mailboxSchema = z.email().max(254);

export function isMailbox(value: string): boolean {
  return mailboxSchema.safeParse(value).success;
}

export const REQUEST_FIELD_LIMITS = {
  name: 120,
  phone: 32,
  email: 254,
  message: 2000,
} as const;

const REQUEST_LOCATIONS = ["any", "tampa", "lutz"] as const;
export type RequestLocation = (typeof REQUEST_LOCATIONS)[number];

const REQUEST_TIMES = ["any", "morning", "afternoon"] as const;
export type RequestTime = (typeof REQUEST_TIMES)[number];

/**
 * Storage spelling of the appointment-request lifecycle: NEW and CONTACTED
 * are unresolved; SCHEDULED (the workflow domain's `booked`) and CLOSED are
 * terminal for ordinary work until reopened. The lifecycle word is status,
 * never "stage".
 */
export const REQUEST_STATUSES = ["new", "contacted", "scheduled", "closed"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

// The closure outcomes the database's close paths validate
// ('unconverted' / 'converted').
export type RequestClosureOutcome = "unconverted" | "converted";

export type StaffRole = "admin" | "staff";

export const RESET_REQUEST_MESSAGE =
  "If an active staff account exists for that email, you’ll receive a password reset link.";

// This mirrors the intended hosted Auth setting and the committed local
// Configuration. Development and Production are still verified separately.
export const PASSWORD_RESET_RESEND_COOLDOWN_SECONDS = 60;

/**
 * Validation rules mirror the client rules the form applies: name required,
 * phone >= 10 digits once formatting is stripped, email optional but exactly
 * one practical mailbox when present (many patients 65+ have no email; phone
 * is the callback channel). Every free-text field has a shared
 * client/server/database cap. The honeypot field (HONEYPOT_FIELD) is
 * deliberately NOT part of this schema —
 * the route inspects and discards it before validation.
 */
export const requestInputSchema = z.object({
  name: z.string().trim().min(1, "name_required").max(REQUEST_FIELD_LIMITS.name, "name_too_long"),
  phone: z
    .string()
    .trim()
    .max(REQUEST_FIELD_LIMITS.phone, "phone_too_long")
    .refine((v) => v.replace(/\D/g, "").length >= 10, "phone_invalid"),
  email: z
    .string()
    .trim()
    .max(REQUEST_FIELD_LIMITS.email, "email_too_long")
    .refine((v) => v === "" || isMailbox(v), "email_invalid")
    .default(""),
  location: z.enum(REQUEST_LOCATIONS),
  time: z.enum(REQUEST_TIMES),
  message: z.string().trim().max(REQUEST_FIELD_LIMITS.message, "message_too_long").optional(),
  locale: z.enum(locales),
  sourcePath: z.string().trim().min(1).max(300).startsWith("/"),
});

export type RequestInput = z.infer<typeof requestInputSchema>;

export const STAFF_REQUEST_SOURCE_PATH = "/admin/requests/new";

export const staffRequestInputSchema = requestInputSchema.omit({
  locale: true,
  sourcePath: true,
});

export type StaffRequestInput = z.infer<typeof staffRequestInputSchema>;

export const STAFF_REQUEST_FIELDS = [
  "name",
  "phone",
  "email",
  "location",
  "time",
  "message",
] as const;

export type StaffRequestField = (typeof STAFF_REQUEST_FIELDS)[number];

export interface StaffRequestDraft {
  readonly name: string;
  readonly phone: string;
  readonly email: string;
  readonly location: string;
  readonly time: string;
  readonly message: string;
}

export type CreateStaffRequestActionState =
  | { status: "idle" }
  | {
      status: "error";
      code: "validation" | "conflict" | "unavailable";
      /** Submitted values survive validation and ambiguous failures. */
      values: StaffRequestDraft;
      /** Reuse on every retry so an ambiguous response cannot duplicate work. */
      idempotencyKey: string | null;
      fieldErrors?: Partial<Record<StaffRequestField, string>>;
    };

export type IntakeFailureCode = "validation" | "rate_limited" | "unavailable";

/** The only response shapes POST /api/requests may produce. */
export const intakeResponseSchema = z.union([
  z.object({ ok: z.literal(true), id: z.string() }),
  z.object({
    ok: z.literal(false),
    code: z.enum(["validation", "rate_limited", "unavailable"]),
    fieldErrors: z.record(z.string(), z.string()).optional(),
  }),
]);

export type IntakeResponse = z.infer<typeof intakeResponseSchema>;

/** Flatten a zod failure into the IntakeResponse fieldErrors shape. */
export function zodFieldErrors(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "_";
    if (!(key in fieldErrors)) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

/** Every staff-visible mutation writes one of these audit_log actions. */
export const AUDIT_ACTIONS = {
  RECIPIENTS_ADD: "recipients.add",
  RECIPIENTS_REMOVE: "recipients.remove",
  RECIPIENTS_TOGGLE: "recipients.toggle",
  STAFF_INVITE: "staff.invite",
  STAFF_ONBOARD: "staff.onboard",
  STAFF_PASSWORD_RESET: "staff.password_reset",
  STAFF_TOUR_DISMISS: "staff.tour_dismiss",
  STAFF_TOUR_RESTART: "staff.tour_restart",
  STAFF_TOUR_COMPLETE: "staff.tour_complete",
  STAFF_DEACTIVATE: "staff.deactivate",
  STAFF_ROLE: "staff.role",
  MAINTAINERS_INVITE: "maintainers.invite",
  MAINTAINERS_CANCEL: "maintainers.cancel",
  MAINTAINERS_REVOKE: "maintainers.revoke",
  REQUEST_CREATE: "request.create",
  REQUESTS_EXPORT: "requests.export",
  REQUESTS_PRINT_NEW: "requests.print_new",
  ...RELEASE_AUDIT_ACTIONS,
} as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

/** JS-enabled submissions POST JSON here. */
export const INTAKE_API = "/api/requests";

/** Pre-hydration/no-JS submissions POST form data here (native form action). */
export const INTAKE_NOJS_ACTION = "/api/requests/form";

/** Server-rendered receipt page for the no-JS path.
 *
 * A receipt is the short-lived confirmation a patient sees after a
 * no-JavaScript submission, backed by a one-time token (intake.ts owns
 * issuing and consuming it).
 */
export function receiptPath(locale: Locale): string {
  return `/${locale}/appointment/received`;
}

/** Honeypot input name — filled means bot; drop silently, persist nothing. */
export const HONEYPOT_FIELD = "company";

/** Shared Postgres-backed intake rate limit. */
export const INTAKE_RATE_LIMIT = {
  limit: 5,
  windowSeconds: 10 * 60,
} as const;
