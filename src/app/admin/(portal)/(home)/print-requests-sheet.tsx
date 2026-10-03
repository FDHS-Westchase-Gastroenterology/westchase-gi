"use client";

import { cn } from "cn";
import { useId, useRef, useState } from "react";

import { Printer } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button-variants";
import { PopoverContainer } from "@/components/ui/popover-behavior";

import type { HomeLine } from "./home-line";
import { PrintSheetBody } from "./print-sheet-body";

/* Print requests, opened from Home's header (issue #332, P1–P4). A native
   modal dialog wearing Home's glass (home.css "Glass sheets") over the
   dimmed line, the way Add request opens beside it. Its filters are its
   own: every open starts from Home's filters exactly as the URL has them,
   and nothing the sheet changes reaches Home or survives the next open.
   Printing changes no status, so there is nothing to confirm or undo.

   The header button stays enabled when nothing can print: the sheet says
   why, and a dimmed header button could not (HIG Feedback).

   The body is mounted fresh on every open (its key is the open count) and
   stays mounted through the exit, so the sheet leaves showing what it
   showed. Its filter bar's popovers portal into the dialog: the body is
   inert behind `showModal()`. */

interface Seed {
  readonly count: number;
  readonly search: string;
  readonly openedAt: string;
}

export function PrintRequestsSheet({
  lines,
  nowMs,
  closedCapped,
  printedBy,
}: Readonly<{
  /** Home's lines as Home builds them; null when the queue read failed. */
  lines: readonly Readonly<HomeLine>[] | null;
  nowMs: number;
  closedCapped: boolean;
  /** The signed-in staff member, for the printed footer. */
  printedBy: string | null;
}>) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState<Seed | null>(null);

  const close = () => {
    dialogRef.current?.close();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-testid="home-print-requests"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(buttonVariants({ variant: "outline" }), "wgi-cmd")}
        onClick={(event) => {
          dialogRef.current?.toggleAttribute("data-instant", event.detail === 0);
          setSeed((current) => ({
            count: (current?.count ?? 0) + 1,
            search: window.location.search,
            openedAt: new Date().toISOString(),
          }));
          dialogRef.current?.showModal();
          setOpen(true);
        }}
      >
        <Printer data-icon="inline-start" />
        Print requests…
      </button>
      <dialog
        ref={dialogRef}
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="print-requests-sheet"
        onPointerDownCapture={(event) => {
          event.currentTarget.toggleAttribute("data-instant", false);
        }}
        onKeyDownCapture={(event) => {
          event.currentTarget.toggleAttribute("data-instant", true);
        }}
        onCancel={(event) => {
          if (event.target !== event.currentTarget) return;
          /* Escape inside an open filter popover closes the popover, not
             the sheet under it. */
          if (event.currentTarget.querySelector('[data-slot="popover-content"][data-open]')) {
            event.preventDefault();
            return;
          }
          event.currentTarget.toggleAttribute("data-instant", true);
        }}
        onClose={(event) => {
          if (event.target !== event.currentTarget) return;
          setOpen(false);
          triggerRef.current?.focus();
        }}
        className="portal-confirm-dialog wgi-glass-sheet wgi-print-sheet"
      >
        <header className="wgi-glass-sheet-header">
          <h2 id={titleId}>Print requests</h2>
          <p>Filters here don&rsquo;t change Home, and printing changes no status.</p>
        </header>
        {seed === null ? null : (
          <PopoverContainer value={dialogRef}>
            <PrintSheetBody
              key={seed.count}
              open={open}
              lines={lines}
              nowMs={nowMs}
              closedCapped={closedCapped}
              search={seed.search}
              printedAt={seed.openedAt}
              printedBy={printedBy}
              onClose={close}
            />
          </PopoverContainer>
        )}
      </dialog>
    </>
  );
}
