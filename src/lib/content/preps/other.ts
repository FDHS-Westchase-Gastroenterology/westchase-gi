// Sigmoidoscopy prep, Endocapsule study prep, and the anti-reflux diet
// guidelines. The anti-reflux sheet exists in both languages (EN p. 3,
// ES pp. 1–2); sigmoidoscopy (p. 10) and endocapsule (pp. 22–23) are
// English-only originals with faithful Spanish translations.
// VI/KO/AR bodies mirror the EN tree and are machine translations
// (2026-07-08) pending native-speaker verification by clinic staff.

import type { PrepDoc, PrepSection } from "./types";
import { EN, ES_T, VI, KO, AR } from "./common";
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
const sigCompanionVi =
  "**Nếu quý vị chọn dùng thuốc an thần cho thủ thuật này:** quý vị **phải** có một người lớn đi cùng (người thân hoặc bạn bè) để đưa quý vị về nhà sau thủ thuật. Việc sử dụng phương tiện giao thông công cộng — Uber, Lyft, taxi, v.v. — là **không** được phép.";
const sigCompanionKo =
  "**이 시술에서 진정(수면) 처치를 선택하시는 경우:** 시술 후 귀하를 집까지 데려다줄 성인 동반자(가족 또는 친구)가 **반드시** 있어야 합니다. 대중교통 — Uber, Lyft, 택시 등 — 이용은 허용되지 **않습니다**.";
const sigCompanionAr =
  "**إذا اخترت التخدير (التهدئة) لهذا الإجراء:** **يجب** أن يكون معك مرافق بالغ (فرد من العائلة أو صديق) ليأخذك إلى المنزل بعد إجرائك. استخدام وسائل النقل العامة — Uber وLyft وسيارات الأجرة وغيرها — **غير** مسموح به.";

