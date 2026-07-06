# Westchase Gastroenterology — westchasegi.com

Patient-facing website for **FDHS Westchase Gastroenterology** (Florida Digestive Health
Specialists network), serving Tampa and Lutz, FL. A faithful, polished rebuild of the practice's
existing site: same identity and content, every defect fixed, fully bilingual.

Built with Next.js 16 (App Router) + Tailwind CSS 4. Deployed on Vercel; goes live at
`westchasegi.com` at DNS cutover.

## What this rebuild fixes (vs. the previous vendor site)

- **33 dead patient PDFs** (new-patient forms, colonoscopy prep instructions, disease sheets)
  are now a registry (`src/lib/documents.ts`): each renders a real download link only once the
  current PDF exists in `public/documents/`, and offers the staffed text line until then.
- **"Accepting new patients" popup** fired as a full-screen modal on every page, every day.
  Now a dismissible banner shown once per visitor (30-day localStorage).
- **Spanish is a first-class mode** (`/en` + `/es` with hreflang), not a fragment.
- **Per-page titles and descriptions** (the old site repeated one meta description on all 64
  pages), JSON-LD for both offices (Lutz was missing), physician schema, sitemap, redirects
  for every legacy URL.
- Dead links repaired or removed (Facebook/Yelp held pending live profiles; ccfa.org updated to
  crohnscolitisfoundation.org; the vendor-hosted article library replaced with ASGE's own
  patient hub), typos fixed ("Practicies", "Barret", "un able to each"), `callto:` → `sms:`/`tel:`.
- Empty physician bio pages are gone; bios slot into `src/lib/providers.ts` when the practice
  supplies them.

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
3. Done: the row switches from "Request by text" to a download link in both languages.

## Pending practice confirmations

Centralized in `src/lib/site.ts` (marked `NEEDS CONFIRMATION`), currently shipping the values
from the practice's primary contact page:

- Canonical public email (`fdhswestchase@fdhs.com` vs `info@westchasegi.com`)
- Fax number ((813) 920-5800 vs 813-920-8883)
- Office hours (site says Mon–Fri 8:00–4:30; door signage differs)
- Facebook / Yelp profiles (links held until confirmed live)
- Physician bios (2–3 sentences each)
- Current PDFs for the document registry — confirmed wanted; the practice is emailing them (drop-in steps above)
- Appointment/contact form delivery (submissions confirm on-page; wire to the scheduling
  inbox before launch)
