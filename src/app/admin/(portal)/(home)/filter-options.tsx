"use client";

import type { ReactNode } from "react";

import type { FilterKey, MultiSelectFilterParam } from "@/lib/portal/filters";

/* The editor's option rows: the "Any …" escape row and the multi-select
   checkbox rows, shared by every multi-select dimension and by the Received
   presets. */

type SetParam = (key: FilterKey, raw: string | null) => void;

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

/* The mixed box: some of a parent's members are checked. */
function MixedGlyph() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
    </svg>
  );
}

export function TickGlyph() {
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

/* The row-end chevron: this row opens another level. */
export function ChevronRightGlyph() {
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

export function AnyRow({
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
   set. Each row is two targets — the checkbox toggles its values; the label
   isolates them (Only) or, when they are the whole selection, brings all
   back. A tree dimension puts a parent row over its members: the parent's
   box is mixed while only some are checked, and it toggles all of them. */
export function MultiSelectRows({
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
  /* `selected` keeps option order; the Set answers membership in the rows. */
  const selected = decoded === null || decoded.length === allValues.length ? allValues : decoded;
  const selectedSet = new Set(selected);
  const allChecked = selected.length === allValues.length;

  const commit = (next: readonly string[]) => {
    setParam(
      def.key,
      next.length === 0 || next.length === allValues.length ? null : def.encode(next),
    );
  };

  const row = (id: string, label: string, values: readonly string[], depth: 0 | 1): ReactNode => {
    const own = new Set(values);
    const checkedCount = values.filter((value) => selectedSet.has(value)).length;
    const checked = checkedCount === values.length;
    const mixed = !checked && checkedCount > 0;
    const sole = checked && selected.length === values.length;
    return (
      <div key={id} className="wgi-editor-opt" data-multi="true" data-depth={depth || undefined}>
        <button
          type="button"
          role="checkbox"
          aria-checked={mixed ? "mixed" : checked}
          aria-label={`${checked ? "Uncheck" : "Check"} ${label}`}
          className="wgi-editor-check"
          onClick={() => {
            commit(
              checked
                ? selected.filter((value) => !own.has(value))
                : allValues.filter((value) => selectedSet.has(value) || own.has(value)),
            );
          }}
        >
          <span
            aria-hidden="true"
            className="wgi-editor-box"
            data-checked={checked || mixed || undefined}
          >
            {checked ? <CheckGlyph /> : mixed ? <MixedGlyph /> : null}
          </span>
        </button>
        <button
          type="button"
          className="wgi-editor-row"
          aria-label={sole ? `${label}: Check all` : `${label}: Only`}
          onClick={() => {
            commit(sole ? allValues : values);
          }}
        >
          {label}
        </button>
        <span aria-hidden="true" className="wgi-editor-quick" data-target="check">
          {checked ? "Uncheck" : "Check"}
        </span>
        <span aria-hidden="true" className="wgi-editor-quick" data-target="label">
          {sole ? "Check all" : "Only"}
        </span>
      </div>
    );
  };

  const matches = (label: string) => label.toLowerCase().includes(q);

  return (
    <>
      <AnyRow
        label={def.anyLabel}
        checked={allChecked}
        onChoose={() => {
          commit(allValues);
        }}
      />
      {def.options.flatMap((option, index) => {
        const group =
          option.group === undefined
            ? undefined
            : def.groups.find((candidate) => candidate.value === option.group);
        if (group === undefined)
          return matches(option.label) ? [row(option.value, option.label, [option.value], 0)] : [];
        /* A search for the parent keeps its whole family in view. */
        const members = def.options.filter((candidate) => candidate.group === group.value);
        const familyShown = matches(group.label);
        const child =
          familyShown || matches(option.label)
            ? [row(option.value, option.label, [option.value], 1)]
            : [];
        if (def.options[index - 1]?.group === group.value) return child;
        const parentShown = familyShown || members.some((member) => matches(member.label));
        const parent = parentShown
          ? [
              row(
                group.value,
                group.label,
                members.map((member) => member.value),
                0,
              ),
            ]
          : [];
        return [...parent, ...child];
      })}
    </>
  );
}
