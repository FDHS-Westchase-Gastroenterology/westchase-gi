import { NextResponse, type NextRequest } from "next/server";
import {
  clearPasswordAuthFlow,
  establishPasswordAuthFlow,
  resolveStaffAuthState,
} from "@/lib/portal/auth";
import { portalUrl } from "@/lib/portal/email";
import { serverClient } from "@/lib/portal/server";

function trustedRedirect(path: string): NextResponse {
  const target = portalUrl(path);
  if (!target) {
    return new NextResponse("Portal authentication is unavailable.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
  return NextResponse.redirect(target);
}

/** Supports Supabase's official PKCE callback in addition to token-hash links. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim();
  if (!code || code.length > 2048) {
    return trustedRedirect("/admin/login?auth=invalid");
  }

  try {
    const supabase = await serverClient();
    await clearPasswordAuthFlow();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) {
      await supabase.auth.signOut({ scope: "local" });
      return trustedRedirect("/admin/login?auth=invalid");
    }

    const staff = await resolveStaffAuthState(data.user);
    if (!staff?.active) {
      await supabase.auth.signOut({ scope: "local" });
      return trustedRedirect("/admin/login?auth=invalid");
    }

    await establishPasswordAuthFlow(
      staff.onboardedAt ? "recovery" : "invite",
      staff.id,
    );
    return trustedRedirect("/admin/set-password");
  } catch {
    try {
      const supabase = await serverClient();
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Best-effort cleanup; never expose provider details.
    }
    try {
      await clearPasswordAuthFlow();
    } catch {
      // Best-effort cleanup when cookie storage is unavailable.
    }
    return trustedRedirect("/admin/login?auth=invalid");
  }
}
