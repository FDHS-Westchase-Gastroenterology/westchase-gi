"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

import { requestFocusAfterNavigate, useFocusAfterNavigate } from "./recent-work-focus";
import {
  RECENT_WORK_SEARCH_ID,
  RECENT_WORK_SUMMARY_ID,
  WORK_TYPE_FILTERS,
  WORK_TYPE_LABELS,
  recentWorkHref,
} from "./recent-work-model";
import type { RecentWorkType } from "./recent-work-model";

// The staff-facing controls over Recent work: one persistent labeled search
// Field and the work-group filter chips. State lives in the URL — these
// Controls only navigate. Search and filters reset the Recent-work page to
// 1 and keep the Technical record page. Clear restores the full default
// View and returns focus to the search field.

const FILTER_LABELS = {
  all: "All work",
  ...WORK_TYPE_LABELS,
} as const;

export function RecentWorkControls({
  search,
  type,
  technicalPage,
}: Readonly<{
  search: string;
  type: RecentWorkType;
  technicalPage: number;
}>) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const active = search !== "" || type !== "all";
  const renderKey = `${search}\n${type}\n${technicalPage}`;
  useFocusAfterNavigate(RECENT_WORK_SEARCH_ID, renderKey, inputRef);

  function navigateWithFocus(href: string, focusId: string): void {
    if (href === `${window.location.pathname}${window.location.search}`) {
      document.getElementById(focusId)?.focus();
      return;
    }
    requestFocusAfterNavigate(focusId);
    router.push(href);
  }

  return (
    <form
      method="get"
      action="/admin/audit"
      onSubmit={(event) => {
        event.preventDefault();
        navigateWithFocus(
          recentWorkHref({ q: inputRef.current?.value ?? "", type, page: technicalPage }),
          RECENT_WORK_SUMMARY_ID,
        );
      }}
      className="mt-4 max-w-[65ch]"
    >
      {type !== "all" ? <input type="hidden" name="type" value={type} /> : null}
      {technicalPage > 1 ? <input type="hidden" name="page" value={technicalPage} /> : null}
      <label
        htmlFor={RECENT_WORK_SEARCH_ID}
        className="block text-[0.85rem] font-bold text-[var(--color-ink)]"
      >
        Search recent work
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          ref={inputRef}
          id={RECENT_WORK_SEARCH_ID}
          name="q"
          type="search"
          defaultValue={search}
          placeholder="Person, action, or request"
          className="min-h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-line-2)] bg-white px-3 text-[0.95rem] text-[var(--color-body)]"
        />
        <button type="submit" className="btn btn-primary shrink-0">
          Search
        </button>
      </div>
      <div
        role="group"
        aria-label="Filter recent work by type"
        className="mt-2 flex flex-wrap gap-2"
      >
        {WORK_TYPE_FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            data-testid={`recent-work-filter-${value}`}
            aria-pressed={type === value}
            onClick={() => {
              navigateWithFocus(
                recentWorkHref({ q: search, type: value, page: technicalPage }),
                RECENT_WORK_SUMMARY_ID,
              );
            }}
            className={`min-h-11 rounded-full border px-4 text-[0.85rem] font-bold transition-[color,border-color,background-color] duration-150 ${
              type === value
                ? "border-[var(--color-navy)] bg-[var(--color-navy)] text-white"
                : "border-[var(--color-line-2)] bg-white text-[var(--color-body)] hover:text-[var(--color-ink)]"
            }`}
          >
            {FILTER_LABELS[value]}
          </button>
        ))}
      </div>
      {active ? (
        <button
          type="button"
          data-testid="recent-work-clear"
          onClick={() => {
            if (inputRef.current !== null) inputRef.current.value = "";
            navigateWithFocus(recentWorkHref({}), RECENT_WORK_SEARCH_ID);
          }}
          className="mt-2 min-h-11 font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
        >
          Clear search and filters
        </button>
      ) : null}
    </form>
  );
}
