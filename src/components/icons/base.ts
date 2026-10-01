import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement>;

/* The stroke every hand-written glyph shares; a prop overrides any of it,
   including `aria-hidden` when the glyph carries meaning on its own. */
export function base(props: IconProps): IconProps {
  return {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    ...props,
  };
}
