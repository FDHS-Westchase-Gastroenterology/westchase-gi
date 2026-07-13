import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function requiredEnv(names: readonly string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }

  throw new Error(`Missing required server environment: ${names.join(" or ")}`);
}

function supabaseUrl(): string {
  return requiredEnv(["NEXT_PUBLIC_SUPABASE_URL"]);
}

function publishableKey(): string {
  return requiredEnv([
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ]);
}

function serviceRoleKey(): string {
  return requiredEnv(["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"]);
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
          // the auth packet owns refresh-cookie writes for those requests.
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
