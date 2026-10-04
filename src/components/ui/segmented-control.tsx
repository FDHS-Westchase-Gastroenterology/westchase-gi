"use client";

import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";
import type { CSSProperties, ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

/*
 * A segmented control: two to four mutually exclusive choices shown at
 * once, one of them always chosen. Adapted from the shadcn RadioGroup
 * (src/components/stock/radio-group.tsx), so it is Base UI's radio group
 * underneath: `role="radiogroup"`, one tab stop, arrow keys move the
 * choice, and each segment carries a hidden native radio named after the
 * group, so a plain form post submits `name=value` as a select did.
 * The registry's ToggleGroup is not a form control and has no name; the
 * stock round radio dots read as a list, not as one control.
 *
 * Paper: a bare slate-100 track holding a white, hairline-stroked thumb
 * under the chosen segment, 44px tall to match the Input recipe beside
 * it. Segments are equal width, so the thumb's place is the chosen index
 * alone (`--segment-index` / `--segment-count`) and needs no
 * measuring: the server render already shows the choice. Ink is
 * slate-700, the chosen segment ink (slate-950) at weight 600; each label
 * reserves its weight-600 width, so a choice never resizes the control or
 * moves what sits beside it. Focus is
 * the recipe teal ring on the segment. `readOnly` keeps the choice and
 * still submits it (a locked draft); `disabled` dims and drops it.
 *
 * Paper is an axis. `track` (default) is the paper above. `glass` is the
 * Schedule's view switch (Figma Ypf9ohpRcGWF5C9T9bSvWW, section 08, S1): a
 * white capsule under a navy-200 stroke, 42px tall, whose thumb is the
 * applied filter pill's navy glass, navy-50 to navy-100 under a navy-800
 * stroke with a white top highlight.
 *
 * An option with a `disabledReason` cannot be chosen yet: Base UI marks
 * it `aria-disabled` (it is a span, never a native disabled control), the
 * arrow keys pass over it, and a tooltip on hover or focus says why.
 *
 * Motion is its own axis (design-system/components.md "Component API
 * rules"). `wgi` (default): the thumb slides with `translate` on the staff
 * home's fast beat, --motion-fast-duration on --motion-standard, and a
 * CSS transition re-targets from wherever the thumb is when the choice
 * changes again. The label weight swaps at once; its ink rides the same
 * beat. Reduced motion: the blanket reset in globals.css makes the thumb
 * jump; the segments are registered beside it so their ink keeps the
 * 120ms cross-fade.
 */
const segmentedControlVariants = cva(
  [
    // Geometry: a 4px inset holding equal segments
    "relative isolate grid w-full auto-cols-fr grid-flow-col p-1",
    // Invalid: the field's coral halo
    "aria-invalid:ring-3 aria-invalid:ring-coral-100",
    // Disabled: the whole control fades
    "data-disabled:opacity-60",
  ],
  {
    variants: {
      paper: {
        /* A bare slate-100 track, 44px; only the thumb carries a stroke. */
        track: "min-h-11 rounded-[0.5rem] bg-slate-100",
        /* A white capsule under a navy-200 stroke, 42px. */
        glass: "min-h-[2.625rem] rounded-full border border-navy-200 bg-white",
      },
      motion: {
        /* The staff home's fast beat for the thumb and the ink. */
        wgi: "[--segment-duration:var(--motion-fast-duration)] [--segment-ease:var(--motion-standard)]",
        /* No transitions at all: the Schedule's view switch when a key chose the view. */
        none: "[--segment-duration:0s] [--segment-ease:linear]",
      },
    },
    defaultVariants: {
      paper: "track",
      motion: "wgi",
    },
  },
);

const segmentVariants = cva(
  [
    // Geometry: fills its column, sits above the thumb
    "relative z-10 flex min-w-0 cursor-pointer items-center justify-center gap-2",
    // An option's icon keeps the ink and a 16px box
    "[&_svg]:size-4 [&_svg]:shrink-0",
    // Ink: slate-700 at rest, the chosen segment in slate-950 and semibold
    "text-[0.875rem] leading-none font-normal whitespace-nowrap text-slate-700 select-none",
    "data-checked:font-semibold data-checked:text-slate-950",
    "transition-[color] duration-[var(--segment-duration)] ease-[var(--segment-ease)]",
    // Hover: a darker ink on an unchosen segment
    "hover:not-data-checked:not-data-readonly:not-data-disabled:text-slate-950",
    // Focus: the recipe teal ring on the focused segment
    "outline-none focus-visible:ring-2 focus-visible:ring-teal-ink",
    // Read-only: no pointer affordance. Disabled: none either, and no hover ink
    "data-readonly:cursor-default data-disabled:cursor-default",
  ],
  {
    variants: {
      paper: {
        track: "rounded-[0.375rem] px-1",
        glass: "min-h-8 rounded-full px-4",
      },
    },
    defaultVariants: { paper: "track" },
  },
);

const thumbVariants = cva(
  [
    // Geometry: one segment wide, moved by the chosen index
    "pointer-events-none absolute inset-y-1 left-1",
    "w-[calc((100%-0.5rem)/var(--segment-count))] translate-x-[calc(100%*var(--segment-index))]",
    "transition-[translate] duration-[var(--segment-duration)] ease-[var(--segment-ease)]",
  ],
  {
    variants: {
      paper: {
        track:
          "rounded-[0.375rem] border border-slate-200 bg-white shadow-[0_1px_2px_rgb(27_42_58/0.12)]",
        glass:
          "rounded-full border-[1.2px] border-navy-800 bg-linear-to-b from-navy-50 to-navy-100 shadow-[inset_0_1px_0_rgb(255_255_255/0.8)]",
      },
    },
    defaultVariants: { paper: "track" },
  },
);

export interface SegmentedControlOption<Value extends string> {
  readonly value: Value;
  readonly label: string;
  /** A glyph drawn before the label, such as the Hours sheet's scope icons. */
  readonly icon?: ReactNode;
  /** Why the option cannot be chosen yet; set, it disables the option and says so. */
  readonly disabledReason?: string;
}

type SegmentedControlProps<Value extends string> = Omit<
  RadioGroupPrimitive.Props<Value>,
  "children" | "value" | "defaultValue" | "onValueChange" | "style"
> &
  VariantProps<typeof segmentedControlVariants> & {
    readonly options: readonly SegmentedControlOption<Value>[];
    readonly value: Value;
    readonly onValueChange?: (value: Value) => void;
  };

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function SegmentedControl<Value extends string>({
  className,
  paper = "track",
  motion = "wgi",
  options,
  value,
  onValueChange,
  ...props
}: SegmentedControlProps<Value>) {
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  /* The thumb's geometry reads these two custom properties (thumbVariants). */
  const place: CSSProperties & Record<`--${string}`, string> = {
    "--segment-count": String(options.length),
    "--segment-index": String(index),
  };
  return (
    <RadioGroupPrimitive<Value>
      data-slot="segmented-control"
      value={value}
      onValueChange={(next) => {
        onValueChange?.(next);
      }}
      className={cn(segmentedControlVariants({ paper, motion }), className)}
      style={place}
      {...props}
    >
      <span
        aria-hidden="true"
        data-slot="segmented-control-thumb"
        className={thumbVariants({ paper })}
      />
      {options.map((option) => {
        const item = (
          <RadioPrimitive.Root
            key={option.value}
            value={option.value}
            disabled={option.disabledReason !== undefined}
            data-slot="segmented-control-item"
            className={segmentVariants({ paper })}
          >
            {option.icon}
            <span
              data-label={option.label}
              className="flex flex-col items-center after:invisible after:h-0 after:overflow-hidden after:font-semibold after:content-[attr(data-label)]"
            >
              {option.label}
            </span>
          </RadioPrimitive.Root>
        );
        return option.disabledReason === undefined ? (
          item
        ) : (
          <Tooltip key={option.value}>
            <TooltipTrigger render={item} />
            <TooltipContent side="bottom">{option.disabledReason}</TooltipContent>
          </Tooltip>
        );
      })}
    </RadioGroupPrimitive>
  );
}

export { SegmentedControl };
