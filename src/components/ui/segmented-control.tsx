"use client";

import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";
import type { CSSProperties } from "react";

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
 * slate-700, the chosen segment ink (slate-950) at weight 600. Focus is
 * the recipe teal ring on the segment. `readOnly` keeps the choice and
 * still submits it (a locked draft); `disabled` dims and drops it.
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
    // Geometry: a 44px track, 4px inset, equal segments
    "relative isolate grid min-h-11 w-full auto-cols-fr grid-flow-col rounded-[0.5rem] p-1",
    // Paper: a bare slate-100 track; only the thumb carries a stroke
    "bg-slate-100",
    // Invalid: the field's coral halo
    "aria-invalid:ring-3 aria-invalid:ring-coral-100",
    // Disabled: the whole control fades
    "data-disabled:opacity-60",
  ],
  {
    variants: {
      motion: {
        /* The staff home's fast beat for the thumb and the ink. */
        wgi: "[--segment-duration:var(--motion-fast-duration)] [--segment-ease:var(--motion-standard)]",
        /* No transitions at all; no consumer today. */
        none: "[--segment-duration:0s] [--segment-ease:linear]",
      },
    },
    defaultVariants: {
      motion: "wgi",
    },
  },
);

const segmentVariants = [
  // Geometry: fills its column, sits above the thumb
  "relative z-10 flex min-w-0 cursor-pointer items-center justify-center rounded-[0.375rem] px-1",
  // Ink: slate-700 at rest, the chosen segment in slate-950 and semibold
  "text-[0.875rem] leading-none font-normal whitespace-nowrap text-slate-700 select-none",
  "data-checked:font-semibold data-checked:text-slate-950",
  "transition-[color] duration-[var(--segment-duration)] ease-[var(--segment-ease)]",
  // Hover: a darker ink on an unchosen segment
  "hover:not-data-checked:not-data-readonly:not-data-disabled:text-slate-950",
  // Focus: the recipe teal ring on the focused segment
  "outline-none focus-visible:ring-2 focus-visible:ring-teal-ink",
  // Read-only and disabled: no pointer affordance
  "data-readonly:cursor-default data-disabled:cursor-not-allowed",
];

const thumbVariants = [
  // Geometry: one segment wide, moved by the chosen index
  "pointer-events-none absolute inset-y-1 left-1 rounded-[0.375rem]",
  "w-[calc((100%-0.5rem)/var(--segment-count))] translate-x-[calc(100%*var(--segment-index))]",
  "border border-slate-200 bg-white shadow-[0_1px_2px_rgb(27_42_58/0.12)]",
  "transition-[translate] duration-[var(--segment-duration)] ease-[var(--segment-ease)]",
];

export interface SegmentedControlOption<Value extends string> {
  readonly value: Value;
  readonly label: string;
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
      className={cn(segmentedControlVariants({ motion }), className)}
      style={place}
      {...props}
    >
      <span aria-hidden="true" data-slot="segmented-control-thumb" className={cn(thumbVariants)} />
      {options.map((option) => (
        <RadioPrimitive.Root
          key={option.value}
          value={option.value}
          data-slot="segmented-control-item"
          className={cn(segmentVariants)}
        >
          {option.label}
        </RadioPrimitive.Root>
      ))}
    </RadioGroupPrimitive>
  );
}

export { SegmentedControl };
