// Patient resource links. Every URL verified live 2026-07-04 (recon link
// audit or manual fetch). Changes from the old Links page:
// - ccfa.org (unreachable; the foundation renamed) -> crohnscolitisfoundation.org
// - the 17-topic ASGE library the old vendor hosted -> ASGE's own patient hub
// liverfoundation.org and crohnscolitisfoundation.org block automated
// requests (HTTP 403) but load normally in a browser; both are the
// organizations' canonical domains.

import type { Bi } from "./content/types";

export type ResourceLink = {
  topic: Bi;
  org: string;
  url: string;
  description: Bi;
};

export const patientResources: ResourceLink[] = [
  {
    topic: { en: "Irritable Bowel Syndrome", es: "Síndrome del intestino irritable" },
    org: "International Foundation for Gastrointestinal Disorders",
    url: "https://www.iffgd.org",
    description: {
      en: "Information on irritable bowel syndrome, bloating, and many other GI disorders where the function of the bowel is involved.",
      es: "Información sobre el síndrome del intestino irritable, la distensión abdominal y muchos otros trastornos funcionales del aparato digestivo.",
    },
  },
  {
    topic: { en: "Inflammatory Bowel Disease", es: "Enfermedad inflamatoria intestinal" },
    org: "Crohn's & Colitis Foundation",
    url: "https://www.crohnscolitisfoundation.org",
    description: {
      en: "A very helpful resource for patients with Crohn's disease and ulcerative colitis.",
      es: "Un recurso muy útil para pacientes con enfermedad de Crohn y colitis ulcerosa.",
    },
  },
  {
    topic: { en: "Liver Disease", es: "Enfermedad hepática" },
    org: "American Liver Foundation",
    url: "https://www.liverfoundation.org",
    description: {
      en: "Information on many different liver conditions.",
      es: "Información sobre una gran variedad de enfermedades del hígado.",
    },
  },
  {
    topic: { en: "Hemochromatosis", es: "Hemocromatosis" },
    org: "Iron Overload Disease Association",
    url: "https://www.ironoverload.org",
    description: {
      en: "Information about hemochromatosis and iron overload.",
      es: "Información sobre la hemocromatosis y la sobrecarga de hierro.",
    },
  },
  {
    topic: { en: "Celiac Disease", es: "Enfermedad celíaca" },
    org: "Celiac.com",
    url: "https://www.celiac.com",
    description: {
      en: "Helpful information regarding celiac disease and dietary needs.",
      es: "Información útil sobre la enfermedad celíaca y las necesidades dietéticas.",
    },
  },
  {
    topic: { en: "Ostomy", es: "Ostomía" },
    org: "United Ostomy Associations",
    url: "https://www.uoa.org",
    description: {
      en: "Information on intestinal and urinary ostomies.",
      es: "Información sobre ostomías intestinales y urinarias.",
    },
  },
];

export const professionalOrgs = [
  { name: "American College of Gastroenterology", url: "https://gi.org" },
  { name: "American Society for Gastrointestinal Endoscopy", url: "https://www.asge.org" },
  { name: "American Gastroenterological Association", url: "https://www.gastro.org" },
];

// ASGE's public patient hub replaces the vendor-hosted article library.
export const patientEducation = {
  url: "https://www.asge.org/home/for-patients",
  conditionsUrl: "https://www.asge.org/home/for-patients/conditions",
  proceduresUrl: "https://www.asge.org/home/for-patients/procedures",
};
