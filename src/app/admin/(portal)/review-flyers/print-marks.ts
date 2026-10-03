import type { ReviewTargetKey } from "@/lib/review-flyers";

/* What a Review flyers print marks (issue #357): the page's target on the
   body, and in Print several each chosen flyer. The print rules in
   globals.css show only the marked flyers, one to a page. */

/** One flyer, every flyer, or the ones chosen in Print several. */
export type PrintTarget = Readonly<
  { mark: ReviewTargetKey | "all" } | { mark: "several"; chosen: readonly ReviewTargetKey[] }
>;

/** Clear what the last print marked: the page's target and any chosen flyers. */
export function clearPrintMarks() {
  delete document.body.dataset.reviewFlyerPrint;
  for (const flyer of document.querySelectorAll("[data-review-flyer-chosen]")) {
    flyer.removeAttribute("data-review-flyer-chosen");
  }
}

/** Mark `target` and open the browser's print dialog. */
export function printFlyers(target: PrintTarget) {
  clearPrintMarks();
  if (target.mark === "several") {
    for (const key of target.chosen) {
      document
        .querySelector(`[data-review-flyer="${key}"]`)
        ?.setAttribute("data-review-flyer-chosen", "");
    }
  }
  document.body.dataset.reviewFlyerPrint = target.mark;
  window.print();
}
