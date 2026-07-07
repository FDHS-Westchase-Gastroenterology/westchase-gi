// Colonoscopy preps: Clenpiq split-dose, Clenpiq, and Sutab.
// English bodies are the practice's originals (scan pp. 4–9); Spanish
// bodies are faithful translations (no Spanish originals exist for these).

import type { PrepDoc, PrepSection } from "./types";
import { EN, ES_T } from "./common";
import { standardFront, avoidAndLiquids } from "./builders";

/* ------------------------------------------------------------------ *
   Clenpiq split-dose (scan pp. 4–5)
 * ------------------------------------------------------------------ */

const clenpiqSplitDayBeforeEn: PrepSection[] = [
  {
    heading: EN.dayBeforeHeading,
    blocks: [
      { kind: "p", text: EN.noSolids },
      { kind: "p", text: EN.drinkHourly("Clenpiq") },
      {
        kind: "p",
        text: "Clenpiq preparation consists of two (2) regimens taken with the clear liquid of your choice.",
      },
      {
        kind: "schedule",
        columns: [
          {
            title: "Night before your procedure ___",
            items: [
              "**First regimen — take at 4 PM.** A. Take as instructed.",
              "Drink five (5) 8-ounce glasses of clear liquids before your second dose of Clenpiq.",
            ],
          },
          {
            title: "Morning of your procedure ___",
            items: [
              "**Second regimen — take at ___ AM.** B. Repeat step A.",
              // Source wording (verified against the scan 2026-07-07):
              // the morning-of column says "before bedtime".
              "Drink three (3) 8-ounce glasses of clear liquids before bedtime.",
            ],
          },
        ],
        footer: "There has to be a **six (6) hour time span between each regimen.**",
      },
      {
        kind: "p",
        text: "**One hour** after completing the **second regimen**, take two (2) tablets of Dulcolax (Bisacodyl) 5 mg by mouth.",
      },
      { kind: "p", text: EN.hydrate("Clenpiq") },
    ],
  },
];

const clenpiqSplitDayBeforeEs: PrepSection[] = [
  {
    heading: ES_T.dayBeforeHeading,
    blocks: [
      { kind: "p", text: ES_T.noSolids },
      { kind: "p", text: ES_T.drinkHourly("Clenpiq") },
      {
        kind: "p",
        text: "La preparación con Clenpiq consiste en dos (2) regímenes, tomados con el líquido claro de su preferencia.",
      },
      {
        kind: "schedule",
        columns: [
          {
            title: "La noche antes de su procedimiento ___",
            items: [
              "**Primer régimen — tome a las 4 PM.** A. Tómelo según las instrucciones.",
              "Tome cinco (5) vasos de 8 onzas de líquidos claros antes de su segunda dosis de Clenpiq.",
            ],
          },
          {
            title: "La mañana de su procedimiento ___",
            items: [
              "**Segundo régimen — tome a las ___ AM.** B. Repita el paso A.",
              // Reproduces the English original's "before bedtime" wording.
              "Tome tres (3) vasos de 8 onzas de líquidos claros antes de acostarse.",
            ],
          },
        ],
        footer: "Debe haber un intervalo de **seis (6) horas entre cada régimen.**",
      },
      {
        kind: "p",
        text: "**Una hora** después de completar el **segundo régimen**, tome dos (2) tabletas de Dulcolax (Bisacodyl) de 5 mg por vía oral.",
      },
      { kind: "p", text: ES_T.hydrate("Clenpiq") },
    ],
  },
];

const clenpiqSplit: PrepDoc = {
  slug: "clenpiq-split-dose",
  docId: "prep-clenpiq-split-dose",
  group: "colonoscopy",
  title: {
    en: "Clenpiq Split-Dose Prep",
    es: "Preparación Clenpiq en dosis dividida",
  },
  regimen: {
    en: "Two Clenpiq doses: 4 PM the day before + the morning of your procedure",
    es: "Dos dosis de Clenpiq: 4 PM el día anterior + la mañana del procedimiento",
  },
  summary: {
    en: "Step-by-step Clenpiq split-dose colonoscopy prep from Westchase Gastroenterology: clear liquids all day, first dose at 4 PM the day before, second dose the morning of your procedure.",
    es: "Preparación Clenpiq en dosis dividida para colonoscopia de Westchase Gastroenterology: líquidos claros todo el día, primera dosis a las 4 PM el día anterior y segunda dosis la mañana del procedimiento.",
  },
  sourcePages: "4–5",
  sourceLangs: ["en"],
  sections: {
    en: [
      ...standardFront(EN, { fiber: true }),
      ...clenpiqSplitDayBeforeEn,
      ...avoidAndLiquids(EN),
    ],
    es: [
      ...standardFront(ES_T, { fiber: true }),
      ...clenpiqSplitDayBeforeEs,
      ...avoidAndLiquids(ES_T),
    ],
  },
};

