# Patient site

`src/app/[locale]/` is the public site: 17 routes in five languages (`src/lib/site.ts`), read mostly
on a phone by older patients. This guide owns what those routes share: the metadata contract, the
heading idiom and the global content classes. Components, layout and type have their own guides; the
portal's counterpart is [surfaces.md](surfaces.md).

## The route contract

A route file is an async Server Component with an async `generateMetadata` beside it. Both read
the locale the same way, and both fall back to `en` rather than throwing:

```tsx
interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Readonly<PageProps>): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const { title, description } = getDictionary(locale).meta.services;
  return pageMetadata(locale, "/services", title, description);
}
```

`pageMetadata` (`src/lib/metadata.ts`) builds the canonical URL, an hreflang alternate per locale,
`x-default` and the Open Graph block; hand-written metadata publishes none of that. Fifteen of the
seventeen route files follow the contract; the two below are deliberate, because a page that must
not be indexed must not advertise a canonical URL:

| Route | What it does instead | Why |
| --- | --- | --- |
| `src/app/[locale]/[...rest]/page.tsx` | No `generateMetadata` at all; the body is `notFound()` | The response is a 404. It has no canonical URL and no locale alternates to publish. |
| `src/app/[locale]/appointment/received/page.tsx` | Returns a literal with `referrer: "no-referrer"` and robots `index: false` | A receipt confirming one person's request is noindex; `pageMetadata` exists to publish the opposite. |

The `[locale]` layout renders `Header`, `NoticeBanner`, `<main id="main">` and `Footer` around every
page (`[locale]/layout.tsx`), so a page returns a fragment of bands. A new route also needs:

- its path in `paths` in `src/app/sitemap.ts`;
- its path in `STATIC_ROUTE_TEMPLATES` in `src/lib/telemetry.ts`, the server's page-view allowlist
  (backend work, per AGENTS.md "Agent responsibilities");
- `meta.<camelRoute>` (`title`, `description`) and a `<camelRoute>` copy block in each of the five
  dictionaries (`src/lib/dictionaries/`), typed by `en`, so a missing key fails the build.

## The page rhythm

`PageHero` opens the page, `Reveal` bands carry the body, `TextBand` closes with the standing call
to action; `revealDelay` narrows a stagger index to the delay type. Options and uses are in
[components.md](components.md), the stagger and its reduced motion in [motion.md](motion.md).

## Level and size are chosen separately

Base `h1, h2, h3` (`src/app/globals.css#L164`) set the display family, the ink, weight 400, leading,
tracking and `text-wrap: balance`, and no size; `.h1`, `.h2` and `.h3` set only `font-size`. Level
and size are two decisions: an `<h2>` that should read at the third size wears `.h3`, so the outline
a screen reader announces stays correct while the type matches its band.

```tsx
// Correct (blog/[slug]/page.tsx): an <h2> in the outline, reading at the third size
<h2 className="h3">{t.moreHeading}</h2>
```

A family utility at the call site reaches nowhere. Tailwind v4 reads an un-hinted `var()` in the
`font-*` namespace as a **weight**, so both lines below compile to `font-weight: <a font stack>`,
which is invalid at computed-value time and falls back to the inherited weight:

```tsx incorrect
<h2 className="h3 font-[var(--font-display)]">{t.missionHeading}</h2>
<h2 className="text-base font-[var(--font-body)] font-extrabold">{t.stepsHeading}</h2>
```

