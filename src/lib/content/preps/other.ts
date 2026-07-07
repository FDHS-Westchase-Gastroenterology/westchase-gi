// Sigmoidoscopy prep, Endocapsule study prep, and the anti-reflux diet
// guidelines. The anti-reflux sheet exists in both languages (EN p. 3,
// ES pp. 1–2); sigmoidoscopy (p. 10) and endocapsule (pp. 22–23) are
// English-only originals with faithful Spanish translations.

import type { PrepDoc, PrepSection } from "./types";
import { EN, ES_T } from "./common";
import {
  bringSection,
  remindersSection,
  followUpSection,
} from "./builders";

/* ------------------------------------------------------------------ *
   Sigmoidoscopy (scan p. 10, EN)
 * ------------------------------------------------------------------ */

// Sedation is optional for sigmoidoscopy, so the companion requirement is
// conditional on this sheet (source wording).
const sigCompanionEn =
  "**If you choose to be sedated for this procedure:** you **must** have an adult companion (family member or friend) to take you home after your procedure. Use of public transportation — Uber, Lyft, taxi, etc. — is **not** allowed.";
const sigCompanionEs =
  "**Si elige sedación para este procedimiento:** **debe** tener un acompañante adulto (familiar o amistad) que lo lleve a su casa después del procedimiento. La transportación pública — Uber, Lyft, taxi, etc. — **no** es permitida.";

const sigmoidoscopy: PrepDoc = {
  slug: "sigmoidoscopy",
  docId: "prep-sigmoidoscopy",
  group: "sigmoidoscopy",
  title: {
    en: "Sigmoidoscopy Prep",
    es: "Preparación para sigmoidoscopia",
  },
  regimen: {
    en: "No prep drink — one Fleet enema two hours before; nothing to eat or drink after midnight",
    es: "Sin bebida de preparación — un enema Fleet dos horas antes; nada de comer ni beber después de la medianoche",
  },
  summary: {
    en: "Sigmoidoscopy preparation instructions from Westchase Gastroenterology: fast after midnight, use one Fleet enema two hours before your procedure, and review the medication guidance.",
    es: "Instrucciones de preparación para sigmoidoscopia de Westchase Gastroenterology: ayune después de la medianoche, aplíquese un enema Fleet dos horas antes del procedimiento y revise la guía de medicamentos.",
  },
  sourcePages: "10",
  sourceLangs: ["en"],
  sections: {
    en: [
      {
        blocks: [
          { kind: "p", text: EN.readCarefully },
          { kind: "p", text: "**The day before your procedure:** ___" },
          {
            kind: "note",
            text: ["**Do not eat or drink any liquids after midnight (12 AM).**"],
          },
          { kind: "p", text: EN.appointmentLine },
          {
            kind: "note",
            text: [
              "**Two hours before your procedure, use one Fleet enema** — available over the counter at your local pharmacy.",
            ],
          },
          { kind: "p", text: EN.dayOfNpo },
        ],
      },
      bringSection(EN),
      remindersSection(EN, { fiber: false, companion: sigCompanionEn }),
      followUpSection(EN),
    ],
    es: [
      {
        blocks: [
          { kind: "p", text: ES_T.readCarefully },
          { kind: "p", text: "**El día antes de su procedimiento:** ___" },
          {
            kind: "note",
            text: [
              "**No coma ni beba ningún líquido después de la medianoche (12 AM).**",
            ],
          },
          { kind: "p", text: ES_T.appointmentLine },
          {
            kind: "note",
            text: [
              "**Dos horas antes de su procedimiento, aplíquese un enema Fleet** — disponible sin receta en su farmacia local.",
            ],
          },
          { kind: "p", text: ES_T.dayOfNpo },
        ],
      },
      bringSection(ES_T),
      remindersSection(ES_T, { fiber: false, companion: sigCompanionEs }),
      followUpSection(ES_T),
    ],
  },
};

