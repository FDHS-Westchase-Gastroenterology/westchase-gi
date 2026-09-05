import { notFound } from "next/navigation";

/* The design gallery is a workbench for the people building the products,
   not a product surface: it renders locally and on Vercel Preview, and is a
   404 in Production. The gate runs at the top of every gallery page rather
   than in the root layout, which has to render an <html> shell either way. */
export function requireGallery(): void {
  if (process.env.VERCEL_ENV === "production") {
    notFound();
  }
}
