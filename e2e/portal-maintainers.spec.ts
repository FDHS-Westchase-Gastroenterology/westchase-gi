import { test, expect } from "@playwright/test";
import {
  GitHubApiError,
  readGitHubResponse,
} from "../src/lib/portal/github-response";
import {
  invitationIsCancelled,
  runMaintainerOperation,
} from "../src/lib/portal/maintainer-operation";
import { getMaintainerViewState } from "../src/lib/portal/maintainer-view";

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "provider contract");
});

test("GitHub responses preserve status and accept empty success bodies", async () => {
  await expect(
    readGitHubResponse(
      new Response(JSON.stringify({ id: 7 }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  ).resolves.toEqual({ status: 201, data: { id: 7 } });
  await expect(readGitHubResponse(new Response(null, { status: 204 }))).resolves.toEqual({
    status: 204,
    data: null,
  });

  const malformed = await readGitHubResponse(
    new Response("not-json", { status: 200 }),
  ).catch((error: unknown) => error);
  expect(malformed).toBeInstanceOf(GitHubApiError);
  expect((malformed as GitHubApiError).kind).toBe("invalid_response");

  for (const status of [403, 422, 500]) {
    const failure = await readGitHubResponse(
      new Response(JSON.stringify({ ignored: "provider detail" }), { status }),
    ).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(GitHubApiError);
    expect((failure as GitHubApiError).status).toBe(status);
  }
});

test("external maintainer operations fail closed around audit and reconciliation", async () => {
  const calls: string[] = [];
  const blocked = await runMaintainerOperation({
    begin: async () => {
      calls.push("begin");
      throw new Error("audit unavailable");
    },
    perform: async () => {
      calls.push("perform");
      return 204;
    },
    refresh: async () => ({ present: true }),
    desired: ({ present }) => present,
    finish: async () => undefined,
    failureCode: () => "unavailable",
    providerStatus: () => null,
    afterAttempt: () => calls.push("after"),
  });
  expect(blocked).toEqual({ ok: false, code: "unavailable" });
  expect(calls).toEqual(["begin"]);

  let finalOutcome = "";
  const succeeded = await runMaintainerOperation({
    begin: async () => "audit-id",
    perform: async () => 204,
    refresh: async () => ({ present: true }),
    desired: ({ present }) => present,
    finish: async (_audit, outcome) => {
      finalOutcome = outcome;
    },
    failureCode: () => "unavailable",
    providerStatus: () => null,
    afterAttempt: () => undefined,
  });
  expect(succeeded).toEqual({ ok: true });
  expect(finalOutcome).toBe("succeeded");

  let finalDetail: Record<string, unknown> = {};
  const limited = await runMaintainerOperation({
    begin: async () => "audit-id",
    perform: async () => {
      throw new GitHubApiError(422);
    },
    refresh: async () => ({ present: false }),
    desired: ({ present }) => present,
    finish: async (_audit, outcome, detail) => {
      finalOutcome = outcome;
      finalDetail = detail;
    },
    failureCode: () => "limit",
    providerStatus: (error) =>
      error instanceof GitHubApiError ? error.status : null,
    afterAttempt: () => undefined,
  });
  expect(limited).toEqual({ ok: false, code: "limit" });
  expect(finalOutcome).toBe("failed");
  expect(finalDetail).toEqual({ provider_status: 422 });

  const unconfirmed = await runMaintainerOperation({
    begin: async () => "audit-id",
    perform: async () => {
      throw new GitHubApiError(null);
    },
    refresh: async () => {
      throw new Error("read unavailable");
    },
    desired: () => false,
    finish: async (_audit, outcome) => {
      finalOutcome = outcome;
    },
    failureCode: () => "unavailable",
    providerStatus: (error) =>
      error instanceof GitHubApiError ? error.status : null,
    afterAttempt: () => undefined,
  });
  expect(unconfirmed).toEqual({ ok: false, code: "unconfirmed" });
  expect(finalOutcome).toBe("unconfirmed");

  const pending = await runMaintainerOperation({
    begin: async () => "audit-id",
    perform: async () => 204,
    refresh: async () => ({ present: true }),
    desired: ({ present }) => present,
    finish: async () => {
      throw new Error("audit finish unavailable");
    },
    failureCode: () => "unavailable",
    providerStatus: () => null,
    afterAttempt: () => undefined,
  });
  expect(pending).toEqual({ ok: false, code: "unconfirmed" });
});

test("cancelling an invitation does not claim success after concurrent acceptance", async () => {
  expect(
    invitationIsCancelled(
      {
        invitations: [],
        maintainers: [{ userId: 42 }],
      },
      42,
      99,
    ),
  ).toBe(false);
  expect(
    invitationIsCancelled(
      {
        invitations: [],
        maintainers: [],
      },
      42,
      99,
    ),
  ).toBe(true);

  const conflict = await runMaintainerOperation({
    begin: async () => "audit-id",
    perform: async () => 204,
    refresh: async () => ({
      invitations: [],
      maintainers: [{ userId: 42 }],
    }),
    desired: (snapshot) => invitationIsCancelled(snapshot, 42, 99),
    finish: async () => undefined,
    failureCode: () => "conflict",
    providerStatus: () => null,
    afterAttempt: () => undefined,
  });
  expect(conflict).toEqual({ ok: false, code: "conflict" });
});

test("maintainer view states keep blocked and staff controls fail closed", () => {
  const base = {
    state: "connected" as const,
    maintainers: [],
    invitations: [],
  };

  expect(
    getMaintainerViewState(
      { ...base, management: "restrict_installation" },
      true,
      true,
    ),
  ).toMatchObject({ canManage: false, showSetup: true });
  expect(
    getMaintainerViewState(
      {
        ...base,
        management: "permission_upgrade_required",
        invitations: null,
      },
      true,
      true,
    ),
  ).toMatchObject({
    canManage: false,
    showSetup: true,
    showInvitationDisclosure: true,
  });
  expect(
    getMaintainerViewState({ ...base, management: "ready" }, true, true),
  ).toMatchObject({ canManage: true, showSetup: false, showEmptyState: true });
  expect(
    getMaintainerViewState({ ...base, management: "ready" }, false, false),
  ).toMatchObject({ canManage: false, showSetup: false });
});
