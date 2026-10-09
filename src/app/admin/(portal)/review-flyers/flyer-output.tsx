"use client";

import { cn } from "cn";
import type { ComponentProps } from "react";

import { usePortalFeedback } from "@/app/admin/(portal)/portal-feedback";
import { useOutputGuard } from "@/components/output-feedback";
import { Button } from "@/components/ui/button";

import type { PrintTarget } from "./print-marks";
import { printFlyers } from "./print-marks";

/* How the Review flyers page prints and downloads (issue #357). Printing
   marks what to print on the page, then opens the browser's dialog; the
   print rules in globals.css show only the marked flyers, one to a page.
   Each action holds itself for a moment after it starts, so a double click
   opens one dialog or starts one download, and says what it started in the
   page's feedback line. */

export const FEEDBACK_SOURCE = "review-flyer-output";

/** Open the print dialog for `target` once, and say so. */
export function useFlyerPrint() {
  const { publish } = usePortalFeedback();
  const { begin, locked } = useOutputGuard({ releaseOnAfterPrint: true });

  function print(target: PrintTarget, message: string) {
    if (!begin()) return;
    publish({ source: FEEDBACK_SOURCE, tone: "status", message });
    // The feedback line paints before the dialog blocks the page.
    window.requestAnimationFrame(() => {
      printFlyers(target);
    });
  }

  return { print, locked } as const;
}

/** Start a download once, and say so; a second click while it starts does nothing. */
export function useFlyerDownload() {
  const { publish } = usePortalFeedback();
  const { begin } = useOutputGuard();

  return function started(event: Readonly<{ preventDefault: () => void }>, message: string) {
    if (!begin()) {
      event.preventDefault();
      return;
    }
    publish({ source: FEEDBACK_SOURCE, tone: "status", message });
  };
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
export function FlyerPrintButton({
  target,
  message,
  className,
  ...props
}: Omit<ComponentProps<typeof Button>, "onClick"> &
  Readonly<{ target: PrintTarget; message: string }>) {
  const { print, locked } = useFlyerPrint();

  return (
    <Button
      aria-disabled={locked || undefined}
      className={cn("aria-disabled:pointer-events-none aria-disabled:opacity-60", className)}
      onClick={() => {
        print(target, message);
      }}
      {...props}
    />
  );
}
