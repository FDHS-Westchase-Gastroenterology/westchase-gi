"use client";

import { useLayoutEffect, useRef, useState } from "react";

import {
  formatReceived,
  LOCATION_LABELS,
  localeLabel,
  TIME_LABELS,
} from "@/app/admin/(portal)/requests/format";
import { Button } from "@/components/ui/button";
import type { FullRecord } from "@/lib/portal/request-record/contracts";

import { RecordHistory } from "./full-record-history";
import { detailsSummary, originLabel } from "./full-record-sheet-model";
import type { LatestNote, ReadOutcome, RecordSections } from "./full-record-sheet-model";
import { HomeCollapsible, HomeCollapsiblePanel, HomeCollapsibleTrigger } from "./parts/collapsible";
import { ChevronGlyph } from "./parts/glyphs";

/* The sheet's record content, below the pinned header (Figma
   Ypf9ohpRcGWF5C9T9bSvWW, section 04): the patient's message, the latest
   staff note, the history, and the request as submitted behind a
   disclosure — and the three states it shows while the record is not on
   screen. Sections are spaced, not ruled. Geometry and paint live in
   home.css under `.wgi-sheet*`, `.wgi-history*` and `.wgi-disclosure*`.

   One scroll region at a time (HIG Scroll views: no nested scroll views
   on one axis). The history takes the height the other sections leave
   and scrolls inside it; opening the details shrinks it, and the header
   never moves. When what is left would show fewer than about three rows,
   the history lets go of its own scroll — `data-released` on the body —
   and the whole tab scrolls instead. */

/* The rule reads the history's CSS min-height, so the threshold has one
   home. The same arithmetic holds in both modes — the room the history
   would have is the body's height less everything else in it — so the
   mode never flips back and forth at the threshold. */
function useReleasedHistory() {
  const body = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = body.current;
    const history = element?.querySelector<HTMLElement>(".wgi-history") ?? null;
    if (element === null || history === null) return undefined;
    const measure = () => {
      const others = element.scrollHeight - history.offsetHeight;
      const room = element.clientHeight - others;
      const least = Number.parseFloat(getComputedStyle(history).minHeight) || 0;
      element.toggleAttribute("data-released", room < least);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    for (const child of element.children) observer.observe(child);
    measure();
    return () => {
      observer.disconnect();
    };
  }, []);
  return body;
}

/* The patient's message under its quote rule, two lines until asked;
   "Show all" appears only when the clamp actually hides something. */
function PatientMessage({ message }: Readonly<{ message: string }>) {
  const [open, setOpen] = useState(false);
  const [clipped, setClipped] = useState(false);
  const text = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    const element = text.current;
    if (element === null || open) return undefined;
    const measure = () => {
      setClipped(element.scrollHeight > element.clientHeight + 1);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => {
      observer.disconnect();
    };
  }, [open]);

  return (
    <section className="wgi-sheet-section" aria-labelledby="wgi-sheet-message-label">
      <h3 id="wgi-sheet-message-label" className="wgi-sheet-label">
        Patient&rsquo;s message
      </h3>
      {message === "" ? (
        <p className="wgi-sheet-empty">No note was included with this request.</p>
      ) : (
        <blockquote className="wgi-sheet-message">
          <p
            ref={text}
            id="wgi-sheet-message-text"
            data-open={open || undefined}
            data-ui-redact="patient-message"
          >
            {message}
          </p>
          {clipped || open ? (
            <button
              type="button"
              className="wgi-sheet-more"
              aria-expanded={open}
              aria-controls="wgi-sheet-message-text"
              onClick={() => {
                setOpen(!open);
              }}
            >
              {open ? "Show less" : "Show all"}
            </button>
          ) : null}
        </blockquote>
      )}
    </section>
  );
}

function LatestNoteBlock({ note }: Readonly<{ note: LatestNote }>) {
  return (
    <section className="wgi-sheet-section" aria-labelledby="wgi-sheet-note-label">
      <h3 id="wgi-sheet-note-label" className="wgi-sheet-label">
        Latest note
      </h3>
      <figure className="wgi-sheet-note">
        <p data-ui-redact="staff-note">{note.text}</p>
        <figcaption>{note.byline}</figcaption>
      </figure>
    </section>
  );
}

