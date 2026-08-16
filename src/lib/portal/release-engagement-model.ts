import "server-only";

import { z } from "zod";

import {
  asJsonArray,
  asJsonBoolean,
  asJsonObject,
  asJsonString,
  asJsonTimestamp,
} from "@/lib/json";
import type { Json } from "@/lib/json";

export interface PortalReleaseEngagementRow {
  readonly staffUserId: string;
  readonly displayName: string;
  readonly email: string;
  readonly active: boolean;
  readonly firstOpenedAt: string;
  readonly lastViewedAt: string;
  readonly viewCount: number;
  readonly acknowledgedAt: string | null;
  readonly hiddenAt: string | null;
  readonly guideOpenedAt: string | null;
  readonly lastGuideOpenedAt: string | null;
  readonly guideOpenCount: number;
  readonly lastDismissedAt: string | null;
  readonly dismissCount: number;
}

export type PortalReleaseEngagementResult =
  | { status: "available"; rows: PortalReleaseEngagementRow[] }
  | { status: "unavailable" };

type ReleaseEngagementProfile = Pick<
  PortalReleaseEngagementRow,
  "displayName" | "email" | "active"
>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asCount(value: Json | undefined, minimum: number): number | null {
  const parsed = z.number().int().min(minimum).max(2147483647).safeParse(value);
  return parsed.success ? parsed.data : null;
}

function nullableTimestamp(value: Json | undefined): string | null | undefined {
  if (value === null) return null;
  return asJsonTimestamp(value) ?? undefined;
}

function parseProfile(value: Json | undefined): ReleaseEngagementProfile | null {
  const profile = value === undefined ? null : asJsonObject(value);
  if (profile === null) return null;
  const displayName = (asJsonString(profile.display_name) ?? "").trim();
  const email = (asJsonString(profile.email) ?? "").trim();
  const active = asJsonBoolean(profile.active);
  if (displayName.length === 0 || email.length === 0 || active === null) {
    return null;
  }
  return { displayName, email, active };
}

function parseRow(value: Json): PortalReleaseEngagementRow | null {
  const row = asJsonObject(value);
  if (row === null) return null;
  const profile = parseProfile(row.profile);
  const staffUserId = asJsonString(row.staff_user_id);
  const firstOpenedAt = asJsonTimestamp(row.first_opened_at);
  const lastViewedAt = asJsonTimestamp(row.last_viewed_at);
  const viewCount = asCount(row.view_count, 1);
  const acknowledgedAt = nullableTimestamp(row.acknowledged_at);
  const hiddenAt = nullableTimestamp(row.hidden_at);
  const guideOpenedAt = nullableTimestamp(row.guide_opened_at);
  const lastGuideOpenedAt = nullableTimestamp(row.last_guide_opened_at);
  const guideOpenCount = asCount(row.guide_open_count, 0);
  const lastDismissedAt = nullableTimestamp(row.last_dismissed_at);
  const dismissCount = asCount(row.dismiss_count, 0);
  if (
    staffUserId === null ||
    !UUID_PATTERN.test(staffUserId) ||
    firstOpenedAt === null ||
    lastViewedAt === null ||
    viewCount === null ||
    acknowledgedAt === undefined ||
    hiddenAt === undefined ||
    guideOpenedAt === undefined ||
    lastGuideOpenedAt === undefined ||
    guideOpenCount === null ||
    lastDismissedAt === undefined ||
    dismissCount === null ||
    profile === null
  ) {
    return null;
  }

  const firstOpenedAtMs = Date.parse(firstOpenedAt);
  const lastViewedAtMs = Date.parse(lastViewedAt);
  const guideOpenedAtMs = guideOpenedAt === null ? null : Date.parse(guideOpenedAt);
  const lastGuideOpenedAtMs = lastGuideOpenedAt === null ? null : Date.parse(lastGuideOpenedAt);
  const guideIsConsistent =
    (guideOpenCount === 0 && guideOpenedAtMs === null && lastGuideOpenedAtMs === null) ||
    (guideOpenCount > 0 &&
      guideOpenedAtMs !== null &&
      lastGuideOpenedAtMs !== null &&
      lastGuideOpenedAtMs >= guideOpenedAtMs);
  const dismissIsConsistent =
    (dismissCount === 0 && lastDismissedAt === null) ||
    (dismissCount > 0 && lastDismissedAt !== null);

  if (lastViewedAtMs < firstOpenedAtMs || !guideIsConsistent || !dismissIsConsistent) {
    return null;
  }

  return {
    staffUserId,
    ...profile,
    firstOpenedAt,
    lastViewedAt,
    viewCount,
    acknowledgedAt,
    hiddenAt,
    guideOpenedAt,
    lastGuideOpenedAt,
    guideOpenCount,
    lastDismissedAt,
    dismissCount,
  };
}

export function parsePortalReleaseEngagementRows(value: Json): PortalReleaseEngagementResult {
  const candidates = asJsonArray(value);
  if (candidates === null) return { status: "unavailable" };

  const rows: PortalReleaseEngagementRow[] = [];
  for (const candidate of candidates) {
    const row = parseRow(candidate);
    if (row === null) return { status: "unavailable" };
    rows.push(row);
  }
  return { status: "available", rows };
}
