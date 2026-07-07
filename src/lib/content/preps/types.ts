// Shapes for the procedure-preparation library.
//
// Unlike blog/education content, each prep handout is transcribed from the
// practice's own current instruction sheets (the 2026-07-07 scan, verified
// against the source page-by-page). EN and ES bodies are therefore stored as
// SEPARATE section trees: where the practice publishes both languages, each
// locale renders its own original verbatim (including their genuine
// divergences); where only one language exists, the other is a faithful
// translation of it. Structure is not forced to align across locales.
//
// Inline syntax inside strings (parsed by <PrepBody>):
//   **bold**  — load-bearing emphasis from the source handout
//   ___       — a fill-in blank the office completes at scheduling
//               (3+ underscores; rendered as a writing line)

import type { Bi } from "../types";
import type { Locale } from "@/lib/site";

export type PrepGroupId =
  | "colonoscopy"
  | "upper"
  | "capsule"
  | "sigmoidoscopy"
  | "diet";

export type PrepListStyle = "bullet" | "steps" | "check" | "avoid";

export type PrepBlock =
  | { kind: "p"; text: string }
  | { kind: "list"; style: PrepListStyle; items: string[] }
  /** Amber emphasis panel: the handout's boxed/starred warnings. */
  | { kind: "note"; text: string[] }
  /** Two-regimen dosing table (Clenpiq/Sutab): one column per regimen. */
  | {
      kind: "schedule";
      columns: { title: string; items: string[] }[];
      footer?: string;
    }
  /** Generic table (clear-liquid food groups, anti-reflux foods). */
  | { kind: "table"; head: string[]; rows: string[][] };

export type PrepSection = {
  heading?: string;
  blocks: PrepBlock[];
};

export type PrepDoc = {
  /** Route slug under /procedure-prep/. */
  slug: string;
  /** Matching entry in lib/documents.ts (printable-PDF slot). */
  docId: string;
  group: PrepGroupId;
  /** Display title (the handout's own title, disambiguated). */
  title: Bi;
  /** One-line regimen descriptor for listings and the page subtitle. */
  regimen: Bi;
  /** Meta description / listing summary. */
  summary: Bi;
  /** Provenance: pages in the practice's 2026-07-07 scan ("Preps Website.pdf"). */
  sourcePages: string;
  /** Which locales the practice's own original exists in. */
  sourceLangs: Locale[];
  sections: Record<Locale, PrepSection[]>;
};
