"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { presentationStatus } from "@/lib/portal/workflow/contracts";

import { SheetBody, StandsLine } from "./full-record-sheet-body";
import { useSheetResize } from "./full-record-sheet-geometry";
import type { HomeLine } from "./home-line";
import { LineStatusBadge } from "./parts/badge";
import { ChevronGlyph, CloseGlyph } from "./parts/glyphs";
import { HomeSheet, HomeSheetClose, HomeSheetContent, HomeSheetTitle } from "./parts/sheet";
import { CARD_BUTTON, closedByKeyboard } from "./sheet-coexistence";
import { useRecordRead } from "./use-record-read";

/* Full record: a right sheet that runs beside the record card
   (plans/full-record-sheet-decisions.md). The card is the popover that
   detaches into the sheet's companion — it stays anchored to its row and
   stays on top, and its footer is the sheet's toggle. The sheet is the
   undimmed inspector of the selected request: no backdrop, because a
   dimmed page reads as modal and this surface is not one. Staff work the
   phone with both in view: the card records what happened, the sheet
   shows the whole request — contact, the request as submitted, the
   patient's message, staff notes, and the recorded history. It reads its
   record through the request-record server function on open and shows an
   authored skeleton while it waits; the name, status, and phone come from
   the list's line first, so the header is never late, only its facts.
   It slides in from the right edge and leaves the same way, faster (the
   motion is authored in home.css); the content replays its short settle
   when the selection retargets, the cue that the record changed. Focus
   moves into the sheet on open and moves freely between list, card and
   sheet while it is open; on close it returns to the card's toggle while
   that card is still up, otherwise to the originating row's chevron.
   Escape closes the surface holding keyboard focus; with focus in
   neither, it closes the sheet (sheet-coexistence.ts). A keyboard-
   initiated open or close is instant, as everywhere in the portal. A
   left-edge grip drags the panel wider (pointer capture keeps the drag
   alive off the strip; arrow keys do the same without a pointer). The
   sidebar and the open card are the walls: the sheet's left edge stops at
   the nearer of the two. Past the narrow end the sheet gives with rising
   resistance and eases back on release, the way a scroll view says
   "nothing more here". The width staff settle on is kept for the next
   record they open; beside an open card it opens no wider than the room
   that clears the card.

   This file is the composition: the read, the dismissal policy, and the
   header and footer. The sections are in full-record-sheet-body.tsx,
   what they say in full-record-sheet-model.ts, the panel's box in
   full-record-sheet-geometry.ts, and the rules this sheet and the home
   popovers share in sheet-coexistence.ts. */

export function FullRecordSheet({
  line,
  instant,
  onOpenChange,
  onClosed,
}: Readonly<{
  line: Readonly<HomeLine> | null;
  /** The open was keyboard-initiated, so the sheet appears without motion. */
  instant: boolean;
  onOpenChange: (open: boolean) => void;
  /** The exit has completed: the record is no longer being worked on. */
  onClosed: () => void;
}>) {
  /* The line stays rendered while the sheet leaves: the dashboard drops it
     the moment the sheet closes, and Base UI can only play the exit on a
     popup that is still in the tree. `onOpenChangeComplete` lets go of it. */
  const [shown, setShown] = useState(line);
  if (line !== null && line !== shown) setShown(line);
  const [arrived, setArrived] = useState(false);
  const [leavingByKey, setLeavingByKey] = useState(false);
  const { popup, mount, refit, beginResize, resizeByKey } = useSheetResize();

  const shownId = shown?.id ?? null;
  const { outcome, record, retry, release } = useRecordRead(line, shownId);

  /* A retarget (another row's card opened while the sheet was up) keeps
     the popup mounted, so the mount-time fit does not run again: refit
     once the new card has taken its place, a frame later, on the base
     beat that data-fitting gives a programmatic width change. */
  const fittedFor = useRef<string | null>(null);
  useEffect(() => {
    const previous = fittedFor.current;
    fittedFor.current = shownId;
    if (shownId === null || previous === null || previous === shownId) return undefined;
    const frame = requestAnimationFrame(() => {
      refit(popup.current);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [shownId, refit, popup]);

  return (
    <HomeSheet
      open={line !== null}
      modal={false}
      disablePointerDismissal
      onOpenChange={(open, details) => {
        /* Escape heard here is the sheet's own: a popup holding focus takes
           the key on its onKeyDown and stops it there, and the card yields
           document-level Escapes to the sheet while one is mounted
           (sheet-coexistence.ts). */
        if (!open) setLeavingByKey(closedByKeyboard(details));
        onOpenChange(open);
      }}
      onOpenChangeComplete={(open) => {
        setArrived(open);
        if (!open) {
          setLeavingByKey(false);
          setShown(null);
          release();
          onClosed();
        }
      }}
    >
      {shown === null ? null : (
        <HomeSheetContent
          ref={mount}
          /* Focus lands on the sheet itself, which reads its title, not on
             the resize grip that happens to come first in the tab order. */
          initialFocus={popup}
          /* Focus goes back to the card's sheet toggle while that card is
             still open beside the sheet, otherwise to the originating
             row's chevron. Asked at close time, not at render: the
             dashboard has already let go of the sheet by then. */
          finalFocus={() =>
            document.querySelector<HTMLElement>(CARD_BUTTON) ??
            document.querySelector<HTMLElement>(`[data-row="${shown.id}"] .appt-line-trigger`)
          }
          /* The card's toggle closes the sheet without a Base UI change
             details for closedByKeyboard to read, so the dashboard says
             through `instant` whether that close came from the keyboard. */
          instant={(instant && (!arrived || line === null)) || leavingByKey}
        >
          <div className="wgi-sheet-surface">
            <button
              type="button"
              className="wgi-sheet-grip"
              aria-label="Resize the full record panel"
              title="Drag, or press the arrow keys, to resize"
              onPointerDown={beginResize}
              onKeyDown={resizeByKey}
            >
              <span aria-hidden="true" />
            </button>
            {/* Keyed by the record on screen: a retarget remounts the
                content and its settle replays, the cue that the selection
                changed. The grip stays outside — it is the surface's own
                affordance, not the record's. */}
            <div className="wgi-sheet-content" key={shown.id}>
              <header className="wgi-sheet-head">
                <div>
                  <p className="wgi-sheet-kicker">Full record</p>
                  {/* Base UI's Title renders an <h2> itself — no render element,
                      so the heading and its content stay in one JSX node. */}
                  <HomeSheetTitle className="wgi-sheet-name" data-ui-redact="patient-name">
                    {record?.name ?? shown.name}
                  </HomeSheetTitle>
                  <p className="wgi-sheet-meta">
                    <LineStatusBadge
                      status={record === null ? shown.status : presentationStatus(record.state)}
                    />
                  </p>
                  <StandsLine record={record} loading={outcome === null} />
                </div>
                <HomeSheetClose
                  render={
                    <button
                      type="button"
                      className="wgi-sheet-close"
                      aria-label="Close full record"
                    />
                  }
                >
                  <CloseGlyph size={18} />
                </HomeSheetClose>
              </header>
              <div className="wgi-sheet-body">
                <SheetBody line={shown} outcome={outcome} onRetry={retry} />
              </div>
              <Link href={shown.detailHref} className="wgi-sheet-foot">
                Open request page
                <ChevronGlyph size={18} />
              </Link>
            </div>
          </div>
        </HomeSheetContent>
      )}
    </HomeSheet>
  );
}
