import Link from "next/link";

import { buttonVariants } from "@/components/ui/registry-button-variants";
import { requestsHref } from "@/lib/portal/request-query";
import type { RequestPageWindow } from "@/lib/portal/request-window";
import type { RequestStatus } from "@/lib/portal/workflow/contracts";

export function QueuePagination({
  pageWindow,
  requestCount,
  page,
  search,
  filter,
}: Readonly<{
  pageWindow: Readonly<RequestPageWindow>;
  requestCount: number;
  page: number;
  search: string;
  filter: RequestStatus | "all";
}>) {
  const { filteredTotal, totalPages, firstShown, lastShown } = pageWindow;
  return (
    <>
      {filteredTotal > 0 && (requestCount > 0 || page > 1) ? (
        <div className="portal-queue-pagination">
          {requestCount > 0 ? (
            <p data-testid="request-page-summary">
              Showing {firstShown}–{lastShown} of {filteredTotal}
            </p>
          ) : null}
          {totalPages > 1 ? (
            <nav aria-label="Appointment request pages" className="portal-page-nav">
              {page > 1 ? (
                <Link
                  href={requestsHref({
                    page: page - 1,
                    search,
                    status: filter,
                  })}
                  rel="prev"
                  data-slot="button"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Previous
                </Link>
              ) : null}
              <span>
                Page {page} of {totalPages}
              </span>
              {requestCount > 0 && page < totalPages ? (
                <Link
                  href={requestsHref({
                    page: page + 1,
                    search,
                    status: filter,
                  })}
                  rel="next"
                  data-slot="button"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Next
                </Link>
              ) : null}
            </nav>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
