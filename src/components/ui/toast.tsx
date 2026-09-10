"use client";

import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";

import { CircleCheck, LoaderCircle, TriangleAlert, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast-manager";
import type { ToastData } from "@/components/ui/toast-manager";

/*
 * Brand adaptation of the shadcn Base UI Toast
 * (https://ui.shadcn.com/docs/components/base/sonner; registry source kept
 * at src/components/stock/toast.tsx, provenance in stock/MANIFEST.json).
 *
 * WHY A TOAST AND NOT A BANNER. An acknowledgement is a fact about work that
 * has just finished, not a region of the page. The banner it replaces held a
 * tinted block of layout open above the list, shifting every row down, and
 * painted "saved" and "closed" in the same mint — so two different outcomes
 * looked identical. A toast is chrome: it says the fact, then leaves the
 * page as it found it.
 *
 * THE VOICE IS THE APP'S, NOT THE PAGE'S. The surface is navy, the same ink
 * as the sidebar, so the acknowledgement is legible as the portal speaking
 * rather than as one more card in the work. That is also why it is dark
 * against a page that is otherwise paper and mint: an acknowledgement should
 * be findable in one glance and gone in five seconds.
 *
 * ICONS FOLLOW THE COLOR LAW (DESIGN.md): amber means attention, so a
 * failure is amber; a spinner is quiet on-dark ink because work in flight is
 * not yet news; a settled fact takes the full on-dark check.
 *
 * MOTION IS THE REGISTRY'S. Arrival is --motion-spring over
 * --motion-spring-duration and departure is --motion-exit over
 * --motion-exit-duration, the same pair the sheet and the modals use. The
 * toast enters from below the viewport edge it lives on and leaves the same
 * way (apple-design §7, "if something disappears one way, we expect it to
 * emerge from where it came"). Reduced motion is registered in globals.css
 * `@layer base`, the only place that can outrank the blanket reset.
 */

const toastVariants = cva(
  [
    // Layout: the toast fills the centered viewport column and stacks in place
    "group/toast pointer-events-auto absolute right-0 bottom-0 z-[calc(1000-var(--toast-index))] w-full origin-bottom select-none",
    // Surface: navy chrome, hairline on navy, the brand's large radius
    "rounded-lg border border-line-dark bg-navy text-on-dark shadow-[0_18px_40px_-24px_oklch(0.2_0.05_248/0.7)]",
    // Focus: the keyboard ring, from the semantic bridge
    "outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
    // Stack geometry: each toast behind the frontmost peeks and shrinks
    "[--gap:0.6rem] [--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] [--peek:0.65rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))]",
    "h-(--height) [transform:translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))]",
    // A gap-spanning hit area, so the pointer can cross between stacked toasts
    "after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-['']",
    // Expanded (hovered or focused) stack: the pile fans out to full height
    "data-expanded:h-(--toast-height) data-expanded:[transform:translateY(var(--offset-y))]",
    // Enter and leave along the same path: up from the bottom edge, back down
    "data-limited:opacity-0 motion-safe:data-starting-style:[transform:translateY(150%)]",
    "motion-safe:[&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(150%)]",
    "data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
    "data-expanded:data-ending-style:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
    /* Reduced motion authors no travel at all — the two rules above are
       motion-safe, so under the preference the stack geometry on the base
       transform simply stands — and the arrival and the departure are
       carried by opacity instead, over the 120ms globals.css sets for this
       surface. The travel is what the preference asks for; an acknowledgement
       that appears and vanishes with no transition at all is not the gentler
       equivalent, it is no feedback. A swipe keeps its travel either way:
       that motion is the hand's, not the interface's. */
    "motion-reduce:data-starting-style:opacity-0",
    "motion-reduce:[&[data-ending-style]:not([data-limited])]:opacity-0",
  ],
  {
    variants: {
      motion: {
        /* The registry's pair: the spring carries the travel, the exit curve
           carries the fade, and height — the stack settling after one toast
           leaves — takes the micro duration, because it is a re-layout and
           not an arrival. */
        registry:
          "[transition:transform_var(--motion-spring-duration)_var(--motion-spring),opacity_var(--motion-spring-duration)_var(--motion-exit),height_var(--motion-micro-duration)_var(--motion-exit)]",
        /* No consumer today. */
        none: "transition-none",
      },
    },
    defaultVariants: {
      motion: "registry",
    },
  },
);

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function Toaster({ children, toastManager = toast, ...props }: ToastPrimitive.Provider.Props) {
  return (
    <ToastPrimitive.Provider toastManager={toastManager} {...props}>
      {children}
      <ToastPrimitive.Portal data-slot="toast-portal">
        <ToastViewport>
          <ToastList />
        </ToastViewport>
      </ToastPrimitive.Portal>
    </ToastPrimitive.Provider>
  );
}

/* Bottom center of the viewport. The stock viewport pins itself to the right
   edge on `sm` and up; the portal's acknowledgements sit under the work
   instead, because an outcome about a line the eye is already on should
   appear beneath that work rather than off in a corner. The centre is the
   window's, not the stage's — the sidebar sits to one side of it — which is
   what "bottom center" means everywhere else the pattern is used, and what
   keeps the toast in the same place on the routes that have no sidebar. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function ToastViewport({ className, ...props }: ToastPrimitive.Viewport.Props) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        "pointer-events-none fixed inset-x-[var(--ps-4,1rem)] bottom-[var(--ps-6,1.5rem)] z-50 mx-auto w-auto max-w-sm outline-none",
        className,
      )}
      {...props}
    />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function Toast({
  className,
  motion,
  ...props
}: ToastPrimitive.Root.Props & VariantProps<typeof toastVariants>) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      data-testid="portal-toast"
      className={cn("portal-toast", toastVariants({ motion }), className)}
      swipeDirection="down"
      {...props}
    />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function ToastContent({ className, ...props }: ToastPrimitive.Content.Props) {
  return (
    <ToastPrimitive.Content
      data-slot="toast-content"
      className={cn(
        "flex h-full items-center gap-[var(--ps-3,0.75rem)] overflow-hidden p-[var(--ps-4,1rem)]",
        "[transition:opacity_var(--motion-exit-duration)_var(--motion-exit)] data-behind:opacity-0 data-expanded:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function ToastTitle({ className, ...props }: ToastPrimitive.Title.Props) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn("text-[var(--pt-sm,0.9375rem)] leading-snug font-semibold", className)}
      {...props}
    />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function ToastDescription({ className, ...props }: ToastPrimitive.Description.Props) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn(
        "text-[var(--pt-xs,0.8125rem)] leading-snug text-on-dark-muted empty:hidden",
        className,
      )}
      {...props}
    />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function ToastAction({
  className,
  render = <Button variant="ghost-light" size="sm" />,
  ...props
}: ToastPrimitive.Action.Props) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      render={render}
      className={cn("shrink-0", className)}
      {...props}
    />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function ToastClose({
  className,
  children,
  render = <Button variant="ghost-light" size="sm" />,
  ...props
}: ToastPrimitive.Close.Props) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      aria-label="Dismiss"
      render={render}
      className={cn(
        "size-8 shrink-0 bg-transparent p-0 text-on-dark-muted shadow-none hover:bg-white/[0.14] hover:text-on-dark",
        className,
      )}
      {...props}
    >
      {children ?? <X aria-hidden="true" />}
    </ToastPrimitive.Close>
  );
}

/* The state glyph, which is the whole point of the promise toast: a spinner
   while the save is in flight, a check the moment it lands, an amber warning
   if it does not. The glyph is what staff read from across the room, and the
   colours follow DESIGN.md's law — amber is attention, so only the failure
   takes it; work in flight is not yet news, so the spinner stays muted. */
function ToastIcon({ type }: Readonly<{ type: string | undefined }>) {
  /* `type` is a free string on the toast object — whatever the manager was
     handed — so the three states are matched rather than looked up, and any
     other toast simply has no glyph. */
  const glyph =
    type === "loading" ? (
      <LoaderCircle className="animate-spin text-on-dark-muted" />
    ) : type === "success" ? (
      <CircleCheck className="text-on-dark" />
    ) : type === "error" ? (
      <TriangleAlert className="text-amber" />
    ) : null;
  if (glyph === null) return null;
  return (
    <span
      data-slot="toast-icon"
      className="shrink-0 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-[1.05rem]"
    >
      {glyph}
    </span>
  );
}

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager<ToastData>();

  return toasts.map((item) => (
    <Toast key={item.id} toast={item}>
      <ToastContent>
        <ToastIcon type={item.type} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <ToastTitle />
          {/* The description is the only line that ever holds a value about a
              person; the caller says which kind, and the capture script does
              the rest. A toast with nothing to hide carries no attribute. */}
          <ToastDescription data-ui-redact={item.data?.redact} />
        </div>
        {item.actionProps === undefined ? null : <ToastAction />}
        <ToastClose />
      </ToastContent>
    </Toast>
  ));
}

export {
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  Toaster,
  ToastTitle,
  ToastViewport,
};