Neither line sets a family: on `h1`–`h3` the base rule supplies the display serif regardless, and
`font-display` and `font-body`, the theme's own `font-family` utilities, are the only way to name a
face at a call site. Outside `h1`–`h3` the body sans is in force: a `dt` or an `h4` inherits Lato,
where `font-extrabold` reaches its real 900 face, so four patient `<dt>`s carry the weight without
the synthesis the [drift table](#recorded-drift) records for `h2` and `h3`.

## Content classes

Global classes in `src/app/globals.css`, on any patient markup with no import; the page frame
(`.container-x`, `.section` and their variants) is [layout.md](layout.md)'s. Uses count `className`
uses in tracked `src/**/*.tsx` outside `admin/` and `stock/`.

| Class | What it sets | Uses |
| --- | --- | --- |
| `.display` | `--step-hero`, leading 1.06, tracking -0.015em: the one hero headline | 1, in `src/app/[locale]/page.tsx` |
| `.h1` `.h2` `.h3` | `--step-1`, `--step-2`, `--step-3`, and nothing else | 6 · 22 · 12 |
| `.lead` | `--step-lead` at leading 1.6: the sentence under a page or section heading | 12 |
| `.measure` `.measure-sm` | A 68ch or 54ch column, so prose stops before the container does | 21 · 13 |
| `.heading-tick` | A 2.75rem amber pill above a heading, `.heading-tick--center` to center it. Its CSS comment reserves it for major section starts, "never as an every-block eyebrow" | 26 · 1 |
| `.link-line` | Teal ink at 700 whose underline wipes in on hover, flipped for RTL | 15 |
| `.link-plain` | Teal ink at 700, already underlined, the rule solidifying on hover | 6 |
| `.card` `.card-lined` | White at `--radius-lg` with `--shadow-card`; lined trades the shadow for a `--color-line` hairline. Neither sets padding: the call site writes it, from `p-5 sm:p-6` to `p-7 sm:p-8` | 9 · 5 |
| `.list-check` | A check-marked list: navy marks on white, `.list-check--amber` on navy | 6 · 1 |
| `.bidi-ltr` | Isolates a Latin island — a phone number, an address — inside Arabic | 15 |
| `.print-hide` | Removes an element from the print stylesheet | 5 |

`.list-check` sets no type: a grid with a 0.7rem gap and a masked navy check on each `li::before`; a
call site adds columns or `gap-x-*` on the `ul`. Five of the six uses add `font-semibold` and
`text-[var(--color-ink)]` (on each `li`, or on the `ul` in `physicians/page.tsx`); the `--amber`
twin on navy sets `text-[0.97rem]` and on-dark muted ink.

Prep handouts render through `PrepBody` (`src/components/PrepBody.tsx`) from typed blocks
(`src/lib/content/preps/types.ts`), so the counts above miss their classes. A list block's `style`
picks `.list-plain` (teal dots), `.list-steps` (a navy-numbered `<ol>`), `.list-check` or
`.list-avoid` (a red cross); a `note` is `.prep-note`, amber-soft under `ink`; `.prep-schedule*` and
`.prep-table*` lay out dosing and food tables. Another page's numbered sequence reuses
`.list-steps`; `.profile-timeline` is the physicians page's career rail. All sit in the
procedure-prep [legacy block](styling.md#global-css).

## `.card` is a class, the `Card` is a component

Neither is the other's shorthand. `.card` is the patient site's white panel, used nowhere under
`src/app/admin/`; `Card` is the shadcn recipe, with three portal consumers (the home list, its
skeleton, `AuthCard`). A patient surface on `Card` gets portal geometry and the semantic bridge, not
the brand panel; a portal surface on `.card` gets a shadow the portal does not use.

A third white panel is not a class: the home page's wayfinding tiles and physician cards hand-write
white, `--radius-lg`, `--shadow-soft` and a 300ms hover lift (`[locale]/page.tsx` lines 147 and
223). That approved Home styling ([tokens.md](tokens.md#recorded-exceptions)) is not an option: a
new patient panel takes `.card` or `.card-lined`.

## Notes and notices

```
What is the note?
├── Read before the rest of the page → a .card in PageHero's children (procedure-prep/page.tsx#L92)
├── An aside that points somewhere else → a mint strip, .card-lined plus bg-[var(--color-mint)]
│     (services/page.tsx#L74, patient-education/[slug]/page.tsx#L76, resources/page.tsx#L46)
└── Something the patient must act on now → amber-soft under ink: NoticeBanner,
      AppointmentForm's failure block (AppointmentForm.tsx#L118) and a prep handout's .prep-note
```

## What the patient site does not have

- **No disclosure or accordion.** No patient source file uses `<details>` and no `ui/` recipe covers
  one; content that would collapse is a `Reveal` band instead.
- **No `Badge`.** Its variants name request states; its one consumer is `requests/status-badge.tsx`.
- **No toast.** Only the portal layout mounts `Toaster`. The appointment form answers in place: a
  `role="status"` region on success, a `role="alert"` block on failure, and a `FieldError` under the
  field that refused (`src/components/AppointmentForm.tsx`).

## Recorded drift

| Drift | Evidence | Disposition |
| --- | --- | --- |
| A second body size no token names: `text-[0.95rem]`, 15.2px, under the 17px floor [typography.md](typography.md) states | 32 uses in 16 files, every one of them secondary — a sentence under a heading, card meta, a back link, footer copy, a `dd` value | Documentation behind code: one consistent value used as a step, not an accident. It needs a `--step-*` token and a name before it can be enforced, which is a brand call, not a fix. |
| `font-extrabold` on a heading asks for 800 from a serif loaded only at 400 | 14 `h2`/`h3` across ten files, from `src/app/[locale]/services/page.tsx#L76` to the three `src/components/Footer.tsx` column heads. The patient site leaves `font-synthesis` at its default, so the browser fakes the weight rather than substituting a loaded one: at 17px a measured line widened from 203.61px to 204.73px, with visibly thicker stems. The identical class on the two `h4` outside the base rule (`src/components/HoursTable.tsx#L24`, `src/app/[locale]/physicians/page.tsx#L301`) reaches Lato and its real 900 face, 164.27px to 169.82px | Jason decides: one authored weight, two rendered results. Loading a heavier display face, dropping the weight, and moving those headings to `font-body` each repaint patient pages, so bring rendered comparisons rather than a change. |
| Three `.heading-tick` headings inside one band | `src/app/[locale]/new-patients/page.tsx#L105`, `#L109` and `#L113` are the three columns of the `lg:grid-cols-3` band opened at `#L103` | Code against the rule its own CSS comment states. Narrow: one band in one file out of 26 uses. Dropping the three ticks is a visible change and needs before/after evidence. |
