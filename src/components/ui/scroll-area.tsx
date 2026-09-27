"use client";

import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import { cn } from "cn";
import { useEffect, useState } from "react";
import type { ComponentProps, PointerEvent as ReactPointerEvent } from "react";

/*
 * Brand adoption of the shadcn ScrollArea (base-nova, registry source in
 * src/components/stock/scroll-area.tsx). The registry recipe hides the
 * viewport behind one opaque `ScrollArea` wrapper; this adoption exposes the
 * viewport as its own part with its props and ref, because the staff home
 * list needs the real scrolling element: an accessible name, keyboard focus,
 * a scroll listener for its count/range footer, and `scrollTop` resets on a
 * filter change (design-system/adoption.md "Standing findings", issue #282).
 *
 * Reused from Base UI, unchanged: overflow measurement, thumb sizing and
 * translation, the track's jump-to-position press, pointer capture during a
 * thumb drag, and the `data-hovering` / `data-scrolling` /
 * `data-has-overflow-*` state attributes.
 *
 * Custom behavior, and why: Base UI 1.7 exposes no "dragging" attribute, so
 * `ScrollBar` keeps a local held flag through composed pointer handlers and
 * publishes it as `data-held`. The held state ends on release, cancel, lost
 * capture, a move without the primary button, window blur, and unmount, so a
 * grab never sticks. `ScrollBar` also contains a wheel over the rail at
 * either end of the range, where Base UI would let it chain to the page,
 * so the rail behaves like the viewport's `overscroll-behavior: contain`.
 *
 * The thumb is Base UI's box and nothing more: its height is the measured
 * share of the content, its transform is the scroll position, and the paint
 * sits on that box. Nothing in script gives it a body, a spring, or a clock,
 * and nothing transitions its geometry, so it is a pure function of the
 * viewport's scroll offset on every scroll event. The browser owns
 * overscroll: where it reports its rubber-band through `scrollTop` (Safari)
 * Base UI shortens the thumb against the pushed end in lockstep with the
 * rows; where it clamps (Chromium) the thumb stays put. The consumer's CSS
 * owns the thumb's color and its micro-beat tint transition (issue #302).
 *
 * Importers today: src/app/admin/(portal)/(home)/line-list.tsx and
 * src/app/admin/(portal)/(home)/full-record-history.tsx.
 */

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function ScrollArea({ className, ...props }: ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    />
  );
}

/* The scrolling element itself. Every prop and the ref reach the real
   viewport so a consumer can name it, focus it, listen to it, and set its
   scroll position. The registry's ring utilities are kept for the keyboard
   focus state; consumers restyle through className. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function ScrollAreaViewport({
  className,
  ...props
}: ComponentProps<typeof ScrollAreaPrimitive.Viewport>) {
  return (
    <ScrollAreaPrimitive.Viewport
      data-slot="scroll-area-viewport"
      className={cn(
        "size-full rounded-[inherit] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1",
        className,
      )}
      {...props}
    />
  );
}

/* A wheel over the rail is contained the way the viewport's
   `overscroll-behavior: contain` contains one over the rows: Base UI moves
   the viewport while it can and lets the event chain to the page at either
   end; this listener keeps the page still there too. Native and non-passive,
   because React registers wheel passively, which is why it is the rail's
   ref callback rather than an `onWheel` prop: the recipe owns the rail's
   ref for it, so `ScrollBar` takes none, and the returned cleanup runs
   whenever the rail unmounts, which Base UI does the moment the list stops
   overflowing. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM nodes carry platform member types that cannot be made readonly
function preventChaining(event: WheelEvent): void {
  if (!event.ctrlKey) event.preventDefault();
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM nodes carry platform member types that cannot be made readonly
function containWheel(rail: HTMLDivElement | null): (() => void) | undefined {
  if (rail === null) return undefined;
  rail.addEventListener("wheel", preventChaining, { passive: false });
  return () => {
    rail.removeEventListener("wheel", preventChaining);
  };
}

function isPrimaryButtonReleased(
  event: Readonly<Pick<ReactPointerEvent<HTMLDivElement>, "buttons">>,
): boolean {
  return event.buttons % 2 === 0;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function ScrollBar({
  className,
  orientation = "vertical",
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onPointerMove,
  onLostPointerCapture,
  ...rest
}: Omit<ComponentProps<typeof ScrollAreaPrimitive.Scrollbar>, "ref">) {
  /* Held: the primary button went down on the rail (thumb or track) and has
     not come back up. Base UI captures the pointer on the thumb for the
     drag, so every later pointer event bubbles through this element. */
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (!held) return undefined;
    const release = () => {
      setHeld(false);
    };
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("blur", release);
    };
  }, [held]);

  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      data-held={held || undefined}
      ref={containWheel}
      orientation={orientation}
      className={cn(
        "flex touch-none select-none data-horizontal:h-2.5 data-horizontal:flex-col data-vertical:h-full data-vertical:w-2.5",
        className,
      )}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (event.button === 0) setHeld(true);
      }}
      onPointerUp={(event) => {
        onPointerUp?.(event);
        setHeld(false);
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event);
        setHeld(false);
      }}
      onLostPointerCapture={(event) => {
        onLostPointerCapture?.(event);
        setHeld(false);
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        /* A release the element never saw (it happened outside the window,
           or capture was lost silently) shows up as a move with the primary
           button bit unset — the same test Base UI's root uses. */
        if (held && isPrimaryButtonReleased(event)) setHeld(false);
      }}
      {...rest}
    />
  );
}

/* The thumb is Base UI's box: its height is the measured share of the
   content, its transform is the scroll position, and the paint is on the
   box itself. Nothing transitions its geometry. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function ScrollAreaThumb({
  className,
  ...props
}: ComponentProps<typeof ScrollAreaPrimitive.Thumb>) {
  return (
    <ScrollAreaPrimitive.Thumb
      data-slot="scroll-area-thumb"
      className={cn("relative flex-1 rounded-full bg-border", className)}
      {...props}
    />
  );
}

export { ScrollArea, ScrollAreaThumb, ScrollAreaViewport, ScrollBar };
