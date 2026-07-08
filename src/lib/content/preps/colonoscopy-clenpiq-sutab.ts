// Colonoscopy preps: Clenpiq split-dose, Clenpiq, and Sutab.
// English bodies are the practice's originals (scan pp. 4–9); Spanish
// bodies are faithful translations (no Spanish originals exist for these).
// VI/KO/AR bodies are machine translations of the EN passages (2026-07-08), pending native-speaker verification by clinic staff.

import type { PrepDoc, PrepSection } from "./types";
import { EN, ES_T, VI, KO, AR } from "./common";
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

const clenpiqSplitDayBeforeVi: PrepSection[] = [
  {
    heading: VI.dayBeforeHeading,
    blocks: [
      { kind: "p", text: VI.noSolids },
      { kind: "p", text: VI.drinkHourly("Clenpiq") },
      {
        kind: "p",
        text: "Chuẩn bị Clenpiq gồm hai (2) liệu trình, dùng với loại chất lỏng trong mà quý vị chọn.",
      },
      {
        kind: "schedule",
        columns: [
          {
            title: "Đêm trước ngày làm thủ thuật của quý vị ___",
            items: [
              "**Liệu trình thứ nhất — dùng lúc 4 PM.** A. Dùng theo hướng dẫn.",
              "Uống năm (5) ly chất lỏng trong loại 8 ounce trước liều Clenpiq thứ hai của quý vị.",
            ],
          },
          {
            title: "Buổi sáng ngày làm thủ thuật của quý vị ___",
            items: [
              "**Liệu trình thứ hai — dùng lúc ___ AM.** B. Lặp lại bước A.",
              "Uống ba (3) ly chất lỏng trong loại 8 ounce trước khi đi ngủ.",
            ],
          },
        ],
        footer: "Phải có khoảng thời gian **sáu (6) giờ giữa mỗi liệu trình.**",
      },
      {
        kind: "p",
        text: "**Một giờ** sau khi hoàn tất **liệu trình thứ hai**, dùng hai (2) viên Dulcolax (Bisacodyl) 5 mg bằng đường uống.",
      },
      { kind: "p", text: VI.hydrate("Clenpiq") },
    ],
  },
];

const clenpiqSplitDayBeforeKo: PrepSection[] = [
  {
    heading: KO.dayBeforeHeading,
    blocks: [
      { kind: "p", text: KO.noSolids },
      { kind: "p", text: KO.drinkHourly("Clenpiq") },
      {
        kind: "p",
        text: "Clenpiq 준비는 선택하신 맑은 액체와 함께 복용하는 두 (2) 회 복용 일정으로 구성됩니다.",
      },
      {
        kind: "schedule",
        columns: [
          {
            title: "시술 전날 밤 ___",
            items: [
              "**첫 번째 복용 일정 — 4 PM에 복용하십시오.** A. 안내에 따라 복용하십시오.",
              "두 번째 Clenpiq 복용 전에 맑은 액체 8온스 다섯 (5) 잔을 드십시오.",
            ],
          },
          {
            title: "시술 당일 아침 ___",
            items: [
              "**두 번째 복용 일정 — ___ AM에 복용하십시오.** B. A 단계를 반복하십시오.",
              "취침 전에 맑은 액체 8온스 세 (3) 잔을 드십시오.",
            ],
          },
        ],
        footer: "각 복용 일정 사이에는 반드시 **여섯 (6) 시간 간격**이 있어야 합니다.",
      },
      {
        kind: "p",
        text: "**두 번째 복용 일정**을 마친 **1시간 후**, Dulcolax (Bisacodyl) 5 mg 2정을 경구로 복용하십시오.",
      },
      { kind: "p", text: KO.hydrate("Clenpiq") },
    ],
  },
];

