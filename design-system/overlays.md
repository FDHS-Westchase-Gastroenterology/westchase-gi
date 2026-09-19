# Overlays

An overlay is chosen by what the reader must do next, not by how it looks. Each kind below has
one implementation, and the portal has no tooltip, hover card or menu. Motion values come from
[motion.md](motion.md); paint comes from [color.md](color.md).

## Choosing an overlay

```text
What must the reader do with this surface?
├── Staff portal: answer before anything else (confirm, choose, fill a short form) → a native modal dialog
├── Staff home: edit or read one thing that belongs to a control or a row          → HomePopover
├── Staff home: read a whole record while its card and the list stay usable        → the full-record sheet
├── Staff home: set the record card's start time                                   → the card's TimePicker
├── Staff portal: learn how a save turned out                                      → toast.promise
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
- **Actions.** The safe answer is a `Button`. Beside it sits at most one text action:
  `-destructive` (amber, bordered) to remove something, or `-discard` (teal text) to cancel a
  choice or abandon a draft. Neither class sets a height, so every call site adds `min-h-11`.
- **Motion.** It rises 0.75rem from `scale(0.97)` and closes toward 0.4rem and `scale(0.985)`,
  transform on arriving and the rest on leaving, over a plain `rgba(20, 32, 45, 0.48)` scrim that
  fades in over 220ms. Modals stay centered: they answer the whole page, not one trigger.

**The keyboard opens and closes a dialog instantly.** Toggle `data-instant` from
`event.detail === 0` in the trigger's click and in the dialog's `onClickCapture`, and set it in
`onCancel`. It removes the transition from the dialog and its backdrop, under reduced motion too.

**Focus lands inside in the same task as `showModal()`,** on the answer a person most likely
wants: Cancel or Keep editing on a confirmation, the chooser's primary action, the form's name
field. A frame callback never runs while the tab is hidden, so never defer the move. Tab wraps
inside the dialog. On close, focus returns to the trigger, or to the list that changed.

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

`HomePopover`, `HomePopoverTrigger` and `HomePopoverContent` (`(home)/parts/popover.tsx`) wrap
Base UI Popover for the staff home's record card (`.wgi-record-card`) and filter editors
(`.wgi-editor`). They open below, start-aligned, 8px away and 8px inside the viewport. A tall one
flips above its anchor, never beside it where the sidebar is, and scrolls inside
`--available-height`. Pass `anchor` when the trigger is smaller than what the popover describes:
the record card's trigger is a chevron, and the card anchors to the whole row.

Focus moves to the first tabbable element inside, or to a field marked `autoFocus`, and returns to
the trigger. An outside press, Escape or focus leaving closes a popover. In `cardStaysOpen`
(`(home)/sheet-coexistence.ts`) the record card declines the closes that belong to a surface
beside it: a press on its own row or a toast, a press or focus move into the full-record sheet,
and an Escape meant for the sheet. In a table the popover lives in the row's last cell, because
its portal leaves focus-guard spans beside the trigger.

`.wgi-popover` grows from `var(--transform-origin)` and `scale(0.95)` over leaving's 160ms,
closing in 120ms ([item 14](roadmap.md#14-the-staff-home-temperament-and-companion-surfaces)).
Base UI's `data-instant` makes a keyboard press, Escape or focus leaving instant; an outside press
animates.

```tsx
// Correct (filter-bar.tsx, shortened): the route's popover, dressed by its class
<HomePopover open={open} onOpenChange={setOpen}>
  <HomePopoverTrigger render={<button type="button" className="wgi-add-filter" />}>Add filter</HomePopoverTrigger>
  <HomePopoverContent className="wgi-editor" aria-label="Add filter">…</HomePopoverContent>
</HomePopover>
```

## The full-record sheet

`FullRecordSheet` (`(home)/full-record-sheet.tsx`) is built on `HomeSheet` and `HomeSheetContent`
(`(home)/parts/sheet.tsx`), the portal's one Base UI Dialog and its only non-modal dialog.
`modal={false}` and `disablePointerDismissal` leave no scrim, no scroll lock and nothing inert, so
the record card and the list stay usable beside it. The card and the sheet as companions are
[roadmap item 14](roadmap.md#14-the-staff-home-temperament-and-companion-surfaces).

- **Opening.** The card's "Open full record" button opens it, and the card stays open. Opening
  another row's card retargets the open sheet to that record without re-entering.
- **Placement.** The right edge, 42rem wide and at most 94vw, stopping at the sidebar from 60rem
  on `--z-drawer`. The left-edge grip resizes it by pointer or arrow keys, rubber-bands past the
  narrow end, remembers the width, and opens no wider than clears an open card.
- **Motion.** It grows from `scale(0.96)` about the card's button (`--wgi-sheet-origin-x`, `-y`)
  and leaves to `scale(0.97)`, transform on arriving and opacity on leaving, with a 4vw bleed
  covering the right edge while it scales. A keyboard open or close is instant.
- **Focus and Escape.** It opens onto the sheet itself, not the grip, and returns to the card's
  button, or to the row's trigger when the card has closed. One Escape closes one surface: the one
  holding focus, or the sheet when focus is in neither.
- **States.** The header's name, status and phone come from the list line, so it is never late.
  `SheetBody` shows a skeleton (`role="status"`) while the record loads, a notice when the request
  no longer exists, and an alert with "Try again" when it cannot load.

## The start-time sheet

The record card's `TimePicker` (`(home)/parts/time-picker.tsx`) wraps the `ui/` time wheels in a
`role="dialog"` sheet that rises from the card's bottom edge on `arrive` and leaves on `leave`,
over an `aria-hidden` scrim that dims the card and takes no focus. Focus goes to the hour wheel and
back to the trigger. Done commits the draft; the scrim and Escape discard it, and Escape stops
there, so the card stays open. Under reduced motion the sheet cross-fades in place on `crossfade`.

## Toasts

`Toaster` (`src/components/ui/toaster.tsx`) is Sonner, mounted once by the portal layout so a
result outlives the surface that started it; every save reports through `toast.promise`. Toasts
sit bottom center, 26rem wide, on `--popover` paper with `--shadow-popover` and no `richColors`,
arrive on the spring, leave on leaving and follow a swipe; reduced motion is a 120ms fade.

## The patient site

The `Header` language menu and navigation submenus are white panels on `--shadow-card` and
`--z-dropdown`, rendered only while open; a click outside or Escape closes them. The mobile menu
is a fixed panel under the header on `--z-drawer` that locks page scroll and closes on Escape.
None of them animate; only their chevrons turn ([roadmap item 16](roadmap.md#16-motion-literals)).
`LanguageChooser`, which opens by itself only when the browser prefers another supported language
and no choice is remembered, and `ProfileCardViewer` are native dialogs on `overlay-rise`
([roadmap item 7](roadmap.md#7-the-legacy-feature-blocks)).
