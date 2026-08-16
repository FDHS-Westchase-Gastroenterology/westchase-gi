import { ar } from "./dictionaries/ar";
import { en } from "./dictionaries/en";
import type { Dictionary } from "./dictionaries/en";
import { es } from "./dictionaries/es";
import { ko } from "./dictionaries/ko";
import { vi } from "./dictionaries/vi";
import { localeSet } from "./site";
import type { Locale } from "./site";

const dictionaries = { en, es, vi, ko, ar } as const satisfies Record<Locale, Dictionary>;

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function isLocale(value: string): value is Locale {
  return localeSet.has(value);
}

export type { Dictionary };
