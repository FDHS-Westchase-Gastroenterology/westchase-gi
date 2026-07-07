// Upper-endoscopy preps: EGD, Bravo pH study, and Halo ablation.
// The EGD sheet exists in both languages in the practice's scan (EN p. 25,
// ES p. 24) — each locale renders its own original, including the Spanish
// sheet's extra fiber reminder (genuine divergence, reproduced as-is).
// Bravo and Halo exist in English only; Spanish bodies are translations.

import type { PrepDoc, PrepSection } from "./types";
import { EN, ES_T, ES_O } from "./common";
import {
  bringSection,
  remindersSection,
  followUpSection,
} from "./builders";

/* ------------------------------------------------------------------ *
   EGD — esophagogastroduodenoscopy (EN p. 25; ES p. 24)
 * ------------------------------------------------------------------ */

const egdFrontEn: PrepSection[] = [
  {
    blocks: [
      { kind: "p", text: EN.readCarefully },
      { kind: "p", text: "**The day before your procedure:** ___" },
      {
        kind: "note",
        text: [
          "**Do not eat solid foods after seven (7) PM.**",
          "**Do not drink any liquids after midnight (12 AM).**",
        ],
      },
      { kind: "p", text: EN.appointmentLine },
      { kind: "note", text: [EN.dayOfNpo] },
    ],
  },
];

const egdFrontEs: PrepSection[] = [
  {
    blocks: [
      { kind: "p", text: ES_O.readCarefully },
      { kind: "p", text: "**El día antes de su procedimiento:** ___" },
      {
        kind: "note",
        text: [
          "**No comer ni ingerir sólidos después de las 7:00 PM.**",
          "**No ingerir líquidos después de la medianoche (12:00 AM).**",
        ],
      },
      { kind: "p", text: ES_O.appointmentLine },
      { kind: "note", text: [ES_O.dayOfNpo] },
    ],
  },
];

const egd: PrepDoc = {
  slug: "egd",
  docId: "prep-egd",
  group: "upper",
  title: {
    en: "EGD (Upper Endoscopy) Prep",
    es: "Preparación para EGD (endoscopia superior)",
  },
  regimen: {
    en: "No solid food after 7 PM the night before; no liquids after midnight",
    es: "Sin alimentos sólidos después de las 7 PM la noche anterior; sin líquidos después de la medianoche",
  },
  summary: {
    en: "EGD (upper endoscopy) preparation instructions from Westchase Gastroenterology: when to stop solids and liquids, medication guidance, and what to bring on the day of your procedure.",
    es: "Instrucciones de preparación para EGD (endoscopia superior) de Westchase Gastroenterology: cuándo suspender sólidos y líquidos, guía de medicamentos y qué traer el día de su procedimiento.",
  },
  sourcePages: "24–25",
  sourceLangs: ["en", "es"],
  sections: {
    en: [
      ...egdFrontEn,
      bringSection(EN),
      remindersSection(EN, { fiber: false }),
      followUpSection(EN),
    ],
    es: [
      ...egdFrontEs,
      bringSection(ES_O),
      // The practice's Spanish EGD sheet includes the fiber reminder the
      // English sheet omits — kept per side (verified against the scan).
      remindersSection(ES_O, { fiber: true }),
      followUpSection(ES_O),
    ],
  },
};

/* ------------------------------------------------------------------ *
   Bravo pH study (scan p. 26, EN)
 * ------------------------------------------------------------------ */

const bravoPriorEn: PrepSection = {
  heading: "Preparations prior to your procedure date",
  blocks: [
    {
      kind: "list",
      style: "check",
      items: [
        "**Five (5) days prior to your procedure date: STOP taking your proton pump inhibitor (PPI) medication.** PPI medications are: Omeprazole (Prilosec), Pantoprazole (Protonix), Lansoprazole (Prevacid), Rabeprazole (Aciphex), Zegerid, Nexium, and Dexilant.",
        "**Do not eat or drink after midnight the night before your procedure date.**",
      ],
    },
  ],
};

const bravoPriorEs: PrepSection = {
  heading: "Preparativos antes de la fecha de su procedimiento",
  blocks: [
    {
      kind: "list",
      style: "check",
      items: [
        "**Cinco (5) días antes de la fecha de su procedimiento: DEJE de tomar su medicamento inhibidor de la bomba de protones (IBP).** Los IBP son: Omeprazol (Prilosec), Pantoprazol (Protonix), Lansoprazol (Prevacid), Rabeprazol (Aciphex), Zegerid, Nexium y Dexilant.",
        "**No coma ni beba después de la medianoche, la noche anterior a la fecha de su procedimiento.**",
      ],
    },
  ],
};

