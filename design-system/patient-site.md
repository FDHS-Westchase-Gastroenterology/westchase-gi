# Patient site

`src/app/[locale]/` is the public site: 17 routes in five languages (`src/lib/site.ts`), read
mostly on a phone by older patients. This guide owns what every one of those routes shares — the
metadata contract, the heading idiom, the global content classes. The components those pages
compose are in [components.md](components.md), the grid and section rhythm in
[layout.md](layout.md), the type scale in [typography.md](typography.md). What is stated here is
the patient site's; the staff portal's counterpart is in [surfaces.md](surfaces.md).

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
  const dict = getDictionary(locale);
  return pageMetadata(
    locale,
    "/services",
    dict.meta.services.title,
    dict.meta.services.description,
  );
}
```

`pageMetadata` (`src/lib/metadata.ts`) is what makes a page findable in five languages: it builds
the canonical URL, an hreflang alternate for every locale, `x-default`, and the Open Graph block.
A route that assembles its own object publishes none of that, so hand-written metadata is the one
thing to look for when a new route is reviewed.

Fifteen of the seventeen route files follow the contract exactly. The two that do not are
deliberate, and both are the same judgement: a page that must not be indexed must not advertise a
canonical URL either.

| Route | What it does instead | Why |
| --- | --- | --- |
| `src/app/[locale]/[...rest]/page.tsx` | No `generateMetadata` at all; the body is `notFound()` | The response is a 404. It has no canonical URL and no locale alternates to publish. |
| `src/app/[locale]/appointment/received/page.tsx` | Returns a literal with `referrer: "no-referrer"` and robots `index: false` | A receipt confirming one person's request is noindex; `pageMetadata` exists to publish the opposite. |

## The page rhythm

`PageHero` opens the page, `Reveal` bands carry the body, `TextBand` closes with the standing
call to action, and `revealDelay` clamps a computed index to the four stagger steps. Their
options and real uses are in [components.md](components.md); the stagger and its reduced-motion
behavior are in [motion.md](motion.md).

## Level and size are chosen separately

Base `h1, h2, h3` (`src/app/globals.css#L164`) set the display family, the ink, weight 400,
leading, tracking and `text-wrap: balance` — and no size at all. `.h1`, `.h2` and `.h3` set only
`font-size`. So a heading's outline level and its size are two decisions, not one: an `<h2>` that
should read at the third size wears `.h3`, and the outline a screen reader announces stays
correct while the type matches the band it sits in.

```tsx
<h2 className="h3 heading-tick">{t.insuranceHeading}</h2>
```

A literal type utility at the call site does not reach the same place; it reaches nowhere.
Tailwind v4 reads an un-hinted `var()` in the `font-*` namespace as a **weight**, so both lines
below compile to `font-weight: <a font stack>`, which is invalid at computed-value time and
silently falls back to the inherited weight:

```tsx incorrect
<h2 className="h3 font-[var(--font-display)]">{t.missionHeading}</h2>
<h2 className="text-base font-[var(--font-body)] font-extrabold">{t.stepsHeading}</h2>
```

Neither line ever set a family. On `h1`–`h3` the base rule supplies the display serif regardless,
so the first is inert; the second asks for the body sans on a heading and gets the serif anyway.
`font-display` and `font-body` are the theme's own utilities and do compile to `font-family` —
they are the only way to name a face at a call site.

## Content classes

Global classes in `src/app/globals.css`, available on any patient markup with no import.
`.container-x`, `.container-tight`, `.section` and `.section-sm` are the page frame and belong to
[layout.md](layout.md); these are the rest. The counts are `className` uses across tracked
`src/**/*.tsx` outside `admin/` and `stock/`, measured on this branch.

