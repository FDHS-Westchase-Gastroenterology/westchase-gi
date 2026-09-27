import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]"]);

export function safeOrigin(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid target URL");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error("Target must be an HTTP origin without credentials, path, or query");
  return url;
}

export function resolveDevTarget(env) {
  const value = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;
  if (!value || !serviceKey) return null;
  const url = safeOrigin(value);
  if (
    env.NEXT_PUBLIC_SUPABASE_URL &&
    env.SUPABASE_URL &&
    safeOrigin(env.SUPABASE_URL).origin !== url.origin
  )
    throw new Error("Public and server Supabase URLs disagree");
  const local = LOOPBACK.has(url.hostname);
  const ref = env.SUPABASE_BRANCH_PROJECT_REF || env.SUPABASE_PROJECT_REF;
  const productionRefs = [env.SUPABASE_PROD_PROJECT_REF, env.SUPABASE_PROJECT_REF_PROD].filter(
    Boolean,
  );
  const productionUrls = [env.SUPABASE_PROD_URL, env.SUPABASE_URL_PROD].filter(Boolean);
  if (
    productionRefs.includes(ref) ||
    productionUrls.some((item) => safeOrigin(item).hostname === url.hostname)
  ) {
    throw new Error("Refusing Production target");
  }
  if (!local) {
    const marker = env.SUPABASE_PREVIEW_BRANCH;
    const allowed = env.DEV_SEED_ALLOWED_PROJECT_REF || env.PLAYWRIGHT_ALLOWED_SUPABASE_PROJECT_REF;
    if (
      url.protocol !== "https:" ||
      !ref ||
      url.hostname !== `${ref}.supabase.co` ||
      url.port ||
      !marker ||
      ["0", "false"].includes(marker) ||
      !productionRefs.length ||
      !productionUrls.length ||
      allowed !== ref
    )
      throw new Error(
        "Hosted target requires matching Preview URL, branch ref, explicit allowlist, and Production exclusions",
      );
  } else if (ref && ref !== "local") {
    throw new Error("Loopback target requires the local project reference");
  }
  return {
    url: url.origin,
    serviceKey,
    ref: local ? "local" : ref,
    kind: local ? "local" : "preview",
  };
}

export function assertWriteIntent(target, options, env) {
  if (["1", "true"].includes(env.CI)) throw new Error("Fixture regeneration is disabled in CI");
  if (options.confirmTarget !== target.ref)
    throw new Error(`Pass --confirm-target ${target.ref} after reviewing inspect`);
  if (target.kind === "preview" && !options.sharedPreviewReady) {
    throw new Error(
      "Shared Preview: coordinate with other users and CI, then pass --shared-preview-ready",
    );
  }
}

export function loadSeedEnvironment(cwd, envFile, inherited) {
  const path = resolve(cwd, envFile || ".env.local");
  let fileEnv = {};
  let loaded = false;
  try {
    fileEnv = parseEnv(readFileSync(path, "utf8"));
    loaded = true;
  } catch (error) {
    if (envFile || error.code !== "ENOENT")
      throw new Error("Cannot read the selected environment file");
  }
  const env = { ...fileEnv, ...inherited };
  const targetKey = env.NEXT_PUBLIC_SUPABASE_URL ? "NEXT_PUBLIC_SUPABASE_URL" : "SUPABASE_URL";
  return {
    env,
    source: {
      file: path,
      loaded,
      precedence: "process environment overrides file",
      target: inherited[targetKey] ? "process" : path,
    },
  };
}

export function checkoutInfo(cwd) {
  const git = (...args) =>
    execFileSync("git", ["-c", "core.fsmonitor=false", ...args], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  return {
    cwd: resolve(cwd),
    root: git("rev-parse", "--show-toplevel"),
    branch: git("branch", "--show-current") || "detached",
    commit: git("rev-parse", "--short", "HEAD"),
    commonGitDirectory: resolve(cwd, git("rev-parse", "--git-common-dir")),
  };
}

export function loopbackOrigin(value) {
  const url = safeOrigin(value);
  if (!LOOPBACK.has(url.hostname))
    throw new Error("App HTTP verification only accepts a loopback origin");
  return url.origin;
}
