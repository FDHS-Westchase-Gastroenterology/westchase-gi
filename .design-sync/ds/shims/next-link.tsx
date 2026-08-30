/* Browser shim for `next/link`.
 *
 * The uploaded bundle runs outside Next, so the real Link — which reads the
 * app router from context — throws. Components in src/components/ use Link
 * purely as a styled anchor, so an <a> is a faithful stand-in. */

import type { AnchorHTMLAttributes, ReactNode } from "react";

export interface LinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string | { pathname?: string; query?: Record<string, unknown> };
  children?: ReactNode;
  /** Accepted and ignored — router-only concerns with no visual effect. */
  prefetch?: boolean | null;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  locale?: string | false;
  passHref?: boolean;
  legacyBehavior?: boolean;
}

export default function Link({
  href,
  children,
  prefetch: _prefetch,
  replace: _replace,
  scroll: _scroll,
  shallow: _shallow,
  locale: _locale,
  passHref: _passHref,
  legacyBehavior: _legacyBehavior,
  ...rest
}: LinkProps) {
  const to = typeof href === "string" ? href : (href?.pathname ?? "#");
  return (
    <a href={to} {...rest}>
      {children}
    </a>
  );
}
