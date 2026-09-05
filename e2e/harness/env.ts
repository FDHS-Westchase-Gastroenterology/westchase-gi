import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import { assertSafeE2ETarget } from "./target-guard";

/**
 * Loads .env.local when present. Hosted-branch CI injects its ephemeral
 * credentials directly into process.env, so it does not need a local file.
 */
export function loadLocalEnv(): void {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const contents = readFileSync(path, "utf8");

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator < 1) continue;

    const key = line
      .slice(0, separator)
      .replace(/^export\s+/, "")
      .trim();
    let value = line.slice(separator + 1).trim();
    const quote = value[0];
    if ((quote === `"` || quote === `'`) && value.endsWith(quote)) {
      value = value.slice(1, -1);
    }

    process.env[key] ??= value;
  }
}

export function requiredEnv(...names: readonly string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value !== undefined && value !== "") return value;
  }

  throw new Error(`Missing test environment: ${names.join(" or ")}`);
}

type PortalDb = SupabaseClient<
  {
    public: {
      Tables: Record<string, never>;
      Views: Record<string, never>;
      Functions: Record<string, never>;
    };
  },
  "public"
>;

function client(key: string): PortalDb {
  loadLocalEnv();
  assertSafeE2ETarget(process.env);
  return createClient<PortalDb extends SupabaseClient<infer Schema> ? Schema : never, "public">(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    key,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
}

/** Service-role client against an allowlisted Preview Branch or local stack. */
export function serviceDb(): SupabaseClient {
  return client(requiredEnv("SUPABASE_SERVICE_ROLE_KEY"));
}

export interface Credentials {
  readonly email: string;
  readonly password: string;
}

/** The seeded portal administrator every Preview Branch carries (scripts/seed-portal.mjs). */
export function seedAdmin(): Credentials {
  loadLocalEnv();
  return {
    email: requiredEnv("PORTAL_SEED_ADMIN_EMAIL"),
    password: requiredEnv("PORTAL_SEED_ADMIN_PASSWORD"),
  };
}

/** The browser's own client: publishable key, no service privileges, guard applied. */
export function publishableDb(): SupabaseClient {
  return client(
    requiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}

/** One short id per test process, so fixture names never collide with an earlier run's leftovers. */
export const runId = randomUUID().slice(0, 8);

/**
 * Distinct client addresses for intake calls, so the shared rate limiter
 * never throttles a spec. The namespace keeps two specs that use the same
 * label apart; the documentation prefix 2001:db8::/32 never routes.
 */
export function clientIps(namespace: string): (label: string) => string {
  return (label) => {
    const hex = createHash("sha256").update(`${runId}:${namespace}:${label}`).digest("hex");
    return `2001:db8:${hex.slice(0, 4)}:${hex.slice(4, 8)}::1`;
  };
}
