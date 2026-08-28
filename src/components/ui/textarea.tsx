import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/* Brand adaptation of the shadcn Textarea: the same committed field register
   as Input (white paper, 1.5px line-2 border, brand radius-sm, teal focus),
   with content-following sizing. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "field-sizing-content flex min-h-16 w-full rounded-sm border-[1.5px] border-line-2 bg-white px-4 py-3 text-base text-ink transition-colors outline-none placeholder:text-muted-ink focus-visible:border-teal-ink focus-visible:ring-3 focus-visible:ring-teal/25 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
