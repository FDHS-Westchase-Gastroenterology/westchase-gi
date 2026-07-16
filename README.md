# Westchase Gastroenterology — westchasegi.com

Patient-facing website for **FDHS Westchase Gastroenterology** (Florida Digestive Health
Specialists network), serving Tampa and Lutz, FL. A faithful, polished rebuild of the practice's
existing site: same identity and content, every defect fixed, fully multilingual — plus a real
appointment-request pipeline and a staff admin portal.

Built with Next.js 16 (App Router) + Tailwind CSS 4, with Supabase (Postgres + Auth) behind the
intake pipeline and portal, and Resend for staff notifications. Deployed from the clinic-owned
GitHub repository to the clinic-owned Vercel project; goes live at `westchasegi.com` at DNS
cutover.

## Five languages

Every patient-facing surface renders in **English, Spanish, Vietnamese, Korean, and Arabic**
(`/en /es /vi /ko /ar`, with hreflang alternates and full RTL for Arabic). The five dictionaries
in `src/lib/dictionaries/` share one `Dictionary` type, so a missing key anywhere fails the
build: no locale can drift behind another. The staff portal (`/admin`) is English-only by
design — it is an internal tool, not a patient surface.

## The appointment-request pipeline

The old site's form silently discarded submissions. Now:

- The form on `/{locale}/appointment` and `/{locale}/contact` POSTs to `/api/requests`, which
  validates server-side, drops honeypot-filled bot submissions, rate-limits, and **persists the
  request in the practice's own Postgres queue before any success message renders**. Distinct
  failure and unknown states tell the patient to call or text if anything goes wrong — the site
  never fakes a confirmation.
- Without JavaScript the form still works: a native POST lands on a server-rendered receipt
  page, and no patient data ever rides a URL.
- Staff on the notification list get a **PHI-free email ping** (a count and a portal link — no
  patient fields) via Resend; every attempt is recorded per recipient.
- **PHI-minimal posture:** the site collects only appointment-request contact fields (name,
  phone, email, office/time preferences, a brief reason). No clinical data. The request queue —
  not any inbox — is the system of record. The form's "do not submit PHI" warning renders in
  all five languages.

## The staff portal (`/admin`)

Authenticated staff tool (Supabase Auth + row-level security; roles enforced server-side from
a staff-profiles table): a requests queue with triage lifecycle (new → contacted → scheduled →
closed) and attributed notes, notification-recipient management, staff account management with
emailed single-use setup links, an audit log of every mutation, CSV export, a plain-English help
page, a software/access registry with live server-side GitHub status, and an administrator-only
review-flyer printer. The printer serves its approved PDF, SVG, and PNG artifacts through the
same server-enforced portal boundary; no flyer download lives in `public/` or depends on a
separate application. The Vercel integration remains deliberately deferred — see
`docs/INTEGRATION-ACTIVATION.md` for the custody and connection runbook, and
`docs/PORTAL-OPS.md` for day-to-day operations.

## What this rebuild fixes (vs. the previous vendor site)

- **33 dead patient PDFs** (new-patient forms, colonoscopy prep instructions, disease sheets)
  are now a registry (`src/lib/documents.ts`): each renders a real download link only once the
  current PDF exists in `public/documents/`. Disease-information topics are readable ON the
  site today (`/patient-education`), and **every procedure prep the practice currently
  prescribes is readable AND printable on-site** (`/procedure-prep`, 13 handouts × EN/ES,
  print styled as a letterheaded handout — content module: `src/lib/content/preps/`, from
  the practice's 2026-07-07 scan, dose timings human-verified). New-patient forms offer the
  staffed text line until the practice's PDFs arrive.
- **Appointment requests are durable** (see the pipeline above) — the old form's silent
  data loss is gone, and staff run the whole operation from `/admin`.
- **The blog is on-site** (`/blog`): the old blog's 16 current posts (Nov 2025 – Jun 2026),
  same titles and dates, bilingual, with original bodies (the old bodies were vendor-licensed
  text that doesn't transfer). Old post URLs 301 to the new slugs.
- **The patient-education library is on-site** (`/patient-education`): all 17 topics from the
  old ASGE-licensed library rebuilt as original bilingual pages (same titles), plus one page
  per disease-information sheet, each with a printable-PDF slot. Old category URLs 301.
- **"Accepting new patients" popup** fired as a full-screen modal on every page, every day.
  Now a dismissible banner shown once per visitor (30-day localStorage).
- **Per-page titles and descriptions** (the old site repeated one meta description on all 64
  pages), JSON-LD for both offices (Lutz was missing), physician schema, blog-post schema,
  sitemap, redirects for every legacy URL.
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
npm run dev                  # http://localhost:3000 (redirects to /en)
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
fallback, portal auth/RLS boundaries, the queue lifecycle, management surfaces, the registry,
and leak hygiene. Specs run against the Supabase project named in `.env.local` (use a
development project, never production) and toggle notification recipients off for the run so
no real emails send. The committed configuration uses one worker because the shared development
Auth project rate-limits concurrent sign-ins and recovery requests; do not override that for
login-heavy portal specs.

## Adding a patient PDF

1. Drop the file in `public/documents/`, e.g. `public/documents/prep-miralax.pdf`.
2. In `src/lib/documents.ts`, set that entry's `file: "/documents/prep-miralax.pdf"`.
3. Done: the row (and, for disease sheets, the education page's take-home box) switches
   to a download link in both languages.

## Pending practice confirmations

Centralized in `src/lib/site.ts` (marked `NEEDS CONFIRMATION`), currently shipping the values
from the practice's primary contact page:

- Lutz office hours (Tampa's were practice-confirmed 2026-07-03; Lutz still shows the
  practice-published schedule pending confirmation)
- Facebook / Yelp profiles (links held until confirmed live)
- Physician bios (2–3 sentences each)
- Current PDFs for the document registry — procedure preps ARRIVED + shipped on-site
  2026-07-07; still awaited: patient-registration packet + printable disease-sheet PDFs
  (on arrival use the drop-in steps above). Prep pages print natively; their `file:` slots
  stay open only for clean per-document PDFs if the practice supplies them.
- Prep wording questions for the practice (originals reproduced verbatim meanwhile, flagged
  in `src/lib/content/preps/` comments): the split-dose MiraLAX English vs Spanish sheets
  disagree on afternoon timings (2/4/6 PM vs 1/3/5 PM); the Spanish colonoscopy sheet's
  GLP-1 hold instruction names the drugs but no day count (English says 7 days); the
  Golytely split-dose sheet's "one hour after completing step 4" forward reference.
- Vietnamese, Korean, and Arabic medical content shipped translated by the build process and
  awaits native-speaker verification (the established ship-then-verify policy); EN/ES remain
  the human-verified baseline.
