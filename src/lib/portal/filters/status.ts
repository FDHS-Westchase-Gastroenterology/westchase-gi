import { REQUEST_STATUSES } from "@/lib/portal/contracts";
import type { RequestStatus } from "@/lib/portal/contracts";

import type { MultiSelectFilterParam } from "./types";

/* The flat list speaks in next actions, so `contacted` reads as the thing it
   asks of staff — Call again — not as a past-tense fact. This is display
   vocabulary only; the URL and the predicate keep the durable status ids. */
export const STATUS_WORDS = {
  new: "New",
  contacted: "Call again",
  scheduled: "Scheduled",
  closed: "Closed",
} as const satisfies Record<RequestStatus, string>;

function isRequestStatus(value: string): value is RequestStatus {
  return REQUEST_STATUSES.some((candidate) => candidate === value);
}

/** Multi-select over the four presentation statuses; comma-joined in one param. */
export const statusFilter: MultiSelectFilterParam = {
  key: "status",
  label: "Status",
  type: "multi-select",
  anyLabel: "Any status",
  options: REQUEST_STATUSES.map((status) => ({ value: status, label: STATUS_WORDS[status] })),
  encode: (value) => value.join(","),
  decode: (raw) => {
    const values = [...new Set(raw.split(",").filter(isRequestStatus))];
    return values.length > 0 ? values : null;
  },
};
