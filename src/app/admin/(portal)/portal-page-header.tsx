import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "@/components/icons";

export function PortalPageHeader({
  title,
  description,
  actions,
  back,
  meta,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  meta?: ReactNode;
}) {
  return (
    <header className="portal-page-header">
      <div className="min-w-0">
        {back ? (
          <Link href={back.href} className="portal-back-link print-hide">
            <ChevronLeft className="h-4 w-4" />
            {back.label}
          </Link>
        ) : null}
        <h1 className="portal-page-title">{title}</h1>
        {description ? (
          <p className="portal-page-description">{description}</p>
        ) : null}
        {meta ? <div className="portal-page-meta">{meta}</div> : null}
      </div>
      {actions ? <div className="portal-page-actions print-hide">{actions}</div> : null}
    </header>
  );
}
