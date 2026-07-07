// Shared passages that repeat verbatim across the practice's prep handouts.
//
// Three flavors, chosen per document by which original(s) exist:
//   EN    — the English originals' wording (shared across the EN sheets).
//   ES_T  — faithful Spanish translations of those EN passages, used on
//           documents whose only original is English. Terminology follows
//           the practice's own Spanish sheets.
//   ES_O  — the practice's own Spanish sheets' wording, used on documents
//           that have a Spanish original.
//
// Transcription policy (matches the cleared markdown set): every clinical
// fact — drug names/lists, doses, times, sequences — is verbatim from the
// scan. Only orthography is normalized (accents, "NSAID's"→"NSAIDs",
// "Semiglutide"→"semaglutide", ES typos like "conducer"/"Anticuagulantes"),
// and print-era ALL CAPS is set in sentence case; emphasis is carried by
// the design instead. The known source quirks (PROJECT-LOG 2026-07-07
// safety gate) are reproduced as-is, never silently "fixed".

/* ------------------------------------------------------------------ *
   English originals
 * ------------------------------------------------------------------ */
export const EN = {
  readCarefully: "Please read over these instructions carefully.",
  appointmentLine:
    "**Day of your procedure:** ___ **Be at the Outpatient Endoscopy Unit at:** ___",
  dayOfNpo:
    "**On the day of your procedure, do not eat or drink.** Exception: if you take blood pressure, heart, seizure and/or thyroid medications in the morning, take them with a small sip of water at least two (2) hours before your procedure time.",
  bringHeading: "Please bring the following items with you",
  bringItems: [
    "Your insurance cards and driver's license",
    "Eye glasses if needed for reading",
  ],
  jewelryClothes:
    "Please leave jewelry and valuables at home; wedding band(s) may be worn. Please wear comfortable clothes — you will be changing into a gown.",
  remindersHeading: "Important reminders",
  companion:
    "You **must** have an adult companion (family member or friend) to take you home after your procedure. Use of public transportation — Uber, Lyft, taxi, etc. — is **not** allowed.",
  rest: "Plan on resting after your procedure. Avoid big activities, operating motor vehicles, and do not drink alcohol on the day of the procedure.",
  diabeticIntro: "If you are **diabetic**:",
  diabeticItems: [
    "If you use insulin, only use **½ dose** of insulin the night before your procedure and **no** insulin the morning of your procedure. You may resume your normal dose after your procedure.",
    "If you take pills, **do not** take them the day before and the morning of your procedure. You may resume your normal dose after your procedure.",
  ],
  anticoagulants:
    "**For anti-coagulant / blood thinner / anti-platelet medications** (Plavix, Coumadin, Effient, Xarelto, Pradaxa, Brilinta, Eliquis, etc.): **please contact the physician who prescribed them in advance for clearance and/or instructions.**",
  nsaids:
    "**Please stop NSAIDs (ibuprofen, Advil, Aleve, etc.),** iron, multi-vitamins with iron, Vitamin E, St. John's Wort, ginkgo biloba, ginger, fish oil, and garlic pills **7 days before.** If you need to take a pain reliever, you can take Tylenol (acetaminophen).",
  aspirin:
    "**Don't stop Aspirin 81 mg for cardiac protection** before or after the procedure.",
  dietPills: "**Stop diet pills (Phentermine) 14 days before.**",
  glp1: "**Stop semaglutide (Wegovy, Ozempic, Rybelsus), dulaglutide (Trulicity), lixisenatide (Adlyxin), exenatide (Bydureon, Byetta), liraglutide (Victoza, Saxenda) and Mounjaro (tirzepatide) 7 days before.**",
  fiber:
    "**Reduce fiber intake 3 days prior to your procedure.** For example, do not eat nuts, seeds, popcorn, corn, etc. Do not use fiber supplements such as Metamucil, Citrucel, Fiberall, etc.",
  followUp:
    "**Note: a follow-up appointment 2 weeks after your procedure needs to be scheduled. Procedure results will not be discussed at the outpatient facility or over the phone.**",
  dayBeforeHeading: "The day before your procedure: clear liquid diet all day",
  noSolids:
    "Please **do not eat breakfast or any solid food** the day before and the morning of your procedure. For example, if your procedure is on Monday, do not eat breakfast or any solid food all day Sunday and Monday morning. You may resume a regular diet as tolerated after your procedure.",
  drinkHourly: (prep: string) =>
    `**Drink at least 8 ounces of clear liquids every hour up until you start the ${prep} prep.**`,
  hydrate: (prep: string) =>
    `**Please stay well hydrated before, during and after** you have completed your ${prep} prep. **However, you must stop all liquid intake four (4) hours prior to your procedure time — this also means coffee.** (For example: if your procedure time is 10 am, do not drink after 6 am.)`,
  avoidHeading: "Important reminder — do not eat or drink any:",
  avoidItems: [
    "**Dairy or dairy-substitute products**",
    "**Red, purple or blue colored liquids**",
    "**Any solid foods**",
  ],
  liquidsHeading: "Recommended liquids include",
  liquidsItems: [
    "Water",
    "Gatorade (no red, purple or blue)",
    "Clear soft drinks such as Sprite or ginger ale",
    "Clear juices such as apple juice or white grape juice",
    "Coffee and teas with sugar only (no milk, dairy, or dairy-substitute products)",
    "Popsicles (no solid pieces; no red, purple or blue)",
    "Jello (no red, purple or blue)",
    "Broth (chicken, beef or vegetable broth only — no solid pieces)",
  ],
};

