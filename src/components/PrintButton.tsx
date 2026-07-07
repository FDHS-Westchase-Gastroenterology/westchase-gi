"use client";

import { Printer } from "./icons";

/** Prints the current page (prep pages carry a print stylesheet +
 *  letterhead, so the result is a clean take-home handout). */
export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-navy print-hide">
      <Printer className="h-4.5 w-4.5" /> {label}
    </button>
  );
}
