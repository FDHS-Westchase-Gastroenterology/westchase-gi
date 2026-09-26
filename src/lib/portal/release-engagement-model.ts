import "server-only";

import { z } from "zod";

import { asJsonArray } from "@/lib/json";
import type { Json } from "@/lib/json";

const timestamp = z.string().refine((value) => Number.isFinite(Date.parse(value)));
const count = z.number().int().min(0).max(2147483647);
const engagementRowSchema = z
  .object({
    staff_user_id: z
      .string()
      .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
    first_opened_at: timestamp,
    last_viewed_at: timestamp,
    view_count: count.min(1),
    acknowledged_at: timestamp.nullable(),
    hidden_at: timestamp.nullable(),
    guide_opened_at: timestamp.nullable(),
    last_guide_opened_at: timestamp.nullable(),
    guide_open_count: count,
    last_dismissed_at: timestamp.nullable(),
    dismiss_count: count,
    profile: z.object({
      display_name: z.string().trim().min(1),
      email: z.string().trim().min(1),
      active: z.boolean(),
    }),
  })
  .refine((row) => Date.parse(row.last_viewed_at) >= Date.parse(row.first_opened_at))
  .refine((row) =>
    row.guide_open_count === 0
      ? row.guide_opened_at === null && row.last_guide_opened_at === null
      : row.guide_opened_at !== null &&
        row.last_guide_opened_at !== null &&
        Date.parse(row.last_guide_opened_at) >= Date.parse(row.guide_opened_at),
  )
  .refine((row) =>
    row.dismiss_count === 0 ? row.last_dismissed_at === null : row.last_dismissed_at !== null,
  )
  .transform((row) => ({
    staffUserId: row.staff_user_id,
    displayName: row.profile.display_name,
    email: row.profile.email,
    active: row.profile.active,
    firstOpenedAt: row.first_opened_at,
    lastViewedAt: row.last_viewed_at,
    viewCount: row.view_count,
    acknowledgedAt: row.acknowledged_at,
    hiddenAt: row.hidden_at,
    guideOpenedAt: row.guide_opened_at,
    lastGuideOpenedAt: row.last_guide_opened_at,
    guideOpenCount: row.guide_open_count,
    lastDismissedAt: row.last_dismissed_at,
    dismissCount: row.dismiss_count,
  }));

export type PortalReleaseEngagementRow = Readonly<z.output<typeof engagementRowSchema>>;

export type PortalReleaseEngagementResult =
  | { status: "available"; rows: PortalReleaseEngagementRow[] }
  | { status: "unavailable" };

export function parsePortalReleaseEngagementRows(value: Json): PortalReleaseEngagementResult {
  const candidates = asJsonArray(value);
  if (candidates === null) return { status: "unavailable" };
  const parsed = z.array(engagementRowSchema).safeParse(candidates);
  return parsed.success ? { status: "available", rows: parsed.data } : { status: "unavailable" };
}
