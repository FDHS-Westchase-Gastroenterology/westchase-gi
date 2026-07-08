// Upper-endoscopy preps: EGD, Bravo pH study, and Halo ablation.
// The EGD sheet exists in both languages in the practice's scan (EN p. 25,
// ES p. 24) — each locale renders its own original, including the Spanish
// sheet's extra fiber reminder (genuine divergence, reproduced as-is).
// Bravo and Halo exist in English only; Spanish bodies are translations.
// VI/KO/AR bodies mirror the EN tree and are machine translations
// (2026-07-08) pending native-speaker verification by clinic staff.

import type { PrepDoc, PrepSection } from "./types";
import { EN, ES_T, ES_O, VI, KO, AR } from "./common";
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

const egdFrontVi: PrepSection[] = [
  {
    blocks: [
      { kind: "p", text: VI.readCarefully },
      { kind: "p", text: "**Ngày trước ngày làm thủ thuật của quý vị:** ___" },
      {
        kind: "note",
        text: [
          "**Không ăn thức ăn đặc sau bảy (7) giờ tối.**",
          "**Không uống bất kỳ chất lỏng nào sau nửa đêm (12 giờ đêm).**",
        ],
      },
      { kind: "p", text: VI.appointmentLine },
      { kind: "note", text: [VI.dayOfNpo] },
    ],
  },
];

const egdFrontKo: PrepSection[] = [
  {
    blocks: [
      { kind: "p", text: KO.readCarefully },
      { kind: "p", text: "**시술 전날:** ___" },
      {
        kind: "note",
        text: [
          "**오후 7시 이후에는 고형 음식을 드시지 마십시오.**",
          "**자정(밤 12시) 이후에는 어떤 액체도 마시지 마십시오.**",
        ],
      },
      { kind: "p", text: KO.appointmentLine },
      { kind: "note", text: [KO.dayOfNpo] },
    ],
  },
];

