// Conditions and procedures as published by the practice. Polish applied:
// the misspelled duplicate "Barret Esophagus" entry became a single corrected
// "Barrett's Esophagus" item (removed from the GERD parenthetical to avoid
// listing it twice). Spanish is a first-class translation of the same lists.

export type Bilingual = { en: string; es: string };

export const conditions: Bilingual[] = [
  { en: "Celiac Disease", es: "Enfermedad celíaca" },
  { en: "Colon Screening", es: "Exámenes de detección de colon" },
  { en: "Crohn's Disease", es: "Enfermedad de Crohn" },
  { en: "Diverticular Disease", es: "Enfermedad diverticular" },
  { en: "Gallbladder Disease", es: "Enfermedad de la vesícula biliar" },
  { en: "Gastroesophageal Reflux Disease (acid reflux, GERD)", es: "Enfermedad por reflujo gastroesofágico (reflujo ácido, ERGE)" },
  { en: "Barrett's Esophagus", es: "Esófago de Barrett" },
  { en: "Gastric/Peptic Ulcers", es: "Úlceras gástricas y pépticas" },
  { en: "Hepatitis B", es: "Hepatitis B" },
  { en: "Hepatitis C", es: "Hepatitis C" },
  { en: "Hiatal Hernia", es: "Hernia de hiato" },
  { en: "Internal Hemorrhoids", es: "Hemorroides internas" },
  { en: "Irritable Bowel Syndrome", es: "Síndrome del intestino irritable" },
  { en: "Liver Disease (Fatty Liver)", es: "Enfermedad hepática (hígado graso)" },
  { en: "Ulcerative Colitis and other digestive complications", es: "Colitis ulcerosa y otras complicaciones digestivas" },
];

export const procedures: Bilingual[] = [
  { en: "Bravo Capsule Study (36-hour esophageal pH study)", es: "Estudio con cápsula Bravo (estudio de pH esofágico de 36 horas)" },
  { en: "Colonoscopy / Sigmoidoscopy", es: "Colonoscopia / Sigmoidoscopia" },
  { en: "Endocapsule Study (small bowel capsule study)", es: "Estudio con endocápsula (cápsula del intestino delgado)" },
  { en: "Endoscopic Retrograde Cholangiopancreatography (ERCP)", es: "Colangiopancreatografía retrógrada endoscópica (CPRE)" },
  { en: "Endoscopic Ultrasound", es: "Ultrasonido endoscópico" },
  { en: "Esophagogastroduodenoscopy (EGD)", es: "Esofagogastroduodenoscopia (EGD)" },
  { en: "Halo Study (Barrett's Esophagus ablation)", es: "Estudio Halo (ablación del esófago de Barrett)" },
  // Added at the practice's request 2026-07-06. Conservative phrasing; the
  // practice already lists "Liver Ultrasound & Elastography" on its About page.
  { en: "Liver Elastography (non-invasive liver stiffness assessment)", es: "Elastografía hepática (evaluación no invasiva de la rigidez del hígado)" },
  { en: "Motility Study", es: "Estudio de motilidad" },
  { en: "Hemorrhoid Banding (non-invasive treatment of internal hemorrhoids)", es: "Ligadura de hemorroides (tratamiento no invasivo de las hemorroides internas)" },
];
