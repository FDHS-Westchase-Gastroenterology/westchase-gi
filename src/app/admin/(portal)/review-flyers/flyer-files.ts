import type { ReviewAssetKind, ReviewFlyer, ReviewTargetKey } from "@/lib/review-flyers";

/* Where a review flyer's files are served (issue #357): each file through
   the staff-only assets route, and the three together as one .zip from the
   zip route beside it. */

/** Which of a flyer's three files are on the server; a missing one is never offered. */
export type FlyerFiles = Readonly<Record<ReviewAssetKind, boolean>>;

export function assetUrl(filename: string, download = false): string {
  const path = `/admin/review-flyers/assets/${encodeURIComponent(filename)}`;
  return download ? `${path}?download=1` : path;
}

export function archiveUrl(key: ReviewTargetKey): string {
  return `/admin/review-flyers/zip/${key}`;
}

/** The code the card shows: the vector when the server has it, else the bitmap. */
export function flyerCodeFile(flyer: ReviewFlyer, files: FlyerFiles): string | null {
  if (files.svg) return flyer.assets.svg.filename;
  if (files.png) return flyer.assets.png.filename;
  return null;
}
