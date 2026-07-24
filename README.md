# Westchase Gastroenterology — westchasegi.com

Patient-facing website for **FDHS Westchase Gastroenterology** (Florida Digestive Health
Specialists network), serving Tampa and Lutz, FL. A faithful, polished rebuild of the practice's
former vendor site: same identity and source-grounded content, repaired patient paths, fully
multilingual — plus a durable appointment-request pipeline and a staff admin portal.

Built with Next.js 16 (App Router) + Tailwind CSS 4, with Supabase (Postgres + Auth) behind the
intake pipeline and portal, and an application-owned email capability with Resend as its current
production adapter. Deployed from the clinic-owned GitHub repository to the clinic-owned Vercel
project. The new site has been live at **https://westchasegi.com** since the 2026-07-18 DNS
cutover; the apex is canonical, `www` redirects to it, and `westchase-gi.vercel.app` remains an
attached deployment alias.

## Five languages

Every patient-facing surface renders in **English, Spanish, Vietnamese, Korean, and Arabic**
(`/en /es /vi /ko /ar`, with hreflang alternates and full RTL for Arabic). The five dictionaries
in `src/lib/dictionaries/` share one `Dictionary` type, so a missing key anywhere fails the
build: no locale can drift behind another. The staff portal (`/admin`) is English-only by
design — it is an internal tool, not a patient surface.

## The appointment-request pipeline

The old form fed an Officite-side queue the practice did not know to monitor, where patient
requests accumulated unseen and unworked. Now:

- The form on `/{locale}/appointment` and `/{locale}/contact` POSTs to `/api/requests`, which
  validates server-side, drops honeypot-filled bot submissions, rate-limits, and **persists the
  request in the application's Postgres queue before any success message renders**. Distinct
  failure and unknown states tell the patient to call or text if anything goes wrong — the site
  never fakes a confirmation.
- Without JavaScript the form still works: a native POST lands on a server-rendered receipt
  page, and no patient data ever rides a URL.
- Staff on the notification list get a **PHI-free email ping** (a stable notice and portal link —
  no patient fields) through the application email capability; every provider-accepted or failed
  attempt is recorded per recipient.
- **PHI-minimal posture:** the site collects only callback-request fields (name, phone, optional
  email, office/time preferences, and an optional brief reason). It has no dedicated clinical
  fields and asks patients to avoid medical details, but the persisted reason must still be
  treated as potentially sensitive patient-supplied context. The request queue — not any inbox —
  is the system of record. The warning renders in all five languages.

## The staff portal (`/admin`)

Authenticated staff tool (Supabase Auth + row-level security; roles enforced server-side from
a staff-profiles table). Staff land on a task-first **home page** — a greeting, the live
new-request status, and the portal's jobs in plain language — then work: a requests queue at
`/admin/requests` with triage lifecycle (new → contacted → scheduled → closed) and attributed
notes, notification-recipient management, staff account management with emailed single-use setup
links, an audit log of every mutation, CSV export, a plain-English help page, a Website custody
surface with live server-side GitHub status, and an administrator-only review-flyer printer
(reached from Home and the Website page — occasional tasks do not hold permanent tabs).
Westchase GI is the one managed product; the portal and printer are capabilities of the same
application and canonical repository. The printer serves its approved PDF, SVG, and PNG
artifacts through the same server-enforced portal boundary; no flyer download lives in `public/`
or depends on a separate application. Hosting custody is shown as a static clinic-owned fact;
the portal does not connect to or manage Vercel. See `docs/PORTAL-PRODUCT.md` for the portal's
product definition (the root `PRODUCT.md` covers the patient site), `docs/INTEGRATION-ACTIVATION.md`
for the custody and connection runbook, and `docs/PORTAL-OPS.md` for day-to-day operations.

## What this rebuild fixes (vs. the previous vendor site)

- **The old site exposed 33 dead patient-PDF links.** The rebuild uses a deliberate 31-slot
  registry (`src/lib/documents.ts`) after retiring registration/privacy printables covered by
  the live online packet: 2 record-release forms, 13 procedure preps, and 16 disease sheets.
  A slot renders a download only when a current PDF exists. Disease-information topics are
  readable on-site today (`/patient-education`), and **every procedure prep the practice
  currently prescribes is readable and printable on-site in all five languages**
  (`/procedure-prep`; content module: `src/lib/content/preps/`, from the practice's 2026-07-07
  scan, with transcriptions human-checked and source discrepancies preserved in comments). The
  two record-release slots offer the staffed text line until their PDFs arrive; the live EN/ES
  Hushforms packet remains the primary new-patient form path.
- **Appointment requests are durable** (see the pipeline above) — the old vendor queue's
  unseen-request failure is gone, and staff run the whole operation from `/admin`.
