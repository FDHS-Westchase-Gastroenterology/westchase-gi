import { site, type Locale } from "@/lib/site";
import type { Dictionary } from "@/lib/i18n";

type HoursTableProps = { locale: Locale; dict: Dictionary };

/** Full weekly schedule for both offices (they share hours). */
export function HoursTable({ locale, dict }: HoursTableProps) {
  const c = dict.common;
  return (
    <div className="card-lined overflow-hidden">
      <div className="border-b border-[var(--color-line)] bg-[var(--color-mint)] px-6 py-4">
        <h3 className="font-[var(--font-body)] text-base font-extrabold text-[var(--color-ink)]">
          {c.hours.heading}
        </h3>
        <p className="text-[0.9rem] text-[var(--color-muted)]">
          {site.locations.map((l) => l.name[locale]).join(" · ")}
        </p>
      </div>
      <dl className="grid">
        {c.days.map((day, i) => {
          const open = i < 5;
          return (
            <div
              key={day}
              className="flex items-baseline justify-between gap-4 border-b border-[var(--color-line)] px-6 py-2.5 last:border-b-0"
            >
              <dt className="font-semibold text-[var(--color-ink)]">{day}</dt>
              <dd className={open ? "font-semibold" : "text-[var(--color-muted)]"}>
                {open ? "8:00 AM – 4:30 PM" : c.hours.closed}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="bg-[var(--color-mint)] px-6 py-3.5 text-[0.9rem] text-[var(--color-body)]">
        {c.hours.confirmNote}
      </p>
    </div>
  );
}
