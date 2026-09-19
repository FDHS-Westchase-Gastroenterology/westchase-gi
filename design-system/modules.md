# Modules

The other guides name components; this one names the **import specifier** a surface writes before
it can compose one. Every guide in this set says what a part does and where it lives, and a file
path is not an import path — that gap is what sends a new screen to `@/lib/dictionaries` or
`../followed`, modules that do not exist. The counts below are across tracked source on this
branch.

## The alias

`@/*` resolves to `src/*` (`tsconfig.json`). A module imports a sibling in its own directory as
`./name`; everything else, including a route-owned module one directory away, uses the alias.
Under `src/app` that is 140 `./` specifiers and 82 `@/app/…` ones against a single `../` import,
in a test file. A parent-relative specifier in a component is drift.

```tsx
// Correct (requests-output-actions.tsx): sibling relative, everything else aliased
import { PortalFeedbackMessage, usePortalFeedback } from "@/app/admin/(portal)/portal-feedback";
import { Download } from "@/components/icons";
import { PrintChooser } from "./print-chooser";
```

## Patient-site modules

| Module | What it exports | A page imports |
| --- | --- | --- |
| `src/lib/i18n.ts` | `getDictionary`, `isLocale`, the `Dictionary` type | The dictionary and the locale guard |
| `src/lib/site.ts` | `site`, `localePath`, `locales`, `localeDir`, `formatOfficeHours`, the `Locale` type | Practice facts and every internal href |
| `src/lib/metadata.ts` | `pageMetadata` | The metadata contract ([patient-site.md](patient-site.md)) |
| `src/components/patterns/` | `PageHero`, `TextBand`, `Reveal`, `revealDelay` | The page rhythm ([components.md](components.md)) |
| `src/components/icons.tsx` | 31 icon components | Any glyph on a patient page |

**The two locale modules divide by kind, not by subject.** `src/lib/site.ts` owns the *type* —
`Locale`, the `locales` tuple, `localeSet` — because the practice's facts are keyed by it.
`src/lib/i18n.ts` owns the *behavior*: `isLocale` narrows a route param, `getDictionary` returns
the copy. A route contract needs both, and neither name is in the other file.

**Every pattern is a named export.** `export function PageHero`, `export function TextBand`,
`export function Reveal` — no module in `src/components/patterns/` has a default export, so a
default import compiles to `undefined` and React renders nothing.

```tsx
import { PageHero } from "@/components/patterns/PageHero";
import { Reveal } from "@/components/patterns/Reveal";
import { revealDelay } from "@/components/patterns/reveal-delay";
import { TextBand } from "@/components/patterns/TextBand";
```

**Every internal href goes through `localePath`.** `localePath(locale, "/appointment")`
(`src/lib/site.ts`) prefixes the active locale; a bare `href="/appointment"` drops the reader into
English. `site.phone.href`, `site.textLine.href` and the audited `site.links` carry the external ones.

**`Dictionary` is a closed generated type.** `src/lib/dictionaries/en.ts` declares
`export type Dictionary = DeepReadonly<typeof en>`, and the four translations satisfy it. So the
English file is the schema: a new copy key is five edits, one per locale, and TypeScript names the
four that are missing. `DeepReadonly` also makes every nested array `readonly`, which is why a
page maps over dictionary content rather than sorting or pushing to it.

## Portal modules

| Module | What it exports | A screen imports |
| --- | --- | --- |
| `src/components/icons.tsx` | 31 hand-written icon components | Every portal glyph |
| `src/app/admin/(portal)/toast-follow.ts` | `followed` | The promise a save toast follows |
| `src/app/admin/(portal)/portal-feedback.tsx` | `PortalFeedbackProvider`, `PortalFeedbackMessage`, `usePortalFeedback` | The one current result on a page |
| `src/components/output-feedback.ts` | `useOutputGuard` | A control that hands a file to the browser |
| `src/lib/portal/workflow/contracts.ts` | `RequestStatus`, `StatusCounts`, the workflow shapes | The status a screen renders |
| `src/app/admin/(portal)/requests/format.ts` | `STATUS_LABELS` and the display formatters | The words for a status key |

**Icons are this repository's, not a package's.** `src/components/icons.tsx` exports 31
hand-written SVG components — `Phone`, `Download`, `Printer`, `Check`, `ChevronDown` and the rest
— sized by the consuming recipe, never by a class ([buttons.md](buttons.md)). `lucide-react` is
installed for the registry and has exactly one importer outside `src/components/stock/`:
`src/components/ui/toaster.tsx`, which passes Sonner its icon set. New portal work imports from
`@/components/icons`; a glyph the module lacks is added there.

**`followed` is a type guard, not a value.** Its second argument narrows the settled promise:

```ts
export async function followed<Success, Failure>(
  attempt: Promise<Success | Failure>,
  succeeded: (result: Success | Failure) => result is Success,
  describe: (failure: Failure) => string = () => UNSAID,
): Promise<Success>;
```

So a call site passes a predicate — `(result) => result.ok` written as a guard — and `followed`
rejects with the described failure, which is what `toast.promise` renders
([forms.md](forms.md#saving)).

**A status is a key; its words come from `STATUS_LABELS`.** `RequestStatus`
(`src/lib/portal/workflow/contracts.ts`) is the lowercase union the database stores — `new`,
`contacted`, `scheduled`, `closed`. `STATUS_LABELS` (`src/app/admin/(portal)/requests/format.ts`)
maps each to its capitalized label, and `StatusBadge` reads it ([color.md](color.md#status-stamps)).
A screen that capitalizes a status itself has invented a second label table.
`src/lib/portal/contracts.ts` also exists and is the intake boundary; it does not hold
`RequestStatus`.

## The portal route contract

The patient site's route contract is in [patient-site.md](patient-site.md); this is the portal's.

- **A page is an async Server Component.** Ten of the eleven `(portal)` pages are
  `export default async function`; `registry/page.tsx` is a static sync one. No page under
  `src/app/admin` carries `"use client"` — interactivity lives in the components it renders.
- **A page publishes no metadata.** `src/app/admin/layout.tsx` sets the section's, once. The one
  page-level exception is `src/app/admin/(portal)/requests/print/page.tsx`, a print sheet.
- **The frame is the layout's.** `src/app/admin/(portal)/layout.tsx` writes `.portal-content`, the
  sidebar and the mobile bar. A page renders its heading block and its work, nothing around them
  ([layout.md](layout.md#page-structures)).
- **Feedback is mounted per page, not per layout.** `PortalFeedbackProvider` wraps the part of a
  page that reports a result — five call sites, each inside the page it serves. `Toaster` is the
  opposite: one mount, in the layout ([overlays.md](overlays.md#toasts)).