/* ------------------------------------------------------------------ *
   Endocapsule study (scan pp. 22–23, EN)
 * ------------------------------------------------------------------ */

const endocapsuleEn: PrepSection[] = [
  {
    heading: "Details of your appointment",
    blocks: [
      { kind: "p", text: "**Date:** ___ **Time:** ___" },
      {
        kind: "p",
        text: "**Location — our main office:** 11912 Sheldon Road, Tampa, FL 33626.",
      },
      {
        kind: "note",
        text: [
          "**You will need to purchase one (1) bottle of Magnesium Citrate, lemon or lime flavor only,** available at your local pharmacy in the laxative aisle.",
        ],
      },
    ],
  },
  {
    heading: "The day before your study",
    blocks: [
      {
        kind: "list",
        style: "bullet",
        items: [
          "**Please follow a clear liquid diet the day prior to your study.** The table below lists the recommended food groups.",
          "After the clear-liquid dinner at 7:00 PM, **drink the whole bottle of Magnesium Citrate.**",
          "**Do not eat or drink after 10:00 PM.**",
          "Any critical medications (**heart, blood pressure, seizure, diabetes medications, etc.**) should be taken with a small sip of water, no later than 6:00 AM.",
          "In order for the sensors to stay on, please shave the abdominal area if necessary.",
        ],
      },
    ],
  },
  {
    heading: "The morning of your study",
    blocks: [
      {
        kind: "list",
        style: "bullet",
        items: [
          "**Do not eat or drink.**",
          "Please wear comfortable, two-piece, loose-fitting clothing.",
          "Avoid applying any lotion, powder, or perfume/cologne on the abdominal or chest area.",
          "Please arrive at our Sheldon Road location at 8:00 AM.",
        ],
      },
    ],
  },
  {
    heading: "After you have swallowed your capsule",
    blocks: [
      {
        kind: "list",
        style: "bullet",
        items: [
          "**Between 8:00 AM and 12:00 noon, drink one 8-ounce glass of water every hour for 4 hours** (a total of 4 glasses over 4 hours).",
          "**After 12:00 PM, you may eat a light lunch** — 4 hours after you've swallowed your capsule.",
        ],
      },
      { kind: "p", text: "**Important — please continue to avoid the following:**" },
      {
        kind: "list",
        style: "avoid",
        items: [
          "All dairy products",
          "Any red-, purple- or blue-colored food and drinks",
          "Foods containing seeds (for example: sesame seeds, nuts, tomatoes with seeds, etc.)",
        ],
      },
      {
        kind: "note",
        text: [
          "**You must return to the office by 4:00 PM** so our staff can remove the sensors. Please do **not** attempt to remove the equipment yourself.",
        ],
      },
    ],
  },
  {
    heading: "Clear liquid diet guidelines",
    blocks: [
      {
        kind: "table",
        head: ["Food group", "Recommended", "Avoid"],
        rows: [
          ["Milk & milk products", "None", "All"],
          ["Vegetables", "None", "All"],
          [
            "Fruits",
            "Fruit juices without pulp",
            "Nectars; all fresh, canned, and frozen fruits",
          ],
          ["Breads & grains", "None", "All"],
          ["Meat or meat substitutes", "None", "All"],
          ["Fats & oils", "None", "All"],
          [
            "Sweets & desserts",
            "Gelatin, fruit ice, popsicles without pulp, clear hard candy",
            "All others",
          ],
          [
            "Beverages",
            "Black coffee only; tea; soft drinks; water; lactose-free, low-residue supplements if approved by your physician",
            "All others",
          ],
          ["Soups", "Bouillon, consommé, fat-free broth", "All others"],
        ],
      },
    ],
  },
];

