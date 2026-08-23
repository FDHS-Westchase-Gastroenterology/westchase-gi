"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { focusAfterNavigate, isUnmodifiedPrimaryClick } from "./recent-work-focus";
import { recentWorkHref } from "./recent-work-model";
import type { RecentWorkType } from "./recent-work-model";

// Pagination for the Activity page's two result lists (Recent work and the
// Technical record). The links keep their real href so pagination works
// Without JavaScript; with JavaScript the click navigates client-side and
// Then moves focus to the updated results summary — never the page body.
// Each pager receives both current page numbers and changes only its own.

export function RecentWorkPagination({
  ariaLabel,
  recentPage,
  technicalPage,
  totalPages,
  q,
  type,
  param,
  summaryId,
  testId,
}: Readonly<{
  ariaLabel: string;
  recentPage: number;
  technicalPage: number;
  totalPages: number;
  q: string;
  type: RecentWorkType;
  /** Which page parameter this list owns: "rw" (Recent work) or "page" (Technical record). */
  param: "rw" | "page";
  summaryId: string;
  testId: string;
}>) {
  const router = useRouter();
  if (totalPages <= 1) return null;

  const current = param === "rw" ? recentPage : technicalPage;

  const hrefFor = (target: number): string =>
    recentWorkHref({
      q,
      type,
      rw: param === "rw" ? target : recentPage,
      page: param === "page" ? target : technicalPage,
      hash: summaryId,
    });

  const follow = (event: React.MouseEvent<HTMLAnchorElement>, target: number): void => {
    if (!isUnmodifiedPrimaryClick(event)) return;
    event.preventDefault();
    router.push(hrefFor(target));
    focusAfterNavigate(summaryId);
  };

  return (
    <nav aria-label={ariaLabel} className="flex items-center gap-3" data-testid={testId}>
      {current > 1 ? (
        <Link
          href={hrefFor(current - 1)}
          rel="prev"
          className="btn btn-outline"
          onClick={(event) => {
            follow(event, current - 1);
          }}
        >
          Previous
        </Link>
      ) : null}
      <span
        aria-live="polite"
        aria-atomic="true"
        className="text-[0.9rem] font-bold text-[var(--color-body)]"
      >
        Page {current} of {totalPages}
      </span>
      {current < totalPages ? (
        <Link
          href={hrefFor(current + 1)}
          rel="next"
          className="btn btn-outline"
          onClick={(event) => {
            follow(event, current + 1);
          }}
        >
          Next
        </Link>
      ) : null}
    </nav>
  );
}