const sigmoidoscopy: PrepDoc = {
  slug: "sigmoidoscopy",
  docId: "prep-sigmoidoscopy",
  group: "sigmoidoscopy",
  title: {
    en: "Sigmoidoscopy Prep",
    es: "Preparación para sigmoidoscopia",
    vi: "Chuẩn bị cho nội soi đại tràng sigma",
    ko: "구불결장경(S상 결장경) 검사 준비",
    ar: "التحضير لتنظير القولون السيني",
  },
  regimen: {
    en: "No prep drink — one Fleet enema two hours before; nothing to eat or drink after midnight",
    es: "Sin bebida de preparación — un enema Fleet dos horas antes; nada de comer ni beber después de la medianoche",
    vi: "Không cần uống thuốc chuẩn bị — một ống thụt Fleet hai giờ trước; không ăn hoặc uống gì sau nửa đêm",
    ko: "장 정결제 음용 없음 — 시술 두 시간 전 Fleet 관장제 한 개; 자정 이후 음식 및 음료 금지",
    ar: "بدون شراب تحضيري — حقنة شرجية واحدة من Fleet قبل ساعتين؛ ولا أكل أو شرب بعد منتصف الليل",
  },
  summary: {
    en: "Sigmoidoscopy preparation instructions from Westchase Gastroenterology: fast after midnight, use one Fleet enema two hours before your procedure, and review the medication guidance.",
    es: "Instrucciones de preparación para sigmoidoscopia de Westchase Gastroenterology: ayune después de la medianoche, aplíquese un enema Fleet dos horas antes del procedimiento y revise la guía de medicamentos.",
    vi: "Hướng dẫn chuẩn bị cho nội soi đại tràng sigma của Westchase Gastroenterology: nhịn ăn uống sau nửa đêm, dùng một ống thụt Fleet hai giờ trước thủ thuật của quý vị và xem lại hướng dẫn về thuốc.",
    ko: "Westchase Gastroenterology의 구불결장경 검사 준비 안내: 자정 이후 금식, 시술 두 시간 전 Fleet 관장제 한 개 사용, 약물 안내 확인.",
    ar: "تعليمات التحضير لتنظير القولون السيني من Westchase Gastroenterology: امتنع عن الطعام والشراب بعد منتصف الليل، واستخدم حقنة شرجية واحدة من Fleet قبل ساعتين من إجرائك، وراجع إرشادات الأدوية.",
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
    vi: [
      {
        blocks: [
          { kind: "p", text: VI.readCarefully },
          { kind: "p", text: "**Ngày trước ngày làm thủ thuật của quý vị:** ___" },
          {
            kind: "note",
            text: [
              "**Không ăn hoặc uống bất kỳ chất lỏng nào sau nửa đêm (12 giờ đêm).**",
            ],
          },
          { kind: "p", text: VI.appointmentLine },
          {
            kind: "note",
            text: [
              "**Hai giờ trước thủ thuật của quý vị, dùng một ống thụt Fleet** — có bán không cần toa tại nhà thuốc địa phương của quý vị.",
            ],
          },
          { kind: "p", text: VI.dayOfNpo },
        ],
      },
      bringSection(VI),
      remindersSection(VI, { fiber: false, companion: sigCompanionVi }),
      followUpSection(VI),
    ],
    ko: [
      {
        blocks: [
          { kind: "p", text: KO.readCarefully },
          { kind: "p", text: "**시술 전날:** ___" },
          {
            kind: "note",
            text: [
              "**자정(밤 12시) 이후에는 먹거나 어떤 액체도 마시지 마십시오.**",
            ],
          },
          { kind: "p", text: KO.appointmentLine },
          {
            kind: "note",
            text: [
              "**시술 두 시간 전에 Fleet 관장제 한 개를 사용하십시오** — 가까운 약국에서 처방전 없이 구입하실 수 있습니다.",
            ],
          },
          { kind: "p", text: KO.dayOfNpo },
        ],
      },
      bringSection(KO),
      remindersSection(KO, { fiber: false, companion: sigCompanionKo }),
      followUpSection(KO),
    ],
    ar: [
      {
        blocks: [
          { kind: "p", text: AR.readCarefully },
          { kind: "p", text: "**اليوم السابق لإجرائك:** ___" },
          {
            kind: "note",
            text: [
              "**لا تأكل أو تشرب أي سوائل بعد منتصف الليل (الساعة 12 صباحًا).**",
            ],
          },
          { kind: "p", text: AR.appointmentLine },
          {
            kind: "note",
            text: [
              "**قبل ساعتين من إجرائك، استخدم حقنة شرجية واحدة من Fleet** — متوفرة دون وصفة طبية في الصيدلية المحلية.",
            ],
          },
          { kind: "p", text: AR.dayOfNpo },
        ],
      },
      bringSection(AR),
      remindersSection(AR, { fiber: false, companion: sigCompanionAr }),
      followUpSection(AR),
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

const endocapsuleVi: PrepSection[] = [
  {
    heading: "Chi tiết cuộc hẹn của quý vị",
    blocks: [
      { kind: "p", text: "**Ngày:** ___ **Giờ:** ___" },
      {
        kind: "p",
        text: "**Địa điểm — văn phòng chính của chúng tôi:** 11912 Sheldon Road, Tampa, FL 33626.",
      },
      {
        kind: "note",
        text: [
          "**Quý vị cần mua một (1) chai Magnesium Citrate, chỉ vị chanh vàng hoặc chanh xanh,** có bán tại nhà thuốc địa phương của quý vị, ở quầy thuốc nhuận tràng.",
        ],
      },
    ],
  },
  {
    heading: "Ngày trước ngày làm xét nghiệm của quý vị",
    blocks: [
      {
        kind: "list",
        style: "bullet",
        items: [
          "**Vui lòng theo chế độ ăn chất lỏng trong suốt vào ngày trước ngày làm xét nghiệm của quý vị.** Bảng dưới đây liệt kê các nhóm thực phẩm được khuyến nghị.",
          "Sau bữa tối bằng chất lỏng trong suốt lúc 7:00 tối, **uống hết cả chai Magnesium Citrate.**",
          "**Không ăn hoặc uống sau 10:00 tối.**",
          "Bất kỳ thuốc thiết yếu nào (**thuốc tim, huyết áp, chống co giật, tiểu đường, v.v.**) nên được uống với một ngụm nước nhỏ, không muộn hơn 6:00 sáng.",
          "Để các cảm biến bám chắc, vui lòng cạo lông vùng bụng nếu cần.",
        ],
      },
    ],
  },
  {
    heading: "Buổi sáng ngày làm xét nghiệm của quý vị",
    blocks: [
      {
        kind: "list",
        style: "bullet",
        items: [
          "**Không ăn hoặc uống.**",
          "Vui lòng mặc quần áo thoải mái, rộng rãi, gồm hai mảnh rời.",
          "Tránh thoa kem dưỡng, phấn hoặc nước hoa lên vùng bụng và ngực.",
          "Vui lòng đến văn phòng Sheldon Road của chúng tôi lúc 8:00 sáng.",
        ],
      },
    ],
  },
  {
    heading: "Sau khi quý vị đã nuốt viên nang",
    blocks: [
      {
        kind: "list",
        style: "bullet",
        items: [
          "**Từ 8:00 sáng đến 12:00 trưa, uống một ly nước 8 ounce mỗi giờ trong 4 giờ** (tổng cộng 4 ly trong 4 giờ).",
          "**Sau 12:00 trưa, quý vị có thể ăn một bữa trưa nhẹ** — 4 giờ sau khi quý vị đã nuốt viên nang.",
        ],
      },
      { kind: "p", text: "**Quan trọng — vui lòng tiếp tục tránh những thứ sau:**" },
      {
        kind: "list",
        style: "avoid",
        items: [
          "Tất cả các sản phẩm từ sữa",
          "Mọi thức ăn và đồ uống có màu đỏ, tím hoặc xanh dương",
          "Thực phẩm có hạt (ví dụ: hạt mè, các loại hạt, cà chua có hạt, v.v.)",
        ],
      },
      {
        kind: "note",
        text: [
          "**Quý vị phải quay lại văn phòng trước 4:00 chiều** để nhân viên của chúng tôi tháo các cảm biến. Vui lòng **không** tự tháo thiết bị.",
        ],
      },
    ],
  },
  {
    heading: "Hướng dẫn chế độ ăn chất lỏng trong suốt",
    blocks: [
      {
        kind: "table",
        head: ["Nhóm thực phẩm", "Được khuyến nghị", "Tránh"],
        rows: [
          ["Sữa và các sản phẩm từ sữa", "Không", "Tất cả"],
          ["Rau củ", "Không", "Tất cả"],
          [
            "Trái cây",
            "Nước ép trái cây không có tép/bã",
            "Nước ép đặc (nectar); tất cả trái cây tươi, đóng hộp và đông lạnh",
          ],
          ["Bánh mì và ngũ cốc", "Không", "Tất cả"],
          ["Thịt hoặc các món thay thế thịt", "Không", "Tất cả"],
          ["Chất béo và dầu", "Không", "Tất cả"],
          [
            "Đồ ngọt và món tráng miệng",
            "Thạch (gelatin), kem đá trái cây, kem que không có bã, kẹo cứng trong suốt",
            "Tất cả các loại khác",
          ],
          [
            "Đồ uống",
            "Chỉ cà phê đen; trà; nước ngọt; nước; thức uống bổ sung không lactose, ít bã nếu được bác sĩ của quý vị chấp thuận",
            "Tất cả các loại khác",
          ],
          [
            "Súp",
            "Nước dùng cô đặc (bouillon), nước hầm trong (consommé), nước dùng không béo",
            "Tất cả các loại khác",
          ],
        ],
      },
    ],
  },
];

const endocapsuleKo: PrepSection[] = [
  {
    heading: "예약 세부 정보",
    blocks: [
      { kind: "p", text: "**날짜:** ___ **시간:** ___" },
      {
        kind: "p",
        text: "**장소 — 본원:** 11912 Sheldon Road, Tampa, FL 33626.",
      },
      {
        kind: "note",
        text: [
          "**Magnesium Citrate(구연산 마그네슘) 한(1) 병을 구입하셔야 하며, 레몬 또는 라임 맛만 가능합니다.** 가까운 약국의 변비약(완하제) 코너에서 구입하실 수 있습니다.",
        ],
      },
    ],
  },
  {
    heading: "검사 전날",
    blocks: [
      {
        kind: "list",
        style: "bullet",
        items: [
          "**검사 전날에는 맑은 액체(투명 유동식) 식이를 따라 주십시오.** 아래 표에 권장 식품군이 나와 있습니다.",
          "오후 7:00에 맑은 액체로 저녁 식사를 하신 후, **Magnesium Citrate 한 병 전체를 마시십시오.**",
          "**오후 10:00 이후에는 먹거나 마시지 마십시오.**",
          "필수 약물(**심장약, 혈압약, 경련(발작)약, 당뇨약 등**)은 늦어도 오전 6:00까지 소량의 물 한 모금과 함께 복용하십시오.",
          "센서가 잘 붙어 있도록, 필요한 경우 복부 부위를 면도해 주십시오.",
        ],
      },
    ],
  },
  {
    heading: "검사 당일 아침",
    blocks: [
      {
        kind: "list",
        style: "bullet",
        items: [
          "**먹거나 마시지 마십시오.**",
          "편안하고 헐렁한 상하 분리형(투피스) 옷을 입고 오십시오.",
          "복부나 가슴 부위에 로션, 파우더, 향수/코롱을 바르지 마십시오.",
          "오전 8:00에 저희 Sheldon Road 사무실로 와 주십시오.",
        ],
      },
    ],
  },
  {
    heading: "캡슐을 삼킨 후",
    blocks: [
      {
        kind: "list",
        style: "bullet",
        items: [
          "**오전 8:00부터 낮 12:00까지, 4시간 동안 매시간 8온스 물 한 잔을 마시십시오** (4시간 동안 총 4잔).",
          "**낮 12:00 이후에는 가벼운 점심을 드셔도 됩니다** — 캡슐을 삼키신 지 4시간 후입니다.",
        ],
      },
      { kind: "p", text: "**중요 — 다음은 계속 피해 주십시오:**" },
      {
        kind: "list",
        style: "avoid",
        items: [
          "모든 유제품",
          "빨간색, 보라색 또는 파란색을 띤 음식과 음료",
          "씨가 든 음식(예: 참깨, 견과류, 씨 있는 토마토 등)",
        ],
      },
      {
        kind: "note",
        text: [
          "**오후 4:00까지 반드시 사무실로 돌아오셔야** 저희 직원이 센서를 제거할 수 있습니다. 장비를 직접 제거하려고 하지 **마십시오**.",
        ],
      },
    ],
  },
  {
    heading: "맑은 액체(투명 유동식) 식이 지침",
    blocks: [
      {
        kind: "table",
        head: ["식품군", "권장", "피해야 할 것"],
        rows: [
          ["우유 및 유제품", "없음", "전부"],
          ["채소", "없음", "전부"],
          [
            "과일",
            "과육 없는 과일 주스",
            "넥타(과육 음료); 모든 신선 과일, 통조림 과일, 냉동 과일",
          ],
          ["빵 및 곡류", "없음", "전부"],
          ["육류 또는 육류 대체품", "없음", "전부"],
          ["지방 및 기름", "없음", "전부"],
          [
            "단 음식 및 디저트",
            "젤라틴, 과일 얼음, 과육 없는 아이스바, 투명한 딱딱한 사탕",
            "그 외 전부",
          ],
          [
            "음료",
            "블랙커피만; 차; 탄산음료; 물; 담당 의사가 승인한 경우 유당 없는 저잔사 보충 음료",
            "그 외 전부",
          ],
          ["수프", "부용(bouillon), 콩소메, 무지방 육수", "그 외 전부"],
        ],
      },
    ],
  },
];

const endocapsuleAr: PrepSection[] = [
  {
    heading: "تفاصيل موعدك",
    blocks: [
      { kind: "p", text: "**التاريخ:** ___ **الوقت:** ___" },
      {
        kind: "p",
        text: "**الموقع — مكتبنا الرئيسي:** 11912 Sheldon Road, Tampa, FL 33626.",
      },
      {
        kind: "note",
        text: [
          "**ستحتاج إلى شراء زجاجة واحدة (1) من Magnesium Citrate (سترات المغنيسيوم)، بنكهة الليمون أو الليم فقط،** وهي متوفرة في صيدليتك المحلية في ممر الملينات.",
        ],
      },
    ],
  },
  {
    heading: "اليوم السابق لدراستك",
    blocks: [
      {
        kind: "list",
        style: "bullet",
        items: [
          "**يُرجى اتباع نظام غذائي من السوائل الصافية في اليوم السابق لدراستك.** يعرض الجدول أدناه مجموعات الطعام الموصى بها.",
          "بعد عشاء السوائل الصافية في الساعة 7:00 مساءً، **اشرب زجاجة Magnesium Citrate كاملة.**",
          "**لا تأكل أو تشرب بعد الساعة 10:00 مساءً.**",
          "أي أدوية أساسية (**أدوية القلب، وضغط الدم، والنوبات (الصرع)، والسكري، وغيرها**) يجب تناولها مع رشفة صغيرة من الماء، في موعد أقصاه الساعة 6:00 صباحًا.",
          "لكي تبقى أجهزة الاستشعار ثابتة في مكانها، يُرجى حلاقة شعر منطقة البطن إذا لزم الأمر.",
        ],
      },
    ],
  },
  {
    heading: "صباح يوم دراستك",
    blocks: [
      {
        kind: "list",
        style: "bullet",
        items: [
          "**لا تأكل أو تشرب.**",
          "يُرجى ارتداء ملابس مريحة وفضفاضة من قطعتين.",
          "تجنب وضع أي لوشن أو بودرة أو عطر/كولونيا على منطقة البطن أو الصدر.",
          "يُرجى الوصول إلى موقعنا في Sheldon Road في الساعة 8:00 صباحًا.",
        ],
      },
    ],
  },
  {
    heading: "بعد ابتلاع الكبسولة",
    blocks: [
      {
        kind: "list",
        style: "bullet",
        items: [
          "**بين الساعة 8:00 صباحًا والساعة 12:00 ظهرًا، اشرب كوبًا واحدًا من الماء سعة 8 أونصات كل ساعة لمدة 4 ساعات** (بإجمالي 4 أكواب خلال 4 ساعات).",
          "**بعد الساعة 12:00 ظهرًا، يمكنك تناول غداء خفيف** — أي بعد 4 ساعات من ابتلاع الكبسولة.",
        ],
      },
      { kind: "p", text: "**هام — يُرجى الاستمرار في تجنب ما يلي:**" },
      {
        kind: "list",
        style: "avoid",
        items: [
          "جميع منتجات الألبان",
          "أي أطعمة ومشروبات ذات لون أحمر أو بنفسجي أو أزرق",
          "الأطعمة التي تحتوي على بذور (مثل: بذور السمسم، والمكسرات، والطماطم التي تحتوي على بذور، وغيرها)",
        ],
      },
      {
        kind: "note",
        text: [
          "**يجب أن تعود إلى المكتب بحلول الساعة 4:00 مساءً** حتى يتمكن موظفونا من إزالة أجهزة الاستشعار. يُرجى **عدم** محاولة إزالة الجهاز بنفسك.",
        ],
      },
    ],
  },
  {
    heading: "إرشادات نظام السوائل الصافية",
    blocks: [
      {
        kind: "table",
        head: ["مجموعة الطعام", "الموصى به", "تجنَّب"],
        rows: [
          ["الحليب ومنتجات الألبان", "لا شيء", "الكل"],
          ["الخضروات", "لا شيء", "الكل"],
          [
            "الفواكه",
            "عصائر الفاكهة بدون لُب",
            "النكتار؛ وجميع الفواكه الطازجة والمعلبة والمجمدة",
          ],
          ["الخبز والحبوب", "لا شيء", "الكل"],
          ["اللحوم أو بدائل اللحوم", "لا شيء", "الكل"],
          ["الدهون والزيوت", "لا شيء", "الكل"],
          [
            "الحلويات والتحلية",
            "الجيلاتين، ومثلجات الفاكهة، والمصاصات المثلجة بدون لُب، والحلوى الصلبة الشفافة",
            "كل ما عدا ذلك",
          ],
          [
            "المشروبات",
            "القهوة السوداء فقط؛ الشاي؛ المشروبات الغازية؛ الماء؛ المكملات الخالية من اللاكتوز وقليلة البقايا إذا وافق عليها طبيبك",
            "كل ما عدا ذلك",
          ],
          ["الشوربات", "مرق مركز (بويون)، وكونسوميه، ومرق خالٍ من الدهون", "كل ما عدا ذلك"],
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
    vi: "Chuẩn bị cho xét nghiệm nội soi viên nang (Endocapsule)",
    ko: "Endocapsule(캡슐 내시경) 검사 준비",
    ar: "التحضير لدراسة كبسولة التنظير (Endocapsule)",
  },
  regimen: {
    en: "Clear liquids the day before + magnesium citrate at 7 PM; capsule swallowed at our Sheldon Road office at 8 AM",
    es: "Líquidos claros el día anterior + citrato de magnesio a las 7 PM; la cápsula se traga en nuestra oficina de Sheldon Road a las 8 AM",
    vi: "Chất lỏng trong suốt vào ngày hôm trước + magnesium citrate lúc 7 giờ tối; nuốt viên nang tại văn phòng Sheldon Road của chúng tôi lúc 8 giờ sáng",
    ko: "전날 맑은 액체 식이 + 오후 7시 magnesium citrate 복용; 오전 8시 Sheldon Road 사무실에서 캡슐 삼킴",
    ar: "سوائل صافية في اليوم السابق + سترات المغنيسيوم (magnesium citrate) في الساعة 7 مساءً؛ وتُبتلع الكبسولة في مكتبنا في Sheldon Road في الساعة 8 صباحًا",
  },
  summary: {
    en: "Endocapsule (capsule endoscopy) study preparation from Westchase Gastroenterology: clear liquid diet, magnesium citrate at 7 PM the night before, an 8 AM arrival at our Sheldon Road office, and the day-of drinking schedule.",
    es: "Preparación para el estudio de endocápsula (cápsula endoscópica) de Westchase Gastroenterology: dieta de líquidos claros, citrato de magnesio a las 7 PM la noche anterior, llegada a las 8 AM a nuestra oficina de Sheldon Road y el horario de líquidos del día del estudio.",
    vi: "Chuẩn bị cho xét nghiệm Endocapsule (nội soi viên nang) của Westchase Gastroenterology: chế độ ăn chất lỏng trong suốt, magnesium citrate lúc 7 giờ tối đêm hôm trước, có mặt lúc 8 giờ sáng tại văn phòng Sheldon Road của chúng tôi và lịch uống nước trong ngày xét nghiệm.",
    ko: "Westchase Gastroenterology의 Endocapsule(캡슐 내시경) 검사 준비: 맑은 액체 식이, 전날 밤 오후 7시 magnesium citrate 복용, 오전 8시 Sheldon Road 사무실 도착, 검사 당일 물 섭취 일정.",
    ar: "التحضير لدراسة Endocapsule (تنظير الكبسولة) من Westchase Gastroenterology: نظام غذائي من السوائل الصافية، وسترات المغنيسيوم (magnesium citrate) في الساعة 7 مساءً في الليلة السابقة، والوصول إلى مكتبنا في Sheldon Road في الساعة 8 صباحًا، وجدول شرب السوائل في يوم الدراسة.",
  },
  sourcePages: "22–23",
  sourceLangs: ["en"],
  sections: {
    en: endocapsuleEn,
    es: endocapsuleEs,
    vi: endocapsuleVi,
    ko: endocapsuleKo,
    ar: endocapsuleAr,
  },
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

const antiRefluxVi: PrepSection[] = [
  {
    blocks: [
      {
        kind: "p",
        text: "Trào ngược axit dạ dày là một vấn đề phổ biến. Bác sĩ của quý vị đã khuyến nghị quý vị tránh các thức ăn và đồ uống được biết là làm trào ngược axit dạ dày nặng hơn. Những thứ này bao gồm thức ăn nhiều chất béo, rượu bia, sô-cô-la, đồ uống có caffeine (như cà phê, trà và nước ngọt), bạc hà cay (peppermint), bạc hà lục (spearmint) và gia vị. Nếu quý vị thừa cân, ăn kiêng cũng có thể giúp ích.",
      },
      {
        kind: "p",
        text: "Quý vị có thể uống nước ép nam việt quất, nước ép táo pha loãng với nước và trà thảo mộc (trừ bạc hà cay và bạc hà lục). Hãy uống nhiều nước.",
      },
      {
        kind: "p",
        text: "**Các sản phẩm thay thế cà phê:** Postum; Coffree (hỗn hợp kiểu Thụy Sĩ gồm rau diếp xoăn (chicory), sung, lúa mì, lúa mạch mạch nha và hạt sồi).",
      },
    ],
  },
  {
    heading: "Thức ăn và đồ uống cần tránh",
    blocks: [
      {
        kind: "list",
        style: "avoid",
        items: [
          "Thức ăn nhiều chất béo",
          "Rượu bia",
          "Sô-cô-la",
          "Cà phê, trà, nước ngọt có caffeine (cà phê đã khử caffeine vẫn còn một ít caffeine)",
          "Bạc hà cay và bạc hà lục",
          "Gia vị và giấm",
          "Trái cây họ cam quýt và nước ép của chúng",
          "Cà chua và các loại sốt cà chua",
        ],
      },
    ],
  },
  {
    heading: "Các biện pháp chống trào ngược khác",
    blocks: [
      {
        kind: "list",
        style: "check",
        items: [
          "Không ăn hoặc uống trong 2 giờ trước khi đi ngủ",
          "Tránh nằm sau các bữa ăn",
          "Nâng đầu giường của quý vị cao 6 inch (dùng gối nêm giường, có bán tại các cửa hàng vật tư y tế)",
          "Không mặc quần áo bó sát quanh vùng bụng",
          "Tránh rặn/gắng sức, nâng tạ, cúi người lâu và táo bón",
          "Giảm cân (nếu quý vị thừa cân)",
          "Ngừng hút thuốc — nicotine kích thích axit dạ dày và làm suy giảm chức năng cơ vòng thực quản dưới",
        ],
      },
      {
        kind: "p",
        text: "Vì khả năng trào ngược tăng lên sau bữa ăn, điều quan trọng là tránh ăn hoặc uống trong 2 giờ trước khi đi ngủ, ngoại trừ việc uống bất kỳ thuốc nào do bác sĩ của quý vị kê đơn. Nhớ tránh nằm sau bất kỳ bữa ăn nào.",
      },
    ],
  },
  {
    heading:
      "Thực phẩm chấp nhận được cho người trào ngược (nếu nấu với thảo mộc dịu nhẹ)",
    blocks: [
      {
        kind: "table",
        head: ["Nhóm thực phẩm", "Chấp nhận được"],
        rows: [
          [
            "Thịt",
            "Tất cả bít tết thăn (loin), sườn bụng (flank), ribeye và thăn ngoại (sirloin); thịt quay phần sườn (rib) và phần mông (rump); gan; thịt bê; gà; gà thiến (capon) và gà Cornish; gà tây; sườn thăn heo; gà lôi (pheasant); chim cút; thịt nai",
          ],
          [
            "Cá và hải sản có vỏ",
            "Cá bơn sole, cá bơn lưỡi ngựa (halibut), cá thầy tu (monkfish), cá ngừ, cá vược, cá hun khói, cá hồi, cá bơn flounder, cá tuyết chấm đen (haddock), tôm hùm, cá thu, cá rô perch, cá chó (pike), cá trích shad, sò điệp, tôm, cá hồi suối (trout)",
          ],
          [
            "Khoai tây",
            "Tất cả: khoai tây đỏ, trắng, khoai lang và khoai mỡ (không dùng khoai tây đóng hộp)",
          ],
          ["Cơm/gạo", "Tất cả: gạo trắng, gạo lứt và các loại gạo đặc sản (gourmet)"],
          [
            "Súp",
            "Tất cả các loại súp không có cà chua, dùng có chừng mực (súp kem có thể gây tăng tiết đờm nhớt và/hoặc làm khó chịu do trào ngược)",
          ],
          [
            "Mì Ý (pasta)",
            "Sốt pesto hoặc sốt tỏi và dầu; chỉ sốt nghêu trắng (white clam sauce)",
          ],
          [
            "Rau củ và tinh bột",
            "Củ dền, cà tím (chỉ nướng hoặc áp chảo), các loại đậu, đậu lima, đậu que, đậu sáp (wax beans), rau bina (cải bó xôi), atisô, măng tây, cải Brussels, súp lơ trắng, bông cải xanh, broccoflower (súp lơ lai), củ cải vàng (parsnip), cà rốt, bí buttercup, bí acorn, bí butternut, bí delicata, bí ngòi zucchini (cả vàng và xanh), các loại bí đặc sản (gourmet), lê sấy khô",
          ],
          [
            "Trái cây ngọt",
            "Chuối, chà là, sung, nho khô (Thompson và Muscat), mận khô, hồng, các loại dưa, dâu tây, việt quất, mâm xôi đen, mâm xôi đỏ",
          ],
          [
            "Thảo mộc và gia vị nêm",
            "Húng quế, lá nguyệt quế, ngò tây hương (chervil), hẹ tây (chives), ngò rí, thì là, kinh giới ngọt (marjoram), oregano, mùi tây (parsley), hương thảo, xô thơm, húng savory, ngải giấm (tarragon), cỏ xạ hương (thyme), tỏi, nước tương, tiêu trắng",
          ],
        ],
      },
    ],
  },
];

const antiRefluxKo: PrepSection[] = [
  {
    blocks: [
      {
        kind: "p",
        text: "위산 역류는 흔한 문제입니다. 담당 의사는 위산 역류를 악화시키는 것으로 알려진 음식과 음료를 피하도록 권고했습니다. 여기에는 기름진 음식, 술, 초콜릿, 카페인 음료(커피, 차, 탄산음료 등), 페퍼민트, 스피어민트, 향신료가 포함됩니다. 과체중이신 경우 식이 조절도 도움이 될 수 있습니다.",
      },
      {
        kind: "p",
        text: "크랜베리 주스, 물에 희석한 사과 주스, 허브차(페퍼민트와 스피어민트 제외)는 마셔도 괜찮습니다. 물을 많이 마시십시오.",
      },
      {
        kind: "p",
        text: "**커피 대체품:** Postum; Coffree (치커리, 무화과, 밀, 맥아 보리, 도토리를 섞은 스위스식 블렌드).",
      },
    ],
  },
  {
    heading: "피해야 할 음식 및 음료",
    blocks: [
      {
        kind: "list",
        style: "avoid",
        items: [
          "기름진 음식",
          "술(알코올)",
          "초콜릿",
          "커피, 차, 카페인이 든 탄산음료 (디카페인 커피에도 카페인이 일부 남아 있습니다)",
          "페퍼민트 및 스피어민트",
          "향신료 및 식초",
          "감귤류 과일 및 그 주스",
          "토마토 및 토마토 소스",
        ],
      },
    ],
  },
  {
    heading: "기타 역류 방지 수칙",
    blocks: [
      {
        kind: "list",
        style: "check",
        items: [
          "잠자리에 들기 전 2시간 동안은 먹거나 마시지 마십시오",
          "식사 후에는 눕지 마십시오",
          "침대 머리 쪽을 6인치 높이십시오 (의료용품점에서 판매하는 침대용 쐐기 베개를 사용하십시오)",
          "복부 주위에 꽉 끼는 옷을 입지 마십시오",
          "과도하게 힘주는 것, 무거운 것 들기, 장시간 몸 굽히기, 변비를 피하십시오",
          "체중을 감량하십시오 (과체중인 경우)",
          "금연하십시오 — 니코틴은 위산 분비를 자극하고 하부 식도 괄약근 기능을 저하시킵니다",
        ],
      },
      {
        kind: "p",
        text: "식사 후에는 역류 가능성이 높아지므로, 잠자리에 들기 전 2시간 동안은 먹거나 마시지 않는 것이 중요합니다. 단, 의사가 처방한 약의 복용은 예외입니다. 어떤 식사 후에도 눕지 않도록 유의하십시오.",
      },
    ],
  },
  {
    heading: "역류에 무리가 없는 음식 (순한 허브로 조리한 경우)",
    blocks: [
      {
        kind: "table",
        head: ["식품군", "허용"],
        rows: [
          [
            "육류",
            "모든 등심(loin), 치마살(flank), 립아이(ribeye), 설로인(sirloin) 스테이크; 갈비(rib) 및 우둔(rump) 로스트; 간; 송아지 고기; 닭고기; 거세 수탉(capon)과 코니시 헨(Cornish hen); 칠면조; 돼지 등심 촙; 꿩; 메추라기; 사슴고기",
          ],
          [
            "생선 및 조개류",
            "서대(sole), 넙치(halibut), 아귀(monkfish), 참치, 배스(bass), 훈제 생선, 연어, 가자미(flounder), 해덕(haddock), 랍스터(바닷가재), 고등어, 퍼치(perch), 파이크(pike), 전어류(shad), 가리비, 새우, 송어",
          ],
          [
            "감자",
            "모두 가능: 빨간 감자, 흰 감자, 고구마, 얌(참마) (통조림 감자는 제외)",
          ],
          ["쌀", "모두 가능: 백미, 현미, 고급(gourmet) 품종"],
          [
            "수프",
            "토마토가 들어가지 않은 모든 수프, 단 신중하게 (크림수프는 점액 과다 및/또는 역류 불편을 유발할 수 있습니다)",
          ],
          ["파스타", "페스토 또는 마늘-기름 소스; 화이트 클램 소스만 가능"],
          [
            "채소 및 전분류",
            "비트, 가지(구이 또는 볶음만), 콩류, 리마콩, 그린빈(껍질콩), 왁스빈, 시금치, 아티초크, 아스파라거스, 방울양배추(브뤼셀 스프라우트), 콜리플라워, 브로콜리, 브로코플라워(broccoflower), 파스닙, 당근, buttercup 호박, acorn 호박, butternut 호박, delicata 호박, 주키니(노란색과 녹색 모두), 고급(gourmet) 호박류, 햇볕에 말린 배",
          ],
          [
            "단맛 과일",
            "바나나, 대추야자, 무화과, 건포도(Thompson 및 Muscat), 말린 자두(프룬), 감, 멜론, 딸기, 블루베리, 블랙베리, 라즈베리",
          ],
          [
            "허브 및 양념",
            "바질, 월계수 잎, 처빌, 차이브, 고수(실란트로), 딜, 마조람, 오레가노, 파슬리, 로즈마리, 세이지, 세이보리, 타라곤, 타임, 마늘, 간장, 흰 후추",
          ],
        ],
      },
    ],
  },
];

const antiRefluxAr: PrepSection[] = [
  {
    blocks: [
      {
        kind: "p",
        text: "ارتجاع حمض المعدة مشكلة شائعة. وقد أوصى طبيبك بأن تتجنب الأطعمة والمشروبات المعروفة بأنها تزيد ارتجاع حمض المعدة سوءًا. وتشمل هذه الأطعمة الدسمة، والكحول، والشوكولاتة، والمشروبات المحتوية على الكافيين (مثل القهوة والشاي والمشروبات الغازية)، والنعناع الفلفلي، والنعناع السنبلي، والتوابل. وإذا كنت تعاني من زيادة الوزن، فقد يساعد اتباع حمية غذائية أيضًا.",
      },
      {
        kind: "p",
        text: "لا بأس بشرب عصير التوت البري، وعصير التفاح المخفف بالماء، وشاي الأعشاب (باستثناء النعناع الفلفلي والنعناع السنبلي). اشرب الكثير من الماء.",
      },
      {
        kind: "p",
        text: "**بدائل القهوة:** Postum؛ وCoffree (خليط سويسري من الهندباء البرية (الشيكوريا) والتين والقمح والشعير المملّت وثمار البلوط).",
      },
    ],
  },
  {
    heading: "أطعمة ومشروبات يجب تجنبها",
    blocks: [
      {
        kind: "list",
        style: "avoid",
        items: [
          "الأطعمة الدسمة",
          "الكحول",
          "الشوكولاتة",
          "القهوة والشاي والمشروبات الغازية المحتوية على الكافيين (القهوة منزوعة الكافيين لا تزال تحتوي على بعض الكافيين)",
          "النعناع الفلفلي والنعناع السنبلي",
          "التوابل والخل",
          "الحمضيات وعصائرها",
          "الطماطم وصلصات الطماطم",
        ],
      },
    ],
  },
  {
    heading: "تدابير أخرى مضادة للارتجاع",
    blocks: [
      {
        kind: "list",
        style: "check",
        items: [
          "لا تأكل أو تشرب لمدة ساعتين (2) قبل الذهاب إلى النوم",
          "تجنب الاستلقاء بعد الوجبات",
          "ارفع رأس سريرك بمقدار 6 بوصات (استخدم وسادة إسفينية للسرير من أي متجر مستلزمات طبية)",
          "لا ترتدِ ملابس ضيقة حول بطنك",
          "تجنب الإجهاد، ورفع الأثقال، والانحناء لفترات طويلة، والإمساك",
          "أنقص وزنك (إذا كنت تعاني من زيادة الوزن)",
          "أقلع عن التدخين — فالنيكوتين يحفّز حمض المعدة ويضعف وظيفة العضلة العاصرة المريئية السفلية",
        ],
      },
      {
        kind: "p",
        text: "نظرًا لأن احتمال الارتجاع يزداد بعد الوجبة، فمن المهم تجنب الأكل أو الشرب لمدة ساعتين (2) قبل الذهاب إلى النوم، باستثناء تناول أي دواء وصفه لك طبيبك. وتذكّر أن تتجنب الاستلقاء بعد أي وجبة.",
      },
    ],
  },
  {
    heading: "أطعمة مقبولة لمرضى الارتجاع (إذا طُهيت بأعشاب خفيفة)",
    blocks: [
      {
        kind: "table",
        head: ["مجموعة الطعام", "المقبول"],
        rows: [
          [
            "اللحوم",
            "جميع شرائح اللحم من الخاصرة (loin) والبطن (flank) وريب آي (ribeye) والسرلوين (sirloin)؛ ومشوي الضلوع (rib) والردف (rump)؛ والكبد؛ ولحم العجل؛ والدجاج؛ والديوك المخصية (capon) ودجاج Cornish؛ والديك الرومي؛ وشرائح لحم الخنزير من الخاصرة؛ والتدرج (pheasant)؛ والسُّمان؛ ولحم الغزال",
          ],
          [
            "الأسماك والمحار",
            "سمك موسى (sole)، والهلبوت (halibut)، وسمك الراهب (monkfish)، والتونة، والقاروص (bass)، والسمك المدخن، والسلمون، والسمك المفلطح (flounder)، والحدوق (haddock)، وجراد البحر (اللوبستر)، والماكريل (الإسقمري)، والفرخ (perch)، والكراكي (pike)، والشابل (shad)، والإسكالوب، والروبيان (الجمبري)، والتروتة (trout)",
          ],
          [
            "البطاطس",
            "الكل: البطاطس الحمراء والبيضاء والبطاطا الحلوة واليام (بدون بطاطس معلبة)",
          ],
          ["الأرز", "الكل: الأرز الأبيض والبني والأصناف الفاخرة"],
          [
            "الشوربات",
            "جميع الشوربات غير المصنوعة من الطماطم، مع الحذر (قد تسبب شوربات الكريمة زيادة المخاط و/أو تهيّج الارتجاع)",
          ],
          [
            "المعكرونة (الباستا)",
            "صلصة البيستو أو صلصة الثوم والزيت؛ وصلصة المحار (clam) البيضاء فقط",
          ],
          [
            "الخضروات والنشويات",
            "الشمندر (البنجر)، والباذنجان (مشويًا أو سوتيه فقط)، والفاصوليا، وفاصوليا ليما، والفاصوليا الخضراء، والفاصوليا الشمعية، والسبانخ، والخرشوف، والهليون، وكرنب بروكسل، والقرنبيط، والبروكلي، والبروكوفلاور (broccoflower)، والجزر الأبيض (parsnip)، والجزر، وقرع buttercup، وقرع acorn، وقرع butternut، وقرع delicata، والكوسا (الصفراء والخضراء)، وأنواع القرع الفاخرة، والكمثرى المجففة بالشمس",
          ],
          [
            "الفواكه الحلوة",
            "الموز، والتمر، والتين، والزبيب (Thompson وMuscat)، والبرقوق المجفف، والكاكا (البرسيمون)، والشمام، والفراولة، والتوت الأزرق، والتوت الأسود، وتوت العليق",
          ],
          [
            "الأعشاب والتوابل",
            "الريحان، وورق الغار، والشرفيل (chervil)، والثوم المعمر، والكزبرة، والشبت، والمردقوش، والأوريجانو، والبقدونس، وإكليل الجبل (الروزماري)، والميرمية، والسعتر الصيفي (savory)، والطرخون، والزعتر، والثوم، وصلصة الصويا، والفلفل الأبيض",
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
    vi: "Hướng dẫn chế độ ăn chống trào ngược",
    ko: "역류 방지 식이 지침",
    ar: "إرشادات النظام الغذائي المضاد للارتجاع",
  },
  regimen: {
    en: "Foods and drinks to avoid, reflux-acceptable foods, and daily anti-reflux habits",
    es: "Alimentos y bebidas a evitar, alimentos aceptables para el reflujo y hábitos antirreflujo diarios",
    vi: "Thức ăn và đồ uống cần tránh, thực phẩm chấp nhận được cho người trào ngược và các thói quen chống trào ngược hằng ngày",
    ko: "피해야 할 음식과 음료, 역류에 무리가 없는 음식, 일상적인 역류 방지 습관",
    ar: "أطعمة ومشروبات يجب تجنبها، وأطعمة مقبولة لمرضى الارتجاع، وعادات يومية مضادة للارتجاع",
  },
  summary: {
    en: "The anti-reflux diet guidelines from Westchase Gastroenterology: which foods and drinks make acid reflux worse, which are acceptable, and the daily habits that help.",
    es: "Las guías de dieta antirreflujo de Westchase Gastroenterology: qué alimentos y bebidas empeoran el reflujo ácido, cuáles son aceptables y los hábitos diarios que ayudan.",
    vi: "Hướng dẫn chế độ ăn chống trào ngược của Westchase Gastroenterology: những thức ăn và đồ uống nào làm trào ngược axit nặng hơn, những loại nào chấp nhận được và các thói quen hằng ngày giúp ích.",
    ko: "Westchase Gastroenterology의 역류 방지 식이 지침: 위산 역류를 악화시키는 음식과 음료, 허용되는 음식, 도움이 되는 일상 습관.",
    ar: "إرشادات النظام الغذائي المضاد للارتجاع من Westchase Gastroenterology: ما الأطعمة والمشروبات التي تزيد ارتجاع الحمض سوءًا، وما المقبول منها، والعادات اليومية المفيدة.",
  },
  sourcePages: "1–3",
  sourceLangs: ["en", "es"],
  sections: {
    en: antiRefluxEn,
    es: antiRefluxEs,
    vi: antiRefluxVi,
    ko: antiRefluxKo,
    ar: antiRefluxAr,
  },
};

export const otherPreps: PrepDoc[] = [sigmoidoscopy, endocapsule, antiReflux];
