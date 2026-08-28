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
 * Consumer maps below are crutches: file paths only (line numbers rot),
 * refreshed with docs/COMPONENT-INVENTORY.md. Full lists regenerate
 * with: rg -l 'variant="NAME"' src
 */
export const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-[var(--btn-radius,var(--radius))] border border-transparent bg-clip-padding text-[0.98rem] leading-none font-bold whitespace-nowrap outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      /* Motion sits before `variant` so a variant can still cancel it
         (link's hover:translate-y-0) when classes merge through cn(). */
      motion: {
        /* The brand physics every button wears unless told otherwise. */
        wgi: "transition-all duration-[var(--btn-duration,200ms)] ease-[var(--btn-ease,var(--ease-out-quint))] hover:translate-y-[var(--btn-lift,-2px)] active:translate-y-0 active:scale-[var(--btn-active-scale,1)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100",
        /* The upstream base-nova button's stock feel (1px press, default
           timing), kept by name for comparison; no consumer today. The
           reduced-motion guards are ours — the repo's law applies to
           every temperament. */
        shadcn:
          "transition-all active:not-aria-[haspopup]:translate-y-px motion-reduce:transition-none motion-reduce:active:translate-y-0",
        /* No transitions at all; no consumer today. */
        none: "transition-none",
      },
      variant: {
        /* Navy primary — every <Button> without a variant prop: portal
           save/search/sign-in controls, patient AppointmentForm submit.
           Census: docs/COMPONENT-INVENTORY.md "Component system". */
        default:
          "bg-primary text-primary-foreground hover:bg-navy-2 hover:shadow-[var(--btn-hover-shadow,var(--shadow-soft))]",
        /* Warm CTA — patient home + appointment heroes (src/app/[locale]/page.tsx,
           appointment/page.tsx), Header, Footer, TextBand, AppointmentForm,
           ReviewHub, portal help/page.tsx, portal-release-briefing,
           review-flyer-printer. */
        amber:
          "bg-amber text-navy-2 hover:bg-[color-mix(in_oklch,var(--color-amber)_90%,white)] hover:shadow-[var(--btn-hover-shadow,var(--shadow-soft))]",
        /* Quiet secondary — the widest-worn variant (~24 files): portal
           cancels/undo (workflow-panel, request-notes, print-chooser),
           pagination, error/not-found, patient back-links, Header,
           ReviewHub. Full list: rg -l 'variant="outline"' src */
        outline:
          "bg-transparent text-ink shadow-[inset_0_0_0_1.5px_var(--color-line-2)] hover:bg-[color-mix(in_oklch,var(--color-navy)_5%,transparent)] hover:shadow-[inset_0_0_0_1.5px_var(--color-navy)]",
        /* On-navy ghost — dark hero bands: src/app/[locale]/page.tsx,
           appointment/page.tsx, Footer, TextBand. */
        "ghost-light":
          "bg-white/[0.12] text-on-dark shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.34)] hover:bg-white/20",
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
        default:
          "min-h-11 gap-2 px-[var(--btn-px,1.5rem)] py-[var(--btn-py,0.75rem)] has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        sm: "min-h-9 gap-1.5 px-4 py-2 text-[0.9rem] has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "min-h-13 gap-2 px-8 py-4 text-[1.02rem] has-data-[icon=inline-end]:pr-6 has-data-[icon=inline-start]:pl-6",
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