/* ------------------------------------------------------------------ *
   Spanish translations of the English passages (for EN-only handouts)
 * ------------------------------------------------------------------ */
export const ES_T = {
  readCarefully: "Por favor lea estas instrucciones detalladamente.",
  appointmentLine:
    "**Día de su procedimiento:** ___ **Debe estar en el Centro de Endoscopia a las:** ___",
  dayOfNpo:
    "**El día de su procedimiento no puede comer ni beber.** Excepción: si toma medicamentos para la presión arterial, el corazón, las convulsiones y/o la tiroides por la mañana, tómelos con un pequeño sorbo de agua al menos dos (2) horas antes de la hora de su procedimiento.",
  bringHeading: "Por favor traiga lo siguiente",
  bringItems: [
    "Su tarjeta del seguro médico y su licencia de conducir (ID)",
    "Lentes (anteojos/gafas) para leer, si los necesita",
  ],
  jewelryClothes:
    "Deje en casa joyas y artículos de valor; puede usar su argolla de matrimonio. Por favor use ropa cómoda — le van a poner una bata quirúrgica.",
  remindersHeading: "Instrucciones importantes",
  companion:
    "**Debe** tener un acompañante adulto (familiar o amistad) que lo lleve a su casa después del procedimiento. La transportación pública — Uber, Lyft, taxi, etc. — **no** es permitida.",
  rest: "Debe planear descansar después de su procedimiento. Evite actividades importantes, no conduzca ni maneje máquinas de motor, y no tome alcohol el día del procedimiento.",
  diabeticIntro: "Si usted es **diabético(a)**:",
  diabeticItems: [
    "Si usa insulina, use solo la **mitad (½) de la dosis** la noche antes del procedimiento y **no** use insulina la mañana del procedimiento. Puede volver a su dosis normal después del procedimiento.",
    "Si toma pastillas, **no** las tome el día anterior ni la mañana del procedimiento. Puede volver a su dosis normal después del procedimiento.",
  ],
  anticoagulants:
    "**Si toma anticoagulantes o antiplaquetarios** (Plavix, Coumadin, Effient, Xarelto, Pradaxa, Brilinta, Eliquis, etc.): **por favor contacte con anticipación al médico que se los recetó para autorización e instrucciones.**",
  nsaids:
    "**Suspenda los AINE (ibuprofeno, Advil, Aleve, etc.),** el hierro, las multivitaminas con hierro, la vitamina E, la hierba de San Juan, el ginkgo biloba, el jengibre, el aceite de pescado y las tabletas de ajo **7 días antes.** Si necesita un analgésico, puede tomar Tylenol (acetaminofén).",
  aspirin:
    "**No suspenda la Aspirina 81 mg si la toma para protección cardíaca,** ni antes ni después del procedimiento.",
  dietPills:
    "**Suspenda las pastillas para bajar de peso (Phentermine) 14 días antes.**",
  glp1: "**Suspenda semaglutide (Wegovy, Ozempic, Rybelsus), dulaglutide (Trulicity), lixisenatide (Adlyxin), exenatide (Bydureon, Byetta), liraglutide (Victoza, Saxenda) y Mounjaro (tirzepatide) 7 días antes.**",
  fiber:
    "**Disminuya el consumo de fibra 3 días antes de su procedimiento.** Por ejemplo, no coma nueces, semillas, palomitas de maíz (popcorn), maíz, etc. No use suplementos de fibra como Metamucil, Citrucel, Fiberall, etc.",
  followUp:
    "**Nota: debe programar una cita de seguimiento 2 semanas después de su procedimiento. Los resultados del procedimiento no se discuten en el centro ambulatorio ni por teléfono.**",
  dayBeforeHeading:
    "El día anterior a su procedimiento: dieta líquida clara todo el día",
  noSolids:
    "Por favor **no desayune ni coma ningún alimento sólido** el día antes ni la mañana de su procedimiento. Por ejemplo, si su procedimiento es un lunes, no desayune ni coma alimentos sólidos durante todo el domingo y el lunes por la mañana. Podrá volver a su dieta normal, según la tolere, después del procedimiento.",
  drinkHourly: (prep: string) =>
    `**Tome por lo menos 8 onzas de líquidos claros cada hora hasta empezar la preparación con ${prep}.**`,
  hydrate: (prep: string) =>
    `**Por favor manténgase bien hidratado antes, durante y después** de completar su preparación con ${prep}. **Sin embargo, debe suspender toda ingesta de líquidos cuatro (4) horas antes de la hora de su procedimiento — esto incluye el café.** (Por ejemplo: si su procedimiento es a las 10 am, no beba después de las 6 am.)`,
  avoidHeading: "Recordatorio importante — no coma ni beba:",
  avoidItems: [
    "**Lácteos ni productos sustitutos de lácteos**",
    "**Líquidos de color rojo, púrpura o azul**",
    "**Ningún alimento sólido**",
  ],
  liquidsHeading: "Líquidos recomendados",
  liquidsItems: [
    "Agua",
    "Gatorade (que no sea rojo, púrpura o azul)",
    "Refrescos claros como Sprite o ginger ale",
    "Jugos claros como jugo de manzana o de uva blanca",
    "Café y té con azúcar solamente (sin leche, lácteos ni sustitutos de lácteos)",
    "Paletas heladas (sin trozos sólidos; que no sean rojas, púrpuras o azules)",
    "Gelatina (que no sea roja, púrpura o azul)",
    "Caldo (solo caldo de pollo, carne o vegetales — sin trozos sólidos)",
  ],
};

