import type { Popover as PopoverPrimitive } from "@base-ui/react/popover";

import type { HomeSheetChangeDetails } from "./parts/sheet";

/* The surfaces that share the screen, and the rules for dismissing each.
   The full-record sheet runs non-modal beside the record card
   (plans/full-record-sheet-decisions.md, Phase 0): a press or a focus move
   into the sheet is work on this same record, not a dismissal, and Escape
   closes the surface holding focus — with focus in neither, the sheet, the
   most recently opened one. Both Base UI roots hear Escape at the document
   on the same keydown, so exactly one of them yields; the card asks
   `cardStaysOpen` and the sheet asks `focusWithin`, and the two answers are
   the two halves of one rule, which is why the rule lives here rather than
   in either surface. */

/** The sheet's popup. */
export const SHEET = '[data-slot="sheet-content"]';
/** The record card's popup. */
export const CARD = '[data-slot="popover-content"].wgi-record-card';
/** The card that is open: `data-open` keeps a card on its way out — another
    row's card took over — from being measured or focused. */
export const OPEN_CARD = `${CARD}[data-open]`;
/** The button inside the open card that opens the sheet. It is the point the
    sheet scales from, and where focus returns to on close. */
export const CARD_BUTTON = `${OPEN_CARD} .wgi-record-foot`;

/** True when the element holding focus sits inside `selector`. */
export function focusWithin(selector: string): boolean {
  const active = document.activeElement;
  return active !== null && active.closest(selector) !== null;
}

export type CardChangeDetails = PopoverPrimitive.Root.ChangeEventDetails;

/** True when the card declines a close: the press, the focus move, or the
    Escape belongs to a surface the card shares the screen with. The row is
    taken as the element the helper actually asks of — whether it contains
    the press — not as the table row it happens to be. */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Base UI event details and DOM nodes carry platform member types that cannot be made readonly
export function cardStaysOpen(details: CardChangeDetails, row: HTMLElement | null): boolean {
  if (details.reason === "outside-press") {
    /* A press on the open row is the row's own toggle (the row's click
       closes the card); Base UI would otherwise close on the pointerdown
       and the click would reopen it. A press on the save toast
       (ui/toaster.tsx, portaled beside the popover) is part of the save it
       reports: Try again and its close button keep the card open. */
    const { target } = details.event;
    return (
      target instanceof Element &&
      (row?.contains(target) === true ||
        target.closest("[data-sonner-toaster]") !== null ||
        target.closest(SHEET) !== null)
    );
  }
  if (details.reason === "focus-out") {
    const { event } = details;
    return (
      event instanceof FocusEvent &&
      event.relatedTarget instanceof Element &&
      event.relatedTarget.closest(SHEET) !== null
    );
  }
  if (details.reason === "escape-key") {
    /* Escape closes the surface holding focus, so the card yields the key
       unless the card is what holds it — with focus in the sheet, or in
       neither, the open sheet takes it and the card stays. */
    const holdsFocus = focusWithin(CARD);
    return !holdsFocus && document.querySelector(`${SHEET}[data-open]`) !== null;
  }
  return false;
}

/* A close is keyboard-initiated on Escape, or when the close button was
   pressed with Enter or Space (a click with no pointer behind it). */
// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Base UI event details carry platform event types that cannot be made readonly
export function closedByKeyboard(details: HomeSheetChangeDetails): boolean {
  if (details.reason === "escape-key") return true;
  if (details.reason !== "close-press") return false;
  const { event } = details;
  return event instanceof KeyboardEvent || (event instanceof MouseEvent && event.detail === 0);
}
