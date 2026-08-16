// Shapes for the procedure-preparation library.
//
// Unlike blog/education content, each prep handout is transcribed from the
// Practice's own current instruction sheets (the 2026-07-07 scan, verified
// Against the source page-by-page). EN and ES bodies are therefore stored as
// SEPARATE section trees: where the practice publishes both languages, each
// Locale renders its own original verbatim (including their genuine
// Divergences); where only one language exists, the other is a faithful
// Translation of it. Structure is not forced to align across locales.
//
// Inline syntax inside strings (parsed by <PrepBody>):
//   **Bold**  — load-bearing emphasis from the source handout
//   ___       — a fill-in blank the office completes at scheduling
//               (3+ underscores; rendered as a writing line)

import type { Bi } from "@/lib/content/types";
import type { Locale } from "@/lib/site";

export type PrepGroupId = "colonoscopy" | "upper" | "capsule" | "sigmoidoscopy" | "diet";

export type PrepListStyle = "bullet" | "steps" | "check" | "avoid";

export type PrepBlock =
  | { readonly kind: "p"; readonly text: string }
  | { readonly kind: "list"; readonly style: PrepListStyle; readonly items: readonly string[] }
  /** Amber emphasis panel: the handout's boxed/starred warnings. */
  | { readonly kind: "note"; readonly text: readonly string[] }
  /** Two-regimen dosing table (Clenpiq/Sutab): one column per regimen. */
  | {
      readonly kind: "schedule";
      readonly columns: readonly { readonly title: string; readonly items: readonly string[] }[];
      readonly footer?: string;
    }
  /** Generic table (clear-liquid food groups, anti-reflux foods). */
  | {
      readonly kind: "table";
      readonly head: readonly string[];
      readonly rows: readonly string[][];
    };

export interface PrepSection {
  readonly heading?: string;
  readonly blocks: readonly PrepBlock[];
}

export interface PrepDoc {
  /** Route slug under /procedure-prep/. */
  readonly slug: string;
  /** Matching entry in lib/documents.ts (printable-PDF slot). */
  readonly docId: string;
  readonly group: PrepGroupId;
  /** Display title (the handout's own title, disambiguated). */
  readonly title: Bi;
  /** One-line regimen descriptor for listings and the page subtitle. */
  readonly regimen: Bi;
  /** Meta description / listing summary. */
  readonly summary: Bi;
  /** Provenance: pages in the practice's 2026-07-07 scan ("Preps Website.pdf"). */
  readonly sourcePages: string;
  /** Which locales the practice's own original exists in. */
  readonly sourceLangs: readonly Locale[];
  readonly sections: Record<Locale, PrepSection[]>;
}
