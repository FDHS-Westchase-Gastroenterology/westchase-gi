// Colonoscopy preps: MiraLAX (full and split-dose) and Golytely (full and
// split-dose). Two of these have a Spanish original in the practice's scan:
// the split-dose MiraLAX sheet (pp. 13–14) and the full Golytely sheet
// (pp. 17–18) — each locale renders its own original there, INCLUDING their
// genuine divergences (the Spanish split-dose sheet runs 1/3/5 pm where the
// English runs 2/4/6 pm; both verified against the scan, flagged for the
// practice as a wording question, never silently aligned).

import type { PrepDoc, PrepSection } from "./types";
import { EN, ES_T, ES_O, VI, KO, AR } from "./common";
import { standardFront, avoidAndLiquids, type Flavor } from "./builders";

const purchaseEn =
  "**You will need to purchase one 10-ounce bottle of Magnesium Citrate, one 238-gram bottle of MiraLAX powder, and 4 tablets of Dulcolax 5 mg (Bisacodyl)** at your local pharmacy, in the laxative aisle.";

const purchaseEsT =
  "**Deberá comprar en su farmacia local (pasillo de laxantes): una botella de 10 onzas de Magnesium Citrate (citrato de magnesio), una botella de 238 gramos de MiraLAX en polvo y 4 tabletas de Dulcolax de 5 mg (Bisacodyl).**";

const mixStepEn =
  "In the morning, mix the whole bottle of MiraLAX powder in 64 ounces of water or 64 ounces of Gatorade **(if Gatorade: no red, purple or blue).** Shake well until the powder is dissolved; chill in the refrigerator.";

// VI/KO/AR bodies are machine translations of the EN passages (2026-07-08), pending native-speaker verification by clinic staff.

const purchaseVi =
  "**Quý vị sẽ cần mua một chai Magnesium Citrate 10 ounce, một chai bột MiraLAX 238 gram và 4 viên Dulcolax 5 mg (Bisacodyl)** tại nhà thuốc địa phương, ở quầy thuốc nhuận tràng.";

const purchaseKo =
  "가까운 약국의 완하제(변비약) 코너에서 **Magnesium Citrate 10온스 한 병, MiraLAX 가루 238그램 한 병, Dulcolax 5 mg (Bisacodyl) 4정을 구입하셔야 합니다.**";

const purchaseAr =
  "**ستحتاج إلى شراء زجاجة واحدة سعة 10 أونصات من Magnesium Citrate، وعبوة واحدة بوزن 238 غرامًا من مسحوق MiraLAX، و4 أقراص من Dulcolax عيار 5 ملغ (Bisacodyl)** من صيدليتك المحلية، في ممر الملينات.";

const mixStepVi =
  "Vào buổi sáng, pha toàn bộ chai bột MiraLAX với 64 ounce nước hoặc 64 ounce Gatorade **(nếu dùng Gatorade: không màu đỏ, tím hoặc xanh dương).** Lắc kỹ cho đến khi bột tan hết; để lạnh trong tủ lạnh.";

const mixStepKo =
  "아침에 MiraLAX 가루 한 병 전체를 물 64온스 또는 Gatorade 64온스에 섞으십시오 **(Gatorade의 경우: 빨간색, 보라색, 파란색은 안 됩니다).** 가루가 다 녹을 때까지 잘 흔든 뒤 냉장고에 넣어 차게 보관하십시오.";

const mixStepAr =
  "في الصباح، اخلط عبوة مسحوق MiraLAX كاملة مع 64 أونصة من الماء أو 64 أونصة من Gatorade **(إذا استخدمت Gatorade: يُمنع الأحمر والأرجواني والأزرق).** رجّ الخليط جيدًا حتى يذوب المسحوق، ثم ضعه في الثلاجة ليبرد.";

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

const miralaxDayBeforeVi: PrepSection[] = [
  {
    heading: VI.dayBeforeHeading,
    blocks: [
      { kind: "p", text: VI.noSolids },
      { kind: "p", text: VI.drinkHourly("MiraLAX") },
      { kind: "p", text: purchaseVi },
      {
        kind: "list",
        style: "steps",
        items: [
          mixStepVi,
          "Lúc **1:00 pm**, uống hai viên Dulcolax bằng đường uống.",
          "Lúc **3:00 pm**, uống chai Magnesium Citrate 10 ounce.",
          "Lúc **5:00 pm**, bắt đầu uống một ly 8 ounce dung dịch MiraLAX mỗi 15 phút cho đến khi uống hết.",
          "Lúc **9:00 pm**, uống hai viên Dulcolax còn lại bằng đường uống.",
        ],
      },
      { kind: "p", text: VI.hydrate("MiraLAX") },
    ],
  },
];

