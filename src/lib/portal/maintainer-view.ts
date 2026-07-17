type MaintainerViewModel =
  | { state: "not_configured" | "unavailable" }
  | {
      state: "connected";
      management:
        | "restrict_installation"
        | "permission_upgrade_required"
        | "ready";
      maintainers: unknown[] | null;
      invitations: unknown[] | null;
    };

export function getMaintainerViewState(
  model: MaintainerViewModel,
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
    showInvitationDisclosure:
      model.maintainers !== null && model.invitations === null,
    showEmptyState:
      model.maintainers?.length === 0 && model.invitations?.length === 0,
  };
}
