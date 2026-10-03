"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { createContext, use, useEffect, useMemo, useRef } from "react";
import type { ComponentProps, KeyboardEvent } from "react";

import { TableBody, TableRow } from "./table";

/*
 * Roving rows for ui/table (issue #360): a body whose rows hold one active
 * row, with that row's control the body's single tab stop. The pattern is
 * the WAI-ARIA roving tabindex of a listbox or grid, kept on a real table
 * so the column heads still label the cells. The Home Print sheet's rows
 * are the first consumer ((home)/print-sheet-body.tsx).
 *
 * TableRovingBody owns the keys and the focus: ArrowUp and ArrowDown move
 * the active row one step, Home and End to the ends, and the body skips
 * an inert row (one on its way out). Whichever way the active row changes,
 * it scrolls into view, and focus follows it when focus was already in
 * the body; a pointer press or a focused control makes its row active.
 * The consumer holds the active id, so keys outside the body may move it
 * too. TableRovingControl gives a row's control (a checkbox, a link) its
 * tabIndex: 0 on the active row, -1 elsewhere.
 *
 * ui/table stays server-safe; this module is the client half. No paint:
 * the active row carries `data-highlighted`, and the consumer draws it.
 */

type RovingBody = Readonly<{
  activeRow: string | null;
  onActiveRowChange: (id: string) => void;
}>;

const RovingBodyContext = createContext<RovingBody | null>(null);
const RovingRowContext = createContext(false);

const ROW = "[data-roving-row]:not([inert])";
const CONTROL = '[data-roving="control"]';

function rowIds(body: HTMLElement): string[] {
  return [...body.querySelectorAll<HTMLElement>(ROW)].map((row) => row.dataset.rovingRow ?? "");
}

function nextRow(ids: readonly string[], at: number, key: string): string | undefined {
  switch (key) {
    case "ArrowDown":
      return ids.at(Math.min(ids.length - 1, at + 1));
    case "ArrowUp":
      return ids.at(Math.max(0, at - 1));
    case "Home":
      return ids.at(0);
    case "End":
      return ids.at(-1);
    default:
      return undefined;
  }
}

type TableRovingBodyProps = ComponentProps<"tbody"> & RovingBody;

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function TableRovingBody({ activeRow, onActiveRowChange, ...props }: TableRovingBodyProps) {
  const ref = useRef<HTMLTableSectionElement>(null);

  useEffect(() => {
    const body = ref.current;
    if (activeRow === null || body === null) return;
    const row = body.querySelector<HTMLElement>(`[data-roving-row="${CSS.escape(activeRow)}"]`);
    if (row === null) return;
    row.scrollIntoView({ block: "nearest" });
    const focused = document.activeElement;
    if (body.contains(focused) && !row.contains(focused)) {
      row.querySelector<HTMLElement>(CONTROL)?.focus();
    }
  }, [activeRow]);

  const onKeyDown = (event: KeyboardEvent<HTMLTableSectionElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const body = event.currentTarget;
    const ids = rowIds(body);
    const target = nextRow(ids, activeRow === null ? -1 : ids.indexOf(activeRow), event.key);
    if (target === undefined) return;
    event.preventDefault();
    onActiveRowChange(target);
  };

  const value = useMemo(() => ({ activeRow, onActiveRowChange }), [activeRow, onActiveRowChange]);

  return (
    <RovingBodyContext value={value}>
      <TableBody ref={ref} {...mergeProps<"tbody">({ onKeyDown }, props)} />
    </RovingBodyContext>
  );
}

type TableRovingRowProps = ComponentProps<"tr"> & { rowId: string };

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function TableRovingRow({ rowId, ...props }: TableRovingRowProps) {
  const body = use(RovingBodyContext);
  const active = body?.activeRow === rowId && props.inert !== true;
  const activate = () => {
    if (!active) body?.onActiveRowChange(rowId);
  };
  return (
    <RovingRowContext value={active}>
      <TableRow
        data-roving-row={rowId}
        data-highlighted={active || undefined}
        {...mergeProps<"tr">({ onFocus: activate, onPointerDown: activate }, props)}
      />
    </RovingRowContext>
  );
}

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
function TableRovingControl({ render, ...props }: useRender.ComponentProps<"button">) {
  const active = use(RovingRowContext);
  return useRender({
    defaultTagName: "button",
    render,
    state: { roving: "control" },
    props: mergeProps<"button">({ tabIndex: active ? 0 : -1 }, props),
  });
}

export { TableRovingBody, TableRovingControl, TableRovingRow };
