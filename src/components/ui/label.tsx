"use client";

import { cn } from "cn";
import type { ComponentProps } from "react";

/*
 * Brand adoption of the shadcn Label (base-nova, registry source in
 * src/components/stock/label.tsx). Reused unchanged: the `<label>` element,
 * the disabled and peer-disabled states, and the flex row that lets a label
 * hold an icon beside its text.
 *
 * The brand change is the type. `font-semibold` replaces the registry's
 * `font-medium` and `text-ink` names the ink explicitly, so a field label
 * carries the weight and color the portal's forms are drawn with.
 *
 * Consumer: `FieldLabel` in ui/field.tsx. No route imports this file
 * directly; a form labels its control through `FieldLabel`
 * (design-system/forms.md "Fields").
 */

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-semibold text-ink select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
