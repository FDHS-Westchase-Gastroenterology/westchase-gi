"use client";

import { LOCALE_COOKIE, locales, type Locale } from "./site";

const SESSION_KEY = "wgi-language-choice-complete";
const localeSet = new Set<string>(locales);
export const LANGUAGE_TRIGGER_ID = "language-menu-trigger";
let completedInThisSession = false;

function readCookie(name: string): string | undefined {
  try {
    for (const cookie of document.cookie.split("; ")) {
      const [cookieName, value] = cookie.split("=");
      if (cookieName === name) return value;
    }
  } catch {
    // Cookie access can throw in hardened contexts; treat as absent.
  }
  return undefined;
}

function hasRememberedLocale(): boolean {
  const value = readCookie(LOCALE_COOKIE);
  return value !== undefined && localeSet.has(value);
}

/** First supported language in the browser's preference list. Mirrors the
 * proxy's Accept-Language negotiation (`negotiateLocale` in `src/proxy.ts`):
 * same primary-subtag matching, same English fallback. Client-side because
 * the chooser's gating evidence must survive response caches (I4). */
export function browserLocale(): Locale {
  try {
    for (const tag of navigator.languages ?? [navigator.language]) {
      const primary = tag.toLowerCase().split("-")[0];
      if (localeSet.has(primary)) return primary as Locale;
    }
  } catch {
    // A locked-down navigator falls through to the English default.
  }
  return "en";
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

/** A dismissal asserts no preference: suppress the dialog for this session
 * only — never as a stored choice, so a later mismatch can still help. */
export function dismissLanguageChoice() {
  completedInThisSession = true;
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // Module state still covers this client session.
  }
}
