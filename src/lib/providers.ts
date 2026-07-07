// Provider roster with VERBATIM credentials (practice directive: titles are
// specific and must not be changed). Sources: the practice's own door sign,
// nurse-practitioner brochure, and the practice's 2026-07-06 correction:
// Awad is MD only (his own FDHS card graphic agrees — never FACG);
// Chang is MD, FACG; Mendoza is MD, MS (never FACG). Card artwork is the
// practice's own graphics, byte-exact.

export type Provider = {
  id: string;
  name: string;
  credentials: string;
  /** Role line, localized. */
  role: { en: string; es: string };
  image: { src: string; width: number; height: number };
  alt: { en: string; es: string };
  /** Bio text arrives from the practice; render nothing until it exists. */
  bio: { en: string; es: string } | null;
};

export const physicians: Provider[] = [
  {
    id: "john-chang",
    name: "John Chang",
    credentials: "MD, FACG",
    role: { en: "Gastroenterologist", es: "Gastroenterólogo" },
    image: { src: "/images/staff/dr-chang.png", width: 1024, height: 1535 },
    alt: {
      en: "Dr. John Chang, MD, FACG, gastroenterologist at Westchase Gastroenterology",
      es: "Dr. John Chang, MD, FACG, gastroenterólogo de Westchase Gastroenterology",
    },
    bio: null,
  },
  {
    id: "amir-awad",
    name: "Amir Awad",
    credentials: "MD",
    role: { en: "Gastroenterologist", es: "Gastroenterólogo" },
    image: { src: "/images/staff/dr-awad.png", width: 1024, height: 1535 },
    alt: {
      en: "Dr. Amir Awad, MD, gastroenterologist at Westchase Gastroenterology",
      es: "Dr. Amir Awad, MD, gastroenterólogo de Westchase Gastroenterology",
    },
    bio: null,
  },
  {
    id: "alfredo-mendoza",
    name: "Alfredo Mendoza",
    credentials: "MD, MS",
    role: { en: "Gastroenterologist", es: "Gastroenterólogo" },
    image: { src: "/images/staff/dr-mendoza.png", width: 922, height: 1382 },
    alt: {
      en: "Dr. Alfredo Mendoza, MD, MS, gastroenterologist at Westchase Gastroenterology",
      es: "Dr. Alfredo Mendoza, MD, MS, gastroenterólogo de Westchase Gastroenterology",
    },
    bio: null,
  },
];

export const nursePractitioners = {
  id: "nurse-practitioners",
  names: ["Yanessa Ricardo", "Taylor Emmerman"],
  credentials: "MSN, APRN, FNP-C",
  role: { en: "Family Nurse Practitioners", es: "Enfermeras Practicantes Familiares" },
  image: { src: "/images/staff/nurse-practitioners.png", width: 1022, height: 1533 },
  alt: {
    en: "Yanessa Ricardo and Taylor Emmerman, MSN, APRN, FNP-C, family nurse practitioners",
    es: "Yanessa Ricardo y Taylor Emmerman, MSN, APRN, FNP-C, enfermeras practicantes familiares",
  },
} as const;

export const infusionNurse = {
  id: "juliet-oliva",
  name: "Juliet Oliva",
  // Practice-manager credit added at the practice's request (2026-07-06);
  // she runs the office in addition to infusion services.
  role: {
    en: "Practice Manager & Infusion Nurse",
    es: "Gerente de la Oficina y Enfermera de Infusión",
  },
  motto: "Comfort. Care. Compassion.",
  image: { src: "/images/staff/juliet-infusion-nurse.png", width: 1536, height: 1024 },
  alt: {
    en: "Juliet Oliva, practice manager and infusion nurse at Westchase Gastroenterology",
    es: "Juliet Oliva, gerente de la oficina y enfermera de infusión de Westchase Gastroenterology",
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
