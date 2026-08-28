import { cva } from "class-variance-authority";

/*
 * The Button register, server-safe (DESIGN.md "Component system").
 * Lives apart from button.tsx so zero-JS surfaces (patient-site anchor
 * CTAs) can wear the register through className without importing the
 * client component.
 *
 * Three axes, decoupled on purpose:
 * - `variant` is color and surface only. Navy is the primary ink, amber
 *   the warm call to action, outline the quiet secondary, ghost-light
 *   the on-navy ghost.
 * - `size` is geometry; every size keeps the 44px minimum target.
 * - `motion` is animation temperament. The default, `wgi`, is the
 *   authored .btn physics (200ms quint, the -2px hover lift, the
 *   knob-driven press) — defaults produce the brand, so no call site
 *   has to opt in. `shadcn` preserves the upstream registry's stock
 *   feel by name; `none` turns transitions off. The base string carries
 *   no motion at all.
 *
 * Temperament knobs: the `wgi` motion resolves through --btn-*
 * variables with patient-site defaults; a scope assigns its own
 * (.portal-scope flattens the lift into a 0.98 press and tightens the
 * geometry; .review-flyer-screen calms the timing) without fighting
 * the utility cascade.
 *
 * Long class strings are arrays, one line per job, so each line can be
 * read (and commented) on its own; cva joins them back into one string.
 *
 * Consumer maps below are crutches: file paths only (line numbers rot),
 * refreshed with docs/COMPONENT-INVENTORY.md. Full lists regenerate
 * with: rg -l 'variant="NAME"' src
 */
export const buttonVariants = cva(
  [
    // Layout: how the button and its contents sit
    "group/button inline-flex shrink-0 cursor-pointer items-center justify-center",
    // Shape: brand radius (knob-overridable) and surface plumbing
    "rounded-[var(--btn-radius,var(--radius))] border border-transparent bg-clip-padding",
    // Typography: the committed button type step
    "text-[0.98rem] leading-none font-bold whitespace-nowrap",
    // Interaction plumbing: no native outline, no text selection
    "outline-none select-none",
    // Focus: the keyboard ring
    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
    // Disabled state
    "disabled:pointer-events-none disabled:opacity-50",
    // Invalid state (destructive is the one permitted non-brand hue)
    "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
    // Icons: inherit no pointer events, hold size unless sized explicitly
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      /* Motion sits before `variant` so a variant can still cancel it
         (link's hover:translate-y-0) when classes merge through cn(). */
      motion: {
        /* The brand physics every button wears unless told otherwise. */
        wgi: [
          // Journey: what animates, how long, on which curve
          "transition-all duration-[var(--btn-duration,200ms)] ease-[var(--btn-ease,var(--ease-out-quint))]",
          // Physics: the hover lift and the knob-driven press
          "hover:translate-y-[var(--btn-lift,-2px)] active:translate-y-0 active:scale-[var(--btn-active-scale,1)]",
          // Reduced motion: everything flattens
          "motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100",
        ],
        /* The upstream base-nova button's stock feel, verbatim from the
           registry — kept unmodified so the difference between stock and
           ours stays feelable; no consumer today. */
        shadcn: "transition-all active:not-aria-[haspopup]:translate-y-px",
        /* No transitions at all; no consumer today. */
        none: "transition-none",
      },
      variant: {
        /* Navy primary — every <Button> without a variant prop: portal
           save/search/sign-in controls, patient AppointmentForm submit.
           Census: docs/COMPONENT-INVENTORY.md "Component system". */
        default: [
          // Resting paint
          "bg-primary text-primary-foreground",
          // Hovered paint
          "hover:bg-navy-2 hover:shadow-[var(--btn-hover-shadow,var(--shadow-soft))]",
        ],
        /* Warm CTA — patient home + appointment heroes (src/app/[locale]/page.tsx,
           appointment/page.tsx), Header, Footer, TextBand, AppointmentForm,
           ReviewHub, portal help/page.tsx, portal-release-briefing,
           review-flyer-printer. */
        amber: [
          // Resting paint
          "bg-amber text-navy-2",
          // Hovered paint: amber warms toward white
          "hover:bg-[color-mix(in_oklch,var(--color-amber)_90%,white)] hover:shadow-[var(--btn-hover-shadow,var(--shadow-soft))]",
        ],
        /* Quiet secondary — the widest-worn variant (~24 files): portal
           cancels/undo (workflow-panel, request-notes, print-chooser),
           pagination, error/not-found, patient back-links, Header,
           ReviewHub. Full list: rg -l 'variant="outline"' src */
        outline: [
          // Resting paint: transparent, inked, inset hairline
          "bg-transparent text-ink shadow-[inset_0_0_0_1.5px_var(--color-line-2)]",
          // Hovered paint: navy tint, hairline darkens to navy
          "hover:bg-[color-mix(in_oklch,var(--color-navy)_5%,transparent)] hover:shadow-[inset_0_0_0_1.5px_var(--color-navy)]",
        ],
        /* On-navy ghost — dark hero bands: src/app/[locale]/page.tsx,
           appointment/page.tsx, Footer, TextBand. */
        "ghost-light": [
          // Resting paint: translucent white on the dark band
          "bg-white/[0.12] text-on-dark shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.34)]",
          // Hovered paint
          "hover:bg-white/20",
        ],
        /* Kept from the upstream registry as vocabulary; no consumer today. */
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]",
        /* No consumer today. */
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        /* No consumer today. */
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        /* No consumer today. Cancels the wgi hover lift on purpose. */
        link: "text-primary underline-offset-4 hover:translate-y-0 hover:underline",
      },
      size: {
        default: [
          // Geometry: 44px minimum target, knob-overridable padding
          "min-h-11 gap-2 px-[var(--btn-px,1.5rem)] py-[var(--btn-py,0.75rem)]",
          // Icon-aware padding: tighter on the icon side
          "has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        ],
        sm: [
          // Geometry: smaller step, still a comfortable target
          "min-h-9 gap-1.5 px-4 py-2 text-[0.9rem]",
          // Icon-aware padding and a smaller default icon
          "has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-3.5",
        ],
        lg: [
          // Geometry: the hero step
          "min-h-13 gap-2 px-8 py-4 text-[1.02rem]",
          // Icon-aware padding
          "has-data-[icon=inline-end]:pr-6 has-data-[icon=inline-start]:pl-6",
        ],
        icon: "size-11",
      },
    },
    defaultVariants: {
      motion: "wgi",
      variant: "default",
      size: "default",
    },
  },
);
