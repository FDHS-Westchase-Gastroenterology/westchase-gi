"use client";

import { RequestContactDetails } from "@/app/admin/(portal)/requests/[id]/request-contact-details";
import { useRequestPrint } from "@/app/admin/(portal)/requests/[id]/request-current-feedback";
import { RequestHistorySection } from "@/app/admin/(portal)/requests/[id]/request-history-list";
import { RequestNotes } from "@/app/admin/(portal)/requests/[id]/request-notes";
import { WorkflowPanel } from "@/app/admin/(portal)/requests/[id]/workflow-panel";
import type { RequestDetailRow } from "@/app/admin/(portal)/requests/queue";
import { Printer } from "@/components/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_WORDS } from "@/lib/portal/filters";
import type { AttentionBucket } from "@/lib/portal/queue-attention";

import type { HomeLine } from "./home-line";
import { CloseGlyph, PhoneGlyph } from "./parts/glyphs";
import { HomeSheetClose, HomeSheetTitle } from "./parts/sheet";
import type { FullRecord } from "./record-sheet-data";

/* The record as this file reads it: one server read, immutable all the way
   down, because nothing on this side of the boundary may write to it. */
type RecordView = Readonly<Omit<FullRecord, "row">> & { readonly row: Readonly<RequestDetailRow> };

/* What the full-record sheet frames, apart from the sheet that frames it.
   The sheet owns opening, closing, focus and the resize gesture; everything
   below owns the record — its masthead, the three states a read can be in,
   and the one column of work staff do to it. Splitting there keeps each half
   readable on its own, and means the record can be looked at without reading
   a line of gesture physics. */

const DOT_COLOR = {
  new: "var(--color-amber-deep)",
  contacted: "var(--color-teal)",
  scheduled: "var(--color-navy)",
  closed: "var(--color-line-3)",
} as const;

/** Buckets whose next action is due now, so the sheet leads with it. */
const ATTENTION_NOW: readonly AttentionBucket[] = ["new", "follow_up", "stale"];

/* Filled while the request is asking for something today, hollow once it is
   not: the same two-weight dot Home uses in its rows, so a status reads the
   same way in the list and in the record. */
function StatusDot({
  status,
  attention,
}: Readonly<{ status: HomeLine["status"]; attention: boolean }>) {
  const ink = DOT_COLOR[status];
  return (
    <span
      aria-hidden="true"
      className="wgi-sheet-dot"
      style={
        attention
          ? { background: ink }
          : { background: "transparent", boxShadow: `inset 0 0 0 1.5px ${ink}` }
      }
    />
  );
}

/* The head's print control. The packet it produces is the same one the
   request page prints — globals.css authors it once, off `.request-detail-print`
   — so the sheet is not a second, thinner version of the handoff. */
function SheetPrint({ patientName, ready }: Readonly<{ patientName: string; ready: boolean }>) {
  const { locked, print } = useRequestPrint(patientName);
  return (
    <button
      type="button"
      className="wgi-sheet-print print-hide"
      data-testid="sheet-print-request"
      aria-label="Print this request"
      title="Print this request"
      disabled={!ready}
      aria-disabled={locked || undefined}
      onClick={print}
    >
      <Printer className="h-[1.05rem] w-[1.05rem]" />
    </button>
  );
}

/* What stands in for the record while it travels. The bars are the shape of
   what is coming — a contact card, the outcome panel, the ledger — so the
   sheet does not change size under the reader when it lands. They breathe on
   Home's own loading temperament (.wgi-loading-head), because a surface
   should have one way of saying "not yet", not two. */
function RecordPlaceholder() {
  return (
    <>
      <p role="status" className="sr-only">
        Loading the full record.
      </p>
      <div className="wgi-sheet-loading" data-testid="sheet-record-loading" aria-hidden="true">
        <Skeleton className="wgi-sheet-skeleton h-[8rem]" />
        <Skeleton className="wgi-sheet-skeleton h-[13rem]" />
        <Skeleton className="wgi-sheet-skeleton h-[6rem]" />
      </div>
    </>
  );
}

/* A read that did not arrive. Neither case is a save, so neither is a toast:
   the sheet is empty and has to say why in the space the record would have
   filled. */
