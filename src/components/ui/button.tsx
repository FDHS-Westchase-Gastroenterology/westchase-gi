import { Button as ButtonPrimitive } from "@base-ui/react/button";
import type { VariantProps } from "class-variance-authority";

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

/* Brand adaptation of the shadcn Button; the register itself lives in
   button-variants.ts so zero-JS anchors can wear it without this client
   component. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function Button({
  className,
  variant = "default",
  size = "default",
  motion = "wgi",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ motion, variant, size, className }))}
      {...props}
    />
  );
}

export { Button };
