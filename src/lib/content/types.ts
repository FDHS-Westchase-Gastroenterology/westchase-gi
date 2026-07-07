// Shared shapes for the on-site content library (blog + patient education).
// Every string that reaches a patient exists in BOTH languages (hard rule 5).

export type Bi = { en: string; es: string };

export type ContentSection = {
  /** Optional section heading; omit for a leading paragraph block. */
  heading?: Bi;
  paragraphs: Bi[];
};

export type BlogPost = {
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
};

export type EducationGroup = "procedures" | "conditions";

export type EducationTopic = {
  /** Route slug, e.g. "colonoscopy". */
  slug: string;
  /** The old site's ASGE-library category id (redirect map), when it existed. */
  legacyId?: string;
  group: EducationGroup;
  title: Bi;
  /** One-or-two sentence listing summary. */
  summary: Bi;
  sections: ContentSection[];
  /** Matching disease-information-sheet id in lib/documents.ts, if any. */
  relatedDocId?: string;
};
