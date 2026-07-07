// Colonoscopy preps: MiraLAX (full and split-dose) and Golytely (full and
// split-dose). Two of these have a Spanish original in the practice's scan:
// the split-dose MiraLAX sheet (pp. 13–14) and the full Golytely sheet
// (pp. 17–18) — each locale renders its own original there, INCLUDING their
// genuine divergences (the Spanish split-dose sheet runs 1/3/5 pm where the
// English runs 2/4/6 pm; both verified against the scan, flagged for the
// practice as a wording question, never silently aligned).

import type { PrepDoc, PrepSection } from "./types";
import { EN, ES_T, ES_O } from "./common";
import { standardFront, avoidAndLiquids, type Flavor } from "./builders";

const purchaseEn =
  "**You will need to purchase one 10-ounce bottle of Magnesium Citrate, one 238-gram bottle of MiraLAX powder, and 4 tablets of Dulcolax 5 mg (Bisacodyl)** at your local pharmacy, in the laxative aisle.";

const purchaseEsT =
  "**Deberá comprar en su farmacia local (pasillo de laxantes): una botella de 10 onzas de Magnesium Citrate (citrato de magnesio), una botella de 238 gramos de MiraLAX en polvo y 4 tabletas de Dulcolax de 5 mg (Bisacodyl).**";

const mixStepEn =
  "In the morning, mix the whole bottle of MiraLAX powder in 64 ounces of water or 64 ounces of Gatorade **(if Gatorade: no red, purple or blue).** Shake well until the powder is dissolved; chill in the refrigerator.";

/* ------------------------------------------------------------------ *
   Colonoscopy prep — MiraLAX, all the day before (scan pp. 11–12, EN)
 * ------------------------------------------------------------------ */

const miralaxDayBeforeEn: PrepSection[] = [
  {
    heading: EN.dayBeforeHeading,
    blocks: [
      { kind: "p", text: EN.noSolids },
      { kind: "p", text: EN.drinkHourly("MiraLAX") },
      { kind: "p", text: purchaseEn },
      {
        kind: "list",
        style: "steps",
        items: [
          mixStepEn,
          "At **1:00 pm**, take the two Dulcolax tablets by mouth.",
          "At **3:00 pm**, drink the 10-ounce bottle of Magnesium Citrate.",
          "At **5:00 pm**, start drinking one 8-ounce glass of MiraLAX prep every 15 minutes until all of it is taken.",
          "At **9:00 pm**, take the two remaining Dulcolax tablets by mouth.",
        ],
      },
      { kind: "p", text: EN.hydrate("MiraLAX") },
    ],
  },
];

const miralaxDayBeforeEs: PrepSection[] = [
  {
    heading: ES_T.dayBeforeHeading,
    blocks: [
      { kind: "p", text: ES_T.noSolids },
      { kind: "p", text: ES_T.drinkHourly("MiraLAX") },
      { kind: "p", text: purchaseEsT },
      {
        kind: "list",
        style: "steps",
        items: [
          "En la mañana, mezcle toda la botella de MiraLAX en polvo con 64 onzas de agua o 64 onzas de Gatorade **(si es Gatorade: que no sea rojo, púrpura o azul).** Agite bien hasta disolver el polvo y póngalo a enfriar en el refrigerador.",
          "A la **1:00 pm**, tome dos tabletas de Dulcolax por vía oral.",
          "A las **3:00 pm**, tome la botella de 10 onzas de Magnesium Citrate.",
          "A las **5:00 pm**, empiece a tomar un vaso de 8 onzas de la preparación de MiraLAX cada 15 minutos hasta terminarla toda.",
          "A las **9:00 pm**, tome las dos tabletas restantes de Dulcolax por vía oral.",
        ],
      },
      { kind: "p", text: ES_T.hydrate("MiraLAX") },
    ],
  },
];

