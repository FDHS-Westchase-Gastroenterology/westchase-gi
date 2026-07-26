import { requireRole } from "@/lib/portal/auth";
import { reviewFlyers } from "@/lib/review-flyers";
import { ReviewFlyerPrinter } from "./review-flyer-printer";

// Printing an approved artifact mutates nothing, and handing flyers to
// patients is a front-desk job — every active staff member holds it
// (product decision 2026-07-26). Changing the artifacts themselves stays
// outside the portal entirely.
export default async function ReviewFlyersPage() {
  await requireRole("staff");

  return <ReviewFlyerPrinter flyers={reviewFlyers} />;
}
