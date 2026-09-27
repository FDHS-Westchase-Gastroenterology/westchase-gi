"use client";

import type { RefObject } from "react";

import { buttonVariants } from "@/components/ui/button-variants";
import { PRINT_ID_LIMIT, printPacketIdsHref } from "@/lib/portal/print-selection";

import { requestCount } from "./home-line";
import type { HomeLine } from "./home-line";
import { isPrintable } from "./print-rows";

/* The Print sheet's footer: what will print, Cancel, and Print. Print is a
   plain anchor to the packet route in a new tab; it is disabled when
   nothing is chosen or more than the route takes at once. */

function summary(total: number, chosen: number): string {
  if (total === 0) return "No requests";
  if (chosen > PRINT_ID_LIMIT) {
    return `${chosen} chosen · Print up to ${PRINT_ID_LIMIT} at a time`;
  }
  if (chosen === 0) return `None of ${requestCount(total)} chosen`;
  const pages = chosen === 1 ? "1 page" : `${chosen} pages`;
  const head = chosen === total ? requestCount(total) : `${chosen} of ${requestCount(total)}`;
  return `${head} · ${pages} · oldest first`;
}

export function PrintSheetFooter({
  total,
  chosen,
  printRef,
  onClose,
}: Readonly<{
  total: number;
  chosen: readonly Readonly<HomeLine>[];
  printRef: RefObject<HTMLAnchorElement | null> | null;
  onClose: () => void;
}>) {
  return (
    <footer className="wgi-glass-footer wgi-print-footer">
      <p className="wgi-print-summary" data-testid="print-summary">
        {summary(total, chosen.length)}
      </p>
      <button
        type="button"
        data-glass="secondary"
        className={buttonVariants({ variant: "outline" })}
        onClick={onClose}
      >
        Cancel
      </button>
      {isPrintable(chosen.length) ? (
        /* A plain anchor, never a prefetching Link: the packet route
           records a print audit when it renders. */
        <a
          ref={printRef}
          href={printPacketIdsHref(
            chosen.map((line) => line.id),
            true,
          )}
          target="_blank"
          rel="noopener"
          data-slot="button"
          data-glass="primary"
          data-testid="print-requests-submit"
          className={buttonVariants()}
          onClick={onClose}
        >
          Print {requestCount(chosen.length)}
        </a>
      ) : (
        <button
          type="button"
          disabled
          data-glass="primary"
          data-testid="print-requests-submit"
          className={buttonVariants()}
        >
          Print
        </button>
      )}
    </footer>
  );
}
