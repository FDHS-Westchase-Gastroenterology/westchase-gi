import { REQUEST_STATUSES } from "@/lib/portal/workflow/contracts";
import type { RequestStatus } from "@/lib/portal/workflow/contracts";

import { FOLLOW_UP_VALUES, FOLLOW_UP_WORDS } from "./follow-up";
import type { FollowUpValue } from "./follow-up";
import type { FilterOption, MultiSelectFilterParam } from "./types";

/* The flat list speaks in next actions, so `contacted` reads as the thing it
   asks of staff — Call again — not as a past-tense fact. This is display
   vocabulary only; the URL and the predicate keep the durable status ids. */
export const STATUS_WORDS = {
  new: "New",
  contacted: "Call again",
  scheduled: "Scheduled",
  closed: "Closed",
} as const satisfies Record<RequestStatus, string>;

/* The Status filter is a two-level tree. Call again is the one status the
   desk works on a clock, so it opens into its follow-up standings; the other
   statuses are leaves. A row matches exactly one leaf. */
export type StatusLeaf = Exclude<RequestStatus, "contacted"> | FollowUpValue;

/** The calls due now: behind, due today, or never given a date. */
const CALL_AGAIN_DUE: readonly FollowUpValue[] = ["overdue", "due_today", "needs_date"];

const STATUS_OPTIONS: readonly FilterOption[] = REQUEST_STATUSES.flatMap<FilterOption>((status) =>
  status === "contacted"
    ? FOLLOW_UP_VALUES.map((value) => ({
        value,
        label: FOLLOW_UP_WORDS[value],
        group: "contacted",
      }))
    : [{ value: status, label: STATUS_WORDS[status] }],
);

const CALL_AGAIN_GROUP = {
  value: "contacted",
  label: STATUS_WORDS.contacted,
  subsets: [{ label: `${STATUS_WORDS.contacted} · due`, values: CALL_AGAIN_DUE }],
} as const;

/** The leaf a line counts as: its status, or a Call again row's standing. */
export function statusLeaf(status: RequestStatus, followUp: FollowUpValue | null): StatusLeaf {
  /* The server gives every Call again row a standing; a row without one has
     no date the desk is behind on, so it waits with the upcoming calls. */
  return status === "contacted" ? (followUp ?? "upcoming") : status;
}

function leafValues(raw: string): string[] {
  return raw
    .split(",")
    .flatMap((value) =>
      value === CALL_AGAIN_GROUP.value
        ? [...FOLLOW_UP_VALUES]
        : STATUS_OPTIONS.some((option) => option.value === value)
          ? [value]
          : [],
    );
}

/* New plus the calls due now: what the desk works first. Scheduled and
   Closed need nothing from the desk, and an upcoming call needs nothing
   until its day, so none of them fill the list unasked. */
export const STATUS_DEFAULT_RAW = ["new", ...CALL_AGAIN_DUE].join(",");

/** Multi-select over the status leaves; comma-joined in one param, canonical
    order, with `contacted` standing in for all four standings. */
export const statusFilter: MultiSelectFilterParam = {
  key: "status",
  label: "Status",
  type: "multi-select",
  anyLabel: "Any status",
  options: STATUS_OPTIONS,
  groups: [CALL_AGAIN_GROUP],
  defaultRaw: STATUS_DEFAULT_RAW,
  encode: (value) => {
    const chosen = new Set(value);
    const whole = FOLLOW_UP_VALUES.every((leaf) => chosen.has(leaf));
    return STATUS_OPTIONS.flatMap((option) => {
      if (!chosen.has(option.value)) return [];
      if (!whole || option.group === undefined) return [option.value];
      return option.value === FOLLOW_UP_VALUES[0] ? [CALL_AGAIN_GROUP.value] : [];
    }).join(",");
  },
  decode: (raw) => {
    const chosen = new Set(leafValues(raw));
    const values = STATUS_OPTIONS.flatMap((option) =>
      chosen.has(option.value) ? [option.value] : [],
    );
    return values.length > 0 ? values : null;
  },
};
