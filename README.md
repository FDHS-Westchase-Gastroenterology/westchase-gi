# Westchase Gastroenterology — westchasegi.com

The website of **FDHS Westchase Gastroenterology** (Florida Digestive Health Specialists
network), serving Tampa and Lutz, FL. Live at **https://westchasegi.com** since the
2026-07-18 move off the old vendor platform; `www` redirects to the apex address.

This is a faithful rebuild of the practice's former site — same identity, verified facts,
everything the old site broke now repaired — in **English, Spanish, Vietnamese, Korean, and
Arabic**, with an appointment-request pipeline that staff actually see, and a private staff
portal for working those requests.

If you are looking for the practice: call or text **(813) 564-0315** — a real person staffs
that line.

## What the site does for patients

- **Request an appointment** (`/appointment` or `/contact` in any of the five languages).
  The request is saved to a durable queue **before** any confirmation is shown — if anything
  goes wrong, the site says so honestly and points to the call/text line instead of faking
  success. The form asks for callback details only (name, phone, optional email, office/time
  preference, an optional brief reason) and asks patients not to include medical details.
- **Read every procedure prep the practice currently prescribes**, printable on-site in all
  five languages, plus 17 patient-education topics and the practice's 16 blog posts.
- **Download patient documents** when a current PDF exists — otherwise the site says how to
  get it from the office rather than linking a dead file.
- **Confirm hours, locations, providers, and credentials**, with per-office maps, in their
  own language (Arabic renders fully right-to-left).

## What staff get

A private portal at `/admin` where front-desk staff and the practice manager:

- work the appointment-request queue (new → contacted → scheduled → closed, with notes and a
  full activity history — nothing accumulates unseen),
- choose who receives the new-request email ping (the ping itself carries no patient
  details — the queue is the record),
- manage staff sign-ins, print the approved review-QR flyers, and see who can change the
  website.

Product definitions live in `PRODUCT.md` / `DESIGN.md` (patient site) and
`PORTAL-PRODUCT.md` (staff portal).

## What this rebuild fixed (vs. the old vendor site)

- **33 dead patient-PDF links** replaced by an honest document registry: a download appears
  only when a current PDF exists, and procedure preps moved on-site entirely.
- **Appointment requests that vanished** into a vendor queue the practice didn't know to
  monitor. Requests are now durable, staff are notified, and the whole operation runs from
  `/admin`.
- **The blog and education library moved on-site** (same titles and dates, original bodies —
  the old text was vendor-licensed), in all five languages, with old URLs redirecting.
- **The daily full-screen popup** became a dismissible banner shown once per visitor.
- **Search and sharing hygiene:** a real title and description per page (the old site reused
  one on all 64 pages), physician/office structured data, sitemap, and redirects for every
  mapped legacy URL.
- **Privacy hardening:** map embeds send no referrer, legacy patient-bearing links are
  scrubbed before anything third-party loads, and an executable check proves no secret
  material sits in the project's history.

## Who owns what

The practice controls its own infrastructure:

- **Domain** — `westchasegi.com` is registered at Porkbun in the clinic's account, DNS live
  since 2026-07-18.
- **Code** — this repository is owned by the clinic-controlled GitHub account
  `FDHS-Westchase-Gastroenterology`; the implementation consultant (ASTXRTYS) has Write
  access only, which is revoked when the engagement ends.
- **Hosting** — the clinic-owned Vercel project `westchase-gi` deploys the site automatically
  when changes merge.
- **Database and email delivery** — Supabase and Resend currently run in consultant-managed
  accounts branded for the clinic; moving them to practice-controlled accounts is a planned
  handoff item, tracked with the remaining acceptance work in issue
  [#24](https://github.com/FDHS-Westchase-Gastroenterology/westchase-gi/issues/24).

Two security tasks sit with the clinic GitHub account owner (both are quick settings
changes, tracked in the same issue): turn on two-factor authentication, and narrow the
portal's GitHub App to this repository only.

## Run it on your computer

Requires [Node.js](https://nodejs.org) and npm:

```bash
npm install
cp .env.example .env.local   # fill in the values — ask whoever maintains the site
npm run dev                  # open http://localhost:3000
```

That's enough to look around. Real development — tests, verification, how changes ship — is
covered in `CONTRIBUTING.md`.

## Where things live

| Document | For whom | What it covers |
|---|---|---|
| `README.md` | Everyone | This page: what the project is, who owns what, open practice questions |
| `ARCHITECTURE.md` | Developers | System design, module interfaces, external systems, where logic lives |
| `CONTRIBUTING.md` | Developers | Setup, verification, commit/PR/merge rules, shipping to production, operations |
| `AGENTS.md` | AI coding agents | Hard rules and fast ramp-up for autonomous work |
| `PRODUCT.md` / `DESIGN.md` | Product + design | Patient-site product definition and design system |
| `PORTAL-PRODUCT.md` | Product + design | Staff-portal product definition |
| `ui-reference/` | Developers | Checked-in screenshots: the visual baseline for UI work |

Release progress and open operational work are deliberately **not** restated here — a stale
status line misleads everyone who reads it first. Issue
[#24](https://github.com/FDHS-Westchase-Gastroenterology/westchase-gi/issues/24) is the
canonical Production workflow checklist.

## Pending practice confirmations

Confirmed facts carry dated source comments where useful; unresolved practice questions live
here rather than behind a generic marker. Tampa hours are 8:00–5:00, Lutz hours are
8:00–4:30, and the Facebook page/reviews are verified and live. Still open:

- Yelp profile, if the practice wants one linked (held until confirmed live)
- Physician bios (2–3 sentences each)
- Current PDFs for the remaining document slots — the two record-release forms, printable
  disease sheets, and optional clean per-document prep PDFs. Procedure-prep source scans
  arrived and shipped as native printable pages on 2026-07-07; registration/privacy
  printables were deliberately retired because the live online packet covers them.
- Prep wording questions for the practice (originals reproduced verbatim meanwhile, flagged
  in the prep content modules): the split-dose MiraLAX English vs Spanish sheets disagree on
  afternoon timings (2/4/6 PM vs 1/3/5 PM); the Spanish colonoscopy sheet's GLP-1 hold
  instruction names the drugs but no day count (English says 7 days); the Golytely
  split-dose sheet's "one hour after completing step 4" forward reference.
- Vietnamese, Korean, and Arabic medical content shipped translated by the build process and
  awaits native-speaker verification (the established ship-then-verify policy). English is
  the source baseline; the practice-published Spanish homepage block is source-grounded,
  while the remaining Spanish translation also awaits the practice's native-speaker review.

## Known content mismatch

- Some patient-facing procedure-prep, blog, and education availability copy still says
  "English and Spanish" even though those pages exist in all five locales. External
  Hushforms packets are genuinely EN/ES-only; clinical-care language claims need practice
  confirmation before editing.
