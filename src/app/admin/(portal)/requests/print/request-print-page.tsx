import type { FullRecord } from "@/lib/portal/request-record/contracts";

import { THIS_CALL_OUTCOMES, printedLine, printedPage } from "./printed-page-model";

import "./request-print-page.css";

/* One printed request: a US Letter call sheet drawn from the full record.
   The print route stacks one per request, the record's own print button
   prints one, and the Print sheet previews one, so there is one paper.
   No hooks and no client directive: it renders wherever it is imported.
   The words come from printed-page-model.ts; the page only lays them out. */

interface RequestPrintPageProps {
  readonly record: FullRecord;
  /** 1-based position in the packet, and the packet's length. */
  readonly index: number;
  readonly total: number;
  /** ISO time the packet was prepared, and who prepared it. */
  readonly printedAt: string;
  readonly printedBy: string | null;
}

const WRITE_IN_LINES = ["first", "second", "third", "fourth"] as const;

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- the request record carries workflow history entries whose types cannot be made readonly
export function RequestPrintPage({
  record,
  index,
  total,
  printedAt,
  printedBy,
}: RequestPrintPageProps) {
  const page = printedPage(record);
  return (
    <article className="printed-page" aria-label={`Appointment request ${index} of ${total}`}>
      <header className="printed-page-masthead">
        <strong>Westchase Gastroenterology</strong>
        <span>
          Appointment request · {index} of {total}
        </span>
      </header>

      <section className="printed-page-identity">
        <div>
          <h2>{page.name}</h2>
          <p>{page.standing}</p>
        </div>
        <span className="printed-page-chip">{page.status}</span>
      </section>

      <dl className="printed-page-grid">
        <div>
          <dt>Phone</dt>
          <dd className="printed-page-phone">{page.phone}</dd>
        </div>
        <div className="printed-page-grid-wide">
          <dt>Email</dt>
          {page.email === null ? (
            <dd className="printed-page-absent">Not provided — call the phone number</dd>
          ) : (
            <dd>{page.email}</dd>
          )}
        </div>
        <div>
          <dt>Preferred office</dt>
          <dd>{page.office}</dd>
        </div>
        <div>
          <dt>Preferred time</dt>
          <dd>{page.time}</dd>
        </div>
        <div>
          <dt>Submitted in</dt>
          <dd className={page.languageStands ? "printed-page-stands" : undefined}>
            {page.language}
          </dd>
        </div>
      </dl>

      {page.message === null ? null : (
        <section className="printed-page-section">
          <h3>Patient&apos;s message</h3>
          <p className="printed-page-message">{page.message}</p>
        </section>
      )}

      {page.notes.length === 0 ? null : (
        <section className="printed-page-section">
          <h3>Staff notes · {page.notes.length}</h3>
          <ul className="printed-page-notes">
            {page.notes.map((note) => (
              <li key={note.id}>
                <p>{note.text}</p>
                <small>{note.byline}</small>
              </li>
            ))}
          </ul>
        </section>
      )}

      {page.history.length === 0 ? null : (
        <section className="printed-page-section">
          <h3>Call history · {page.history.length}</h3>
          <table className="printed-page-history">
            <tbody>
              {page.history.map((row) => (
                <tr key={row.id} data-undone={row.undone ? "" : undefined}>
                  <th scope="row">{row.day}</th>
                  <td>
                    {row.event}
                    {row.undone ? " · undone" : null}
                  </td>
                  <td>{row.who}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="printed-page-call" aria-label="This call">
        <header>
          <h3>This call</h3>
          <em>Record it in the portal when you&apos;re back at a desk</em>
        </header>
        <ul className="printed-page-outcomes">
          {THIS_CALL_OUTCOMES.map((outcome) => (
            <li key={outcome}>
              <span aria-hidden="true" />
              {outcome}
            </li>
          ))}
        </ul>
        <div className="printed-page-blanks">
          <p>
            Call again on <span aria-hidden="true" />
          </p>
          <p>
            Appointment <span aria-hidden="true" />
          </p>
        </div>
        <p className="printed-page-notes-label">Notes</p>
        <div className="printed-page-ruled" aria-hidden="true">
          {WRITE_IN_LINES.map((line) => (
            <span key={line} />
          ))}
        </div>
        <div className="printed-page-blanks">
          <p>
            Called by <span aria-hidden="true" />
          </p>
          <p>
            Date and time <span aria-hidden="true" />
          </p>
        </div>
      </section>

      <footer className="printed-page-footer">
        <strong>Confidential patient information — clinic use only.</strong>
        <span>{printedLine(printedAt, printedBy)}</span>
      </footer>
    </article>
  );
}
