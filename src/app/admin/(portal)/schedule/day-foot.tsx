"use client";

import type { RefObject } from "react";

import { Keycap } from "./schedule-shortcuts";

/* The row under the day's grid (issue #351; Figma S5 and its keyboard
   frame): who is not working, on the right, and, once someone has pressed
   an arrow in the day, the keys that move through it on the left. "All
   shortcuts" opens the full list above the strip. */

export interface DayFootProps {
  readonly hints: boolean;
  readonly offLine: string | null;
  readonly shortcutsRef: RefObject<HTMLButtonElement | null>;
  readonly onShortcuts: () => void;
}

export function DayFoot({ hints, offLine, shortcutsRef, onShortcuts }: DayFootProps) {
  if (!hints && offLine === null) return null;
  return (
    <div className="wgi-dayview-foot">
      {hints ? (
        <p className="wgi-dayview-hints">
          <span className="wgi-dayview-hint">
            <span className="wgi-shortcuts-caps" aria-hidden="true">
              <Keycap>↑</Keycap>
              <Keycap>↓</Keycap>
            </span>
            <span className="sr-only">Up and down arrows:</span> Move through the day
          </span>
          <span className="wgi-dayview-hint">
            <span className="wgi-shortcuts-caps" aria-hidden="true">
              <Keycap>←</Keycap>
              <Keycap>→</Keycap>
            </span>
            <span className="sr-only">Left and right arrows:</span> Change provider
          </span>
          <span className="wgi-dayview-hint">
            <Keycap>Return</Keycap> Open
          </span>
          <button
            ref={shortcutsRef}
            type="button"
            className="wgi-dayview-hint wgi-dayview-hint-button"
            aria-haspopup="dialog"
            onClick={onShortcuts}
          >
            <span className="wgi-shortcuts-caps" aria-hidden="true">
              <Keycap>?</Keycap>
            </span>
            All shortcuts
          </button>
        </p>
      ) : null}
      {offLine === null ? null : <p className="wgi-dayview-off">{offLine}</p>}
    </div>
  );
}
