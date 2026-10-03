"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableRovingBody, TableRovingControl, TableRovingRow } from "@/components/ui/table-roving";
import { readActiveFilters, withParam } from "@/lib/portal/filters";
import type { ActiveFilter, FilterKey } from "@/lib/portal/filters";

import { FilterBar } from "./filter-bar";
import { ClosedTailNote, FilterEmptyState } from "./filter-empty-state";
import { applyFilters, closedTailCut } from "./home-line";
import type { HomeLine } from "./home-line";
import { LineStatusBadge } from "./parts/badge";
import { PrintPreview, usePreviewRead } from "./print-preview";
import { chosenBefore, isPrintable, oldestFirst, useShownRows } from "./print-rows";
import { PrintSheetFooter } from "./print-sheet-footer";
import { useFilterEditing } from "./use-filter-editing";

/* What the Print sheet holds: its own filters over Home's lines, the table
   of what will print, the highlighted row's page, and the footer that
   prints it (issue #332, P1–P4). Mounted fresh on every open, so every
   open starts from Home's filters and remembers nothing. */

type Line = Readonly<HomeLine>;

/* Keys belong to the sheet everywhere but where they already mean
   something: the filter bar and its popovers, and anything typed into. */
const OWN_KEYS = '.wgi-filter-bar, [data-slot="popover-content"], input, textarea, select';

export function PrintSheetBody({
  open,
  lines,
  nowMs,
  closedCapped,
  search,
  printedAt,
  printedBy,
  onClose,
}: Readonly<{
  open: boolean;
  lines: readonly Line[] | null;
  nowMs: number;
  closedCapped: boolean;
  /** Home's search string at the moment the sheet opened. */
  search: string;
  printedAt: string;
  printedBy: string | null;
  onClose: () => void;
}>) {
  if (lines === null) {
    return (
      <>
        <div className="wgi-glass-well wgi-print-unavailable" data-testid="print-unavailable">
          <div className="wgi-empty">
            <h2>Today&rsquo;s calls could not load.</h2>
            <p>This is not an empty day. Open Requests to print from the live queue.</p>
            <Link href="/admin/requests" className="wgi-empty-clear">
              Open Requests
            </Link>
          </div>
        </div>
        <PrintSheetFooter total={0} chosen={[]} printRef={null} onClose={onClose} />
      </>
    );
  }
  return (
    <PrintSheetContent
      open={open}
      lines={lines}
      nowMs={nowMs}
      closedCapped={closedCapped}
      search={search}
      printedAt={printedAt}
      printedBy={printedBy}
      onClose={onClose}
    />
  );
}

