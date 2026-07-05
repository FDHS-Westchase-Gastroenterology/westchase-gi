import { notFound } from "next/navigation";

/** Catch unmatched in-locale paths and render the localized 404. */
export default function CatchAll() {
  notFound();
}