- **The blog is on-site** (`/blog`): the old blog's 16 current posts (Nov 2025 – Jun 2026),
  same titles and dates, in all five site languages, with original bodies (the old bodies were
  vendor-licensed text that doesn't transfer). Old post URLs permanently redirect to the new slugs.
- **The patient-education library is on-site** (`/patient-education`): all 17 topics from the
  old ASGE-licensed library rebuilt as original five-language pages (same titles), plus one
  page per disease-information sheet, each with a printable-PDF slot. Old category URLs
  permanently redirect.
- **"Accepting new patients" popup** fired as a full-screen modal on every page, every day.
  Now a dismissible banner shown once per visitor (30-day localStorage).
- **Per-page titles and descriptions** (the old site repeated one meta description on all 64
  pages), JSON-LD for both offices (Lutz was missing), physician schema, blog-post schema,
  sitemap, and redirects for every mapped legacy URL from the 64-page capture.
- **Privacy hardening:** map embeds send no referrer; legacy patient-bearing query strings
  are scrubbed at the proxy before any third-party resource loads; CI workflow actions are
  pinned to commit SHAs; an executable script (`scripts/verify-no-secrets.mjs`) proves no
  secret material sits in git history.
- Dead links repaired or removed, typos fixed, `callto:` → `sms:`/`tel:`.
- Empty physician bio pages are gone; bios slot into `src/lib/providers.ts` when the practice
  supplies them.

## Develop

```bash
npm install
cp .env.example .env.local   # fill in real values (see docs/PORTAL-OPS.md)
npm run dev                  # http://localhost:3000 (cookie → Accept-Language → en fallback)
npm run dev:mission          # the E2E stack's server on port 3100
npm run build && npm run lint && npm run doctor
```

Content lives in `src/lib/` (site facts, dictionaries, providers, services, documents,
resources, testimonials). Pages in `src/app/[locale]/` render all five locales from one
codebase; the portal lives in `src/app/admin/`.

### Tests

```bash
npx playwright install chromium   # once
npx playwright test               # full serial E2E suite (boots its own server on :3100)
npx playwright test e2e/smoke.spec.ts   # focused file
```

The suite covers the intake API contract, form states across all five locales, the no-JS
fallback, portal auth/RLS boundaries, the queue lifecycle, management surfaces, Website custody,
and leak hygiene. Specs run against the Supabase project named in `.env.local` (use a development
project, never production) and toggle notification recipients off for the run so
no real emails send. The committed configuration uses one worker because the shared development
Auth project rate-limits concurrent sign-ins and recovery requests; do not override that for
login-heavy portal specs.

## Adding a patient PDF

1. Drop the file in `public/documents/`, e.g. `public/documents/prep-miralax.pdf`.
2. In `src/lib/documents.ts`, set that entry's `file: "/documents/prep-miralax.pdf"`.
3. Done: the row (and, for disease sheets, the education page's take-home box) switches
   to a download link in all five languages.

## Known current reconciliation follow-ups

These are known mismatches, not intended product behavior:

- The intended canonical origin is the apex `https://westchasegi.com`, but `site.url` still uses
  `https://www.westchasegi.com`. That makes current canonical, Open Graph, hreflang, sitemap, and
  robots output publish URLs that immediately redirect. The runtime fix remains outstanding.
- Some patient-facing procedure-prep, blog, and education availability copy still says “English
  and Spanish” even though those pages exist in all five locales. External Hushforms packets are
  genuinely EN/ES-only; clinical-care language claims need practice confirmation before editing.
- The GitHub repository homepage still points to the retired
  `new-westchase-gi.vercel.app` deployment instead of the live apex.
- Production schema parity through migration `20260720102654` was verified on 2026-07-20: the
  retired software registry is gone, tour persistence is live, and authenticated first-login-tour
  plus public-site-link/session-continuity acceptance passed on `1124668`. Clinic-approved email
  canaries, hosted-Auth sender work, review-flyer acceptance, and standalone flyer-tool retirement
  remain separate handover work. GitHub issue
  [#24](https://github.com/FDHS-Westchase-Gastroenterology/westchase-gi/issues/24) is the canonical
  full Production workflow checklist; current operational detail lives in
  `docs/PORTAL-OPS.md` and `docs/INTEGRATION-ACTIVATION.md`.

## Pending practice confirmations

Confirmed facts carry dated source comments where useful; unresolved practice questions live
here rather than behind a generic marker. Tampa hours are 8:00–5:00, Lutz hours are 8:00–4:30,
and the Facebook page/reviews are verified and live. Still open:

- Yelp profile, if the practice wants one linked (held until confirmed live)
- Physician bios (2–3 sentences each)
- Current PDFs for the remaining document slots — the two record-release forms, printable
  disease sheets, and optional clean per-document prep PDFs. Procedure-prep source scans arrived
  and shipped as native printable pages on 2026-07-07; registration/privacy printables were
  deliberately retired because the live online packet covers them.
- Prep wording questions for the practice (originals reproduced verbatim meanwhile, flagged
  in `src/lib/content/preps/` comments): the split-dose MiraLAX English vs Spanish sheets
  disagree on afternoon timings (2/4/6 PM vs 1/3/5 PM); the Spanish colonoscopy sheet's
  GLP-1 hold instruction names the drugs but no day count (English says 7 days); the
  Golytely split-dose sheet's "one hour after completing step 4" forward reference.
- Vietnamese, Korean, and Arabic medical content shipped translated by the build process and
  awaits native-speaker verification (the established ship-then-verify policy). English is the
  source baseline; the practice-published Spanish homepage block is source-grounded, while the
  remaining Spanish translation also awaits the practice's native-speaker review.