const endocapsuleEs: PrepSection[] = [
  {
    heading: "Detalles de su cita",
    blocks: [
      { kind: "p", text: "**Fecha:** ___ **Hora:** ___" },
      {
        kind: "p",
        text: "**Lugar — nuestra oficina principal:** 11912 Sheldon Road, Tampa, FL 33626.",
      },
      {
        kind: "note",
        text: [
          "**Deberá comprar una (1) botella de Magnesium Citrate (citrato de magnesio), únicamente sabor limón o lima,** disponible en su farmacia local en el pasillo de laxantes.",
        ],
      },
    ],
  },
  {
    heading: "El día antes de su estudio",
    blocks: [
      {
        kind: "list",
        style: "bullet",
        items: [
          "**Siga una dieta de líquidos claros el día anterior a su estudio.** La tabla a continuación indica los grupos de alimentos recomendados.",
          "Después de la cena de líquidos claros, a las 7:00 PM, **tome la botella completa de Magnesium Citrate.**",
          "**No coma ni beba después de las 10:00 PM.**",
          "Cualquier medicamento crítico (**para el corazón, la presión arterial, las convulsiones, la diabetes, etc.**) debe tomarse con un pequeño sorbo de agua, a más tardar a las 6:00 AM.",
          "Para que los sensores se mantengan en su lugar, aféitese el área abdominal si es necesario.",
        ],
      },
    ],
  },
  {
    heading: "La mañana de su estudio",
    blocks: [
      {
        kind: "list",
        style: "bullet",
        items: [
          "**No coma ni beba.**",
          "Use ropa cómoda, holgada y de dos piezas.",
          "Evite aplicarse loción, talco o perfume/colonia en el área del abdomen y el pecho.",
          "Llegue a nuestra oficina de Sheldon Road a las 8:00 AM.",
        ],
      },
    ],
  },
  {
    heading: "Después de tragar la cápsula",
    blocks: [
      {
        kind: "list",
        style: "bullet",
        items: [
          "**Entre las 8:00 AM y las 12:00 del mediodía, tome un vaso de 8 onzas de agua cada hora durante 4 horas** (un total de 4 vasos en 4 horas).",
          "**Después de las 12:00 PM puede comer un almuerzo ligero** — 4 horas después de haber tragado la cápsula.",
        ],
      },
      { kind: "p", text: "**Importante — continúe evitando lo siguiente:**" },
      {
        kind: "list",
        style: "avoid",
        items: [
          "Todos los productos lácteos",
          "Alimentos y bebidas de color rojo, púrpura o azul",
          "Alimentos con semillas (por ejemplo: ajonjolí, nueces, tomates con semillas, etc.)",
        ],
      },
      {
        kind: "note",
        text: [
          "**Debe regresar a la oficina antes de las 4:00 PM** para que nuestro personal retire los sensores. Por favor **no** intente quitarse el equipo usted mismo.",
        ],
      },
    ],
  },
  {
    heading: "Guía de dieta de líquidos claros",
    blocks: [
      {
        kind: "table",
        head: ["Grupo de alimentos", "Recomendado", "Evitar"],
        rows: [
          ["Leche y productos lácteos", "Ninguno", "Todos"],
          ["Verduras", "Ninguna", "Todas"],
          [
            "Frutas",
            "Jugos de fruta sin pulpa",
            "Néctares; todas las frutas frescas, enlatadas y congeladas",
          ],
          ["Panes y granos", "Ninguno", "Todos"],
          ["Carnes o sustitutos de carne", "Ninguno", "Todos"],
          ["Grasas y aceites", "Ninguna", "Todas"],
          [
            "Dulces y postres",
            "Gelatina, hielo de fruta, paletas heladas sin pulpa, caramelos duros claros",
            "Todos los demás",
          ],
          [
            "Bebidas",
            "Solo café negro; té; refrescos; agua; suplementos sin lactosa y de bajo residuo si su médico los aprueba",
            "Todas las demás",
          ],
          ["Sopas", "Caldo concentrado (bouillon), consomé, caldo sin grasa", "Todas las demás"],
        ],
      },
    ],
  },
];

