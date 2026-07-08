// Provider roster + profile content with VERBATIM credentials (practice
// directive: titles are specific and must not be changed). Sources: the
// practice's own door sign, its published provider card graphics (whose text
// is transcribed below, faithfully), the nurse-practitioner brochure, and the
// practice's 2026-07-06 correction: Awad is MD only (never FACG); Chang is
// MD, FACG; Mendoza is MD, MS (never FACG). Credential LINES follow the door
// sign + correction even where a card graphic differs (Chang's card adds
// FACP; Mendoza's card says MHSc) — bio prose keeps the practice's own
// claims as published.
//
// All display text is real, localizable type (client requirement 2026-07-07:
// graphic-borne text must follow the site language). The original card
// graphics stay in /images/staff/ byte-exact and are linked from each
// profile; the clean headshots are derived from the practice's own photo
// set (originals preserved in the project's assets archive).

import type { Bi } from "./content/types";

type Img = { src: string; width: number; height: number };

export type ProfileSection =
  | { kind: "timeline"; heading: Bi; entries: Array<{ title: Bi; detail: Bi }> }
  | { kind: "list"; heading: Bi; lead?: Bi; items: Bi[] }
  | { kind: "paragraphs"; heading: Bi; text: Bi[] };

export type Physician = {
  id: string;
  name: string;
  /** Verbatim, identical in every language (practice directive). */
  credentials: string;
  role: Bi;
  experience: Bi;
  boardCertified: Bi[];
  languagesSpoken: Bi;
  intro: Bi[];
  sections: ProfileSection[];
  quote: Bi | null;
  headshot: Img;
  /** The practice's own published card graphic, byte-exact, linked for reference. */
  card: Img;
  alt: Bi;
};