/* The request as submitted: last in the tab and closed by default, its
   one-line summary standing in for it (HIG Disclosure controls: the
   chevron points at the content it hides, and turns down when open). */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the request record carries workflow history entries whose types cannot be made readonly
function RequestDetails({ record }: Readonly<{ record: FullRecord }>) {
  return (
    <HomeCollapsible className="wgi-sheet-section">
      <HomeCollapsibleTrigger>
        <span className="wgi-disclosure-chevron">
          <ChevronGlyph size={16} />
        </span>
        <span className="wgi-sheet-label">Request details</span>
        <span className="wgi-disclosure-summary">{detailsSummary(record)}</span>
      </HomeCollapsibleTrigger>
      <HomeCollapsiblePanel>
        <dl className="wgi-sheet-dl">
          <dt>Office</dt>
          <dd>{LOCATION_LABELS[record.location]}</dd>
          <dt>Time of day</dt>
          <dd>{TIME_LABELS[record.preferredTime]}</dd>
          <dt>Received</dt>
          <dd>{formatReceived(record.createdAt, true)}</dd>
          <dt>Origin</dt>
          <dd>{originLabel(record)}</dd>
          <dt>Form language</dt>
          <dd>{localeLabel(record.locale)}</dd>
          <dt>Page</dt>
          <dd>{record.sourcePath}</dd>
        </dl>
      </HomeCollapsiblePanel>
    </HomeCollapsible>
  );
}

type RecordBodyProps = Readonly<{ record: FullRecord; sections: RecordSections }>;

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the request record carries workflow history entries whose types cannot be made readonly
function RecordBody({ record, sections }: RecordBodyProps) {
  const body = useReleasedHistory();
  const message = record.message !== null ? record.message.trim() : "";
  return (
    <div ref={body} className="wgi-sheet-body">
      <PatientMessage message={message} />
      {sections.latestNote === null ? null : <LatestNoteBlock note={sections.latestNote} />}
      <RecordHistory days={sections.days} rowCount={sections.rowCount} />
      <RequestDetails record={record} />
    </div>
  );
}

type SheetBodyProps = Readonly<{
  /** Null while the read is in flight. */
  outcome: ReadOutcome | null;
  /** The record's sections, once it has loaded. */
  sections: RecordSections | null;
  onRetry: () => void;
}>;

/* The body in its four states. The header above already carries what the
   list knows — the name, the status, the phone — so a slow or failed read
   never hides the number. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the request record carries workflow history entries whose types cannot be made readonly
export function SheetBody({ outcome, sections, onRetry }: SheetBodyProps) {
  if (outcome === null) {
    return (
      <div className="wgi-sheet-body">
        <div className="wgi-sheet-skeleton" role="status">
          <span className="sr-only">Loading the full record</span>
          <i data-stands-for="section-title" />
          <i data-stands-for="detail-row" />
          <i data-stands-for="detail-value" />
          <i data-stands-for="section-title" />
          <i data-stands-for="detail-row" />
          <i data-stands-for="detail-row" />
          <i data-stands-for="section-title" />
          <i data-stands-for="detail-row" />
        </div>
      </div>
    );
  }
  if (outcome.kind === "gone") {
    return (
      <div className="wgi-sheet-body">
        <div className="wgi-sheet-state" role="status">
          <p className="wgi-sheet-state-title">This request no longer exists.</p>
          <p className="wgi-sheet-state-note">
            It may have been removed since the list was loaded.
          </p>
        </div>
      </div>
    );
  }
  if (outcome.kind === "unavailable" || sections === null) {
    return (
      <div className="wgi-sheet-body">
        <div className="wgi-sheet-state" role="alert">
          <p className="wgi-sheet-state-title">The full record could not be loaded.</p>
          <p className="wgi-sheet-state-note">
            The header shows what the list knows. Try again in a moment.
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
            Try again
          </Button>
        </div>
      </div>
    );
  }
  return <RecordBody record={outcome.record} sections={sections} />;
}
