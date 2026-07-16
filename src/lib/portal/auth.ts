import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { StaffRole } from "@/lib/portal/contracts";
import { serverClient, serviceClient } from "@/lib/portal/server";

export type PortalSessionUser = {
  id: string;
  email: string;
  displayName: string;
  role: StaffRole;
};

export type PortalStaffAuthState = PortalSessionUser & {
  active: boolean;
  onboardedAt: string | null;
};

export type PasswordAuthFlow = "invite" | "recovery";

export type RequireRoleOptions = {
  unauthenticated?: "redirect" | "throw";
};

class PortalAuthorizationError extends Error {
  readonly status: 401 | 403;

  constructor(status: 401 | 403) {
    super(status === 401 ? "Unauthenticated" : "Forbidden");
    this.name = "PortalAuthorizationError";
    this.status = status;
  }
}

export function authorizationStatus(error: unknown): 401 | 403 | null {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return null;
  }
  const status = error.status;
  return status === 401 || status === 403 ? status : null;
}

function isStaffRole(value: unknown): value is StaffRole {
  return value === "admin" || value === "staff";
}

const PASSWORD_FLOW_COOKIE = "wgi-portal-password-flow";
const PASSWORD_FLOW_TTL_SECONDS = 10 * 60;

function passwordFlowSecret(): string {
  const secret = (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )?.trim();

  if (!secret) throw new Error("Missing portal password-flow signing secret");
  return secret;
}

function passwordFlowSignature(payload: string): string {
  return createHmac("sha256", passwordFlowSecret())
    .update(payload)
    .digest("base64url");
}

function safeSignatureMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

/**
 * Resolves authorization state for an Auth identity from the database. This
 * helper deliberately accepts no role or onboarding input from the caller.
 */
export async function resolveStaffAuthState(
  user: Pick<User, "id" | "email">,
): Promise<PortalStaffAuthState | null> {
  const { data: profile, error: profileError } = await serviceClient()
    .from("staff_profiles")
    .select("email, display_name, role, active, onboarded_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError || !profile || !isStaffRole(profile.role)) return null;

  const email =
    user.email?.trim() ||
    (typeof profile.email === "string" ? profile.email.trim() : "");
  const displayName =
    typeof profile.display_name === "string"
      ? profile.display_name.trim()
      : "";
  const onboardedAt =
    typeof profile.onboarded_at === "string" ? profile.onboarded_at : null;

  if (!email || !displayName) return null;

  return {
    id: user.id,
    email,
    displayName,
    role: profile.role,
    active: profile.active === true,
    onboardedAt,
  };
}

/** Verify the current cookie-bound Auth identity without applying portal access. */
export async function getVerifiedStaffAuthState(): Promise<PortalStaffAuthState | null> {
  try {
    const authClient = await serverClient();
    const {
      data: { user },
      error,
    } = await authClient.auth.getUser();
    if (error || !user) return null;
    return await resolveStaffAuthState(user);
  } catch {
    return null;
  }
}

/**
 * Bind password setup to a recent successful invite/recovery verification.
 * The HMAC prevents a normal signed-in session from forging this marker.
 */
export async function establishPasswordAuthFlow(
  flow: PasswordAuthFlow,
  userId: string,
): Promise<void> {
  const expiresAt = Math.floor(Date.now() / 1000) + PASSWORD_FLOW_TTL_SECONDS;
  const payload = `v1.${flow}.${userId}.${expiresAt}`;
  const token = `${payload}.${passwordFlowSignature(payload)}`;
  const cookieStore = await cookies();
  cookieStore.set(PASSWORD_FLOW_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: PASSWORD_FLOW_TTL_SECONDS,
  });
}

export async function readPasswordAuthFlow(
  userId: string,
): Promise<PasswordAuthFlow | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PASSWORD_FLOW_COOKIE)?.value;
  if (!token) return null;

  const [version, flow, tokenUserId, expires, signature, ...extra] =
    token.split(".");
  if (
    extra.length > 0 ||
    version !== "v1" ||
    (flow !== "invite" && flow !== "recovery") ||
    tokenUserId !== userId ||
    !expires ||
    !signature
  ) {
    return null;
  }

  const expiresAt = Number(expires);
  if (!Number.isSafeInteger(expiresAt) || expiresAt < Date.now() / 1000) {
    return null;
  }

  const payload = `${version}.${flow}.${tokenUserId}.${expires}`;
  try {
    return safeSignatureMatch(signature, passwordFlowSignature(payload))
      ? flow
      : null;
  } catch {
    return null;
  }
}

export async function clearPasswordAuthFlow(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PASSWORD_FLOW_COOKIE);
}

/**
 * Verifies the cookie-bound identity with Supabase Auth, then resolves the
 * current authorization state from staff_profiles using the server-only
 * service client. User-editable metadata is never consulted.
 */
export const getSessionUser = cache(
  async (): Promise<PortalSessionUser | null> => {
    const state = await getVerifiedStaffAuthState();
    if (!state?.active || !state.onboardedAt) return null;

    return {
      id: state.id,
      email: state.email,
      displayName: state.displayName,
      role: state.role,
    };
  },
);

/**
 * Enforces the portal role hierarchy close to the protected operation:
 * staff accepts active staff or admins; admin accepts active admins only.
 */
export async function requireRole(
  requiredRole: StaffRole,
  options: RequireRoleOptions = {},
): Promise<PortalSessionUser> {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    if (options.unauthenticated === "throw") {
      throw new PortalAuthorizationError(401);
    }
    redirect("/admin/login");
  }

  if (requiredRole === "admin" && sessionUser.role !== "admin") {
    throw new PortalAuthorizationError(403);
  }

  return sessionUser;
}
