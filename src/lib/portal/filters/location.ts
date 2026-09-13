import type { RequestLocation } from "@/lib/portal/contracts";

import type { MultiSelectFilterParam } from "./types";

/* The option set and its labels are this filter's contract — deliberately
   self-contained so the definition stays importable outside `src/app` (the
   phase-2 NL route imports definitions server-side). */
const LOCATION_OPTIONS: readonly { value: RequestLocation; label: string }[] = [
  { value: "tampa", label: "Tampa" },
  { value: "lutz", label: "Lutz" },
  { value: "any", label: "Either office" },
];

function isRequestLocation(value: string): value is RequestLocation {
  return LOCATION_OPTIONS.some((option) => option.value === value);
}

/** Multi-select over the request's preferred office. */
export const locationFilter: MultiSelectFilterParam = {
  key: "location",
  label: "Location",
  type: "multi-select",
  anyLabel: "Any location",
  options: LOCATION_OPTIONS,
  encode: (value) => value.join(","),
  decode: (raw) => {
    const values = [...new Set(raw.split(",").filter(isRequestLocation))];
    return values.length > 0 ? values : null;
  },
};