const egdFrontAr: PrepSection[] = [
  {
    blocks: [
      { kind: "p", text: AR.readCarefully },
      { kind: "p", text: "**اليوم السابق لإجرائك:** ___" },
      {
        kind: "note",
        text: [
          "**لا تأكل أطعمة صلبة بعد الساعة السابعة (7) مساءً.**",
          "**لا تشرب أي سوائل بعد منتصف الليل (الساعة 12 صباحًا).**",
        ],
      },
      { kind: "p", text: AR.appointmentLine },
      { kind: "note", text: [AR.dayOfNpo] },
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
    vi: "Chuẩn bị cho EGD (nội soi đường tiêu hóa trên)",
    ko: "EGD(상부 내시경) 준비",
    ar: "التحضير لتنظير EGD (التنظير العلوي)",
  },
  regimen: {
    en: "No solid food after 7 PM the night before; no liquids after midnight",
    es: "Sin alimentos sólidos después de las 7 PM la noche anterior; sin líquidos después de la medianoche",
    vi: "Không ăn thức ăn đặc sau 7 giờ tối đêm hôm trước; không uống chất lỏng sau nửa đêm",
    ko: "전날 밤 오후 7시 이후 고형 음식 금지; 자정 이후 액체 금지",
    ar: "لا أطعمة صلبة بعد الساعة 7 مساءً في الليلة السابقة؛ ولا سوائل بعد منتصف الليل",
  },
  summary: {
    en: "EGD (upper endoscopy) preparation instructions from Westchase Gastroenterology: when to stop solids and liquids, medication guidance, and what to bring on the day of your procedure.",
    es: "Instrucciones de preparación para EGD (endoscopia superior) de Westchase Gastroenterology: cuándo suspender sólidos y líquidos, guía de medicamentos y qué traer el día de su procedimiento.",
    vi: "Hướng dẫn chuẩn bị cho EGD (nội soi đường tiêu hóa trên) của Westchase Gastroenterology: khi nào ngừng thức ăn đặc và chất lỏng, hướng dẫn về thuốc, và những gì cần mang theo vào ngày làm thủ thuật của quý vị.",
    ko: "Westchase Gastroenterology의 EGD(상부 내시경) 준비 안내: 고형 음식과 액체를 중단할 시점, 약물 관련 안내, 시술 당일 지참물.",
    ar: "تعليمات التحضير لتنظير EGD (التنظير العلوي) من Westchase Gastroenterology: متى تتوقف عن الأطعمة الصلبة والسوائل، وإرشادات الأدوية، وما يجب إحضاره في يوم إجرائك.",
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
    vi: [
      ...egdFrontVi,
      bringSection(VI),
      remindersSection(VI, { fiber: false }),
      followUpSection(VI),
    ],
    ko: [
      ...egdFrontKo,
      bringSection(KO),
      remindersSection(KO, { fiber: false }),
      followUpSection(KO),
    ],
    ar: [
      ...egdFrontAr,
      bringSection(AR),
      remindersSection(AR, { fiber: false }),
      followUpSection(AR),
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

const bravoPriorVi: PrepSection = {
  heading: "Chuẩn bị trước ngày làm thủ thuật của quý vị",
  blocks: [
    {
      kind: "list",
      style: "check",
      items: [
        "**Năm (5) ngày trước ngày làm thủ thuật của quý vị: NGỪNG dùng thuốc ức chế bơm proton (PPI).** Các thuốc PPI là: Omeprazole (Prilosec), Pantoprazole (Protonix), Lansoprazole (Prevacid), Rabeprazole (Aciphex), Zegerid, Nexium và Dexilant.",
        "**Không ăn hoặc uống sau nửa đêm vào đêm trước ngày làm thủ thuật của quý vị.**",
      ],
    },
  ],
};

const bravoPriorKo: PrepSection = {
  heading: "시술 날짜 전 준비 사항",
  blocks: [
    {
      kind: "list",
      style: "check",
      items: [
        "**시술 날짜 다섯(5)일 전: 양성자 펌프 억제제(PPI) 복용을 중단하십시오.** PPI 약물은 다음과 같습니다: Omeprazole (Prilosec), Pantoprazole (Protonix), Lansoprazole (Prevacid), Rabeprazole (Aciphex), Zegerid, Nexium, Dexilant.",
        "**시술 날짜 전날 밤 자정 이후에는 먹거나 마시지 마십시오.**",
      ],
    },
  ],
};

const bravoPriorAr: PrepSection = {
  heading: "التحضيرات قبل موعد إجرائك",
  blocks: [
    {
      kind: "list",
      style: "check",
      items: [
        "**قبل خمسة (5) أيام من موعد إجرائك: توقف عن تناول دواء مثبط مضخة البروتون (PPI).** أدوية PPI هي: Omeprazole (Prilosec)، Pantoprazole (Protonix)، Lansoprazole (Prevacid)، Rabeprazole (Aciphex)، Zegerid، Nexium، وDexilant.",
        "**لا تأكل أو تشرب بعد منتصف الليل في الليلة السابقة لموعد إجرائك.**",
      ],
    },
  ],
};

const bravo: PrepDoc = {
  slug: "bravo",
  docId: "prep-bravo",
  group: "upper",
  title: {
    en: "Bravo Prep",
    es: "Preparación Bravo",
    vi: "Chuẩn bị Bravo",
    ko: "Bravo 준비",
    ar: "التحضير لفحص Bravo",
  },
  regimen: {
    en: "Stop PPI medication 5 days before; nothing to eat or drink after midnight",
    es: "Suspenda su medicamento IBP 5 días antes; nada de comer ni beber después de la medianoche",
    vi: "Ngừng thuốc PPI 5 ngày trước; không ăn hoặc uống gì sau nửa đêm",
    ko: "5일 전 PPI 약물 중단; 자정 이후 음식 및 음료 금지",
    ar: "أوقف دواء PPI قبل 5 أيام؛ ولا تأكل أو تشرب شيئًا بعد منتصف الليل",
  },
  summary: {
    en: "Bravo pH study preparation instructions from Westchase Gastroenterology: stop PPI medication five days before, fast after midnight, and review the medication guidance before your procedure.",
    es: "Instrucciones de preparación para el estudio Bravo de Westchase Gastroenterology: suspenda su medicamento IBP cinco días antes, ayune después de la medianoche y revise la guía de medicamentos antes de su procedimiento.",
    vi: "Hướng dẫn chuẩn bị cho xét nghiệm pH Bravo của Westchase Gastroenterology: ngừng thuốc PPI năm ngày trước, nhịn ăn uống sau nửa đêm và xem lại hướng dẫn về thuốc trước khi làm thủ thuật của quý vị.",
    ko: "Westchase Gastroenterology의 Bravo pH 검사 준비 안내: 시술 5일 전 PPI 약물 중단, 자정 이후 금식, 시술 전 약물 안내 확인.",
    ar: "تعليمات التحضير لدراسة الحموضة Bravo من Westchase Gastroenterology: أوقف دواء PPI قبل خمسة أيام، وامتنع عن الطعام والشراب بعد منتصف الليل، وراجع إرشادات الأدوية قبل إجرائك.",
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
    vi: [
      { blocks: [{ kind: "p", text: VI.readCarefully }] },
      bravoPriorVi,
      {
        blocks: [
          { kind: "p", text: VI.appointmentLine },
          { kind: "note", text: [VI.dayOfNpo] },
        ],
      },
      bringSection(VI),
      remindersSection(VI, { fiber: false }),
      followUpSection(VI),
    ],
    ko: [
      { blocks: [{ kind: "p", text: KO.readCarefully }] },
      bravoPriorKo,
      {
        blocks: [
          { kind: "p", text: KO.appointmentLine },
          { kind: "note", text: [KO.dayOfNpo] },
        ],
      },
      bringSection(KO),
      remindersSection(KO, { fiber: false }),
      followUpSection(KO),
    ],
    ar: [
      { blocks: [{ kind: "p", text: AR.readCarefully }] },
      bravoPriorAr,
      {
        blocks: [
          { kind: "p", text: AR.appointmentLine },
          { kind: "note", text: [AR.dayOfNpo] },
        ],
      },
      bringSection(AR),
      remindersSection(AR, { fiber: false }),
      followUpSection(AR),
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

const haloPriorVi: PrepSection = {
  heading: "Chuẩn bị trước ngày làm thủ thuật của quý vị",
  blocks: [
    {
      kind: "list",
      style: "check",
      items: [
        "**Năm (5) ngày trước ngày làm thủ thuật của quý vị: TĂNG thuốc ức chế bơm proton (PPI) lên hai lần mỗi ngày.** Các thuốc PPI là: Omeprazole (Prilosec), Pantoprazole (Protonix), Lansoprazole (Prevacid), Rabeprazole (Aciphex), Zegerid, Nexium và Dexilant.",
        "**Không ăn hoặc uống sau nửa đêm vào đêm trước ngày làm thủ thuật.**",
      ],
    },
  ],
};

const haloPriorKo: PrepSection = {
  heading: "시술 날짜 전 준비 사항",
  blocks: [
    {
      kind: "list",
      style: "check",
      items: [
        "**시술 날짜 다섯(5)일 전: 양성자 펌프 억제제(PPI) 복용을 하루 두 번으로 늘리십시오.** PPI 약물은 다음과 같습니다: Omeprazole (Prilosec), Pantoprazole (Protonix), Lansoprazole (Prevacid), Rabeprazole (Aciphex), Zegerid, Nexium, Dexilant.",
        "**시술 날짜 전날 밤 자정 이후에는 먹거나 마시지 마십시오.**",
      ],
    },
  ],
};

const haloPriorAr: PrepSection = {
  heading: "التحضيرات قبل موعد إجرائك",
  blocks: [
    {
      kind: "list",
      style: "check",
      items: [
        "**قبل خمسة (5) أيام من موعد إجرائك: زِد دواء مثبط مضخة البروتون (PPI) إلى مرتين يوميًا.** أدوية PPI هي: Omeprazole (Prilosec)، Pantoprazole (Protonix)، Lansoprazole (Prevacid)، Rabeprazole (Aciphex)، Zegerid، Nexium، وDexilant.",
        "**لا تأكل أو تشرب بعد منتصف الليل في الليلة السابقة لموعد الإجراء.**",
      ],
    },
  ],
};

const halo: PrepDoc = {
  slug: "halo",
  docId: "prep-halo",
  group: "upper",
  title: {
    en: "Halo Prep",
    es: "Preparación Halo",
    vi: "Chuẩn bị Halo",
    ko: "Halo 준비",
    ar: "التحضير لإجراء Halo",
  },
  regimen: {
    en: "Increase PPI medication to twice a day for the 5 days before; nothing after midnight",
    es: "Aumente su medicamento IBP a dos veces al día durante los 5 días previos; nada después de la medianoche",
    vi: "Tăng thuốc PPI lên hai lần mỗi ngày trong 5 ngày trước; không ăn uống gì sau nửa đêm",
    ko: "시술 전 5일 동안 PPI 약물을 하루 두 번으로 증량; 자정 이후 금식",
    ar: "زد دواء PPI إلى مرتين يوميًا خلال الأيام الـ5 السابقة؛ ولا شيء بعد منتصف الليل",
  },
  summary: {
    en: "Halo ablation preparation instructions from Westchase Gastroenterology: double your PPI medication for five days before, fast after midnight, and review the medication guidance.",
    es: "Instrucciones de preparación para la ablación Halo de Westchase Gastroenterology: duplique su medicamento IBP durante cinco días antes, ayune después de la medianoche y revise la guía de medicamentos.",
    vi: "Hướng dẫn chuẩn bị cho thủ thuật đốt Halo của Westchase Gastroenterology: dùng gấp đôi thuốc PPI trong năm ngày trước, nhịn ăn uống sau nửa đêm và xem lại hướng dẫn về thuốc.",
    ko: "Westchase Gastroenterology의 Halo 절제술 준비 안내: 시술 5일 전부터 PPI 약물 두 배 복용, 자정 이후 금식, 약물 안내 확인.",
    ar: "تعليمات التحضير لاستئصال Halo من Westchase Gastroenterology: ضاعِف دواء PPI لمدة خمسة أيام قبل الإجراء، وامتنع عن الطعام والشراب بعد منتصف الليل، وراجع إرشادات الأدوية.",
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
    vi: [
      { blocks: [{ kind: "p", text: VI.readCarefully }] },
      haloPriorVi,
      {
        blocks: [
          { kind: "p", text: VI.appointmentLine },
          { kind: "note", text: [VI.dayOfNpo] },
        ],
      },
      bringSection(VI),
      remindersSection(VI, { fiber: false }),
      followUpSection(VI),
    ],
    ko: [
      { blocks: [{ kind: "p", text: KO.readCarefully }] },
      haloPriorKo,
      {
        blocks: [
          { kind: "p", text: KO.appointmentLine },
          { kind: "note", text: [KO.dayOfNpo] },
        ],
      },
      bringSection(KO),
      remindersSection(KO, { fiber: false }),
      followUpSection(KO),
    ],
    ar: [
      { blocks: [{ kind: "p", text: AR.readCarefully }] },
      haloPriorAr,
      {
        blocks: [
          { kind: "p", text: AR.appointmentLine },
          { kind: "note", text: [AR.dayOfNpo] },
        ],
      },
      bringSection(AR),
      remindersSection(AR, { fiber: false }),
      followUpSection(AR),
    ],
  },
};

export const upperPreps: PrepDoc[] = [egd, bravo, halo];
