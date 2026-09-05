import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";

import { cn } from "@/lib/utils";

/* Fresh conversion of the stock registry Item for the home dashboard
   (portal-home-redesign-brief §4.5). The row IS an Item, converted flat: the
   stock card geometry (border, radius, wrap, padding) is stripped so the
   line reads as one rule inside the housed list — home.css `.appt-line`
   carries the layout. */

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function LineItem({ className, render, ...props }: useRender.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">({ className: cn("appt-line", className) }, props),
    render,
    state: {
      slot: "item",
      variant: "line",
    },
  });
}

export { LineItem };
