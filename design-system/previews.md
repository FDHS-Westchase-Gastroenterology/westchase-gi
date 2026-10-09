# Previews

A preview shows something beside its source without asking the reader to commit: a tooltip names a
control or says why it cannot be used, and a hover preview shows what sits behind a day or a row.
Neither holds anything to press. Choosing between them and the other overlays is
[overlays.md](overlays.md#choosing-an-overlay); motion is [motion.md](motion.md). The schedule week's
menu and card close this guide because they share the week grid with its compare tooltip; unlike
a preview, they hold commands.

## Tooltips

`Tooltip`, `TooltipTrigger` and `TooltipContent` (`src/components/ui/tooltip.tsx`) wrap Base UI
Tooltip in navy-900 paper with white 13px Lato and an arrow. A tooltip is a short label. One
`TooltipProvider` wraps the portal (`(portal)/layout.tsx`), so after the first tooltip waits, the
next opens at once. `SegmentedControl` uses one to say why a segment with a `disabledReason` cannot
be chosen yet (the Schedule's Day and Week: "Coming soon"). It grows from its trigger on the
popover temperament, and `data-instant` skips the motion.

## Hover previews

The Schedule's day preview (`schedule/schedule-month.tsx` and `schedule-day.tsx`,
`.wgi-day-preview`) is the pattern:

- **One root.** `Popover.createHandle()` serves every trigger, and the popup renders from the
  trigger's `payload`, so only one preview is ever open.
- **Opening.** A resting pointer opens it after 400ms (`openOnHover`, `delay`). While one is open,
  or within 300ms of one closing, the next opens at once. Focus from the keyboard (`:focus-visible`)
  opens it at once with `handle.open(id)`, and the preview follows focus.
- **Focus stays on the source.** The popup sets `initialFocus={false}` and holds nothing to press.
  Escape closes it and leaves focus where it was. Focus leaving the group closes a preview that
  focus opened.
- **Placement.** Beside the source with an arrow, flipping to the other side before covering it
  (HIG Popovers). The positioner takes no pointer; the popup does.
- **A press does nothing** until the source has a destination; the day preview calls
  `event.preventBaseUIHandler()` so a click neither toggles nor pins it.
- **Motion.** Popover motion: it grows from `var(--transform-origin)` at `scale(0.95)` on base and
  leaves on fast. `data-instant` (Escape, focus leaving) and `data-keyed` (a keyboard open, which
  `handle.open` does not mark) are instant. Under reduced motion it cross-fades with no travel,
  registered beside `.wgi-popover` in `globals.css`.

## The week's menu and card

`Menu` (`src/components/ui/menu.tsx`, adapted from the shadcn DropdownMenu on Base UI Menu) is the
week title's pull-down (`week-provider-menu.tsx`): every active provider as radio rows, then
"Compare providers…", which swaps the same menu's content to a checkbox picker of up to three
providers rather than stacking a submenu. Escape in the picker backs out to the list.
`tone="primary"` marks the picker's confirming Compare row. The menu grows from `var(--transform-origin)` at
`scale(0.95)` on base and leaves on fast; `data-instant` skips both.

The week card (`week-cards.tsx`) is one Base UI Popover opened through a handle by every cell, so
only one card is ever open. It sits beside its cell with an arrow, flipping sides and shifting
along the axis to stay in view, and never covers the cell. An appointment card turns over in place
to Reschedule or Cancel; an open-time card finds a patient and books. "Open full record ›" closes
the card and opens the [full-record sheet](overlays.md#the-full-record-sheet) on the appointment's
source request. A keyboard open sets `data-keyed`, which makes the card appear and leave at once.
In compare mode a resting pointer or focus on a cell shows its full line in a `Tooltip` through a
second handle.
