import Link from "next/link";
import type { ReactNode } from "react";

import { ChevronLeft } from "@/components/icons";

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
export function PortalPageHeader({
  title,
  description,
  actions,
  back,
  meta,
}: Readonly<{
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  meta?: ReactNode;
}>) {
  return (
    <header className="portal-page-header">
      <div className="min-w-0">
        {back !== undefined ? (
          <Link href={back.href} className="portal-back-link print-hide">
            <ChevronLeft className="h-4 w-4" />
            {back.label}
          </Link>
        ) : null}
        <h1 className="portal-page-title">{title}</h1>
        {description !== undefined &&
        description !== null &&
        description !== false &&
        description !== "" ? (
          <p className="portal-page-description">{description}</p>
        ) : null}
        {meta !== undefined && meta !== null && meta !== false && meta !== "" ? (
          <div className="portal-page-meta">{meta}</div>
        ) : null}
      </div>
      {actions !== undefined && actions !== null && actions !== false && actions !== "" ? (
        <div className="portal-page-actions print-hide">{actions}</div>
      ) : null}
    </header>
  );
}
