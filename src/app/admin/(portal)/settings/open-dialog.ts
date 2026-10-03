/* `showModal()` runs the dialog's focusing steps, and they land on the first focusable control,
   which is Close. React's `autoFocus` never reaches the DOM and fires before the dialog is open,
   so the control a dialog opens on carries `data-initial-focus` and is focused here, in the same
   task. */
export function showModalWithInitialFocus(
  dialog: Readonly<Pick<HTMLDialogElement, "showModal" | "querySelector">>,
) {
  dialog.showModal();
  dialog.querySelector<HTMLElement>("[data-initial-focus]")?.focus();
}
