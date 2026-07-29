"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  TELEMETRY_ROUTE_TEMPLATES,
  type AnalyticsEvent,
  type DeviceClass,
} from "@/lib/telemetry";
import { site } from "@/lib/site";
import type { Locale } from "@/lib/site";
import reviewTargets from "@/lib/review-targets.json";

// Aggregate, PHI-free beacon per the 2026-07-28 assessment (I6): four short
// enum/allowlist strings, no cookies, no free text, no journeys. Never
// blocking, fails silently — telemetry must never cost a patient anything.

const TELEMETRY_ENDPOINT = "/api/telemetry";
const routeTemplateSet = new Set<string>(TELEMETRY_ROUTE_TEMPLATES);

const REVIEW_DESTINATIONS = new Set<string>([
  ...Object.values(reviewTargets).map((target) => target.destination),
  site.links.facebookReviews,
  site.links.healthgradesTampa,
  site.links.healthgradesLutz,
]);

/** Coarse device class from pointer and width — no user-agent sniffing. */
export function deviceClass(): DeviceClass {
  try {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const width = window.innerWidth;
    if (coarse && width < 768) return "mobile";
    if (coarse || width < 1024) return "tablet";
    return "desktop";
  } catch {
    return "desktop";
  }
}

/** Map a pathname to its allowlisted route template, or null when the route
 * is outside the patient surface (admin, review, 404 catch-all, unknown). */
export function routeTemplateFor(pathname: string): string | null {
  const withoutLocale = pathname.replace(/^\/(en|es|vi|ko|ar)(?=\/|$)/, "") || "/";
  return routeTemplateSet.has(withoutLocale) ? withoutLocale : null;
}

function post(payload: string) {
  try {
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon?.(TELEMETRY_ENDPOINT, blob)) return;
  } catch {
    // sendBeacon unavailable or threw — fall through to keepalive fetch.
  }
  try {
    void fetch(TELEMETRY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // Telemetry is best-effort by design.
    });
  } catch {
    // Never let telemetry break the page that carries it.
  }
}

export function track(
  event: AnalyticsEvent,
  routeTemplate: string,
  locale: Locale,
) {
  post(JSON.stringify({ event, routeTemplate, locale, deviceClass: deviceClass() }));
}

/** Channel taps, classified by destination so no chrome markup changes:
 * tel:/sms: protocols, the eCW patient portal, the Hushforms packets, and
 * the verified review destinations (practice + per-physician + profiles). */
function ctaEventFor(anchor: HTMLAnchorElement): AnalyticsEvent | null {
  const href = anchor.getAttribute("href") ?? "";
  if (href.startsWith("tel:")) return "cta_tap_call";
  if (href.startsWith("sms:")) return "cta_tap_text";
  if (href === site.links.portal) return "cta_tap_patient_portal";
  try {
    const url = new URL(href, window.location.origin);
    if (url.hostname === "hushforms.com") return "cta_tap_hushforms";
    if (REVIEW_DESTINATIONS.has(href) || REVIEW_DESTINATIONS.has(url.href)) {
      return "cta_tap_review";
    }
  } catch {
    // A malformed href is simply not a channel tap.
  }
  return null;
}

/**
 * Layout-level reporter: one page_view per navigation, plus the delegated
 * click listener that turns `data-cta`, protocol links (tel:/sms:), and
 * `data-telemetry-event`/`data-telemetry-route` attributes into events.
 * Mounted only under src/app/[locale] — /admin and /review never report.
 */
export function TelemetryReporter({ locale }: { locale: Locale }) {
  const pathname = usePathname() || `/${locale}`;

  useEffect(() => {
    const template = routeTemplateFor(pathname);
    if (template) track("page_view", template, locale);
  }, [pathname, locale]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;

      const customEvent = anchor.dataset.telemetryEvent as
        | AnalyticsEvent
        | undefined;
      const customRoute = anchor.dataset.telemetryRoute;
      if (customEvent && customRoute && routeTemplateSet.has(customRoute)) {
        track(customEvent, customRoute, locale);
        return;
      }

      const ctaEvent = ctaEventFor(anchor);
      const template = routeTemplateFor(window.location.pathname);
      if (ctaEvent && template) track(ctaEvent, template, locale);
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [locale]);

  return null;
}
