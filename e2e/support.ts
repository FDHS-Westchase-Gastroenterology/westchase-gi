import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Loads .env.local when present. CI injects disposable local-stack values
 * directly into process.env, so it does not need a credentials file.
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

    const key = line.slice(0, separator).replace(/^export\s+/, "").trim();
    let value = line.slice(separator + 1).trim();
    const quote = value[0];
    if ((quote === `"` || quote === `'`) && value.endsWith(quote)) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export function requiredEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }

  throw new Error(`Missing test environment: ${names.join(" or ")}`);
}

/** Service-role client against the DEV project (from .env.local). */
export function serviceDb(): SupabaseClient {
  loadLocalEnv();
  return createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
}
