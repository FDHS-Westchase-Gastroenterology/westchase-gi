"use client";

import { Button } from "@/components/ui/button";

import { Printer } from "./icons";

/** Prints the current page (prep pages carry a print stylesheet +
 *  letterhead, so the result is a clean take-home handout). */
export function PrintButton({ label }: Readonly<{ label: string }>) {
  return (
    <Button
      type="button"
      onClick={() => {
        window.print();
      }}
      className="print-hide"
    >
      <Printer className="h-4.5 w-4.5" /> {label}
    </Button>
  );
}