export const physicians: Physician[] = [
  {
    id: "john-chang",
    name: "John Chang",
    credentials: "MD, FACG",
    role: { en: "Gastroenterologist", es: "Gastroenterólogo" },
    experience: {
      en: "30+ years of experience",
      es: "Más de 30 años de experiencia",
    },
    boardCertified: [
      { en: "Internal Medicine", es: "Medicina Interna" },
      { en: "Gastroenterology", es: "Gastroenterología" },
    ],
    languagesSpoken: { en: "English & Korean", es: "Inglés y coreano" },
    intro: [
      {
        en: "Dr. John Chang has been practicing gastroenterology in Florida for more than 30 years. He is board-certified in Gastroenterology and Internal Medicine and is a Fellow of both the American College of Physicians (FACP) and the American College of Gastroenterology (FACG).",
        es: "El Dr. John Chang ejerce la gastroenterología en Florida desde hace más de 30 años. Está certificado por la junta en Gastroenterología y Medicina Interna, y es Fellow del American College of Physicians (FACP) y del American College of Gastroenterology (FACG).",
      },
      {
        en: "Since relocating his practice to the Tampa Bay area in 2007, Dr. Chang has remained committed to providing compassionate, patient-centered care and delivering the highest standards of digestive health services to the community.",
        es: "Desde que trasladó su consulta al área de Tampa Bay en 2007, el Dr. Chang mantiene su compromiso de brindar una atención compasiva y centrada en el paciente, con los más altos estándares de salud digestiva para la comunidad.",
      },
    ],
    sections: [
      {
        kind: "timeline",
        heading: { en: "Education & training", es: "Educación y formación" },
        entries: [
          {
            title: {
              en: "Columbia University · Birmingham-Southern College",
              es: "Columbia University · Birmingham-Southern College",
            },
            detail: {
              en: "Undergraduate studies in New York; Bachelor of Science in Birmingham, AL.",
              es: "Estudios universitarios en Nueva York; Bachelor of Science en Birmingham, AL.",
            },
          },
          {
            title: {
              en: "University of South Alabama College of Medicine",
              es: "University of South Alabama College of Medicine",
            },
            detail: {
              en: "Earned his medical degree in Mobile, AL.",
              es: "Obtuvo su título de médico en Mobile, AL.",
            },
          },
          {
            title: {
              en: "St. Vincent's Medical Center, New York",
              es: "St. Vincent's Medical Center, Nueva York",
            },
            detail: {
              en: "Internship and residency training in Internal Medicine.",
              es: "Internado y residencia en Medicina Interna.",
            },
          },
          {
            title: {
              en: "Nassau University Medical Center, Long Island",
              es: "Nassau University Medical Center, Long Island",
            },
            detail: {
              en: "Fellowship training in Gastroenterology.",
              es: "Fellowship (subespecialización) en Gastroenterología.",
            },
          },
        ],
      },
      {
        kind: "list",
        heading: {
          en: "Expert care for a wide range of conditions",
          es: "Atención experta para una amplia gama de condiciones",
        },
        items: [
          { en: "Acid reflux & GERD", es: "Reflujo ácido y ERGE" },
          { en: "Irritable bowel syndrome (IBS)", es: "Síndrome del intestino irritable (SII)" },
          { en: "Crohn's disease & ulcerative colitis", es: "Enfermedad de Crohn y colitis ulcerosa" },
          { en: "Liver diseases", es: "Enfermedades del hígado" },
          {
            en: "Colon polyps & colorectal cancer screening",
            es: "Pólipos de colon y detección del cáncer colorrectal",
          },
          { en: "Hepatitis & pancreatic disorders", es: "Hepatitis y trastornos del páncreas" },
          { en: "Constipation, diarrhea & more", es: "Estreñimiento, diarrea y más" },
        ],
      },
    ],
    quote: null,
    headshot: { src: "/images/staff/headshots/dr-chang.jpg", width: 880, height: 1161 },
    card: { src: "/images/staff/dr-chang.png", width: 1024, height: 1535 },
    alt: {
      en: "Dr. John Chang, MD, FACG, gastroenterologist at Westchase Gastroenterology",
      es: "Dr. John Chang, MD, FACG, gastroenterólogo de Westchase Gastroenterology",
    },
  },
  {
    id: "amir-awad",
    name: "Amir Awad",
    credentials: "MD",
    role: { en: "Gastroenterologist", es: "Gastroenterólogo" },
    experience: {
      en: "20+ years of experience",
      es: "Más de 20 años de experiencia",
    },
    boardCertified: [
      { en: "Internal Medicine", es: "Medicina Interna" },
      { en: "Gastroenterology", es: "Gastroenterología" },
    ],
    languagesSpoken: { en: "English & Arabic", es: "Inglés y árabe" },
    intro: [
      {
        en: "Dr. Amir Awad is a board-certified gastroenterologist dedicated to providing exceptional, state-of-the-art care to patients across the Tampa Bay area, with specialty fellowship training in Endoscopic Ultrasound and ERCP at Beth Israel Medical Center, New York.",
        es: "El Dr. Amir Awad es un gastroenterólogo certificado por la junta, dedicado a brindar una atención excepcional y de vanguardia a los pacientes del área de Tampa Bay, con formación de subespecialidad en Ultrasonido Endoscópico y CPRE en el Beth Israel Medical Center de Nueva York.",
      },
    ],
    sections: [
      {
        kind: "timeline",
        heading: { en: "Leadership & innovation", es: "Liderazgo e innovación" },
        entries: [
          {
            title: { en: "2006 — Bronx Lebanon Hospital", es: "2006 — Bronx Lebanon Hospital" },
            detail: {
              en: "Started the hospital's Endoscopic Ultrasound program, pioneering advanced diagnostic capabilities.",
              es: "Fundó el programa de Ultrasonido Endoscópico del hospital, siendo pionero en capacidades diagnósticas avanzadas.",
            },
          },
          {
            title: { en: "2009 — Tampa", es: "2009 — Tampa" },
            detail: {
              en: "Introduced Endoscopic Ultrasound technology to Town and Country Hospital, where he continues to practice today.",
              es: "Introdujo la tecnología de Ultrasonido Endoscópico en el Town and Country Hospital, donde continúa ejerciendo hoy.",
            },
          },
          {
            title: { en: "Today", es: "Hoy" },
            detail: {
              en: "Proudly serving the Tampa Bay community with advanced, compassionate gastroenterological care.",
              es: "Sirviendo con orgullo a la comunidad de Tampa Bay con atención gastroenterológica avanzada y compasiva.",
            },
          },
        ],
      },
      {
        kind: "list",
        heading: { en: "Comprehensive expertise", es: "Experiencia integral" },
        lead: {
          en: "Dr. Awad specializes in a full range of gastroenterological services, including:",
          es: "El Dr. Awad se especializa en una gama completa de servicios gastroenterológicos, que incluye:",
        },
        items: [
          { en: "Endoscopic ultrasound (EUS)", es: "Ultrasonido endoscópico (EUS)" },
          { en: "ERCP", es: "CPRE" },
          { en: "Pancreatic & biliary disorders", es: "Trastornos pancreáticos y biliares" },
          { en: "Liver diseases", es: "Enfermedades del hígado" },
          { en: "Inflammatory bowel disease", es: "Enfermedad inflamatoria intestinal" },
          {
            en: "Colonoscopy & colon cancer screening",
            es: "Colonoscopia y detección del cáncer de colon",
          },
          { en: "GERD & acid reflux", es: "ERGE y reflujo ácido" },
          { en: "General gastroenterology", es: "Gastroenterología general" },
        ],
      },
      {
        kind: "paragraphs",
        heading: { en: "Beyond medicine", es: "Más allá de la medicina" },
        text: [
          {
            en: "Dr. Awad is a devoted husband and proud father of three children. He enjoys fishing with his family and values time spent together.",
            es: "El Dr. Awad es un esposo dedicado y padre orgulloso de tres hijos. Disfruta pescar con su familia y valora el tiempo que pasan juntos.",
          },
          {
            en: "He is passionate about serving others both locally and globally: he has volunteered in numerous medical missions and charity clinics around the world, providing care to underserved communities in regions including Africa and South America.",
            es: "Le apasiona servir a los demás tanto a nivel local como global: ha sido voluntario en numerosas misiones médicas y clínicas benéficas alrededor del mundo, brindando atención a comunidades desatendidas en regiones como África y Sudamérica.",
          },
        ],
      },
    ],
    quote: {
      en: "My goal is to combine advanced technology with compassionate care to deliver the best possible outcomes for every patient.",
      es: "Mi objetivo es combinar tecnología avanzada con atención compasiva para lograr los mejores resultados posibles para cada paciente.",
    },
    headshot: { src: "/images/staff/headshots/dr-awad.jpg", width: 880, height: 1155 },
    card: { src: "/images/staff/dr-awad.png", width: 1024, height: 1535 },
    alt: {
      en: "Dr. Amir Awad, MD, gastroenterologist at Westchase Gastroenterology",
      es: "Dr. Amir Awad, MD, gastroenterólogo de Westchase Gastroenterology",
    },
  },
  {
    id: "alfredo-mendoza",
    name: "Alfredo Mendoza",
    credentials: "MD, MS",
    role: { en: "Gastroenterologist", es: "Gastroenterólogo" },
    experience: {
      en: "20+ years of experience",
      es: "Más de 20 años de experiencia",
    },
    boardCertified: [
      { en: "Internal Medicine", es: "Medicina Interna" },
      { en: "Gastroenterology", es: "Gastroenterología" },
      { en: "Transplant Hepatology", es: "Hepatología de Trasplante" },
    ],
    languagesSpoken: { en: "English & Spanish", es: "Inglés y español" },
    intro: [
      {
        en: "With more than 20 years of experience, Dr. Alfredo Mendoza provides comprehensive, state-of-the-art care for patients with gastrointestinal and liver diseases.",
        es: "Con más de 20 años de experiencia, el Dr. Alfredo Mendoza brinda una atención integral y de vanguardia a pacientes con enfermedades gastrointestinales y hepáticas.",
      },
    ],
    sections: [
      {
        kind: "timeline",
        heading: { en: "Education & training", es: "Educación y formación" },
        entries: [
          {
            title: {
              en: "Penn State Hershey Medical Center",
              es: "Penn State Hershey Medical Center",
            },
            detail: {
              en: "Internal Medicine residency and Gastroenterology fellowship in Hershey, Pennsylvania.",
              es: "Residencia en Medicina Interna y fellowship en Gastroenterología en Hershey, Pensilvania.",
            },
          },
          {
            title: {
              en: "Queen Elizabeth Hospital, United Kingdom",
              es: "Queen Elizabeth Hospital, Reino Unido",
            },
            detail: {
              en: "Hepatology fellowship in Birmingham, England.",
              es: "Fellowship en Hepatología en Birmingham, Inglaterra.",
            },
          },
          {
            title: { en: "Penn State University", es: "Penn State University" },
            detail: {
              en: "Master of Science in Health Evaluation Sciences, University Park, Pennsylvania.",
              es: "Maestría en Ciencias de Evaluación de la Salud, University Park, Pensilvania.",
            },
          },
        ],
      },
      {
        kind: "list",
        heading: { en: "Areas of expertise", es: "Áreas de especialización" },
        items: [
          { en: "General gastroenterology", es: "Gastroenterología general" },
          { en: "Colonoscopy and polyp removal", es: "Colonoscopia y extirpación de pólipos" },
          { en: "GERD and acid reflux", es: "ERGE y reflujo ácido" },
          { en: "Crohn's disease", es: "Enfermedad de Crohn" },
          { en: "Ulcerative colitis", es: "Colitis ulcerosa" },
          { en: "Liver diseases", es: "Enfermedades del hígado" },
          { en: "Fatty liver disease", es: "Enfermedad de hígado graso" },
        ],
      },
      {
        kind: "list",
        heading: { en: "Professional highlights", es: "Aspectos profesionales destacados" },
        items: [
          {
            en: "Joined Westchase Gastroenterology from Tampa General Hospital",
            es: "Se unió a Westchase Gastroenterology procedente del Tampa General Hospital",
          },
          {
            en: "Broad experience in the clinical management of complex gastrointestinal and liver conditions",
            es: "Amplia experiencia en el manejo clínico de condiciones gastrointestinales y hepáticas complejas",
          },
          {
            en: "Committed to delivering high-quality, compassionate care with excellent outcomes",
            es: "Comprometido con brindar una atención compasiva y de alta calidad, con excelentes resultados",
          },
        ],
      },
    ],
    quote: {
      en: "My goal is to provide the highest quality care with compassion, integrity, and respect — helping each patient achieve better health and a better quality of life.",
      es: "Mi objetivo es brindar la más alta calidad de atención con compasión, integridad y respeto, ayudando a cada paciente a lograr mejor salud y mejor calidad de vida.",
    },
    headshot: { src: "/images/staff/headshots/dr-mendoza.jpg", width: 880, height: 1141 },
    card: { src: "/images/staff/dr-mendoza.png", width: 922, height: 1382 },
    alt: {
      en: "Dr. Alfredo Mendoza, MD, MS, gastroenterologist at Westchase Gastroenterology",
      es: "Dr. Alfredo Mendoza, MD, MS, gastroenterólogo de Westchase Gastroenterology",
    },
  },
];