/* ------------------------------------------------------------------ *
   Clenpiq, both doses the day before (scan pp. 6–7)
 * ------------------------------------------------------------------ */

const clenpiqDayBeforeEn: PrepSection[] = [
  {
    heading: EN.dayBeforeHeading,
    blocks: [
      { kind: "p", text: EN.noSolids },
      { kind: "p", text: EN.drinkHourly("Clenpiq") },
      {
        kind: "p",
        text: "Clenpiq preparation consists of two (2) regimens taken with the clear liquid of your choice — both on the day before your procedure.",
      },
      {
        kind: "schedule",
        columns: [
          {
            title: "First regimen — take at 4 PM",
            items: [
              "A. Take as instructed.",
              "Drink five (5) 8-ounce glasses of clear liquids before your second dose of Clenpiq.",
            ],
          },
          {
            title: "Second regimen — take at 10 PM",
            items: [
              "B. Repeat step A.",
              "Drink three (3) 8-ounce glasses of clear liquids before bedtime.",
            ],
          },
        ],
        footer: "There has to be a **six (6) hour time span between each regimen.**",
      },
      {
        kind: "p",
        text: "**One hour** after completing the **second regimen**, take two (2) tablets of Dulcolax (Bisacodyl) 5 mg by mouth.",
      },
      { kind: "p", text: EN.hydrate("Clenpiq") },
    ],
  },
];

const clenpiqDayBeforeEs: PrepSection[] = [
  {
    heading: ES_T.dayBeforeHeading,
    blocks: [
      { kind: "p", text: ES_T.noSolids },
      { kind: "p", text: ES_T.drinkHourly("Clenpiq") },
      {
        kind: "p",
        text: "La preparación con Clenpiq consiste en dos (2) regímenes, tomados con el líquido claro de su preferencia — ambos el día anterior a su procedimiento.",
      },
      {
        kind: "schedule",
        columns: [
          {
            title: "Primer régimen — tome a las 4 PM",
            items: [
              "A. Tómelo según las instrucciones.",
              "Tome cinco (5) vasos de 8 onzas de líquidos claros antes de su segunda dosis de Clenpiq.",
            ],
          },
          {
            title: "Segundo régimen — tome a las 10 PM",
            items: [
              "B. Repita el paso A.",
              "Tome tres (3) vasos de 8 onzas de líquidos claros antes de acostarse.",
            ],
          },
        ],
        footer: "Debe haber un intervalo de **seis (6) horas entre cada régimen.**",
      },
      {
        kind: "p",
        text: "**Una hora** después de completar el **segundo régimen**, tome dos (2) tabletas de Dulcolax (Bisacodyl) de 5 mg por vía oral.",
      },
      { kind: "p", text: ES_T.hydrate("Clenpiq") },
    ],
  },
];

const clenpiq: PrepDoc = {
  slug: "clenpiq",
  docId: "prep-clenpiq",
  group: "colonoscopy",
  title: { en: "Clenpiq Prep", es: "Preparación Clenpiq" },
  regimen: {
    en: "Two Clenpiq doses the day before: 4 PM and 10 PM",
    es: "Dos dosis de Clenpiq el día anterior: 4 PM y 10 PM",
  },
  summary: {
    en: "Step-by-step Clenpiq colonoscopy prep from Westchase Gastroenterology: clear liquids all day the day before, with Clenpiq doses at 4 PM and 10 PM.",
    es: "Preparación Clenpiq para colonoscopia de Westchase Gastroenterology: líquidos claros todo el día anterior, con dosis de Clenpiq a las 4 PM y a las 10 PM.",
  },
  sourcePages: "6–7",
  sourceLangs: ["en"],
  sections: {
    en: [
      ...standardFront(EN, { fiber: true }),
      ...clenpiqDayBeforeEn,
      ...avoidAndLiquids(EN),
    ],
    es: [
      ...standardFront(ES_T, { fiber: true }),
      ...clenpiqDayBeforeEs,
      ...avoidAndLiquids(ES_T),
    ],
  },
};

/* ------------------------------------------------------------------ *
   Sutab (scan pp. 8–9)
 * ------------------------------------------------------------------ */

