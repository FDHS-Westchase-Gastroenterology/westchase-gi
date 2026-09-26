# Registry bundle inputs

This directory supplies shadcn Base UI source and examples as inputs to the local design bundle.
These files are not approved product design: the recipes in `src/components/ui/` are, and
`design-system/adoption.md` "Workflow" owns their review.

- `*.tsx` contains registry components; `examples/` contains the source demos used by the local
  preview converter; `hooks/use-mobile.ts` supports Sidebar.
- `MANIFEST.json` records the registry version, source date, and included items. Preserve this
  provenance when updating registry inputs.
- Components and examples import `cn` from the `cn` package. Record mechanical source
  transformations separately in `MANIFEST.json`; a helper migration does not change the
  original registry version or imply a fresh component sync.
- These upstream inputs retain their vendor lint, format, and React Doctor exclusions. They
  still participate in the application typecheck and the separate bundle build.
- New product consumers use approved recipes in `src/components/ui/`. The staff home imports
  `stock/calendar.tsx`, `stock/radio-group.tsx` and `stock/toggle-group.tsx` directly, so those
  files remain visible in code review.
- Dependencies used by these files remain required by bundle generation, including `cmdk`,
  `embla-carousel-react`, `input-otp`, `next-themes`, `react-resizable-panels`, `recharts`, and
  `sonner`. `react-day-picker` also serves the staff calendar. Do not remove a dependency based
  solely on the absence of a product importer.

The local pipeline derives exports, component families, and documentation from these inputs.
Regenerate with the commands in `design-system/adoption.md` "Local bundle pipeline"; the pipeline source and
output stay untracked under `local-only-paths.json`.
