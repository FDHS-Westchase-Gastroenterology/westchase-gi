export const PORTAL_RELEASE_WINDOW_MS = 48 * 60 * 60 * 1000;
export const PORTAL_RELEASE_ID_MAX_LENGTH = 80;

export const RELEASE_AUDIT_ACTIONS = {
  STAFF_RELEASE_OPEN: "staff.release_open",
  STAFF_RELEASE_ACKNOWLEDGE: "staff.release_acknowledge",
  STAFF_RELEASE_HIDE: "staff.release_hide",
} as const;

export type PortalReleaseAuditAction =
  (typeof RELEASE_AUDIT_ACTIONS)[keyof typeof RELEASE_AUDIT_ACTIONS];

export type PortalReleaseState =
  | { status: "unseen" }
  | {
      status: "available";
      firstOpenedAt: string;
      acknowledgedAt: string | null;
    }
  | { status: "hidden" }
  | { status: "expired" }
  | { status: "unavailable" };

export type PortalReleaseStateRow = {
  first_opened_at: unknown;
  acknowledged_at: unknown;
  hidden_at: unknown;
};

const RELEASE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

export function parsePortalReleaseId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const releaseId = value.trim();
  if (
    releaseId !== value ||
    releaseId.length < 1 ||
    releaseId.length > PORTAL_RELEASE_ID_MAX_LENGTH ||
    !RELEASE_ID_PATTERN.test(releaseId)
  ) {
    return null;
  }
  return releaseId;
}

export function parseSupportedPortalReleaseId(
  value: unknown,
  supportedReleaseId: string,
): string | null {
  const releaseId = parsePortalReleaseId(value);
  return releaseId === supportedReleaseId ? releaseId : null;
}

export function isPortalReleaseAuditAction(
  action: string,
): action is PortalReleaseAuditAction {
  return Object.values(RELEASE_AUDIT_ACTIONS).includes(
    action as PortalReleaseAuditAction,
  );
}

function validIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function derivePortalReleaseState(
  row: PortalReleaseStateRow | null,
  now: Date = new Date(),
): PortalReleaseState {
  if (row === null) return { status: "unseen" };
  if (
    !validIsoTimestamp(row.first_opened_at) ||
    (row.acknowledged_at !== null &&
      !validIsoTimestamp(row.acknowledged_at)) ||
    (row.hidden_at !== null && !validIsoTimestamp(row.hidden_at)) ||
    !Number.isFinite(now.getTime())
  ) {
    return { status: "unavailable" };
  }
  if (row.hidden_at !== null) return { status: "hidden" };
  if (
    Date.parse(row.first_opened_at) + PORTAL_RELEASE_WINDOW_MS <=
    now.getTime()
  ) {
    return { status: "expired" };
  }
  return {
    status: "available",
    firstOpenedAt: row.first_opened_at,
    acknowledgedAt: row.acknowledged_at,
  };
}
