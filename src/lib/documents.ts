// Patient document registry. The practice's previous site linked 33 PDFs that
// all returned 404 from the old vendor's CDN; this registry replaces them.
// Rule: a document renders as a download link ONLY when `file` points to a
// real PDF in /public/documents. Until the practice supplies the current
// version, `file` stays null and the UI offers the staffed text line and
// front desk instead of a dead link. Never fake a file path.

export type DocCategory = "new-patient" | "procedure-prep" | "disease-info";

export type PracticeDocument = {
  id: string;
  category: DocCategory;
  label: { en: string; es: string };
  /** Path under /public, e.g. "/documents/new-patient-registration.pdf". */
  file: string | null;
};

export const documents: PracticeDocument[] = [
  // New-patient forms (printable). The online hushforms packet is live and is
  // the primary path; these mirror the old printable set.
  { id: "new-patient-registration", category: "new-patient", label: { en: "New Patient Registration", es: "Registro de pacientes nuevos" }, file: null },
  { id: "notice-of-privacy-practices", category: "new-patient", label: { en: "Notice of Privacy Practices", es: "Aviso de prácticas de privacidad" }, file: null },
  { id: "record-release-to-wcgi", category: "new-patient", label: { en: "Medical Record Release to WCGI", es: "Autorización para enviar expedientes médicos a WCGI" }, file: null },
  { id: "record-release-from-wcgi", category: "new-patient", label: { en: "Medical Record Release from WCGI", es: "Autorización para solicitar expedientes médicos de WCGI" }, file: null },

  // Procedure preparation instructions — the practice's CURRENT handout set
  // (Juliet's 2026-07-07 email, confirmed current; replaces the old site's
  // stale list of MoviPrep/OsmoPrep/Prepopik/Suprep/Magnesium Citrate).
  // Every one of these is readable on-site at /procedure-prep/<slug>
  // (see lib/content/preps); `file` remains the slot for a clean per-doc
  // printable PDF if the practice supplies one.
  { id: "prep-clenpiq-split-dose", category: "procedure-prep", label: { en: "Clenpiq Split-Dose Prep", es: "Preparación Clenpiq en dosis dividida" }, file: null },
  { id: "prep-clenpiq", category: "procedure-prep", label: { en: "Clenpiq Prep", es: "Preparación Clenpiq" }, file: null },
  { id: "prep-sutab", category: "procedure-prep", label: { en: "Sutab Prep", es: "Preparación Sutab" }, file: null },
  { id: "prep-colonoscopy-miralax", category: "procedure-prep", label: { en: "Colonoscopy Prep (MiraLAX)", es: "Preparación para colonoscopia (MiraLAX)" }, file: null },
  { id: "prep-colonoscopy-miralax-split-dose", category: "procedure-prep", label: { en: "Colonoscopy Split-Dose Prep (MiraLAX)", es: "Preparación para colonoscopia en dosis dividida (MiraLAX)" }, file: null },
  { id: "prep-golytely", category: "procedure-prep", label: { en: "Golytely Prep", es: "Preparación Golytely" }, file: null },
  { id: "prep-golytely-split-dose", category: "procedure-prep", label: { en: "Golytely Split-Dose Prep", es: "Preparación Golytely en dosis dividida" }, file: null },
  { id: "prep-egd", category: "procedure-prep", label: { en: "EGD (Upper Endoscopy) Prep", es: "Preparación para EGD (endoscopia superior)" }, file: null },
  { id: "prep-bravo", category: "procedure-prep", label: { en: "Bravo Prep", es: "Preparación Bravo" }, file: null },
  { id: "prep-halo", category: "procedure-prep", label: { en: "Halo Prep", es: "Preparación Halo" }, file: null },
  { id: "prep-endocapsule", category: "procedure-prep", label: { en: "Endocapsule Study Prep", es: "Preparación para el estudio de endocápsula" }, file: null },
  { id: "prep-sigmoidoscopy", category: "procedure-prep", label: { en: "Sigmoidoscopy Prep", es: "Preparación para sigmoidoscopia" }, file: null },
  { id: "prep-anti-reflux-diet", category: "procedure-prep", label: { en: "Anti-Reflux Diet Guidelines", es: "Guías de dieta antirreflujo" }, file: null },

  // Disease information sheets.
  { id: "info-abdominal-pain", category: "disease-info", label: { en: "Abdominal Pain", es: "Dolor abdominal" }, file: null },
  { id: "info-barretts-esophagus", category: "disease-info", label: { en: "Barrett's Esophagus", es: "Esófago de Barrett" }, file: null },
  { id: "info-colorectal-cancer", category: "disease-info", label: { en: "Colorectal Cancer", es: "Cáncer colorrectal" }, file: null },
  { id: "info-constipation", category: "disease-info", label: { en: "Constipation", es: "Estreñimiento" }, file: null },
  { id: "info-crohns-disease", category: "disease-info", label: { en: "Crohn's Disease", es: "Enfermedad de Crohn" }, file: null },
  { id: "info-diverticular-disease", category: "disease-info", label: { en: "Diverticular Disease", es: "Enfermedad diverticular" }, file: null },
  { id: "info-food-allergy", category: "disease-info", label: { en: "Food Allergy / Intolerance", es: "Alergia e intolerancia alimentaria" }, file: null },
  { id: "info-gallstones", category: "disease-info", label: { en: "Gallstones", es: "Cálculos biliares" }, file: null },
  { id: "info-gerd", category: "disease-info", label: { en: "Gastroesophageal Reflux", es: "Reflujo gastroesofágico" }, file: null },
  { id: "info-hemochromatosis", category: "disease-info", label: { en: "Hemochromatosis", es: "Hemocromatosis" }, file: null },
  { id: "info-ibd", category: "disease-info", label: { en: "Inflammatory Bowel Disease", es: "Enfermedad inflamatoria intestinal" }, file: null },
  { id: "info-intestinal-gas", category: "disease-info", label: { en: "Intestinal Gas", es: "Gases intestinales" }, file: null },
  { id: "info-liver-disease", category: "disease-info", label: { en: "Liver Disease", es: "Enfermedad hepática" }, file: null },
  { id: "info-rectal-disease", category: "disease-info", label: { en: "Rectal Disease", es: "Enfermedades rectales" }, file: null },
  { id: "info-ulcers", category: "disease-info", label: { en: "Ulcers", es: "Úlceras" }, file: null },
  { id: "info-ulcerative-colitis", category: "disease-info", label: { en: "Ulcerative Colitis", es: "Colitis ulcerosa" }, file: null },
];

export function documentsByCategory(category: DocCategory): PracticeDocument[] {
  return documents.filter((d) => d.category === category);
}
