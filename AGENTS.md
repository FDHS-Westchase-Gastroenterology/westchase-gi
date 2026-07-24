<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project rules — Westchase GI website

Patient-facing site for FDHS Westchase Gastroenterology (Tampa + Lutz). Faithful polish of the
practice's former vendor site: same identity, source-grounded facts, repaired patient paths —
plus the appointment-request pipeline (POST → Supabase Postgres queue → PHI-free staff
notifications) and the authenticated staff portal at `/admin`.

## Hard rules

1. **Provider credentials are verbatim and load-bearing.** Chang is "MD, FACG"; Awad is "MD"
   (client-corrected 2026-07-06 — he is NOT FACG, and his own FDHS card graphic says MD only);
   Mendoza is "MD, MS" (never FACG); NPs are "MSN, APRN, FNP-C" (Family Nurse Practitioner);
   Juliet Oliva is "Practice Manager & Infusion Nurse" (manager credit added at her request
   2026-07-06). Never edit, reorder, or "simplify" titles.
   Source of truth: `src/lib/providers.ts`.
2. **Source-mirror graphics stay byte-exact.** Harvested graphics and official provider-card
   files preserved as source mirrors in `public/images/` were SHA-verified at import; never
   re-encode or resize those files, and let `next/image` handle delivery. The six files under
   `public/images/staff/headshots/` are a documented exception: intentionally resized/optimized
   derivatives whose source originals remain in the private engagement archive. Do not describe
   those six derivatives as byte-exact or replace them without approved source provenance.
3. **The FDHS header stays.** "FDHS Westchase Gastroenterology" with the exact harvested logo.
4. **The text line (813) 564-0315 is a staffed human channel.** Keep it prominent; never frame
   it as automated.
5. **Five locales are first-class.** Any patient-facing copy change lands in ALL of
   `src/lib/dictionaries/{en,es,vi,ko,ar}.ts` — the shared `Dictionary` type makes a missing
   key a build error. Never ship one locale ahead of another. Arabic is RTL
   (`localeDir` in `src/lib/site.ts`). The `/admin` portal is English-only by scope decision
   and keeps its strings in plain TSX, not the patient dictionaries. Portal UI work follows
   `docs/PORTAL-PRODUCT.md` (task-first product register; the root `PRODUCT.md` covers the
   patient site only).
6. **One-way linking:** this site may link to Alpha Omega Wellness (footer). Never accept the
   reverse expectation into this codebase; it's owned by the other project.
7. **No invented facts.** Unconfirmed details live in README's pending-confirmations list and
   explicit dated source comments; do not infer confirmation from a value merely being present.
   Patient documents without a file in `public/documents/` fall back to the staffed text line
   (forms/prep) or "printable version on the way" (disease sheets that already have on-site
   education pages).
8. **Compliance and PHI-minimal posture:** conservative medical phrasing; no outcome
   guarantees; the appointment form keeps its "do not submit PHI" warning verbatim in all five
   locales. The form collects callback-request fields only: name, phone, optional email,
   office/time preference, and an optional brief reason. There are no dedicated clinical fields,
   and the UI asks patients to avoid medical details, but patient-supplied reasons must still be
   treated as potentially sensitive. Requests are callback leads for a scheduling coordinator,
   not live scheduling. Notification emails carry zero patient fields; server logs never print
   patient values; patient data never appears in a URL.
9. **The "accepting new patients" notice** is a dismissible banner shown once per visitor
   (30-day localStorage). Never turn it back into a per-page modal.
10. **Intake pipeline invariants.** The success state renders only after the durable Postgres
    insert (`src/lib/portal/intake.ts`); failure and unknown states stay distinct and always
    surface the call/text fallback; the no-JS path is a native POST with a status-only receipt
    URL. The honeypot drop returns a success-shaped response. Never weaken these.
11. **Portal security invariants.** `/admin/*` is closed by the proxy except the explicit
    authentication-entry routes. Every management action/route authenticates first
    (`requireRole`); login, reset request, and one-time-link confirmation are deliberate public
    session-establishment boundaries and must stay generic/fail-closed. Authorization reads
    `staff_profiles` via the service client — never user-editable metadata. The service-role key
    exists only in server-only modules; `NEXT_PUBLIC_*` never holds secrets. RLS stays enabled on
    every table with zero anon grants and no authenticated write policies (all writes go through
    service-role server actions). Every staff-visible mutation writes an `audit_log` row.
    The GitHub connection authenticates only through the clinic-owned GitHub App, with its
    three credentials kept in server-only environment variables. Never use a personal access
    token, expose App credentials to the browser, or widen the App beyond its documented
    least-privilege permissions. The portal does not connect to or manage Vercel
    (`docs/INTEGRATION-ACTIVATION.md`).

## Known current reconciliation items (2026-07-20)

- The canonical patient origin is the apex `https://westchasegi.com`; `www` redirects to it.
  Runtime `site.url` still incorrectly uses `www`, so canonical/OG/hreflang/sitemap/robots output
  currently publishes redirecting URLs. Do not describe `www` as the intended canonical origin.
- Some procedure-prep, blog, and education availability strings still say EN/ES despite all five
  locales being present. External Hushforms packets really are EN/ES-only; clinical-care language
  claims require practice confirmation rather than a mechanical five-language rewrite.
- GitHub, Vercel, and Porkbun custody are verified clinic-controlled. Supabase account/org custody
  and Resend account/team custody are not evidenced as complete. The Resend domain and Production
  application sender are configured, but that is not account custody. Keep the Website page's
  explicit custody split accurate until the practice-controlled handoff is documented.
- Development and Production both have the intended five portal tables and five service-only RPCs
  through migration `20260720102654`. Production registry retirement, schema/security assertions,
  atomic-rollback verification, and the first-login-tour/public-site-link smoke passed on
  `1124668`; no temporary acceptance rows or accounts remain.
- The GitHub repository homepage still points at dead `new-westchase-gi.vercel.app`; the intended
  homepage is `https://westchasegi.com`.

## Verification

- `npm run build`, `npm run lint`, and `npm run doctor` must execute; the local React Doctor
  standard is 100. The required GitHub status remains advisory while current findings are
  reconciled, so a green check proves execution, not a clean score—inspect its report. The
  dependency controller separately rejects auto-merge when an exact-head PR scan reports errors.
- `npx playwright test` must pass (see README §Tests; specs run against a development
  Supabase project via `.env.local`).
- `node scripts/verify-no-secrets.mjs` proves the history stays free of secret material;
  `scripts/verify-schema.mjs --target dev|prod` checks schema/RLS/seed state.
- External links: only ship URLs verified live (see README's link table); anything unverified
  stays out.