const miralax: PrepDoc = {
  slug: "miralax",
  docId: "prep-colonoscopy-miralax",
  group: "colonoscopy",
  title: {
    en: "Colonoscopy Prep (MiraLAX)",
    es: "Preparación para colonoscopia (MiraLAX)",
  },
  regimen: {
    en: "MiraLAX + magnesium citrate + Dulcolax, taken entirely the day before",
    es: "MiraLAX + citrato de magnesio + Dulcolax, todo el día anterior",
  },
  summary: {
    en: "Step-by-step MiraLAX colonoscopy prep from Westchase Gastroenterology: clear liquids all day, with magnesium citrate, MiraLAX and Dulcolax on a timed schedule the day before.",
    es: "Preparación MiraLAX para colonoscopia de Westchase Gastroenterology: líquidos claros todo el día, con citrato de magnesio, MiraLAX y Dulcolax en un horario programado el día anterior.",
  },
  sourcePages: "11–12",
  sourceLangs: ["en"],
  sections: {
    en: [
      ...standardFront(EN, { fiber: true }),
      ...miralaxDayBeforeEn,
      ...avoidAndLiquids(EN),
    ],
    es: [
      ...standardFront(ES_T, { fiber: true }),
      ...miralaxDayBeforeEs,
      ...avoidAndLiquids(ES_T),
    ],
  },
};

/* ------------------------------------------------------------------ *
   Colonoscopy split-dose prep — MiraLAX
   (EN original pp. 15–16; ES original pp. 13–14 — kept verbatim per side)
 * ------------------------------------------------------------------ */

const miralaxSplitDayBeforeEn: PrepSection[] = [
  {
    heading: EN.dayBeforeHeading,
    blocks: [
      { kind: "p", text: EN.noSolids },
      { kind: "p", text: EN.drinkHourly("MiraLAX") },
      { kind: "p", text: purchaseEn },
      {
        kind: "list",
        style: "steps",
        items: [
          mixStepEn,
          "At **2:00 pm**, take the two Dulcolax tablets by mouth.",
          "At **4:00 pm**, drink the 10-ounce bottle of Magnesium Citrate.",
          "At **6:00 pm**, start drinking one 8-ounce glass of MiraLAX prep every 15 minutes until **half of the bottle** is taken.",
          "Take the **second half** of the remaining MiraLAX prep at ___ on ___",
          "After you finish step 5, take the two Dulcolax tablets by mouth.",
        ],
      },
      { kind: "p", text: EN.hydrate("MiraLAX") },
    ],
  },
];

// The practice's own Spanish sheet (pp. 13–14). Its schedule genuinely
// differs from the English sheet's (1/3/5 pm vs 2/4/6 pm) — reproduced as-is.
const miralaxSplitDayBeforeEs: PrepSection[] = [
  {
    heading: ES_O.dayBeforeHeading,
    blocks: [
      { kind: "p", text: ES_O.noSolids },
      { kind: "p", text: ES_O.drinkHourly("MiraLAX") },
      {
        kind: "p",
        text: "**Ingredientes para comprar en su farmacia local (pasillo de laxantes): una (1) botella de 10 onzas de Magnesium Citrate, una (1) botella de 238 gramos de MiraLAX en polvo y cuatro (4) tabletas de Dulcolax (Bisacodyl) de 5 mg.**",
      },
      {
        kind: "list",
        style: "steps",
        items: [
          "En la mañana, disuelva toda la botella de MiraLAX con 64 onzas de agua o 64 onzas de Gatorade (que no sea rojo, púrpura o azul). Mezcle bien hasta disolver el polvo y póngalo en el refrigerador.",
          "A la **1:00 pm**, tome dos (2) tabletas de Dulcolax.",
          "A las **3:00 pm**, tome una botella de Magnesium Citrate de 10 onzas.",
          "A las **5:00 pm**, empiece a tomar 8 onzas de la preparación de MiraLAX cada quince (15) minutos hasta tomar la **mitad** del contenido. Trate de tomar un vaso a la vez, en vez de pequeños sorbos.",
          "Tome la **segunda mitad** del MiraLAX a las ___ el ___",
          "Después de terminar el paso 5, tome las dos últimas tabletas de Dulcolax.",
        ],
      },
      { kind: "p", text: ES_O.hydrate("MiraLAX") },
    ],
  },
];

