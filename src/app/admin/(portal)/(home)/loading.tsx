"use client";

import { useState } from "react";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useActiveFilters } from "@/lib/portal/filters/use-filter-param";

import { FilterBar } from "./filter-bar";
import { PLACEHOLDER_SUGGESTIONS, suggestionId } from "./home-line";

import "./home.css";

/* While the day loads, the surface is already there: the same Card and
   Table geometry as the real list, holding skeleton rows — and the filter
   bar renders for real, because filter state is computable from the URL
   alone before any data arrives (brief §2.1, checklist #9). */

const SKELETON_WIDTHS: readonly { name: string; pref: string }[] = [
  { name: "11rem", pref: "9rem" },
  { name: "9rem", pref: "11rem" },
  { name: "12rem", pref: "8rem" },
  { name: "8.5rem", pref: "10rem" },
  { name: "10.5rem", pref: "9.5rem" },
  { name: "9.5rem", pref: "8.5rem" },
  { name: "11.5rem", pref: "10.5rem" },
  { name: "10rem", pref: "9rem" },
  { name: "8rem", pref: "11.5rem" },
  { name: "12.5rem", pref: "8.5rem" },
  { name: "9rem", pref: "10rem" },
  { name: "11rem", pref: "9.5rem" },
];

export default function HomeLoading() {
  const { active, setParam } = useActiveFilters();
  const [nowMs] = useState(() => Date.now());
  const suggestions = PLACEHOLDER_SUGGESTIONS.filter(
    (suggestion) => !active.some((entry) => suggestionId(entry) === suggestionId(suggestion)),
  );

  return (
    <section aria-busy="true" aria-live="polite" className="portal-sheet wgi-home">
      <span className="sr-only">Loading today&rsquo;s list</span>
      <div className="wgi-loading-head" aria-hidden="true">
        <span />
        <i />
      </div>
      <FilterBar
        active={active}
        suggestions={suggestions}
        nowMs={nowMs}
        setParam={setParam}
        onRemove={(key) => {
          setParam(key, null);
        }}
        onActivate={(suggestion) => {
          setParam(suggestion.key, suggestion.raw);
        }}
      />
      <Card className="wgi-list-card" aria-hidden="true">
        <CardContent className="wgi-list-body">
          <div className="wgi-list-scroll wgi-list-skeleton">
            <div className="wgi-list-viewport">
              <Table className="wgi-list-table">
                <TableHeader className="wgi-list-head">
                  <TableRow>
                    <TableHead data-cell="patient">Patient</TableHead>
                    <TableHead data-cell="phone">Phone</TableHead>
                    <TableHead data-cell="status">Status</TableHead>
                    <TableHead data-cell="pref">Preferences</TableHead>
                    <TableHead data-cell="received">Received</TableHead>
                    <TableHead data-cell="open" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SKELETON_WIDTHS.map((row, index) => (
                    <TableRow key={`${row.name}-${row.pref}`} className="wgi-list-row">
                      <TableCell data-cell="patient">
                        <span style={{ width: row.name }} />
                      </TableCell>
                      <TableCell data-cell="phone">
                        <span style={{ width: "7.5rem" }} />
                      </TableCell>
                      <TableCell data-cell="status">
                        <span style={{ width: index % 3 === 0 ? "5.5rem" : "3.5rem" }} />
                      </TableCell>
                      <TableCell data-cell="pref">
                        <span style={{ width: row.pref }} />
                      </TableCell>
                      <TableCell data-cell="received">
                        <span style={{ width: "2.5rem" }} />
                      </TableCell>
                      <TableCell data-cell="open" />
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
        <CardFooter className="wgi-list-foot">
          <span className="wgi-list-count" />
          <span className="wgi-list-range" />
        </CardFooter>
      </Card>
    </section>
  );
}
