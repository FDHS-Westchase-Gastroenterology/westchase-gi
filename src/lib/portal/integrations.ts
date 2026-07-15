import "server-only";

import {
  createPrivateKey,
  sign as signBytes,
  type KeyObject,
} from "node:crypto";

const GITHUB_API = "https://api.github.com";
const GITHUB_API_VERSION = "2026-03-10";
const GITHUB_ACCOUNT = "FDHS-Westchase-Gastroenterology";
const GITHUB_REPOSITORY_NAME = "westchase-gi";
const GITHUB_REPOSITORY = `${GITHUB_ACCOUNT}/${GITHUB_REPOSITORY_NAME}`;

type IntegrationDetail = {
  label: string;
  value: string;
};

export type IntegrationStatus =
  | {
      connected: false;
      reason:
        | "provider_deferred"
        | "missing_configuration"
        | "connection_unavailable";
    }
  | {
      connected: true;
      account: string;
      details: IntegrationDetail[];
    };

export type IntegrationProvider = {
  id: "github" | "vercel";
  name: string;
  summary: string;
  /** What the connection will manage once activated. */
  willManage: string[];
  status: () => Promise<IntegrationStatus>;
};

const DISCONNECTED: IntegrationStatus = {
  connected: false,
  reason: "provider_deferred",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

async function githubJson(
  path: string,
  token: string,
  signal: AbortSignal,
  options: { method?: "GET" | "POST"; body?: string } = {},
): Promise<unknown> {
  const response = await fetch(`${GITHUB_API}${path}`, {
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
    signal,
  });

  if (!response.ok) {
    throw new Error(`GitHub API request failed (${response.status})`);
  }

  return response.json() as Promise<unknown>;
}

async function githubStatus(): Promise<IntegrationStatus> {
  let stage = "configuration";
  try {
    const configuration = readGithubConfiguration();
    if (!configuration) {
      return { connected: false, reason: "missing_configuration" };
    }

    stage = "installation";
    const appJwt = createAppJwt(
      configuration.appId,
      configuration.privateKey,
    );
    const signal = AbortSignal.timeout(8_000);
    const installation = await githubJson(
      `/app/installations/${configuration.installationId}`,
      appJwt,
      signal,
    );

    if (!isRecord(installation) || !isRecord(installation.account)) {
      throw new Error("Invalid GitHub installation response");
    }
    const account = installation.account.login;
    const repositorySelection = installation.repository_selection;
    if (
      account !== GITHUB_ACCOUNT ||
      (repositorySelection !== "all" && repositorySelection !== "selected")
    ) {
      throw new Error("Unexpected GitHub installation");
    }

    stage = "installation_token";
    // ponytail: this staff-only page mints on demand; cache the one-hour token
    // only if measured GitHub traffic makes the extra request material.
    const tokenResponse = await githubJson(
      `/app/installations/${configuration.installationId}/access_tokens`,
      appJwt,
      signal,
      {
        method: "POST",
        body: JSON.stringify({
          repositories: [GITHUB_REPOSITORY_NAME],
          permissions: { metadata: "read" },
        }),
      },
    );
    if (
      !isRecord(tokenResponse) ||
      typeof tokenResponse.token !== "string" ||
      tokenResponse.token.length === 0
    ) {
      throw new Error("Invalid GitHub token response");
    }

    stage = "repository";
    const repositoriesResponse = await githubJson(
      "/installation/repositories",
      tokenResponse.token,
      signal,
    );
    if (
      !isRecord(repositoriesResponse) ||
      !Array.isArray(repositoriesResponse.repositories)
    ) {
      throw new Error("Invalid GitHub repositories response");
    }
    const repository = repositoriesResponse.repositories.find(
      (candidate) =>
        isRecord(candidate) && candidate.full_name === GITHUB_REPOSITORY,
    );
    if (!isRecord(repository) || repository.full_name !== GITHUB_REPOSITORY) {
      throw new Error("Expected GitHub repository is unavailable");
    }

    return {
      connected: true,
      account,
      details: [
        { label: "Repository", value: repository.full_name },
        {
          label: "Installation scope",
          value:
            repositorySelection === "selected"
              ? "Selected repositories"
              : "All repositories — narrow in GitHub",
        },
      ],
    };
  } catch {
    // Stage is safe operational metadata. Never log the provider error, JWT,
    // installation token, private-key input, or environment configuration.
    console.error("[portal-integrations] GitHub connection unavailable", {
      stage,
    });
    return { connected: false, reason: "connection_unavailable" };
  }
}

export const PORTAL_INTEGRATIONS: IntegrationProvider[] = [
  {
    id: "github",
    name: "GitHub",
    summary:
      "Where the website's code lives. The live connection verifies the practice-owned repository and the App's installation scope.",
    willManage: [
      "Who can view and change the website's code",
      "Access grants and removals recorded straight into this ledger",
      "A clear history of every code change",
    ],
    status: githubStatus,
  },
  {
    id: "vercel",
    name: "Vercel",
    summary:
      "Where the website runs. Connecting activates deploy visibility from this registry.",
    willManage: [
      "Who can deploy and configure the website hosting",
      "Visibility into what version is live and when it changed",
      "Environment configuration, without sharing passwords",
    ],
    status: async () => DISCONNECTED,
  },
];
