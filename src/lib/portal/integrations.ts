import "server-only";

import { createPrivateKey, sign as signBytes } from "node:crypto";
import type { KeyObject } from "node:crypto";
import { z } from "zod";
import { asJsonArray, asJsonNumber, asJsonObject, asJsonString } from "@/lib/json";
import type { Json } from "@/lib/json";
import {
  GitHubApiError,
  readGitHubResponse,
} from "@/lib/portal/github-response";
import { getMaintainerManagementState } from "@/lib/portal/maintainer-operation";

const GITHUB_API = "https://api.github.com";
const GITHUB_API_VERSION = "2026-03-10";
const GITHUB_ACCOUNT = "FDHS-Westchase-Gastroenterology";
export const GITHUB_OWNER_ID = 305283597;
const GITHUB_REPOSITORY_NAME = "westchase-gi";
export const GITHUB_REPOSITORY_ID = 1289668601;
export const CANONICAL_REPOSITORY =
  `${GITHUB_ACCOUNT}/${GITHUB_REPOSITORY_NAME}`;

export interface GitHubMaintainer { userId: number; login: string }
export interface GitHubMaintainerInvitation {
  invitationId: number;
  userId: number;
  login: string;
}
export interface GitHubMaintainerSnapshot {
  readonly ownerLogin: string;
  readonly management:
    | "restrict_installation"
    | "permission_upgrade_required"
    | "ready";
  readonly maintainers: readonly GitHubMaintainer[];
  readonly invitations: readonly GitHubMaintainerInvitation[] | null;
}

export type GitHubMaintainerRead =
  | { state: "not_configured" | "unavailable" }
  | ({ state: "connected" } & GitHubMaintainerSnapshot);

export interface GitHubMaintainerSession {
  readonly initial: GitHubMaintainerSnapshot & {
    invitations: readonly GitHubMaintainerInvitation[];
  };
  resolveUser(username: string): Promise<GitHubMaintainer>;
  invite(username: string): Promise<number>;
  cancelInvitation(invitationId: number): Promise<number>;
  revoke(username: string): Promise<number>;
  refresh(): Promise<
    GitHubMaintainerSnapshot & { invitations: readonly GitHubMaintainerInvitation[] }
  >;
}

interface GitHubInstallation {
  administration: "none" | "read" | "write";
}

interface GitHubResponse {
  status: number;
  data: Json;
}

function asPositiveInteger(value: Json | undefined): number | null {
  const parsed = z.number().int().positive().safeParse(value);
  return parsed.success ? parsed.data : null;
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

function encodeJwtPart(value: Json): string {
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
  options: Readonly<{
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: string;
  }> = {},
): Promise<GitHubResponse> {
  let response: Response;
  try {
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "westchase-gi-portal",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
    };
    const requestHeaders =
      options.body !== undefined && options.body !== ""
        ? { ...headers, "Content-Type": "application/json" }
        : headers;
    response = await fetch(`${GITHUB_API}${path}`, {
      method: options.method ?? "GET",
      headers: requestHeaders,
      body: options.body,
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new GitHubApiError(null);
  }
  return readGitHubResponse(response);
}

function parseInstallation(data: Json): GitHubInstallation {
  const record = asJsonObject(data);
  const account = record === null ? null : asJsonObject(record.account);
  const permissions = record === null ? null : asJsonObject(record.permissions);
  if (
    record === null ||
    account === null ||
    asJsonString(account.login) !== GITHUB_ACCOUNT ||
    asJsonNumber(account.id) !== GITHUB_OWNER_ID ||
    asJsonString(account.type) !== "User" ||
    asJsonString(record.target_type) !== "User" ||
    (record.repository_selection !== "all" &&
      record.repository_selection !== "selected") ||
    record.suspended_at !== null ||
    permissions === null
  ) {
    throw new GitHubApiError(null, "invalid_response");
  }

  const administration = asJsonString(permissions.administration);
  return {
    administration:
      administration === "write"
        ? "write"
        : administration === "read"
          ? "read"
          : "none",
  };
}

function parseToken(data: Json): string {
  const record = asJsonObject(data);
  const token = record === null ? null : asJsonString(record.token);
  if (token === null || token === "") {
    throw new GitHubApiError(null, "invalid_response");
  }
  return token;
}

function verifyRepository(data: Json): void {
  const record = asJsonObject(data);
  const owner = record === null ? null : asJsonObject(record.owner);
  if (
    record === null ||
    asJsonNumber(record.id) !== GITHUB_REPOSITORY_ID ||
    asJsonString(record.full_name) !== CANONICAL_REPOSITORY ||
    owner === null ||
    asJsonNumber(owner.id) !== GITHUB_OWNER_ID ||
    asJsonString(owner.login) !== GITHUB_ACCOUNT
  ) {
    throw new GitHubApiError(null, "invalid_response");
  }
}

async function githubPages(path: string, token: string): Promise<Json[]> {
  const rows: Json[] = [];
  for (let page = 1; ; page += 1) {
    const separator = path.includes("?") ? "&" : "?";
    const { data } = await githubRequest(
      `${path}${separator}per_page=100&page=${page}`,
      token,
    );
    const pageRows = asJsonArray(data);
    if (pageRows === null) {
      throw new GitHubApiError(null, "invalid_response");
    }
    rows.push(...pageRows);
    if (pageRows.length < 100) return rows;
  }
}

function parseMaintainers(rows: readonly Json[]): GitHubMaintainer[] {
  const maintainers: GitHubMaintainer[] = [];
  for (const row of rows) {
    const record = asJsonObject(row);
    const id = record === null ? null : asPositiveInteger(record.id);
    const login = record === null ? null : asJsonString(record.login);
    if (
      record === null ||
      id === null ||
      login === null ||
      login === "" ||
      (id !== GITHUB_OWNER_ID && record.role_name !== "write")
    ) {
      throw new GitHubApiError(null, "invalid_response");
    }
    if (id !== GITHUB_OWNER_ID) {
      maintainers.push({ userId: id, login });
    }
  }
  return maintainers;
}

function parseInvitations(rows: readonly Json[]): GitHubMaintainerInvitation[] {
  return rows.map((row) => {
    const record = asJsonObject(row);
    const invitee = record === null ? null : asJsonObject(record.invitee);
    const invitationId = record === null ? null : asPositiveInteger(record.id);
    const userId = invitee === null ? null : asPositiveInteger(invitee.id);
    const login = invitee === null ? null : asJsonString(invitee.login);
    if (
      record === null ||
      invitationId === null ||
      invitee === null ||
      userId === null ||
      login === null ||
      login === ""
    ) {
      throw new GitHubApiError(null, "invalid_response");
    }
    return {
      invitationId,
      userId,
      login,
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
    getMaintainerManagementState(installation.administration);
  if (mode === "write" && management !== "ready") {
    throw new GitHubApiError(403);
  }

  // ponytail: this staff-only workflow mints on demand; cache the one-hour
  // Token only if measured GitHub traffic makes the extra request material.
  const permissions =
    installation.administration === "none"
      ? { metadata: "read" as const }
      : { metadata: "read" as const, administration: mode };
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

export function gitHubProviderStatus(error: Readonly<Error | undefined>): number | null {
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
      const record = asJsonObject(data);
      const id = record === null ? null : asPositiveInteger(record.id);
      const login = record === null ? null : asJsonString(record.login);
      if (
        record === null ||
        id === null ||
        login === null ||
        login === "" ||
        record.type !== "User"
      ) {
        throw new GitHubApiError(null, "invalid_response");
      }
      return { userId: id, login };
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
