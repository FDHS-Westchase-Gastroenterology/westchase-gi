// Shared shapes for the on-site content library (blog + patient education).
// Every string that reaches a patient exists in ALL site languages (hard
// Rule 5, extended 2026-07-07: EN/ES joined by VI/KO/AR; the new languages
// Shipped machine-translated and still await post-launch verification by the
// Clinic's native speakers).

export interface Bi { en: string; es: string; vi: string; ko: string; ar: string }

export interface ContentSection {
  /** Optional section heading; omit for a leading paragraph block. */
  heading?: Bi;
  paragraphs: Bi[];
}

export interface BlogPost {
  /** Route slug, e.g. "how-fiber-supports-your-digestive-health". */
  slug: string;
  /** The old site's exact path (for the legacy redirect map). */
  legacyPath: string;
  title: Bi;
  /** Original publication date shown on the old site, ISO yyyy-mm-dd. */
  posted: string;
  /** One-or-two sentence listing teaser. */
  teaser: Bi;
  sections: ContentSection[];
}

export type EducationGroup = "procedures" | "conditions";

export interface EducationTopic {
  /** Route slug, e.g. "colonoscopy". */
  readonly slug: string;
  /** The old site's ASGE-library category id (redirect map), when it existed. */
  readonly legacyId?: string;
  readonly group: EducationGroup;
  readonly title: Bi;
  /** One-or-two sentence listing summary. */
  readonly summary: Bi;
  readonly sections: readonly ContentSection[];
  /** Matching disease-information-sheet id in lib/documents.ts, if any. */
  readonly relatedDocId?: string;
}
