# The stock tier

Every shadcn/ui registry item (Base UI variant, style `base-nova`) exactly as `shadcn add`
generates it, plus the registry's own example demos. This directory is the **before**;
`src/components/ui/` is the **after**. The design gallery at `/design` renders the two side by
side so a stock/brand difference is always something you can see and press, never something you
have to remember.

## Rules

- **Never hand-edit a file here.** Regenerate the whole tier with `npm run ds:stock`
  (`scripts/design-system/sync-stock.mjs`). `MANIFEST.json` records the registry version, the
  date, and what landed.
- **Nothing in a product surface imports from `stock/`.** Only the gallery
  (`src/app/design/`) may. A product surface that wants a registry component adopts it into
  `ui/` through the workflow in `DESIGN.md` "Adoption".
- **Vendored means exempt.** `stock/**` is excluded from oxlint, oxfmt, and React Doctor's
  project rules the same way `.agents/**` is: the code is upstream's, not ours, and rewriting it
  to our lint bar would make it stop being the before. It still typechecks in `npm run build`.
- **The bridge is untouched.** The sync script hashes `src/app/globals.css` before and after and
  fails if the CLI changed it.

## What is here

- `*.tsx` — 62 registry `ui` items. `form` is listed by the registry but has no Base UI file.
- `examples/*-example.tsx` — 60 registry demos, imports re-pointed at this tier. `example.tsx` is
  the registry's demo frame. The five chat-family examples that need the Vercel AI SDK are not
  vendored (`MANIFEST.json` → `excludedExamples`); the components themselves are.
- `hooks/use-mobile.ts` — the registry hook Sidebar needs.

## Dependencies this tier owns

`@shadcn/react`, `cmdk`, `date-fns`, `embla-carousel-react`, `input-otp`, `lucide-react`,
`next-themes`, `react-day-picker`, `react-resizable-panels`, `recharts`, `sonner`. Production
routes never import them; Next bundles per route, so they cost install time, not page weight.
When a `ui/` adaptation adopts one of them for real, it moves from "stock owns it" to "the
product owns it" in `DESIGN.md`.
