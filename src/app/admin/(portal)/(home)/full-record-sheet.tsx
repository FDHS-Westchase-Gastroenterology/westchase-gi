"use client";

import Link from "next/link";

import { STATUS_WORDS } from "@/lib/portal/filters";

import type { HomeLine } from "./home-line";
import { ChevronGlyph, CloseGlyph, PhoneGlyph } from "./parts/glyphs";
import { HomeSheet, HomeSheetClose, HomeSheetContent, HomeSheetTitle } from "./parts/sheet";

/* Full record: a right sheet the user widens on the x-axis. A left-edge grip
   drags the panel wider (pointer capture keeps the drag alive off the
   strip; arrow keys do the same without a pointer). Enter/exit ride the
   200ms drawer slide authored in home.css. */

const MIN_WIDTH_PX = 384;

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM event objects carry platform member types that cannot be made readonly
function beginResize(event: React.PointerEvent<HTMLButtonElement>): void {
  const grip = event.currentTarget;
  if (grip.dataset.dragging === "true") return; // One pointer owns the drag
  const sheet = grip.closest<HTMLElement>('[data-slot="sheet-content"]');
  if (sheet === null) return;
  event.preventDefault();
  grip.setPointerCapture(event.pointerId);
  grip.dataset.dragging = "true";
  const pointerId = event.pointerId;
  const startX = event.clientX;
  const startWidth = sheet.getBoundingClientRect().width;
  const maxWidth = window.innerWidth * 0.94;

  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM event objects carry platform member types that cannot be made readonly
  const move = (moveEvent: PointerEvent) => {
    if (moveEvent.pointerId !== pointerId) return;
    const width = Math.min(
      maxWidth,
      Math.max(MIN_WIDTH_PX, startWidth - (moveEvent.clientX - startX)),
    );
    sheet.style.width = `${width}px`;
  };
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM event objects carry platform member types that cannot be made readonly
  const up = (upEvent: PointerEvent) => {
    if (upEvent.pointerId !== pointerId) return;
    delete grip.dataset.dragging;
    grip.removeEventListener("pointermove", move);
    grip.removeEventListener("pointerup", up);
    grip.removeEventListener("pointercancel", up);
  };
  grip.addEventListener("pointermove", move);
  grip.addEventListener("pointerup", up);
  grip.addEventListener("pointercancel", up);
}

function resizeByKey(event: React.KeyboardEvent<HTMLButtonElement>): void {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  const sheet = event.currentTarget.closest<HTMLElement>('[data-slot="sheet-content"]');
  if (sheet === null) return;
  event.preventDefault();
  const step = event.key === "ArrowLeft" ? 32 : -32; // Left widens: the sheet grows across
  const width = Math.min(
    window.innerWidth * 0.94,
    Math.max(MIN_WIDTH_PX, sheet.getBoundingClientRect().width + step),
  );
  sheet.style.width = `${width}px`;
}

const DOT_COLOR = {
  new: "var(--color-amber-deep)",
  contacted: "var(--color-teal)",
  scheduled: "var(--color-navy)",
  closed: "var(--color-line-3)",
} as const;

function activityOf(
  line: Readonly<HomeLine>,
): readonly { what: string; when: string; who: string }[] {
  const worked = line.actorName ?? "Front desk";
  const workedWhen = line.lastActivityRel === null ? "—" : `${line.lastActivityRel} ago`;
  const entries: { what: string; when: string; who: string }[] = [];
  if (line.status === "scheduled") {
    entries.push({
      what: "Appointment scheduled — handed to front desk",
      when: workedWhen,
      who: worked,
    });
  }
  if (line.status === "contacted") {
    entries.push({
      what: line.followUpSet ? "Contact attempt — call again set" : "Contact attempt — no answer",
      when: workedWhen,
      who: worked,
    });
  }
  if (line.status === "closed") {
    entries.push({ what: "Request closed", when: workedWhen, who: worked });
  }
  entries.push({
    what: "Request received from website form",
    when: line.receivedFull,
    who: "System",
  });
  return entries;
}

export function FullRecordSheet({
  line,
  onOpenChange,
}: Readonly<{
  line: Readonly<HomeLine> | null;
  onOpenChange: (open: boolean) => void;
}>) {
  const attention = line !== null && ["new", "follow_up", "stale"].includes(line.bucket);

  return (
    <HomeSheet open={line !== null} onOpenChange={onOpenChange}>
      {line === null ? null : (
        <HomeSheetContent>
          <div className="wgi-sheet-surface">
            <button
              type="button"
              className="wgi-sheet-grip"
              aria-label="Resize the full record panel"
              title="Drag to resize"
              onPointerDown={beginResize}
              onKeyDown={resizeByKey}
            >
              <span aria-hidden="true" />
            </button>
            <header className="wgi-sheet-head">
              <div>
                <p className="wgi-sheet-kicker">Full record</p>
                <HomeSheetTitle
                  render={<h2 className="wgi-sheet-name" data-ui-redact="patient-name" />}
                >
                  {line.name}
                </HomeSheetTitle>
                <p className="wgi-sheet-meta">
                  <span className="wgi-sheet-status">
                    <span
                      aria-hidden="true"
                      className="wgi-sheet-dot"
                      style={
                        attention
                          ? { background: DOT_COLOR[line.status] }
                          : {
                              background: "transparent",
                              boxShadow: `inset 0 0 0 1.5px ${DOT_COLOR[line.status]}`,
                            }
                      }
                    />
                    {STATUS_WORDS[line.status]}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{line.pref}</span>
                </p>
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
              <a href={line.tel} className="wgi-sheet-call" data-ui-redact="patient-contact">
                <PhoneGlyph size={16} />
                {line.phoneDisplay}
              </a>
              <dl className="wgi-sheet-dl">
                <dt>Received</dt>
                <dd>{line.receivedFull}</dd>
                <dt>Preference</dt>
                <dd>{line.pref}</dd>
                <dt>Last worked</dt>
                <dd>{line.actorName ?? "No staff action yet"}</dd>
              </dl>
              <p className="wgi-sheet-activity-heading">Activity</p>
              <ul className="wgi-sheet-activity">
                {activityOf(line).map((entry) => (
                  <li key={entry.what}>
                    <span aria-hidden="true" className="wgi-sheet-activity-dot" />
                    <span>
                      <span className="wgi-sheet-activity-what">{entry.what}</span>
                      <span className="wgi-sheet-activity-when">
                        {entry.when} · {entry.who}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <Link href={line.detailHref} className="wgi-sheet-foot">
              Open request page
              <ChevronGlyph size={14} />
            </Link>
          </div>
        </HomeSheetContent>
      )}
    </HomeSheet>
  );
}
