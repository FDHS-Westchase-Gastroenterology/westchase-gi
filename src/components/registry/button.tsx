import { Button as ButtonPrimitive } from "@base-ui/react/button";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";

import { buttonVariants } from "./registry-button-variants";

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Base UI props retain framework member types
function Button({
  className,
  variant = "default",
  size = "default",
  motion = "instant",
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
