<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project rules — Westchase GI website

Patient-facing site for FDHS Westchase Gastroenterology (Tampa + Lutz). Faithful polish of the
practice's existing site: same identity, verified facts, zero broken links.

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
5. **Bilingual EN/ES is first-class.** Any copy change lands in BOTH `src/lib/dictionaries/en.ts`
   and `es.ts`. Never ship one locale ahead of the other.
6. **One-way linking:** this site may link to Alpha Omega Wellness (footer). Never accept the
   reverse expectation into this codebase; it's owned by the other project.
7. **No invented facts.** Unconfirmed details (see `NEEDS CONFIRMATION` comments in
   `src/lib/site.ts` and the README) render as honest fallbacks, not guesses. Patient documents
   without a file in `public/documents/` fall back to the staffed text line (forms/prep) or
   "printable version on the way" (disease sheets that already have on-site education pages).
8. **Compliance:** conservative medical phrasing; no outcome guarantees; the appointment form
   must keep its "do not submit PHI" warning; no PHI is ever collected or stored.
9. **The "accepting new patients" notice** is a dismissible banner shown once per visitor
   (30-day localStorage). Never turn it back into a per-page modal.

## Verification

- `npm run build` and `npm run lint` must pass.
- External links: only ship URLs verified live (see README's link table); anything unverified
  stays out.