const endocapsule: PrepDoc = {
  slug: "endocapsule",
  docId: "prep-endocapsule",
  group: "capsule",
  title: {
    en: "Endocapsule Study Prep",
    es: "Preparación para el estudio de endocápsula",
  },
  regimen: {
    en: "Clear liquids the day before + magnesium citrate at 7 PM; capsule swallowed at our Sheldon Road office at 8 AM",
    es: "Líquidos claros el día anterior + citrato de magnesio a las 7 PM; la cápsula se traga en nuestra oficina de Sheldon Road a las 8 AM",
  },
  summary: {
    en: "Endocapsule (capsule endoscopy) study preparation from Westchase Gastroenterology: clear liquid diet, magnesium citrate at 7 PM the night before, an 8 AM arrival at our Sheldon Road office, and the day-of drinking schedule.",
    es: "Preparación para el estudio de endocápsula (cápsula endoscópica) de Westchase Gastroenterology: dieta de líquidos claros, citrato de magnesio a las 7 PM la noche anterior, llegada a las 8 AM a nuestra oficina de Sheldon Road y el horario de líquidos del día del estudio.",
  },
  sourcePages: "22–23",
  sourceLangs: ["en"],
  sections: { en: endocapsuleEn, es: endocapsuleEs },
};

/* ------------------------------------------------------------------ *
   Anti-reflux dietary guidelines (EN p. 3; ES pp. 1–2)
   The Spanish sheet's back-page food list arrived machine-mangled in the
   original (e.g. "Tarragon se va", "Levantamiento" for raisins); both
   languages' food tables below are reconstructed from the evident source
   list, with two obviously misfiled items re-filed (carrots out of meats,
   raspberries out of pasta). Flagged for the practice to skim — see
   PROJECT-LOG (2026-07-07).
 * ------------------------------------------------------------------ */

const antiRefluxEn: PrepSection[] = [
  {
    blocks: [
      {
        kind: "p",
        text: "Stomach acid reflux is a common problem. Your doctor has recommended that you avoid foods and drinks that are known to make stomach acid reflux worse. These include fatty foods, alcohol, chocolate, caffeinated drinks (such as coffee, tea, and soda), peppermint, spearmint, and spices. If you are overweight, dieting may also help.",
      },
      {
        kind: "p",
        text: "It's alright to drink cranberry juice, apple juice diluted with water, and herbal teas (except peppermint and spearmint). Drink lots of water.",
      },
      {
        kind: "p",
        text: "**Coffee substitutes:** Postum; Coffree (a Swiss blend of chicory, figs, wheat, malted barley and acorns).",
      },
    ],
  },
  {
    heading: "Foods & drinks to avoid",
    blocks: [
      {
        kind: "list",
        style: "avoid",
        items: [
          "Fatty foods",
          "Alcohol",
          "Chocolate",
          "Coffee, tea, caffeinated soft drinks (decaffeinated coffee still has some caffeine)",
          "Peppermint & spearmint",
          "Spices & vinegar",
          "Citrus fruits & juices",
          "Tomatoes & tomato sauces",
        ],
      },
    ],
  },
  {
    heading: "Other anti-reflux measures",
    blocks: [
      {
        kind: "list",
        style: "check",
        items: [
          "Don't eat or drink for 2 hours before going to bed",
          "Avoid lying down after meals",
          "Elevate the head of your bed 6 inches (use a bed wedge from any surgical supply store)",
          "Don't wear tight clothing around your abdomen",
          "Avoid straining, weight lifting, prolonged bending, and constipation",
          "Lose weight (if you are overweight)",
          "Stop smoking — nicotine stimulates stomach acid and impairs lower esophageal sphincter function",
        ],
      },
      {
        kind: "p",
        text: "Since the likelihood of reflux is increased after a meal, it is important to avoid eating or drinking for 2 hours before going to bed, except for taking any medicine prescribed by your doctor. Remember to avoid lying down after any meal.",
      },
    ],
  },
  {
    heading: "Reflux-acceptable foods (if cooked with mild herbs)",
    blocks: [
      {
        kind: "table",
        head: ["Food group", "Acceptable"],
        rows: [
          [
            "Meats",
            "All loin, flank, ribeye and sirloin steak; rib and rump roast; liver; veal; chicken; capons and Cornish hens; turkey; pork loin chops; pheasant; quail; venison",
          ],
          [
            "Fish & shellfish",
            "Sole, halibut, monkfish, tuna, bass, smoked fish, salmon, flounder, haddock, lobster, mackerel, perch, pike, shad, scallops, shrimp, trout",
          ],
          ["Potatoes", "All red, white, sweet, and yams (no canned potatoes)"],
          ["Rice", "All white, brown, and gourmet varieties"],
          [
            "Soups",
            "All non-tomato soups, with discretion (cream soups may cause excess mucus and/or reflux upset)",
          ],
          ["Pasta", "Pesto or garlic-and-oil sauce; white clam sauce only"],
          [
            "Vegetables & starches",
            "Beets, eggplant (grilled or sautéed only), beans, lima beans, green beans, wax beans, spinach, artichokes, asparagus, Brussels sprouts, cauliflower, broccoli, broccoflower, parsnips, carrots, buttercup squash, acorn squash, butternut squash, delicata squash, zucchini (both yellow and green), gourmet squashes, sun-dried pears",
          ],
          [
            "Sweet fruits",
            "Bananas, dates, figs, raisins (Thompson and Muscat), prunes, persimmons, melons, strawberries, blueberries, blackberries, raspberries",
          ],
          [
            "Herbs & seasonings",
            "Basil, bay leaves, chervil, chives, cilantro, dill, marjoram, oregano, parsley, rosemary, sage, savory, tarragon, thyme, garlic, soy sauce, white pepper",
          ],
        ],
      },
    ],
  },
];