/* ------------------------------------------------------------------ *
   The practice's own Spanish sheets' wording (for ES originals)
 * ------------------------------------------------------------------ */
export const ES_O = {
  readCarefully: "Por favor lea las instrucciones detalladamente.",
  appointmentLine:
    "**Día del procedimiento:** ___ **Estar en el Centro de Endoscopia a las:** ___",
  dayOfNpo:
    "**El día del procedimiento no puede comer ni beber líquidos.** A excepción de un pequeño sorbo de agua con los medicamentos autorizados para el día del procedimiento (para la presión arterial, corazón, tiroides o anticonvulsivantes), dos horas antes.",
  bringHeading: "Traiga lo siguiente",
  bringItems: [
    "Licencia de conducir (Driver's License, ID) y tarjeta del seguro médico (insurance card)",
    "Lentes (anteojos/gafas) para leer",
  ],
  jewelryClothes:
    "Deje en casa joyas y artículos de valor. Puede usar su argolla de matrimonio. Por favor use ropa cómoda, ya que le van a poner una bata quirúrgica.",
  remindersHeading: "Instrucciones importantes",
  companion:
    "**Alguien debe conducir su auto y llevarlo a su casa. No se le permitirá salir del centro si no tiene un conductor. La transportación pública (por ejemplo: Uber, Lyft o taxi) no es permitida.**",
  rest: "Debe planear descansar el resto del día. Evite actividades importantes, no puede conducir ni manejar máquinas de motor, y no puede tomar alcohol el día del procedimiento.",
  diabeticIntro: "Si usted es **diabético(a)**:",
  diabeticItems: [
    "Si usa insulina, solo puede recibir la mitad (½) de la dosis la noche antes del procedimiento, y **no** puede recibir insulina la mañana del procedimiento. Puede volver a su uso normal después del procedimiento.",
    "Si toma medicamentos para la diabetes, **no** los tome el día anterior ni la mañana del procedimiento. Puede volver a su uso normal después del procedimiento.",
  ],
  anticoagulants:
    "**Si toma anticoagulantes o antiplaquetarios (Coumadin, Warfarin, Plavix, Clopidogrel, Effient, Xarelto, Eliquis, Brilinta, etc.), por favor contacte al médico que le receta estos medicamentos para autorización e instrucciones adicionales.**",
  nsaids:
    "**Siete (7) días antes debe suspender:** ibuprofeno, Celebrex, Naproxen, Mobic, meloxicam, Omega 3, aceite de hígado de pescado, vitamina E y tabletas de ajo.",
  aspirin:
    "**No debe suspender la Aspirina 81 mg si la toma para protección cardíaca.**",
  dietPills:
    "**14 días antes debe suspender: Phentermine** (medicamento para bajar de peso).",
  // The practice's Spanish sheets list the same medications but no day
  // count — reproduced as-is (source quirk; flagged for the practice).
  glp1: "**Debe suspender semaglutide (Wegovy, Ozempic, Rybelsus), dulaglutide (Trulicity), lixisenatide (Adlyxin), exenatide (Bydureon, Byetta), liraglutide (Victoza, Saxenda) y Mounjaro (tirzepatide).**",
  fiber:
    "**Disminuya el consumo de fibra 3 días antes.** Por ejemplo, no coma nueces, semillas, palomitas de maíz (popcorn).",
  followUp:
    "**Nota:** si no tiene cita de seguimiento después del procedimiento, llame a nuestra oficina. Recuerde que no se dan resultados por teléfono. **Sin excepciones.**",
  dayBeforeHeading:
    "¡Dieta líquida clara todo el día anterior a su procedimiento!",
  noSolids:
    "Por favor no coma ninguna comida sólida el día antes ni en la mañana de su procedimiento. Por ejemplo, si su procedimiento es un lunes, no puede desayunar ni comer alimentos durante el domingo y el lunes por la mañana. Podrá volver a comer su dieta normal después del procedimiento.",
  drinkHourly: (prep: string) =>
    `**Tome por lo menos 8 onzas de líquidos claros cada hora hasta empezar la preparación con ${prep}.**`,
  hydrate: (prep: string) =>
    `**Por favor manténgase bien hidratado antes, durante y después de completar su preparación con ${prep}.** Sin embargo, recuerde que debe suspender toda ingesta de líquidos 4 horas antes de su procedimiento.`,
  avoidHeading: "¡Recordatorios importantes! No coma ni tome:",
  avoidItems: [
    "**Cualquier alimento de color azul, rojo o púrpura**",
    "**Lácteos, jugos de frutas, sorbetes, malteadas**",
    "**Cualquier alimento sólido**",
  ],
  liquidsHeading: "Líquidos recomendados",
  liquidsItems: [
    "Agua",
    "Gatorade (que no sea rojo, azul o púrpura)",
    "Jugos claros de manzana o uva (sin pulpa)",
    "Ginger ale o Sprite (bebidas sin alcohol)",
    "Caldo o consomé de pollo, carne o vegetal (sin sólidos) — debe ser claro",
    "Café con azúcar solamente (sin productos de leche o sustitutos lácteos)",
  ],
};
