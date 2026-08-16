import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { MaintainerAccessModel } from "@/app/admin/(portal)/settings/software/maintainer-access";
import type { Json } from "@/lib/json";
import { beginExternalAudit, finishExternalAudit } from "@/lib/portal/audit";
import { requireRole } from "@/lib/portal/auth";
import { AUDIT_ACTIONS } from "@/lib/portal/contracts";
import type { AuditAction } from "@/lib/portal/contracts";
import {
  GITHUB_OWNER_ID,
  GITHUB_REPOSITORY_ID,
  getGitHubMaintainerRead,
  gitHubProviderStatus,
  openGitHubMaintainerSession,
} from "@/lib/portal/integrations";
import type { GitHubMaintainerSession, GitHubMaintainerSnapshot } from "@/lib/portal/integrations";
import {
  invitationIsActive,
  invitationIsCancelled,
  maintainerIsRevoked,
  runMaintainerOperation,
} from "@/lib/portal/maintainer-operation";
import type {
  MaintainerFailureCode,
  MaintainerMutationResult,
} from "@/lib/portal/maintainer-operation";
import { serviceClient } from "@/lib/portal/server";

const usernameSchema = z.strictObject({
  username: z
    .string()
    .trim()
    .regex(/^(?!-)(?!.*--)[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/),
});
const invitationSchema = z.strictObject({
  invitationId: z.number().int().positive(),
});
const maintainerSchema = z.strictObject({
  userId: z.number().int().positive(),
});

function failure(code: MaintainerFailureCode): MaintainerMutationResult {
  return { ok: false, code };
}

function providerFailureCode(
  error: Readonly<Error | undefined>,
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

async function openSession(): Promise<GitHubMaintainerSession | MaintainerMutationResult> {
  try {
    return await openGitHubMaintainerSession();
  } catch (error) {
    return failure(
      error instanceof Error && gitHubProviderStatus(error) === 403 ? "forbidden" : "unavailable",
    );
  }
}

function isFailure(
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
  value: Readonly<GitHubMaintainerSession | MaintainerMutationResult>,
): value is MaintainerMutationResult {
  return "ok" in value;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
async function execute({
  actorEmail,
  action,
  operation,
  target,
  invitationId,
  session,
  perform,
  desired,
}: Readonly<{
  actorEmail: string;
  action: AuditAction;
  operation: "invite" | "cancel_invitation" | "revoke";
  target: { userId: number; login: string };
  invitationId?: number;
  session: GitHubMaintainerSession;
  perform(): Promise<number>;
  desired(
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
    snapshot: Readonly<
      GitHubMaintainerSnapshot & {
        invitations: NonNullable<GitHubMaintainerSnapshot["invitations"]>;
      }
    >,
  ): boolean;
}>): Promise<MaintainerMutationResult> {
  const db = serviceClient();
  const detail = {
    provider: "github",
    repository_id: GITHUB_REPOSITORY_ID,
    operation,
    target_login: target.login,
    target_id: target.userId,
  };
  const auditDetail =
    invitationId === undefined ? detail : { ...detail, invitation_id: invitationId };
  return runMaintainerOperation({
    begin: async () =>
      beginExternalAudit(db, {
        actorEmail,
        action,
        entity: "repository_maintainers",
        entityId: null,
        detail: auditDetail,
      }),
    perform,
    refresh: async () => session.refresh(),
    desired,
    finish: async (audit, outcome, detail) => finishExternalAudit(db, audit, outcome, detail),
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

export async function inviteMaintainerMutation(input: Json): Promise<MaintainerMutationResult> {
  const portalSession = await requireRole("admin");
  const parsed = usernameSchema.safeParse(input);
  if (!parsed.success) return failure("invalid");

  const github = await openSession();
  if (isFailure(github)) return github;

  let target;
  try {
    target = await github.resolveUser(parsed.data.username);
  } catch (error) {
    return failure(providerFailureCode(error instanceof Error ? error : undefined, "invite"));
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
    perform: async () => github.invite(target.login),
    desired: (snapshot) => invitationIsActive(snapshot, target.userId),
  });
}

export async function cancelMaintainerInviteMutation(
  input: Json,
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
    perform: async () => github.cancelInvitation(invitation.invitationId),
    desired: (snapshot) =>
      invitationIsCancelled(snapshot, invitation.userId, invitation.invitationId),
  });
}

export async function revokeMaintainerMutation(input: Json): Promise<MaintainerMutationResult> {
  const portalSession = await requireRole("admin");
  const parsed = maintainerSchema.safeParse(input);
  if (!parsed.success || parsed.data.userId === GITHUB_OWNER_ID) {
    return failure("invalid");
  }

  const github = await openSession();
  if (isFailure(github)) return github;
  const target = github.initial.maintainers.find(({ userId }) => userId === parsed.data.userId);
  if (!target) return failure("not_found");

  return execute({
    actorEmail: portalSession.email,
    action: AUDIT_ACTIONS.MAINTAINERS_REVOKE,
    operation: "revoke",
    target,
    session: github,
    perform: async () => github.revoke(target.login),
    desired: (snapshot) => maintainerIsRevoked(snapshot, target.userId),
  });
}
