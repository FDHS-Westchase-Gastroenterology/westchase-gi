import { Input as InputPrimitive } from "@base-ui/react/input";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/*
 * Brand adaptation of the shadcn Input: the committed field register.
 * White paper, a 1.5px line-2 border on the brand radius-sm, teal focus
 * (teal's one meaning: the finger tracking a line), destructive reserved
 * for the invalid state, and the 44px minimum target.
 */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "min-h-11 w-full min-w-0 rounded-sm border-[1.5px] border-line-2 bg-white px-4 py-3 text-base text-ink transition-colors outline-none placeholder:text-muted-ink file:inline-flex file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-foreground focus-visible:border-teal-ink focus-visible:ring-3 focus-visible:ring-teal/25 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