const clenpiqSplitDayBeforeAr: PrepSection[] = [
  {
    heading: AR.dayBeforeHeading,
    blocks: [
      { kind: "p", text: AR.noSolids },
      { kind: "p", text: AR.drinkHourly("Clenpiq") },
      {
        kind: "p",
        text: "يتكوّن تحضير Clenpiq من نظامين (2) يتم تناولهما مع السائل الصافي الذي تختاره.",
      },
      {
        kind: "schedule",
        columns: [
          {
            title: "ليلة ما قبل الإجراء ___",
            items: [
              "**النظام الأول — تناوله الساعة 4 PM.** أ. تناوله حسب التعليمات.",
              "اشرب خمسة (5) أكواب سعة 8 أونصات من السوائل الصافية قبل الجرعة الثانية من Clenpiq.",
            ],
          },
          {
            title: "صباح يوم الإجراء ___",
            items: [
              "**النظام الثاني — تناوله الساعة ___ AM.** ب. كرر الخطوة أ.",
              "اشرب ثلاثة (3) أكواب سعة 8 أونصات من السوائل الصافية قبل وقت النوم.",
            ],
          },
        ],
        footer: "يجب أن يكون هناك فارق زمني قدره **ست (6) ساعات بين كل نظام.**",
      },
      {
        kind: "p",
        text: "بعد **ساعة واحدة** من إكمال **النظام الثاني**، تناول قرصين (2) من Dulcolax (Bisacodyl) عيار 5 mg عن طريق الفم.",
      },
      { kind: "p", text: AR.hydrate("Clenpiq") },
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
    vi: "Chuẩn bị Clenpiq liều chia đôi",
    ko: "Clenpiq 분할 복용 준비",
    ar: "تحضير Clenpiq بجرعة مقسمة",
  },
  regimen: {
    en: "Two Clenpiq doses: 4 PM the day before + the morning of your procedure",
    es: "Dos dosis de Clenpiq: 4 PM el día anterior + la mañana del procedimiento",
    vi: "Hai liều Clenpiq: 4 PM ngày hôm trước + buổi sáng ngày làm thủ thuật",
    ko: "Clenpiq 2회 복용: 전날 4 PM + 시술 당일 아침",
    ar: "جرعتان من Clenpiq: الساعة 4 PM في اليوم السابق + صباح يوم الإجراء",
  },
  summary: {
    en: "Step-by-step Clenpiq split-dose colonoscopy prep from Westchase Gastroenterology: clear liquids all day, first dose at 4 PM the day before, second dose the morning of your procedure.",
    es: "Preparación Clenpiq en dosis dividida para colonoscopia de Westchase Gastroenterology: líquidos claros todo el día, primera dosis a las 4 PM el día anterior y segunda dosis la mañana del procedimiento.",
    vi: "Chuẩn bị nội soi đại tràng Clenpiq liều chia đôi từng bước từ Westchase Gastroenterology: dùng chất lỏng trong cả ngày, liều đầu lúc 4 PM ngày hôm trước, liều thứ hai vào buổi sáng ngày làm thủ thuật của quý vị.",
    ko: "Westchase Gastroenterology의 Clenpiq 분할 복용 대장내시경 준비 안내: 하루 종일 맑은 액체를 섭취하고, 첫 번째 복용은 전날 4 PM, 두 번째 복용은 시술 당일 아침에 진행합니다.",
    ar: "تعليمات تحضير تنظير القولون بـ Clenpiq بجرعتين من Westchase Gastroenterology: سوائل صافية طوال اليوم، الجرعة الأولى الساعة 4 PM في اليوم السابق، والجرعة الثانية صباح يوم الإجراء.",
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
    vi: [
      ...standardFront(VI, { fiber: true }),
      ...clenpiqSplitDayBeforeVi,
      ...avoidAndLiquids(VI),
    ],
    ko: [
      ...standardFront(KO, { fiber: true }),
      ...clenpiqSplitDayBeforeKo,
      ...avoidAndLiquids(KO),
    ],
    ar: [
      ...standardFront(AR, { fiber: true }),
      ...clenpiqSplitDayBeforeAr,
      ...avoidAndLiquids(AR),
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

const clenpiqDayBeforeVi: PrepSection[] = [
  {
    heading: VI.dayBeforeHeading,
    blocks: [
      { kind: "p", text: VI.noSolids },
      { kind: "p", text: VI.drinkHourly("Clenpiq") },
      {
        kind: "p",
        text: "Chuẩn bị Clenpiq gồm hai (2) liệu trình, dùng với loại chất lỏng trong mà quý vị chọn — cả hai đều vào ngày trước thủ thuật của quý vị.",
      },
      {
        kind: "schedule",
        columns: [
          {
            title: "Liệu trình thứ nhất — dùng lúc 4 PM",
            items: [
              "A. Dùng theo hướng dẫn.",
              "Uống năm (5) ly chất lỏng trong loại 8 ounce trước liều Clenpiq thứ hai của quý vị.",
            ],
          },
          {
            title: "Liệu trình thứ hai — dùng lúc 10 PM",
            items: [
              "B. Lặp lại bước A.",
              "Uống ba (3) ly chất lỏng trong loại 8 ounce trước khi đi ngủ.",
            ],
          },
        ],
        footer: "Phải có khoảng thời gian **sáu (6) giờ giữa mỗi liệu trình.**",
      },
      {
        kind: "p",
        text: "**Một giờ** sau khi hoàn tất **liệu trình thứ hai**, dùng hai (2) viên Dulcolax (Bisacodyl) 5 mg bằng đường uống.",
      },
      { kind: "p", text: VI.hydrate("Clenpiq") },
    ],
  },
];

const clenpiqDayBeforeKo: PrepSection[] = [
  {
    heading: KO.dayBeforeHeading,
    blocks: [
      { kind: "p", text: KO.noSolids },
      { kind: "p", text: KO.drinkHourly("Clenpiq") },
      {
        kind: "p",
        text: "Clenpiq 준비는 선택하신 맑은 액체와 함께 복용하는 두 (2) 회 복용 일정으로 구성되며, 두 번 모두 시술 전날에 진행합니다.",
      },
      {
        kind: "schedule",
        columns: [
          {
            title: "첫 번째 복용 일정 — 4 PM에 복용하십시오",
            items: [
              "A. 안내에 따라 복용하십시오.",
              "두 번째 Clenpiq 복용 전에 맑은 액체 8온스 다섯 (5) 잔을 드십시오.",
            ],
          },
          {
            title: "두 번째 복용 일정 — 10 PM에 복용하십시오",
            items: [
              "B. A 단계를 반복하십시오.",
              "취침 전에 맑은 액체 8온스 세 (3) 잔을 드십시오.",
            ],
          },
        ],
        footer: "각 복용 일정 사이에는 반드시 **여섯 (6) 시간 간격**이 있어야 합니다.",
      },
      {
        kind: "p",
        text: "**두 번째 복용 일정**을 마친 **1시간 후**, Dulcolax (Bisacodyl) 5 mg 2정을 경구로 복용하십시오.",
      },
      { kind: "p", text: KO.hydrate("Clenpiq") },
    ],
  },
];

const clenpiqDayBeforeAr: PrepSection[] = [
  {
    heading: AR.dayBeforeHeading,
    blocks: [
      { kind: "p", text: AR.noSolids },
      { kind: "p", text: AR.drinkHourly("Clenpiq") },
      {
        kind: "p",
        text: "يتكوّن تحضير Clenpiq من نظامين (2) يتم تناولهما مع السائل الصافي الذي تختاره — وكلاهما في اليوم السابق لإجرائك.",
      },
      {
        kind: "schedule",
        columns: [
          {
            title: "النظام الأول — تناوله الساعة 4 PM",
            items: [
              "أ. تناوله حسب التعليمات.",
              "اشرب خمسة (5) أكواب سعة 8 أونصات من السوائل الصافية قبل الجرعة الثانية من Clenpiq.",
            ],
          },
          {
            title: "النظام الثاني — تناوله الساعة 10 PM",
            items: [
              "ب. كرر الخطوة أ.",
              "اشرب ثلاثة (3) أكواب سعة 8 أونصات من السوائل الصافية قبل وقت النوم.",
            ],
          },
        ],
        footer: "يجب أن يكون هناك فارق زمني قدره **ست (6) ساعات بين كل نظام.**",
      },
      {
        kind: "p",
        text: "بعد **ساعة واحدة** من إكمال **النظام الثاني**، تناول قرصين (2) من Dulcolax (Bisacodyl) عيار 5 mg عن طريق الفم.",
      },
      { kind: "p", text: AR.hydrate("Clenpiq") },
    ],
  },
];

const clenpiq: PrepDoc = {
  slug: "clenpiq",
  docId: "prep-clenpiq",
  group: "colonoscopy",
  title: {
    en: "Clenpiq Prep",
    es: "Preparación Clenpiq",
    vi: "Chuẩn bị Clenpiq",
    ko: "Clenpiq 준비",
    ar: "تحضير Clenpiq",
  },
  regimen: {
    en: "Two Clenpiq doses the day before: 4 PM and 10 PM",
    es: "Dos dosis de Clenpiq el día anterior: 4 PM y 10 PM",
    vi: "Hai liều Clenpiq vào ngày hôm trước: 4 PM và 10 PM",
    ko: "전날 Clenpiq 2회 복용: 4 PM 및 10 PM",
    ar: "جرعتان من Clenpiq في اليوم السابق: 4 PM و10 PM",
  },
  summary: {
    en: "Step-by-step Clenpiq colonoscopy prep from Westchase Gastroenterology: clear liquids all day the day before, with Clenpiq doses at 4 PM and 10 PM.",
    es: "Preparación Clenpiq para colonoscopia de Westchase Gastroenterology: líquidos claros todo el día anterior, con dosis de Clenpiq a las 4 PM y a las 10 PM.",
    vi: "Chuẩn bị nội soi đại tràng Clenpiq từng bước từ Westchase Gastroenterology: dùng chất lỏng trong suốt ngày hôm trước, với các liều Clenpiq lúc 4 PM và 10 PM.",
    ko: "Westchase Gastroenterology의 Clenpiq 대장내시경 준비 안내: 전날 하루 종일 맑은 액체를 섭취하고, Clenpiq를 4 PM과 10 PM에 복용합니다.",
    ar: "تعليمات تحضير تنظير القولون بـ Clenpiq من Westchase Gastroenterology: سوائل صافية طوال اليوم السابق، مع جرعتي Clenpiq في 4 PM و10 PM.",
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
    vi: [
      ...standardFront(VI, { fiber: true }),
      ...clenpiqDayBeforeVi,
      ...avoidAndLiquids(VI),
    ],
    ko: [
      ...standardFront(KO, { fiber: true }),
      ...clenpiqDayBeforeKo,
      ...avoidAndLiquids(KO),
    ],
    ar: [
      ...standardFront(AR, { fiber: true }),
      ...clenpiqDayBeforeAr,
      ...avoidAndLiquids(AR),
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

const sutabDayBeforeVi: PrepSection[] = [
  {
    heading: VI.dayBeforeHeading,
    blocks: [
      { kind: "p", text: VI.noSolids },
      { kind: "p", text: VI.drinkHourly("Sutab") },
      { kind: "p", text: "**Chuẩn bị Sutab gồm hai (2) liệu trình.**" },
      {
        kind: "schedule",
        columns: [
          {
            title: "Liệu trình thứ nhất — dùng lúc 2 PM",
            items: [
              "A. Đổ 16 ounce nước vào bình (đến vạch châm đầy). Nuốt từng viên thuốc với một ngụm nước, trong vòng 20 phút.",
              "B. Khoảng 1 giờ sau khi nuốt viên cuối cùng, đổ nước vào bình được cấp đến vạch châm đầy và uống hết toàn bộ trong 30 phút.",
              "C. Khoảng 30 phút sau khi uống xong bình nước thứ hai, đổ nước vào bình được cấp đến vạch châm đầy và uống hết toàn bộ trong 30 phút.",
              "Uống thêm hai (2) bình nước nữa, mỗi bình đổ nước đến vạch 16 ounce, trong một giờ tiếp theo.",
            ],
          },
          {
            title: "Liệu trình thứ hai — dùng lúc 8 PM",
            items: [
              "D. Sau sáu (6) giờ kể từ lần dùng thuốc đầu tiên, đổ 16 ounce nước vào bình (đến vạch châm đầy). Nuốt từng viên thuốc với một ngụm nước, trong vòng 20 phút.",
              "E. Khoảng 1 giờ sau khi nuốt viên cuối cùng, đổ nước vào bình được cấp đến vạch châm đầy và uống hết toàn bộ trong 30 phút.",
              "F. Khoảng 30 phút sau khi uống xong bình nước thứ hai, đổ nước vào bình được cấp đến vạch châm đầy và uống hết toàn bộ trong 30 phút.",
              "Uống thêm hai (2) bình nước nữa, mỗi bình đổ nước đến vạch 16 ounce, trong một giờ tiếp theo.",
            ],
          },
        ],
        footer: "Phải có khoảng thời gian **sáu (6) giờ giữa mỗi liệu trình.**",
      },
      { kind: "p", text: VI.hydrate("Sutab") },
    ],
  },
];

const sutabDayBeforeKo: PrepSection[] = [
  {
    heading: KO.dayBeforeHeading,
    blocks: [
      { kind: "p", text: KO.noSolids },
      { kind: "p", text: KO.drinkHourly("Sutab") },
      { kind: "p", text: "**Sutab 준비는 두 (2) 회 복용 일정으로 구성됩니다.**" },
      {
        kind: "schedule",
        columns: [
          {
            title: "첫 번째 복용 일정 — 2 PM에 복용하십시오",
            items: [
              "A. 용기에 16온스 표시선까지 물을 채우십시오. 20분 이내에 물 한 모금과 함께 각 정제를 삼키십시오.",
              "B. 마지막 정제를 삼킨 약 1시간 후, 제공된 용기를 표시선까지 채운 다음 30분에 걸쳐 전량을 마시십시오.",
              "C. 두 번째 물 용기를 마친 약 30분 후, 제공된 용기를 표시선까지 채운 다음 30분에 걸쳐 전량을 마시십시오.",
              "다음 1시간 동안 16온스 표시선까지 채운 물 용기 두 (2) 개를 추가로 마시십시오.",
            ],
          },
          {
            title: "두 번째 복용 일정 — 8 PM에 복용하십시오",
            items: [
              "D. 첫 번째 복용 후 여섯 (6) 시간이 지나면, 용기에 16온스 표시선까지 물을 채우십시오. 20분 이내에 물 한 모금과 함께 각 정제를 삼키십시오.",
              "E. 마지막 정제를 삼킨 약 1시간 후, 제공된 용기를 표시선까지 채운 다음 30분에 걸쳐 전량을 마시십시오.",
              "F. 두 번째 물 용기를 마친 약 30분 후, 제공된 용기를 표시선까지 채운 다음 30분에 걸쳐 전량을 마시십시오.",
              "다음 1시간 동안 16온스 표시선까지 채운 물 용기 두 (2) 개를 추가로 마시십시오.",
            ],
          },
        ],
        footer: "각 복용 일정 사이에는 반드시 **여섯 (6) 시간 간격**이 있어야 합니다.",
      },
      { kind: "p", text: KO.hydrate("Sutab") },
    ],
  },
];

const sutabDayBeforeAr: PrepSection[] = [
  {
    heading: AR.dayBeforeHeading,
    blocks: [
      { kind: "p", text: AR.noSolids },
      { kind: "p", text: AR.drinkHourly("Sutab") },
      { kind: "p", text: "**يتكوّن تحضير Sutab من نظامين (2).**" },
      {
        kind: "schedule",
        columns: [
          {
            title: "النظام الأول — تناوله الساعة 2 PM",
            items: [
              "أ. املأ الوعاء بالماء حتى خط 16 أونصة. ابتلع كل قرص مع رشفة ماء خلال 20 دقيقة.",
              "ب. بعد حوالي 1 ساعة من ابتلاع آخر قرص، املأ الوعاء المرفق حتى خط التعبئة واشرب الكمية كاملة خلال 30 دقيقة.",
              "ج. بعد حوالي 30 دقيقة من إنهاء الوعاء الثاني من الماء، املأ الوعاء المرفق حتى خط التعبئة واشرب الكمية كاملة خلال 30 دقيقة.",
              "اشرب وعاءين (2) إضافيين مملوءين بالماء حتى خط 16 أونصة خلال الساعة التالية.",
            ],
          },
          {
            title: "النظام الثاني — تناوله الساعة 8 PM",
            items: [
              "د. بعد ست (6) ساعات من الجرعة الأولى، املأ الوعاء بالماء حتى خط 16 أونصة. ابتلع كل قرص مع رشفة ماء خلال 20 دقيقة.",
              "هـ. بعد حوالي 1 ساعة من ابتلاع آخر قرص، املأ الوعاء المرفق حتى خط التعبئة واشرب الكمية كاملة خلال 30 دقيقة.",
              "و. بعد حوالي 30 دقيقة من إنهاء الوعاء الثاني من الماء، املأ الوعاء المرفق حتى خط التعبئة واشرب الكمية كاملة خلال 30 دقيقة.",
              "اشرب وعاءين (2) إضافيين مملوءين بالماء حتى خط 16 أونصة خلال الساعة التالية.",
            ],
          },
        ],
        footer: "يجب أن يكون هناك فارق زمني قدره **ست (6) ساعات بين كل نظام.**",
      },
      { kind: "p", text: AR.hydrate("Sutab") },
    ],
  },
];

const sutab: PrepDoc = {
  slug: "sutab",
  docId: "prep-sutab",
  group: "colonoscopy",
  title: {
    en: "Sutab Prep",
    es: "Preparación Sutab",
    vi: "Chuẩn bị Sutab",
    ko: "Sutab 준비",
    ar: "تحضير Sutab",
  },
  regimen: {
    en: "Two rounds of Sutab tablets the day before: 2 PM and 8 PM, each with water",
    es: "Dos rondas de tabletas Sutab el día anterior: 2 PM y 8 PM, cada una con agua",
    vi: "Hai đợt viên Sutab vào ngày hôm trước: 2 PM và 8 PM, mỗi đợt kèm nước",
    ko: "전날 Sutab 정제 2회 복용: 2 PM 및 8 PM, 각 복용마다 물 동반",
    ar: "دورتان من أقراص Sutab في اليوم السابق: 2 PM و8 PM، وكل دورة مع الماء",
  },
  summary: {
    en: "Step-by-step Sutab (tablet) colonoscopy prep from Westchase Gastroenterology: clear liquids all day the day before, tablet regimens at 2 PM and 8 PM with water.",
    es: "Preparación Sutab (tabletas) para colonoscopia de Westchase Gastroenterology: líquidos claros todo el día anterior, con regímenes de tabletas a las 2 PM y 8 PM acompañados de agua.",
    vi: "Chuẩn bị nội soi đại tràng Sutab (viên nén) từng bước từ Westchase Gastroenterology: dùng chất lỏng trong cả ngày hôm trước, với các liệu trình viên lúc 2 PM và 8 PM kèm nước.",
    ko: "Westchase Gastroenterology의 Sutab(정제) 대장내시경 준비 안내: 전날 하루 종일 맑은 액체를 섭취하고, 2 PM과 8 PM에 물과 함께 정제 복용 일정을 진행합니다.",
    ar: "تعليمات تحضير تنظير القولون بـ Sutab (أقراص) من Westchase Gastroenterology: سوائل صافية طوال اليوم السابق، مع نظامَي الأقراص في 2 PM و8 PM مع الماء.",
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
    vi: [
      ...standardFront(VI, { fiber: true }),
      ...sutabDayBeforeVi,
      ...avoidAndLiquids(VI),
    ],
    ko: [
      ...standardFront(KO, { fiber: true }),
      ...sutabDayBeforeKo,
      ...avoidAndLiquids(KO),
    ],
    ar: [
      ...standardFront(AR, { fiber: true }),
      ...sutabDayBeforeAr,
      ...avoidAndLiquids(AR),
    ],
  },
};

export const clenpiqSutabPreps: PrepDoc[] = [clenpiqSplit, clenpiq, sutab];
