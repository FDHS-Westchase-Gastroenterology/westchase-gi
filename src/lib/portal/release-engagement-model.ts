import "server-only";

export type PortalReleaseEngagementRow = {
  staffUserId: string;
  displayName: string;
  email: string;
  active: boolean;
  firstOpenedAt: string;
  lastViewedAt: string;
  viewCount: number;
  acknowledgedAt: string | null;
  hiddenAt: string | null;
  guideOpenedAt: string | null;
  lastGuideOpenedAt: string | null;
  guideOpenCount: number;
  lastDismissedAt: string | null;
  dismissCount: number;
};

export type PortalReleaseEngagementResult =
  | { status: "available"; rows: PortalReleaseEngagementRow[] }
  | { status: "unavailable" };

type ReleaseEngagementRecord = {
  staff_user_id?: unknown;
  first_opened_at?: unknown;
  last_viewed_at?: unknown;
  view_count?: unknown;
  acknowledged_at?: unknown;
  hidden_at?: unknown;
  guide_opened_at?: unknown;
  last_guide_opened_at?: unknown;
  guide_open_count?: unknown;
  last_dismissed_at?: unknown;
  dismiss_count?: unknown;
  profile?: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isNullableTimestamp(value: unknown): value is string | null {
  return value === null || isTimestamp(value);
}

function isCount(value: unknown, minimum: number): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= minimum &&
    value <= 2147483647
  );
}

function parseProfile(
  value: unknown,
): Pick<PortalReleaseEngagementRow, "displayName" | "email" | "active"> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const profile = value as Record<string, unknown>;
  const displayName =
    typeof profile.display_name === "string" ? profile.display_name.trim() : "";
  const email = typeof profile.email === "string" ? profile.email.trim() : "";
  if (
    displayName.length === 0 ||
    email.length === 0 ||
    typeof profile.active !== "boolean"
  ) {
    return null;
  }
  return { displayName, email, active: profile.active };
}

function parseRow(value: unknown): PortalReleaseEngagementRow | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const row = value as ReleaseEngagementRecord;
  const profile = parseProfile(row.profile);
  if (
    typeof row.staff_user_id !== "string" ||
    !UUID_PATTERN.test(row.staff_user_id) ||
    !isTimestamp(row.first_opened_at) ||
    !isTimestamp(row.last_viewed_at) ||
    !isCount(row.view_count, 1) ||
    !isNullableTimestamp(row.acknowledged_at) ||
    !isNullableTimestamp(row.hidden_at) ||
    !isNullableTimestamp(row.guide_opened_at) ||
    !isNullableTimestamp(row.last_guide_opened_at) ||
    !isCount(row.guide_open_count, 0) ||
    !isNullableTimestamp(row.last_dismissed_at) ||
    !isCount(row.dismiss_count, 0) ||
    profile === null
  ) {
    return null;
  }

  const firstOpenedAt = Date.parse(row.first_opened_at);
  const lastViewedAt = Date.parse(row.last_viewed_at);
  const guideOpenedAt =
    row.guide_opened_at === null ? null : Date.parse(row.guide_opened_at);
  const lastGuideOpenedAt =
    row.last_guide_opened_at === null
      ? null
      : Date.parse(row.last_guide_opened_at);
  const guideIsConsistent =
    (row.guide_open_count === 0 &&
      guideOpenedAt === null &&
      lastGuideOpenedAt === null) ||
    (row.guide_open_count > 0 &&
      guideOpenedAt !== null &&
      lastGuideOpenedAt !== null &&
      lastGuideOpenedAt >= guideOpenedAt);
  const dismissIsConsistent =
    (row.dismiss_count === 0 && row.last_dismissed_at === null) ||
    (row.dismiss_count > 0 && row.last_dismissed_at !== null);

  if (lastViewedAt < firstOpenedAt || !guideIsConsistent || !dismissIsConsistent) {
    return null;
  }

  return {
    staffUserId: row.staff_user_id,
    ...profile,
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
  };
}

export function parsePortalReleaseEngagementRows(
  value: unknown,
): PortalReleaseEngagementResult {
  if (!Array.isArray(value)) return { status: "unavailable" };

  const rows: PortalReleaseEngagementRow[] = [];
  for (const candidate of value) {
    const row = parseRow(candidate);
    if (row === null) return { status: "unavailable" };
    rows.push(row);
  }
  return { status: "available", rows };
}
