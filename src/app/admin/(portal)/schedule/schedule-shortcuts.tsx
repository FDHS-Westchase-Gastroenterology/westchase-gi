"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent } from "react";
import type { RefObject } from "react";

import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Popover, PopoverClose, PopoverContent, PopoverTitle } from "@/components/ui/popover";
import type { PopoverChangeDetails, PopoverHandle } from "@/components/ui/popover-behavior";
import { SCHEDULE_SHORTCUTS, spokenKeys } from "@/lib/portal/schedule-shortcut-list";

/* The Schedule's single-key shortcuts and the list that names them (issue
   #351; Figma S5 shortcuts frame). Day, Week and Month all answer them:

   - T goes to today; J and K to the next or previous day, week or month;
     D, W and M switch the view; / goes to the patient search (issue
     #356); ? opens the list.
   - A key never fires while someone is typing (a field, a text area, an
     editable region or a combobox), with Command, Control or Option held,
     or inside an open card or menu, which own their keys.

   The list is a popover: Escape or a click outside closes it and focus
   goes back where it was (HIG Popovers). Where the view shows a button
   for it (the day's "All shortcuts"), that button is its trigger through
   a handle, so it says whether the list is open and takes focus back. */

export interface ShortcutTargets {
  readonly today: string;
  readonly next: string | null;
  readonly previous: string | null;
  /** Null for the view already showing: its own key stays put. */
  readonly day: string | null;
  readonly week: string | null;
  readonly month: string | null;
}

const OWNS_KEYS =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="combobox"], [role="dialog"], [role="menu"], [role="listbox"]';

function ownsKeys(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(OWNS_KEYS) !== null;
}

/** Listens for the Schedule's shortcuts on the document while mounted. */
export function useScheduleShortcuts(targets: Readonly<ShortcutTargets>, onHelp: () => void) {
  const router = useRouter();

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    if (ownsKeys(event.target)) return;
    if (event.key === "?") {
      event.preventDefault();
      onHelp();
      return;
    }
    if (event.key === "/") {
      const search = document.querySelector<HTMLInputElement>("[data-schedule-search] input");
      if (search === null) return;
      event.preventDefault();
      search.focus();
      return;
    }
    if (event.shiftKey) return;
    const href = {
      t: targets.today,
      j: targets.next,
      k: targets.previous,
      d: targets.day,
      w: targets.week,
      m: targets.month,
    }[event.key.toLowerCase()];
    if (href === undefined || href === null) return;
    event.preventDefault();
    router.push(href);
  });

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);
}

/* ---- The list ---- */

export interface ShortcutsListProps {
  readonly open: boolean;
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Base UI event details carry platform member types that cannot be made readonly
  readonly onOpenChange: (open: boolean, details: PopoverChangeDetails) => void;
  /** Ties the list to a visible trigger, where the view has one. */
  readonly handle?: PopoverHandle<undefined>;
  /** What the list opens from: the strip's "All shortcuts", or the view switch. */
  readonly anchor: RefObject<HTMLElement | null>;
  readonly side: "top" | "bottom";
  /** Opened from the keyboard: it appears and leaves at once. */
  readonly keyed: boolean;
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Base UI handles carry store member types that cannot be made readonly
export function ShortcutsList({
  open,
  onOpenChange,
  handle,
  anchor,
  side,
  keyed,
}: ShortcutsListProps) {
  return (
    <Popover handle={handle} open={open} onOpenChange={onOpenChange}>
      <PopoverContent
        className="wgi-shortcuts"
        motion={keyed ? "none" : "wgi"}
        anchor={anchor}
        side={side}
        align={side === "top" ? "start" : "end"}
        alignOffset={side === "top" ? -23 : 0}
        sideOffset={side === "top" ? 12 : 8}
      >
        <header className="wgi-shortcuts-head">
          <PopoverTitle>Keyboard shortcuts</PopoverTitle>
          <PopoverClose className="wgi-shortcuts-close" aria-label="Close">
            <Kbd>Esc</Kbd>
            <span aria-hidden="true">Close</span>
          </PopoverClose>
        </header>
        {SCHEDULE_SHORTCUTS.map((group) => (
          <section key={group.title} className="wgi-shortcuts-group">
            <h2 className="wgi-shortcuts-group-title">{group.title}</h2>
            <dl className="wgi-shortcuts-rows">
              {group.shortcuts.map((shortcut) => (
                <div key={shortcut.does} className="wgi-shortcuts-row">
                  <dt className="wgi-shortcuts-keys">
                    <span className="sr-only">{spokenKeys(shortcut.keys)}</span>
                    <KbdGroup aria-hidden="true">
                      {shortcut.keys.map((key) => (
                        <Kbd key={key}>{key}</Kbd>
                      ))}
                    </KbdGroup>
                  </dt>
                  <dd className="wgi-shortcuts-does">{shortcut.does}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </PopoverContent>
    </Popover>
  );
}
