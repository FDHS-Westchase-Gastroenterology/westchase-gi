"use server";

import { redirect } from "next/navigation";
import {
  getSessionUser,
  requireRole,
} from "@/lib/portal/auth";
import { serverClient } from "@/lib/portal/server";

export type LoginActionState = {
  error: string | null;
};

const GENERIC_LOGIN_ERROR =
  "Unable to sign in. Check your credentials and try again.";

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
