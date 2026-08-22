"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { recentWorkHref } from "./recent-work-model";
import type { RecentWorkType } from "./recent-work-model";

// Pagination for the Activity page's two result lists (Recent work and the
// Technical record). The links keep their real href so pagination works
// Without JavaScript; with JavaScript the click navigates client-side and
// Then moves focus to the updated results summary — never the page body.

function focusWhenPresent(summaryId: string, attempt: number): void {
  const summary = document.getElementById(summaryId);
  if (summary !== null) {
    summary.focus();
    return;
  }
  if (attempt < 10) {
    window.setTimeout(() => {
      focusWhenPresent(summaryId, attempt + 1);
    }, 50);
  }
}

export function RecentWorkPagination({
  ariaLabel,
  page,
  totalPages,
  q,
  type,
  param,
  summaryId,
  testId,
}: Readonly<{
  ariaLabel: string;
  page: number;
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

  const hrefFor = (target: number): string =>
    recentWorkHref({
      q,
      type,
      ...(param === "page" ? { page: target, rw: page } : { rw: target, page }),
      hash: summaryId,
    });

  const follow = (event: React.MouseEvent<HTMLAnchorElement>, target: number): void => {
    event.preventDefault();
    router.push(hrefFor(target));
    window.setTimeout(() => {
      focusWhenPresent(summaryId, 0);
    }, 0);
  };

  return (
    <nav aria-label={ariaLabel} className="flex items-center gap-3" data-testid={testId}>
      {page > 1 ? (
        <Link
          href={hrefFor(page - 1)}
          rel="prev"
          className="btn btn-outline"
          onClick={(event) => {
            follow(event, page - 1);
          }}
        >
          Previous
        </Link>
      ) : null}
      <span className="text-[0.9rem] font-bold text-[var(--color-body)]">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link
          href={hrefFor(page + 1)}
          rel="next"
          className="btn btn-outline"
          onClick={(event) => {
            follow(event, page + 1);
          }}
        >
          Next
        </Link>
      ) : null}
    </nav>
  );
}