export type NursePractitioner = {
  id: string;
  name: string;
  credentials: string;
  role: Bi;
  focus: Bi[];
  tagline: Bi;
  headshot: Img;
  alt: Bi;
};

/** The practice's NP brochure/card content, per provider, as real text. */
export const nursePractitioners: {
  individuals: NursePractitioner[];
  sharedFocus: { heading: Bi; items: Bi[] };
  card: Img;
} = {
  individuals: [
    {
      id: "yanessa-ricardo",
      name: "Yanessa Ricardo",
      credentials: "MSN, APRN, FNP-C",
      role: { en: "Family Nurse Practitioner", es: "Enfermera Practicante Familiar" },
      focus: [
        { en: "Compassionate & patient-centered care", es: "Atención compasiva y centrada en el paciente" },
        { en: "Management of complex GI conditions", es: "Manejo de condiciones digestivas complejas" },
        { en: "Personalized treatment plans", es: "Planes de tratamiento personalizados" },
        { en: "Committed to your well-being", es: "Comprometida con su bienestar" },
      ],
      tagline: {
        en: "Committed to providing high-quality care and achieving the best outcomes for every patient.",
        es: "Comprometida a brindar atención de alta calidad y lograr los mejores resultados para cada paciente.",
      },
      headshot: { src: "/images/staff/headshots/yanessa-ricardo.jpg", width: 880, height: 1305 },
      alt: {
        en: "Yanessa Ricardo, MSN, APRN, FNP-C, family nurse practitioner at Westchase Gastroenterology",
        es: "Yanessa Ricardo, MSN, APRN, FNP-C, enfermera practicante familiar de Westchase Gastroenterology",
      },
    },
    {
      id: "taylor-emmerman",
      name: "Taylor Emmerman",
      credentials: "MSN, APRN, FNP-C",
      role: { en: "Family Nurse Practitioner", es: "Enfermera Practicante Familiar" },
      focus: [
        { en: "Compassionate, patient-focused care", es: "Atención compasiva y enfocada en el paciente" },
        { en: "Expert in GI health & chronic conditions", es: "Experta en salud digestiva y condiciones crónicas" },
        { en: "Education & empowerment", es: "Educación y empoderamiento" },
        { en: "Evidence-based practice", es: "Práctica basada en la evidencia" },
      ],
      tagline: {
        en: "Dedicated to helping patients achieve better digestive health and an improved quality of life.",
        es: "Dedicada a ayudar a los pacientes a lograr una mejor salud digestiva y una mejor calidad de vida.",
      },
      headshot: { src: "/images/staff/headshots/taylor-emmerman.jpg", width: 880, height: 1320 },
      alt: {
        en: "Taylor Emmerman, MSN, APRN, FNP-C, family nurse practitioner at Westchase Gastroenterology",
        es: "Taylor Emmerman, MSN, APRN, FNP-C, enfermera practicante familiar de Westchase Gastroenterology",
      },
    },
  ],
  sharedFocus: {
    heading: {
      en: "Partnering with you for better digestive health",
      es: "Trabajando con usted por una mejor salud digestiva",
    },
    items: [
      { en: "GERD & acid reflux", es: "ERGE y reflujo ácido" },
      { en: "IBS, IBD & Crohn's disease", es: "SII, EII y enfermedad de Crohn" },
      { en: "Liver health & fatty liver disease", es: "Salud hepática e hígado graso" },
      { en: "Colon cancer screening", es: "Detección del cáncer de colon" },
      { en: "Patient education & support", es: "Educación y apoyo al paciente" },
      { en: "Whole-person, compassionate care", es: "Atención integral y compasiva" },
    ],
  },
  card: { src: "/images/staff/nurse-practitioners.png", width: 1022, height: 1533 },
};

