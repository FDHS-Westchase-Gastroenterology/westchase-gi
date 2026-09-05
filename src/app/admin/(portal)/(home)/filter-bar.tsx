"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";

import {
  datePresets,
  dayLabel,
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

import { suggestionId } from "./home-line";
import type { FilterSuggestion } from "./home-line";
import { HomeRangeCalendar } from "./parts/calendar";
import { HomePopover, HomePopoverContent, HomePopoverTrigger } from "./parts/popover";

/* The filter bar (brief §2.2): Add Filter, then active pills in URL order,
   then suggestion pills. Every toggle applies instantly — URL, pill label,
   and list update per click. The one exception is the Received editor's
   custom range, which takes over the popover and holds a draft until Apply
   (filter-bar brief §5.5). */

interface FilterBarProps {
  readonly active: readonly ActiveFilter[];
  readonly suggestions: readonly FilterSuggestion[];
  readonly nowMs: number;
  readonly setParam: (key: FilterKey, raw: string | null) => void;
  readonly onRemove: (key: FilterKey) => void;
  readonly onActivate: (suggestion: FilterSuggestion) => void;
}

type SetParam = (key: FilterKey, raw: string | null) => void;

/* The popover swaps its whole content between views (category list,
   editor, the Received calendar). If the button that was clicked is still
   focused when it leaves the DOM, the popover's focus manager re-homes
   focus to the popup a beat *after* the new view's autoFocus — and wins.
   Parking focus on the popup first means nothing focused is removed, and
   the new view's autoFocus stands. */
function parkFocus(event: MouseEvent<HTMLElement>): void {
  event.currentTarget.closest<HTMLElement>('[data-slot="popover-content"]')?.focus();
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
            key={suggestionId(suggestion)}
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
  setParam: SetParam;
}>) {
  const [open, setOpen] = useState(false);
  const [viewKey, setViewKey] = useState<FilterKey | null>(null);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

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
                    onClick={(event) => {
                      parkFocus(event);
                      setViewKey(def.key);
                      setQuery("");
                    }}
                  >
                    {def.label}
                    <ChevronRightGlyph />
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <FilterEditor
            key={viewDef.key}
            def={viewDef}
            raw={viewRaw}
            nowMs={nowMs}
            setParam={setParam}
            onBack={() => {
              setViewKey(null);
              setQuery("");
            }}
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
  setParam: SetParam;
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
          <FilterEditor def={def} raw={entry.raw} nowMs={nowMs} setParam={setParam} />
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

/* An editor reached through Add filter carries `onBack`: the "<Dimension> ⌄"
   header beside its search box returns to the category list so another
   dimension is one click away. An editor opened from a chip has no header —
   just the box, scoped to that chip's dimension. */
function FilterEditor({
  def,
  raw,
  nowMs,
  setParam,
  onBack,
}: Readonly<{
  def: FilterParam;
  raw: string | null;
  nowMs: number;
  setParam: SetParam;
  onBack?: () => void;
}>) {
  if (def.type === "text") {
    return <TextEditor def={def} raw={raw} setParam={setParam} onBack={onBack} />;
  }
  if (def.type === "date") {
    return <DateEditor def={def} raw={raw} nowMs={nowMs} setParam={setParam} onBack={onBack} />;
  }
  return <OptionEditor def={def} raw={raw} setParam={setParam} onBack={onBack} />;
}

/* "<Dimension> ⌄": the header pill that goes up one level. */
function DimButton({
  label,
  onClick,
}: Readonly<{ label: string; onClick: (event: MouseEvent<HTMLElement>) => void }>) {
  return (
    <button type="button" className="wgi-editor-dim" onClick={onClick}>
      {label}
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );
}

function EditorHead({
  label,
  onBack,
  children,
}: Readonly<{ label: string; onBack: (() => void) | undefined; children: ReactNode }>) {
  if (onBack === undefined) return <>{children}</>;
  return (
    <div className="wgi-editor-head">
      <DimButton label={label} onClick={onBack} />
      {children}
    </div>
  );
}

/* The row-end chevron: this row opens another level. */
function ChevronRightGlyph() {
  return (
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
  );
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

function TickGlyph() {
  return (
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
  );
}

/* Multi-select (checkbox + label as two targets) and select (single ✓)
   share one shell: search box, an "Any …" escape row that carries ✓ in the
   resting state, then the option rows. */
function OptionEditor({
  def,
  raw,
  setParam,
  onBack,
}: Readonly<{
  def: MultiSelectFilterParam | SelectFilterParam;
  raw: string | null;
  setParam: SetParam;
  onBack: (() => void) | undefined;
}>) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  return (
    <>
      <EditorHead label={def.label} onBack={onBack}>
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
      </EditorHead>
      <div className="wgi-editor-body">
        {def.type === "multi-select" ? (
          <MultiSelectRows def={def} raw={raw} q={q} setParam={setParam} />
        ) : null}
        {def.type === "select" ? (
          <SelectRows def={def} raw={raw} q={q} setParam={setParam} />
        ) : null}
      </div>
    </>
  );
}

function AnyRow({
  label,
  checked,
  onChoose,
}: Readonly<{ label: string; checked: boolean; onChoose: () => void }>) {
  return (
    <div className="wgi-editor-opt">
      <button
        type="button"
        data-muted="true"
        className="wgi-editor-row"
        aria-pressed={checked}
        onClick={onChoose}
      >
        <span aria-hidden="true" className="wgi-editor-tick">
          {checked ? <TickGlyph /> : null}
        </span>
        {label}
      </button>
    </div>
  );
}

/* Resting state is every value checked and no param (filter-bar brief §5.3):
   a full set never writes a chip, and unchecking the last value restores the
   set. Each row is two targets — the checkbox toggles one value; the label
   isolates it (Only) or, on the sole checked value, brings all back. */
function MultiSelectRows({
  def,
  raw,
  q,
  setParam,
}: Readonly<{
  def: MultiSelectFilterParam;
  raw: string | null;
  q: string;
  setParam: SetParam;
}>) {
  const allValues = def.options.map((option) => option.value);
  const decoded = raw === null ? null : def.decode(raw);
  /* `selected` keeps encode order; the Set answers membership in the rows. */
  const selected = decoded === null || decoded.length === allValues.length ? allValues : decoded;
  const selectedSet = new Set(selected);
  const allChecked = selected.length === allValues.length;

  const commit = (next: readonly string[]) => {
    setParam(
      def.key,
      next.length === 0 || next.length === allValues.length ? null : def.encode(next),
    );
  };

  return (
    <>
      <AnyRow
        label={def.anyLabel}
        checked={allChecked}
        onChoose={() => {
          commit(allValues);
        }}
      />
      {def.options.flatMap((option) => {
        if (!option.label.toLowerCase().includes(q)) return [];
        const checked = selectedSet.has(option.value);
        const sole = checked && selected.length === 1;
        return (
          <div key={option.value} className="wgi-editor-opt" data-multi="true">
            <button
              type="button"
              role="checkbox"
              aria-checked={checked}
              aria-label={`${checked ? "Uncheck" : "Check"} ${option.label}`}
              className="wgi-editor-check"
              onClick={() => {
                commit(
                  checked
                    ? selected.filter((value) => value !== option.value)
                    : [...selected, option.value],
                );
              }}
            >
              <span
                aria-hidden="true"
                className="wgi-editor-box"
                data-checked={checked || undefined}
              >
                {checked ? <CheckGlyph /> : null}
              </span>
            </button>
            <button
              type="button"
              className="wgi-editor-row"
              aria-label={sole ? `${option.label}: Check all` : `${option.label}: Only`}
              onClick={() => {
                commit(sole ? allValues : [option.value]);
              }}
            >
              {option.label}
            </button>
            <span aria-hidden="true" className="wgi-editor-quick" data-target="check">
              {checked ? "Uncheck" : "Check"}
            </span>
            <span aria-hidden="true" className="wgi-editor-quick" data-target="label">
              {sole ? "Check all" : "Only"}
            </span>
          </div>
        );
      })}
    </>
  );
}

function SelectRows({
  def,
  raw,
  q,
  setParam,
}: Readonly<{
  def: SelectFilterParam;
  raw: string | null;
  q: string;
  setParam: SetParam;
}>) {
  const current = raw === null ? null : def.decode(raw);
  return (
    <>
      <AnyRow
        label={def.anyLabel}
        checked={current === null}
        onChoose={() => {
          setParam(def.key, null);
        }}
      />
      {def.options.flatMap((option) => {
        if (!option.label.toLowerCase().includes(q)) return [];
        const checked = current === option.value;
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
                {checked ? <TickGlyph /> : null}
              </span>
              {option.label}
            </button>
          </div>
        );
      })}
    </>
  );
}

