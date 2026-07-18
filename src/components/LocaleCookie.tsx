"use client";

import { useEffect } from "react";
import { LOCALE_COOKIE, type Locale } from "@/lib/site";

/** Remembers the language the visitor is actually reading, so the proxy can
 * send their next visit to `/` straight back to it. Renders nothing; without
 * JS the proxy still negotiates from Accept-Language. */
export function LocaleCookie({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  }, [locale]);

  return null;
}
