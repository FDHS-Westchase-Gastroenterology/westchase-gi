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
import { CARD_BUTTON, closedByKeyboard, focusWithin, OPEN_CARD } from "./sheet-coexistence";
import { useRecordRead } from "./use-record-read";

/* Full record: a right sheet that runs non-modal beside the record card
   (plans/full-record-sheet-decisions.md, Phase 0). Staff work the phone
   with both in view: the card records what happened, the sheet shows the
   whole request — contact, the request as submitted, the patient's
   message, staff notes, and the recorded history. It reads its record
   through the request-record server function on open and shows an
   authored skeleton while it waits; the name, status, and phone come from
   the list's line first, so the header is never late, only its facts.
   Focus moves freely between list, card, and sheet; Escape closes the
   surface that holds focus, and with focus in neither, the sheet.
   The sheet scales in from the card's "Open full record" button and
   leaves toward the same point (the origin is measured in
   full-record-sheet-geometry.ts and the motion is authored in home.css);
   a keyboard-initiated open or close is instant, as everywhere in the
   portal. A left-edge grip drags the panel wider (pointer capture keeps
   the drag alive off the strip; arrow keys do the same without a
   pointer). The sidebar is the wall: the sheet's left edge stops where
   the sidebar ends and never passes under it. Past the narrow end the
   sheet gives with rising resistance and springs back on release, the
   way a scroll view says "nothing more here". The width staff settle on
   is kept for the next record they open; beside an open card it opens no
   wider than the room that clears the card.

   This file is the composition: the read, the dismissal policy, and the
   header and footer. The sections are in full-record-sheet-body.tsx,
   what they say in full-record-sheet-model.ts, the panel's box in
   full-record-sheet-geometry.ts, and the rules this sheet and the record
   card share in sheet-coexistence.ts. */

export function FullRecordSheet({
  line,
  instant,
  onOpenChange,
}: Readonly<{
  line: Readonly<HomeLine> | null;
  /** The open was keyboard-initiated, so the sheet appears without motion. */
  instant: boolean;
  onOpenChange: (open: boolean) => void;
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
     the popup mounted, so the mount-time fit does not run again: fit and
     aim once the new card has taken its place, a frame later. */
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
        /* Escape closes the surface that holds focus (Phase 0): with focus
           in the card, the card takes the key and the sheet stays. */
        if (!open && details.reason === "escape-key" && focusWithin(OPEN_CARD)) {
          details.cancel();
          return;
        }
        if (!open) setLeavingByKey(closedByKeyboard(details));
        onOpenChange(open);
      }}
      onOpenChangeComplete={(open) => {
        setArrived(open);
        if (!open) {
          setLeavingByKey(false);
          setShown(null);
          release();
        }
      }}
    >
      {shown === null ? null : (
        <HomeSheetContent
          ref={mount}
          /* Focus lands on the sheet itself, which reads its title, not on
             the resize grip that happens to come first in the tab order. */
          initialFocus={popup}
          /* Focus goes back to the card's "Open full record" button while
             that card is still open beside the sheet, otherwise to the
             patient's line. The card is asked at close time, not at
             render: the dashboard has already let go of the sheet by then. */
          finalFocus={() =>
            document.querySelector<HTMLElement>(CARD_BUTTON) ??
            document.querySelector<HTMLElement>(`[data-row="${shown.id}"] .appt-line-trigger`)
          }
          instant={(instant && !arrived) || leavingByKey}
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
              <ChevronGlyph size={14} />
            </Link>
          </div>
        </HomeSheetContent>
      )}
    </HomeSheet>
  );
}
