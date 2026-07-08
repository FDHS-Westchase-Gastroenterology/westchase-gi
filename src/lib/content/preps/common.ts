// Shared passages that repeat verbatim across the practice's prep handouts.
//
// Six flavors. EN / ES_T / ES_O are chosen per document by which
// original(s) exist; VI / KO / AR are faithful translations of EN for
// locales with no original sheets (added 2026-07-08, pending native-speaker
// verification by clinic staff — drug, brand and product names stay in
// Latin script exactly as printed on US packaging):
//   EN    — the English originals' wording (shared across the EN sheets).
//   ES_T  — faithful Spanish translations of those EN passages, used on
//           documents whose only original is English. Terminology follows
//           the practice's own Spanish sheets.
//   ES_O  — the practice's own Spanish sheets' wording, used on documents
//           that have a Spanish original.
//   VI    — Vietnamese; addresses the patient as "quý vị".
//   KO    — Korean; polite-formal 합니다체 with -하십시오 imperatives.
//   AR    — Modern Standard Arabic; Western digits (0-9) only.
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

/* ------------------------------------------------------------------ *
   Vietnamese translations of the English passages (2026-07-08;
   pending native-speaker verification by clinic staff)
 * ------------------------------------------------------------------ */
export const VI = {
  readCarefully: "Xin quý vị đọc kỹ các hướng dẫn này.",
  appointmentLine:
    "**Ngày làm thủ thuật của quý vị:** ___ **Có mặt tại Khoa Nội soi Ngoại trú lúc:** ___",
  dayOfNpo:
    "**Vào ngày làm thủ thuật, quý vị không được ăn hoặc uống bất cứ thứ gì.** Ngoại lệ: nếu quý vị uống thuốc huyết áp, thuốc tim, thuốc chống co giật và/hoặc thuốc tuyến giáp vào buổi sáng, hãy uống các thuốc đó với một ngụm nước nhỏ ít nhất hai (2) giờ trước giờ làm thủ thuật.",
  bringHeading: "Xin quý vị mang theo những vật dụng sau",
  bringItems: [
    "Thẻ bảo hiểm y tế và bằng lái xe của quý vị",
    "Kính mắt nếu quý vị cần để đọc",
  ],
  jewelryClothes:
    "Xin để trang sức và đồ vật có giá trị ở nhà; quý vị có thể đeo nhẫn cưới. Xin mặc quần áo thoải mái — quý vị sẽ thay sang áo choàng y tế.",
  remindersHeading: "Những lời nhắc quan trọng",
  companion:
    "Quý vị **bắt buộc** phải có một người lớn đi cùng (người thân hoặc bạn bè) để đưa quý vị về nhà sau thủ thuật. Việc sử dụng phương tiện công cộng — Uber, Lyft, taxi, v.v. — **không** được phép.",
  rest: "Hãy dự định nghỉ ngơi sau thủ thuật. Tránh các hoạt động nặng, không điều khiển xe có động cơ, và không uống rượu bia trong ngày làm thủ thuật.",
  diabeticIntro: "Nếu quý vị bị **tiểu đường**:",
  diabeticItems: [
    "Nếu quý vị dùng insulin, chỉ dùng **một nửa (½) liều** insulin vào đêm trước thủ thuật và **không** dùng insulin vào buổi sáng ngày làm thủ thuật. Quý vị có thể dùng lại liều bình thường sau thủ thuật.",
    "Nếu quý vị uống thuốc viên, **không** uống các thuốc đó vào ngày hôm trước và buổi sáng ngày làm thủ thuật. Quý vị có thể dùng lại liều bình thường sau thủ thuật.",
  ],
  anticoagulants:
    "**Đối với các thuốc chống đông máu / làm loãng máu / chống kết tập tiểu cầu** (Plavix, Coumadin, Effient, Xarelto, Pradaxa, Brilinta, Eliquis, v.v.): **xin liên hệ trước với bác sĩ đã kê các thuốc này để được chấp thuận và/hoặc hướng dẫn.**",
  nsaids:
    "**Xin ngừng các thuốc NSAID (ibuprofen, Advil, Aleve, v.v.),** sắt, vitamin tổng hợp có chứa sắt, vitamin E, St. John's Wort, ginkgo biloba, gừng, dầu cá và viên tỏi **7 ngày trước.** Nếu quý vị cần thuốc giảm đau, quý vị có thể dùng Tylenol (acetaminophen).",
  aspirin:
    "**Không ngừng Aspirin 81 mg dùng để bảo vệ tim mạch,** cả trước lẫn sau thủ thuật.",
  dietPills: "**Ngừng thuốc giảm cân (Phentermine) 14 ngày trước.**",
  glp1: "**Ngừng semaglutide (Wegovy, Ozempic, Rybelsus), dulaglutide (Trulicity), lixisenatide (Adlyxin), exenatide (Bydureon, Byetta), liraglutide (Victoza, Saxenda) và Mounjaro (tirzepatide) 7 ngày trước.**",
  fiber:
    "**Giảm ăn chất xơ 3 ngày trước thủ thuật.** Ví dụ: không ăn các loại quả hạch, các loại hạt, bắp rang (popcorn), bắp, v.v. Không dùng các sản phẩm bổ sung chất xơ như Metamucil, Citrucel, Fiberall, v.v.",
  followUp:
    "**Lưu ý: quý vị cần đặt lịch hẹn tái khám 2 tuần sau thủ thuật. Kết quả thủ thuật sẽ không được thảo luận tại cơ sở ngoại trú hoặc qua điện thoại.**",
  dayBeforeHeading:
    "Ngày trước thủ thuật của quý vị: cả ngày chỉ dùng chất lỏng trong",
  noSolids:
    "Xin quý vị **không ăn sáng và không ăn bất kỳ thức ăn đặc nào** vào ngày hôm trước và buổi sáng ngày làm thủ thuật. Ví dụ: nếu thủ thuật của quý vị vào thứ Hai, không ăn sáng hoặc bất kỳ thức ăn đặc nào trong suốt ngày Chủ Nhật và sáng thứ Hai. Sau thủ thuật, quý vị có thể ăn uống trở lại như bình thường tùy theo khả năng dung nạp.",
  drinkHourly: (prep: string) =>
    `**Mỗi giờ hãy uống ít nhất 8 ounce chất lỏng trong, cho đến khi quý vị bắt đầu dùng thuốc chuẩn bị ruột ${prep}.**`,
  hydrate: (prep: string) =>
    `**Xin quý vị giữ cho cơ thể đủ nước trước, trong và sau khi** hoàn tất thuốc chuẩn bị ruột ${prep}. **Tuy nhiên, quý vị phải ngừng uống tất cả chất lỏng bốn (4) giờ trước giờ làm thủ thuật — kể cả cà phê.** (Ví dụ: nếu giờ làm thủ thuật của quý vị là 10 giờ sáng, quý vị không được uống gì sau 6 giờ sáng.)`,
  avoidHeading:
    "Lời nhắc quan trọng — không ăn hoặc uống bất kỳ loại nào sau đây:",
  avoidItems: [
    "**Sữa, các sản phẩm từ sữa hoặc sản phẩm thay thế sữa**",
    "**Chất lỏng có màu đỏ, tím hoặc xanh dương**",
    "**Bất kỳ thức ăn đặc nào**",
  ],
  liquidsHeading: "Các chất lỏng được khuyến nghị gồm",
  liquidsItems: [
    "Nước lọc",
    "Gatorade (không dùng loại màu đỏ, tím hoặc xanh dương)",
    "Nước ngọt có ga loại trong như Sprite hoặc ginger ale",
    "Nước ép trong như nước ép táo hoặc nước ép nho trắng",
    "Cà phê và trà chỉ pha với đường (không sữa, không sản phẩm từ sữa hoặc sản phẩm thay thế sữa)",
    "Kem que (không lẫn miếng đặc; không màu đỏ, tím hoặc xanh dương)",
    "Thạch Jello (không màu đỏ, tím hoặc xanh dương)",
    "Nước dùng (chỉ nước dùng gà, bò hoặc rau củ — không lẫn miếng đặc)",
  ],
} satisfies typeof EN;

