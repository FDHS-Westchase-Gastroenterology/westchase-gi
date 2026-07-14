import "server-only";

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

function isStaffRole(value: unknown): value is StaffRole {
  return value === "admin" || value === "staff";
}

/**
 * Verifies the cookie-bound identity with Supabase Auth, then resolves the
 * current authorization state from staff_profiles using the server-only
 * service client. User-editable metadata is never consulted.
 */
export const getSessionUser = cache(
  async (): Promise<PortalSessionUser | null> => {
    try {
      const authClient = await serverClient();
      const {
        data: { user },
        error: userError,
      } = await authClient.auth.getUser();

      if (userError || !user) return null;

      const { data: profile, error: profileError } = await serviceClient()
        .from("staff_profiles")
        .select("email, display_name, role, active")
        .eq("user_id", user.id)
        .maybeSingle();

      if (
        profileError ||
        !profile ||
        profile.active !== true ||
        !isStaffRole(profile.role)
      ) {
        return null;
      }

      const email =
        user.email?.trim() ||
        (typeof profile.email === "string" ? profile.email.trim() : "");
      const displayName =
        typeof profile.display_name === "string"
          ? profile.display_name.trim()
          : "";

      if (!email || !displayName) return null;

      return {
        id: user.id,
        email,
        displayName,
        role: profile.role,
      };
    } catch {
      // Auth/provider outages fail closed and never expose provider details.
      return null;
    }
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