/* Presets apply on click, as every other toggle does. Custom range is the
   one deliberate step in the bar, and it takes the whole popover (the Vercel
   model): the row swaps the list for the calendar with Start, End, and
   Apply beneath it; the header's "Received ⌄" brings the list back; and
   nothing — list, chip, URL — moves until Apply. A chip already holding a
   custom range opens straight onto the calendar with that range in place. */
function DateEditor({
  def,
  raw,
  nowMs,
  setParam,
  onBack,
}: Readonly<{
  def: DateFilterParam;
  raw: string | null;
  nowMs: number;
  setParam: SetParam;
  onBack: (() => void) | undefined;
}>) {
  const range = raw === null ? null : def.decode(raw);
  const presets = datePresets(nowMs);
  const isCustomRange =
    range !== null && !presets.some((preset) => matchesPreset(preset, range, nowMs));

  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "range">(isCustomRange ? "range" : "list");
  const [fromDraft, setFromDraft] = useState(() =>
    range !== null && isCustomRange ? msToNyDay(range.from) : "",
  );
  const [toDraft, setToDraft] = useState(() =>
    range !== null && isCustomRange ? msToNyDay(range.to) : "",
  );

  /* Day strings compare as dates (YYYY-MM-DD), so a reversed draft cannot apply. */
  const draftValid = fromDraft !== "" && toDraft !== "" && fromDraft <= toDraft;

  const apply = () => {
    const from = nyStartOfDayMs(fromDraft);
    const to = nyEndOfDayMs(toDraft);
    if (from !== null && to !== null && from <= to) setParam(def.key, def.encode({ from, to }));
  };

  if (view === "range") {
    return (
      <>
        <div className="wgi-editor-head">
          <DimButton
            label={def.label}
            onClick={(event) => {
              parkFocus(event);
              setView("list");
            }}
          />
          {/* The readout is the template — Start – End — filling in as the draft does. */}
          <span className="wgi-editor-readout" data-empty={fromDraft === "" || undefined}>
            {fromDraft === "" ? "Start" : dayLabel(fromDraft)}
            {" – "}
            {toDraft === "" ? "End" : dayLabel(toDraft)}
          </span>
        </div>
        <div className="wgi-editor-range">
          <HomeRangeCalendar
            from={fromDraft}
            to={toDraft}
            fallbackMonth={msToNyDay(nowMs)}
            onChange={(from, to) => {
              setFromDraft(from);
              setToDraft(to);
            }}
          />
          <div className="wgi-editor-range-fields">
            <label>
              Start
              <input
                type="date"
                value={fromDraft}
                onChange={(event) => {
                  setFromDraft(event.target.value);
                }}
              />
            </label>
            <label>
              End
              <input
                type="date"
                value={toDraft}
                onChange={(event) => {
                  setToDraft(event.target.value);
                }}
              />
            </label>
            <button
              type="button"
              className="wgi-editor-apply"
              disabled={!draftValid}
              onClick={apply}
            >
              Apply
            </button>
          </div>
        </div>
      </>
    );
  }

  const q = query.trim().toLowerCase();
  return (
    <>
      <EditorHead label={def.label} onBack={onBack}>
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
      </EditorHead>
      <div className="wgi-editor-body">
        <AnyRow
          label={def.anyLabel}
          checked={range === null}
          onChoose={() => {
            setParam(def.key, null);
          }}
        />
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
                  setParam(def.key, def.encode(preset.range));
                }}
              >
                <span aria-hidden="true" className="wgi-editor-tick">
                  {checked ? <TickGlyph /> : null}
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
            onClick={(event) => {
              parkFocus(event);
              setQuery("");
              setView("range");
            }}
          >
            <span aria-hidden="true" className="wgi-editor-tick">
              {isCustomRange ? <TickGlyph /> : null}
            </span>
            Custom range
            <ChevronRightGlyph />
          </button>
        </div>
      </div>
    </>
  );
}

function TextEditor({
  def,
  raw,
  setParam,
  onBack,
}: Readonly<{
  def: TextFilterParam;
  raw: string | null;
  setParam: SetParam;
  onBack: (() => void) | undefined;
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
      <EditorHead label={def.label} onBack={onBack}>
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
      </EditorHead>
      <p className="wgi-editor-hint">{def.hint}</p>
    </>
  );
}