/* ------------------------------------------------------------------ *
   Korean translations of the English passages (2026-07-08;
   pending native-speaker verification by clinic staff)
 * ------------------------------------------------------------------ */
export const KO = {
  readCarefully: "이 안내문을 주의 깊게 읽어 주십시오.",
  appointmentLine:
    "**시술 날짜:** ___ **외래 내시경실 도착 시간:** ___",
  dayOfNpo:
    "**시술 당일에는 아무것도 먹거나 마시지 마십시오.** 예외: 아침에 혈압약, 심장약, 경련(발작) 치료제 및/또는 갑상선약을 복용하시는 경우, 시술 예정 시간 최소 두 (2) 시간 전에 소량의 물 한 모금과 함께 복용하십시오.",
  bringHeading: "다음 물품을 지참해 주십시오",
  bringItems: [
    "보험 카드와 운전면허증",
    "필요한 경우 독서용 안경",
  ],
  jewelryClothes:
    "장신구와 귀중품은 집에 두고 오십시오. 결혼반지는 착용하셔도 됩니다. 편안한 옷을 입고 오십시오 — 검사용 가운으로 갈아입으시게 됩니다.",
  remindersHeading: "중요 안내 사항",
  companion:
    "시술 후 귀하를 집까지 데려다줄 성인 동반자(가족 또는 친구)가 **반드시** 있어야 합니다. Uber, Lyft, 택시 등 대중교통 이용은 허용되지 **않습니다**.",
  rest: "시술 후에는 휴식을 취하도록 계획하십시오. 무리한 활동과 자동차 운전을 피하시고, 시술 당일에는 술을 마시지 마십시오.",
  diabeticIntro: "**당뇨병**이 있으신 경우:",
  diabeticItems: [
    "인슐린을 사용하시는 경우, 시술 전날 밤에는 인슐린을 **절반(½) 용량**만 사용하시고, 시술 당일 아침에는 인슐린을 **사용하지 마십시오**. 시술 후에는 평소 용량을 다시 사용하셔도 됩니다.",
    "알약을 복용하시는 경우, 시술 전날과 시술 당일 아침에는 **복용하지 마십시오**. 시술 후에는 평소 용량을 다시 복용하셔도 됩니다.",
  ],
  anticoagulants:
    "**항응고제 / 혈액 희석제 / 항혈소판제 계열 약물을 복용하시는 경우** (Plavix, Coumadin, Effient, Xarelto, Pradaxa, Brilinta, Eliquis 등): **해당 약을 처방한 의사에게 미리 연락하여 승인 및/또는 지침을 받으십시오.**",
  nsaids:
    "**NSAIDs(ibuprofen, Advil, Aleve 등),** 철분제, 철분이 함유된 종합비타민, 비타민 E, St. John's Wort, ginkgo biloba, 생강, 생선 기름, 마늘 정제는 **7일 전에 복용을 중단하십시오.** 진통제가 필요한 경우에는 Tylenol (acetaminophen)을 복용하셔도 됩니다.",
  aspirin:
    "**심장 보호를 위해 복용하시는 Aspirin 81 mg은** 시술 전에도 후에도 **중단하지 마십시오.**",
  dietPills: "**다이어트 약(Phentermine)은 14일 전에 중단하십시오.**",
  glp1: "**semaglutide (Wegovy, Ozempic, Rybelsus), dulaglutide (Trulicity), lixisenatide (Adlyxin), exenatide (Bydureon, Byetta), liraglutide (Victoza, Saxenda) 및 Mounjaro (tirzepatide)는 7일 전에 중단하십시오.**",
  fiber:
    "**시술 3일 전부터 섬유질 섭취를 줄이십시오.** 예를 들어 견과류, 씨앗류, 팝콘, 옥수수 등은 먹지 마십시오. Metamucil, Citrucel, Fiberall 등의 섬유질 보충제를 사용하지 마십시오.",
  followUp:
    "**참고: 시술 2주 후의 추적 진료 예약을 잡으셔야 합니다. 시술 결과는 외래 시술 기관에서나 전화로는 안내해 드리지 않습니다.**",
  dayBeforeHeading: "시술 전날: 하루 종일 맑은 유동식(맑은 액체만 섭취)",
  noSolids:
    "시술 전날과 시술 당일 아침에는 **아침 식사를 포함하여 어떤 고형 음식도 드시지 마십시오**. 예를 들어 시술이 월요일이라면, 일요일 하루 종일과 월요일 아침에는 아침 식사나 고형 음식을 일절 드시지 마십시오. 시술 후에는 몸 상태가 허락하는 대로 평소 식단을 다시 시작하셔도 됩니다.",
  drinkHourly: (prep: string) =>
    `**${prep} 장 정결제 복용을 시작할 때까지 매시간 맑은 액체를 최소 8온스씩 드십시오.**`,
  hydrate: (prep: string) =>
    `${prep} 장 정결제를 복용하기 **전과 복용하는 동안, 그리고 복용을 마친 후에도 수분을 충분히 유지하십시오.** **다만, 시술 예정 시간 네 (4) 시간 전부터는 모든 액체 섭취를 중단해야 하며, 커피도 여기에 포함됩니다.** (예: 시술 시간이 오전 10시라면 오전 6시 이후에는 아무것도 마시지 마십시오.)`,
  avoidHeading: "중요 안내 — 다음은 먹거나 마시지 마십시오:",
  avoidItems: [
    "**유제품 및 유제품 대체 제품**",
    "**빨간색, 보라색 또는 파란색 액체**",
    "**모든 고형 음식**",
  ],
  liquidsHeading: "권장되는 액체는 다음과 같습니다",
  liquidsItems: [
    "물",
    "Gatorade (빨간색, 보라색, 파란색 제외)",
    "Sprite, ginger ale 등 맑은 탄산음료",
    "사과 주스, 백포도 주스 등 맑은 주스",
    "설탕만 넣은 커피와 차 (우유, 유제품, 유제품 대체 제품 제외)",
    "아이스바 (고형 조각이 없는 것; 빨간색, 보라색, 파란색 제외)",
    "Jello 젤라틴 (빨간색, 보라색, 파란색 제외)",
    "맑은 국물 (닭고기, 소고기 또는 채소 국물만 — 건더기 제외)",
  ],
} satisfies typeof EN;

