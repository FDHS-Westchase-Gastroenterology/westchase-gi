import { redirect } from "next/navigation";
import { requireRole } from "@/lib/portal/auth";
import { reviewFlyers } from "@/lib/review-flyers";
import { ReviewFlyerPrinter } from "./review-flyer-printer";

export default async function ReviewFlyersPage() {
  const session = await requireRole("staff");
  if (session.role !== "admin") redirect("/admin");

  return <ReviewFlyerPrinter flyers={reviewFlyers} />;
}
