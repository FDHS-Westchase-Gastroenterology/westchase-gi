import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  beginExternalAudit,
  finishExternalAudit,
} from "@/lib/portal/audit";
import { requireRole } from "@/lib/portal/auth";
import { AUDIT_ACTIONS, type AuditAction } from "@/lib/portal/contracts";
import {
  GITHUB_OWNER_ID,
  GITHUB_REPOSITORY_ID,
  getGitHubMaintainerRead,
  gitHubProviderStatus,
  openGitHubMaintainerSession,
  type GitHubMaintainerSession,
  type GitHubMaintainerSnapshot,
} from "@/lib/portal/integrations";
import {
  invitationIsActive,
  invitationIsCancelled,
  maintainerIsRevoked,
  runMaintainerOperation,
  type MaintainerFailureCode,
  type MaintainerMutationResult,
} from "@/lib/portal/maintainer-operation";
import { serviceClient } from "@/lib/portal/server";
import type { MaintainerAccessModel } from "@/app/admin/(portal)/settings/software/maintainer-access";

const usernameSchema = z.strictObject({
  username: z
    .string()
    .trim()
    .regex(/^(?!-)(?!.*--)[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/),
});
const invitationSchema = z.strictObject({
  invitationId: z.number().int().positive().safe(),
});
const maintainerSchema = z.strictObject({
  userId: z.number().int().positive().safe(),
});

function failure(code: MaintainerFailureCode): MaintainerMutationResult {
  return { ok: false, code };
}

function providerFailureCode(
  error: unknown,
  operation: "invite" | "cancel_invitation" | "revoke",
): MaintainerFailureCode {
  const status = gitHubProviderStatus(error);
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (operation === "invite" && (status === 422 || status === 429)) {
    return "limit";
  }
  return "unavailable";
}

function revalidateMaintainerViews(): void {
  revalidatePath("/admin/settings/software");
  revalidatePath("/admin/audit");
}

export async function getMaintainerAccessModel(): Promise<MaintainerAccessModel> {
  await requireRole("staff");
  const read = await getGitHubMaintainerRead();
  if (read.state !== "connected") return { state: read.state };

  return {
    state: "connected",
    ownerLogin: read.ownerLogin,
    management: read.management,
    maintainers: read.maintainers,
    invitations:
      read.invitations?.map(({ invitationId, login }) => ({
        invitationId,
        login,
      })) ?? null,
  };
}

async function openSession(): Promise<
  GitHubMaintainerSession | MaintainerMutationResult
> {
  try {
    return await openGitHubMaintainerSession();
  } catch (error) {
    return failure(gitHubProviderStatus(error) === 403 ? "forbidden" : "unavailable");
  }
}

function isFailure(
  value: GitHubMaintainerSession | MaintainerMutationResult,
): value is MaintainerMutationResult {
  return "ok" in value;
}

async function execute({
  actorEmail,
  action,
  operation,
  target,
  invitationId,
  session,
  perform,
  desired,
}: {
  actorEmail: string;
  action: AuditAction;
  operation: "invite" | "cancel_invitation" | "revoke";
  target: { userId: number; login: string };
  invitationId?: number;
  session: GitHubMaintainerSession;
  perform(): Promise<number>;
  desired(snapshot: GitHubMaintainerSnapshot & {
    invitations: NonNullable<GitHubMaintainerSnapshot["invitations"]>;
  }): boolean;
}): Promise<MaintainerMutationResult> {
  const db = serviceClient();
  return runMaintainerOperation({
    begin: () =>
      beginExternalAudit(db, {
        actorEmail,
        action,
        entity: "repository_maintainers",
        entityId: null,
        detail: {
          provider: "github",
          repository_id: GITHUB_REPOSITORY_ID,
          operation,
          target_login: target.login,
          target_id: target.userId,
          ...(invitationId === undefined
            ? {}
            : { invitation_id: invitationId }),
        },
      }),
    perform,
    refresh: session.refresh,
    desired,
    finish: (audit, outcome, detail) =>
      finishExternalAudit(db, audit, outcome, detail),
    failureCode: (error, snapshot) => {
      if (
        operation === "cancel_invitation" &&
        snapshot.maintainers.some(({ userId }) => userId === target.userId)
      ) {
        return "conflict";
      }
      if (
        operation === "revoke" &&
        snapshot.invitations.some(({ userId }) => userId === target.userId)
      ) {
        return "conflict";
      }
      return providerFailureCode(error, operation);
    },
    providerStatus: gitHubProviderStatus,
    afterAttempt: revalidateMaintainerViews,
  });
}

export async function inviteMaintainerMutation(
  input: unknown,
): Promise<MaintainerMutationResult> {
  const portalSession = await requireRole("admin");
  const parsed = usernameSchema.safeParse(input);
  if (!parsed.success) return failure("invalid");

  const github = await openSession();
  if (isFailure(github)) return github;

  let target;
  try {
    target = await github.resolveUser(parsed.data.username);
  } catch (error) {
    return failure(providerFailureCode(error, "invite"));
  }
  if (target.userId === GITHUB_OWNER_ID) return failure("conflict");
  if (
    github.initial.maintainers.some(({ userId }) => userId === target.userId) ||
    github.initial.invitations.some(({ userId }) => userId === target.userId)
  ) {
    return failure("conflict");
  }

  return execute({
    actorEmail: portalSession.email,
    action: AUDIT_ACTIONS.MAINTAINERS_INVITE,
    operation: "invite",
    target,
    session: github,
    perform: () => github.invite(target.login),
    desired: (snapshot) => invitationIsActive(snapshot, target.userId),
  });
}

export async function cancelMaintainerInviteMutation(
  input: unknown,
): Promise<MaintainerMutationResult> {
  const portalSession = await requireRole("admin");
  const parsed = invitationSchema.safeParse(input);
  if (!parsed.success) return failure("invalid");

  const github = await openSession();
  if (isFailure(github)) return github;
  const invitation = github.initial.invitations.find(
    ({ invitationId }) => invitationId === parsed.data.invitationId,
  );
  if (!invitation) return failure("not_found");
  if (invitation.userId === GITHUB_OWNER_ID) return failure("invalid");

  return execute({
    actorEmail: portalSession.email,
    action: AUDIT_ACTIONS.MAINTAINERS_CANCEL,
    operation: "cancel_invitation",
    target: invitation,
    invitationId: invitation.invitationId,
    session: github,
    perform: () => github.cancelInvitation(invitation.invitationId),
    desired: (snapshot) =>
      invitationIsCancelled(
        snapshot,
        invitation.userId,
        invitation.invitationId,
      ),
  });
}

export async function revokeMaintainerMutation(
  input: unknown,
): Promise<MaintainerMutationResult> {
  const portalSession = await requireRole("admin");
  const parsed = maintainerSchema.safeParse(input);
  if (!parsed.success || parsed.data.userId === GITHUB_OWNER_ID) {
    return failure("invalid");
  }

  const github = await openSession();
  if (isFailure(github)) return github;
  const target = github.initial.maintainers.find(
    ({ userId }) => userId === parsed.data.userId,
  );
  if (!target) return failure("not_found");

  return execute({
    actorEmail: portalSession.email,
    action: AUDIT_ACTIONS.MAINTAINERS_REVOKE,
    operation: "revoke",
    target,
    session: github,
    perform: () => github.revoke(target.login),
    desired: (snapshot) => maintainerIsRevoked(snapshot, target.userId),
  });
}
