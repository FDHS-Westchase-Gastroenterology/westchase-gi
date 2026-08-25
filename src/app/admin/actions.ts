"use server";

import { timingSafeEqual } from "node:crypto";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  clearPasswordAuthFlow,
  establishPasswordAuthFlow,
  getSessionUser,
  getVerifiedStaffAuthState,
  readPasswordAuthFlow,
  requireRole,
  resolveStaffAuthState,
} from "@/lib/portal/auth";
import type { PasswordAuthFlow, PortalStaffAuthState } from "@/lib/portal/auth";
import { portalUrl, serverClient, serviceClient } from "@/lib/portal/server";

export interface LoginActionState {
  error: string | null;
}

export interface ResetRequestActionState {
  submitted: boolean;
  email: string;
  requestKey: number;
}

export interface ConfirmAuthActionState {
  error: string | null;
}

export interface SetPasswordActionState {
  error: string | null;
  changeCommitted: boolean;
}

const GENERIC_LOGIN_ERROR = "Unable to sign in. Check your credentials and try again.";
const INVALID_AUTH_LINK_ERROR =
  "This link is invalid or expired. Request another reset or ask your portal administrator for a new invitation.";
const SET_PASSWORD_ERROR =
  "We couldn’t use that password. Choose a different password and try again. If the problem continues, ask your portal administrator for help.";
const INVITE_PASSWORD_UPDATED_INCOMPLETE =
  "Your password was changed, but account setup could not finish. Ask your portal administrator for a new invitation.";
const RECOVERY_PASSWORD_UPDATED_INCOMPLETE =
  "Your password was changed, but the reset could not be fully recorded. Sign in with your new password and tell your portal administrator.";
const RECOVERY_SIGN_IN_INCOMPLETE =
  "Your password was changed, but we couldn’t sign you in automatically. Sign in with your new password or ask your portal administrator for help.";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function loginError(): LoginActionState {
  return { error: GENERIC_LOGIN_ERROR };
}

function safeCredentialMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function previewLoginCredentials(
  submittedEmail: string,
  submittedPassword: string,
): { email: string; password: string } | null {
  if (process.env.VERCEL_ENV === "production") return null;

  const username = process.env.PORTAL_PREVIEW_USERNAME?.trim();
  const password = process.env.PORTAL_PREVIEW_PASSWORD;
  const email = process.env.PORTAL_SEED_ADMIN_EMAIL?.trim();
  const seedPassword = process.env.PORTAL_SEED_ADMIN_PASSWORD;
  if (
    username === undefined ||
    username === "" ||
    password === undefined ||
    password === "" ||
    email === undefined ||
    email === "" ||
    seedPassword === undefined ||
    seedPassword === ""
  ) {
    return null;
  }

  const usernameMatches = safeCredentialMatch(submittedEmail, username);
  const passwordMatches = safeCredentialMatch(submittedPassword, password);
  return usernameMatches && passwordMatches ? { email, password: seedPassword } : null;
}

function credential(formData: FormData, name: string, trim = true): string {
  const value = formData.get(name);
  if (value instanceof File || value === null) return "";
  return trim ? value.trim() : value;
}

async function passwordUpdatedIncomplete(
  flow: "invite" | "recovery",
  automaticSignInFailed = false,
): Promise<SetPasswordActionState> {
  try {
    await clearPasswordAuthFlow();
  } catch {
    // Best-effort cleanup; the response still states the committed outcome.
  }
  try {
    const supabase = await serverClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Best-effort session cleanup after the Auth password already changed.
  }

  return {
    error:
      flow === "invite"
        ? INVITE_PASSWORD_UPDATED_INCOMPLETE
        : automaticSignInFailed
          ? RECOVERY_SIGN_IN_INCOMPLETE
          : RECOVERY_PASSWORD_UPDATED_INCOMPLETE,
    changeCommitted: true,
  };
}

function validateNewPassword(
  password: string,
  confirmation: string,
): SetPasswordActionState | null {
  if (password.length < 12) {
    return {
      error: "Use at least 12 characters for your new password.",
      changeCommitted: false,
    };
  }
  if (password !== confirmation) {
    return { error: "The passwords do not match.", changeCommitted: false };
  }
  if (password.length > 1024) {
    return { error: SET_PASSWORD_ERROR, changeCommitted: false };
  }
  return null;
}

