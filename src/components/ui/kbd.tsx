import { cn } from "cn";
import type { ComponentProps } from "react";

/*
 * A keycap: one key a person can press, shown where the Schedule names its
 * shortcuts (issue #351: the Day view's hint strip and the shortcuts list).
 * Adapted from the shadcn Kbd (src/components/stock/kbd.tsx). The registry's
 * muted chip becomes a raised key: white on a line-2 edge with a 1px
 * bottom lip, 4px corners, 11px bold Lato (the sans, over the browser's monospace for kbd) in ink, at least 22px square.
 * KbdGroup sets keys pressed together or in turn 4px apart. A keycap never
 * takes the pointer, so one inside a button leaves the press to the button.
 */
const kbdClasses = [
  "pointer-events-none inline-grid h-[22px] min-w-[22px] place-items-center px-[5px] select-none",
  "rounded-[4px] border border-slate-300 bg-white shadow-[0_1px_0_var(--color-slate-300)]",
  "font-sans text-[0.6875rem] leading-none font-bold text-ink",
];

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry DOM member types that cannot be made readonly
function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return <kbd data-slot="kbd" className={cn(kbdClasses, className)} {...props} />;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry DOM member types that cannot be made readonly
function KbdGroup({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn("inline-flex gap-1 font-sans", className)}
      {...props}
    />
  );
}

export { Kbd, KbdGroup };
