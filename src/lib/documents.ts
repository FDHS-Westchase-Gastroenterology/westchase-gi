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

  // Procedure preparation instructions.
  { id: "prep-bravo", category: "procedure-prep", label: { en: "Bravo Prep", es: "Preparación Bravo" }, file: null },
  { id: "prep-egd", category: "procedure-prep", label: { en: "EGD Prep", es: "Preparación para EGD" }, file: null },
  { id: "prep-endocapsule", category: "procedure-prep", label: { en: "Endocapsule Prep", es: "Preparación para endocápsula" }, file: null },
  { id: "prep-golytely", category: "procedure-prep", label: { en: "GoLYTELY Prep", es: "Preparación GoLYTELY" }, file: null },
  { id: "prep-halo", category: "procedure-prep", label: { en: "Halo Prep", es: "Preparación Halo" }, file: null },
  { id: "prep-magnesium-citrate", category: "procedure-prep", label: { en: "Magnesium Citrate Prep", es: "Preparación con citrato de magnesio" }, file: null },
  { id: "prep-miralax", category: "procedure-prep", label: { en: "MiraLAX Prep", es: "Preparación MiraLAX" }, file: null },
  { id: "prep-moviprep", category: "procedure-prep", label: { en: "MoviPrep", es: "Preparación MoviPrep" }, file: null },
  { id: "prep-osmoprep", category: "procedure-prep", label: { en: "OsmoPrep", es: "Preparación OsmoPrep" }, file: null },
  { id: "prep-prepopik-day-before", category: "procedure-prep", label: { en: "Prepopik (day-before dose)", es: "Prepopik (dosis del día anterior)" }, file: null },
  { id: "prep-prepopik-split", category: "procedure-prep", label: { en: "Prepopik (split dose)", es: "Prepopik (dosis dividida)" }, file: null },
  { id: "prep-sigmoidoscopy", category: "procedure-prep", label: { en: "Sigmoidoscopy Prep", es: "Preparación para sigmoidoscopia" }, file: null },
  { id: "prep-suprep", category: "procedure-prep", label: { en: "Suprep Prep", es: "Preparación Suprep" }, file: null },

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