const bravo: PrepDoc = {
  slug: "bravo",
  docId: "prep-bravo",
  group: "upper",
  title: { en: "Bravo Prep", es: "Preparación Bravo" },
  regimen: {
    en: "Stop PPI medication 5 days before; nothing to eat or drink after midnight",
    es: "Suspenda su medicamento IBP 5 días antes; nada de comer ni beber después de la medianoche",
  },
  summary: {
    en: "Bravo pH study preparation instructions from Westchase Gastroenterology: stop PPI medication five days before, fast after midnight, and review the medication guidance before your procedure.",
    es: "Instrucciones de preparación para el estudio Bravo de Westchase Gastroenterology: suspenda su medicamento IBP cinco días antes, ayune después de la medianoche y revise la guía de medicamentos antes de su procedimiento.",
  },
  sourcePages: "26",
  sourceLangs: ["en"],
  sections: {
    en: [
      { blocks: [{ kind: "p", text: EN.readCarefully }] },
      bravoPriorEn,
      {
        blocks: [
          { kind: "p", text: EN.appointmentLine },
          { kind: "note", text: [EN.dayOfNpo] },
        ],
      },
      bringSection(EN),
      remindersSection(EN, { fiber: false }),
      followUpSection(EN),
    ],
    es: [
      { blocks: [{ kind: "p", text: ES_T.readCarefully }] },
      bravoPriorEs,
      {
        blocks: [
          { kind: "p", text: ES_T.appointmentLine },
          { kind: "note", text: [ES_T.dayOfNpo] },
        ],
      },
      bringSection(ES_T),
      remindersSection(ES_T, { fiber: false }),
      followUpSection(ES_T),
    ],
  },
};

/* ------------------------------------------------------------------ *
   Halo ablation (scan p. 19, EN)
 * ------------------------------------------------------------------ */

const haloPriorEn: PrepSection = {
  heading: "Preparations prior to your procedure date",
  blocks: [
    {
      kind: "list",
      style: "check",
      items: [
        "**Five (5) days prior to your procedure date: INCREASE your proton pump inhibitor (PPI) medication to twice a day.** PPI medications are: Omeprazole (Prilosec), Pantoprazole (Protonix), Lansoprazole (Prevacid), Rabeprazole (Aciphex), Zegerid, Nexium, and Dexilant.",
        "**Do not eat or drink after midnight the night before the procedure date.**",
      ],
    },
  ],
};

const haloPriorEs: PrepSection = {
  heading: "Preparativos antes de la fecha de su procedimiento",
  blocks: [
    {
      kind: "list",
      style: "check",
      items: [
        "**Cinco (5) días antes de la fecha de su procedimiento: AUMENTE su medicamento inhibidor de la bomba de protones (IBP) a dos veces al día.** Los IBP son: Omeprazol (Prilosec), Pantoprazol (Protonix), Lansoprazol (Prevacid), Rabeprazol (Aciphex), Zegerid, Nexium y Dexilant.",
        "**No coma ni beba después de la medianoche, la noche anterior a la fecha del procedimiento.**",
      ],
    },
  ],
};

const halo: PrepDoc = {
  slug: "halo",
  docId: "prep-halo",
  group: "upper",
  title: { en: "Halo Prep", es: "Preparación Halo" },
  regimen: {
    en: "Increase PPI medication to twice a day for the 5 days before; nothing after midnight",
    es: "Aumente su medicamento IBP a dos veces al día durante los 5 días previos; nada después de la medianoche",
  },
  summary: {
    en: "Halo ablation preparation instructions from Westchase Gastroenterology: double your PPI medication for five days before, fast after midnight, and review the medication guidance.",
    es: "Instrucciones de preparación para la ablación Halo de Westchase Gastroenterology: duplique su medicamento IBP durante cinco días antes, ayune después de la medianoche y revise la guía de medicamentos.",
  },
  sourcePages: "19",
  sourceLangs: ["en"],
  sections: {
    en: [
      { blocks: [{ kind: "p", text: EN.readCarefully }] },
      haloPriorEn,
      {
        blocks: [
          { kind: "p", text: EN.appointmentLine },
          { kind: "note", text: [EN.dayOfNpo] },
        ],
      },
      bringSection(EN),
      remindersSection(EN, { fiber: false }),
      followUpSection(EN),
    ],
    es: [
      { blocks: [{ kind: "p", text: ES_T.readCarefully }] },
      haloPriorEs,
      {
        blocks: [
          { kind: "p", text: ES_T.appointmentLine },
          { kind: "note", text: [ES_T.dayOfNpo] },
        ],
      },
      bringSection(ES_T),
      remindersSection(ES_T, { fiber: false }),
      followUpSection(ES_T),
    ],
  },
};

export const upperPreps: PrepDoc[] = [egd, bravo, halo];