| Class | What it sets | Uses |
| --- | --- | --- |
| `.display` | `--step-hero`, leading 1.06, tracking -0.015em: the one hero headline | 1, in `src/app/[locale]/page.tsx` |
| `.h1` `.h2` `.h3` | `--step-1`, `--step-2`, `--step-3`, and nothing else | 6 · 22 · 12 |
| `.lead` | `--step-lead` at leading 1.6: the sentence under a page or section heading | 12 |
| `.measure` `.measure-sm` | A 68ch or 54ch column, so prose stops before the container does | 21 · 13 |
| `.heading-tick` | A 2.75rem amber pill above a heading, `.heading-tick--center` to center it | 26 · 1 |
| `.link-line` | Teal ink at 700 whose underline wipes in on hover, flipped for RTL | 15 |
| `.link-plain` | Teal ink at 700, already underlined, the rule solidifying on hover | 6 |
| `.card` `.card-lined` | White at `--radius-lg` with `--shadow-card`; lined trades the shadow for a `--color-line` hairline | 9 · 5 |
| `.list-check` | A check-marked list: navy marks on white, `.list-check--amber` on navy | 6 · 1 |
| `.bidi-ltr` | Isolates a Latin island — a phone number, an address — inside Arabic | 15 |
| `.print-hide` | Removes an element from the print stylesheet | 5 |

`.heading-tick` is the one with a rule attached to it: the CSS comment above it reserves the tick
for major section starts, "never as an every-block eyebrow".

## `.card` is a class, the `Card` is a component

They do not overlap and neither is the other's shorthand. `.card` is the patient site's white
panel, written on a `div` that already exists; it appears nowhere under `src/app/admin/`. `Card`
is the shadcn recipe and has three consumers, all in the portal: the home list, its loading
skeleton, and `AuthCard`. A patient surface that reaches for `Card` gets portal geometry and the
semantic token bridge instead of the brand panel; a portal surface that reaches for `.card` gets
a shadow the portal does not use ([surfaces.md](surfaces.md)).

## What the patient site does not have

- **No disclosure or accordion.** `<details>` appears in no patient source file and no `ui/`
  recipe covers one. Content that would collapse is a `Reveal` band instead.
- **No `Badge`.** The recipe's four variants name request states, and its only consumer is the
  portal's `src/app/admin/(portal)/requests/status-badge.tsx`.
- **No toast.** `Toaster` is mounted by the portal layout alone. The appointment form answers in
  place: a `role="status"` region on success, a `role="alert"` block on failure, and a
  `FieldError` under the field that refused (`src/components/AppointmentForm.tsx`).

## Recorded drift

| Drift | Evidence | Disposition |
| --- | --- | --- |
| A second body size no token names: `text-[0.95rem]`, 15.2px, under the 17px floor [typography.md](typography.md) states | 32 uses in 16 files, every one of them secondary — a sentence under a heading, card meta, a back link, footer copy, a `dd` value | Documentation behind code: one consistent value used as a step, not an accident. It needs a `--step-*` token and a name before it can be enforced, which is a brand call, not a fix. |
| `font-extrabold` on a heading asks for 800 from a serif loaded only at 400 | 14 `h2`/`h3` across ten files, from `src/app/[locale]/services/page.tsx#L76` to the three `src/components/Footer.tsx` column heads. The patient site leaves `font-synthesis` at its default, so the browser fakes the weight rather than substituting a loaded one: at 17px a measured line widened from 203.61px to 204.73px, with visibly thicker stems. The identical class on the two `h4` outside the base rule (`src/components/HoursTable.tsx#L24`, `src/app/[locale]/physicians/page.tsx#L301`) reaches Lato and its real 900 face, 164.27px to 169.82px | Jason decides: one authored weight, two rendered results. Loading a heavier display face, dropping the weight, and moving those headings to `font-body` each repaint patient pages, so bring rendered comparisons rather than a change. |
| Three `.heading-tick` headings inside one band | `src/app/[locale]/new-patients/page.tsx#L105`, `#L109` and `#L113` are the three columns of the `lg:grid-cols-3` band opened at `#L103` | Code against the rule its own CSS comment states. Narrow: one band in one file out of 26 uses. Dropping the three ticks is a visible change and needs before/after evidence. |
