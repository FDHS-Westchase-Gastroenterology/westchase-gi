import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/* Project-authored primitive, not a registry component (DESIGN.md
   "Component system"): patient-facing selects keep the native element —
   the OS picker on mobile is better for patients than a scripted listbox —
   and wear the committed field register. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "min-h-11 w-full min-w-0 rounded-sm border-[1.5px] border-line-2 bg-white px-4 py-3 text-base text-ink transition-colors outline-none focus-visible:border-teal-ink focus-visible:ring-3 focus-visible:ring-teal/25 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
