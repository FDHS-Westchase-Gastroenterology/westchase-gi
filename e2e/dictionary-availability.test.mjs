import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { z } from "zod";

import { ar } from "../src/lib/dictionaries/ar.ts";
import { en } from "../src/lib/dictionaries/en.ts";
import { es } from "../src/lib/dictionaries/es.ts";
import { ko } from "../src/lib/dictionaries/ko.ts";
import { vi } from "../src/lib/dictionaries/vi.ts";
import {
  asJsonArray,
  asJsonObject,
  asJsonString,
  jsonSchema,
} from "../src/lib/json.ts";

// I5 availability guard: no patient-facing dictionary string may name a
// Language set smaller than the site's actual five-locale set unless the key
// Carries a dated waiver comment in the dictionary source. Waivers document
// The settled exceptions (the genuinely EN/ES-only external Hushforms packet,
// English-only testimonials and ASGE guides, and per-locale action labels
// Like "Continue in English" that name the current locale, not a claim).

const DICTIONARIES = { en, es, vi, ko, ar };

const LANGUAGE_PATTERNS = {
  English: /English|inglés|Tiếng Anh|영어|الإنجليزية/iu,
  Spanish: /Spanish|español|Tiếng Tây Ban Nha|스페인어|الإسبانية/iu,
  Vietnamese: /Vietnamese|vietnamita|Tiếng Việt|베트남어|الفيتنامية/iu,
  Korean: /Korean|coreano|Tiếng Hàn|한국어|الكورية/iu,
  Arabic: /Arabic|árabe|Tiếng Ả Rập|아랍어|العربية/iu,
};

const SITE_LANGUAGE_COUNT = Object.keys(LANGUAGE_PATTERNS).length;

function namedLanguages(value) {
  return Object.entries(LANGUAGE_PATTERNS)
    .filter(([, pattern]) => pattern.test(value))
    .map(([language]) => language);
}

function collectStrings(node, path = [], out = []) {
  const parsed = jsonSchema.safeParse(node);
  if (!parsed.success) return out;

  const text = asJsonString(parsed.data);
  if (text !== null) {
    out.push({ path: path.join("."), value: text });
    return out;
  }

  const items = asJsonArray(parsed.data);
  if (items !== null) {
    items.forEach((item, index) =>
      collectStrings(item, [...path, String(index)], out),
    );
    return out;
  }

  const record = asJsonObject(parsed.data);
  if (record !== null) {
    for (const [key, child] of Object.entries(record)) {
      collectStrings(child, [...path, key], out);
    }
  }
  return out;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sourceFor(locale) {
  return readFileSync(
    resolve(process.cwd(), "src", "lib", "dictionaries", `${locale}.ts`),
    "utf8",
  );
}

function waiverPattern(keyPath) {
  return new RegExp(
    `i5-waiver\\s+\\d{4}-\\d{2}-\\d{2}\\s+${escapeRegExp(keyPath)}(?=[:\\s])`,
  );
}

for (const [locale, dictionary] of Object.entries(DICTIONARIES)) {
  test(`${locale}: language-naming strings name all five languages or carry a dated waiver`, () => {
    const source = sourceFor(locale);
    const violations = [];
    for (const { path, value } of collectStrings(dictionary)) {
      const named = namedLanguages(value);
      if (named.length === 0 || named.length === SITE_LANGUAGE_COUNT) continue;
      if (!waiverPattern(path).test(source)) {
        violations.push(`${path} names ${named.join(", ")}`);
      }
    }
    assert.deepEqual(
      violations,
      [],
      `strings naming fewer than ${SITE_LANGUAGE_COUNT} languages without a dated i5-waiver: ${violations.join("; ")}`,
    );
  });

  test(`${locale}: no stale i5-waiver comments`, () => {
    const source = sourceFor(locale);
    const strings = new Map(
      collectStrings(dictionary).map(({ path, value }) => [path, value]),
    );
    const stale = [];
    for (const match of source.matchAll(
      /i5-waiver\s+\d{4}-\d{2}-\d{2}\s+([a-zA-Z0-9.]+)(?=[:\s])/g,
    )) {
      const keyPath = match[1];
      const value = z.string().safeParse(strings.get(keyPath));
      if (!value.success) {
        stale.push(`${keyPath} (key does not exist)`);
        continue;
      }
      const named = namedLanguages(value.data);
      if (named.length === 0 || named.length === SITE_LANGUAGE_COUNT) {
        stale.push(`${keyPath} (no longer names a smaller language set)`);
      }
    }
    assert.deepEqual(
      stale,
      [],
      `stale i5-waiver comments to remove: ${stale.join("; ")}`,
    );
  });
}
