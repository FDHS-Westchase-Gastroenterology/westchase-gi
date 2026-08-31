"use client";

import { useEffect, useRef, useState } from "react";

import {
  datePresets,
  filterByKey,
  filterValueLabel,
  HOME_FILTERS,
  matchesPreset,
  msToNyDay,
  nyEndOfDayMs,
  nyStartOfDayMs,
} from "@/lib/portal/filters";
import type {
  ActiveFilter,
  DateFilterParam,
  FilterKey,
  FilterParam,
  MultiSelectFilterParam,
  SelectFilterParam,
  TextFilterParam,
} from "@/lib/portal/filters";

import type { FilterSuggestion } from "./home-line";
import { HomePopover, HomePopoverContent, HomePopoverTrigger } from "./parts/popover";

/* The filter bar (brief §2.2): Add Filter, then active pills in URL order,
   then suggestion pills. Every toggle applies instantly — URL, pill label,
   and list update per click; there is no Apply button and no dirty state. */

interface FilterBarProps {
  readonly active: readonly ActiveFilter[];
  readonly suggestions: readonly FilterSuggestion[];
  readonly nowMs: number;
  readonly setParam: (key: FilterKey, raw: string | null) => void;
  readonly onRemove: (key: FilterKey) => void;
  readonly onActivate: (suggestion: FilterSuggestion) => void;
}

