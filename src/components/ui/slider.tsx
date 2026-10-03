"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";

/*
 * Brand adoption of the shadcn Slider (base-nova, registry source in
 * src/components/stock/slider.tsx). Its first consumer is a provider's weekly
 * hours in Settings (issue #352, Figma St1): each working window is a
 * two-thumb range whose ends staff drag along an hour ruler, 15 minutes a
 * step. HIG Sliders: minimum on the leading side, the filled span between
 * the thumbs, live feedback while dragging, and the exact value available
 * as text (each thumb announces its time).
 *
 * Reused unchanged: Base UI's Slider Root, Control, Track, Indicator and
 * Thumb — pointer capture, keyboard steps (arrows by `step`, Page Up/Down and
 * Shift+arrows by `largeStep`), `onValueCommitted` on release, the hidden
 * range inputs and their ARIA.
 *
 * Adapted, and why:
 * - `thumbAlignment` defaults to `center` (the registry pins `edge`), so a
 *   value sits exactly under its ruler position: the control's width maps
 *   the range [min, max] to pixels with no thumb-width inset.
 * - Every thumb renders from the values' length, and takes an accessible
 *   name and value text through `thumbLabel` / `thumbValueText`.
 * - Paint has a `tone` axis. `default` is the registry's thin track in
 *   brand tokens. `hours` is the frame's working-window bar: a 22px mint
 *   span with a mint-500 edge and 7px corners, its thumbs drawn as the
 *   3×10 grips inside each end, on a transparent track (the ruler's hour
 *   lines sit behind it).
 * - Focus is the portal's teal-ink outline on the thumb.
 *
 * Motion: none. A slider tracks the pointer 1:1 (apple-design §2), so nothing
 * on it eases; the thumb's focus outline appears at once.
 */
const trackVariants = cva("relative grow select-none data-horizontal:w-full", {
  variants: {
    tone: {
      default: "h-1 overflow-hidden rounded-full bg-[var(--color-line)]",
      hours: "h-[22px] bg-transparent",
    },
  },
  defaultVariants: { tone: "default" },
});

const indicatorVariants = cva("select-none data-horizontal:h-full", {
  variants: {
    tone: {
      default: "bg-primary",
      hours:
        "rounded-[7px] border border-[var(--color-mint-500)] bg-linear-to-b from-[var(--color-mint-100)] to-[var(--color-mint-200)]",
    },
  },
  defaultVariants: { tone: "default" },
});

const thumbVariants = cva(
  [
    "relative block shrink-0 select-none outline-none",
    "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-teal-ink)]",
    "data-disabled:pointer-events-none",
  ],
  {
    variants: {
      tone: {
        default:
          "size-3 rounded-full border border-[var(--color-teal-ink)] bg-white after:absolute after:-inset-2",
        /* A 12×22 grab target centered on the bar's end; the visible grip is
           the 3×10 rule drawn 3px inside the bar, toward its middle. */
        hours: [
          "h-[22px] w-3 cursor-ew-resize rounded-[4px]",
          "before:absolute before:top-[6px] before:h-[10px] before:w-[3px] before:rounded-[2px] before:bg-[var(--color-mint-700)] before:opacity-50",
          "data-[index='0']:before:left-[9px] data-[index='1']:before:right-[9px]",
          "hover:before:opacity-90 data-dragging:before:opacity-90",
        ],
      },
    },
    defaultVariants: { tone: "default" },
  },
);

type SliderProps = SliderPrimitive.Root.Props<readonly number[]> &
  VariantProps<typeof trackVariants> & {
    /** The accessible name of the thumb at `index`. */
    readonly thumbLabel?: (index: number) => string;
    /** What the thumb at `index` announces for `value`. */
    readonly thumbValueText?: (value: number, index: number) => string;
  };

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  tone = "default",
  thumbAlignment = "center",
  thumbLabel,
  thumbValueText,
  ...props
}: SliderProps) {
  const count = (value ?? defaultValue ?? [min, max]).length;
  return (
    <SliderPrimitive.Root
      className={cn("data-horizontal:w-full", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment={thumbAlignment}
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50">
        <SliderPrimitive.Track data-slot="slider-track" className={trackVariants({ tone })}>
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className={indicatorVariants({ tone })}
          />
        </SliderPrimitive.Track>
        {Array.from({ length: count }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            // Thumbs are positional: index i is value i for the slider's life
            key={index}
            index={index}
            data-index={index}
            getAriaLabel={thumbLabel ?? null}
            getAriaValueText={
              thumbValueText === undefined
                ? null
                : (_formatted, thumbValue, thumbIndex) => thumbValueText(thumbValue, thumbIndex)
            }
            className={thumbVariants({ tone })}
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