const miralaxSplit: PrepDoc = {
  slug: "miralax-split-dose",
  docId: "prep-colonoscopy-miralax-split-dose",
  group: "colonoscopy",
  title: {
    en: "Colonoscopy Split-Dose Prep (MiraLAX)",
    es: "Preparación para colonoscopia en dosis dividida (MiraLAX)",
  },
  regimen: {
    en: "MiraLAX + magnesium citrate: half the evening before, half at your scheduled time",
    es: "MiraLAX + citrato de magnesio: mitad la noche anterior, mitad a su hora programada",
  },
  summary: {
    en: "Step-by-step split-dose MiraLAX colonoscopy prep from Westchase Gastroenterology: half of the prep the evening before, the second half at the time our office schedules for you.",
    es: "Preparación MiraLAX en dosis dividida para colonoscopia de Westchase Gastroenterology: la mitad de la preparación la noche anterior y la segunda mitad a la hora que la oficina le programe.",
  },
  sourcePages: "13–16",
  sourceLangs: ["en", "es"],
  sections: {
    en: [
      ...standardFront(EN, { fiber: true }),
      ...miralaxSplitDayBeforeEn,
      ...avoidAndLiquids(EN),
    ],
    es: [
      ...standardFront(ES_O, { fiber: true }),
      ...miralaxSplitDayBeforeEs,
      ...avoidAndLiquids(ES_O),
    ],
  },
};

/* ------------------------------------------------------------------ *
   Golytely prep, finished the evening before
   (Spanish original pp. 17–18; the English body is a faithful translation
   of it, keeping its own medication lists and notes)
 * ------------------------------------------------------------------ */

// English rendering of the Spanish sheet's divergent passages.
const EN_G: Flavor = {
  ...EN,
  anticoagulants:
    "**If you take anticoagulants or anti-platelet medications (Coumadin, Warfarin, Plavix, Clopidogrel, Effient, Xarelto, Eliquis, Brilinta, etc.), please contact the physician who prescribes them for clearance and additional instructions.**",
  nsaids:
    "**Seven (7) days before, stop:** ibuprofen, Celebrex, Naproxen, Mobic, meloxicam, Omega 3, fish liver oil, Vitamin E, and garlic tablets.",
  dietPills:
    "**Stop Phentermine (weight-loss medication) 14 days before.**",
  // The Spanish sheet lists the same medications with no day count —
  // reproduced as-is (flagged for the practice).
  glp1: "**Stop semaglutide (Wegovy, Ozempic, Rybelsus), dulaglutide (Trulicity), lixisenatide (Adlyxin), exenatide (Bydureon, Byetta), liraglutide (Victoza, Saxenda) and Mounjaro (tirzepatide).**",
  fiber:
    "**Reduce fiber intake 3 days before.** For example, do not eat nuts, seeds, or popcorn.",
  followUp:
    "**Note:** if you do not have a follow-up appointment after your procedure, call our office. Remember that results are not given over the phone. **No exceptions.**",
  hydrate: (prep: string) =>
    `**Please stay well hydrated before, during and after completing your ${prep} prep.** However, remember that you must stop all liquid intake 4 hours before your procedure.`,
  avoidItems: [
    "**Any red, blue or purple colored food**",
    "**Dairy, fruit juices, sherbets, milkshakes**",
    "**Any solid food**",
  ],
};