async function completePasswordChange(
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
  supabase: Readonly<Awaited<ReturnType<typeof serverClient>>>,
  staff: Readonly<PortalStaffAuthState>,
  flow: PasswordAuthFlow,
  password: string,
): Promise<SetPasswordActionState | null> {
  let passwordUpdated = false;
  let recoveryRecorded = false;
  try {
    const updated = await supabase.auth.updateUser({ password });
    if (updated.data.user === null) {
      return { error: SET_PASSWORD_ERROR, changeCommitted: false };
    }
    passwordUpdated = true;

    const currentStaff = await resolveStaffAuthState(updated.data.user);
    if (currentStaff === null || !currentStaff.active) {
      return await passwordUpdatedIncomplete(flow);
    }

    if (flow === "invite") {
      if (currentStaff.onboardedAt !== null && currentStaff.onboardedAt !== "") {
        return await passwordUpdatedIncomplete(flow);
      }

      const completion = await serviceClient().rpc("portal_complete_staff_onboarding", {
        p_user_id: currentStaff.id,
      });
      const completed = z.boolean().safeParse(completion.data);
      if (completion.error !== null || completed.data !== true) {
        return await passwordUpdatedIncomplete(flow);
      }
    } else {
      if (currentStaff.onboardedAt === null || currentStaff.onboardedAt === "") {
        return await passwordUpdatedIncomplete(flow);
      }

      const audit = await serviceClient().rpc("portal_record_staff_password_reset", {
        p_user_id: currentStaff.id,
      });
      const recorded = z.boolean().safeParse(audit.data);
      if (audit.error !== null || recorded.data !== true) {
        return await passwordUpdatedIncomplete(flow);
      }
      recoveryRecorded = true;
    }

    await clearPasswordAuthFlow();

    if (flow === "recovery") {
      await supabase.auth.signOut({ scope: "local" });
      const signedIn = await supabase.auth.signInWithPassword({
        email: staff.email,
        password,
      });
      if (signedIn.data.user === null) {
        return await passwordUpdatedIncomplete(flow, true);
      }

      // A new Auth session is not enough on its own. Re-read the
      // Authoritative profile before allowing the portal redirect.
      const freshStaff = await resolveStaffAuthState(signedIn.data.user);
      if (
        freshStaff === null ||
        !freshStaff.active ||
        freshStaff.onboardedAt === null ||
        freshStaff.onboardedAt === ""
      ) {
        return await passwordUpdatedIncomplete(flow, true);
      }
    }
  } catch {
    return passwordUpdated
      ? passwordUpdatedIncomplete(flow, recoveryRecorded)
      : { error: SET_PASSWORD_ERROR, changeCommitted: false };
  }

  return null;
}

/**
 * Public by necessity: this is the sole action that establishes a portal
 * session. Every action available after sign-in must call requireRole().
 */
export async function loginAction(
  _state: Readonly<LoginActionState>,
  formData: FormData,
): Promise<LoginActionState> {
  const email = credential(formData, "email");
  const password = credential(formData, "password", false);

  if (email === "" || email.length > 254 || password === "" || password.length > 1024) {
    return loginError();
  }

  try {
    const previewCredentials = previewLoginCredentials(email, password);
    const supabase = await serverClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: previewCredentials?.email ?? email,
      password: previewCredentials?.password ?? password,
    });

    if (error !== null) return loginError();

    // A valid Auth account is not enough: staff_profiles is authoritative.
    const sessionUser = await getSessionUser();
    if (sessionUser === null) {
      await supabase.auth.signOut({ scope: "local" });
      return loginError();
    }
  } catch {
    return loginError();
  }

  return redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await requireRole("staff");

  const supabase = await serverClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/admin/login");
}

/**
 * Always returns the same visible result. Supabase Auth owns the recovery
 * email/rate-limit boundary; database authorization is rechecked only after
 * the bearer token is verified.
 */
// react-doctor-disable-next-line react-doctor/server-auth-actions
export async function requestPasswordResetAction(
  _state: Readonly<ResetRequestActionState>,
  formData: FormData,
): Promise<ResetRequestActionState> {
  const email = credential(formData, "email").toLowerCase();
  const redirectTo = portalUrl("/admin/auth/confirm");

  if (redirectTo !== null && email.length <= 254 && EMAIL_RE.test(email)) {
    try {
      const supabase = await serverClient();
      await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    } catch {
      // Provider state must not create an account-enumeration oracle.
    }
  }

  return {
    submitted: true,
    // This is only an echo of the caller's own valid-looking input. It says
    // Nothing about account existence, staff status, or provider delivery.
    email: email.length <= 254 && EMAIL_RE.test(email) ? email : "",
    requestKey: Date.now(),
  };
}

/**
 * Public session-establishment boundary: the one-time token is the credential,
 * and active staff/onboarding state is checked before a flow cookie is issued.
 */
