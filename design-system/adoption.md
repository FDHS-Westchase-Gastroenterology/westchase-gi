# Adoption

A component enters this system by being adopted: the registry supplies behavior, the repository
supplies the brand, and the file records which is which. This guide is how that happens, what the
system has already decided not to adopt, and what a change of each kind has to prove.

```
Need a component?
├── A ui/ recipe already fits, or fits with one more value on an existing axis → use it
├── One route needs it once → compose it in the route (components.md#component-tiers)
├── Two or more surfaces need the same behavior → adopt registry source into ui/
└── Neither the recipes nor the registry covers the category → bring the case to Jason first
```

## Workflow

1. Inspect the existing `ui/` recipes and the product need before adding another component.
2. If none fits, read the shadcn registry source and its provenance. Say why a custom
   implementation is necessary and which behavior it owns.
3. Adapt the implementation into `src/components/ui/`, with reusable compositions in
   `src/components/patterns/`. Product surfaces consume those, never `stock/`.
4. Reconcile token and generated-CSS changes with AGENTS.md "shadcn/ui": brand anchors
   preserved, semantic tokens mapped through the bridge, motion on the shared registry.
5. Regenerate `ds-bundle/` when its inputs change, and review the component and its states in
   the product. Claude Design is for exploration and exchange; its approval is not required.
6. Run the standing gates and capture evidence on every affected surface.

Routine choices inside an assigned scope are yours. A change to product behavior or to a brand
anchor is Jason's.

Every adopted file opens with a comment naming its registry source, what was reused unchanged,
what the adoption added, and who consumes it.

```tsx
// Correct (scroll-area.tsx): the source, the reason, and the reused behavior, all named
/*
 * Brand adoption of the shadcn ScrollArea (base-nova, registry source in
 * src/components/stock/scroll-area.tsx). ... this adoption exposes the
 * viewport as its own part with its props and ref, because the staff home
 * list needs the real scrolling element ...
 */
```

```tsx incorrect
// Incorrect: a file that hides its provenance, so the next reader cannot tell
// brand decisions from registry defaults or re-sync it later
/* Custom scroll area. */
```

## Standing findings

Each of these was decided against a real surface. A new surface inherits the decision; reopening
one is a conversation with Jason, not a judgment call inside a feature.

- **Route navigation keeps `<nav>` plus `aria-current`.** A registry tab component is for
  switching panels inside one page; the portal's sections, status filters and settings tabs are
  links that change the URL ([accessibility.md](accessibility.md#navigation-and-landmarks)).
- **Modals keep the native `<dialog>` top layer.** The shadcn Dialog stays unadopted for modals;
  the staff home's full record sheet is the one Base UI Dialog, and it runs non-modal
  ([overlays.md](overlays.md#modal-dialogs)).
- **Skeletons are authored per surface.** The staff home list's rows and the full record sheet's
  sections hold their own shapes and breathe on one shared opacity loop (`wgi-skeleton`); the
  registry's generic block is a downgrade.
- **The patient-site hero is static**, so no carousel. The testimonial rail is scroll-snap.
- **Scroll regions keep the platform scrollbar.** ScrollArea is adopted for two staff home
  surfaces, the request list and the full record's history, because each needs the real
  scrolling element: an accessible name, keyboard focus, and, for the list, a scroll listener for
  its footer and a `scrollTop` reset on filter change. `ScrollBar` adds a local `data-held` flag
  Base UI does not publish. The history's bar shows only while it scrolls, is held, or is hovered
  itself (Base UI's `data-hovering` covers the whole region, so the bar's own `:hover` stands in),
  and an edge fade marks rows below the fold ([surfaces.md](surfaces.md#rules-and-scrolling)).
- **Collapsible is a staff home part.** `(home)/parts/collapsible.tsx` is a fresh conversion of
  `stock/collapsible.tsx` for the full record's request details, painted and timed in `home.css`
  under `.wgi-disclosure`; its panel height animates through Base UI's
  `--collapsible-panel-height`.
- **Sonner is the portal's save feedback**, on the owner's explicit decision of 2026-09-15,
  wherever a save has a pending beat and then a confirmation: the home record card, the staff
  request form in both its homes, the note composer and the request work panel. `Toaster` is
  mounted once in the portal layout. The registry's Base UI Toast stays unadopted
  ([forms.md](forms.md#saving)).
- **The chat family has no product need.** The practice's differentiator is a staffed human line.

## Testing requirements

The standing gates in AGENTS.md apply to every change: oxlint clean, `oxfmt --check` clean,
React Doctor at 100, `npm run build` green, and visual evidence in the pull request for every
UI-visible change — before and after at 1440×900 and 390×844, a video for a multi-step path. On
top of those, by kind:

| Change | Also required |
| --- | --- |
| A brand token value | Contrast re-verified for every pair that uses it, with the ratio in the token comment; `ui-reference/` refreshed |
| A recipe: new variant, axis or default | The existing recipe or registry source identified, adaptations explained, behavior parity checked when restructuring |
| A new `ui/` adoption | Provenance and consumer-map comments; a clean reconciliation diff on `globals.css` |
| Motion | A `review-animations` pass, the reduced-motion state captured, the frequency justified |
| A pattern | Two consumers named; variants reviewed against the existing recipes and brand tokens |
| A portal workflow surface | The Playwright specs under `e2e/` for that path; the portal atlas refreshed with the seed identity |
| The stock tier | Bundle regeneration passes; provenance recorded in `MANIFEST.json`; product behavior preserved |

## Local bundle pipeline

`.ds-sync/` is the local build, validation and capture toolchain. `.design-sync/` holds this
project's configuration, build scripts, browser shims, component metadata and previews.
`ds-bundle/` is generated output for exchanging the implementation with Claude Design. All three
are machine-local under `local-only-paths.json` and stay untracked; run `npm run local-only:write`
after changing their one-line reasons.

From the repository root:

```bash
node .design-sync/ds/build-ds.mjs
node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules node_modules --entry .design-sync/ds/entry.ts --out ds-bundle
node .design-sync/ds/copy-assets.mjs
```

The first command derives exports, prop declarations, styles and component documentation from the
repository, with no preview route involved. Registry source and examples in `stock/` stay bundle
inputs. Keep the pipeline's `node_modules` link pointed at `../.ds-sync/node_modules`.

Generation exports the current implementation; it does not apply remote edits. Reconcile any
design chosen in Claude Design with repository components and tokens, then regenerate to exchange
the update. Upload and remote review are optional and gate nothing.
