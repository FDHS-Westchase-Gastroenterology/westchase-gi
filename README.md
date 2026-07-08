# Westchase Gastroenterology — westchasegi.com

Patient-facing website for **FDHS Westchase Gastroenterology** (Florida Digestive Health
Specialists network), serving Tampa and Lutz, FL. A faithful, polished rebuild of the practice's
existing site: same identity and content, every defect fixed, fully bilingual.

Built with Next.js 16 (App Router) + Tailwind CSS 4. Deployed on Vercel; goes live at
`westchasegi.com` at DNS cutover.

## What this rebuild fixes (vs. the previous vendor site)

- **33 dead patient PDFs** (new-patient forms, colonoscopy prep instructions, disease sheets)
  are now a registry (`src/lib/documents.ts`): each renders a real download link only once the
  current PDF exists in `public/documents/`. Disease-information topics are readable ON the
  site today (`/patient-education`), and **every procedure prep the practice currently
  prescribes is readable AND printable on-site** (`/procedure-prep`, 13 handouts × EN/ES,
  print styled as a letterheaded handout — content module: `src/lib/content/preps/`, from
  the practice's 2026-07-07 scan, dose timings human-verified). New-patient forms offer the
  staffed text line until the practice's PDFs arrive.
- **The blog is on-site** (`/blog`): the old blog's 16 current posts (Nov 2025 – Jun 2026),
  same titles and dates, bilingual, with original bodies (the old bodies were vendor-licensed
  text that doesn't transfer). The 2019–2025 archive is catalogued in the repo-root parity
  matrix, not ported. Old post URLs 301 to the new slugs.
- **The patient-education library is on-site** (`/patient-education`): all 17 topics from the
  old ASGE-licensed library rebuilt as original bilingual pages (same titles), plus one page
  per disease-information sheet, each with a printable-PDF slot. Old category URLs 301.
- **"Accepting new patients" popup** fired as a full-screen modal on every page, every day.
  Now a dismissible banner shown once per visitor (30-day localStorage).
- **Spanish is a first-class mode** (`/en` + `/es` with hreflang), not a fragment.
- **Per-page titles and descriptions** (the old site repeated one meta description on all 64
  pages), JSON-LD for both offices (Lutz was missing), physician schema, blog-post schema,
  sitemap, redirects for every legacy URL.
- Dead links repaired or removed (Facebook/Yelp held pending live profiles; ccfa.org updated to
  crohnscolitisfoundation.org; ASGE's public patient hub linked as the "more" layer), typos
  fixed ("Practicies", "Barret", "un able to each"), `callto:` → `sms:`/`tel:`.
- Empty physician bio pages are gone; bios slot into `src/lib/providers.ts` when the practice
  supplies them.

Content parity with the old site's 64 captured pages is tracked in `WGI-CONTENT-PARITY.md`
at the workspace root (local doc, not in this repo).

## Non-negotiables (see AGENTS.md)

Verbatim provider credentials; byte-exact practice graphics; the FDHS header; the human-staffed
text line kept prominent; EN/ES parity; no invented facts.

## Develop

```bash
npm install
npm run dev    # http://localhost:3000 (redirects to /en)
npm run build && npm run lint
```

Content lives in `src/lib/` (site facts, dictionaries, providers, services, documents,
resources, testimonials). Pages in `src/app/[locale]/` render both locales from one codebase.

## Adding a patient PDF

1. Drop the file in `public/documents/`, e.g. `public/documents/prep-miralax.pdf`.
2. In `src/lib/documents.ts`, set that entry's `file: "/documents/prep-miralax.pdf"`.
3. Done: the row (and, for disease sheets, the education page's take-home box) switches
   to a download link in both languages.

## Pending practice confirmations

Centralized in `src/lib/site.ts` (marked `NEEDS CONFIRMATION`), currently shipping the values
from the practice's primary contact page:

- Canonical public email (`fdhswestchase@fdhs.com` vs `info@westchasegi.com`)
- Fax number ((813) 920-5800 vs 813-920-8883)
- Office hours (site says Mon–Fri 8:00–4:30; door signage differs)
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
- Appointment/contact form delivery — **launch blocker (2026-07-07)**: submissions currently
  resolve to an on-page confirmation only; wire delivery to a practice inbox/queue that staff
  actively monitor, and verify the handoff end-to-end, before any real patient traffic
- Additional site languages — Vietnamese, Korean, and Arabic are directed (2026-07-07); the
  complete wanted list is still being confirmed. Scoped separately from EN/ES parity: Arabic
  is RTL, Hangul/Arabic scripts need font coverage, and graphics that carry text will move to
  localizable rendering (source graphics stay preserved unmodified). Medical prep/education
  content in new languages ships only after human verification of the translations
