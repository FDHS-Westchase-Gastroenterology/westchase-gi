import type { JsonObject } from "@/lib/json";

export type MaintainerFailureCode =
  | "invalid"
  | "not_found"
  | "conflict"
  | "forbidden"
  | "limit"
  | "unconfirmed"
  | "unavailable";

export type MaintainerMutationResult = { ok: true } | { ok: false; code: MaintainerFailureCode };

/** The administration permission the practice's GitHub installation grants the portal. */
export type InstallationAdministration = "none" | "read" | "write";

/** How far that installation lets the portal manage maintainers. */
export type MaintainerManagementState =
  /** Installation still covers all repositories; owner must narrow it. */
  | "restrict_installation"
  /** Installation lacks administration write; owner must approve it. */
  | "permission_upgrade_required"
  | "ready";

export function getMaintainerManagementState(
  administration: InstallationAdministration,
): Exclude<MaintainerManagementState, "restrict_installation"> {
  return administration === "write" ? "ready" : "permission_upgrade_required";
}

interface MaintainerState {
  readonly maintainers: readonly { readonly userId: number }[];
  readonly invitations: readonly { readonly userId: number; readonly invitationId: number }[];
}

export function invitationIsActive(state: Readonly<MaintainerState>, userId: number): boolean {
  return (
    state.maintainers.some((maintainer) => maintainer.userId === userId) ||
    state.invitations.some((invitation) => invitation.userId === userId)
  );
}

export function invitationIsCancelled(
  state: Readonly<MaintainerState>,
  userId: number,
  invitationId: number,
): boolean {
  return (
    !state.invitations.some((invitation) => invitation.invitationId === invitationId) &&
    !state.maintainers.some((maintainer) => maintainer.userId === userId)
  );
}

export function maintainerIsRevoked(state: Readonly<MaintainerState>, userId: number): boolean {
  return !invitationIsActive(state, userId);
}

export async function runMaintainerOperation<Audit, Snapshot>(options: {
  begin(): Promise<Audit>;
  perform(): Promise<number>;
  refresh(): Promise<Snapshot>;
  desired(snapshot: Snapshot): boolean;
  finish(
    audit: Audit,
    outcome: "succeeded" | "failed" | "unconfirmed",
    detail: JsonObject,
  ): Promise<void>;
  failureCode(error: Readonly<Error | undefined>, snapshot: Snapshot): MaintainerFailureCode;
  providerStatus(error: Readonly<Error>): number | null;
  afterAttempt(): void;
}): Promise<MaintainerMutationResult> {
  let audit: Audit;
  try {
    audit = await options.begin();
  } catch {
    return { ok: false, code: "unavailable" };
  }

  let providerError: Error | undefined;
  let status: number | null = null;
  try {
    status = await options.perform();
  } catch (error) {
    if (error instanceof Error) {
      providerError = error;
      status = options.providerStatus(error);
    } else {
      status = null;
    }
  }

  let outcome: "succeeded" | "failed" | "unconfirmed";
  let snapshot: Snapshot | undefined;
  try {
    snapshot = await options.refresh();
    outcome = options.desired(snapshot) ? "succeeded" : "failed";
  } catch {
    outcome = "unconfirmed";
  }

  try {
    await options.finish(audit, outcome, status === null ? {} : { provider_status: status });
  } catch {
    outcome = "unconfirmed";
  } finally {
    options.afterAttempt();
  }

  if (outcome === "succeeded") return { ok: true };
  if (outcome === "unconfirmed") {
    return { ok: false, code: "unconfirmed" };
  }
  return {
    ok: false,
    code: snapshot !== undefined ? options.failureCode(providerError, snapshot) : "unavailable",
  };
}
