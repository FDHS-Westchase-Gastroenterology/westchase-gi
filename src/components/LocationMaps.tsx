import { site, directionsUrl, mapEmbedUrl, type Locale } from "@/lib/site";
import type { Dictionary } from "@/lib/i18n";
import { MapPin } from "./icons";

type LocationMapsProps = { locale: Locale; dict: Dictionary };

/**
 * Live maps for both offices (the old site's new-patients page embedded a
 * map, so the ported "map and directions" copy must stay backed by one).
 * Keyless Google embed, localized via `hl`, lazy-loaded below the fold.
 */
export function LocationMaps({ locale, dict }: LocationMapsProps) {
  const c = dict.common;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {site.locations.map((loc) => (
        <figure
          key={loc.id}
          className="overflow-hidden rounded-[var(--radius-lg)] bg-white shadow-[var(--shadow-soft)]"
        >
          <iframe
            src={mapEmbedUrl(loc.mapsQuery, locale)}
            title={c.maps.titles[loc.id]}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            className="block h-72 w-full border-0 sm:h-80"
          />
          <figcaption className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-5">
            <span className="flex items-start gap-3">
              <MapPin className="mt-1 h-4.5 w-4.5 flex-none text-[var(--color-teal-ink)]" />
              <span>
                <span className="block font-extrabold text-[var(--color-ink)]">
                  {locale === "es" ? loc.nameEs : loc.name}
                </span>
                <span className="block text-[0.95rem] text-[var(--color-muted)]">
                  {loc.street}, {loc.city}, {loc.region} {loc.postal}
                </span>
              </span>
            </span>
            <a
              href={directionsUrl(loc.mapsQuery)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-navy btn-sm"
            >
              {c.getDirections}
            </a>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
