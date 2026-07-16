"use server";

import { redirect } from "next/navigation";
import {
  clearPasswordAuthFlow,
  establishPasswordAuthFlow,
  getSessionUser,
  getVerifiedStaffAuthState,
  readPasswordAuthFlow,
  requireRole,
  resolveStaffAuthState,
} from "@/lib/portal/auth";
import { portalUrl, serverClient, serviceClient } from "@/lib/portal/server";

export type LoginActionState = {
  error: string | null;
};

export type ResetRequestActionState = {
  submitted: boolean;
};

export type ConfirmAuthActionState = {
  error: string | null;
};

export type SetPasswordActionState = {
  error: string | null;
};

const GENERIC_LOGIN_ERROR =
  "Unable to sign in. Check your credentials and try again.";
const INVALID_AUTH_LINK_ERROR =
  "This link is invalid or expired. Request another reset or ask your portal administrator for a new invitation.";
const SET_PASSWORD_ERROR =
  "Unable to set your password. Request a new link and try again.";
const INVITE_PASSWORD_UPDATED_INCOMPLETE =
  "Your password was changed, but account setup could not finish. Ask your portal administrator for a new invitation.";
const RECOVERY_PASSWORD_UPDATED_INCOMPLETE =
  "Your password was changed, but the reset could not be fully recorded. Sign in with your new password and tell your portal administrator.";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function loginError(): LoginActionState {
  return { error: GENERIC_LOGIN_ERROR };
}

function credential(
  formData: FormData,
  name: string,
  trim = true,
): string {
  const value = formData.get(name);
  if (typeof value !== "string") return "";
  return trim ? value.trim() : value;
}

async function passwordUpdatedIncomplete(
  flow: "invite" | "recovery",
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
        : RECOVERY_PASSWORD_UPDATED_INCOMPLETE,
  };
}

/**
 * Public by necessity: this is the sole action that establishes a portal
 * session. Every action available after sign-in must call requireRole().
 */
export async function loginAction(
  _state: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = credential(formData, "email");
  const password = credential(formData, "password", false);

  if (!email || email.length > 254 || !password || password.length > 1024) {
    return loginError();
  }

  try {
    const supabase = await serverClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return loginError();

    // A valid Auth account is not enough: staff_profiles is authoritative.
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      await supabase.auth.signOut({ scope: "local" });
      return loginError();
    }
  } catch {
    return loginError();
  }

  redirect("/admin");
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
  _state: ResetRequestActionState,
  formData: FormData,
): Promise<ResetRequestActionState> {
  const email = credential(formData, "email").toLowerCase();
  const redirectTo = portalUrl("/admin/auth/confirm");

  if (redirectTo && email.length <= 254 && EMAIL_RE.test(email)) {
    try {
      const supabase = await serverClient();
      await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    } catch {
      // Provider state must not create an account-enumeration oracle.
    }
  }

  return { submitted: true };
}

/** Token-hash verification happens only after the human presses Continue. */
export async function confirmAuthLinkAction(
  _state: ConfirmAuthActionState,
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

    if (error || !data.user) {
      await supabase.auth.signOut({ scope: "local" });
      return { error: INVALID_AUTH_LINK_ERROR };
    }

    const staff = await resolveStaffAuthState(data.user);
    if (!staff?.active || (type === "invite" && !!staff.onboardedAt)) {
      await supabase.auth.signOut({ scope: "local" });
      return { error: INVALID_AUTH_LINK_ERROR };
    }

    // A recovery token can rescue a consumed-but-unfinished invitation.
    // The database onboarding state, never the token type, decides purpose.
    const flow = staff.onboardedAt ? "recovery" : "invite";
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

  redirect("/admin/set-password");
}

export async function setPasswordAction(
  _state: SetPasswordActionState,
  formData: FormData,
): Promise<SetPasswordActionState> {
  const password = credential(formData, "password", false);
  const confirmation = credential(formData, "passwordConfirmation", false);

  if (password.length < 12) {
    return { error: "Use at least 12 characters for your new password." };
  }
  if (password.length > 1024 || password !== confirmation) {
    return {
      error:
        password !== confirmation
          ? "The passwords do not match."
          : SET_PASSWORD_ERROR,
    };
  }

  const [supabase, staff] = await Promise.all([
    serverClient(),
    getVerifiedStaffAuthState(),
  ]);
  const flow = staff ? await readPasswordAuthFlow(staff.id) : null;
  const expectedFlow = staff?.onboardedAt ? "recovery" : "invite";

  if (!staff?.active || !flow || flow !== expectedFlow) {
    await clearPasswordAuthFlow();
    await supabase.auth.signOut({ scope: "local" });
    return { error: INVALID_AUTH_LINK_ERROR };
  }

  let passwordUpdated = false;
  try {
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error || !data.user) return { error: SET_PASSWORD_ERROR };
    passwordUpdated = true;

    const currentStaff = await resolveStaffAuthState(data.user);
    if (!currentStaff?.active) {
      return passwordUpdatedIncomplete(flow);
    }

    if (flow === "invite") {
      if (currentStaff.onboardedAt) {
        return passwordUpdatedIncomplete(flow);
      }

      const { data: completed, error: completionError } =
        await serviceClient().rpc("portal_complete_staff_onboarding", {
          p_user_id: currentStaff.id,
        });
      if (completionError || completed !== true) {
        return passwordUpdatedIncomplete(flow);
      }
    } else {
      if (!currentStaff.onboardedAt) {
        return passwordUpdatedIncomplete(flow);
      }

      const { data: recorded, error: auditError } = await serviceClient().rpc(
        "portal_record_staff_password_reset",
        { p_user_id: currentStaff.id },
      );
      if (auditError || recorded !== true) {
        return passwordUpdatedIncomplete(flow);
      }
    }
  } catch {
    return passwordUpdated
      ? passwordUpdatedIncomplete(flow)
      : { error: SET_PASSWORD_ERROR };
  }

  await clearPasswordAuthFlow();
  if (flow === "recovery") {
    await supabase.auth.signOut({ scope: "local" });
    redirect("/admin/login?password=updated");
  }
  redirect("/admin");
}
