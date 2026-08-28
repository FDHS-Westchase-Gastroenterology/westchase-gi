import { cva } from "class-variance-authority";

/*
 * The Button register, server-safe (DESIGN.md "Component system").
 * Lives apart from button.tsx so zero-JS surfaces (patient-site anchor
 * CTAs) can wear the register through className without importing the
 * client component. Variants carry the committed .btn register: navy is
 * the primary ink, amber the warm call to action, outline the quiet
 * secondary, ghost-light the on-navy ghost. The hover lift (-2px with
 * the soft shadow) and the quint ease are the authored .btn temperament.
 * Sizes keep the 44px minimum target; radius rides the brand --radius.
 *
 * Temperament knobs: like the motion registry, the register is one
 * vocabulary with per-register temperaments. The --btn-* variables below
 * default to the patient site's lively physics; a scope assigns its own
 * (.portal-scope flattens the lift into a 0.98 press and tightens the
 * geometry; .review-flyer-screen calms the timing) without fighting the
 * utility cascade.
 */
export const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-[var(--btn-radius,var(--radius))] border border-transparent bg-clip-padding text-[0.98rem] leading-none font-bold whitespace-nowrap transition-all duration-[var(--btn-duration,200ms)] ease-[var(--btn-ease,var(--ease-out-quint))] outline-none select-none hover:translate-y-[var(--btn-lift,-2px)] active:translate-y-0 active:scale-[var(--btn-active-scale,1)] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-navy-2 hover:shadow-[var(--btn-hover-shadow,var(--shadow-soft))]",
        amber:
          "bg-amber text-navy-2 hover:bg-[color-mix(in_oklch,var(--color-amber)_90%,white)] hover:shadow-[var(--btn-hover-shadow,var(--shadow-soft))]",
        outline:
          "bg-transparent text-ink shadow-[inset_0_0_0_1.5px_var(--color-line-2)] hover:bg-[color-mix(in_oklch,var(--color-navy)_5%,transparent)] hover:shadow-[inset_0_0_0_1.5px_var(--color-navy)]",
        "ghost-light":
          "bg-white/[0.12] text-on-dark shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.34)] hover:bg-white/20",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
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
      variant: "default",
      size: "default",
    },
  },
);
