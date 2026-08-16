import Link from "next/link";
import { groupByPracticeDay } from "./recent-work-model";
import type { RecentWorkItem } from "./recent-work-model";

// The human lens over the durable audit record: plain-language, grouped by
// Practice-local day, linked to the work — never an action code. The model
// (vocabulary, grouping) lives in recent-work-model.ts so this file exports
// Components only.

const timeOnly = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "America/New_York",
});

// oxlint-disable-next-line typescript/prefer-readonly-parameter-types -- React props carry framework member types that cannot be made readonly
export function RecentWorkSection({
  items,
  now,
}: Readonly<{
  items: RecentWorkItem[];
  now: Date;
}>) {
  const groups = groupByPracticeDay(items, now);
  return (
    <section aria-labelledby="recent-work-heading" className="mt-8">
      <h2
        id="recent-work-heading"
        className="text-[1.05rem] font-black text-[var(--color-ink)]"
      >
        Recent work
      </h2>
      <p className="mt-1.5 max-w-[65ch] text-[0.9rem] leading-relaxed text-[var(--color-muted)]">
        Who did what, in plain language. The exact technical record stays
        below for administrators.
      </p>
      <div className="mt-4 space-y-6">
        {groups.map((group) => (
          <div key={group.label}>
            <h3 className="text-[0.8rem] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)]">
              {group.label}
            </h3>
            <ul
              data-testid="recent-work-list"
              className="mt-2 divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white"
            >
              {group.items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-baseline gap-x-2 px-5 py-3 text-[0.95rem]"
                >
                  <span className="whitespace-nowrap text-[0.82rem] font-bold tabular-nums text-[var(--color-muted)]">
                    {timeOnly.format(new Date(item.at))}
                  </span>
                  <span
                    className={
                      item.technical
                        ? "text-[var(--color-muted)]"
                        : "text-[var(--color-body)]"
                    }
                  >
                    <strong className="font-bold text-[var(--color-ink)]">
                      {item.actor}
                    </strong>{" "}
                    {item.sentence}
                    {item.requestId !== null && item.requestId !== "" ? (
                      <>
                        {" "}
                        <Link
                          href={`/admin/requests/${item.requestId}`}
                          className="font-bold text-[var(--color-teal-ink)] underline underline-offset-2"
                        >
                          open request
                        </Link>
                      </>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