export type Biologic = { brand: string; generic: string; indication: Bi };

/** Juliet's own card content (RN, BSN per her card; practice-manager credit
 * added at the practice's request 2026-07-06 — she runs the office in
 * addition to infusion services). */
export const infusionNurse = {
  id: "juliet-oliva",
  name: "Juliet Oliva",
  credentials: "RN, BSN",
  role: {
    en: "Practice Manager & Infusion Nurse",
    es: "Gerente de la Oficina y Enfermera de Infusión",
  },
  motto: {
    en: "Comfort. Care. Compassion.",
    es: "Comodidad. Cuidado. Compasión.",
  } as Bi,
  languagesSpoken: { en: "English & Spanish", es: "Inglés y español" },
  intro: [
    {
      en: "Juliet is a dedicated infusion nurse committed to providing exceptional care in a comfortable and supportive environment. She partners with our medical team to ensure each patient receives safe, effective, and personalized infusion therapy.",
      es: "Juliet es una enfermera de infusión dedicada, comprometida a brindar una atención excepcional en un ambiente cómodo y de apoyo. Trabaja junto a nuestro equipo médico para asegurar que cada paciente reciba una terapia de infusión segura, eficaz y personalizada.",
    },
  ],
  specialty: {
    heading: {
      en: "Specializing in biologic infusion therapy",
      es: "Especializada en terapia de infusión biológica",
    },
    items: [
      { en: "Crohn's disease", es: "Enfermedad de Crohn" },
      { en: "Ulcerative colitis", es: "Colitis ulcerosa" },
      { en: "Inflammatory bowel disease (IBD)", es: "Enfermedad inflamatoria intestinal (EII)" },
    ],
  },
  approach: {
    heading: { en: "Her approach to care", es: "Su enfoque de atención" },
    items: [
      {
        en: "Expert administration of biologic and specialty infusions",
        es: "Administración experta de infusiones biológicas y especializadas",
      },
      { en: "Patient education and treatment guidance", es: "Educación al paciente y orientación sobre el tratamiento" },
      { en: "Monitoring during and after infusions", es: "Monitoreo durante y después de las infusiones" },
      {
        en: "Collaboration with physicians and the care team",
        es: "Colaboración con los médicos y el equipo de atención",
      },
      { en: "Insurance authorizations and scheduling", es: "Autorizaciones de seguro y programación de citas" },
      { en: "Compassionate, patient-centered care", es: "Atención compasiva y centrada en el paciente" },
    ],
  },
  biologics: {
    heading: { en: "Biologic medications we infuse", es: "Medicamentos biológicos que infundimos" },
    items: [
      {
        brand: "Entyvio",
        generic: "vedolizumab",
        indication: {
          en: "For moderate to severe Crohn's disease and ulcerative colitis",
          es: "Para enfermedad de Crohn y colitis ulcerosa de moderadas a graves",
        },
      },
      {
        brand: "Skyrizi",
        generic: "risankizumab-rzaa",
        indication: {
          en: "For moderate to severe Crohn's disease and ulcerative colitis",
          es: "Para enfermedad de Crohn y colitis ulcerosa de moderadas a graves",
        },
      },
      {
        brand: "Omvoh",
        generic: "mirikizumab-mrkz",
        indication: {
          en: "For moderately to severely active Crohn's disease",
          es: "Para enfermedad de Crohn activa de moderada a grave",
        },
      },
      {
        brand: "Remicade",
        generic: "infliximab",
        indication: {
          en: "For Crohn's disease, ulcerative colitis, and other inflammatory conditions",
          es: "Para enfermedad de Crohn, colitis ulcerosa y otras condiciones inflamatorias",
        },
      },
      {
        brand: "Inflectra",
        generic: "infliximab-dyyb",
        indication: {
          en: "For Crohn's disease, ulcerative colitis, and other inflammatory conditions",
          es: "Para enfermedad de Crohn, colitis ulcerosa y otras condiciones inflamatorias",
        },
      },
      {
        brand: "Avsola",
        generic: "infliximab-axxq",
        indication: {
          en: "For Crohn's disease, ulcerative colitis, and other inflammatory conditions",
          es: "Para enfermedad de Crohn, colitis ulcerosa y otras condiciones inflamatorias",
        },
      },
      {
        brand: "Renflexis",
        generic: "infliximab-abda",
        indication: {
          en: "For Crohn's disease, ulcerative colitis, and other inflammatory conditions",
          es: "Para enfermedad de Crohn, colitis ulcerosa y otras condiciones inflamatorias",
        },
      },
    ] satisfies Biologic[],
    note: {
      en: "And more — additional therapies are available based on your treatment plan.",
      es: "Y más: hay terapias adicionales disponibles según su plan de tratamiento.",
    },
  },
  quote: {
    en: "My goal is to help every patient feel comfortable, informed, and confident throughout their infusion journey.",
    es: "Mi objetivo es que cada paciente se sienta cómodo, informado y seguro durante todo su proceso de infusión.",
  },
  headshot: { src: "/images/staff/headshots/juliet-oliva.jpg", width: 880, height: 1320 },
  card: { src: "/images/staff/juliet-infusion-nurse.png", width: 1536, height: 1024 },
  alt: {
    en: "Juliet Oliva, RN, BSN, practice manager and infusion nurse at Westchase Gastroenterology",
    es: "Juliet Oliva, RN, BSN, gerente de la oficina y enfermera de infusión de Westchase Gastroenterology",
  },
} as const;

export const team = {
  id: "team",
  heading: "Team Members / Equipo de Trabajo",
  // The team image the practice's site published (its team-page banner crop).
  image: { src: "/images/staff/team-banner.jpg", width: 600, height: 200 },
  alt: {
    en: "The office team of Westchase Gastroenterology",
    es: "El equipo de oficina de Westchase Gastroenterology",
  },
} as const;
