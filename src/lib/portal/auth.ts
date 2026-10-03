import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { z } from "zod";

import {
  parsePasswordAuthFlow,
  roleTour,
  STAFF_ROLES,
  STAFF_TOUR_STATUSES,
  STAFF_TOURS,
  toursForRole,
} from "@/lib/portal/contracts";
import type {
  PasswordAuthFlow,
  StaffRole,
  StaffTour,
  StaffTourStatus,
} from "@/lib/portal/contracts";
import { serverClient, serviceClient, serviceRoleKey } from "@/lib/portal/server";

export interface PortalSessionUser {
  id: string;
  email: string;
  displayName: string;
  role: StaffRole;
  onboardedAt: string;
  /** The account's tour records (staff_tours), one per tour it has been offered. */
  tours: readonly StaffTourRecord[];
  /** The tour the portal runs now: one started from Help, else the role's tour on first sign-in. */
  pendingTour: StaffTour | null;
}

export interface StaffTourRecord {
  readonly tour: StaffTour;
  readonly status: StaffTourStatus;
  readonly recordedAt: string;
}

export type PortalStaffAuthState = Omit<PortalSessionUser, "onboardedAt"> & {
  active: boolean;
  onboardedAt: string | null;
};

export interface RequireRoleOptions {
  unauthenticated?: "redirect" | "throw";
}

export class PortalAuthorizationError extends Error {
  readonly status: 401 | 403;

  constructor(status: 401 | 403) {
    super(status === 401 ? "Unauthenticated" : "Forbidden");
    this.name = "PortalAuthorizationError";
    this.status = status;
  }
}

const staffRoleSchema = z.enum(STAFF_ROLES);
const staffTourRowSchema = z.object({
  tour: z.enum(STAFF_TOURS),
  status: z.enum(STAFF_TOUR_STATUSES),
  recorded_at: z.string(),
});

/** A tour started from Help runs first; otherwise the role's tour runs until it has a record. */
export function pendingTourFor(
  role: StaffRole,
  tours: readonly StaffTourRecord[],
): StaffTour | null {
  const own = roleTour(role);
  const open = new Set<StaffTour>(toursForRole(role));
  const pending: StaffTour[] = [];
  for (const record of tours) {
    if (record.status === "pending" && open.has(record.tour)) pending.push(record.tour);
  }
  if (pending.includes(own)) return own;
  if (pending.length > 0) return pending[0];
  return tours.some((record) => record.tour === own) ? null : own;
}

const PASSWORD_FLOW_COOKIE = "wgi-portal-password-flow";
const PASSWORD_FLOW_TTL_SECONDS = 10 * 60;

function passwordFlowSecret(): string {
  return serviceRoleKey();
}

function passwordFlowSignature(payload: string): string {
  return createHmac("sha256", passwordFlowSecret()).update(payload).digest("base64url");
}

function safeSignatureMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
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
    .select(
      "email, display_name, role, active, onboarded_at, staff_tours(tour, status, recorded_at)",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError !== null || profile === null) return null;
  const role = staffRoleSchema.safeParse(profile.role);
  if (!role.success) return null;

  const emailFromProfile = z.string().safeParse(profile.email);
  const displayName = z.string().safeParse(profile.display_name);
  const onboardedAt = z.string().safeParse(profile.onboarded_at);
  const tourRows = z.array(staffTourRowSchema).safeParse(profile.staff_tours);
  // An unreadable tour record starts no tour: a returning account is never interrupted by a read.
  const tours: StaffTourRecord[] | null = tourRows.success
    ? tourRows.data.map((row) => ({
        tour: row.tour,
        status: row.status,
        recordedAt: row.recorded_at,
      }))
    : null;

  const userEmail = user.email?.trim();
  const email =
    userEmail !== undefined && userEmail !== ""
      ? userEmail
      : emailFromProfile.success
        ? emailFromProfile.data.trim()
        : "";
  if (email === "" || !displayName.success || displayName.data.trim().length === 0) {
    return null;
  }

  return {
    id: user.id,
    email,
    displayName: displayName.data.trim(),
    role: role.data,
    active: profile.active === true,
    onboardedAt: onboardedAt.success ? onboardedAt.data : null,
    tours: tours ?? [],
    pendingTour: tours === null ? null : pendingTourFor(role.data, tours),
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
    if (error !== null || user === null) return null;
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

export async function readPasswordAuthFlow(userId: string): Promise<PasswordAuthFlow | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PASSWORD_FLOW_COOKIE)?.value;
  if (token === undefined || token === "") return null;

  const [version, rawFlow, tokenUserId, expires, signature, ...extra] = token.split(".");
  const flow = parsePasswordAuthFlow(rawFlow);
  if (
    extra.length > 0 ||
    version !== "v1" ||
    flow === null ||
    tokenUserId !== userId ||
    expires === "" ||
    signature === ""
  ) {
    return null;
  }

  const expiresAt = Number(expires);
  if (!Number.isSafeInteger(expiresAt) || expiresAt < Date.now() / 1000) {
    return null;
  }

  const payload = `${version}.${flow}.${tokenUserId}.${expires}`;
  try {
    return safeSignatureMatch(signature, passwordFlowSignature(payload)) ? flow : null;
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
export const getSessionUser = cache(async (): Promise<PortalSessionUser | null> => {
  const state = await getVerifiedStaffAuthState();
  if (state === null) return null;
  if (!state.active) return null;
  if (state.onboardedAt === null || state.onboardedAt === "") return null;

  return {
    id: state.id,
    email: state.email,
    displayName: state.displayName,
    role: state.role,
    onboardedAt: state.onboardedAt,
    tours: state.tours,
    pendingTour: state.pendingTour,
  };
});

/**
 * Enforces the portal role hierarchy close to the protected operation:
 * staff accepts active staff or admins; admin accepts active admins only.
 */
export async function requireRole(
  requiredRole: StaffRole,
  options: Readonly<RequireRoleOptions> = {},
): Promise<PortalSessionUser> {
  const sessionUser = await getSessionUser();

  if (sessionUser === null) {
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
