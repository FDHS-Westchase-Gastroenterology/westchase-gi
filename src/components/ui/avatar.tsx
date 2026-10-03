"use client";

import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import { cn } from "cn";

/*
 * An avatar: a person's initials in a disc — the week's provider menu
 * (issue #345), adopted here by issue #360. Adapted from the shadcn Avatar
 * (src/components/stock/avatar.tsx) on the same Base UI parts.
 *
 * Changes from the registry:
 * - Initials are the brand's: navy-900 bold on navy-100, the portal's
 *   people tint, where the registry sets muted ink on the muted fill. The
 *   small size sets its initials at 10px so two letters sit inside 24px.
 * - The registry's hairline ring (a blended `after:` border) is left out:
 *   it edges a photograph against a like background, and no portal avatar
 *   carries a photograph yet. Image, Badge and Group have no product
 *   consumer and are left out with it.
 * No motion.
 */

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function Avatar({
  className,
  size = "default",
  ...props
}: AvatarPrimitive.Root.Props & {
  size?: "default" | "sm" | "lg";
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        "group/avatar relative flex size-8 shrink-0 rounded-full select-none data-[size=lg]:size-10 data-[size=sm]:size-6",
        className,
      )}
      {...props}
    />
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function AvatarFallback({ className, ...props }: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-navy-100 text-sm font-bold text-navy-900 group-data-[size=sm]/avatar:text-[0.625rem]",
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarFallback };
