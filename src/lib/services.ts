// Conditions and procedures as published by the practice. Polish applied:
// the misspelled duplicate "Barret Esophagus" entry became a single corrected
// "Barrett's Esophagus" item (removed from the GERD parenthetical to avoid
// listing it twice). Spanish is a first-class translation of the same lists.

import type { Bi } from "./content/types";

export type Bilingual = Bi;

export const conditions: Bilingual[] = [
  { en: "Celiac Disease", es: "Enfermedad celíaca", vi: "Bệnh Celiac", ko: "셀리악병", ar: "الداء البطني (السيلياك)" },
  { en: "Colon Screening", es: "Exámenes de detección de colon", vi: "Tầm soát đại tràng", ko: "대장 검진", ar: "فحوصات الكشف المبكر للقولون" },
  { en: "Crohn's Disease", es: "Enfermedad de Crohn", vi: "Bệnh Crohn", ko: "크론병", ar: "داء كرون" },
  { en: "Diverticular Disease", es: "Enfermedad diverticular", vi: "Bệnh túi thừa", ko: "게실 질환", ar: "داء الرتوج" },
  { en: "Gallbladder Disease", es: "Enfermedad de la vesícula biliar", vi: "Bệnh túi mật", ko: "담낭 질환", ar: "أمراض المرارة" },
  { en: "Gastroesophageal Reflux Disease (acid reflux, GERD)", es: "Enfermedad por reflujo gastroesofágico (reflujo ácido, ERGE)", vi: "Bệnh trào ngược dạ dày thực quản (trào ngược axit, GERD)", ko: "위식도 역류 질환(위산 역류, GERD)", ar: "مرض الارتجاع المعدي المريئي (ارتجاع الحمض، GERD)" },
  { en: "Barrett's Esophagus", es: "Esófago de Barrett", vi: "Thực quản Barrett", ko: "바렛 식도", ar: "مريء باريت" },
  { en: "Gastric/Peptic Ulcers", es: "Úlceras gástricas y pépticas", vi: "Loét dạ dày / loét dạ dày tá tràng", ko: "위궤양/소화성 궤양", ar: "قرحة المعدة والقرحة الهضمية" },
  { en: "Hepatitis B", es: "Hepatitis B", vi: "Viêm gan B", ko: "B형 간염", ar: "التهاب الكبد B" },
  { en: "Hepatitis C", es: "Hepatitis C", vi: "Viêm gan C", ko: "C형 간염", ar: "التهاب الكبد C" },
  { en: "Hiatal Hernia", es: "Hernia de hiato", vi: "Thoát vị khe hoành", ko: "식도 열공 탈장", ar: "فتق الحجاب الحاجز" },
  { en: "Internal Hemorrhoids", es: "Hemorroides internas", vi: "Trĩ nội", ko: "내치핵", ar: "البواسير الداخلية" },
  { en: "Irritable Bowel Syndrome", es: "Síndrome del intestino irritable", vi: "Hội chứng ruột kích thích", ko: "과민성 대장 증후군", ar: "متلازمة القولون العصبي" },
  { en: "Liver Disease (Fatty Liver)", es: "Enfermedad hepática (hígado graso)", vi: "Bệnh gan (gan nhiễm mỡ)", ko: "간 질환(지방간)", ar: "أمراض الكبد (الكبد الدهني)" },
  { en: "Ulcerative Colitis and other digestive complications", es: "Colitis ulcerosa y otras complicaciones digestivas", vi: "Viêm loét đại tràng và các biến chứng tiêu hóa khác", ko: "궤양성 대장염 및 기타 소화기 합병증", ar: "التهاب القولون التقرحي ومضاعفات هضمية أخرى" },
];

export const procedures: Bilingual[] = [
  { en: "Bravo Capsule Study (36-hour esophageal pH study)", es: "Estudio con cápsula Bravo (estudio de pH esofágico de 36 horas)", vi: "Nghiên cứu viên nang Bravo (đo pH thực quản trong 36 giờ)", ko: "Bravo 캡슐 검사(36시간 식도 pH 검사)", ar: "دراسة كبسولة Bravo (دراسة pH المريء لمدة 36 ساعة)" },
  { en: "Colonoscopy / Sigmoidoscopy", es: "Colonoscopia / Sigmoidoscopia", vi: "Nội soi đại tràng / Nội soi đại tràng sigma", ko: "대장 내시경 / 에스결장 내시경", ar: "تنظير القولون / تنظير القولون السيني" },
  { en: "Endocapsule Study (small bowel capsule study)", es: "Estudio con endocápsula (cápsula del intestino delgado)", vi: "Nghiên cứu Endocapsule (nội soi viên nang ruột non)", ko: "Endocapsule 검사(소장 캡슐 내시경 검사)", ar: "دراسة Endocapsule (دراسة الأمعاء الدقيقة بالكبسولة)" },
  { en: "Endoscopic Retrograde Cholangiopancreatography (ERCP)", es: "Colangiopancreatografía retrógrada endoscópica (CPRE)", vi: "Chụp mật tụy ngược dòng qua nội soi (ERCP)", ko: "내시경적 역행성 담췌관 조영술(ERCP)", ar: "تصوير القنوات الصفراوية والبنكرياس بالمنظار بالطريق الراجع (ERCP)" },
  { en: "Endoscopic Ultrasound", es: "Ultrasonido endoscópico", vi: "Siêu âm nội soi", ko: "내시경 초음파 검사", ar: "التصوير بالموجات فوق الصوتية بالمنظار" },
  { en: "Esophagogastroduodenoscopy (EGD)", es: "Esofagogastroduodenoscopia (EGD)", vi: "Nội soi thực quản - dạ dày - tá tràng (EGD)", ko: "식도위십이지장 내시경 검사(EGD)", ar: "تنظير المريء والمعدة والاثني عشر (EGD)" },
  { en: "Halo Study (Barrett's Esophagus ablation)", es: "Estudio Halo (ablación del esófago de Barrett)", vi: "Nghiên cứu Halo (đốt hủy thực quản Barrett)", ko: "Halo 검사(바렛 식도 소작술)", ar: "دراسة Halo (كيّ مريء باريت)" },
  // Added at the practice's request 2026-07-06. Conservative phrasing; the
  // practice already lists "Liver Ultrasound & Elastography" on its About page.
  { en: "Liver Elastography (non-invasive liver stiffness assessment)", es: "Elastografía hepática (evaluación no invasiva de la rigidez del hígado)", vi: "Đo đàn hồi gan (đánh giá độ cứng của gan không xâm lấn)", ko: "간 탄성도 검사(비침습적 간 경직도 평가)", ar: "تصوير مرونة الكبد (تقييم غير باضع لتيبّس الكبد)" },
  { en: "Motility Study", es: "Estudio de motilidad", vi: "Nghiên cứu nhu động", ko: "위장관 운동 검사", ar: "دراسة حركية الجهاز الهضمي" },
  { en: "Hemorrhoid Banding (non-invasive treatment of internal hemorrhoids)", es: "Ligadura de hemorroides (tratamiento no invasivo de las hemorroides internas)", vi: "Thắt búi trĩ bằng vòng cao su (điều trị trĩ nội không xâm lấn)", ko: "치핵 결찰술(내치핵의 비침습적 치료)", ar: "ربط البواسير (علاج غير باضع للبواسير الداخلية)" },
];
