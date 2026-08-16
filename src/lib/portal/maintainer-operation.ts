import type { JsonObject } from "@/lib/json";

export type MaintainerFailureCode =
  | "invalid"
  | "not_found"
  | "conflict"
  | "forbidden"
  | "limit"
  | "unconfirmed"
  | "unavailable";

export type MaintainerMutationResult =
  | { ok: true }
  | { ok: false; code: MaintainerFailureCode };

export function getMaintainerManagementState(
  administration: "none" | "read" | "write",
): "permission_upgrade_required" | "ready" {
  return administration === "write"
    ? "ready"
    : "permission_upgrade_required";
}

interface MaintainerState {
  maintainers: { userId: number }[];
  invitations: { userId: number; invitationId: number }[];
}

export function invitationIsActive(
  state: MaintainerState,
  userId: number,
): boolean {
  return (
    state.maintainers.some((maintainer) => maintainer.userId === userId) ||
    state.invitations.some((invitation) => invitation.userId === userId)
  );
}

export function invitationIsCancelled(
  state: MaintainerState,
  userId: number,
  invitationId: number,
): boolean {
  return (
    !state.invitations.some(
      (invitation) => invitation.invitationId === invitationId,
    ) &&
    !state.maintainers.some((maintainer) => maintainer.userId === userId)
  );
}

export function maintainerIsRevoked(
  state: MaintainerState,
  userId: number,
): boolean {
  return !invitationIsActive(state, userId);
}

export async function runMaintainerOperation<Audit, Snapshot>({
  begin,
  perform,
  refresh,
  desired,
  finish,
  failureCode,
  providerStatus,
  afterAttempt,
}: {
  begin(): Promise<Audit>;
  perform(): Promise<number>;
  refresh(): Promise<Snapshot>;
  desired(snapshot: Snapshot): boolean;
  finish(
    audit: Audit,
    outcome: "succeeded" | "failed" | "unconfirmed",
    detail: JsonObject,
  ): Promise<void>;
  failureCode(error: Error | undefined, snapshot: Snapshot): MaintainerFailureCode;
  providerStatus(error: Error): number | null;
  afterAttempt(): void;
}): Promise<MaintainerMutationResult> {
  let audit: Audit;
  try {
    audit = await begin();
  } catch {
    return { ok: false, code: "unavailable" };
  }

  let providerError: Error | undefined;
  let status: number | null = null;
  try {
    status = await perform();
  } catch (error) {
    if (error instanceof Error) {
      providerError = error;
      status = providerStatus(error);
    } else {
      status = null;
    }
  }

  let outcome: "succeeded" | "failed" | "unconfirmed";
  let snapshot: Snapshot | undefined;
  try {
    snapshot = await refresh();
    outcome = desired(snapshot) ? "succeeded" : "failed";
  } catch {
    outcome = "unconfirmed";
  }

  try {
    await finish(
      audit,
      outcome,
      status === null ? {} : { provider_status: status },
    );
  } catch {
    outcome = "unconfirmed";
  } finally {
    afterAttempt();
  }

  if (outcome === "succeeded") return { ok: true };
  if (outcome === "unconfirmed") {
    return { ok: false, code: "unconfirmed" };
  }
  return {
    ok: false,
    code: snapshot ? failureCode(providerError, snapshot) : "unavailable",
  };
}
