import type { Popover as PopoverPrimitive } from "@base-ui/react/popover";

import type { HomeSheetChangeDetails } from "./parts/sheet";

/* The surfaces that share the screen, and the rules for dismissing each.
   The full-record sheet is the record's inspector — undimmed and
   non-modal — and the record card is its companion, a popover beside its
   row (plans/full-record-sheet-decisions.md): staff work the phone with
   both in view, so a press or a focus move into the sheet is work on this
   same record, not a dismissal of the card. A card dragged into a panel
   (use-card-detach.ts) stops being a popover for dismissal too: a panel
   stays while people work elsewhere, so every outside press and focus
   move is declined until the card's own close — its head button, its
   row's toggle, Escape — or another row's card taking its place. Escape
   closes the surface holding keyboard focus; with focus in neither, it
   closes the sheet, the companion without a draft. Dismissing the card
   is never the side effect of a key pressed elsewhere — a popup that
   contains focus hears Escape on its own onKeyDown and stops it there,
   so the document listeners on the two roots race only when focus is in
   neither surface, which is when the card asks `cardStaysOpen` and yields
   the key to the sheet. */

/** The sheet's popup. */
export const SHEET = '[data-slot="sheet-content"]';
/** The record card's popup. */
export const CARD = '[data-slot="popover-content"].wgi-record-card';
/** The card that is open: `data-open` keeps a card on its way out — another
    row's card took over — from being measured or focused. */
export const OPEN_CARD = `${CARD}[data-open]`;
/** The button inside the open card that toggles the sheet; focus returns
    to it when the sheet closes while the card is still up. */
export const CARD_BUTTON = `${OPEN_CARD} .wgi-record-full`;

/** True when the element holding focus sits inside `selector`. */
function focusWithin(selector: string): boolean {
  const active = document.activeElement;
  return active !== null && active.closest(selector) !== null;
}

export type CardChangeDetails = PopoverPrimitive.Root.ChangeEventDetails;

/** True when the card declines a close: the press, the focus move, or the
    Escape belongs to a surface the card shares the screen with — or the
    card is a detached panel, which stays while people work elsewhere and
    so declines every outside press and focus move. The row is taken as
    the element the helper actually asks of — whether it contains the
    press — not as the table row it happens to be. With focus inside the
    card the key is the card's; anywhere else, a mounted sheet — open or
    on its way out — takes it and the card stays. */
export function cardStaysOpen(
  // oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- Base UI event details and DOM nodes carry platform member types that cannot be made readonly
  details: CardChangeDetails,
  row: HTMLElement | null,
  detached: boolean,
): boolean {
  if (details.reason === "outside-press") {
    if (detached) return true;
    /* A press on the open row is the row's own toggle (the row's click
       closes the card); Base UI would otherwise close on the pointerdown
       and the click would reopen it. A press on the save toast
       (ui/toaster.tsx, portaled beside the popover) is part of the save it
       reports: Try again and its close button keep the card open. A press
       in the sheet is work on this record. */
    const { target } = details.event;
    return (
      target instanceof Element &&
      (row?.contains(target) === true ||
        target.closest("[data-sonner-toaster]") !== null ||
        target.closest(SHEET) !== null)
    );
  }
  if (details.reason === "focus-out") {
    if (detached) return true;
    const { event } = details;
    return (
      event instanceof FocusEvent &&
      event.relatedTarget instanceof Element &&
      event.relatedTarget.closest(SHEET) !== null
    );
  }
  if (details.reason === "escape-key") {
    /* Focus inside the card makes the key the card's own. Heard any other
       way — from the document, focus in neither surface — it belongs to
       the sheet while one is mounted, open or on its way out. */
    return !focusWithin(CARD) && document.querySelector(SHEET) !== null;
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
