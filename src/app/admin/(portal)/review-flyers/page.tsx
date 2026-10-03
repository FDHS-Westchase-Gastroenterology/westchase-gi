import { access } from "node:fs/promises";
import { join } from "node:path";

import { requireRole } from "@/lib/portal/auth";
import { reviewFlyers } from "@/lib/review-flyers";
import type { ReviewAssetKind, ReviewFlyer } from "@/lib/review-flyers";

import { ReviewFlyerPrinter } from "./review-flyer-printer";
import type { ReviewFlyerFiles } from "./review-flyer-printer";

// Printing an approved artifact mutates nothing, and handing flyers to
// Patients is a front-desk job — every active staff member holds it
// (product decision 2026-07-26). Changing the artifacts themselves stays
// Outside the portal entirely.

const FLYER_DIR = join(process.cwd(), "private", "review-flyers");
const KINDS = ["pdf", "svg", "png"] as const satisfies readonly ReviewAssetKind[];

async function onServer(filename: string): Promise<boolean> {
  try {
    await access(join(FLYER_DIR, filename));
    return true;
  } catch {
    return false;
  }
}

/** Which of a flyer's files the server holds; the page offers only those. */
async function flyerFiles(flyer: ReviewFlyer) {
  const [pdf, svg, png] = await Promise.all(
    KINDS.map(async (kind) => onServer(flyer.assets[kind].filename)),
  );
  return [flyer.key, { pdf, svg, png }] as const;
}

export default async function ReviewFlyersPage() {
  await requireRole("staff");
  const files: ReviewFlyerFiles = Object.fromEntries(
    await Promise.all(reviewFlyers.map(async (flyer) => flyerFiles(flyer))),
  );

  return <ReviewFlyerPrinter flyers={reviewFlyers} files={files} />;
}
