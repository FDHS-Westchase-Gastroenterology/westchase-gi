---
type: Domain Guide
title: Product and Content Domains
description: Business users, multilingual content architecture, verified practice facts, clinical document handling, portal scope, and design invariants.
resource: PRODUCT.md
tags: [product, content, localization, healthcare, design]
---

# Product and content domains

## Two products, one practice

The patient site is a calm, multilingual brand and task surface. Its users are mostly mobile, often older, and frequently anxious or task-driven: call/text the office, request an appointment, find directions and hours, access forms, or read preparation instructions. Referring offices are a secondary audience checking credentials and contact facts (`PRODUCT.md`).

The portal is an internal operations tool for front-desk staff, the practice manager, and website maintainers. Its product grammar is jobs—not software topology. The queue is the heartbeat, honest states replace optimistic dashboards, and occasional tasks stay one click from Home (`docs/PORTAL-PRODUCT.md`). The portal operates requests created by the [appointment workflow](../workflows/appointment-intake.md).

## Five-locale patient model

`src/lib/site.ts` defines the supported locales: `en`, `es`, `vi`, `ko`, and `ar`; Arabic uses RTL. `src/lib/dictionaries/en.ts` defines the structural `Dictionary` type, and every other dictionary must match it. Shared domain content uses the five-field `Bi` type in `src/lib/content/types.ts`.

A patient-facing copy change therefore requires all five locales. Essential information—provider names, credentials, preparation steps, and calls to action—must remain localizable HTML rather than text baked into images. The staff portal is English-only by explicit scope.

Root locale choice follows explicit cookie, then weighted `Accept-Language`, then English. The language chooser preserves the current route in the target locale. External Hushforms packets are a real exception: they are available only in English and Spanish.

## Canonical domain records

### Practice facts

`src/lib/site.ts` centralizes brand names, canonical apex, phone, staffed text line, fax, public email, affiliations, two offices, hours, map coordinates, patient portal/forms, review destinations, and social links. Dated comments record provenance; a present value is not permission to infer confirmation for a different claim.

Call and staffed text are intentional primary and recovery channels. Never describe the text line as automated. The site may link one-way to Alpha Omega Wellness; this repository does not own reciprocal behavior.

### Providers and services

`src/lib/providers.ts` is the load-bearing source for credentials and profiles. Exact credentials must not be reordered or normalized: among the documented corrections, Chang is `MD, FACG`, Awad is `MD`, and Mendoza is `MD, MS`. The file also models nurse practitioners, the infusion nurse/practice manager, and broader staff.

`src/lib/services.ts` holds five-language conditions and procedures. Change these only from verified practice material and use conservative medical phrasing without outcome guarantees.

### Content libraries

- Blog records contain slug, legacy path, publication date, teaser, and localized sections (`src/lib/content/blog/`).
- Education topics contain group, optional legacy category ID, localized content, and an optional document registry link (`src/lib/content/education/`).
- Procedure preparations contain a richer safety-oriented block model, source-page provenance, original source languages, and a distinct section tree per locale (`src/lib/content/preps/`).

Preparation text is clinically sensitive transcription. Preserve source discrepancies instead of silently “fixing” them. Current known questions are recorded in `README.md` and source comments.

### Documents and protected flyers

`src/lib/documents.ts` is a deliberate registry of record-release forms, current preparation documents, and disease sheets. A public download appears only when an approved file exists; otherwise the UI offers the staffed text line or an honest pending state. Readable on-site prep and education pages are separate from printable PDF availability.

Review flyers are an internal portal capability. Their approved binaries are private server assets; `src/lib/review-targets.json` is the canonical destination, filename, and hash manifest. Do not move them into `public/` or duplicate targets elsewhere. Their authorization and custody connect this domain to [data and security](../data-and-security.md) and [integrations](../integrations.md).

## Design invariants

`DESIGN.md` is authoritative for visual work:

- light-only navy/teal/amber/mint identity using Lato and Trocchi;
- WCAG 2.1 AA, body text at least 17px, visible focus, large targets, semantic landmarks, and reduced-motion support;
- a static hero—never a slideshow or auto-rotating carousel;
- practice-owned imagery only;
- source-mirror graphics stay byte-exact, except the six documented optimized staff-headshot derivatives;
- no generic SaaS, luxury-spa, chatbot-first, gradient, glassmorphism, or stock-medical visual grammar.

Open `docs/ui-reference/README.md` and the relevant PNG before UI work. Refresh against the matching local/Preview origin before merge and against live after deployment, following [testing and source map](../testing-and-source-map.md).

## Current limitations and confirmations

- Some availability copy still says English/Spanish although on-site prep, blog, and education routes exist in all five locales. Do not mechanically change clinical-language claims without practice confirmation.
- Vietnamese, Korean, Arabic, and much Spanish medical content await native-speaker review under the documented ship-then-verify policy.
- Physician bios, Yelp, and remaining current PDFs await practice evidence.
- The portal website-change assistant launcher is not an implemented workflow.

These are product boundaries, not invitations to invent content.

## How to extend safely

- Fact, office, or link: edit `src/lib/site.ts`, then inspect metadata, JSON-LD, maps, footer, forms, and print output.
- Provider: edit `src/lib/providers.ts` from approved evidence and preserve exact credentials/localized HTML.
- Blog or education topic: add all five localized fields and update the legacy redirect map when an indexed former URL exists.
- Prep: preserve source-page metadata, locale-specific trees, emphasis, blanks, warnings, and known discrepancies; maintain the matching document ID.
- PDF: add the approved file under `public/documents/` and activate only its registry entry.
- Portal UI: follow `docs/PORTAL-PRODUCT.md`, keep capability states honest, and do not expose unfinished controls.
