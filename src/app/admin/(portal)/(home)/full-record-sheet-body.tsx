import {
  formatPhoneForDisplay,
  formatReceived,
  LOCATION_LABELS,
  localeLabel,
  telHref,
  TIME_LABELS,
} from "@/app/admin/(portal)/requests/format";
import { Button } from "@/components/ui/button";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { isMailbox } from "@/lib/portal/contracts";
import type { FullRecord } from "@/lib/portal/request-record/contracts";

import { actorLabel, originLabel, recordSections, standsSentence } from "./full-record-sheet-model";
import type { ReadOutcome } from "./full-record-sheet-model";
import type { HomeLine } from "./home-line";
import { PhoneGlyph } from "./parts/glyphs";

/* The sheet's record content: the stands line the header carries and the
   sections below it, in the order the hierarchy records
   (plans/full-record-sheet-decisions.md, Phase 1) — Contact, Request, the
   patient's message, Staff notes, History — and the three states it shows
   while the record is not on screen. Geometry and paint live in home.css
   under `.wgi-sheet*`. */

function CallLink({ tel, phone }: Readonly<{ tel: string; phone: string }>) {
  return (
    <a href={tel} className="wgi-sheet-call" data-ui-redact="patient-contact">
      <PhoneGlyph size={16} />
      {phone}
    </a>
  );
}

type StandsLineProps = Readonly<{
  record: FullRecord | null;
  loading: boolean;
}>;

/* The sentence under the badge: the record's own words once it has loaded,
   its placeholder while the read is in flight, and nothing at all when the
   read failed or the record is gone — the body says which of those it was. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the request record carries workflow history entries whose types cannot be made readonly
export function StandsLine({ record, loading }: StandsLineProps) {
  if (record !== null) return <p className="wgi-sheet-stands">{standsSentence(record)}</p>;
  if (!loading) return null;
  return <span className="wgi-sheet-placeholder" aria-hidden="true" />;
}

type SheetBodyProps = Readonly<{
  line: Readonly<HomeLine>;
  /** Null while the read is in flight. */
  outcome: ReadOutcome | null;
  onRetry: () => void;
}>;

/* The body in its four states. Loading and the failed read keep the
   phone from the list's line at the top: the number is what staff need
   first, and the list already knows it. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the request record carries workflow history entries whose types cannot be made readonly
export function SheetBody({ line, outcome, onRetry }: SheetBodyProps) {
  if (outcome === null) {
    return (
      <>
        <h3 className="wgi-sheet-section">Contact</h3>
        <div className="wgi-sheet-contact">
          <CallLink tel={line.tel} phone={line.phoneDisplay} />
          <span className="wgi-sheet-placeholder" aria-hidden="true" />
        </div>
        <Separator className="wgi-sheet-rule" />
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
      </>
    );
  }
  if (outcome.kind === "gone") {
    return (
      <div className="wgi-sheet-state" role="status">
        <p className="wgi-sheet-state-title">This request no longer exists.</p>
        <p className="wgi-sheet-state-note">It may have been removed since the list was loaded.</p>
      </div>
    );
  }
  if (outcome.kind === "unavailable") {
    return (
      <>
        <h3 className="wgi-sheet-section">Contact</h3>
        <div className="wgi-sheet-contact">
          <CallLink tel={line.tel} phone={line.phoneDisplay} />
        </div>
        <Separator className="wgi-sheet-rule" />
        <div className="wgi-sheet-state" role="alert">
          <p className="wgi-sheet-state-title">The full record could not be loaded.</p>
          <p className="wgi-sheet-state-note">
            The header shows what the list knows. Try again in a moment.
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
            Try again
          </Button>
        </div>
      </>
    );
  }

  const { record } = outcome;
  const mailbox = record.email !== null ? record.email.trim() : "";
  const safeMailbox = mailbox !== "" && isMailbox(mailbox) ? mailbox : null;
  const message = record.message !== null ? record.message.trim() : "";
  const { notes, history: historyLines } = recordSections(record);

  return (
    <>
      <h3 className="wgi-sheet-section">Contact</h3>
      <div className="wgi-sheet-contact">
        <CallLink tel={telHref(record.phone)} phone={formatPhoneForDisplay(record.phone)} />
        {safeMailbox !== null ? (
          <a
            href={`mailto:${safeMailbox}`}
            className="wgi-sheet-email"
            data-ui-redact="patient-contact"
          >
            {safeMailbox}
          </a>
        ) : (
          <p className="wgi-sheet-empty">No email provided</p>
        )}
      </div>
      <Separator className="wgi-sheet-rule" />
      <h3 className="wgi-sheet-section">Request</h3>
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
      <Separator className="wgi-sheet-rule" />
      <h3 className="wgi-sheet-section">Patient&rsquo;s message</h3>
      {message !== "" ? (
        <p className="wgi-sheet-message" data-ui-redact="patient-message">
          {message}
        </p>
      ) : (
        <p className="wgi-sheet-empty">No note was included with this request.</p>
      )}
      <Separator className="wgi-sheet-rule" />
      <h3 className="wgi-sheet-section">Staff notes</h3>
      {notes.length === 0 ? (
        <p className="wgi-sheet-empty">No staff notes.</p>
      ) : (
        <ItemGroup className="wgi-sheet-items -mx-2.5">
          {notes.map((note) => (
            <Item key={note.id} size="xs">
              <ItemContent>
                <ItemTitle className="line-clamp-none block w-full whitespace-pre-wrap">
                  {note.text}
                </ItemTitle>
                <ItemDescription>{note.byline}</ItemDescription>
              </ItemContent>
            </Item>
          ))}
        </ItemGroup>
      )}
      <Separator className="wgi-sheet-rule" />
      <h3 className="wgi-sheet-section">History</h3>
      {historyLines.length === 0 ? (
        <p className="wgi-sheet-empty">Nothing recorded yet.</p>
      ) : (
        <ItemGroup className="wgi-sheet-items -mx-2.5">
          {historyLines.map((entry) => (
            <Item
              key={entry.id}
              size="xs"
              data-undone={entry.undone ? "" : undefined}
              data-attention={entry.attention ? "" : undefined}
              data-quiet={entry.quiet ? "" : undefined}
            >
              <ItemContent>
                <ItemTitle className="line-clamp-none block w-full">{entry.text}</ItemTitle>
                <ItemDescription>
                  {entry.actor !== null ? `${actorLabel(record.actorNames, entry.actor)} · ` : ""}
                  {formatReceived(entry.at, true)}
                  {entry.undone ? " · later undone" : ""}
                </ItemDescription>
              </ItemContent>
            </Item>
          ))}
        </ItemGroup>
      )}
    </>
  );
}
