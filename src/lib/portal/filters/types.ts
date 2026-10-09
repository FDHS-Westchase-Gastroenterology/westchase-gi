/* The portal's filter language (portal-home-redesign-brief §4).
   One type-safe definition per filter: the definition is the single source of
   truth for its URL key, its editor shape, its options, and its encoding.
   Definitions are isomorphic — importable in client code and in a future API
   route (the phase-2 natural-language path) — so nothing here may touch the
   DOM, the database, or server-only modules. */

export type FilterKey = "status" | "location" | "received" | "search";

export interface FilterOption {
  readonly value: string;
  readonly label: string;
  /** The parent option this one sits under, when the dimension is a tree. */
  readonly group?: string;
}

/* A parent option: its value is URL shorthand for every member, and its
   label speaks for them when all are selected. A named subset speaks for an
   exact partial selection ("Call again · due"). */
export interface FilterGroup {
  readonly value: string;
  readonly label: string;
  readonly subsets: readonly { readonly label: string; readonly values: readonly string[] }[];
}

/** An inclusive epoch-ms range. Travels raw in the URL; renders practice-local. */
export interface DateRange {
  readonly from: number;
  readonly to: number;
}

interface FilterParamBase<Value> {
  readonly key: FilterKey;
  readonly label: string;
  /** Encode a value as the single URL param this filter owns. */
  readonly encode: (value: Value) => string;
  /** Read a value back out of its raw param — null means malformed, drop it. */
  readonly decode: (raw: string) => Value | null;
}

export interface MultiSelectFilterParam extends FilterParamBase<readonly string[]> {
  readonly type: "multi-select";
  readonly anyLabel: string;
  /** Leaf options in canonical order; a grouped leaf names its parent. */
  readonly options: readonly FilterOption[];
  readonly groups: readonly FilterGroup[];
  /** The pill a bare URL carries. A dimension with a default spells its
      absence `key=any`. */
  readonly defaultRaw?: string;
}

export interface DateFilterParam extends FilterParamBase<DateRange> {
  readonly type: "date";
  readonly anyLabel: string;
}

export interface TextFilterParam extends FilterParamBase<string> {
  readonly type: "text";
  readonly placeholder: string;
  readonly hint: string;
}

export type FilterParam = MultiSelectFilterParam | DateFilterParam | TextFilterParam;

/** One active filter as the URL carries it: param order is pill order. */
export interface ActiveFilter {
  readonly key: FilterKey;
  readonly raw: string;
}
