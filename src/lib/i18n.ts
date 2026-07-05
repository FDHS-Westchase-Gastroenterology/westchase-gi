import { en, type Dictionary } from "./dictionaries/en";
import { es } from "./dictionaries/es";
import type { Locale } from "./site";

const dictionaries: Record<Locale, Dictionary> = { en, es };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.en;
}

export function isLocale(value: string): value is Locale {
  return value === "en" || value === "es";
}

export type { Dictionary };
