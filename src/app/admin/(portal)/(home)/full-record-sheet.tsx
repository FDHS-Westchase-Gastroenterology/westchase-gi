"use client";

import { cn } from "cn";
import { useCallback, useEffect, useState } from "react";

import { FullRecordBody, FullRecordHead } from "./full-record-view";
import type { HomeLine } from "./home-line";
import { HomeSheet, HomeSheetContent } from "./parts/sheet";
import type { HomeSheetChangeDetails } from "./parts/sheet";
import { readFullRecord } from "./record-sheet-data";
import type { FullRecord } from "./record-sheet-data";
import { useSheetResize } from "./use-sheet-resize";

// Keyboard activation can arrive as a click with detail 0.
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Base UI event details carry platform event types that cannot be made readonly
function closedByKeyboard(details: HomeSheetChangeDetails): boolean {
  if (details.reason === "escape-key") return true;
  if (details.reason !== "close-press") return false;
  const { event } = details;
  return event instanceof KeyboardEvent || (event instanceof MouseEvent && event.detail === 0);
}

/* One record read, keyed by the request it belongs to, so a re-read after a
   save can replace it without the sheet ever blanking. A record that does
   not match the line on screen is simply not shown; nothing has to be
   cleared on the way in or out. */
interface Loaded {
  readonly id: string;
  readonly record: FullRecord | null;
  readonly problem: "missing" | "failed" | null;
}

function useFullRecord(id: string | null) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  // A save inside the sheet moves server truth the sheet is holding a copy
  // Of; bumping this is how the sheet asks for the new one.
  const [reads, setReads] = useState(0);

  useEffect(() => {
    if (id === null) return undefined;
    let live = true;
    void readFullRecord(id)
      .then((record) => {
        if (live) setLoaded({ id, record, problem: record === null ? "missing" : null });
      })
      .catch(() => {
        if (live) setLoaded({ id, record: null, problem: "failed" });
      });
    return () => {
      live = false;
    };
  }, [id, reads]);

  const current = loaded?.id === id ? loaded : null;
  return {
    record: current?.record ?? null,
    problem: current?.problem ?? null,
    reread: useCallback(() => {
      setReads((count) => count + 1);
    }, []),
  };
}

/* The sheet itself: what opens it, what closes it, where focus goes, and the
   drag that sizes it. The record it frames lives in `full-record-view.tsx`. */
export function FullRecordSheet({
  line,
  instant,
  onOpenChange,
  onSettled,
}: Readonly<{
  line: Readonly<HomeLine> | null;
  /** The open was keyboard-initiated, so the sheet appears without motion. */
  instant: boolean;
  onOpenChange: (open: boolean) => void;
  /** The request finished inside the sheet: Home tints the row it came from. */
  onSettled: (id: string) => void;
}>) {
  // Keep the record mounted until Base UI finishes its exit.
  const [shown, setShown] = useState(line);
  if (line !== null && line !== shown) setShown(line);
  const [arrived, setArrived] = useState(false);
  const [leavingByKey, setLeavingByKey] = useState(false);
  const resize = useSheetResize();
  const { record, problem, reread } = useFullRecord(line?.id ?? null);

  return (
    <HomeSheet
      open={line !== null}
      onOpenChange={(open, details) => {
        if (!open) setLeavingByKey(closedByKeyboard(details));
        onOpenChange(open);
      }}
      onOpenChangeComplete={(open) => {
        setArrived(open);
        if (!open) {
          setLeavingByKey(false);
          setShown(null);
        }
      }}
    >
      {shown === null ? null : (
        <HomeSheetContent
          ref={resize.mount}
          /* Focus the title-bearing sheet instead of the resize grip. */
          initialFocus={resize.popup}
          /* The opening card has closed; return focus to its patient row. */
          finalFocus={() =>
            document.querySelector<HTMLElement>(`[data-row="${shown.id}"] .appt-line-trigger`)
          }
          instant={(instant && !arrived) || leavingByKey}
        >
          {/* The print marker rides the whole surface, and only once the
              record is here: globals.css keys the appointment-request packet
              off it, so an empty sheet can never print an empty packet. */}
          <div className={cn("wgi-sheet-surface", record !== null && "request-detail-print")}>
            <button
              type="button"
              className="wgi-sheet-grip print-hide"
              aria-label="Resize the full record panel"
              title="Drag, or press the arrow keys, to resize"
              onPointerDown={resize.beginResize}
              onKeyDown={resize.resizeByKey}
            >
              <span aria-hidden="true" />
            </button>
            <div className="hidden border-b-2 border-black pb-3 print:block">
              <p className="text-[15pt] font-bold">Westchase Gastroenterology</p>
              <p className="mt-1 text-[9pt] font-bold tracking-[0.08em] uppercase">
                Appointment request
              </p>
            </div>
            <FullRecordHead line={shown} record={record} />
            <FullRecordBody
              line={shown}
              record={record}
              problem={problem}
              onReread={reread}
              onSettled={() => {
                onSettled(shown.id);
                onOpenChange(false);
              }}
            />
          </div>
        </HomeSheetContent>
      )}
    </HomeSheet>
  );
}