export function FilterBar({
  active,
  suggestions,
  nowMs,
  setParam,
  onRemove,
  onActivate,
}: FilterBarProps) {
  return (
    <div role="toolbar" aria-label="Filters" className="wgi-filter-bar print-hide">
      <AddFilterButton active={active} nowMs={nowMs} setParam={setParam} />
      {active.map((entry) => (
        <ActivePill
          key={entry.key}
          entry={entry}
          nowMs={nowMs}
          setParam={setParam}
          onRemove={() => {
            onRemove(entry.key);
          }}
        />
      ))}
      {suggestions.map((suggestion) => {
        const def = filterByKey(suggestion.key);
        return (
          <button
            key={`${suggestion.key}:${suggestion.raw}`}
            type="button"
            className="wgi-sug"
            onClick={() => {
              onActivate(suggestion);
            }}
          >
            <span className="wgi-pill-key">{def.label}</span>
            <span className="wgi-pill-value">{filterValueLabel(def, suggestion.raw, nowMs)}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---- Add Filter: the same popover, category list first ---- */

function AddFilterButton({
  active,
  nowMs,
  setParam,
}: Readonly<{
  active: readonly ActiveFilter[];
  nowMs: number;
  setParam: (key: FilterKey, raw: string | null) => void;
}>) {
  const [open, setOpen] = useState(false);
  const [viewKey, setViewKey] = useState<FilterKey | null>(null);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const close = () => {
    setOpen(false);
  };

  const categories = HOME_FILTERS.filter((def) => def.label.toLowerCase().includes(q));
  const viewDef = viewKey === null ? null : filterByKey(viewKey);
  const viewRaw =
    viewKey === null ? null : (active.find((entry) => entry.key === viewKey)?.raw ?? null);

  return (
    <HomePopover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setViewKey(null);
          setQuery("");
        }
      }}
    >
      <HomePopoverTrigger render={<button type="button" className="wgi-add-filter" />}>
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 6h18" />
          <path d="M7 12h10" />
          <path d="M11 18h4" />
        </svg>
        Add filter
      </HomePopoverTrigger>
      <HomePopoverContent className="wgi-editor" aria-label="Add filter">
        {viewDef === null ? (
          <>
            <input
              // react-doctor-disable-next-line react-doctor/no-autofocus -- focus lands in the just-opened popover's search input (a user-initiated open), not page-load focus stealing
              autoFocus
              aria-label="Search filters"
              className="wgi-editor-input"
              placeholder="Filter by…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
            />
            <div className="wgi-editor-body">
              {categories.map((def) => (
                <div key={def.key} className="wgi-editor-opt">
                  <button
                    type="button"
                    className="wgi-editor-row"
                    onClick={() => {
                      setViewKey(def.key);
                      setQuery("");
                    }}
                  >
                    {def.label}
                    <svg
                      data-chevron="true"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <FilterEditor
            def={viewDef}
            raw={viewRaw}
            nowMs={nowMs}
            setParam={setParam}
            close={close}
          />
        )}
      </HomePopoverContent>
    </HomePopover>
  );
}

/* ---- Active pill: label button opens the editor, × removes ---- */

function ActivePill({
  entry,
  nowMs,
  setParam,
  onRemove,
}: Readonly<{
  entry: ActiveFilter;
  nowMs: number;
  setParam: (key: FilterKey, raw: string | null) => void;
  onRemove: () => void;
}>) {
  const def = filterByKey(entry.key);
  const [open, setOpen] = useState(false);

  return (
    <span className="wgi-pill" data-pill={entry.key}>
      <HomePopover open={open} onOpenChange={setOpen}>
        <HomePopoverTrigger render={<button type="button" className="wgi-pill-label" />}>
          <span className="wgi-pill-key">{def.label}</span>
          <span className="wgi-pill-value">{filterValueLabel(def, entry.raw, nowMs)}</span>
        </HomePopoverTrigger>
        <HomePopoverContent className="wgi-editor" aria-label={`Filter by ${def.label}`}>
          <FilterEditor
            def={def}
            raw={entry.raw}
            nowMs={nowMs}
            setParam={setParam}
            close={() => {
              setOpen(false);
            }}
          />
        </HomePopoverContent>
      </HomePopover>
      <button
        type="button"
        className="wgi-pill-remove"
        aria-label={`Remove ${def.label} filter`}
        onClick={onRemove}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </span>
  );
}

/* ---- Editors ---- */

function FilterEditor({
  def,
  raw,
  nowMs,
  setParam,
  close,
}: Readonly<{
  def: FilterParam;
  raw: string | null;
  nowMs: number;
  setParam: (key: FilterKey, raw: string | null) => void;
  close: () => void;
}>) {
  if (def.type === "text") {
    return <TextEditor def={def} raw={raw} setParam={setParam} />;
  }
  return <OptionEditor def={def} raw={raw} nowMs={nowMs} setParam={setParam} close={close} />;
}

function CheckGlyph() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/* Multi-select (checkbox rows + hover `Only`/`Check`), select (single ✓),
   and date (presets + custom range) share one shell: search input, an
   "Any …" escape row, then the option rows. */
function OptionEditor({
  def,
  raw,
  nowMs,
  setParam,
  close,
}: Readonly<{
  def: MultiSelectFilterParam | SelectFilterParam | DateFilterParam;
  raw: string | null;
  nowMs: number;
  setParam: (key: FilterKey, raw: string | null) => void;
  close: () => void;
}>) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const range = def.type === "date" && raw !== null ? def.decode(raw) : null;
  const presets = def.type === "date" ? datePresets(nowMs) : [];
  const isCustomRange =
    def.type === "date" &&
    range !== null &&
    !presets.some((preset) => matchesPreset(preset, range, nowMs));

  const [fromDraft, setFromDraft] = useState(() =>
    range !== null && isCustomRange ? msToNyDay(range.from) : "",
  );
  const [toDraft, setToDraft] = useState(() =>
    range !== null && isCustomRange ? msToNyDay(range.to) : "",
  );
  const [rangeOpen, setRangeOpen] = useState(isCustomRange);

  const applyRange = (fromDay: string, toDay: string) => {
    if (fromDay === "" || toDay === "") return;
    const from = nyStartOfDayMs(fromDay);
    const to = nyEndOfDayMs(toDay);
    if (from !== null && to !== null && from <= to) setParam("received", `${from}-${to}`);
  };

  /* `selected` keeps encode order; the Set answers membership in the rows. */
  const selected = def.type === "multi-select" && raw !== null ? (def.decode(raw) ?? []) : [];
  const selectedSet = new Set(selected);

  return (
    <>
      <input
        // react-doctor-disable-next-line react-doctor/no-autofocus -- focus lands in the just-opened popover's search input (a user-initiated open), not page-load focus stealing
        autoFocus
        aria-label="Search options"
        className="wgi-editor-input"
        placeholder="Filter to…"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
        }}
      />
      <div className="wgi-editor-body">
        <div className="wgi-editor-opt">
          <button
            type="button"
            data-muted="true"
            className="wgi-editor-row"
            onClick={() => {
              setParam(def.key, null);
              close();
            }}
          >
            {def.anyLabel}
          </button>
        </div>

        {def.type === "multi-select"
          ? def.options.flatMap((option) => {
              if (!option.label.toLowerCase().includes(q)) return [];
              const checked = selectedSet.has(option.value);
              return (
                <div key={option.value} className="wgi-editor-opt">
                  <button
                    type="button"
                    className="wgi-editor-row"
                    aria-pressed={checked}
                    onClick={() => {
                      const next = checked
                        ? selected.filter((value) => value !== option.value)
                        : [...selected, option.value];
                      if (next.length === 0) {
                        setParam(def.key, null);
                        close();
                        return;
                      }
                      setParam(def.key, def.encode(next));
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="wgi-editor-box"
                      data-checked={checked || undefined}
                    >
                      {checked ? <CheckGlyph /> : null}
                    </span>
                    {option.label}
                  </button>
                  <button
                    type="button"
                    className="wgi-editor-quick"
                    aria-label={checked ? `Only ${option.label}` : `Check ${option.label}`}
                    onClick={() => {
                      setParam(
                        def.key,
                        def.encode(checked ? [option.value] : [...selected, option.value]),
                      );
                    }}
                  >
                    {checked ? "Only" : "Check"}
                  </button>
                </div>
              );
            })
          : null}

        {def.type === "select"
          ? def.options.flatMap((option) => {
              if (!option.label.toLowerCase().includes(q)) return [];
              const checked = raw !== null && def.decode(raw) === option.value;
              return (
                <div key={option.value} className="wgi-editor-opt">
                  <button
                    type="button"
                    className="wgi-editor-row"
                    aria-pressed={checked}
                    onClick={() => {
                      setParam(def.key, def.encode(option.value));
                    }}
                  >
                    <span aria-hidden="true" className="wgi-editor-tick">
                      {checked ? (
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      ) : null}
                    </span>
                    {option.label}
                  </button>
                </div>
              );
            })
          : null}

        {def.type === "date" ? (
          <>
            {presets.flatMap((preset) => {
              if (!preset.label.toLowerCase().includes(q)) return [];
              const checked = range !== null && matchesPreset(preset, range, nowMs);
              return (
                <div key={preset.id} className="wgi-editor-opt">
                  <button
                    type="button"
                    className="wgi-editor-row"
                    aria-pressed={checked}
                    onClick={() => {
                      setRangeOpen(false);
                      setFromDraft("");
                      setToDraft("");
                      setParam(def.key, def.encode(preset.range));
                    }}
                  >
                    <span aria-hidden="true" className="wgi-editor-tick">
                      {checked ? (
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      ) : null}
                    </span>
                    {preset.label}
                  </button>
                </div>
              );
            })}
            <div className="wgi-editor-opt">
              <button
                type="button"
                className="wgi-editor-row"
                aria-pressed={isCustomRange}
                onClick={() => {
                  const seededFrom =
                    fromDraft === "" ? msToNyDay(nowMs - 14 * 86_400_000) : fromDraft;
                  const seededTo = toDraft === "" ? msToNyDay(nowMs) : toDraft;
                  setFromDraft(seededFrom);
                  setToDraft(seededTo);
                  setRangeOpen(true);
                  applyRange(seededFrom, seededTo);
                }}
              >
                <span aria-hidden="true" className="wgi-editor-tick">
                  {isCustomRange ? (
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  ) : null}
                </span>
                Custom range
              </button>
            </div>
            {rangeOpen || isCustomRange || fromDraft !== "" || toDraft !== "" ? (
              <div className="wgi-editor-range">
                <label>
                  From
                  <input
                    type="date"
                    value={fromDraft}
                    onChange={(event) => {
                      setFromDraft(event.target.value);
                      applyRange(event.target.value, toDraft);
                    }}
                  />
                </label>
                <label>
                  To
                  <input
                    type="date"
                    value={toDraft}
                    onChange={(event) => {
                      setToDraft(event.target.value);
                      applyRange(fromDraft, event.target.value);
                    }}
                  />
                </label>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </>
  );
}

function TextEditor({
  def,
  raw,
  setParam,
}: Readonly<{
  def: TextFilterParam;
  raw: string | null;
  setParam: (key: FilterKey, raw: string | null) => void;
}>) {
  const [draft, setDraft] = useState(() => (raw === null ? "" : (def.decode(raw) ?? "")));
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  return (
    <>
      <input
        // react-doctor-disable-next-line react-doctor/no-autofocus -- focus lands in the just-opened popover's text input (a user-initiated open), not page-load focus stealing
        autoFocus
        aria-label={def.label}
        className="wgi-editor-input"
        placeholder={def.placeholder}
        value={draft}
        onChange={(event) => {
          const value = event.target.value;
          setDraft(value);
          if (timer.current !== null) window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => {
            setParam(def.key, value.trim() === "" ? null : value.trim());
          }, 150);
        }}
      />
      <p className="wgi-editor-hint">{def.hint}</p>
    </>
  );
}
