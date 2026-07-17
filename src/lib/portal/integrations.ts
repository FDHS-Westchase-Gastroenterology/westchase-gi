import "server-only";

import {
  createPrivateKey,
  sign as signBytes,
  type KeyObject,
} from "node:crypto";
import {
  GitHubApiError,
  readGitHubResponse,
} from "@/lib/portal/github-response";

const GITHUB_API = "https://api.github.com";
const GITHUB_API_VERSION = "2026-03-10";
const GITHUB_ACCOUNT = "FDHS-Westchase-Gastroenterology";
export const GITHUB_OWNER_ID = 305283597;
const GITHUB_REPOSITORY_NAME = "westchase-gi";
export const GITHUB_REPOSITORY_ID = 1289668601;
export const CANONICAL_REPOSITORY =
  `${GITHUB_ACCOUNT}/${GITHUB_REPOSITORY_NAME}`;

export type GitHubMaintainer = { userId: number; login: string };
export type GitHubMaintainerInvitation = {
  invitationId: number;
  userId: number;
  login: string;
};
export type GitHubMaintainerSnapshot = {
  ownerLogin: string;
  management:
    | "restrict_installation"
    | "permission_upgrade_required"
    | "ready";
  maintainers: GitHubMaintainer[];
  invitations: GitHubMaintainerInvitation[] | null;
};

export type GitHubMaintainerRead =
  | { state: "not_configured" | "unavailable" }
  | ({ state: "connected" } & GitHubMaintainerSnapshot);

