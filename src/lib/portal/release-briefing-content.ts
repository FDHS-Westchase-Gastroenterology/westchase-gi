export const PORTAL_RELEASE_BRIEFING = {
  id: "2026-08-06-appointment-workflow",
  publishedAt: "2026-08-06T05:00:00-04:00",
  guideHref: "/admin/help#appointment-workflow-guide",
} as const;

export type { PortalReleaseState as PortalReleaseViewState } from "./release-state";

export function isPortalReleaseEligible(onboardedAt: string): boolean {
  const onboarded = Date.parse(onboardedAt);
  const published = Date.parse(PORTAL_RELEASE_BRIEFING.publishedAt);
  return Number.isFinite(onboarded) && onboarded < published;
}
