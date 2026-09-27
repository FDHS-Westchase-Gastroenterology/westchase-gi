/* A save the toaster follows (ui/toaster.tsx on Sonner, mounted once in the
   portal layout): one attempt as one promise with the surface's own meaning
   of success. `toast.promise` shows the working verb while the attempt runs
   and the saved sentence only once the server confirmed the work. A surface
   that keeps its failure beside the form (the add-request sheet, the note
   composer) gives the toast no error branch, so a failed attempt dismisses
   the working toast and the form says what went wrong; a surface with no
   form to point at (the request work panel) reads the failure off the
   rejection. The home record card keeps its own follower with the card's
   richer failure shape (record-card-save.ts). */

/** A result that did not succeed, carried as the rejection the toast follows; its message is the sentence the surface would say. */
export class Rejected extends Error {
  constructor(message: string, options?: Readonly<ErrorOptions>) {
    super(message, options);
    this.name = "Rejected";
  }
}

const UNSAID = "The attempt did not succeed.";

/** The promise a toast follows: it resolves only with a result the guard accepts and rejects with a `Rejected` otherwise. An attempt that throws rejects with its cause, so the surface's own handling of a thrown action still applies. */
export async function followed<Success, Failure>(
  attempt: Promise<Success | Failure>,
  succeeded: (result: Success | Failure) => result is Success,
  describe: (failure: Failure) => string = () => UNSAID,
): Promise<Success> {
  const result: Success | Failure = await attempt;
  if (succeeded(result)) return result;
  throw new Rejected(describe(result));
}

/** The sentence a rejection carries, or the fallback when the attempt threw instead. */
export function rejectionMessage(cause: unknown, fallback: string): string {
  return cause instanceof Rejected ? cause.message : fallback;
}

/** A toast that settles on its own: the toaster's timeout, no close button, no
   action, nothing to hear. Sonner merges an update over the toast it replaces,
   so a consumer that reuses an id spreads this to reset, by name, the
   open-ended state an earlier result may have set. */
export const SETTLED_TOAST = {
  duration: undefined,
  closeButton: undefined,
  action: undefined,
  onDismiss: undefined,
} as const;
