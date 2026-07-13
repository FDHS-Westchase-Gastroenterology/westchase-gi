<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project rules — Westchase GI website

Patient-facing site for FDHS Westchase Gastroenterology (Tampa + Lutz). Faithful polish of the
practice's existing site: same identity, verified facts, zero broken links — plus the
appointment-request pipeline (POST → Supabase Postgres queue → PHI-free staff notifications)
and the authenticated staff portal at `/admin`.

## Hard rules

1. **Provider credentials are verbatim and load-bearing.** Chang is "MD, FACG"; Awad is "MD"
   (client-corrected 2026-07-06 — he is NOT FACG, and his own FDHS card graphic says MD only);
   Mendoza is "MD, MS" (never FACG); NPs are "MSN, APRN, FNP-C" (Family Nurse Practitioner);
   Juliet Oliva is "Practice Manager & Infusion Nurse" (manager credit added at her request
   2026-07-06). Never edit, reorder, or "simplify" titles.
   Source of truth: `src/lib/providers.ts`.
2. **Practice-owned images in `public/images/` are byte-exact copies** of the practice's own
   graphics (SHA-verified at import). Never re-encode, resize on disk, or "optimize" them;
   let `next/image` handle delivery.
3. **The FDHS header stays.** "FDHS Westchase Gastroenterology" with the exact harvested logo.
4. **The text line (813) 564-0315 is a staffed human channel.** Keep it prominent; never frame
   it as automated.
5. **Five locales are first-class.** Any patient-facing copy change lands in ALL of
   `src/lib/dictionaries/{en,es,vi,ko,ar}.ts` — the shared `Dictionary` type makes a missing
   key a build error. Never ship one locale ahead of another. Arabic is RTL
   (`localeDir` in `src/lib/site.ts`). The `/admin` portal is English-only by scope decision
   and keeps its strings in plain TSX, not the patient dictionaries.
6. **One-way linking:** this site may link to Alpha Omega Wellness (footer). Never accept the
   reverse expectation into this codebase; it's owned by the other project.
7. **No invented facts.** Unconfirmed details (see `NEEDS CONFIRMATION` comments in
   `src/lib/site.ts` and the README) render as honest fallbacks, not guesses. Patient documents
   without a file in `public/documents/` fall back to the staffed text line (forms/prep) or
   "printable version on the way" (disease sheets that already have on-site education pages).
8. **Compliance and PHI-minimal posture:** conservative medical phrasing; no outcome
   guarantees; the appointment form keeps its "do not submit PHI" warning verbatim in all five
   locales. The form collects only appointment-request contact fields (name, phone, email,
   office/time preference, a brief reason) — never clinical data. Requests are callback leads
   for a scheduling coordinator, not live scheduling. Notification emails carry zero patient
   fields; server logs never print patient values; patient data never appears in a URL.
9. **The "accepting new patients" notice** is a dismissible banner shown once per visitor
   (30-day localStorage). Never turn it back into a per-page modal.
10. **Intake pipeline invariants.** The success state renders only after the durable Postgres
    insert (`src/lib/portal/intake.ts`); failure and unknown states stay distinct and always
    surface the call/text fallback; the no-JS path is a native POST with a status-only receipt
    URL. The honeypot drop returns a success-shaped response. Never weaken these.
11. **Portal security invariants.** `/admin/*` is closed by the proxy and every server
    action/route authenticates first (`requireRole`); authorization reads `staff_profiles`
    via the service client — never user-editable metadata. The service-role key exists only in
    server-only modules; `NEXT_PUBLIC_*` never holds secrets. RLS stays enabled on every
    table with zero anon grants and no authenticated write policies (all writes go through
    service-role server actions). Every staff-visible mutation writes an `audit_log` row.
    No GitHub/Vercel credential is ever wired into the portal — the integration seams stay
    inert until the post-transfer GitHub App (`docs/INTEGRATION-ACTIVATION.md`).

## Verification

- `npm run build`, `npm run lint`, and `npm run doctor` (React Doctor, 100 baseline) must pass.
- `npx playwright test` must pass (see README §Tests; specs run against a development
  Supabase project via `.env.local`).
- `node scripts/verify-no-secrets.mjs` proves the history stays free of secret material;
  `scripts/verify-schema.mjs --target dev|prod` checks schema/RLS/seed state.
- External links: only ship URLs verified live (see README's link table); anything unverified
  stays out.