const antiRefluxEs: PrepSection[] = [
  {
    blocks: [
      {
        kind: "p",
        text: "El reflujo de ácido estomacal es un problema común. Su médico le ha recomendado que evite alimentos y bebidas que se sabe que empeoran el reflujo ácido. Estos incluyen alimentos grasos, alcohol, chocolate, bebidas con cafeína (como café, té y refrescos), menta, hierbabuena y especias. Si tiene sobrepeso, la dieta también puede ayudar.",
      },
      {
        kind: "p",
        text: "Está bien beber jugo de arándano, jugo de manzana diluido con agua y tés de hierbas (excepto menta y hierbabuena). Beba mucha agua.",
      },
      {
        kind: "p",
        text: "**Sucedáneos del café:** Postum; Coffree (mezcla suiza de achicoria, higos, trigo, cebada malteada y bellotas).",
      },
    ],
  },
  {
    heading: "Alimentos y bebidas a evitar",
    blocks: [
      {
        kind: "list",
        style: "avoid",
        items: [
          "Alimentos grasos",
          "Alcohol",
          "Chocolate",
          "Café, té y refrescos con cafeína (el café descafeinado todavía tiene algo de cafeína)",
          "Menta y hierbabuena",
          "Especias y vinagre",
          "Cítricos y sus jugos",
          "Tomates y salsas de tomate",
        ],
      },
    ],
  },
  {
    heading: "Otras medidas antirreflujo",
    blocks: [
      {
        kind: "list",
        style: "check",
        items: [
          "No coma ni beba durante las 2 horas antes de acostarse",
          "Evite acostarse después de las comidas",
          "Eleve la cabecera de su cama 6 pulgadas (use una cuña de cama, disponible en tiendas de suministros médicos)",
          "No use ropa ajustada alrededor del abdomen",
          "Evite los esfuerzos, levantar peso, agacharse por períodos prolongados y el estreñimiento",
          "Baje de peso si tiene sobrepeso",
          "Deje de fumar — la nicotina estimula el ácido estomacal y altera la función del esfínter esofágico inferior",
        ],
      },
      {
        kind: "p",
        text: "Dado que la probabilidad de reflujo aumenta después de una comida, es importante evitar comer o beber durante las 2 horas antes de acostarse, excepto para tomar los medicamentos recetados por su médico. Recuerde evitar acostarse después de cualquier comida.",
      },
    ],
  },
  {
    heading: "Alimentos aceptables para el reflujo (si se cocinan con hierbas suaves)",
    blocks: [
      {
        kind: "table",
        head: ["Grupo de alimentos", "Aceptables"],
        rows: [
          [
            "Carnes",
            "Todo bistec de lomo, falda, ribeye y solomillo; asado de costilla y cadera; hígado; ternera; pollo; capones y gallinas de Cornualles; pavo; chuletas de lomo de cerdo; faisán; codorniz; venado",
          ],
          [
            "Pescados y mariscos",
            "Lenguado, halibut (fletán), rape, atún, lubina, pescado ahumado, salmón, platija, eglefino, langosta, caballa, perca, lucio, sábalo, vieiras, camarón, trucha",
          ],
          [
            "Papas",
            "Todas: rojas, blancas, dulces y ñame (no papas enlatadas)",
          ],
          ["Arroz", "Todo: blanco, integral y variedades gourmet"],
          [
            "Sopas",
            "Todas las que no sean de tomate, con moderación (las sopas cremosas pueden causar exceso de mucosidad y/o molestias de reflujo)",
          ],
          [
            "Pasta",
            "Salsa pesto o de ajo y aceite; solo salsa blanca de almejas",
          ],
          [
            "Verduras y almidones",
            "Remolachas, berenjena (a la parrilla o salteada solamente), frijoles, habas, judías verdes, frijoles de cera, espinaca, alcachofas, espárragos, coles de Bruselas, coliflor, brócoli, brocoflor, chirivías, zanahorias, calabaza buttercup, calabaza bellota, calabaza moscada, calabaza delicata, calabacín (amarillo y verde), calabazas gourmet, peras secadas al sol",
          ],
          [
            "Frutas dulces",
            "Plátanos, dátiles, higos, pasas (Thompson y moscatel), ciruelas pasas, caquis, melones, fresas, arándanos, moras, frambuesas",
          ],
          [
            "Hierbas y condimentos",
            "Albahaca, hojas de laurel, perifollo, cebollín, cilantro, eneldo, mejorana, orégano, perejil, romero, salvia, ajedrea, estragón, tomillo, ajo, salsa de soya, pimienta blanca",
          ],
        ],
      },
    ],
  },
];

const antiReflux: PrepDoc = {
  slug: "anti-reflux-diet",
  docId: "prep-anti-reflux-diet",
  group: "diet",
  title: {
    en: "Anti-Reflux Diet Guidelines",
    es: "Guías de dieta antirreflujo",
  },
  regimen: {
    en: "Foods and drinks to avoid, reflux-acceptable foods, and daily anti-reflux habits",
    es: "Alimentos y bebidas a evitar, alimentos aceptables para el reflujo y hábitos antirreflujo diarios",
  },
  summary: {
    en: "The anti-reflux diet guidelines from Westchase Gastroenterology: which foods and drinks make acid reflux worse, which are acceptable, and the daily habits that help.",
    es: "Las guías de dieta antirreflujo de Westchase Gastroenterology: qué alimentos y bebidas empeoran el reflujo ácido, cuáles son aceptables y los hábitos diarios que ayudan.",
  },
  sourcePages: "1–3",
  sourceLangs: ["en", "es"],
  sections: { en: antiRefluxEn, es: antiRefluxEs },
};

export const otherPreps: PrepDoc[] = [sigmoidoscopy, endocapsule, antiReflux];