export type GitHubMaintainerSession = {
  initial: GitHubMaintainerSnapshot & {
    invitations: GitHubMaintainerInvitation[];
  };
  resolveUser(username: string): Promise<GitHubMaintainer>;
  invite(username: string): Promise<number>;
  cancelInvitation(invitationId: number): Promise<number>;
  revoke(username: string): Promise<number>;
  refresh(): Promise<
    GitHubMaintainerSnapshot & { invitations: GitHubMaintainerInvitation[] }
  >;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function readGithubConfiguration(): {
  appId: string;
  installationId: string;
  privateKey: KeyObject;
} | null {
  const appId = process.env.PORTAL_GITHUB_APP_ID?.trim() ?? "";
  const installationId =
    process.env.PORTAL_GITHUB_APP_INSTALLATION_ID?.trim() ?? "";
  const rawPrivateKey =
    process.env.PORTAL_GITHUB_APP_PRIVATE_KEY?.trim() ?? "";
  const values = [appId, installationId, rawPrivateKey];

  if (values.every((value) => value === "")) return null;
  if (values.some((value) => value === "")) {
    throw new Error("Incomplete GitHub App configuration");
  }
  if (!/^[1-9]\d*$/.test(appId) || !/^[1-9]\d*$/.test(installationId)) {
    throw new Error("Invalid GitHub App identifiers");
  }

  const pem = rawPrivateKey.includes("-----BEGIN")
    ? rawPrivateKey.replaceAll("\\n", "\n")
    : Buffer.from(rawPrivateKey, "base64").toString("utf8");
  const privateKey = createPrivateKey(pem.trim());
  if (privateKey.asymmetricKeyType !== "rsa") {
    throw new Error("Invalid GitHub App private key");
  }

  return { appId, installationId, privateKey };
}

function encodeJwtPart(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function createAppJwt(appId: string, privateKey: KeyObject): string {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${encodeJwtPart({ alg: "RS256", typ: "JWT" })}.${encodeJwtPart({
    iat: now - 60,
    exp: now + 9 * 60,
    iss: appId,
  })}`;
  const signature = signBytes(
    "RSA-SHA256",
    Buffer.from(unsigned),
    privateKey,
  ).toString("base64url");
  return `${unsigned}.${signature}`;
}

async function githubRequest(
  path: string,
  token: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: string;
  } = {},
): Promise<{ status: number; data: unknown }> {
  let response: Response;
  try {
    response = await fetch(`${GITHUB_API}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "westchase-gi-portal",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body,
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new GitHubApiError(null);
  }
  return readGitHubResponse(response);
}

function parseInstallation(data: unknown): {
  repositorySelection: "all" | "selected";
  administration: "none" | "read" | "write";
} {
  if (
    !isRecord(data) ||
    !isRecord(data.account) ||
    data.account.login !== GITHUB_ACCOUNT ||
    data.account.id !== GITHUB_OWNER_ID ||
    data.account.type !== "User" ||
    data.target_type !== "User" ||
    (data.repository_selection !== "all" &&
      data.repository_selection !== "selected") ||
    data.suspended_at !== null ||
    !isRecord(data.permissions)
  ) {
    throw new GitHubApiError(null, "invalid_response");
  }

  return {
    repositorySelection: data.repository_selection,
    administration:
      data.permissions.administration === "write"
        ? "write"
        : data.permissions.administration === "read"
          ? "read"
          : "none",
  };
}

function parseToken(data: unknown): string {
  if (!isRecord(data) || typeof data.token !== "string" || !data.token) {
    throw new GitHubApiError(null, "invalid_response");
  }
  return data.token;
}

function verifyRepository(data: unknown): void {
  if (
    !isRecord(data) ||
    data.id !== GITHUB_REPOSITORY_ID ||
    data.full_name !== CANONICAL_REPOSITORY ||
    !isRecord(data.owner) ||
    data.owner.id !== GITHUB_OWNER_ID ||
    data.owner.login !== GITHUB_ACCOUNT
  ) {
    throw new GitHubApiError(null, "invalid_response");
  }
}

async function githubPages(path: string, token: string): Promise<unknown[]> {
  const rows: unknown[] = [];
  for (let page = 1; ; page += 1) {
    const separator = path.includes("?") ? "&" : "?";
    const { data } = await githubRequest(
      `${path}${separator}per_page=100&page=${page}`,
      token,
    );
    if (!Array.isArray(data)) {
      throw new GitHubApiError(null, "invalid_response");
    }
    rows.push(...data);
    if (data.length < 100) return rows;
  }
}

function parseMaintainers(rows: unknown[]): GitHubMaintainer[] {
  const maintainers: GitHubMaintainer[] = [];
  for (const row of rows) {
    if (
      !isRecord(row) ||
      !isPositiveInteger(row.id) ||
      typeof row.login !== "string" ||
      !row.login ||
      (row.id !== GITHUB_OWNER_ID && row.role_name !== "write")
    ) {
      throw new GitHubApiError(null, "invalid_response");
    }
    if (row.id !== GITHUB_OWNER_ID) {
      maintainers.push({ userId: row.id, login: row.login });
    }
  }
  return maintainers;
}

function parseInvitations(rows: unknown[]): GitHubMaintainerInvitation[] {
  return rows.map((row) => {
    if (
      !isRecord(row) ||
      !isPositiveInteger(row.id) ||
      !isRecord(row.invitee) ||
      !isPositiveInteger(row.invitee.id) ||
      typeof row.invitee.login !== "string" ||
      !row.invitee.login
    ) {
      throw new GitHubApiError(null, "invalid_response");
    }
    return {
      invitationId: row.id,
      userId: row.invitee.id,
      login: row.invitee.login,
    };
  });
}

async function readSnapshot(
  token: string,
  management: GitHubMaintainerSnapshot["management"],
  canReadInvitations: boolean,
): Promise<GitHubMaintainerSnapshot> {
  const [collaborators, invitations] = await Promise.all([
    githubPages(
      `/repos/${GITHUB_ACCOUNT}/${GITHUB_REPOSITORY_NAME}/collaborators?affiliation=direct`,
      token,
    ),
    canReadInvitations
      ? githubPages(
          `/repos/${GITHUB_ACCOUNT}/${GITHUB_REPOSITORY_NAME}/invitations`,
          token,
        )
      : null,
  ]);
  return {
    ownerLogin: GITHUB_ACCOUNT,
    management,
    maintainers: parseMaintainers(collaborators),
    invitations: invitations === null ? null : parseInvitations(invitations),
  };
}

async function openConnection(mode: "read" | "write") {
  const configuration = readGithubConfiguration();
  if (!configuration) throw new GitHubApiError(null);

  const appJwt = createAppJwt(configuration.appId, configuration.privateKey);
  const installation = parseInstallation(
    (
      await githubRequest(
        `/app/installations/${configuration.installationId}`,
        appJwt,
      )
    ).data,
  );
  const management: GitHubMaintainerSnapshot["management"] =
    installation.repositorySelection === "all"
      ? "restrict_installation"
      : installation.administration === "write"
        ? "ready"
        : "permission_upgrade_required";
  if (mode === "write" && management !== "ready") {
    throw new GitHubApiError(403);
  }

  // ponytail: this staff-only workflow mints on demand; cache the one-hour
  // token only if measured GitHub traffic makes the extra request material.
  const permissions: Record<string, "read" | "write"> = { metadata: "read" };
  if (installation.administration !== "none") {
    permissions.administration = mode;
  }
  const token = parseToken(
    (
      await githubRequest(
        `/app/installations/${configuration.installationId}/access_tokens`,
        appJwt,
        {
          method: "POST",
          body: JSON.stringify({
            repository_ids: [GITHUB_REPOSITORY_ID],
            permissions,
          }),
        },
      )
    ).data,
  );
  verifyRepository(
    (
      await githubRequest(
        `/repos/${GITHUB_ACCOUNT}/${GITHUB_REPOSITORY_NAME}`,
        token,
      )
    ).data,
  );

  return {
    token,
    management,
    canReadInvitations: installation.administration !== "none",
  };
}

export function gitHubProviderStatus(error: unknown): number | null {
  return error instanceof GitHubApiError ? error.status : null;
}

export async function getGitHubMaintainerRead(): Promise<GitHubMaintainerRead> {
  let configuration: ReturnType<typeof readGithubConfiguration>;
  try {
    configuration = readGithubConfiguration();
  } catch {
    return { state: "unavailable" };
  }
  if (!configuration) return { state: "not_configured" };

  try {
    const connection = await openConnection("read");
    return {
      state: "connected",
      ...(await readSnapshot(
        connection.token,
        connection.management,
        connection.canReadInvitations,
      )),
    };
  } catch {
    console.error("[portal-integrations] GitHub connection unavailable");
    return { state: "unavailable" };
  }
}

export async function openGitHubMaintainerSession(): Promise<GitHubMaintainerSession> {
  const connection = await openConnection("write");
  const refresh = async () => {
    const snapshot = await readSnapshot(connection.token, "ready", true);
    if (snapshot.invitations === null) {
      throw new GitHubApiError(null, "invalid_response");
    }
    return { ...snapshot, invitations: snapshot.invitations };
  };

  return {
    initial: await refresh(),
    async resolveUser(username) {
      const { data } = await githubRequest(
        `/users/${encodeURIComponent(username)}`,
        connection.token,
      );
      if (
        !isRecord(data) ||
        !isPositiveInteger(data.id) ||
        typeof data.login !== "string" ||
        !data.login ||
        data.type !== "User"
      ) {
        throw new GitHubApiError(null, "invalid_response");
      }
      return { userId: data.id, login: data.login };
    },
    async invite(username) {
      return (
        await githubRequest(
          `/repos/${GITHUB_ACCOUNT}/${GITHUB_REPOSITORY_NAME}/collaborators/${encodeURIComponent(username)}`,
          connection.token,
          { method: "PUT" },
        )
      ).status;
    },
    async cancelInvitation(invitationId) {
      return (
        await githubRequest(
          `/repos/${GITHUB_ACCOUNT}/${GITHUB_REPOSITORY_NAME}/invitations/${invitationId}`,
          connection.token,
          { method: "DELETE" },
        )
      ).status;
    },
    async revoke(username) {
      return (
        await githubRequest(
          `/repos/${GITHUB_ACCOUNT}/${GITHUB_REPOSITORY_NAME}/collaborators/${encodeURIComponent(username)}`,
          connection.token,
          { method: "DELETE" },
        )
      ).status;
    },
    refresh,
  };
}
