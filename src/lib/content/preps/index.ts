// The procedure-preparation library: the practice's CURRENT 13 handouts,
// transcribed from the scan Juliet emailed 2026-07-07 ("Preps Website.pdf",
// 26 pages) and confirmed by the practice as the current set. Dose timings
// were human-verified against the scan the same day (PROJECT-LOG safety
// gate). 16 source files → 13 documents: three sheets (anti-reflux diet,
// split-dose MiraLAX colonoscopy, EGD) exist in both English and Spanish.
//
// NOTE: this set REPLACES the previous site's prep list. The old site
// offered MoviPrep, OsmoPrep, Prepopik (2 doses), Suprep, and a standalone
// Magnesium Citrate prep; the practice's current handouts instead use
// Clenpiq (2 variants), Sutab, MiraLAX (2 variants), and Golytely
// (2 variants) — plus EGD/Bravo/Halo/Endocapsule/Sigmoidoscopy and the
// anti-reflux diet sheet.

import type { Bi } from "../types";
import type { PrepDoc, PrepGroupId } from "./types";
import { clenpiqSutabPreps } from "./colonoscopy-clenpiq-sutab";
import { miralaxGolytelyPreps } from "./colonoscopy-miralax-golytely";
import { upperPreps } from "./upper";
import { otherPreps } from "./other";

export type { PrepDoc, PrepGroupId, PrepSection, PrepBlock } from "./types";

export const prepDocs: PrepDoc[] = [
  ...clenpiqSutabPreps,
  ...miralaxGolytelyPreps,
  ...upperPreps,
  ...otherPreps,
];

export type PrepGroup = {
  id: PrepGroupId;
  title: Bi;
  blurb: Bi;
  docs: PrepDoc[];
};

const groupMeta: Array<{ id: PrepGroupId; title: Bi; blurb: Bi }> = [
  {
    id: "colonoscopy",
    title: { en: "Colonoscopy preps", es: "Preparaciones para colonoscopia" },
    blurb: {
      en: "Your care team prescribes ONE of these — the prep on your prescription or in your packet matches one sheet below.",
      es: "Su equipo de atención le receta UNA de estas — la preparación en su receta o en su paquete corresponde a una de las hojas siguientes.",
    },
  },
  {
    id: "upper",
    title: {
      en: "Upper endoscopy",
      es: "Endoscopia superior",
    },
    blurb: {
      en: "EGD and the studies performed with it.",
      es: "EGD y los estudios que se realizan con ella.",
    },
  },
  {
    id: "capsule",
    title: { en: "Capsule endoscopy", es: "Cápsula endoscópica" },
    blurb: {
      en: "The swallowed-camera small bowel study.",
      es: "El estudio del intestino delgado con cámara ingerible.",
    },
  },
  {
    id: "sigmoidoscopy",
    title: { en: "Sigmoidoscopy", es: "Sigmoidoscopia" },
    blurb: {
      en: "A shorter lower exam with a simpler prep.",
      es: "Un examen inferior más corto con una preparación más sencilla.",
    },
  },
  {
    id: "diet",
    title: { en: "Diet guidelines", es: "Guías de dieta" },
    blurb: {
      en: "Handouts your physician may give you alongside a procedure.",
      es: "Hojas que su médico puede entregarle junto con un procedimiento.",
    },
  },
];

export const prepGroups: PrepGroup[] = groupMeta.map((g) => ({
  ...g,
  docs: prepDocs.filter((d) => d.group === g.id),
}));

export function getPrep(slug: string): PrepDoc | undefined {
  return prepDocs.find((d) => d.slug === slug);
}

/** Prep page for a document-registry id, if one exists (mirrors
 *  education's topicForDocument). */
export function prepForDocument(docId: string): PrepDoc | undefined {
  return prepDocs.find((d) => d.docId === docId);
}
