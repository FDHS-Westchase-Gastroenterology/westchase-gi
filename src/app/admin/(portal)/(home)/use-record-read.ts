import { startTransition, useEffect, useState } from "react";

import { readFullRecord } from "@/app/admin/(portal)/requests/record-actions";
import type { FullRecord } from "@/lib/portal/request-record/contracts";

import type { ReadOutcome, ReadState } from "./full-record-sheet-model";
import type { HomeLine } from "./home-line";

/* The sheet's read of one record: when it happens, what it produced, and how
   staff ask again. It sits apart from the sheet because its lifecycle is its
   own — it follows the list's line and that line's version, not the sheet's
   open state, so a save on the card refreshes the sheet beside it. */

interface RecordRead {
  /** The read of the record on screen, or null while it is in flight, failed
      to arrive, or belongs to a record the sheet has since left. */
  readonly outcome: ReadOutcome | null;
  /** The record itself, when the read produced one. */
  readonly record: FullRecord | null;
  /** Ask again, which is what Retry does after a read that failed. */
  readonly retry: () => void;
  /** Let go of the read. The sheet calls this once it has finished leaving,
      not the moment it is asked to close: while it exits it still shows the
      record it opened with. */
  readonly release: () => void;
}

export function useRecordRead(line: Readonly<HomeLine> | null, shownId: string | null): RecordRead {
  const id = line?.id ?? null;
  const version = line?.version ?? null;
  const [read, setRead] = useState<ReadState | null>(null);
  const [attempt, setAttempt] = useState(0);

  /* The record is read on open, again when the list's line for it changes
     version (the card saved) or Retry is pressed, and once more on the next
     open. A read that lands after the sheet moved on is dropped. */
  useEffect(() => {
    if (id === null || version === null) return undefined;
    let live = true;
    startTransition(async () => {
      try {
        // react-doctor-disable-next-line react-doctor/async-defer-await -- the guard below is the staleness check, not a hoistable precondition: `live` is falsified only by this effect's cleanup, which runs while the read is in flight
        const record = await readFullRecord(id);
        if (!live) return;
        setRead({ id, outcome: record === null ? { kind: "gone" } : { kind: "record", record } });
      } catch {
        if (live) setRead({ id, outcome: { kind: "unavailable" } });
      }
    });
    return () => {
      live = false;
    };
  }, [id, version, attempt]);

  /* A read is the sheet's only while it is a read of the record on screen:
     the sheet keeps the line it was opened with through its exit, and a read
     that lands for a record already left is not shown. */
  const outcome = read?.id === shownId ? read.outcome : null;
  const record = outcome?.kind === "record" ? outcome.record : null;

  function retry(): void {
    setRead(null);
    setAttempt((count) => count + 1);
  }

  function release(): void {
    setRead(null);
  }

  return { outcome, record, retry, release };
}
