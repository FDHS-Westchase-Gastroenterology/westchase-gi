import { requireRole } from "@/lib/portal/auth";
import { reviewFlyers } from "@/lib/review-flyers";
import { ReviewFlyerPrinter } from "./review-flyer-printer";

export default async function ReviewFlyersPage() {
  await requireRole("staff");

  return <ReviewFlyerPrinter flyers={reviewFlyers} />;
}
