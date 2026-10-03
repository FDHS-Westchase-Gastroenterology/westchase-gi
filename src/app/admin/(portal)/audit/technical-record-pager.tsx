"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button-variants";

import { TECHNICAL_RECORD_SUMMARY_ID, technicalRecordHref } from "./activity-model";

/* The Technical record's pages (issue #357): the stored audit rows, 100 a
   page, for administrators. The links keep their real href, so paging works
   without JavaScript; with it, the click navigates client-side and focus
   then moves to the results summary, never the page body. The handler names
   the focus target before the App Router changes, and the summary takes it
   in an effect keyed to its new server props, with no timing guess and no
   focus move on a direct load. The log's own filters ride along: the links
   read the address as it stands now, because the log rewrites it in place
   when a filter changes. */

let focusSummaryNext = false;

export function TechnicalRecordSummary({
  renderKey,
  children,
}: Readonly<{ renderKey: string; children: ReactNode }>) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!focusSummaryNext || ref.current === null) return;
    focusSummaryNext = false;
    ref.current.focus();
  }, [renderKey]);

  return (
    <p
      ref={ref}
      id={TECHNICAL_RECORD_SUMMARY_ID}
      data-testid="audit-page-summary"
      tabIndex={-1}
      className="text-[0.9rem] text-[var(--color-muted-ink)]"
    >
      {children}
    </p>
  );
}

export function TechnicalRecordPager({
  page,
  totalPages,
}: Readonly<{ page: number; totalPages: number }>) {
  const params = useSearchParams();
  if (totalPages <= 1) return null;
  const baseHref = `/admin/audit?${params.toString()}`;
  const onNavigate = () => {
    focusSummaryNext = true;
  };

  return (
    <nav
      aria-label="Activity log pages"
      className="flex items-center gap-3"
      data-testid="audit-pagination"
    >
      {page > 1 ? (
        <Link
          href={technicalRecordHref(baseHref, page - 1)}
          rel="prev"
          data-slot="button"
          className={buttonVariants({ variant: "outline" })}
          onNavigate={onNavigate}
        >
          Previous
        </Link>
      ) : null}
      <span
        aria-live="polite"
        aria-atomic="true"
        className="text-[0.9rem] font-bold text-[var(--color-body)]"
      >
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link
          href={technicalRecordHref(baseHref, page + 1)}
          rel="next"
          data-slot="button"
          className={buttonVariants({ variant: "outline" })}
          onNavigate={onNavigate}
        >
          Next
        </Link>
      ) : null}
    </nav>
  );
}
