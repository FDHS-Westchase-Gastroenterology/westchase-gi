import type { TextFilterParam } from "./types";

/* Text search shares the definition shape so it lives in the same URL and the
   same bar as every other filter. Length cap mirrors the requests surface's
   REQUEST_SEARCH_MAX_LENGTH. */
const MAX_LENGTH = 100;

/* Strip control characters (Unicode category Cc), collapse runs of whitespace. */
const CONTROL = /\p{Cc}/gu;

export const searchFilter: TextFilterParam = {
  key: "search",
  label: "Search",
  type: "text",
  placeholder: "Name or phone…",
  hint: "Matches name or phone. Applies as you type.",
  encode: (value) => value,
  decode: (raw) => {
    const value = raw.replaceAll(CONTROL, "").replaceAll(/\s+/gu, " ").trim().slice(0, MAX_LENGTH);
    return value === "" ? null : value;
  },
};
