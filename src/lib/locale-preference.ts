"use client";

import { LOCALE_COOKIE, locales, type Locale } from "./site";

const SESSION_KEY = "wgi-language-choice-complete";
const localeSet = new Set<string>(locales);
export const LANGUAGE_TRIGGER_ID = "language-menu-trigger";
let completedInThisSession = false;

function hasRememberedLocale(): boolean {
  try {
    return document.cookie.split("; ").some((cookie) => {
      const [name, value] = cookie.split("=");
      return name === LOCALE_COOKIE && localeSet.has(value);
    });
  } catch {
    return false;
  }
}

export function hasCompletedLanguageChoice(): boolean {
  if (completedInThisSession || hasRememberedLocale()) return true;
  try {
    completedInThisSession = sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    // Module state still prevents repeats during client-side navigation.
  }
  return completedInThisSession;
}

/** Store an explicit choice. Session state is the fallback when cookies fail. */
export function rememberLocale(locale: Locale) {
  completedInThisSession = true;
  try {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // A blocked cookie may make the chooser return in a later browser session.
  }
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // Module state still covers this client session.
  }
}
