import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { INTAKE_FIELDS } from "@/lib/portal/contracts";
import { LOCALE_COOKIE, localeSet, locales } from "@/lib/site";
import type { Locale } from "@/lib/site";

// Legacy URL hygiene (Next 16 proxy convention — middleware.ts is
// Deprecated): the old site's form fell back to GET on some paths, so
// Patient-bearing query strings still arrive from stale links, bookmarks,
// And crawler caches. Any such request is redirected to the clean path
// BEFORE the document — and therefore any third-party resource it
// References — can load with those values in the URL.

const LEGACY_FORM_PATH = new RegExp(`^/(?:${locales.join("|")})/(?:contact|appointment)/?$`);

interface PendingCookie {
  readonly name: string;
  readonly value: string;
  readonly options: CookieOptions;
}

function portalSupabaseConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const keySource = publishable !== undefined && publishable !== "" ? publishable : anon;
  const key = keySource?.trim();

  return url !== undefined && url !== "" && key !== undefined && key !== "" ? { url, key } : null;
}

function isLocaleValue(value: string | undefined): value is Locale {
  return value !== undefined && localeSet.has(value);
}

/** First supported language in the Accept-Language list, by q-value. */
function negotiateLocale(header: string | null): Locale {
  if (header === null || header === "") return "en";

  const candidates = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((param) => param.trim().startsWith("q="));
      const q = qParam !== undefined && qParam !== "" ? Number.parseFloat(qParam.split("=")[1]) : 1;
      const primary = tag.trim().toLowerCase().split("-")[0];
      return { primary, q: Number.isNaN(q) ? 0 : q };
    })
    .filter((candidate) => candidate.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const candidate of candidates) {
    if (isLocaleValue(candidate.primary)) return candidate.primary;
  }
  return "en";
}

/** `/` goes to the visitor's language: their last-used locale when the
 * cookie says so, otherwise the browser's Accept-Language, otherwise
 * English. Replaces the old unconditional `/` -> `/en` redirect that
 * landed every Spanish-dominant patient on the English site. */
function localeRootRedirect(request: NextRequest): NextResponse {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = isLocaleValue(cookieLocale)
    ? cookieLocale
    : negotiateLocale(request.headers.get("accept-language"));

  const destination = request.nextUrl.clone();
  destination.pathname = `/${locale}`;

  const response = NextResponse.redirect(destination, 307);
  // Language-dependent redirect: never let a shared cache pin one answer.
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Vary", "Accept-Language, Cookie");
  return response;
}

function scrubLegacyPatientQuery(request: NextRequest): NextResponse | null {
  const { nextUrl } = request;
  if (!LEGACY_FORM_PATH.test(nextUrl.pathname)) return null;

  const carriesPatientData = INTAKE_FIELDS.some((param) => nextUrl.searchParams.has(param));
  if (!carriesPatientData) return null;

  const clean = nextUrl.clone();
  for (const param of INTAKE_FIELDS) {
    clean.searchParams.delete(param);
  }
  return NextResponse.redirect(clean, 301);
}

function applySessionUpdates(
  response: NextResponse,
  cookies: readonly PendingCookie[],
  headers: Readonly<Record<string, string>>,
): NextResponse {
  for (const { name, value, options } of cookies) {
    response.cookies.set(name, value, options);
  }
  for (const [name, value] of Object.entries(headers)) {
    response.headers.set(name, value);
  }
  response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

function unauthenticatedAdminResponse(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname === "/admin/settings/mutations") {
    return NextResponse.json(
      { ok: false, error: "Unauthenticated" },
      { status: 401, headers: { "X-Content-Type-Options": "nosniff" } },
    );
  }
  return NextResponse.redirect(new URL("/admin/login", request.url));
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
    const response =
      isPublicAuthPath || isReviewFlyerAssetPath
        ? NextResponse.next({ request })
        : unauthenticatedAdminResponse(request);
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
    authenticated = error === null && z.string().safeParse(data?.claims.sub).success;
  } catch {
    // Provider failures fail closed for protected portal routes.
  }

  const response =
    !isPublicAuthPath && !isReviewFlyerAssetPath && !authenticated
      ? unauthenticatedAdminResponse(request)
      : NextResponse.next({ request });

  return applySessionUpdates(response, pendingCookies, pendingHeaders);
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/") {
    return localeRootRedirect(request);
  }

  const scrubResponse = scrubLegacyPatientQuery(request);
  if (scrubResponse) return scrubResponse;

  if (request.nextUrl.pathname.startsWith("/admin")) {
    return protectAdminRequest(request);
  }

  return NextResponse.next();
}

export const config = {
  // Keep legacy query scrubbing tight while adding only the portal subtree
  // Needed for Supabase session refresh and optimistic route protection.
  matcher: [
    "/",
    "/:locale(en|es|vi|ko|ar)/contact",
    "/:locale(en|es|vi|ko|ar)/appointment",
    "/admin/:path*",
  ],
};
