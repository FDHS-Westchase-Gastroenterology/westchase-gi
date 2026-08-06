import { accessSync, constants } from "node:fs";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_PROJECT_REF",
  "SUPABASE_DB_PASSWORD",
  "SUPABASE_DEV_POOLER_URL",
  "PLAYWRIGHT_ALLOWED_SUPABASE_PROJECT_REF",
  "SUPABASE_PROJECT_REF_PROD",
  "SUPABASE_URL_PROD",
  "PORTAL_SEED_ADMIN_EMAIL",
  "PORTAL_SEED_ADMIN_PASSWORD",
  "PORTAL_PREVIEW_USERNAME",
  "PORTAL_PREVIEW_PASSWORD",
  "VERCEL_ORG_ID",
  "VERCEL_PROJECT_ID",
];

const PRODUCTION_CREDENTIALS = [
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_SERVICE_ROLE_KEY_PROD",
  "SUPABASE_SECRET_KEY_PROD",
  "SUPABASE_DB_PASSWORD_PROD",
  "PORTAL_PROD_ADMIN_EMAIL",
  "PORTAL_PROD_ADMIN_PASSWORD",
  "RESEND_API_KEY",
  "PORTAL_GITHUB_APP_PRIVATE_KEY",
];

export function isSafeDevelopmentPoolerUrl(value, projectRef) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "postgresql:" &&
      url.hostname.endsWith(".pooler.supabase.com") &&
      url.port === "5432" &&
      url.pathname === "/postgres" &&
      !url.password &&
      !url.search &&
      !url.hash &&
      decodeURIComponent(url.username) === `postgres.${projectRef}`
    );
  } catch {
    return false;
  }
}

function commandExists(name, env) {
  return (env.PATH ?? "")
    .split(delimiter)
    .filter(Boolean)
    .some((directory) => {
      try {
        accessSync(join(directory, name), constants.X_OK);
        return true;
      } catch {
        return false;
      }
    });
}

export function diagnoseOrbEnvironment(env = process.env) {
  const errors = [];
  for (const name of REQUIRED) {
    if (!env[name]?.trim()) errors.push(`missing ${name}`);
  }

  const projectRef = env.SUPABASE_PROJECT_REF?.trim();
  const allowedRef = env.PLAYWRIGHT_ALLOWED_SUPABASE_PROJECT_REF?.trim();
  if (projectRef && allowedRef && projectRef !== allowedRef) {
    errors.push("Supabase project does not match the explicit Development allowlist");
  }
  if (projectRef && projectRef === env.SUPABASE_PROJECT_REF_PROD?.trim()) {
    errors.push("Supabase Development target matches the Production project identifier");
  }

  if (projectRef && env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
      if (url.protocol !== "https:" || url.hostname !== `${projectRef}.supabase.co`) {
        errors.push("Supabase URL does not match the allowlisted Development project");
      }
    } catch {
      errors.push("NEXT_PUBLIC_SUPABASE_URL is invalid");
    }
  }

  if (projectRef && env.SUPABASE_DEV_POOLER_URL) {
    if (!isSafeDevelopmentPoolerUrl(env.SUPABASE_DEV_POOLER_URL, projectRef)) {
      errors.push("Development pooler URL does not match the allowlisted project");
    }
  }

  if (env.PORTAL_BASE_URL !== "http://localhost:3100") {
    errors.push("PORTAL_BASE_URL must be http://localhost:3100 in an orb");
  }
  if (env.SUPABASE_TELEMETRY_DISABLED !== "1") {
    errors.push("SUPABASE_TELEMETRY_DISABLED must be 1 in an orb");
  }

  for (const name of PRODUCTION_CREDENTIALS) {
    if (env[name]?.trim()) errors.push(`${name} must not be available in an orb`);
  }

  for (const command of ["node", "npm", "npx", "supabase", "vercel"]) {
    if (!commandExists(command, env)) errors.push(`missing executable ${command}`);
  }
  if (env.AMP_ORB === "1" && !commandExists("docker", env)) {
    errors.push("missing executable docker");
  }

  return errors;
}

function main() {
  const errors = diagnoseOrbEnvironment();
  if (errors.length > 0) {
    console.error("Orb environment check failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    "Orb environment is ready: Development target allowlisted; Production credentials absent; toolchain available.",
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
