# Design System — Westchase Gastroenterology

The practice's own identity (blue-teal medical + amber gold, Lato + Trocchi), committed and
executed with craft. Light theme only: patients read this site in waiting rooms and kitchens,
often 45+, often on phones.

## Color

OKLCH throughout; every text/background pair verified ≥ WCAG AA (see `src/app/globals.css`).

| Token | Value | Role |
|---|---|---|
| `--color-paper` | `oklch(0.98 0.005 220)` | Page background (cool near-white, tinted toward brand hue) |
| `--color-mint` | `oklch(0.955 0.012 195)` | Alternating section band (brand `#e3efed`) |
| `--color-mint-2` | `oklch(0.93 0.018 200)` | Wells, hover states on mint |
| `--color-navy` | `oklch(0.40 0.06 248)` | Brand dark (`#2e4a61`): hero, bands, buttons |
| `--color-navy-2` | `oklch(0.33 0.05 248)` | Utility bar, footer |
| `--color-teal` | `oklch(0.60 0.07 232)` | Steel blue (`#4c839f`), large decorative only |
| `--color-teal-ink` | `oklch(0.46 0.06 235)` | Teal as text/links on light (6.6:1 on paper) |
| `--color-amber` | `oklch(0.78 0.13 75)` | Amber gold (`#eaa84a`): primary CTA, heading ticks |
| `--color-amber-soft` | `oklch(0.93 0.045 85)` | Notice banner background |
| `--color-amber-deep` | `oklch(0.62 0.11 70)` | Amber as large text on light |
| `--color-ink` / `--color-body` / `--color-muted` | L 0.25 / 0.35 / 0.47 | Text ramp (15.1 / 10.6 / 6.4 :1 on paper) |
| `--color-on-dark` / `--color-on-dark-muted` | L 0.97 / 0.86 | Text on navy (8.4 / 6.0 :1) |

Strategy: **Committed**. Navy carries the identity (hero, text band, footer, buttons); amber is
the single warm accent (CTAs, ticks, stars, utility-bar icons); mint alternates section
backgrounds. No gradients, no glassmorphism, no side-stripe borders.

## Typography

- **Display**: Trocchi (400 only), h1–h3. The practice's own serif; slab warmth, medical steadiness.
- **Body/UI**: Lato 400/700/900.
- Fluid scale (`--step-hero` … `--step-lead`), ratio ≥ 1.25, hero clamps at 4rem.
- Body 17px, line-height 1.65, `measure` caps at 68ch. `text-wrap: balance` on headings.
- Lora (loaded by the old site) was dropped: two families cover every role.

## Recurring elements

- **Heading tick**: 44×4px amber rounded bar above major section headings (`.heading-tick`).
  The single section-label device; no uppercase eyebrow labels anywhere.
- **Buttons**: `.btn-amber` (primary action), `.btn-navy`, `.btn-outline`, `.btn-ghost-light`
  (on navy). Radius 10px; bold Lato; translateY hover with ease-out-quint.
- **Cards**: white, radius 14px, ONE soft shadow (`--shadow-card`) OR a 1px border
  (`.card-lined`), never both.
- **Checklist** (`.list-check`): navy check dots, used for conditions/procedures/mission lists.
- **Document rows**: hairline-divided list; a real download link when the PDF exists, a mint
  "Request by text" pill when it doesn't.
- **Notice banner**: amber-soft strip under the header; dismissible once per visitor
  (30-day localStorage; pre-paint script prevents flash).
- **Rail** (`.rail`): scroll-snap testimonial strip, edge-padded to the container grid.
- **Profile-card viewer** (`ProfileCardViewer`, `.pc-*`): the practice's official provider
  card graphics, viewed in place. Tile ("Profile card / Open to read" — no network acronym on
  patient-facing labels) opens a native `<dialog>`: full-screen sheet on phones, panel ≥640px.
  Photo-app gestures via `react-zoom-pan-pinch` (pinch / double-tap / wheel / drag; left-click
  pan disabled on coarse pointers — the lib's mouse handler otherwise cancels touch double-tap
  zoom), floating −/%/+ cluster (tap % resets), one-time localized gesture hint, explicit
  loading state, subject + download of the byte-exact original in the header bar. Pre-hydration
  the tile is a real link to the graphic; browsers without `showModal` get a new-tab fallback.

## Motion

- `Reveal` wrapper: IntersectionObserver fade/rise (16px, 0.7s ease-out-quart), stagger steps of
  90ms, 1.5s failsafe so content can never stay hidden. Content is visible-by-default without JS.
- `prefers-reduced-motion`: all animation and smooth scroll disabled globally.
- Hovers: translateY(-2px) buttons, translate-x arrow nudges. No bounce, no elastic.
- **The hero is a static photo — never a slideshow/carousel** (practice decision, 2026-07-07:
  auto-rotating heroes were reviewed and emphatically declined). Applies to any future hero
  work; enlarge/rebalance within the static composition instead.

## Layout

- Container 76rem; sections `clamp(3.25rem, 6.5vw, 6.5rem)` vertical rhythm.
- Semantic z-scale: header 50 → dropdown 60 → overlay 70 → drawer 80.
- Desktop nav at ≥ xl (1280px); below that, the full-screen drawer.
- Grids: `sm:grid-cols-2` / `lg:grid-cols-3` content grids; no breakpoint-free auto-fit where
  card imagery needs aspect control.

## Imagery rules

- Harvested graphics and official provider-card files retained as source mirrors in
  `public/images/` are byte-exact (SHA-verified at import); `next/image` handles their delivery
  sizing. The six published files under `public/images/staff/headshots/` are intentionally
  resized/optimized derivatives of privately preserved source originals, not byte-exact mirrors.
  Do not re-encode the source-mirror set or replace a headshot derivative without approved
  provenance.
- Photography is the practice's own: team composite (hero), physician brochure cards, facility
  photos. No stock imagery anywhere.
- **Essential text renders as localizable HTML** (practice direction, 2026-07-07): baked-in text
  cannot follow the site language, so provider names, credentials, and patient information are
  real translatable text in every locale. The official provider-card graphics remain preserved
  byte-for-byte as optional view/download artifacts, never the sole carrier of essential
  information. Text must be readable without effort on phones.