function PrintSheetContent({
  open,
  lines,
  nowMs,
  closedCapped,
  search,
  printedAt,
  printedBy,
  onClose,
}: Readonly<{
  open: boolean;
  lines: readonly Line[];
  nowMs: number;
  closedCapped: boolean;
  search: string;
  printedAt: string;
  printedBy: string | null;
  onClose: () => void;
}>) {
  /* The sheet's own filters, seeded from Home's URL as it was on open. */
  const [active, setActive] = useState<readonly ActiveFilter[]>(() => readActiveFilters(search));
  const { suggestions, setParam, activate, remove, clearFilters } = useFilterEditing(lines, nowMs, {
    active,
    writeParam: (key: FilterKey, raw: string | null) => {
      setActive((current) => withParam(current, key, raw));
    },
    clearAll: () => {
      setActive([]);
    },
  });

  const rows = useMemo(() => applyFilters(lines, active).toSorted(oldestFirst), [lines, active]);
  const { display, arriving, leaving } = useShownRows(rows);

  /* Left out by id, so a row a filter brings in arrives chosen. */
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(() => new Set());
  const chosen = rows.filter((line) => !excluded.has(line.id));
  const pageOf = new Map(chosen.map((line, index) => [line.id, index + 1]));

  /* The highlight stays on its row while the row is listed, and falls to
     the first row when a filter takes it away. */
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlighted = rows.find((line) => line.id === highlightId) ?? rows.at(0) ?? null;
  const highlightedLeftOut = highlighted !== null && excluded.has(highlighted.id);

  /* A left-out row previews as the page it would take if put back. */
  const previewPage =
    highlighted === null
      ? 1
      : (pageOf.get(highlighted.id) ?? chosenBefore(chosen, highlighted) + 1);

  const { read, retry } = usePreviewRead(highlighted, open);

  const tableRef = useRef<HTMLTableElement>(null);
  const printRef = useRef<HTMLAnchorElement>(null);

  /* Keys work the moment the sheet opens: focus lands on the highlighted
     row's box, not on Add filter. */
  useEffect(() => {
    tableRef.current
      ?.querySelector<HTMLElement>('[data-highlighted] [data-roving="control"]')
      ?.focus();
  }, []);

  const toggle = (id: string) => {
    setExcluded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* Mixed checks everything; all clears; none checks everything. */
  const allChosen = rows.length > 0 && chosen.length === rows.length;
  const toggleAll = () => {
    setExcluded((current) => {
      const next = new Set(current);
      for (const line of rows) {
        if (allChosen) next.add(line.id);
        else next.delete(line.id);
      }
      return next;
    });
  };

  /* The table's rows walk themselves (ui/table-roving); from anywhere else
     in the sheet the arrows still move the highlight, and the table
     scrolls it into view. */
  const move = (delta: number) => {
    if (highlighted === null) return;
    const at = rows.findIndex((line) => line.id === highlighted.id);
    const target = rows.at(Math.min(rows.length - 1, Math.max(0, at + delta)));
    if (target !== undefined) setHighlightId(target.id);
  };

  const printable = isPrintable(chosen.length);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest(OWN_KEYS) !== null) return;
    const control = target.closest("button, a") !== null;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault();
        move(event.key === "ArrowDown" ? 1 : -1);
        break;
      case " ":
        /* A focused box toggles itself, and it is the highlighted row's. */
        if (control || target.closest('[role="checkbox"]') !== null || highlighted === null) return;
        event.preventDefault();
        toggle(highlighted.id);
        break;
      case "Enter":
        if (control || !printable) return;
        event.preventDefault();
        printRef.current?.click();
        break;
      default:
    }
  };

  return (
    <div className="wgi-print-body" onKeyDown={onKeyDown}>
      <FilterBar
        active={active}
        suggestions={suggestions}
        nowMs={nowMs}
        setParam={setParam}
        onRemove={remove}
        onActivate={activate}
      />

      <div className="wgi-glass-well wgi-print-well">
        <div className="wgi-print-list">
          {/* The column heads stay when nothing matches (P4): the table is
              still what will print, and the empty state says why it is empty. */}
          <div className="wgi-print-scroll">
            <Table ref={tableRef} className="wgi-print-table" data-testid="print-table">
              <TableHeader className="tracking-normal normal-case">
                <TableRow>
                  <TableHead className="wgi-print-check">
                    <Checkbox
                      aria-label="Include every request"
                      data-testid="print-select-all"
                      disabled={rows.length === 0}
                      checked={allChosen}
                      indeterminate={chosen.length > 0 && !allChosen}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead className="wgi-print-page">Page</TableHead>
                </TableRow>
              </TableHeader>
              <TableRovingBody
                activeRow={highlighted?.id ?? null}
                onActiveRowChange={setHighlightId}
              >
                {display.map((line) => {
                  const gone = leaving.has(line.id);
                  const page = gone ? null : (pageOf.get(line.id) ?? null);
                  return (
                    <TableRovingRow
                      key={line.id}
                      rowId={line.id}
                      data-row-id={line.id}
                      data-left-out={(!gone && page === null) || undefined}
                      data-arriving={arriving.has(line.id) || undefined}
                      data-leaving={gone || undefined}
                      inert={gone}
                      className="wgi-print-row"
                    >
                      <TableCell className="wgi-print-check">
                        <TableRovingControl
                          render={
                            <Checkbox
                              aria-label={`Include ${line.name}`}
                              checked={page !== null}
                              onCheckedChange={() => {
                                toggle(line.id);
                              }}
                            />
                          }
                        />
                      </TableCell>
                      <TableCell className="wgi-print-name" data-ui-redact="patient-name">
                        {line.name}
                      </TableCell>
                      <TableCell>
                        <LineStatusBadge status={line.status} />
                      </TableCell>
                      <TableCell className="wgi-print-received" title={line.receivedFull}>
                        {line.receivedRel}
                      </TableCell>
                      <TableCell className="wgi-print-page">{page ?? "—"}</TableCell>
                    </TableRovingRow>
                  );
                })}
              </TableRovingBody>
            </Table>
            {rows.length === 0 ? (
              <FilterEmptyState
                lines={lines}
                active={active}
                nowMs={nowMs}
                testIdPrefix="print"
                onShowAll={() => {
                  setParam("status", null);
                }}
                onClear={clearFilters}
              />
            ) : null}
            {closedTailCut(active, closedCapped) ? <ClosedTailNote /> : null}
          </div>
          {rows.length === 0 ? null : (
            <p className="wgi-print-hint">
              <KbdGroup aria-hidden="true">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd>
              </KbdGroup>
              <span className="sr-only">Up and down arrows:</span> to preview · <Kbd>Space</Kbd> to
              include or leave out
            </p>
          )}
        </div>
        <PrintPreview
          line={highlighted}
          read={read}
          page={previewPage}
          total={highlightedLeftOut ? chosen.length + 1 : chosen.length}
          leftOut={highlightedLeftOut}
          printedAt={printedAt}
          printedBy={printedBy}
          onRetry={retry}
        />
      </div>

      <PrintSheetFooter total={rows.length} chosen={chosen} printRef={printRef} onClose={onClose} />
    </div>
  );
}