// react-doctor-disable-next-line react-doctor/server-auth-actions
export async function confirmAuthLinkAction(
  _state: Readonly<ConfirmAuthActionState>,
  formData: FormData,
): Promise<ConfirmAuthActionState> {
  const tokenHash = credential(formData, "tokenHash");
  const type = credential(formData, "type");
  if (
    tokenHash.length < 20 ||
    tokenHash.length > 2048 ||
    (type !== "invite" && type !== "recovery")
  ) {
    return { error: INVALID_AUTH_LINK_ERROR };
  }

  try {
    const supabase = await serverClient();
    await clearPasswordAuthFlow();
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (error !== null || data.user === null) {
      await supabase.auth.signOut({ scope: "local" });
      return { error: INVALID_AUTH_LINK_ERROR };
    }

    const staff = await resolveStaffAuthState(data.user);
    if (
      staff === null ||
      !staff.active ||
      (type === "invite" && staff.onboardedAt !== null && staff.onboardedAt !== "")
    ) {
      await supabase.auth.signOut({ scope: "local" });
      return { error: INVALID_AUTH_LINK_ERROR };
    }

    // A recovery token can rescue a consumed-but-unfinished invitation.
    // The database onboarding state, never the token type, decides purpose.
    const flow = staff.onboardedAt !== null && staff.onboardedAt !== "" ? "recovery" : "invite";
    await establishPasswordAuthFlow(flow, staff.id);
  } catch {
    try {
      const supabase = await serverClient();
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Best-effort cleanup; the visible outcome remains intentionally generic.
    }
    try {
      await clearPasswordAuthFlow();
    } catch {
      // Best-effort cleanup when cookie storage is unavailable.
    }
    return { error: INVALID_AUTH_LINK_ERROR };
  }

  return redirect("/admin/set-password");
}

// Mutation requires both an authenticated active staff identity and the
// Recent, signed, user-bound invite/recovery flow cookie established above.
// react-doctor-disable-next-line react-doctor/server-auth-actions
export async function setPasswordAction(
  _state: Readonly<SetPasswordActionState>,
  formData: FormData,
): Promise<SetPasswordActionState> {
  const password = credential(formData, "password", false);
  const confirmation = credential(formData, "passwordConfirmation", false);
  const validationError = validateNewPassword(password, confirmation);
  if (validationError !== null) return validationError;

  const [supabase, staff] = await Promise.all([serverClient(), getVerifiedStaffAuthState()]);
  const flow = staff !== null ? await readPasswordAuthFlow(staff.id) : null;
  const expectedFlow =
    staff !== null && staff.onboardedAt !== null && staff.onboardedAt !== ""
      ? "recovery"
      : "invite";

  if (staff === null || !staff.active || flow === null || flow !== expectedFlow) {
    await clearPasswordAuthFlow();
    await supabase.auth.signOut({ scope: "local" });
    return { error: INVALID_AUTH_LINK_ERROR, changeCommitted: false };
  }

  const completionError = await completePasswordChange(supabase, staff, flow, password);
  if (completionError !== null) return completionError;
  return redirect("/admin");
}

/**
 * Recovery's one deliberate submit: validate before consuming the bearer,
 * verify it (or reuse the bounded signed retry flow), reauthorize from the
 * staff profile, update and audit the password, then establish a fresh
 * password session before entering the portal.
 */
// react-doctor-disable-next-line react-doctor/server-auth-actions
export async function recoverPasswordAction(
  _state: Readonly<SetPasswordActionState>,
  formData: FormData,
): Promise<SetPasswordActionState> {
  const password = credential(formData, "password", false);
  const confirmation = credential(formData, "passwordConfirmation", false);
  const validationError = validateNewPassword(password, confirmation);
  if (validationError !== null) return validationError;

  const tokenHash = credential(formData, "tokenHash");
  const supabase = await serverClient();
  let staff: PortalStaffAuthState | null = null;
  let flow: PasswordAuthFlow | null = null;

  try {
    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser();
    if (sessionUser !== null) {
      const candidate = await resolveStaffAuthState(sessionUser);
      const candidateFlow = candidate !== null ? await readPasswordAuthFlow(candidate.id) : null;
      if (
        candidate?.active === true &&
        candidate.onboardedAt !== null &&
        candidate.onboardedAt !== "" &&
        candidateFlow === "recovery"
      ) {
        staff = candidate;
        flow = "recovery";
      }
    }

    if (staff === null || flow === null) {
      if (tokenHash.length < 20 || tokenHash.length > 2048) {
        return { error: INVALID_AUTH_LINK_ERROR, changeCommitted: false };
      }

      await clearPasswordAuthFlow();
      await supabase.auth.signOut({ scope: "local" });
      const verified = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "recovery",
      });
      if (verified.error !== null || verified.data.user === null) {
        await supabase.auth.signOut({ scope: "local" });
        return { error: INVALID_AUTH_LINK_ERROR, changeCommitted: false };
      }

      const verifiedStaff = await resolveStaffAuthState(verified.data.user);
      if (
        verifiedStaff === null ||
        !verifiedStaff.active ||
        verifiedStaff.onboardedAt === null ||
        verifiedStaff.onboardedAt === ""
      ) {
        await supabase.auth.signOut({ scope: "local" });
        return { error: INVALID_AUTH_LINK_ERROR, changeCommitted: false };
      }

      await establishPasswordAuthFlow("recovery", verifiedStaff.id);
      staff = verifiedStaff;
      flow = "recovery";
    }
  } catch {
    try {
      await clearPasswordAuthFlow();
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Best-effort cleanup; the visible failure remains generic.
    }
    return { error: INVALID_AUTH_LINK_ERROR, changeCommitted: false };
  }

  const completionError = await completePasswordChange(supabase, staff, flow, password);
  if (completionError !== null) return completionError;
  return redirect("/admin");
}
