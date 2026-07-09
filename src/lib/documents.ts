// Patient document registry. The practice's previous site linked 33 PDFs that
// all returned 404 from the old vendor's CDN; this registry replaces them.
// Rule: a document renders as a download link ONLY when `file` points to a
// real PDF in /public/documents. Until the practice supplies the current
// version, `file` stays null and the UI offers the staffed text line and
// front desk instead of a dead link. Never fake a file path.

import type { Bi } from "./content/types";

export type DocCategory = "new-patient" | "procedure-prep" | "disease-info";

export type PracticeDocument = {
  id: string;
  category: DocCategory;
  label: Bi;
  /** Path under /public, e.g. "/documents/new-patient-registration.pdf". */
  file: string | null;
};

export const documents: PracticeDocument[] = [
  // New-patient forms (printable). The online hushforms packet is live and is
  // the primary path; these mirror the old printable set. Registration and
  // privacy notices are covered by the online packet — only record-release
  // forms remain as printable slots until PDFs are supplied.
  { id: "record-release-to-wcgi", category: "new-patient", label: { en: "Medical Record Release to WCGI", es: "Autorización para enviar expedientes médicos a WCGI", vi: "Ủy quyền gửi hồ sơ bệnh án đến WCGI", ko: "WCGI로의 의무 기록 제공 동의서", ar: "تفويض إرسال السجلات الطبية إلى WCGI" }, file: null },
  { id: "record-release-from-wcgi", category: "new-patient", label: { en: "Medical Record Release from WCGI", es: "Autorización para solicitar expedientes médicos de WCGI", vi: "Ủy quyền yêu cầu hồ sơ bệnh án từ WCGI", ko: "WCGI로부터의 의무 기록 발급 동의서", ar: "تفويض طلب السجلات الطبية من WCGI" }, file: null },

  // Procedure preparation instructions — the practice's CURRENT handout set
  // (Juliet's 2026-07-07 email, confirmed current; replaces the old site's
  // stale list of MoviPrep/OsmoPrep/Prepopik/Suprep/Magnesium Citrate).
  // Every one of these is readable on-site at /procedure-prep/<slug>
  // (see lib/content/preps); `file` remains the slot for a clean per-doc
  // printable PDF if the practice supplies one.
  { id: "prep-clenpiq-split-dose", category: "procedure-prep", label: { en: "Clenpiq Split-Dose Prep", es: "Preparación Clenpiq en dosis dividida", vi: "Chuẩn bị Clenpiq liều chia đôi", ko: "Clenpiq 분할 복용 준비법", ar: "تحضير Clenpiq بجرعة مقسمة" }, file: null },
  { id: "prep-clenpiq", category: "procedure-prep", label: { en: "Clenpiq Prep", es: "Preparación Clenpiq", vi: "Chuẩn bị Clenpiq", ko: "Clenpiq 준비법", ar: "تحضير Clenpiq" }, file: null },
  { id: "prep-sutab", category: "procedure-prep", label: { en: "Sutab Prep", es: "Preparación Sutab", vi: "Chuẩn bị Sutab", ko: "Sutab 준비법", ar: "تحضير Sutab" }, file: null },
  { id: "prep-colonoscopy-miralax", category: "procedure-prep", label: { en: "Colonoscopy Prep (MiraLAX)", es: "Preparación para colonoscopia (MiraLAX)", vi: "Chuẩn bị nội soi đại tràng (MiraLAX)", ko: "대장 내시경 준비법(MiraLAX)", ar: "تحضير تنظير القولون (MiraLAX)" }, file: null },
  { id: "prep-colonoscopy-miralax-split-dose", category: "procedure-prep", label: { en: "Colonoscopy Split-Dose Prep (MiraLAX)", es: "Preparación para colonoscopia en dosis dividida (MiraLAX)", vi: "Chuẩn bị nội soi đại tràng liều chia đôi (MiraLAX)", ko: "대장 내시경 분할 복용 준비법(MiraLAX)", ar: "تحضير تنظير القولون بجرعة مقسمة (MiraLAX)" }, file: null },
  { id: "prep-golytely", category: "procedure-prep", label: { en: "Golytely Prep", es: "Preparación Golytely", vi: "Chuẩn bị Golytely", ko: "Golytely 준비법", ar: "تحضير Golytely" }, file: null },
  { id: "prep-golytely-split-dose", category: "procedure-prep", label: { en: "Golytely Split-Dose Prep", es: "Preparación Golytely en dosis dividida", vi: "Chuẩn bị Golytely liều chia đôi", ko: "Golytely 분할 복용 준비법", ar: "تحضير Golytely بجرعة مقسمة" }, file: null },
  { id: "prep-egd", category: "procedure-prep", label: { en: "EGD (Upper Endoscopy) Prep", es: "Preparación para EGD (endoscopia superior)", vi: "Chuẩn bị EGD (nội soi đường tiêu hóa trên)", ko: "EGD(상부 위장관 내시경) 준비법", ar: "تحضير EGD (تنظير الجهاز الهضمي العلوي)" }, file: null },
  { id: "prep-bravo", category: "procedure-prep", label: { en: "Bravo Prep", es: "Preparación Bravo", vi: "Chuẩn bị Bravo", ko: "Bravo 준비법", ar: "تحضير Bravo" }, file: null },
  { id: "prep-halo", category: "procedure-prep", label: { en: "Halo Prep", es: "Preparación Halo", vi: "Chuẩn bị Halo", ko: "Halo 준비법", ar: "تحضير Halo" }, file: null },
  { id: "prep-endocapsule", category: "procedure-prep", label: { en: "Endocapsule Study Prep", es: "Preparación para el estudio de endocápsula", vi: "Chuẩn bị nghiên cứu Endocapsule", ko: "Endocapsule 검사 준비법", ar: "تحضير دراسة Endocapsule" }, file: null },
  { id: "prep-sigmoidoscopy", category: "procedure-prep", label: { en: "Sigmoidoscopy Prep", es: "Preparación para sigmoidoscopia", vi: "Chuẩn bị nội soi đại tràng sigma", ko: "에스결장 내시경 준비법", ar: "تحضير تنظير القولون السيني" }, file: null },
  { id: "prep-anti-reflux-diet", category: "procedure-prep", label: { en: "Anti-Reflux Diet Guidelines", es: "Guías de dieta antirreflujo", vi: "Hướng dẫn chế độ ăn chống trào ngược", ko: "역류 방지 식이 지침", ar: "إرشادات النظام الغذائي المضاد للارتجاع" }, file: null },

  // Disease information sheets.
  { id: "info-abdominal-pain", category: "disease-info", label: { en: "Abdominal Pain", es: "Dolor abdominal", vi: "Đau bụng", ko: "복통", ar: "ألم البطن" }, file: null },
  { id: "info-barretts-esophagus", category: "disease-info", label: { en: "Barrett's Esophagus", es: "Esófago de Barrett", vi: "Thực quản Barrett", ko: "바렛 식도", ar: "مريء باريت" }, file: null },
  { id: "info-colorectal-cancer", category: "disease-info", label: { en: "Colorectal Cancer", es: "Cáncer colorrectal", vi: "Ung thư đại trực tràng", ko: "대장암", ar: "سرطان القولون والمستقيم" }, file: null },
  { id: "info-constipation", category: "disease-info", label: { en: "Constipation", es: "Estreñimiento", vi: "Táo bón", ko: "변비", ar: "الإمساك" }, file: null },
  { id: "info-crohns-disease", category: "disease-info", label: { en: "Crohn's Disease", es: "Enfermedad de Crohn", vi: "Bệnh Crohn", ko: "크론병", ar: "داء كرون" }, file: null },
  { id: "info-diverticular-disease", category: "disease-info", label: { en: "Diverticular Disease", es: "Enfermedad diverticular", vi: "Bệnh túi thừa", ko: "게실 질환", ar: "داء الرتوج" }, file: null },
  { id: "info-food-allergy", category: "disease-info", label: { en: "Food Allergy / Intolerance", es: "Alergia e intolerancia alimentaria", vi: "Dị ứng / không dung nạp thực phẩm", ko: "식품 알레르기/불내증", ar: "حساسية الطعام / عدم تحمل الطعام" }, file: null },
  { id: "info-gallstones", category: "disease-info", label: { en: "Gallstones", es: "Cálculos biliares", vi: "Sỏi mật", ko: "담석", ar: "حصوات المرارة" }, file: null },
  { id: "info-gerd", category: "disease-info", label: { en: "Gastroesophageal Reflux", es: "Reflujo gastroesofágico", vi: "Trào ngược dạ dày thực quản", ko: "위식도 역류", ar: "الارتجاع المعدي المريئي" }, file: null },
  { id: "info-hemochromatosis", category: "disease-info", label: { en: "Hemochromatosis", es: "Hemocromatosis", vi: "Bệnh nhiễm sắc tố sắt mô (hemochromatosis)", ko: "혈색소증", ar: "داء ترسب الأصبغة الدموية" }, file: null },
  { id: "info-ibd", category: "disease-info", label: { en: "Inflammatory Bowel Disease", es: "Enfermedad inflamatoria intestinal", vi: "Bệnh viêm ruột", ko: "염증성 장 질환", ar: "داء الأمعاء الالتهابي" }, file: null },
  { id: "info-intestinal-gas", category: "disease-info", label: { en: "Intestinal Gas", es: "Gases intestinales", vi: "Đầy hơi đường ruột", ko: "장내 가스", ar: "غازات الأمعاء" }, file: null },
  { id: "info-liver-disease", category: "disease-info", label: { en: "Liver Disease", es: "Enfermedad hepática", vi: "Bệnh gan", ko: "간 질환", ar: "أمراض الكبد" }, file: null },
  { id: "info-rectal-disease", category: "disease-info", label: { en: "Rectal Disease", es: "Enfermedades rectales", vi: "Bệnh trực tràng", ko: "직장 질환", ar: "أمراض المستقيم" }, file: null },
  { id: "info-ulcers", category: "disease-info", label: { en: "Ulcers", es: "Úlceras", vi: "Vết loét", ko: "궤양", ar: "القرح" }, file: null },
  { id: "info-ulcerative-colitis", category: "disease-info", label: { en: "Ulcerative Colitis", es: "Colitis ulcerosa", vi: "Viêm loét đại tràng", ko: "궤양성 대장염", ar: "التهاب القولون التقرحي" }, file: null },
];

export function documentsByCategory(category: DocCategory): PracticeDocument[] {
  return documents.filter((d) => d.category === category);
}