const golytelyLiquidsEn = [
  "Water",
  "Gatorade (no red, blue or purple)",
  "Clear apple or grape juice (no pulp)",
  "Ginger ale or Sprite (non-alcoholic drinks)",
  "Black coffee (no dairy products)",
  "Chicken, beef or vegetable broth or consommé (no solids) — must be clear",
  "Jello with no solids (no red, blue or purple)",
  "Coffee with sugar only (no milk or dairy substitutes)",
];

// The Spanish sheet's own recommended-liquids list (longer than the shared one).
const golytelyLiquidsEs = [
  "Agua",
  "Gatorade (que no sea rojo, azul o púrpura)",
  "Jugos claros de manzana o uva (sin pulpa)",
  "Ginger ale o Sprite (bebidas sin alcohol)",
  "Café negro (sin productos lácteos)",
  "Caldo o consomé de pollo, carne o vegetal (sin sólidos) — debe ser claro",
  "Gelatina sin sólidos (que no sea roja, azul o púrpura)",
  "Café con azúcar solamente (sin productos de leche o sustitutos lácteos)",
];

const golytelyDayBeforeEn: PrepSection[] = [
  {
    heading: EN.dayBeforeHeading,
    blocks: [
      { kind: "p", text: EN.noSolids },
      { kind: "p", text: EN.drinkHourly("Golytely") },
      {
        kind: "list",
        style: "steps",
        items: [
          "On the morning of the day before, add water to the Golytely container up to the indicated line.",
          // The Spanish original's dual start time is genuine (verified
          // against the scan) — reproduced as-is.
          "At **3:00 pm or 6:00 pm**, start drinking 8 ounces of Golytely every 15 minutes until all of the contents are finished.",
          "One hour after finishing the Golytely solution, take 2 tablets of Dulcolax 5 mg (Bisacodyl) — available without a prescription.",
        ],
      },
      { kind: "p", text: EN_G.hydrate("Golytely") },
    ],
  },
  {
    heading: EN.avoidHeading,
    blocks: [{ kind: "list", style: "avoid", items: EN_G.avoidItems }],
  },
  {
    heading: EN.liquidsHeading,
    blocks: [{ kind: "list", style: "check", items: golytelyLiquidsEn }],
  },
];

const golytelyDayBeforeEs: PrepSection[] = [
  {
    heading: ES_O.dayBeforeHeading,
    blocks: [
      { kind: "p", text: ES_O.noSolids },
      { kind: "p", text: ES_O.drinkHourly("Golytely") },
      {
        kind: "list",
        style: "steps",
        items: [
          "Por la mañana del día anterior, añada agua al contenedor de Golytely hasta la línea indicada.",
          "A las **3:00 pm o 6:00 pm**, comience a tomar 8 onzas de Golytely cada 15 minutos hasta terminar todo el contenido.",
          "Una hora después de terminar la solución de Golytely, tome 2 tabletas de Dulcolax de 5 mg (Bisacodyl); este producto no requiere receta médica.",
        ],
      },
      { kind: "p", text: ES_O.hydrate("Golytely") },
    ],
  },
  {
    heading: ES_O.avoidHeading,
    blocks: [{ kind: "list", style: "avoid", items: ES_O.avoidItems }],
  },
  {
    heading: ES_O.liquidsHeading,
    blocks: [{ kind: "list", style: "check", items: golytelyLiquidsEs }],
  },
];

const golytely: PrepDoc = {
  slug: "golytely",
  docId: "prep-golytely",
  group: "colonoscopy",
  title: { en: "Golytely Prep", es: "Preparación Golytely" },
  regimen: {
    en: "One full Golytely container, finished the evening before",
    es: "Un contenedor completo de Golytely, terminado la noche anterior",
  },
  summary: {
    en: "Step-by-step Golytely colonoscopy prep from Westchase Gastroenterology: clear liquids all day the day before, with the full Golytely solution finished that evening.",
    es: "Preparación Golytely para colonoscopia de Westchase Gastroenterology: líquidos claros todo el día anterior, terminando toda la solución de Golytely esa noche.",
  },
  sourcePages: "17–18",
  sourceLangs: ["es"],
  sections: {
    en: [...standardFront(EN_G, { fiber: true }), ...golytelyDayBeforeEn],
    es: [...standardFront(ES_O, { fiber: true }), ...golytelyDayBeforeEs],
  },
};

