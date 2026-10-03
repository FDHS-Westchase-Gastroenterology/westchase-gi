/* The Activity log's contract (issue #357): the filters a page read takes, the rows it returns,
   and the address the filters live in. Browser-safe: the page, its controls and the server all
   read it. The read itself is `readActivity` in ./activity.ts, behind the readActivityPage action. */

import { z } from "zod";

import { jsonObjectSchema, jsonSchema } from "@/lib/json";

const timestampSchema = z.iso.datetime({ offset: true });

/** What a row is about, as the log's chips name it. Computed by the database, which filters on it. */
export const ACTIVITY_CATEGORIES = [
  "appointments",
  "requests",
  "schedule",
  "sign_ins",
  "settings",
] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export const ACTIVITY_CATEGORY_LABELS = {
  appointments: "Appointments",
  requests: "Requests",
  schedule: "Schedule and hours",
  sign_ins: "Sign-ins",
  settings: "Settings",
} as const satisfies Record<ActivityCategory, string>;

/** The categories front desk sees; sign-ins are only their own. Admins see all five. */
export const FRONT_DESK_ACTIVITY_CATEGORIES = [
  "appointments",
  "requests",
  "schedule",
  "sign_ins",
] as const satisfies readonly ActivityCategory[];

/** What happened to an appointment. An undo carries the action it undid, with `via: "undo"`. */
export const APPOINTMENT_ACTIONS = [
  "booked",
  "moved",
  "cancelled",
  "checked_in",
  "no_show",
  "completed",
] as const;
export type AppointmentAction = (typeof APPOINTMENT_ACTIONS)[number];

export const APPOINTMENT_ACTION_LABELS = {
  booked: "Booked",
  moved: "Moved",
  cancelled: "Cancelled",
  checked_in: "Checked in",
  no_show: "No-show",
  completed: "Completed",
} as const satisfies Record<AppointmentAction, string>;

export const ACTIVITY_PAGE_SIZE = 50;
export const ACTIVITY_QUERY_MAX = 200;
/** Words a search may hold; each must match some part of the row. */
export const ACTIVITY_QUERY_MAX_WORDS = 8;

const categoryListSchema = z
  .array(z.enum(ACTIVITY_CATEGORIES))
  .max(ACTIVITY_CATEGORIES.length)
  .readonly();
const appointmentActionListSchema = z
  .array(z.enum(APPOINTMENT_ACTIONS))
  .max(APPOINTMENT_ACTIONS.length)
  .readonly();

/**
 * The log's filters. Every field is optional and an empty list means no filter. Dates are
 * inclusive practice-local days (America/New_York). `appointmentActions` narrows only the
 * Appointments category. `query` is matched as word prefixes against the actor, the patient,
 * the provider, the location, the appointment type and the action's words; it never goes in
 * an address, a log line or storage.
 */
export const activityFiltersSchema = z
  .strictObject({
    categories: categoryListSchema.optional(),
    appointmentActions: appointmentActionListSchema.optional(),
    providerId: z.uuid().optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    query: z.string().max(ACTIVITY_QUERY_MAX).optional(),
  })
  .refine((f) => f.from === undefined || f.to === undefined || f.from <= f.to, {
    path: ["to"],
  });
export type ActivityFilters = z.input<typeof activityFiltersSchema>;

/** Where the next page starts: the last row of this one. Null for the first page. */
export const activityCursorSchema = z
  .strictObject({ occurredAt: timestampSchema, id: z.uuid() })
  .nullable();
export type ActivityCursor = z.output<typeof activityCursorSchema>;

export const ACTIVITY_SOURCES = ["audit", "scheduling", "patient"] as const;
export type ActivitySource = (typeof ACTIVITY_SOURCES)[number];

/**
 * One row of the log, with everything needed to phrase and expand it.
 *
 * - `action` is the raw audit action, scheduling command or patient command.
 * - `via` is "undo" when the row undid an earlier change, "system" when no person made it
 *   (the retention job), and null otherwise. Whether an appointment changed from the Schedule
 *   or from its card is not recorded, so it is never claimed.
 * - `appointmentStart` is the appointment's start after the change; `priorAppointmentStart`
 *   is set only when the change moved it. `priorProviderId` likewise only when the provider changed.
 * - `detail` is the audit row's detail (null for the other sources); `before` and `after` are
 *   the scheduling or patient record either side of the change.
 */
