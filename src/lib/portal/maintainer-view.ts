type MaintainerViewModel =
  | { readonly state: "not_configured" | "unavailable" }
  | {
      readonly state: "connected";
      readonly management:
        | "restrict_installation"
        | "permission_upgrade_required"
        | "ready";
      readonly maintainers: readonly unknown[] | null;
      readonly invitations: readonly unknown[] | null;
    };

export function getMaintainerViewState(
  model: Readonly<MaintainerViewModel>,
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
