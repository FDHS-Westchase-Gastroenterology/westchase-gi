import Link from "next/link";

import { RecentWorkControls } from "./recent-work-controls";
import { RecentWorkFocusLink } from "./recent-work-focus-link";
import {
  RECENT_WORK_SEARCH_ID,
  RECENT_WORK_SUMMARY_ID,
  groupByPracticeDay,
  recentWorkConstraintDescription,
  recentWorkEmptyState,
} from "./recent-work-model";
import type { RecentWorkEntry, RecentWorkItem, RecentWorkType } from "./recent-work-model";
import { RecentWorkPagination } from "./recent-work-pagination";

// The human lens over the durable audit record: plain-language, grouped by
// Practice-local day, searchable and filterable by work type, with repeated
// Print/export noise compacted into expandable summaries. The model
// (vocabulary, grouping, search bounds) lives in recent-work-model.ts so
// This file exports Components only. Nothing here touches the Technical
// Record's rows, order, or counts.

const timeOnly = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "America/New_York",
});

function requestLink(requestId: string): React.ReactNode {
  return (
    <Link
      href={`/admin/requests/${requestId}`}
      className="font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
    >
      open request
    </Link>
  );
}

function RecentWorkRow({ item }: Readonly<{ item: RecentWorkItem }>) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-2 px-5 py-3 text-[0.95rem]">
      <span className="text-[0.82rem] font-bold whitespace-nowrap text-[var(--color-muted)] tabular-nums">
        {timeOnly.format(new Date(item.at))}
      </span>
      <span>
        <strong className="font-bold text-[var(--color-ink)]">{item.actor}</strong> {item.sentence}
        {item.requestId !== null && item.requestId !== "" ? (
          <> {requestLink(item.requestId)}</>
        ) : null}
      </span>
    </li>
  );
}

function RecentWorkGroupRow({
  entry,
}: Readonly<{ entry: Extract<RecentWorkEntry, { kind: "group" }> }>) {
  const from = timeOnly.format(new Date(entry.fromAt));
  const to = timeOnly.format(new Date(entry.toAt));
  const span = from === to ? ` at ${to}` : ` between ${from} and ${to}`;
  return (
    <li data-testid="recent-work-group" className="px-5 py-3 text-[0.95rem]">
      <span className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-[0.82rem] font-bold whitespace-nowrap text-[var(--color-muted)] tabular-nums">
          {timeOnly.format(new Date(entry.toAt))}
        </span>
        <span>
          <strong className="font-bold text-[var(--color-ink)]">{entry.actor}</strong>{" "}
          {entry.phrase} {entry.count} times
          {span}.
        </span>
      </span>
      <details data-testid="recent-work-group-details" className="mt-1">
        <summary className="min-h-11 cursor-pointer font-bold text-[var(--color-teal-ink)] underline underline-offset-2">
          Show all {entry.count}
        </summary>
        <ul className="mt-2 space-y-1 border-l-2 border-[var(--color-line)] pl-4">
          {entry.items.map((item) => (
            <li key={item.id} className="text-[0.9rem] text-[var(--color-body)]">
              <span className="mr-2 text-[0.8rem] font-bold whitespace-nowrap text-[var(--color-muted)] tabular-nums">
                {timeOnly.format(new Date(item.at))}
              </span>
              {item.sentence}
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}

export function RecentWorkSection({
  entries,
  now,
  search,
  type,
  total,
  firstShown,
  lastShown,
  recentPage,
  technicalPage,
  totalPages,
  lensCapped,
  lensLimit,
}: Readonly<{
  entries: readonly RecentWorkEntry[];
  now: Date;
  search: string;
  type: RecentWorkType;
  total: number;
  firstShown: number;
  lastShown: number;
  recentPage: number;
  technicalPage: number;
  totalPages: number;
  lensCapped: boolean;
  lensLimit: number;
}>) {
  const groups = groupByPracticeDay(entries, now);
  const description = recentWorkConstraintDescription(search, type);
  const empty = recentWorkEmptyState({ search, type, page: technicalPage });
  return (
    <section aria-labelledby="recent-work-heading" className="mt-8">
      <h2 id="recent-work-heading" className="text-[1.05rem] font-black text-[var(--color-ink)]">
        Recent work
      </h2>
      <p className="mt-1.5 max-w-[65ch] text-[0.9rem] leading-relaxed text-[var(--color-muted)]">
        Who did what, in plain language. The exact technical record stays below for administrators.
      </p>

      <RecentWorkControls search={search} type={type} technicalPage={technicalPage} />

      <p
        id={RECENT_WORK_SUMMARY_ID}
        data-testid="recent-work-summary"
        role="status"
        tabIndex={-1}
        className="mt-4 text-[0.9rem] font-bold text-[var(--color-body)]"
      >
        {total === 0
          ? empty.explanation
          : `Showing ${firstShown}–${lastShown} of ${total} ${total === 1 ? "entry" : "entries"}${description}.`}
      </p>
      {lensCapped ? (
        <p className="mt-1 max-w-[65ch] text-[0.85rem] text-[var(--color-muted)]">
          Search and filters cover the {lensLimit.toLocaleString("en-US")} most recent events.
        </p>
      ) : null}

      {total === 0 ? (
        <div data-testid="recent-work-empty" className="portal-empty mt-4 p-8 text-center sm:p-12">
          <h3 className="text-[1rem] font-black text-[var(--color-ink)]">Nothing matches here</h3>
          <p className="mx-auto mt-2 max-w-[52ch] text-[0.95rem] text-[var(--color-body)]">
            {empty.explanation}
          </p>
          <RecentWorkFocusLink
            href={empty.href}
            focusId={RECENT_WORK_SEARCH_ID}
            className="btn btn-outline mt-4"
          >
            {empty.actionLabel}
          </RecentWorkFocusLink>
        </div>
      ) : (
        <>
          <div className="mt-4 space-y-6">
            {groups.map((group) => (
              <div key={group.label}>
                <h3 className="text-[0.8rem] font-bold tracking-[0.06em] text-[var(--color-muted)] uppercase">
                  {group.label}
                </h3>
                <ul
                  data-testid="recent-work-list"
                  className="mt-2 divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white"
                >
                  {group.items.map((entry) =>
                    entry.kind === "single" ? (
                      <RecentWorkRow key={entry.item.id} item={entry.item} />
                    ) : (
                      <RecentWorkGroupRow key={entry.key} entry={entry} />
                    ),
                  )}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-end">
            <RecentWorkPagination
              ariaLabel="Recent work pages"
              recentPage={recentPage}
              technicalPage={technicalPage}
              totalPages={totalPages}
              q={search}
              type={type}
              param="rw"
              summaryId={RECENT_WORK_SUMMARY_ID}
              testId="recent-work-pagination"
            />
          </div>
        </>
      )}
    </section>
  );
}
