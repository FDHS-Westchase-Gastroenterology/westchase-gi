import type { GitHubMaintainer, GitHubMaintainerInvitation } from "./integrations";
import type { MaintainerManagementState } from "./maintainer-operation";

/** Someone who can edit and publish the website; the GitHub identity a revoke submits. */
export type Maintainer = Readonly<GitHubMaintainer>;

/** An invitation not yet accepted; the GitHub identity a cancel submits. */
export type PendingInvitation = Readonly<
  Pick<GitHubMaintainerInvitation, "invitationId" | "login">
>;

/** The staff-facing read of who can change the website, as maintainers.ts composes it. */
export type MaintainerAccessModel =
  | { readonly state: "not_configured" }
  | { readonly state: "unavailable" }
  | {
      readonly state: "connected";
      readonly ownerLogin: string;
      readonly management: MaintainerManagementState;
      /** Null = this deployment cannot read the list yet (never stale data). */
      readonly maintainers: readonly Maintainer[] | null;
      readonly invitations: readonly PendingInvitation[] | null;
    };

export function getMaintainerViewState(
  model: MaintainerAccessModel,
  isAdmin: boolean,
  hasActions: boolean,
) {
  if (model.state !== "connected") {
    return {
      canManage: false,
      showSetup: false,
      showInvitationDisclosure: false,
      showEmptyState: false,
    };
  }

  return {
    canManage: isAdmin && hasActions && model.management === "ready",
    showSetup: isAdmin && model.management !== "ready",
    showInvitationDisclosure: model.maintainers !== null && model.invitations === null,
    showEmptyState: model.maintainers?.length === 0 && model.invitations?.length === 0,
  };
}
