"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

import { WORK_TYPE_FILTERS, WORK_TYPE_LABELS, recentWorkHref } from "./recent-work-model";
import type { RecentWorkType } from "./recent-work-model";

// The staff-facing controls over Recent work: one persistent labeled search
// Field and the work-group filter chips. State lives in the URL — these
// Controls only navigate. Clear restores the full view and returns focus to
// The search field, so keyboard work stays predictable.

const FILTER_LABELS = {
  all: "All work",
  ...WORK_TYPE_LABELS,
} as const;

export function RecentWorkControls({
  search,
  type,
}: Readonly<{
  search: string;
  type: RecentWorkType;
}>) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const active = search !== "" || type !== "all";

  return (
    <form
      method="get"
      action="/admin/audit"
      onSubmit={(event) => {
        event.preventDefault();
        router.push(recentWorkHref({ q: inputRef.current?.value ?? "", type }));
      }}
      className="mt-4 max-w-[65ch]"
    >
      {type !== "all" ? <input type="hidden" name="type" value={type} /> : null}
      <label
        htmlFor="recent-work-search"
        className="block text-[0.85rem] font-bold text-[var(--color-ink)]"
      >
        Search recent work
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          ref={inputRef}
          id="recent-work-search"
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
              router.push(recentWorkHref({ q: search, type: value }));
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
            router.push(recentWorkHref({}));
            inputRef.current?.focus();
          }}
          className="mt-2 min-h-11 font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
        >
          Clear search and filters
        </button>
      ) : null}
    </form>
  );
}