export const activityRowSchema = z.object({
  source: z.enum(ACTIVITY_SOURCES),
  id: z.uuid(),
  occurredAt: timestampSchema,
  category: z.enum(ACTIVITY_CATEGORIES),
  action: z.string(),
  appointmentAction: z.enum(APPOINTMENT_ACTIONS).nullable(),
  via: z.enum(["undo", "system"]).nullable(),
  actorEmail: z.string(),
  actorName: z.string().nullable(),
  patientId: z.uuid().nullable(),
  patientName: z.string().nullable(),
  requestId: z.uuid().nullable(),
  requestName: z.string().nullable(),
  appointmentId: z.uuid().nullable(),
  providerId: z.uuid().nullable(),
  providerName: z.string().nullable(),
  priorProviderId: z.uuid().nullable(),
  priorProviderName: z.string().nullable(),
  locationId: z.uuid().nullable(),
  locationName: z.string().nullable(),
  appointmentTypeId: z.uuid().nullable(),
  appointmentTypeName: z.string().nullable(),
  appointmentStart: timestampSchema.nullable(),
  priorAppointmentStart: timestampSchema.nullable(),
  subjectStaffName: z.string().nullable(),
  recipientEmail: z.string().nullable(),
  entity: z.string(),
  entityId: z.string().nullable(),
  detail: jsonObjectSchema.nullable(),
  before: jsonSchema.nullable(),
  after: jsonSchema.nullable(),
});
export type ActivityRow = z.output<typeof activityRowSchema>;

export const ACTIVITY_FAILURE_CODES = ["unauthorized", "invalid_command", "unavailable"] as const;
export type ActivityFailureCode = (typeof ACTIVITY_FAILURE_CODES)[number];

/**
 * One page. `nextCursor` is null on the last page. `counts` comes with the first page only:
 * `hidden` is how many rows the viewer may see that the current filters leave out (0 when
 * nothing is filtered); later pages carry null.
 */
export const activityPageSchema = z.union([
  z.object({
    ok: z.literal(true),
    rows: z.array(activityRowSchema).readonly(),
    nextCursor: activityCursorSchema,
    counts: z.object({ hidden: z.number().int().nonnegative() }).nullable(),
  }),
  z.object({ ok: z.literal(false), code: z.enum(ACTIVITY_FAILURE_CODES) }),
]);
export type ActivityPage = z.output<typeof activityPageSchema>;

// ---- The address ----
//
// `/admin/audit?category=appointments&action=moved,cancelled&provider=<id>&from=YYYY-MM-DD&to=YYYY-MM-DD`.
// Lists are comma-separated. Search is never in the address.

export type ActivityUrlFilters = Readonly<Omit<ActivityFilters, "query">>;

type SearchParamValue = string | readonly string[] | undefined;

const searchParamSchema = z.union([z.string(), z.array(z.string()).readonly()]);

function firstParam(value: SearchParamValue): string {
  const parsed = searchParamSchema.safeParse(value);
  if (!parsed.success) return "";
  return z.string().safeParse(parsed.data).data ?? parsed.data.at(0) ?? "";
}

function listParam<T extends string>(value: SearchParamValue, allowed: readonly T[]): T[] {
  const words = new Set(firstParam(value).split(","));
  return allowed.filter((candidate) => words.has(candidate));
}

function dateParam(value: SearchParamValue): string | undefined {
  return z.iso.date().safeParse(firstParam(value)).data;
}

/**
 * Read the filters from the page's search params. A value the log does not know is dropped
 * rather than refused, so an old or edited link still opens the log; a reversed date range
 * keeps only its start.
 */
export function parseActivitySearchParams(
  params: Readonly<Record<string, SearchParamValue>>,
): ActivityUrlFilters {
  const categories = listParam(params.category, ACTIVITY_CATEGORIES);
  const actions = listParam(params.action, APPOINTMENT_ACTIONS);
  const providerId = z.uuid().safeParse(firstParam(params.provider)).data;
  const from = dateParam(params.from);
  const to = dateParam(params.to);
  return {
    categories: categories.length > 0 ? categories : undefined,
    appointmentActions: actions.length > 0 ? actions : undefined,
    providerId,
    from,
    to: to !== undefined && from !== undefined && to < from ? undefined : to,
  };
}

/** The address for a set of filters; with none it is `/admin/audit`. Search is never included. */
export function activityHref(filters: ActivityUrlFilters): string {
  const params = new URLSearchParams();
  const categories = ACTIVITY_CATEGORIES.filter((c) => filters.categories?.includes(c) === true);
  if (categories.length > 0) params.set("category", categories.join(","));
  const actions = APPOINTMENT_ACTIONS.filter(
    (a) => filters.appointmentActions?.includes(a) === true,
  );
  if (actions.length > 0) params.set("action", actions.join(","));
  if (filters.providerId !== undefined) params.set("provider", filters.providerId);
  if (filters.from !== undefined) params.set("from", filters.from);
  if (filters.to !== undefined) params.set("to", filters.to);
  const query = params.toString().replaceAll("%2C", ",");
  return `/admin/audit${query === "" ? "" : `?${query}`}`;
}
