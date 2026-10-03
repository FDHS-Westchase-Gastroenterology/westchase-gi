/* The open record's address (issue #356). A record sheet is part of the
   URL, `?request=<id>` for a request and `?patient=<id>` for a patient's
   record, so a reload, Back, or a pasted link reopens it. Home and the
   Schedule both write it through the History API, which Next keeps in step
   with `useSearchParams`, so opening a record never round-trips the
   server. Every other parameter, the filters among them, stays as it is. */

const RECORD_PARAMS = ["request", "patient"] as const;

export type RecordParam = (typeof RECORD_PARAMS)[number];

/** The address with the open record set to `id`, or with none when `id` is null. */
export function recordHref(param: RecordParam, id: string | null): string {
  const params = new URLSearchParams(window.location.search);
  for (const name of RECORD_PARAMS) params.delete(name);
  if (id !== null) params.set(param, id);
  const query = params.toString();
  return `${window.location.pathname}${query === "" ? "" : `?${query}`}`;
}
