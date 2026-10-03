"use client";

import type { RefObject } from "react";

import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { PopoverTrigger } from "@/components/ui/popover";
import type { PopoverHandle } from "@/components/ui/popover";

/* The row under the day's grid (issue #351; Figma S5 and its keyboard
   frame): who is not working, on the right, and, once someone has pressed
   an arrow in the day, the keys that move through it on the left. "All
   shortcuts" opens the full list above the strip. */

export interface DayFootProps {
  readonly hints: boolean;
  readonly offLine: string | null;
  readonly shortcutsRef: RefObject<HTMLButtonElement | null>;
  /** "All shortcuts" is the list's trigger. */
  readonly shortcutsHandle: PopoverHandle<undefined>;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Base UI handles carry store member types that cannot be made readonly
export function DayFoot({ hints, offLine, shortcutsRef, shortcutsHandle }: DayFootProps) {
  if (!hints && offLine === null) return null;
  return (
    <div className="wgi-dayview-foot">
      {hints ? (
        <p className="wgi-dayview-hints">
          <span className="wgi-dayview-hint">
            <KbdGroup aria-hidden="true">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
            </KbdGroup>
            <span className="sr-only">Up and down arrows:</span> Move through the day
          </span>
          <span className="wgi-dayview-hint">
            <KbdGroup aria-hidden="true">
              <Kbd>←</Kbd>
              <Kbd>→</Kbd>
            </KbdGroup>
            <span className="sr-only">Left and right arrows:</span> Change provider
          </span>
          <span className="wgi-dayview-hint">
            <Kbd>Return</Kbd> Open
          </span>
          <PopoverTrigger
            ref={shortcutsRef}
            handle={shortcutsHandle}
            className="wgi-dayview-hint wgi-dayview-hint-button"
          >
            <KbdGroup aria-hidden="true">
              <Kbd>?</Kbd>
            </KbdGroup>
            All shortcuts
          </PopoverTrigger>
        </p>
      ) : null}
      {offLine === null ? null : <p className="wgi-dayview-off">{offLine}</p>}
    </div>
  );
}
