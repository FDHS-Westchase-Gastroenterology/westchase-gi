import { en, type Dictionary } from "./dictionaries/en";
import { es } from "./dictionaries/es";
import { vi } from "./dictionaries/vi";
import { ko } from "./dictionaries/ko";
import { ar } from "./dictionaries/ar";
import { locales, type Locale } from "./site";

const dictionaries: Record<Locale, Dictionary> = { en, es, vi, ko, ar };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.en;
}

export function isLocale(value: string): value is Locale {
  return (locales as string[]).includes(value);
}

export type { Dictionary };
