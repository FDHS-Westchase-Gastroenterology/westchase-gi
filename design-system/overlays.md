# Overlays

An overlay is chosen by what the reader must do next, not by how it looks. Each kind below has
one implementation, and the portal has no tooltip, hover card or menu. Motion values come from
[motion.md](motion.md); paint comes from [color.md](color.md).

## Choosing an overlay

```text
What must the reader do with this surface?
├── Staff portal: answer before anything else (confirm, choose, fill a short form) → a native modal dialog
├── Staff home: edit or read one thing that belongs to a control or a row          → HomePopover
├── Staff home: read a whole record beside its card                                → the full-record sheet
├── Staff home: set the record card's start time                                   → the card's TimePicker
├── Staff portal: learn how a save on a request turned out                         → toast.promise (forms.md)
├── Patient site: pick a language, a section or a page                             → the Header menus
└── A tooltip, a hover card, a menu, a drawer, a second sheet, or anything else    → ask Jason
```

## Modal dialogs

**Every modal is one modal.** A staff-portal modal is a native `<dialog>` opened with
`showModal()` and dressed in the `.portal-confirm-dialog` parts of `portal-workbench.css`. The top
layer supplies the backdrop, inertness and Escape's `cancel` event; CSS animates it with
`transition-behavior: allow-discrete`. There are four: `PrintChooser`, `AddAppointmentDialog`
(hosting `StaffRequestForm`), `RemoveRecipientDialog` and the request form's discard confirmation.
The shadcn Dialog stays unadopted ([a standing finding](adoption.md#standing-findings)); a wrapper
component is [roadmap item 9](roadmap.md#9-a-native-dialog-component).

- **Parts.** `-body` and `-actions` are siblings, never nested. `-body` holds the `-title`, or a
  `-heading` pairing it with a `-close` button, and the copy; `-actions` stacks full-width
  buttons, then a right-aligned row from 40rem. The dialog is `min(92vw, 28rem)` by at most
  `min(90dvh, 32rem)`; `portal-add-appointment` is 40rem by 46rem.
- **Actions.** The safe answer is a `Button`. Beside it sits at most one text action: `-destructive`
  (amber, bordered) to remove something, or `-discard` (teal text) to cancel a choice or abandon a
  draft. Neither class sets a height or a disabled look, so every call site adds `min-h-11`, and one
  whose press runs a server action adds `disabled:opacity-60` and disables Cancel, Close and Escape
  too until the action settles (`RemoveRecipientDialog` in `recipients-manager.tsx#L167`).
- **Motion.** It rises 0.75rem from `scale(0.97)`, transform on arriving and the rest on leaving,
  and closes toward 0.4rem and `scale(0.985)` over a `rgba(20, 32, 45, 0.48)` scrim that fades in
  over 220ms. It stays centered: a modal answers the whole page.

**The keyboard opens and closes a dialog instantly.** Toggle `data-instant` from
`event.detail === 0` in the trigger's click and in the dialog's `onClickCapture`, and set it in
`onCancel`. It removes the transition from the dialog and its backdrop, under reduced motion too.

**Focus lands inside in the same task as `showModal()`,** on the answer a person most likely
wants: Cancel or Keep editing on a confirmation, the chooser's primary action, the form's name
field. A frame callback never runs while the tab is hidden, so never defer the opening move. Tab
wraps inside the dialog by hand ([accessibility.md](accessibility.md#focus)). On close, focus
returns to the trigger. When the action removed the trigger's own row, focus goes to the list's
heading instead: an `h2` with `tabIndex={-1}` and `.portal-settings-list-heading`, focused in a
frame callback after the dialog closes, once the row is gone (`finishRemoveDialog` in
`recipients-manager.tsx`). An action that fails closes the dialog, returns focus to the trigger and
reports the failure in the page's inline result line ([forms.md](forms.md#reporting-a-result)).

**Only Escape and the dialog's own controls close it.** A press on the scrim does nothing. Escape
takes the safe answer: a dialog that can refuse (a removal in flight, a dirty draft) calls
`preventDefault()` in `onCancel` and runs its Close path, and the discard confirmation lets Escape
keep editing. A dialog may open another: the add-appointment form hosts the discard confirmation.

`PrintChooser` follows every rule above; copy it, except that a dialog built for one chosen target
opens from an effect keyed on it (`recipients-manager.tsx`). `RemoveRecipientDialog` and the
discard confirmation do not set `data-instant`, `AddAppointmentDialog` does not wrap Tab: roadmap
item 9. `PortalTour` runs on legacy `overlay-rise` keyframes: roadmap item 7.

```tsx
// Correct (print-chooser.tsx, shortened): instant from the keyboard, Escape through Close
<dialog ref={dialogRef} aria-modal="true" aria-labelledby={titleId} className="portal-confirm-dialog portal-print-chooser"
  onClickCapture={(event) => event.currentTarget.toggleAttribute("data-instant", event.detail === 0)}
  onCancel={(event) => { event.preventDefault(); event.currentTarget.toggleAttribute("data-instant", true); closeChooser(); }}
  onClose={() => { setOpen(false); triggerRef.current?.focus(); }}
  onKeyDown={keepFocusInDialog}>
```

```tsx incorrect
// Incorrect: a hand-built modal with its own layer, scrim and animation
<div role="dialog" aria-modal="true" className="fixed inset-0 z-50 animate-in fade-in">…</div>
```

## Popovers

`HomePopover`, `HomePopoverTrigger` and `HomePopoverContent` (`(home)/parts/popover.tsx`) wrap Base
UI Popover for the staff home's record card (`.wgi-record-card`) and filter editors (`.wgi-editor`;
copy `filter-bar.tsx`). They open start-aligned, 8px from the anchor and the viewport, an editor
below its trigger; `line-row.tsx` passes the card the whole row as `anchor` and the roomier `side`.
The positioner shifts a popover into view but never flips, shrinks or sets it beside its anchor; a
card taller than the viewport scrolls inside `--available-height`.

Focus moves to the first tabbable element or a field marked `autoFocus`, and returns to the trigger.
An outside press, Escape or focus leaving closes a popover, and the card has a close button in its
head. `cardStaysOpen` (`(home)/sheet-coexistence.ts`) keeps the card open through a press on its row
or a toast, a press or focus move into the sheet, an Escape while a sheet is mounted and focus is
outside the card, and, once detached, any outside press or focus move. In a table the popover sits
in the row's last cell: its portal leaves focus guards by the trigger.

`.wgi-popover` grows from `var(--transform-origin)` and `scale(0.95)` on base, 240ms, and closes on
fast, 140ms ([motion.md](motion.md#the-registry)); `data-instant` makes a keyboard press, Escape or
focus leaving instant, and an outside press animates.

## The full-record sheet

`FullRecordSheet` (`(home)/full-record-sheet.tsx`), on `HomeSheet` and `HomeSheetContent`
(`(home)/parts/sheet.tsx`), is the portal's one Base UI Dialog and its only non-modal one:
`modal={false}` and `disablePointerDismissal` leave no scrim, no scroll lock and nothing inert.

**Companion surfaces.** The sheet is the selected request's undimmed inspector and the record card
its companion, anchored to its row and on top: no scrim, because dimming means modal, and the sheet
resizes against the card instead of covering it. While attached, the list blurs all but the anchor
row and its body takes no presses, so a press there closes the card. Dragged 6px by its head from
60rem on (`use-card-detach.ts`), the card becomes a floating panel: the anchor freezes, the blur
lifts, outside presses and focus moves stop closing it. Its lane (`panel-lane.ts`) ends at the
viewport's edges, hard, and one list gutter short of an open sheet, where a drag rubber-bands and
settles back on base. A sheet arriving pushes it left on the sheet's beat, never past the sidebar;
it stays put when the sheet leaves. Apple's pattern: HIG Popovers on macOS detachable popovers,
Panels on the inspector, and UIKit's sheet presentation controller's largest undimmed detent.

- **Opening.** The card's foot toggles the sheet, "Open full record" or "Hide full record", with
  `aria-expanded` and `aria-controls="wgi-full-record"`; the card stays open. Opening another row's
  card retargets the open sheet without re-entering, and its content replays the settle.
- **Placement.** The right edge, 33.875rem wide and at most 94vw, stopping at the sidebar from 60rem
  on `--z-drawer`, with the card's positioner a layer above. The left-edge grip resizes it by
  pointer or arrow keys, rubber-bands past the narrow end and remembers the width; the sheet opens
  no wider than the card leaves it and refits on base when that bound moves.
- **Motion.** It slides in from the right edge on the sheet beat, 420ms, and leaves that way on
  base, 240ms; a 4vw bleed covers the edge through the grip's rubber band. The header, then the
  body 60ms later, settle in on base, the foot 120ms behind. A keyboard open or close is instant.
- **Focus and Escape.** It opens onto the sheet itself, not the grip, and returns to the card's
  toggle, or to the row's trigger when the card has closed. One Escape closes one surface: the one
  holding focus, or the sheet when focus is in neither.
- **States.** The header's name, status and phone come from the list line, so it is never late.
  `SheetBody` shows a skeleton (`role="status"`) while the record loads, a notice when the request
  no longer exists, and an alert with "Try again" when it cannot load.

## The start-time sheet

The record card's `TimePicker` (`(home)/parts/time-picker.tsx`) wraps the `ui/` wheels in a
`role="dialog"` sheet rising from the card's bottom edge on `arrive` and leaving on `leave`, over an
`aria-hidden` scrim that dims the card and takes no focus. Focus goes to the hour wheel and back;
Done commits, the scrim or Escape discards without closing the card; reduced motion is `crossfade`.

## The patient site

The `Header` language menu and navigation submenus are white panels on `--shadow-card` and
`--z-dropdown`, rendered only while open and closed by a click outside or Escape; the mobile menu is
a fixed panel under the header on `--z-drawer` that locks page scroll and closes on Escape. None
animate but their chevrons ([item 16](roadmap.md#16-motion-literals)). `LanguageChooser`, a native
dialog that opens itself when the browser prefers another supported language and none is remembered,
and `ProfileCardViewer` run on `overlay-rise` ([item 7](roadmap.md#7-the-legacy-feature-blocks)).