const miralaxDayBeforeKo: PrepSection[] = [
  {
    heading: KO.dayBeforeHeading,
    blocks: [
      { kind: "p", text: KO.noSolids },
      { kind: "p", text: KO.drinkHourly("MiraLAX") },
      { kind: "p", text: purchaseKo },
      {
        kind: "list",
        style: "steps",
        items: [
          mixStepKo,
          "**1:00 pm**에 Dulcolax 정제 2정을 경구로 복용하십시오.",
          "**3:00 pm**에 Magnesium Citrate 10온스 병을 마시십시오.",
          "**5:00 pm**에 MiraLAX 준비액 8온스 한 잔을 15분마다 마시기 시작하여 전량을 복용하십시오.",
          "**9:00 pm**에 남은 Dulcolax 정제 2정을 경구로 복용하십시오.",
        ],
      },
      { kind: "p", text: KO.hydrate("MiraLAX") },
    ],
  },
];

const miralaxDayBeforeAr: PrepSection[] = [
  {
    heading: AR.dayBeforeHeading,
    blocks: [
      { kind: "p", text: AR.noSolids },
      { kind: "p", text: AR.drinkHourly("MiraLAX") },
      { kind: "p", text: purchaseAr },
      {
        kind: "list",
        style: "steps",
        items: [
          mixStepAr,
          "في الساعة **1:00 pm**، تناول قرصي Dulcolax عن طريق الفم.",
          "في الساعة **3:00 pm**، اشرب زجاجة Magnesium Citrate سعة 10 أونصات.",
          "في الساعة **5:00 pm**، ابدأ بشرب كوب واحد سعة 8 أونصات من تحضير MiraLAX كل 15 دقيقة حتى تنهي الكمية كلها.",
          "في الساعة **9:00 pm**، تناول قرصي Dulcolax المتبقيين عن طريق الفم.",
        ],
      },
      { kind: "p", text: AR.hydrate("MiraLAX") },
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
    vi: "Chuẩn bị nội soi đại tràng (MiraLAX)",
    ko: "대장내시경 준비 (MiraLAX)",
    ar: "تحضير تنظير القولون (MiraLAX)",
  },
  regimen: {
    en: "MiraLAX + magnesium citrate + Dulcolax, taken entirely the day before",
    es: "MiraLAX + citrato de magnesio + Dulcolax, todo el día anterior",
    vi: "MiraLAX + magnesium citrate + Dulcolax, dùng toàn bộ vào ngày hôm trước",
    ko: "MiraLAX + magnesium citrate + Dulcolax, 모두 전날 복용",
    ar: "MiraLAX + magnesium citrate + Dulcolax، جميعها تُؤخذ في اليوم السابق",
  },
  summary: {
    en: "Step-by-step MiraLAX colonoscopy prep from Westchase Gastroenterology: clear liquids all day, with magnesium citrate, MiraLAX and Dulcolax on a timed schedule the day before.",
    es: "Preparación MiraLAX para colonoscopia de Westchase Gastroenterology: líquidos claros todo el día, con citrato de magnesio, MiraLAX y Dulcolax en un horario programado el día anterior.",
    vi: "Chuẩn bị nội soi đại tràng MiraLAX từng bước từ Westchase Gastroenterology: dùng chất lỏng trong cả ngày, với magnesium citrate, MiraLAX và Dulcolax theo lịch giờ vào ngày hôm trước.",
    ko: "Westchase Gastroenterology의 MiraLAX 대장내시경 준비 안내: 하루 종일 맑은 액체를 섭취하고, 전날 magnesium citrate, MiraLAX, Dulcolax를 시간표에 맞춰 복용합니다.",
    ar: "تعليمات تحضير تنظير القولون بـ MiraLAX من Westchase Gastroenterology: سوائل صافية طوال اليوم، مع magnesium citrate وMiraLAX وDulcolax وفق جدول زمني في اليوم السابق.",
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
    vi: [
      ...standardFront(VI, { fiber: true }),
      ...miralaxDayBeforeVi,
      ...avoidAndLiquids(VI),
    ],
    ko: [
      ...standardFront(KO, { fiber: true }),
      ...miralaxDayBeforeKo,
      ...avoidAndLiquids(KO),
    ],
    ar: [
      ...standardFront(AR, { fiber: true }),
      ...miralaxDayBeforeAr,
      ...avoidAndLiquids(AR),
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

const miralaxSplitDayBeforeVi: PrepSection[] = [
  {
    heading: VI.dayBeforeHeading,
    blocks: [
      { kind: "p", text: VI.noSolids },
      { kind: "p", text: VI.drinkHourly("MiraLAX") },
      { kind: "p", text: purchaseVi },
      {
        kind: "list",
        style: "steps",
        items: [
          mixStepVi,
          "Lúc **2:00 pm**, uống hai viên Dulcolax bằng đường uống.",
          "Lúc **4:00 pm**, uống chai Magnesium Citrate 10 ounce.",
          "Lúc **6:00 pm**, bắt đầu uống một ly 8 ounce dung dịch MiraLAX mỗi 15 phút cho đến khi uống **một nửa chai**.",
          "Uống **nửa còn lại** của dung dịch MiraLAX vào ___ lúc ___",
          "Sau khi hoàn tất bước 5, uống hai viên Dulcolax bằng đường uống.",
        ],
      },
      { kind: "p", text: VI.hydrate("MiraLAX") },
    ],
  },
];

const miralaxSplitDayBeforeKo: PrepSection[] = [
  {
    heading: KO.dayBeforeHeading,
    blocks: [
      { kind: "p", text: KO.noSolids },
      { kind: "p", text: KO.drinkHourly("MiraLAX") },
      { kind: "p", text: purchaseKo },
      {
        kind: "list",
        style: "steps",
        items: [
          mixStepKo,
          "**2:00 pm**에 Dulcolax 정제 2정을 경구로 복용하십시오.",
          "**4:00 pm**에 Magnesium Citrate 10온스 병을 마시십시오.",
          "**6:00 pm**부터 MiraLAX 준비액 8온스 한 잔을 15분마다 마시기 시작하여 **병의 절반**까지 복용하십시오.",
          "남은 MiraLAX 준비액의 **나머지 절반**은 ___의 ___에 복용하십시오.",
          "5단계를 마친 후 Dulcolax 정제 2정을 경구로 복용하십시오.",
        ],
      },
      { kind: "p", text: KO.hydrate("MiraLAX") },
    ],
  },
];

const miralaxSplitDayBeforeAr: PrepSection[] = [
  {
    heading: AR.dayBeforeHeading,
    blocks: [
      { kind: "p", text: AR.noSolids },
      { kind: "p", text: AR.drinkHourly("MiraLAX") },
      { kind: "p", text: purchaseAr },
      {
        kind: "list",
        style: "steps",
        items: [
          mixStepAr,
          "في الساعة **2:00 pm**، تناول قرصي Dulcolax عن طريق الفم.",
          "في الساعة **4:00 pm**، اشرب زجاجة Magnesium Citrate سعة 10 أونصات.",
          "في الساعة **6:00 pm**، ابدأ بشرب كوب واحد سعة 8 أونصات من تحضير MiraLAX كل 15 دقيقة حتى تنهي **نصف الزجاجة**.",
          "تناول **النصف الثاني** المتبقي من تحضير MiraLAX في ___ عند ___",
          "بعد إكمال الخطوة 5، تناول قرصي Dulcolax عن طريق الفم.",
        ],
      },
      { kind: "p", text: AR.hydrate("MiraLAX") },
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
    vi: "Chuẩn bị nội soi đại tràng liều chia đôi (MiraLAX)",
    ko: "대장내시경 분할 복용 준비 (MiraLAX)",
    ar: "تحضير تنظير القولون بجرعة مقسمة (MiraLAX)",
  },
  regimen: {
    en: "MiraLAX + magnesium citrate: half the evening before, half at your scheduled time",
    es: "MiraLAX + citrato de magnesio: mitad la noche anterior, mitad a su hora programada",
    vi: "MiraLAX + magnesium citrate: một nửa buổi tối hôm trước, một nửa vào giờ đã hẹn",
    ko: "MiraLAX + magnesium citrate: 전날 저녁 절반, 예약된 시간에 절반",
    ar: "MiraLAX + magnesium citrate: نصف في مساء اليوم السابق، ونصف في وقتك المحدد",
  },
  summary: {
    en: "Step-by-step split-dose MiraLAX colonoscopy prep from Westchase Gastroenterology: half of the prep the evening before, the second half at the time our office schedules for you.",
    es: "Preparación MiraLAX en dosis dividida para colonoscopia de Westchase Gastroenterology: la mitad de la preparación la noche anterior y la segunda mitad a la hora que la oficina le programe.",
    vi: "Chuẩn bị nội soi đại tràng MiraLAX liều chia đôi từng bước từ Westchase Gastroenterology: một nửa thuốc chuẩn bị vào buổi tối hôm trước, nửa còn lại vào thời gian văn phòng của chúng tôi hẹn cho quý vị.",
    ko: "Westchase Gastroenterology의 MiraLAX 분할 복용 대장내시경 준비 안내: 준비액의 절반은 전날 저녁에, 나머지 절반은 병원에서 안내한 시간에 복용합니다.",
    ar: "تعليمات تحضير تنظير القولون بـ MiraLAX بجرعة مقسمة من Westchase Gastroenterology: نصف التحضير في مساء اليوم السابق، والنصف الثاني في الوقت الذي يحدده لك مكتبنا.",
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
    vi: [
      ...standardFront(VI, { fiber: true }),
      ...miralaxSplitDayBeforeVi,
      ...avoidAndLiquids(VI),
    ],
    ko: [
      ...standardFront(KO, { fiber: true }),
      ...miralaxSplitDayBeforeKo,
      ...avoidAndLiquids(KO),
    ],
    ar: [
      ...standardFront(AR, { fiber: true }),
      ...miralaxSplitDayBeforeAr,
      ...avoidAndLiquids(AR),
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

const VI_G: Flavor = {
  ...VI,
  anticoagulants:
    "**Nếu quý vị dùng thuốc chống đông hoặc thuốc kháng kết tập tiểu cầu (Coumadin, Warfarin, Plavix, Clopidogrel, Effient, Xarelto, Eliquis, Brilinta, v.v.), xin liên hệ bác sĩ kê thuốc cho quý vị để được chấp thuận và hướng dẫn thêm.**",
  nsaids:
    "**Bảy (7) ngày trước, ngừng:** ibuprofen, Celebrex, Naproxen, Mobic, meloxicam, Omega 3, dầu gan cá, Vitamin E và viên tỏi.",
  dietPills:
    "**Ngừng Phentermine (thuốc giảm cân) 14 ngày trước.**",
  glp1:
    "**Ngừng semaglutide (Wegovy, Ozempic, Rybelsus), dulaglutide (Trulicity), lixisenatide (Adlyxin), exenatide (Bydureon, Byetta), liraglutide (Victoza, Saxenda) và Mounjaro (tirzepatide).**",
  fiber:
    "**Giảm ăn chất xơ 3 ngày trước.** Ví dụ: không ăn các loại quả hạch, các loại hạt hoặc bắp rang.",
  followUp:
    "**Lưu ý:** nếu quý vị không có lịch hẹn tái khám sau thủ thuật, xin gọi văn phòng của chúng tôi. Xin nhớ rằng kết quả không được thông báo qua điện thoại. **Không có ngoại lệ.**",
  hydrate: (prep: string) =>
    `**Xin quý vị giữ cho cơ thể đủ nước trước, trong và sau khi hoàn tất thuốc chuẩn bị ruột ${prep}.** Tuy nhiên, xin nhớ rằng quý vị phải ngừng uống mọi chất lỏng 4 giờ trước thủ thuật.`,
  avoidItems: [
    "**Bất kỳ thức ăn có màu đỏ, xanh dương hoặc tím**",
    "**Sữa, nước ép trái cây, sherbet, sữa lắc**",
    "**Bất kỳ thức ăn đặc nào**",
  ],
};

const KO_G: Flavor = {
  ...KO,
  anticoagulants:
    "**항응고제 또는 항혈소판제(Coumadin, Warfarin, Plavix, Clopidogrel, Effient, Xarelto, Eliquis, Brilinta 등)를 복용하시는 경우, 해당 약을 처방한 의사에게 연락하여 승인 및 추가 지침을 받으십시오.**",
  nsaids:
    "**시술 7일 전부터 다음 약을 중단하십시오:** ibuprofen, Celebrex, Naproxen, Mobic, meloxicam, Omega 3, 생선 간유, Vitamin E, 마늘 정제.",
  dietPills:
    "**Phentermine(체중 감량 약)은 14일 전에 중단하십시오.**",
  glp1:
    "**semaglutide (Wegovy, Ozempic, Rybelsus), dulaglutide (Trulicity), lixisenatide (Adlyxin), exenatide (Bydureon, Byetta), liraglutide (Victoza, Saxenda) 및 Mounjaro (tirzepatide)는 중단하십시오.**",
  fiber:
    "**시술 3일 전부터 섬유질 섭취를 줄이십시오.** 예: 견과류, 씨앗류, 팝콘은 드시지 마십시오.",
  followUp:
    "**참고:** 시술 후 추적 진료 예약이 없다면 저희 사무실로 전화하십시오. 결과는 전화로 안내되지 않습니다. **예외는 없습니다.**",
  hydrate: (prep: string) =>
    `**${prep} 장 정결제를 복용하기 전과 복용하는 동안, 그리고 복용을 마친 후에도 수분을 충분히 유지하십시오.** 다만 시술 4시간 전부터는 모든 액체 섭취를 중단해야 합니다.`,
  avoidItems: [
    "**빨간색, 파란색 또는 보라색 음식**",
    "**유제품, 과일 주스, 셔벗, 밀크셰이크**",
    "**모든 고형 음식**",
  ],
};

const AR_G: Flavor = {
  ...AR,
  anticoagulants:
    "**إذا كنت تتناول مضادات التخثر أو الأدوية المضادة للصفائح (Coumadin, Warfarin, Plavix, Clopidogrel, Effient, Xarelto, Eliquis, Brilinta, إلخ)، يُرجى التواصل مع الطبيب الذي وصفها لك للحصول على الموافقة والتعليمات الإضافية.**",
  nsaids:
    "**قبل 7 أيام، توقف عن تناول:** ibuprofen وCelebrex وNaproxen وMobic وmeloxicam وOmega 3 وزيت كبد السمك وVitamin E وأقراص الثوم.",
  dietPills:
    "**توقف عن Phentermine (دواء إنقاص الوزن) قبل 14 يومًا.**",
  glp1:
    "**توقف عن semaglutide (Wegovy, Ozempic, Rybelsus) وdulaglutide (Trulicity) وlixisenatide (Adlyxin) وexenatide (Bydureon, Byetta) وliraglutide (Victoza, Saxenda) وMounjaro (tirzepatide).**",
  fiber:
    "**قلّل تناول الألياف قبل 3 أيام.** على سبيل المثال: لا تتناول المكسرات أو البذور أو الفشار.",
  followUp:
    "**ملاحظة:** إذا لم يكن لديك موعد متابعة بعد الإجراء، فاتصل بمكتبنا. تذكّر أن النتائج لا تُعطى عبر الهاتف. **لا استثناءات.**",
  hydrate: (prep: string) =>
    `**يُرجى الحفاظ على ترطيب جسمك جيدًا قبل وأثناء وبعد إكمال تحضير الأمعاء بـ ${prep}.** ومع ذلك، تذكّر أنه يجب التوقف عن تناول جميع السوائل قبل الإجراء بـ 4 ساعات.`,
  avoidItems: [
    "**أي طعام باللون الأحمر أو الأزرق أو الأرجواني**",
    "**منتجات الألبان، عصائر الفاكهة، sherbets، milkshakes**",
    "**أي طعام صلب**",
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

const golytelyLiquidsVi = [
  "Nước lọc",
  "Gatorade (không màu đỏ, xanh dương hoặc tím)",
  "Nước ép táo hoặc nho loại trong (không có bã)",
  "Ginger ale hoặc Sprite (đồ uống không cồn)",
  "Cà phê đen (không sản phẩm từ sữa)",
  "Nước dùng hoặc consommé gà, bò hoặc rau củ (không có miếng đặc) — phải trong",
  "Thạch Jello không có miếng đặc (không màu đỏ, xanh dương hoặc tím)",
  "Cà phê chỉ với đường (không sữa hoặc sản phẩm thay thế sữa)",
];

const golytelyLiquidsKo = [
  "물",
  "Gatorade (빨간색, 파란색, 보라색 제외)",
  "맑은 사과 주스 또는 포도 주스 (과육 없음)",
  "Ginger ale 또는 Sprite (무알코올 음료)",
  "블랙커피 (유제품 제외)",
  "닭고기, 소고기 또는 채소 맑은 국물/콩소메 (건더기 없음) — 반드시 맑아야 합니다",
  "고형물이 없는 Jello (빨간색, 파란색, 보라색 제외)",
  "설탕만 넣은 커피 (우유 또는 유제품 대체품 제외)",
];

const golytelyLiquidsAr = [
  "الماء",
  "Gatorade (ليس الأحمر أو الأزرق أو الأرجواني)",
  "عصير تفاح أو عنب صافي (بدون لُب)",
  "Ginger ale أو Sprite (مشروبات غير كحولية)",
  "قهوة سوداء (بدون منتجات ألبان)",
  "مرق أو consommé من الدجاج أو اللحم البقري أو الخضار (بدون قطع صلبة) — يجب أن يكون صافيًا",
  "Jello بدون قطع صلبة (ليس أحمر أو أزرق أو أرجواني)",
  "قهوة مع السكر فقط (بدون الحليب أو بدائل الألبان)",
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

const golytelyDayBeforeVi: PrepSection[] = [
  {
    heading: VI.dayBeforeHeading,
    blocks: [
      { kind: "p", text: VI.noSolids },
      { kind: "p", text: VI.drinkHourly("Golytely") },
      {
        kind: "list",
        style: "steps",
        items: [
          "Vào buổi sáng của ngày hôm trước, thêm nước vào bình Golytely đến vạch chỉ định.",
          "Lúc **3:00 pm hoặc 6:00 pm**, bắt đầu uống 8 ounce Golytely mỗi 15 phút cho đến khi uống hết toàn bộ.",
          "Một giờ sau khi uống xong dung dịch Golytely, uống 2 viên Dulcolax 5 mg (Bisacodyl) — có bán không cần toa.",
        ],
      },
      { kind: "p", text: VI_G.hydrate("Golytely") },
    ],
  },
  {
    heading: VI.avoidHeading,
    blocks: [{ kind: "list", style: "avoid", items: VI_G.avoidItems }],
  },
  {
    heading: VI.liquidsHeading,
    blocks: [{ kind: "list", style: "check", items: golytelyLiquidsVi }],
  },
];

const golytelyDayBeforeKo: PrepSection[] = [
  {
    heading: KO.dayBeforeHeading,
    blocks: [
      { kind: "p", text: KO.noSolids },
      { kind: "p", text: KO.drinkHourly("Golytely") },
      {
        kind: "list",
        style: "steps",
        items: [
          "전날 아침에 Golytely 용기에 표시선까지 물을 채우십시오.",
          "**3:00 pm 또는 6:00 pm**에 15분마다 8온스의 Golytely를 마시기 시작하여 내용물을 모두 복용하십시오.",
          "Golytely 용액을 모두 마신 1시간 후 Dulcolax 5 mg (Bisacodyl) 2정을 복용하십시오 — 처방전 없이 구입할 수 있습니다.",
        ],
      },
      { kind: "p", text: KO_G.hydrate("Golytely") },
    ],
  },
  {
    heading: KO.avoidHeading,
    blocks: [{ kind: "list", style: "avoid", items: KO_G.avoidItems }],
  },
  {
    heading: KO.liquidsHeading,
    blocks: [{ kind: "list", style: "check", items: golytelyLiquidsKo }],
  },
];

const golytelyDayBeforeAr: PrepSection[] = [
  {
    heading: AR.dayBeforeHeading,
    blocks: [
      { kind: "p", text: AR.noSolids },
      { kind: "p", text: AR.drinkHourly("Golytely") },
      {
        kind: "list",
        style: "steps",
        items: [
          "في صباح اليوم السابق، أضف الماء إلى عبوة Golytely حتى الخط المحدد.",
          "في **3:00 pm أو 6:00 pm**، ابدأ بشرب 8 أونصات من Golytely كل 15 دقيقة حتى تنتهي من كامل المحتوى.",
          "بعد ساعة واحدة من إنهاء محلول Golytely، تناول قرصين من Dulcolax 5 mg (Bisacodyl) — متوفر بدون وصفة طبية.",
        ],
      },
      { kind: "p", text: AR_G.hydrate("Golytely") },
    ],
  },
  {
    heading: AR.avoidHeading,
    blocks: [{ kind: "list", style: "avoid", items: AR_G.avoidItems }],
  },
  {
    heading: AR.liquidsHeading,
    blocks: [{ kind: "list", style: "check", items: golytelyLiquidsAr }],
  },
];

const golytely: PrepDoc = {
  slug: "golytely",
  docId: "prep-golytely",
  group: "colonoscopy",
  title: {
    en: "Golytely Prep",
    es: "Preparación Golytely",
    vi: "Chuẩn bị Golytely",
    ko: "Golytely 준비",
    ar: "تحضير Golytely",
  },
  regimen: {
    en: "One full Golytely container, finished the evening before",
    es: "Un contenedor completo de Golytely, terminado la noche anterior",
    vi: "Một bình Golytely đầy đủ, hoàn tất vào buổi tối hôm trước",
    ko: "Golytely 한 통 전체를 전날 저녁에 완료",
    ar: "عبوة Golytely كاملة تُستكمل في مساء اليوم السابق",
  },
  summary: {
    en: "Step-by-step Golytely colonoscopy prep from Westchase Gastroenterology: clear liquids all day the day before, with the full Golytely solution finished that evening.",
    es: "Preparación Golytely para colonoscopia de Westchase Gastroenterology: líquidos claros todo el día anterior, terminando toda la solución de Golytely esa noche.",
    vi: "Chuẩn bị nội soi đại tràng Golytely từng bước từ Westchase Gastroenterology: dùng chất lỏng trong suốt ngày hôm trước, với toàn bộ dung dịch Golytely được uống xong vào tối hôm đó.",
    ko: "Westchase Gastroenterology의 Golytely 대장내시경 준비 안내: 전날 하루 종일 맑은 액체를 섭취하고, 그날 저녁까지 Golytely 용액 전체를 복용 완료합니다.",
    ar: "تعليمات تحضير تنظير القولون بـ Golytely من Westchase Gastroenterology: سوائل صافية طوال اليوم السابق، مع إنهاء محلول Golytely كاملًا في ذلك المساء.",
  },
  sourcePages: "17–18",
  sourceLangs: ["es"],
  sections: {
    en: [...standardFront(EN_G, { fiber: true }), ...golytelyDayBeforeEn],
    es: [...standardFront(ES_O, { fiber: true }), ...golytelyDayBeforeEs],
    vi: [...standardFront(VI_G, { fiber: true }), ...golytelyDayBeforeVi],
    ko: [...standardFront(KO_G, { fiber: true }), ...golytelyDayBeforeKo],
    ar: [...standardFront(AR_G, { fiber: true }), ...golytelyDayBeforeAr],
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

const golytelySplitStepsVi = [
  "Lúc 10:00 am, đổ nước vào bình bột nhuận tràng Golytely. Lắc kỹ cho đến khi bột tan hết; để lạnh trong tủ lạnh.",
  "Bắt đầu lúc **4:00 pm**, uống một ly 8 ounce mỗi mười lăm (15) phút cho đến khi uống **một nửa**. Cố gắng uống trọn một ly mỗi lần thay vì nhấp từng ngụm.",
  "**Một giờ** sau khi hoàn tất **bước 4**, uống hai (2) viên Dulcolax (Bisacodyl) 5 mg bằng đường uống.",
  "Vào ___ lúc ___, **uống hết nửa còn lại** của dung dịch Golytely.",
];

const golytelySplitStepsKo = [
  "오전 10:00에 Golytely 완하제 분말 용기에 물을 채우십시오. 분말이 녹을 때까지 잘 흔든 뒤 냉장고에 넣어 차게 보관하십시오.",
  "**4:00 pm**부터 15분마다 8온스 한 잔씩 마셔 **절반**을 복용하십시오. 조금씩 나눠 마시기보다 한 번에 한 잔씩 마시도록 하십시오.",
  "**4단계**를 마친 **1시간 후**, Dulcolax (Bisacodyl) 5 mg 2정을 경구로 복용하십시오.",
  "___의 ___에 Golytely 준비액의 **남은 절반을 모두 복용하십시오**.",
];

const golytelySplitStepsAr = [
  "في الساعة 10:00 am، املأ عبوة مسحوق Golytely الملين بالماء. رجّها جيدًا حتى يذوب المسحوق، ثم ضعها في الثلاجة لتبرد.",
  "ابتداءً من **4:00 pm**، اشرب كوبًا سعة 8 أونصات كل خمس عشرة (15) دقيقة حتى تنتهي من **النصف**. حاول شرب كوب كامل كل مرة بدل الرشفات الصغيرة.",
  "بعد **ساعة واحدة** من إكمال **الخطوة 4**، تناول قرصين (2) من Dulcolax (Bisacodyl) عيار 5 mg عن طريق الفم.",
  "في ___ عند ___، **أكمِل النصف الثاني** من تحضير Golytely.",
];

const golytelySplit: PrepDoc = {
  slug: "golytely-split-dose",
  docId: "prep-golytely-split-dose",
  group: "colonoscopy",
  title: {
    en: "Golytely Split-Dose Prep",
    es: "Preparación Golytely en dosis dividida",
    vi: "Chuẩn bị Golytely liều chia đôi",
    ko: "Golytely 분할 복용 준비",
    ar: "تحضير Golytely بجرعتين منفصلتين",
  },
  regimen: {
    en: "Golytely: half the evening before, half at your scheduled time",
    es: "Golytely: mitad la noche anterior, mitad a su hora programada",
    vi: "Golytely: một nửa buổi tối hôm trước, một nửa vào giờ đã hẹn",
    ko: "Golytely: 전날 저녁 절반, 예약된 시간에 절반",
    ar: "Golytely: نصف في مساء اليوم السابق، ونصف في وقتك المحدد",
  },
  summary: {
    en: "Step-by-step split-dose Golytely colonoscopy prep from Westchase Gastroenterology: half of the solution the evening before, the second half at the time our office schedules for you.",
    es: "Preparación Golytely en dosis dividida para colonoscopia de Westchase Gastroenterology: la mitad de la solución la noche anterior y la segunda mitad a la hora que la oficina le programe.",
    vi: "Chuẩn bị nội soi đại tràng Golytely liều chia đôi từng bước từ Westchase Gastroenterology: một nửa dung dịch vào buổi tối hôm trước, nửa còn lại vào thời gian văn phòng của chúng tôi hẹn cho quý vị.",
    ko: "Westchase Gastroenterology의 Golytely 분할 복용 대장내시경 준비 안내: 용액의 절반은 전날 저녁에, 나머지 절반은 병원에서 안내한 시간에 복용합니다.",
    ar: "تعليمات تحضير تنظير القولون بـ Golytely بجرعة مقسمة من Westchase Gastroenterology: نصف المحلول في مساء اليوم السابق، والنصف الثاني في الوقت الذي يحدده لك مكتبنا.",
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
    vi: [
      ...standardFront(VI, { fiber: true }),
      {
        heading: VI.dayBeforeHeading,
        blocks: [
          { kind: "p", text: VI.noSolids },
          { kind: "p", text: VI.drinkHourly("Golytely") },
          { kind: "list", style: "steps", items: golytelySplitStepsVi },
          { kind: "p", text: VI.hydrate("Golytely") },
        ],
      },
      ...avoidAndLiquids(VI),
    ],
    ko: [
      ...standardFront(KO, { fiber: true }),
      {
        heading: KO.dayBeforeHeading,
        blocks: [
          { kind: "p", text: KO.noSolids },
          { kind: "p", text: KO.drinkHourly("Golytely") },
          { kind: "list", style: "steps", items: golytelySplitStepsKo },
          { kind: "p", text: KO.hydrate("Golytely") },
        ],
      },
      ...avoidAndLiquids(KO),
    ],
    ar: [
      ...standardFront(AR, { fiber: true }),
      {
        heading: AR.dayBeforeHeading,
        blocks: [
          { kind: "p", text: AR.noSolids },
          { kind: "p", text: AR.drinkHourly("Golytely") },
          { kind: "list", style: "steps", items: golytelySplitStepsAr },
          { kind: "p", text: AR.hydrate("Golytely") },
        ],
      },
      ...avoidAndLiquids(AR),
    ],
  },
};

export const miralaxGolytelyPreps: PrepDoc[] = [
  miralax,
  miralaxSplit,
  golytely,
  golytelySplit,
];
