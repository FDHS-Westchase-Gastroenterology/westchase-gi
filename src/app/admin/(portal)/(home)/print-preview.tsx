"use client";

import { startTransition, useEffect, useRef, useState } from "react";

import { RequestPrintPage } from "@/app/admin/(portal)/requests/print/request-print-page";
import { readFullRecord } from "@/app/admin/(portal)/requests/record-actions";
import type { FullRecord } from "@/lib/portal/request-record/contracts";

import type { HomeLine } from "./home-line";

/* The Print sheet's preview (issue #332, P1–P3): the highlighted row's
   page exactly as the print route renders it, scaled onto a tinted pane.
   HIG Split views: the highlighted row drives the detail pane. */

type PreviewRead =
  | { readonly kind: "record"; readonly record: FullRecord }
  | { readonly kind: "gone" }
  | { readonly kind: "unavailable" };

/* Arrow keys can cross a dozen rows in a second, and server actions run one
   at a time, so a row is read once the highlight rests on it this long. */
const SETTLE_MS = 90;

/** The highlighted line's record, read once per version for the life of the
    open sheet. A read that lands after the highlight moved on is kept: the
    row is one arrow key away. */
interface PreviewReadState {
  /** Null while the highlighted row's record is being read. */
  readonly read: PreviewRead | null;
  /** Forget a failed read so the row is read again. */
  readonly retry: () => void;
}

export function usePreviewRead(
  line: Readonly<HomeLine> | null,
  enabled: boolean,
): PreviewReadState {
  const id = line?.id ?? null;
  const key = line === null ? null : `${line.id}:${line.version}`;
  const [reads, setReads] = useState<ReadonlyMap<string, PreviewRead>>(() => new Map());
  const inFlight = useRef(new Set<string>());
  const cached = key === null ? false : reads.has(key);

  useEffect(() => {
    if (!enabled || id === null || key === null || cached || inFlight.current.has(key)) {
      return undefined;
    }
    const timer = setTimeout(() => {
      inFlight.current.add(key);
      startTransition(async () => {
        let read: PreviewRead;
        try {
          const record = await readFullRecord(id);
          read = record === null ? { kind: "gone" } : { kind: "record", record };
        } catch {
          read = { kind: "unavailable" };
        }
        inFlight.current.delete(key);
        setReads((current) => new Map(current).set(key, read));
      });
    }, SETTLE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [enabled, id, key, cached]);

  const retry = () => {
    if (key === null) return;
    setReads((current) => {
      const next = new Map(current);
      next.delete(key);
      return next;
    });
  };

  return { read: key === null ? null : (reads.get(key) ?? null), retry };
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the request record carries workflow history entries whose types cannot be made readonly
export function PrintPreview({
  line,
  read,
  page,
  total,
  leftOut,
  printedAt,
  printedBy,
  onRetry,
}: Readonly<{
  line: Readonly<HomeLine> | null;
  read: PreviewRead | null;
  /** The row's page in the packet; a left-out row shows the page it would be. */
  page: number;
  total: number;
  leftOut: boolean;
  printedAt: string;
  printedBy: string | null;
  onRetry: () => void;
}>) {
  if (line === null) {
    return (
      <div className="wgi-print-preview" data-testid="print-preview">
        <p className="wgi-print-preview-empty">Nothing to preview</p>
      </div>
    );
  }
  return (
    <figure
      className="wgi-print-preview"
      data-testid="print-preview"
      data-left-out={leftOut || undefined}
    >
      {/* One sheet for every row: blank while the record is read, and the
          page fades in when it lands (home.css "Print requests sheet"). */}
      <div className="wgi-print-paper" data-state={read?.kind ?? "loading"}>
        {read?.kind === "record" ? (
          <div className="wgi-print-paper-scale" aria-hidden="true">
            <RequestPrintPage
              record={read.record}
              index={page}
              total={total}
              printedAt={printedAt}
              printedBy={printedBy}
            />
          </div>
        ) : null}
        {read?.kind === "unavailable" ? (
          <div className="wgi-print-paper-note" role="status">
            <p>The preview couldn&rsquo;t load.</p>
            <button type="button" className="wgi-empty-clear" onClick={onRetry}>
              Try again
            </button>
          </div>
        ) : null}
        {read?.kind === "gone" ? (
          <div className="wgi-print-paper-note" role="status">
            <p>This request is no longer in the portal. Reload Home for the current line.</p>
          </div>
        ) : null}
      </div>
      <figcaption>
        {leftOut ? "Left out" : `Request ${page} of ${total}`} ·{" "}
        <span data-ui-redact="patient-name">{line.name}</span>
      </figcaption>
    </figure>
  );
}
