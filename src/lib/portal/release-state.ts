import { z } from "zod";

import { asJsonString, asJsonTimestamp } from "@/lib/json";
import type { Json } from "@/lib/json";

export const PORTAL_RELEASE_WINDOW_MS = 48 * 60 * 60 * 1000;
export const PORTAL_RELEASE_ID_MAX_LENGTH = 80;

export const RELEASE_AUDIT_ACTIONS = {
  STAFF_RELEASE_OPEN: "staff.release_open",
  STAFF_RELEASE_VIEW: "staff.release_view",
  STAFF_RELEASE_GUIDE_OPEN: "staff.release_guide_open",
  STAFF_RELEASE_DISMISS: "staff.release_dismiss",
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

export const portalReleaseStateRowSchema = z.object({
  first_opened_at: z.string().nullable(),
  acknowledged_at: z.string().nullable(),
  hidden_at: z.string().nullable(),
});

export interface PortalReleaseStateRow {
  first_opened_at: Json;
  acknowledged_at: Json;
  hidden_at: Json;
}

const RELEASE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

const PORTAL_RELEASE_AUDIT_ACTIONS = new Set<string>(Object.values(RELEASE_AUDIT_ACTIONS));

export function parsePortalReleaseId(value: Json): string | null {
  const text = asJsonString(value);
  if (text === null) return null;
  const releaseId = text.trim();
  if (
    releaseId !== text ||
    releaseId.length < 1 ||
    releaseId.length > PORTAL_RELEASE_ID_MAX_LENGTH ||
    !RELEASE_ID_PATTERN.test(releaseId)
  ) {
    return null;
  }
  return releaseId;
}

export function parseSupportedPortalReleaseId(
  value: Json,
  supportedReleaseId: string,
): string | null {
  const releaseId = parsePortalReleaseId(value);
  return releaseId === supportedReleaseId ? releaseId : null;
}

export function isPortalReleaseAuditAction(action: string): action is PortalReleaseAuditAction {
  return PORTAL_RELEASE_AUDIT_ACTIONS.has(action);
}

export function derivePortalReleaseState(
  row: Readonly<PortalReleaseStateRow | null>,
  now: Date = new Date(),
): PortalReleaseState {
  if (row === null) return { status: "unseen" };
  const firstOpenedAt = asJsonTimestamp(row.first_opened_at);
  const acknowledgedAt = row.acknowledged_at === null ? null : asJsonTimestamp(row.acknowledged_at);
  const hiddenAt = row.hidden_at === null ? null : asJsonTimestamp(row.hidden_at);
  if (
    firstOpenedAt === null ||
    (acknowledgedAt === null && row.acknowledged_at !== null) ||
    (hiddenAt === null && row.hidden_at !== null) ||
    !Number.isFinite(now.getTime())
  ) {
    return { status: "unavailable" };
  }
  if (hiddenAt !== null) return { status: "hidden" };
  if (Date.parse(firstOpenedAt) + PORTAL_RELEASE_WINDOW_MS <= now.getTime()) {
    return { status: "expired" };
  }
  return {
    status: "available",
    firstOpenedAt,
    acknowledgedAt,
  };
}
