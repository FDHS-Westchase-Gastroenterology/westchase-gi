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

/** Service-role client against an allowlisted Preview Branch or local stack. */
export function serviceDb(): SupabaseClient {
  loadLocalEnv();
  assertSafeE2ETarget(process.env);
  return createClient<
    {
      public: {
        Tables: Record<string, never>;
        Views: Record<string, never>;
        Functions: Record<string, never>;
      };
    },
    "public"
  >(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
