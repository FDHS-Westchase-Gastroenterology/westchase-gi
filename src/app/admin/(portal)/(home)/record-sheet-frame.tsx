"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { isMailbox } from "@/lib/portal/contracts";

import { useSheetResize } from "./full-record-sheet-geometry";
import { CloseGlyph, PhoneGlyph } from "./parts/glyphs";
import { HomeSheet, HomeSheetClose, HomeSheetContent, HomeSheetTitle } from "./parts/sheet";
import { closedByKeyboard, sheetStaysOpen } from "./sheet-coexistence";

/* The record sheet's frame, shared by Home's full record and the
   Schedule's patient and request records (issue #356): the right sheet,
   undimmed and non-modal, with its resize grip, its dismissal policy, the
   keyboard rule that an open or close from the keyboard is instant, and
   the refit when the record on screen changes. What a record says sits
   inside it; full-record-sheet.tsx tells the story of the surface. */

export function RecordSheetFrame({
  open,
  contentKey,
  instant,
  onOpenChange,
  onExited,
  finalFocus,
  children,
}: Readonly<{
  open: boolean;
  /** The record on screen, kept while the sheet leaves; null renders nothing. */
  contentKey: string | null;
  /** The open was keyboard-initiated, so the sheet appears without motion. */
  instant: boolean;
  onOpenChange: (open: boolean) => void;
  /** The exit has completed. */
  onExited: () => void;
  /** Where focus goes on close, asked at close time. */
  finalFocus: () => HTMLElement | null;
  children: ReactNode;
}>) {
  const [arrived, setArrived] = useState(false);
  const [leavingByKey, setLeavingByKey] = useState(false);
  const { popup, mount, refit, beginResize, resizeByKey } = useSheetResize();

  /* A retarget (another record opened while the sheet was up) keeps the
     popup mounted, so the mount-time fit does not run again: refit once
     the new record has taken its place, a frame later, on the base beat
     that data-fitting gives a programmatic width change. */
  const fittedFor = useRef<string | null>(null);
  useEffect(() => {
    const previous = fittedFor.current;
    fittedFor.current = contentKey;
    if (contentKey === null || previous === null || previous === contentKey) return undefined;
    const frame = requestAnimationFrame(() => {
      refit(popup.current);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [contentKey, refit, popup]);

  return (
    <HomeSheet
      open={open}
      modal={false}
      disablePointerDismissal
      onOpenChange={(next, details) => {
        /* Escape heard here is the sheet's own: a popup holding focus takes
           the key on its onKeyDown and stops it there, and the card yields
           document-level Escapes to the sheet while one is mounted
           (sheet-coexistence.ts). A history popover beside the sheet takes
           the Escape first. */
        if (!next && sheetStaysOpen(details)) return;
        if (!next) setLeavingByKey(closedByKeyboard(details));
        onOpenChange(next);
      }}
      onOpenChangeComplete={(next) => {
        setArrived(next);
        if (!next) {
          setLeavingByKey(false);
          onExited();
        }
      }}
    >
      {contentKey === null ? null : (
        <HomeSheetContent
          ref={mount}
          /* Focus lands on the sheet itself, which reads its title, not on
             the resize grip that happens to come first in the tab order. */
          initialFocus={popup}
          finalFocus={finalFocus}
          /* A close from outside the sheet (the card's toggle, the address)
             carries no Base UI change details for closedByKeyboard to read,
             so the owner says through `instant` whether it was the keyboard. */
          instant={(instant && (!arrived || !open)) || leavingByKey}
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
            <div className="wgi-sheet-content" key={contentKey}>
              {children}
            </div>
          </div>
        </HomeSheetContent>
      )}
    </HomeSheet>
  );
}

/* The header's first line: the name and the close. Base UI's Title renders
   an <h2> itself, and the sheet is named by it: the patient, and, for a
   screen reader, what this surface is. */
export function SheetTitleRow({ name }: Readonly<{ name: string }>) {
  return (
    <>
      <HomeSheetTitle className="wgi-sheet-name">
        <span className="sr-only">Full record: </span>
        <span data-ui-redact="patient-name">{name}</span>
      </HomeSheetTitle>
      <HomeSheetClose
        render={<button type="button" className="wgi-sheet-close" aria-label="Close full record" />}
      >
        <CloseGlyph size={16} />
      </HomeSheetClose>
    </>
  );
}

/* The phone as the card's call chip, then the email. `email` is undefined
   until it is known: while `loading`, a placeholder holds its place;
   after a read that failed, nothing does. */
export function SheetContactRow({
  tel,
  phoneDisplay,
  email,
  loading = false,
}: Readonly<{
  tel: string | null;
  phoneDisplay: string;
  email: string | null | undefined;
  loading?: boolean;
}>) {
  const mailbox = email?.trim() ?? "";
  const safeMailbox = mailbox !== "" && isMailbox(mailbox) ? mailbox : null;
  return (
    <div className="wgi-sheet-contact">
      {tel === null ? (
        <span className="wgi-sheet-empty">No phone on file</span>
      ) : (
        <a href={tel} className="wgi-record-call wgi-sheet-call" data-ui-redact="patient-contact">
          <PhoneGlyph size={15} />
          {phoneDisplay}
        </a>
      )}
      {email === undefined ? (
        loading ? (
          <span className="wgi-sheet-placeholder" aria-hidden="true" />
        ) : null
      ) : safeMailbox === null ? (
        <span className="wgi-sheet-empty">No email provided</span>
      ) : (
        <a
          href={`mailto:${safeMailbox}`}
          className="wgi-sheet-email"
          data-ui-redact="patient-contact"
        >
          {safeMailbox}
        </a>
      )}
    </div>
  );
}
