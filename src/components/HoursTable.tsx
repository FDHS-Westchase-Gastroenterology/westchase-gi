import { formatOfficeHours, site, type Locale } from "@/lib/site";
import type { Dictionary } from "@/lib/i18n";

type HoursTableProps = { locale: Locale; dict: Dictionary };

/** Full weekly schedule, with the confirmed hours for each office. */
export function HoursTable({ locale, dict }: HoursTableProps) {
  const c = dict.common;
  return (
    <div className="card-lined overflow-hidden">
      <div className="border-b border-[var(--color-line)] bg-[var(--color-mint)] px-6 py-4">
        <h3 className="font-[var(--font-body)] text-base font-extrabold text-[var(--color-ink)]">
          {c.hours.heading}
        </h3>
        <p className="text-[0.9rem] text-[var(--color-muted)]">
          {c.hours.subheading}
        </p>
      </div>
      <div className="grid divide-y divide-[var(--color-line)] md:grid-cols-2 md:divide-x md:divide-y-0">
        {site.locations.map((loc) => (
          <section key={loc.id} aria-label={loc.name[locale]} className="px-6 py-5">
            <h4 className="font-[var(--font-body)] font-extrabold text-[var(--color-ink)]">
              {loc.name[locale]}
            </h4>
            <dl className="mt-3">
              {c.days.map((day, i) => {
                const open = i < 5;
                return (
                  <div
                    key={day}
                    className="flex items-baseline justify-between gap-4 border-b border-[var(--color-line)] py-2.5 last:border-b-0"
                  >
                    <dt className="font-semibold text-[var(--color-ink)]">{day}</dt>
                    <dd className={open ? "font-semibold" : "text-[var(--color-muted)]"}>
                      {open ? formatOfficeHours(locale, loc.hours) : c.hours.closed}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ))}
      </div>
      <p className="bg-[var(--color-mint)] px-6 py-3.5 text-[0.9rem] text-[var(--color-body)]">
        {c.hours.confirmNote}
      </p>
    </div>
  );
}
