"use client";

import { Toast as ToastPrimitive } from "@base-ui/react/toast";

/*
 * The portal's one acknowledgement channel, kept apart from the components
 * that render it.
 *
 * A manager is a store, not a component: it is created once, it outlives every
 * render, and half the code that speaks through it — a save handler, a hook, a
 * print guard — has no markup of its own. Keeping it here means those callers
 * import a value rather than a component module, and Fast Refresh can still
 * preserve the toast list's state while the toast's markup is being edited.
 *
 * `src/components/ui/toast.tsx` renders whatever this manager holds; the
 * `<Toaster>` in the portal layout is what mounts it.
 */
/*
 * What a toast carries beside its two lines. `redact` names the kind of value
 * the description holds, for the capture script in scripts/capture-ui-reference.mjs,
 * which rewrites every `[data-ui-redact]` before a screenshot is taken. A toast
 * is chrome and outlives the row it speaks about, so without this hook a patient
 * name can sit on screen through a capture that redacted the whole page behind it.
 */
interface ToastData {
  readonly redact?: string;
}

const toast = ToastPrimitive.createToastManager<ToastData>();

export { toast };
export type { ToastData };
