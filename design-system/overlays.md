# Overlays

Choose by the reader's next action, not looks. Each kind has one implementation; the portal has no tooltip, hover card or menu. Motion is in [motion.md](motion.md), paint in [color.md](color.md).

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

**Keyboard opens and closes instantly.** Set `data-instant` from `event.detail === 0` in the trigger's
`onClick` and dialog's `onClickCapture`, and in `onCancel` to skip dialog and backdrop transitions.

**Focus lands inside in the same task as `showModal()`** on the safe next step: Cancel/Keep editing,
the chooser's primary action or the form name field. Never defer to a frame in a hidden tab. Tab
wraps by hand ([accessibility.md](accessibility.md#focus)). On close, focus returns to its trigger or
the focusable list heading after row removal (`finishRemoveDialog`); failures return focus and report
inline ([forms.md](forms.md#reporting-a-result)).

**Only Escape and dialog controls close it.** Scrim presses do nothing. A dialog can prevent Escape
while a removal is in flight or a draft is dirty; `onCancel` runs its Close path. The discard
confirmation keeps editing on Escape, and the add form can open that nested confirmation.

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

The card pairs identity and answer rows with a six-week calendar. Its lower strip holds follow-up or
start-time controls and a readout; one footer toggles the full record and saves. It starts blank and
commits on Save; scheduled and closed lines use one column.

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

**Companion surfaces.** The sheet is an undimmed, non-modal inspector. From 60rem, its attached
card stays beside it and above it; it fits beyond the card with one gutter. Its 24rem minimum can
force overlap, with the card on top. Below 60rem, the sheet covers the card. While attached, the list
blurs everything but the anchor row and takes no presses in its body. A press there closes the card;
a press or focus move into the sheet keeps it open. A 6px head drag from 60rem freezes the row
anchor and detaches it; blur lifts and outside presses or focus moves stop dismissing it. `panel-lane.ts`
keeps it 8px inside hard viewport edges, one gutter from an open sheet. It yields on arrival, clamps
later width changes, and may overlap the sheet while staying above it. Automatic movement stops at
the sidebar gutter; staff can drag over it, and the panel stays put when the sheet leaves. Apple's
pattern: HIG Popovers on macOS detachable popovers, Panels on the inspector, and UIKit's sheet
presentation controller's largest undimmed detent.

- **Opening.** The card's foot toggles the sheet, "Open full record" or "Hide full record", with
  `aria-expanded` and `aria-controls="wgi-full-record"`; the card stays open. Opening another row's
  card retargets the open sheet without re-entering, and its content replays the settle.
- **Placement.** It docks right at 33.875rem (max 94vw) on `--z-drawer`; from 60rem it stops at the
  sidebar and layers below the card. A left grip resizes by pointer or arrows, rubber-bands, and
  remembers width. The sheet fits beyond the card to a 24rem minimum, so overlap is possible; it
  refits on base as available room changes.
- **Motion.** It slides in from the right edge on the sheet beat, 420ms, and leaves that way on
  base, 240ms; a 4vw bleed covers the edge through the grip's rubber band. The header, then the
  body 60ms later, settle in on base, the foot 120ms behind. A keyboard open or close is instant.
- **Focus and Escape.** It opens onto the sheet itself, not the grip, and returns to the card's
  toggle, or to the row's trigger when the card has closed. One Escape closes one surface: the one
  holding focus, or the sheet when focus is in neither.
- **States.** The header's name, status and phone come from the list line, so it is never late.
  `SheetBody` shows a skeleton (`role="status"`) while the record loads, a notice when the request
  no longer exists, and an alert with "Try again" when it cannot load.

## The start-time panel

The card's `TimePicker` wraps `ui/` wheels in a `role="dialog"` panel over the calendar, above its
trigger strip. Its `aria-hidden` scrim dims without focus. It scales from the trigger at 0.96 on
`base` (240ms, no overshoot), exits on `leave` (160ms), and cross-fades on `crossfade` under reduced
motion. Keyboard open, keyboard Done and Escape are instant; pointer Done and scrim dismissal use `leave`. Focus goes
to the hour and back; Done commits, while scrim or Escape discards without closing the card.

## The patient site

The `Header` language menu and navigation submenus are white panels on `--shadow-card` and
`--z-dropdown`, rendered only while open and closed by a click outside or Escape; the mobile menu is
a fixed panel under the header on `--z-drawer` that locks page scroll and closes on Escape. None
animate but their chevrons ([item 16](roadmap.md#16-motion-literals)). `LanguageChooser`, a native
dialog that opens itself when the browser prefers another supported language and none is remembered,
and `ProfileCardViewer` run on `overlay-rise` ([item 7](roadmap.md#7-the-legacy-feature-blocks)).
