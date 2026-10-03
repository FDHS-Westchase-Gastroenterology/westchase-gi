"use client";

import { useMemo, useState } from "react";

import { attemptsLabel, recordSections } from "@/app/admin/(portal)/requests/record-sections";
import type { RecordSections } from "@/app/admin/(portal)/requests/record-sections";
import type { FullRecord } from "@/lib/portal/request-record/contracts";
import { presentationStatus } from "@/lib/portal/workflow/contracts";

import { SheetBody } from "./full-record-sheet-body";
import { prefersText } from "./home-line";
import type { HomeLine } from "./home-line";
import { LineStatusBadge } from "./parts/badge";
import { phoneParts, RecordSheetFrame, SheetContactRow, SheetTitleRow } from "./record-sheet-frame";
import { CARD_BUTTON } from "./sheet-coexistence";
import { useRecordRead } from "./use-record-read";

/* Full record: a right sheet that runs beside the record card
   (plans/full-record-sheet-decisions.md). The card is the popover that
   detaches into the sheet's companion — it stays anchored to its row and
   stays on top, and its footer is the sheet's toggle. The sheet is the
   undimmed inspector of the selected request: no backdrop, because a
   dimmed page reads as modal and this surface is not one. Staff work the
   phone with both in view: the card records what happened, the sheet
   shows the whole request (Figma Ypf9ohpRcGWF5C9T9bSvWW, section 04) — a
   pinned header with who, where the request stands, how to reach them,
   and below it the patient's message, the latest note, the history, and
   the request as submitted. It reads its
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

   This file is the composition: the read and the header. The frame, its
   dismissal policy and its grip are in record-sheet-frame.tsx, shared
   with the Schedule's records (issue #356). The sections are in full-record-sheet-body.tsx,
   what they say in requests/record-sections.ts, the panel's box in
   full-record-sheet-geometry.ts, and the rules this sheet and the home
   popovers share in sheet-coexistence.ts. */

function Attempts({ count }: Readonly<{ count: number }>) {
  const label = attemptsLabel(count);
  return label === null ? null : <span className="wgi-sheet-attempts">· {label}</span>;
}

type RequestSheetHeadProps = Readonly<{
  line: Readonly<HomeLine>;
  record: FullRecord | null;
  sections: RecordSections | null;
  loading: boolean;
  /** Home's sheet says the preference under the queue line; the Schedule's
      request record says it where the appointment would be. */
  pref?: boolean;
}>;

/* A request's pinned header: the name and the close, then the card's
   queue line at the sheet's size (the badge, when it is due, and how many
   calls it has taken so far), the preference, and the phone chip beside
   the email. The name, status and phone are the list's line until the
   record arrives, so a slow or failed read never hides them; the email
   waits for the record, a placeholder while it loads. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the request record carries workflow history entries whose types cannot be made readonly
export function RequestSheetHead({
  line,
  record,
  sections,
  loading,
  pref = true,
}: RequestSheetHeadProps) {
  const phone =
    record === null ? { tel: line.tel, phoneDisplay: line.phoneDisplay } : phoneParts(record.phone);
  return (
    <header className="wgi-sheet-head">
      <SheetTitleRow name={record?.name ?? line.name} />
      <p className="wgi-record-queue wgi-sheet-queue">
        <LineStatusBadge
          status={record === null ? line.status : presentationStatus(record.state)}
          className="wgi-record-badge"
        />
        <span data-overdue={line.stamp === null ? undefined : true}>{line.timing}</span>
        {sections === null ? null : <Attempts count={sections.attempts} />}
      </p>
      {pref ? <p className="wgi-sheet-pref">{prefersText(line.pref)}</p> : null}
      <SheetContactRow
        tel={phone.tel}
        phoneDisplay={phone.phoneDisplay}
        email={record === null ? undefined : record.email}
        loading={loading}
      />
    </header>
  );
}

export function FullRecordSheet({
  line,
  instant,
  onOpenChange,
  onClosed,
  returnFocus,
}: Readonly<{
  line: Readonly<HomeLine> | null;
  /** The open was keyboard-initiated, so the sheet appears without motion. */
  instant: boolean;
  onOpenChange: (open: boolean) => void;
  /** The exit has completed: the record is no longer being worked on. */
  onClosed: () => void;
  /** Where focus goes on close when the sheet opened from somewhere other
      than a Home row: the schedule's appointment cell. */
  returnFocus?: () => HTMLElement | null;
}>) {
  /* The line stays rendered while the sheet leaves: the dashboard drops it
     the moment the sheet closes, and Base UI can only play the exit on a
     popup that is still in the tree. The frame's exit lets go of it. */
  const [shown, setShown] = useState(line);
  if (line !== null && line !== shown) setShown(line);

  const shownId = shown?.id ?? null;
  const { outcome, record, retry, release } = useRecordRead(line, shownId);
  const sections = useMemo(() => (record === null ? null : recordSections(record)), [record]);

  return (
    <RecordSheetFrame
      open={line !== null}
      contentKey={shownId}
      instant={instant}
      onOpenChange={onOpenChange}
      onExited={() => {
        setShown(null);
        release();
        onClosed();
      }}
      /* Focus goes back to the card's sheet toggle while that card is
         still open beside the sheet, otherwise to the originating row's
         chevron. Asked at close time, not at render: the dashboard has
         already let go of the sheet by then. */
      finalFocus={() =>
        returnFocus?.() ??
        document.querySelector<HTMLElement>(CARD_BUTTON) ??
        document.querySelector<HTMLElement>(`[data-row="${shownId ?? ""}"] .appt-line-trigger`)
      }
    >
      {shown === null ? null : (
        <>
          <RequestSheetHead
            line={shown}
            record={record}
            sections={sections}
            loading={outcome === null}
          />
          <SheetBody outcome={outcome} sections={sections} onRetry={retry} />
        </>
      )}
    </RecordSheetFrame>
  );
}
