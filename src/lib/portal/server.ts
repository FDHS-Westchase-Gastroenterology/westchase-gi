import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function requiredEnv(names: readonly string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value !== undefined && value !== "") return value;
  }

  throw new Error(`Missing required server environment: ${names.join(" or ")}`);
}

function supabaseUrl(): string {
  return requiredEnv(["NEXT_PUBLIC_SUPABASE_URL"]);
}

function publishableKey(): string {
  return requiredEnv(["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
}

/**
 * Temporary compatibility bridge: both hosted projects rejected the configured
 * opaque secret for Auth Admin while the legacy service-role JWT succeeded.
 * Keep this single selector until provider canaries prove opaque-key parity.
 */
export function serviceRoleKey(): string {
  return requiredEnv(["SUPABASE_SERVICE_ROLE_KEY"]);
}

/** Build an application-owned URL without accepting an absolute/open-redirect
 * target. HTTP remains valid for local Playwright; production supplies HTTPS. */
export function portalUrl(path: string): string | null {
  const base = process.env.PORTAL_BASE_URL?.trim();
  if (base === undefined || base === "" || !path.startsWith("/") || path.startsWith("//")) {
    return null;
  }

  try {
    const baseUrl = new URL(base);
    if (
      (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") ||
      baseUrl.username ||
      baseUrl.password
    ) {
      return null;
    }

    const target = new URL(path, baseUrl);
    return target.origin === baseUrl.origin ? target.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Request-scoped, cookie-bound client for later portal auth work.
 * Authorization callers must verify identity with getClaims()/getUser(), never
 * trust getSession() or user-editable metadata.
 */
export async function serverClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), publishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies. The portal proxy added by
          // The auth packet owns refresh-cookie writes for those requests.
        }
      },
    },
  });
}

/**
 * Server-only privileged client. A fresh instance avoids sharing request/auth
 * state and the service key is never exposed through a NEXT_PUBLIC variable.
 */
export function serviceClient() {
  return createClient(supabaseUrl(), serviceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
