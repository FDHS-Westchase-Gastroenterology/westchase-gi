import type { SelectFilterParam } from "./types";

/* The derived buckets home itself runs on. `scheduled` and `closed` are
   statuses, not attention states, so the filter offers only the four buckets
   that say something the status column does not. */
export const ATTENTION_VALUES = ["new", "follow_up", "stale", "upcoming"] as const;
export type AttentionValue = (typeof ATTENTION_VALUES)[number];

const ATTENTION_LABELS = {
  new: "New",
  follow_up: "Follow-up due",
  stale: "Gone quiet",
  upcoming: "Later days",
} as const satisfies Record<AttentionValue, string>;

function isAttentionValue(value: string): value is AttentionValue {
  return ATTENTION_VALUES.some((candidate) => candidate === value);
}

/** Single select over the derived attention buckets. */
export const attentionFilter: SelectFilterParam = {
  key: "attention",
  label: "Attention",
  type: "select",
  anyLabel: "Any attention",
  options: ATTENTION_VALUES.map((value) => ({ value, label: ATTENTION_LABELS[value] })),
  encode: (value) => value,
  decode: (raw) => (isAttentionValue(raw) ? raw : null),
};
