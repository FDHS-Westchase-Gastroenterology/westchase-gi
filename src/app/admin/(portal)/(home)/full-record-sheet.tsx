"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";

import { rubberband } from "@/lib/motion";
import { STATUS_WORDS } from "@/lib/portal/filters";
import type { AttentionBucket } from "@/lib/portal/queue-attention";

import type { HomeLine } from "./home-line";
import { ChevronGlyph, CloseGlyph, PhoneGlyph } from "./parts/glyphs";
import { HomeSheet, HomeSheetClose, HomeSheetContent, HomeSheetTitle } from "./parts/sheet";
import type { HomeSheetChangeDetails } from "./parts/sheet";

const MIN_WIDTH_PX = 384;
const KEY_STEP_PX = 32;

const VIEWPORT_SHARE = 0.94;

/* Include the off-screen bleed. Layout measurements exclude the entrance
   transform, which would otherwise shift the resize bounds. */
interface SheetBounds {
  readonly min: number;
  readonly max: number;
}

function boundsFor(sheet: HTMLElement): SheetBounds {
  const bleed = Math.max(0, sheet.offsetLeft + sheet.offsetWidth - window.innerWidth);
  const side = document.querySelector(".portal-sidebar")?.getBoundingClientRect();
  const wall = side !== undefined && side.width < window.innerWidth ? side.right : 0;
  const widest = Math.min(window.innerWidth * VIEWPORT_SHARE, window.innerWidth - wall);
  return { min: MIN_WIDTH_PX + bleed, max: Math.max(MIN_WIDTH_PX, widest) + bleed };
}

function useSheetResize() {
  const remembered = useRef<number | null>(null);
  const popup = useRef<HTMLDivElement | null>(null);

  // Restore the last width within the current viewport bounds on each open.
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM nodes carry platform member types that cannot be made readonly
  const mount = useCallback((node: HTMLDivElement | null) => {
    popup.current = node;
    if (node === null || remembered.current === null) return;
    const { min, max } = boundsFor(node);
    node.style.width = `${Math.min(max, Math.max(min, remembered.current))}px`;
  }, []);

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
    const { min, max } = boundsFor(sheet);

    sheet.style.transition = "none";

    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM event objects carry platform member types that cannot be made readonly
    const move = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const wanted = startWidth - (moveEvent.clientX - startX);
      const width = Math.min(max, Math.max(min, wanted));
      sheet.style.width = `${width}px`;
      remembered.current = width;
      // Resist at the narrow edge; the sidebar is a hard stop at the wide edge.
      const past = min - wanted;
      sheet.style.transform = past > 0 ? `translateX(${rubberband(past, min)}px)` : "";
    };
    // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- DOM event objects carry platform member types that cannot be made readonly
    const up = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      delete grip.dataset.dragging;

      sheet.style.transition = "";
      sheet.style.transform = "";
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
    const { min, max } = boundsFor(sheet);
    const step = event.key === "ArrowLeft" ? KEY_STEP_PX : -KEY_STEP_PX; // Left widens: the sheet grows across
    const width = Math.min(max, Math.max(min, sheet.getBoundingClientRect().width + step));
    sheet.style.width = `${width}px`;
    remembered.current = width;
  }

  return { popup, mount, beginResize, resizeByKey };
}

// Keyboard activation can arrive as a click with detail 0.
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Base UI event details carry platform event types that cannot be made readonly
function closedByKeyboard(details: HomeSheetChangeDetails): boolean {
  if (details.reason === "escape-key") return true;
  if (details.reason !== "close-press") return false;
  const { event } = details;
  return event instanceof KeyboardEvent || (event instanceof MouseEvent && event.detail === 0);
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

/** Buckets whose next action is due now, so the sheet leads with it. */
const ATTENTION_NOW: readonly AttentionBucket[] = ["new", "follow_up", "stale"];

export function FullRecordSheet({
  line,
  instant,
  onOpenChange,
}: Readonly<{
  line: Readonly<HomeLine> | null;
  /** The open was keyboard-initiated, so the sheet appears without motion. */
  instant: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  // Keep the record mounted until Base UI finishes its exit.
  const [shown, setShown] = useState(line);
  if (line !== null && line !== shown) setShown(line);
  const [arrived, setArrived] = useState(false);
  const [leavingByKey, setLeavingByKey] = useState(false);
  const resize = useSheetResize();
  const attention = shown !== null && ATTENTION_NOW.includes(shown.bucket);

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
          <div className="wgi-sheet-surface">
            <button
              type="button"
              className="wgi-sheet-grip"
              aria-label="Resize the full record panel"
              title="Drag, or press the arrow keys, to resize"
              onPointerDown={resize.beginResize}
              onKeyDown={resize.resizeByKey}
            >
              <span aria-hidden="true" />
            </button>
            <header className="wgi-sheet-head">
              <div>
                <p className="wgi-sheet-kicker">Full record</p>

                <HomeSheetTitle className="wgi-sheet-name" data-ui-redact="patient-name">
                  {shown.name}
                </HomeSheetTitle>
                <p className="wgi-sheet-meta">
                  <span className="wgi-sheet-status">
                    <span
                      aria-hidden="true"
                      className="wgi-sheet-dot"
                      style={
                        attention
                          ? { background: DOT_COLOR[shown.status] }
                          : {
                              background: "transparent",
                              boxShadow: `inset 0 0 0 1.5px ${DOT_COLOR[shown.status]}`,
                            }
                      }
                    />
                    {STATUS_WORDS[shown.status]}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{shown.pref}</span>
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
              <a href={shown.tel} className="wgi-sheet-call" data-ui-redact="patient-contact">
                <PhoneGlyph size={16} />
                {shown.phoneDisplay}
              </a>
              <dl className="wgi-sheet-dl">
                <dt>Received</dt>
                <dd>{shown.receivedFull}</dd>
                <dt>Preference</dt>
                <dd>{shown.pref}</dd>
                <dt>Last worked</dt>
                <dd>{shown.actorName ?? "No staff action yet"}</dd>
              </dl>
              <p className="wgi-sheet-activity-heading">Activity</p>
              <ul className="wgi-sheet-activity">
                {activityOf(shown).map((entry) => (
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
            <Link href={shown.detailHref} className="wgi-sheet-foot">
              Open request page
              <ChevronGlyph size={14} />
            </Link>
          </div>
        </HomeSheetContent>
      )}
    </HomeSheet>
  );
}
