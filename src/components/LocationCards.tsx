import { site, directionsUrl, formatOfficeHours, type Locale } from "@/lib/site";
import type { Dictionary } from "@/lib/i18n";
import { Clock, Mail, MapPin, MessageSquare, Phone, Printer } from "./icons";

type LocationCardsProps = { locale: Locale; dict: Dictionary };

/** Both offices with full NAP each (keep-list requirement). */
export function LocationCards({ locale, dict }: LocationCardsProps) {
  const c = dict.common;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {site.locations.map((loc) => (
        <article key={loc.id} className="card p-7 sm:p-8">
          <h3 className="h3 font-[var(--font-display)]">
            {loc.name[locale]}
          </h3>
          <address className="mt-5 grid gap-3 not-italic">
            <p className="flex items-start gap-3">
              <MapPin className="mt-1 h-4.5 w-4.5 flex-none text-[var(--color-teal-ink)]" />
              <span className="bidi-ltr">
                {loc.street}
                <br />
                {loc.city}, {loc.region} {loc.postal}
              </span>
            </p>
            <p className="flex items-center gap-3">
              <Phone className="h-4.5 w-4.5 flex-none text-[var(--color-teal-ink)]" />
              <a href={site.phone.href} className="font-bold text-[var(--color-ink)] hover:underline">
                <span className="bidi-ltr">{site.phone.display}</span>
              </a>
            </p>
            <p className="flex items-center gap-3">
              <MessageSquare className="h-4.5 w-4.5 flex-none text-[var(--color-teal-ink)]" />
              <span>
                <a href={site.textLine.href} className="font-bold text-[var(--color-ink)] hover:underline">
                  {c.textLine}: <span className="bidi-ltr whitespace-nowrap">{site.textLine.display}</span>
                </a>
                <span className="block text-[0.9rem] text-[var(--color-muted)]">{c.textLineHuman}</span>
              </span>
            </p>
            <p className="flex items-center gap-3">
              <Printer className="h-4.5 w-4.5 flex-none text-[var(--color-teal-ink)]" />
              <span>
                {c.contactCard.fax}: <span className="bidi-ltr whitespace-nowrap">{site.fax.display}</span>
              </span>
            </p>
            <p className="flex items-center gap-3">
              <Mail className="h-4.5 w-4.5 flex-none text-[var(--color-teal-ink)]" />
              <a href={`mailto:${site.email}`} className="break-all hover:underline">
                {site.email}
              </a>
            </p>
            <p className="flex items-center gap-3">
              <Clock className="h-4.5 w-4.5 flex-none text-[var(--color-teal-ink)]" />
              <span>
                {c.hours.weekdays}, {formatOfficeHours(locale, loc.hours)}
              </span>
            </p>
          </address>
          <a
            href={directionsUrl(loc.mapsQuery)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-navy mt-6 w-full sm:w-auto"
          >
            {c.getDirections}
          </a>
        </article>
      ))}
    </div>
  );
}
