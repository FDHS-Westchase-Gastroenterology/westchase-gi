"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  TELEMETRY_ROUTE_TEMPLATES,
  type AnalyticsEvent,
  type DeviceClass,
} from "@/lib/telemetry";
import { postBeacon } from "@/lib/telemetry-transport";
import { site } from "@/lib/site";
import type { Locale } from "@/lib/site";
import reviewTargets from "@/lib/review-targets.json";

// Aggregate, PHI-free beacon per the 2026-07-28 assessment (I6): four short
// enum/allowlist strings, no cookies, no free text, no journeys. Never
// blocking, fails silently — telemetry must never cost a patient anything.

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

export function track(
  event: AnalyticsEvent,
  routeTemplate: string,
  locale: Locale,
) {
  postBeacon(
    JSON.stringify({ event, routeTemplate, locale, deviceClass: deviceClass() }),
  );
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

/** form_view telemetry for the intake form: fires once, when the form first
 * genuinely enters the viewport (the honest funnel denominator). */
export function useFormViewTelemetry(
  formRef: React.RefObject<HTMLElement | null>,
  locale: Locale,
) {
  const pathname = usePathname();
  useEffect(() => {
    const form = formRef.current;
    const template = pathname ? routeTemplateFor(pathname) : null;
    if (!template) return;
    const fire = () => track("form_view", template, locale);
    if (!form || typeof IntersectionObserver === "undefined") {
      fire();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          fire();
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(form);
    return () => observer.disconnect();
  }, [formRef, locale, pathname]);
}

/** The intake funnel's state-machine events, from the form's own flow. */
export function trackFormEvent(
  event:
    | "form_submit"
    | "form_success"
    | "form_failure"
    | "form_unknown"
    | "form_throttled",
  pathname: string | null,
  locale: Locale,
) {
  const template = pathname ? routeTemplateFor(pathname) : null;
  if (template) track(event, template, locale);
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