/* ------------------------------------------------------------------ *
   Modern Standard Arabic translations of the English passages
   (2026-07-08; Western digits only; pending native-speaker
   verification by clinic staff)
 * ------------------------------------------------------------------ */
export const AR = {
  readCarefully: "يُرجى قراءة هذه التعليمات بعناية.",
  appointmentLine:
    "**يوم الإجراء:** ___ **موعد الحضور إلى وحدة التنظير للمرضى الخارجيين:** ___",
  dayOfNpo:
    "**في يوم الإجراء، لا تأكل ولا تشرب شيئًا.** استثناء: إذا كنت تتناول في الصباح أدوية ضغط الدم أو القلب أو النوبات (الصرع) و/أو الغدة الدرقية، فتناولها مع رشفة صغيرة من الماء قبل موعد الإجراء بساعتين (2) على الأقل.",
  bringHeading: "يُرجى إحضار الأغراض التالية معك",
  bringItems: [
    "بطاقات التأمين الصحي ورخصة القيادة الخاصة بك",
    "نظارات القراءة إذا كنت تحتاج إليها",
  ],
  jewelryClothes:
    "يُرجى ترك المجوهرات والأشياء الثمينة في المنزل؛ ويمكن ارتداء خاتم (خواتم) الزواج. يُرجى ارتداء ملابس مريحة — إذ ستبدّل ملابسك وترتدي رداءً طبيًا.",
  remindersHeading: "تذكيرات مهمة",
  companion:
    "**يجب** أن يكون معك مرافق بالغ (من الأهل أو الأصدقاء) ليوصلك إلى المنزل بعد الإجراء. استخدام وسائل النقل العامة — Uber أو Lyft أو سيارات الأجرة (التاكسي) وغيرها — **غير** مسموح به.",
  rest: "خطّط للراحة بعد الإجراء. تجنّب الأنشطة المجهدة وقيادة المركبات، ولا تشرب الكحول في يوم الإجراء.",
  diabeticIntro: "إذا كنت مصابًا **بداء السكري**:",
  diabeticItems: [
    "إذا كنت تستخدم الأنسولين، فاستخدم **نصف (½) الجرعة** فقط في ليلة ما قبل الإجراء، و**لا** تستخدم أي أنسولين في صباح يوم الإجراء. يمكنك العودة إلى جرعتك المعتادة بعد الإجراء.",
    "إذا كنت تتناول أقراصًا (حبوبًا)، **فلا** تتناولها في اليوم السابق للإجراء ولا في صباح يومه. يمكنك العودة إلى جرعتك المعتادة بعد الإجراء.",
  ],
  anticoagulants:
    "**بالنسبة لأدوية منع تخثر الدم / مميعات الدم / مضادات الصفائح الدموية** (Plavix، Coumadin، Effient، Xarelto، Pradaxa، Brilinta، Eliquis، إلخ): **يُرجى التواصل مسبقًا مع الطبيب الذي وصفها لك للحصول على الموافقة و/أو التعليمات.**",
  nsaids:
    "**يُرجى التوقف عن تناول مضادات الالتهاب اللاستيرويدية NSAIDs (ibuprofen، Advil، Aleve، إلخ)،** والحديد، والفيتامينات المتعددة المحتوية على الحديد، وفيتامين E، وSt. John's Wort، وginkgo biloba، والزنجبيل، وزيت السمك، وأقراص الثوم **قبل 7 أيام.** إذا احتجت إلى مسكّن للألم، يمكنك تناول Tylenol (acetaminophen).",
  aspirin:
    "**لا توقف تناول Aspirin 81 mg الذي تتناوله لحماية القلب** سواء قبل الإجراء أو بعده.",
  dietPills: "**توقف عن تناول حبوب إنقاص الوزن (Phentermine) قبل 14 يومًا.**",
  glp1: "**توقف عن تناول semaglutide (Wegovy، Ozempic، Rybelsus) وdulaglutide (Trulicity) وlixisenatide (Adlyxin) وexenatide (Bydureon، Byetta) وliraglutide (Victoza، Saxenda) وMounjaro (tirzepatide) قبل 7 أيام.**",
  fiber:
    "**قلّل تناول الألياف قبل 3 أيام من الإجراء.** على سبيل المثال، لا تأكل المكسرات أو البذور أو الفشار أو الذرة، إلخ. ولا تستخدم مكملات الألياف مثل Metamucil وCitrucel وFiberall، إلخ.",
  followUp:
    "**ملاحظة: يجب تحديد موعد للمتابعة بعد أسبوعين (2) من الإجراء. لن تتم مناقشة نتائج الإجراء في مركز العيادات الخارجية ولا عبر الهاتف.**",
  dayBeforeHeading:
    "اليوم السابق للإجراء: نظام غذائي من السوائل الصافية طوال اليوم",
  noSolids:
    "يُرجى **عدم تناول وجبة الإفطار أو أي طعام صلب** في اليوم السابق للإجراء وفي صباح يومه. على سبيل المثال، إذا كان إجراؤك يوم الاثنين، فلا تتناول الإفطار أو أي طعام صلب طوال يوم الأحد وصباح يوم الاثنين. يمكنك استئناف نظامك الغذائي المعتاد بعد الإجراء حسب ما تتحمّله.",
  drinkHourly: (prep: string) =>
    `**اشرب ما لا يقل عن 8 أونصات من السوائل الصافية كل ساعة إلى أن تبدأ تحضير الأمعاء بـ ${prep}.**`,
  hydrate: (prep: string) =>
    `**يُرجى الحفاظ على ترطيب جسمك جيدًا قبل وأثناء وبعد** إكمال تحضير الأمعاء بـ ${prep}. **ومع ذلك، يجب التوقف عن تناول جميع السوائل قبل موعد الإجراء بأربع (4) ساعات — وهذا يشمل القهوة أيضًا.** (على سبيل المثال: إذا كان موعد إجرائك الساعة 10 صباحًا، فلا تشرب شيئًا بعد الساعة 6 صباحًا.)`,
  avoidHeading: "تذكير مهم — لا تأكل ولا تشرب أيًا مما يلي:",
  avoidItems: [
    "**منتجات الألبان أو بدائلها**",
    "**السوائل ذات اللون الأحمر أو الأرجواني أو الأزرق**",
    "**أي أطعمة صلبة**",
  ],
  liquidsHeading: "تشمل السوائل المُوصى بها",
  liquidsItems: [
    "الماء",
    "Gatorade (ليس الأحمر أو الأرجواني أو الأزرق)",
    "المشروبات الغازية الصافية مثل Sprite أو ginger ale",
    "العصائر الصافية مثل عصير التفاح أو عصير العنب الأبيض",
    "القهوة والشاي مع السكر فقط (من دون حليب أو منتجات ألبان أو بدائل الألبان)",
    "مصاصات مثلجة (بدون قطع صلبة؛ وليست حمراء أو أرجوانية أو زرقاء)",
    "جيلاتين Jello (ليس الأحمر أو الأرجواني أو الأزرق)",
    "المرق (مرق الدجاج أو اللحم البقري أو الخضار فقط — بدون قطع صلبة)",
  ],
} satisfies typeof EN;