function RecordProblem({ problem, onRetry }: Readonly<{ problem: string; onRetry: () => void }>) {
  return (
    <p role="alert" className="wgi-sheet-problem" data-testid="sheet-record-problem">
      {problem === "missing"
        ? "This request is no longer in the system — someone may have removed it. Close the record and refresh Home."
        : "The full record could not be loaded. The request itself is fine; the read failed."}
      {problem === "failed" ? (
        <button type="button" className="wgi-sheet-retry" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </p>
  );
}

/* Everything the request page held, in one column: who they are, what
   happened, what staff wrote down, what the record already says. The order is
   the order of the call — read the person, record the outcome, add the note,
   check the ledger — and the sections are the request page's own components,
   so the two surfaces cannot drift apart. */
function RecordColumn({
  record,
  patientName,
  onSaved,
  onSettled,
}: Readonly<{
  record: RecordView;
  patientName: string;
  onSaved: () => void;
  onSettled: () => void;
}>) {
  return (
    <>
      <RequestContactDetails row={record.row} staffCreated={record.staffCreated} />

      {/* The same shell the request page gives the panel, so the outcome
          controls keep their padding, their rail and their rhythm on both
          surfaces. */}
      <aside className="portal-workflow-shell" aria-label="Record request outcome">
        <WorkflowPanel
          requestId={record.row.id}
          truth={record.truth}
          patientName={patientName}
          onSaved={onSaved}
          onSettled={onSettled}
        />
      </aside>

      <RequestNotes
        requestId={record.row.id}
        patientName={patientName}
        notes={record.notes}
        onSaved={onSaved}
      />

      <RequestHistorySection lines={record.history} />
    </>
  );
}

/* The masthead. It reads off the Home line, not the record, so the name and
   the status are on screen the instant the sheet opens; the two facts that
   need the read — the legacy review tag and how the request ended — appear
   when it lands. */
export function FullRecordHead({
  line,
  record,
}: Readonly<{ line: Readonly<HomeLine>; record: RecordView | null }>) {
  return (
    <header className="wgi-sheet-head">
      <div>
        <p className="wgi-sheet-kicker print-hide">Full record</p>

        <HomeSheetTitle className="wgi-sheet-name" data-ui-redact="patient-name">
          {line.name}
        </HomeSheetTitle>
        <p className="wgi-sheet-meta">
          <span className="wgi-sheet-status">
            <StatusDot status={line.status} attention={ATTENTION_NOW.includes(line.bucket)} />
            {STATUS_WORDS[line.status]}
          </span>
          <span aria-hidden="true">·</span>
          <span>{line.pref}</span>
          {record?.truth.legacyReviewRequired === true ? (
            <span data-testid="legacy-review-tag" className="portal-review-tag">
              Needs review
            </span>
          ) : null}
        </p>
        {/* How it ended, in the request page's own words. Only a finished
            request has one, which is why it is not part of the meta line. */}
        {record === null || record.lifecycle === null ? null : (
          <p className="wgi-sheet-lifecycle" data-testid="request-lifecycle-summary">
            {record.lifecycle}
          </p>
        )}
      </div>
      <div className="wgi-sheet-head-actions">
        <SheetPrint patientName={line.name} ready={record !== null} />
        <HomeSheetClose
          render={
            <button
              type="button"
              className="wgi-sheet-close print-hide"
              aria-label="Close full record"
            />
          }
        >
          <CloseGlyph size={18} />
        </HomeSheetClose>
      </div>
    </header>
  );
}

/* The scrolling half: whichever of the three states the read is in, and —
   until it lands — the number to dial. The strip exists because the number is
   the one thing staff want before the record has arrived, and it retires the
   moment the record brings its own: the Contact and request card names the
   same number 150px below it, with a label, an icon and the email beside it.
   Two live phone links to one patient is two places to look and one of them
   redundant, so the sheet only ever shows the one that is in context. */
export function FullRecordBody({
  line,
  record,
  problem,
  onReread,
  onSettled,
}: Readonly<{
  line: Readonly<HomeLine>;
  record: RecordView | null;
  problem: string | null;
  onReread: () => void;
  onSettled: () => void;
}>) {
  return (
    <div className="wgi-sheet-body">
      {record === null ? (
        <>
          <a href={line.tel} className="wgi-sheet-call print-hide" data-ui-redact="patient-contact">
            <PhoneGlyph size={16} />
            {line.phoneDisplay}
          </a>
          {problem === null ? (
            <RecordPlaceholder />
          ) : (
            <RecordProblem problem={problem} onRetry={onReread} />
          )}
        </>
      ) : (
        <RecordColumn
          record={record}
          patientName={line.name}
          onSaved={onReread}
          onSettled={onSettled}
        />
      )}
    </div>
  );
}
