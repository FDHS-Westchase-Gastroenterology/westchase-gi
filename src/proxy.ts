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

export function proxy(request: NextRequest) {
  const { nextUrl } = request;

  const carriesPatientData = PATIENT_PARAMS.some((param) =>
    nextUrl.searchParams.has(param),
  );
  if (!carriesPatientData) {
    return NextResponse.next();
  }

  const clean = nextUrl.clone();
  for (const param of PATIENT_PARAMS) {
    clean.searchParams.delete(param);
  }
  return NextResponse.redirect(clean, 301);
}

export const config = {
  // Tight matcher: only the two routes the old form targeted, per locale.
  // The rest of the site (and the portal) never pays the proxy cost.
  matcher: [
    "/:locale(en|es|vi|ko|ar)/contact",
    "/:locale(en|es|vi|ko|ar)/appointment",
  ],
};