const sutabDayBeforeEn: PrepSection[] = [
  {
    heading: EN.dayBeforeHeading,
    blocks: [
      { kind: "p", text: EN.noSolids },
      { kind: "p", text: EN.drinkHourly("Sutab") },
      { kind: "p", text: "**Sutab preparation consists of two (2) regimens.**" },
      {
        kind: "schedule",
        columns: [
          {
            title: "First regimen — take at 2 PM",
            items: [
              "A. Fill the container with 16 ounces of water (up to the fill line). Swallow each tablet with a sip of water within 20 minutes.",
              "B. Approximately 1 hour after the last tablet is swallowed, fill the provided container to the fill line and drink the entire amount over 30 minutes.",
              "C. Approximately 30 minutes after finishing the second container of water, fill the provided container to the fill line and drink the entire amount over 30 minutes.",
              "Drink two (2) additional containers filled to the 16-ounce line with water over the next hour.",
            ],
          },
          {
            title: "Second regimen — take at 8 PM",
            items: [
              "D. After six (6) hours of the first dosing, fill the container with 16 ounces of water (up to the fill line). Swallow each tablet with a sip of water within 20 minutes.",
              "E. Approximately 1 hour after the last tablet is swallowed, fill the provided container to the fill line and drink the entire amount over 30 minutes.",
              "F. Approximately 30 minutes after finishing the second container of water, fill the provided container to the fill line and drink the entire amount over 30 minutes.",
              "Drink two (2) additional containers filled to the 16-ounce line with water over the next hour.",
            ],
          },
        ],
        footer: "There has to be a **six (6) hour time span between each regimen.**",
      },
      { kind: "p", text: EN.hydrate("Sutab") },
    ],
  },
];

const sutabDayBeforeEs: PrepSection[] = [
  {
    heading: ES_T.dayBeforeHeading,
    blocks: [
      { kind: "p", text: ES_T.noSolids },
      { kind: "p", text: ES_T.drinkHourly("Sutab") },
      {
        kind: "p",
        text: "**La preparación con Sutab consiste en dos (2) regímenes.**",
      },
      {
        kind: "schedule",
        columns: [
          {
            title: "Primer régimen — tome a las 2 PM",
            items: [
              "A. Llene el envase con 16 onzas de agua (hasta la línea). Trague cada tableta con un sorbo de agua, dentro de un período de 20 minutos.",
              "B. Aproximadamente 1 hora después de tragar la última tableta, llene el envase provisto hasta la línea y beba todo el contenido en 30 minutos.",
              "C. Aproximadamente 30 minutos después de terminar el segundo envase de agua, llene el envase provisto hasta la línea y beba todo el contenido en 30 minutos.",
              "Tome dos (2) envases adicionales llenos de agua hasta la línea de 16 onzas durante la siguiente hora.",
            ],
          },
          {
            title: "Segundo régimen — tome a las 8 PM",
            items: [
              "D. Seis (6) horas después de la primera dosis, llene el envase con 16 onzas de agua (hasta la línea). Trague cada tableta con un sorbo de agua, dentro de un período de 20 minutos.",
              "E. Aproximadamente 1 hora después de tragar la última tableta, llene el envase provisto hasta la línea y beba todo el contenido en 30 minutos.",
              "F. Aproximadamente 30 minutos después de terminar el segundo envase de agua, llene el envase provisto hasta la línea y beba todo el contenido en 30 minutos.",
              "Tome dos (2) envases adicionales llenos de agua hasta la línea de 16 onzas durante la siguiente hora.",
            ],
          },
        ],
        footer: "Debe haber un intervalo de **seis (6) horas entre cada régimen.**",
      },
      { kind: "p", text: ES_T.hydrate("Sutab") },
    ],
  },
];

const sutab: PrepDoc = {
  slug: "sutab",
  docId: "prep-sutab",
  group: "colonoscopy",
  title: { en: "Sutab Prep", es: "Preparación Sutab" },
  regimen: {
    en: "Two rounds of Sutab tablets the day before: 2 PM and 8 PM, each with water",
    es: "Dos rondas de tabletas Sutab el día anterior: 2 PM y 8 PM, cada una con agua",
  },
  summary: {
    en: "Step-by-step Sutab (tablet) colonoscopy prep from Westchase Gastroenterology: clear liquids all day the day before, tablet regimens at 2 PM and 8 PM with water.",
    es: "Preparación Sutab (tabletas) para colonoscopia de Westchase Gastroenterology: líquidos claros todo el día anterior, con regímenes de tabletas a las 2 PM y 8 PM acompañados de agua.",
  },
  sourcePages: "8–9",
  sourceLangs: ["en"],
  sections: {
    en: [
      ...standardFront(EN, { fiber: true }),
      ...sutabDayBeforeEn,
      ...avoidAndLiquids(EN),
    ],
    es: [
      ...standardFront(ES_T, { fiber: true }),
      ...sutabDayBeforeEs,
      ...avoidAndLiquids(ES_T),
    ],
  },
};

export const clenpiqSutabPreps: PrepDoc[] = [clenpiqSplit, clenpiq, sutab];
