# Registry bundle inputs

This directory supplies shadcn Base UI source and examples to the Claude Design bundle.
The Claude Design project is canonical; repository product components converge on its approved
designs. Review and sync instructions are in the root `DESIGN.md`.

- `*.tsx` contains registry components; `examples/` contains the source demos used by the local
  preview converter; `hooks/use-mobile.ts` supports Sidebar.
- `MANIFEST.json` records the registry version, source date, and included items. Preserve this
  provenance when updating inputs through the Claude Design workflow.
- These upstream inputs retain their vendor lint, format, and React Doctor exclusions. They
  still participate in the application typecheck and the separate bundle build.
- New product consumers use approved recipes in `src/components/ui/`. The staff home calendar
  currently imports `stock/calendar.tsx`, so that file remains visible in code review.
- Dependencies used by these files remain required by bundle generation, including `cmdk`,
  `embla-carousel-react`, `input-otp`, `next-themes`, `react-resizable-panels`, `recharts`, and
  `sonner`. `react-day-picker` also serves the staff calendar. Do not remove a dependency based
  solely on the absence of a product importer.

The local pipeline derives exports, component families, and documentation from these inputs.
Regenerate with the commands in `DESIGN.md` "Local bundle pipeline"; the pipeline source and
output stay untracked under `local-only-paths.json`.
