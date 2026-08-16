export const PORTAL_RELEASE_BRIEFING = {
  id: "2026-07-29-request-workflow",
  publishedAt: "2026-07-29T05:05:11-04:00",
  guideHref: "/admin/help#appointment-workflow-guide",
} as const;

export type { PortalReleaseState as PortalReleaseViewState } from "./release-state";

export function isPortalReleaseEligible(onboardedAt: string): boolean {
  const onboarded = Date.parse(onboardedAt);
  const published = Date.parse(PORTAL_RELEASE_BRIEFING.publishedAt);
  return Number.isFinite(onboarded) && onboarded < published;
}
