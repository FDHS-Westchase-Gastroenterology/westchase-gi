import {
  createServerClient,
  type CookieOptions,
} from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Legacy URL hygiene (Next 16 proxy convention — middleware.ts is
// deprecated): the old site's form fell back to GET on some paths, so
// patient-bearing query strings still arrive from stale links, bookmarks,
// and crawler caches. Any such request is redirected to the clean path
// BEFORE the document — and therefore any third-party resource it
// references — can load with those values in the URL.

const PATIENT_PARAMS = [
  "name",
  "phone",
  "email",
  "message",
  "location",
  "time",
] as const;

const LEGACY_FORM_PATH =
  /^\/(?:en|es|vi|ko|ar)\/(?:contact|appointment)\/?$/;

type PendingCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

function portalSupabaseConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();

  return url && key ? { url, key } : null;
}

function scrubLegacyPatientQuery(request: NextRequest): NextResponse | null {
  const { nextUrl } = request;
  if (!LEGACY_FORM_PATH.test(nextUrl.pathname)) return null;

  const carriesPatientData = PATIENT_PARAMS.some((param) =>
    nextUrl.searchParams.has(param),
  );
  if (!carriesPatientData) return null;

  const clean = nextUrl.clone();
  for (const param of PATIENT_PARAMS) {
    clean.searchParams.delete(param);
  }
  return NextResponse.redirect(clean, 301);
}

function applySessionUpdates(
  response: NextResponse,
  cookies: PendingCookie[],
  headers: Record<string, string>,
): NextResponse {
  for (const { name, value, options } of cookies) {
    response.cookies.set(name, value, options);
  }
  for (const [name, value] of Object.entries(headers)) {
    response.headers.set(name, value);
  }
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

async function protectAdminRequest(request: NextRequest): Promise<NextResponse> {
  const isPublicAuthPath = [
    "/admin/login",
    "/admin/forgot-password",
    "/admin/auth/confirm",
    "/admin/auth/callback",
  ].includes(request.nextUrl.pathname);
  const isReviewFlyerAssetPath = request.nextUrl.pathname.startsWith(
    "/admin/review-flyers/assets/",
  );
  const config = portalSupabaseConfig();

  if (!config) {
    const response = isPublicAuthPath || isReviewFlyerAssetPath
      ? NextResponse.next({ request })
      : NextResponse.redirect(new URL("/admin/login", request.url));
    return applySessionUpdates(response, [], {});
  }

  const pendingCookies: PendingCookie[] = [];
  const pendingHeaders: Record<string, string> = {};
  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const cookie of cookiesToSet) {
          request.cookies.set(cookie.name, cookie.value);
          pendingCookies.push(cookie);
        }
        Object.assign(pendingHeaders, headers);
      },
    },
  });

  let authenticated = false;
  try {
    const { data, error } = await supabase.auth.getClaims();
    authenticated =
      !error && typeof data?.claims?.sub === "string";
  } catch {
    // Provider failures fail closed for protected portal routes.
  }

  const response =
    !isPublicAuthPath && !isReviewFlyerAssetPath && !authenticated
      ? NextResponse.redirect(new URL("/admin/login", request.url))
      : NextResponse.next({ request });

  return applySessionUpdates(response, pendingCookies, pendingHeaders);
}

export async function proxy(request: NextRequest) {
  const scrubResponse = scrubLegacyPatientQuery(request);
  if (scrubResponse) return scrubResponse;

  if (request.nextUrl.pathname.startsWith("/admin")) {
    return protectAdminRequest(request);
  }

  return NextResponse.next();
}

export const config = {
  // Keep legacy query scrubbing tight while adding only the portal subtree
  // needed for Supabase session refresh and optimistic route protection.
  matcher: [
    "/:locale(en|es|vi|ko|ar)/contact",
    "/:locale(en|es|vi|ko|ar)/appointment",
    "/admin/:path*",
  ],
};
