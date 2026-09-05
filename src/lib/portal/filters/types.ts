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
  readonly options: readonly FilterOption[];
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

/** The decoded value shape a given definition produces. */
export type FilterValue<P extends FilterParam> = P extends MultiSelectFilterParam
  ? readonly string[]
  : P extends DateFilterParam
    ? DateRange
    : string;

/** One active filter as the URL carries it: param order is pill order. */
export interface ActiveFilter {
  readonly key: FilterKey;
  readonly raw: string;
}