/* ------------------------------------------------------------------ *
   Golytely split-dose prep (scan pp. 20–21, EN)
 * ------------------------------------------------------------------ */

const golytelySplitStepsEn = [
  "At 10:00 am, fill the Golytely laxative powder container with water. Shake well until the powder is dissolved; chill in the refrigerator.",
  "Starting at **4:00 pm**, drink one 8-ounce glass every fifteen (15) minutes until **half** is taken. Try to drink one full glass at a time instead of sipping.",
  // Source wording (verified against the scan 2026-07-07): step 3 refers
  // forward to "step 4" — reproduced as-is.
  "**One hour** after completing **step 4**, take two (2) tablets of Dulcolax (Bisacodyl) 5 mg by mouth.",
  "At ___ on ___, **finish the second half** of your Golytely prep.",
];

const golytelySplitStepsEs = [
  "A las 10:00 am, llene con agua el contenedor del polvo laxante Golytely. Agite bien hasta disolver el polvo y póngalo a enfriar en el refrigerador.",
  "A partir de las **4:00 pm**, tome un vaso de 8 onzas cada quince (15) minutos hasta terminar la **mitad**. Trate de tomar un vaso completo a la vez, en vez de pequeños sorbos.",
  // Reproduces the English original's forward reference to step 4.
  "**Una hora** después de completar el **paso 4**, tome dos (2) tabletas de Dulcolax (Bisacodyl) de 5 mg por vía oral.",
  "A las ___ el ___, **termine la segunda mitad** de su preparación de Golytely.",
];

const golytelySplit: PrepDoc = {
  slug: "golytely-split-dose",
  docId: "prep-golytely-split-dose",
  group: "colonoscopy",
  title: {
    en: "Golytely Split-Dose Prep",
    es: "Preparación Golytely en dosis dividida",
  },
  regimen: {
    en: "Golytely: half the evening before, half at your scheduled time",
    es: "Golytely: mitad la noche anterior, mitad a su hora programada",
  },
  summary: {
    en: "Step-by-step split-dose Golytely colonoscopy prep from Westchase Gastroenterology: half of the solution the evening before, the second half at the time our office schedules for you.",
    es: "Preparación Golytely en dosis dividida para colonoscopia de Westchase Gastroenterology: la mitad de la solución la noche anterior y la segunda mitad a la hora que la oficina le programe.",
  },
  sourcePages: "20–21",
  sourceLangs: ["en"],
  sections: {
    en: [
      ...standardFront(EN, { fiber: true }),
      {
        heading: EN.dayBeforeHeading,
        blocks: [
          { kind: "p", text: EN.noSolids },
          { kind: "p", text: EN.drinkHourly("Golytely") },
          { kind: "list", style: "steps", items: golytelySplitStepsEn },
          { kind: "p", text: EN.hydrate("Golytely") },
        ],
      },
      ...avoidAndLiquids(EN),
    ],
    es: [
      ...standardFront(ES_T, { fiber: true }),
      {
        heading: ES_T.dayBeforeHeading,
        blocks: [
          { kind: "p", text: ES_T.noSolids },
          { kind: "p", text: ES_T.drinkHourly("Golytely") },
          { kind: "list", style: "steps", items: golytelySplitStepsEs },
          { kind: "p", text: ES_T.hydrate("Golytely") },
        ],
      },
      ...avoidAndLiquids(ES_T),
    ],
  },
};

export const miralaxGolytelyPreps: PrepDoc[] = [
  miralax,
  miralaxSplit,
  golytely,
  golytelySplit,
];
