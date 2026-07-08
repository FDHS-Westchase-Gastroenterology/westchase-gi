// The procedure-preparation library: the practice's CURRENT 13 handouts,
// transcribed from the scan Juliet emailed 2026-07-07 ("Preps Website.pdf",
// 26 pages) and confirmed by the practice as the current set. Dose timings
// were human-verified against the scan the same day (PROJECT-LOG safety
// gate). 16 source files → 13 documents: three sheets (anti-reflux diet,
// split-dose MiraLAX colonoscopy, EGD) exist in both English and Spanish.
//
// NOTE: this set REPLACES the previous site's prep list. The old site
// offered MoviPrep, OsmoPrep, Prepopik (2 doses), Suprep, and a standalone
// Magnesium Citrate prep; the practice's current handouts instead use
// Clenpiq (2 variants), Sutab, MiraLAX (2 variants), and Golytely
// (2 variants) — plus EGD/Bravo/Halo/Endocapsule/Sigmoidoscopy and the
// anti-reflux diet sheet.

import type { Bi } from "../types";
import type { PrepDoc, PrepGroupId } from "./types";
import { clenpiqSutabPreps } from "./colonoscopy-clenpiq-sutab";
import { miralaxGolytelyPreps } from "./colonoscopy-miralax-golytely";
import { upperPreps } from "./upper";
import { otherPreps } from "./other";

export type { PrepDoc, PrepGroupId, PrepSection, PrepBlock } from "./types";

export const prepDocs: PrepDoc[] = [
  ...clenpiqSutabPreps,
  ...miralaxGolytelyPreps,
  ...upperPreps,
  ...otherPreps,
];

export type PrepGroup = {
  id: PrepGroupId;
  title: Bi;
  blurb: Bi;
  docs: PrepDoc[];
};

const groupMeta: Array<{ id: PrepGroupId; title: Bi; blurb: Bi }> = [
  {
    id: "colonoscopy",
    title: { en: "Colonoscopy preps", es: "Preparaciones para colonoscopia", vi: "Chuẩn bị nội soi đại tràng", ko: "대장 내시경 준비법", ar: "تحضيرات تنظير القولون" },
    blurb: {
      en: "Your care team prescribes ONE of these — the prep on your prescription or in your packet matches one sheet below.",
      es: "Su equipo de atención le receta UNA de estas — la preparación en su receta o en su paquete corresponde a una de las hojas siguientes.",
      vi: "Đội ngũ chăm sóc của quý vị chỉ kê MỘT trong các loại chuẩn bị này — loại ghi trong toa thuốc hoặc trong tập tài liệu của quý vị tương ứng với một hướng dẫn bên dưới.",
      ko: "담당 의료진은 이 중 한 가지만 처방합니다 — 처방전이나 안내 자료에 적힌 준비법이 아래 안내문 중 하나에 해당합니다.",
      ar: "يصف لك فريق الرعاية واحدًا فقط من هذه التحضيرات — التحضير المذكور في وصفتك الطبية أو في ملفك يطابق إحدى النشرات أدناه.",
    },
  },
  {
    id: "upper",
    title: {
      en: "Upper endoscopy",
      es: "Endoscopia superior",
      vi: "Nội soi đường tiêu hóa trên",
      ko: "상부 위장관 내시경",
      ar: "التنظير العلوي",
    },
    blurb: {
      en: "EGD and the studies performed with it.",
      es: "EGD y los estudios que se realizan con ella.",
      vi: "EGD và các nghiên cứu được thực hiện kèm theo.",
      ko: "EGD 및 이와 함께 시행되는 검사들입니다.",
      ar: "EGD والدراسات التي تُجرى معه.",
    },
  },
  {
    id: "capsule",
    title: { en: "Capsule endoscopy", es: "Cápsula endoscópica", vi: "Nội soi viên nang", ko: "캡슐 내시경", ar: "التنظير بالكبسولة" },
    blurb: {
      en: "The swallowed-camera small bowel study.",
      es: "El estudio del intestino delgado con cámara ingerible.",
      vi: "Nghiên cứu ruột non bằng camera dạng viên nang nuốt được.",
      ko: "카메라를 삼켜서 진행하는 소장 검사입니다.",
      ar: "دراسة الأمعاء الدقيقة بكاميرا تُبتلع.",
    },
  },
  {
    id: "sigmoidoscopy",
    title: { en: "Sigmoidoscopy", es: "Sigmoidoscopia", vi: "Nội soi đại tràng sigma", ko: "에스결장 내시경", ar: "تنظير القولون السيني" },
    blurb: {
      en: "A shorter lower exam with a simpler prep.",
      es: "Un examen inferior más corto con una preparación más sencilla.",
      vi: "Kiểm tra đường tiêu hóa dưới ngắn hơn, với cách chuẩn bị đơn giản hơn.",
      ko: "더 간단한 준비로 진행되는 더 짧은 하부 위장관 검사입니다.",
      ar: "فحص سفلي أقصر مع تحضير أبسط.",
    },
  },
  {
    id: "diet",
    title: { en: "Diet guidelines", es: "Guías de dieta", vi: "Hướng dẫn chế độ ăn", ko: "식이 지침", ar: "إرشادات النظام الغذائي" },
    blurb: {
      en: "Handouts your physician may give you alongside a procedure.",
      es: "Hojas que su médico puede entregarle junto con un procedimiento.",
      vi: "Tài liệu mà bác sĩ của quý vị có thể đưa kèm theo một thủ thuật.",
      ko: "담당 의사가 시술과 함께 제공해 드릴 수 있는 안내문입니다.",
      ar: "نشرات قد يسلّمها لك طبيبك مع أحد الإجراءات.",
    },
  },
];

export const prepGroups: PrepGroup[] = groupMeta.map((g) => ({
  ...g,
  docs: prepDocs.filter((d) => d.group === g.id),
}));

export function getPrep(slug: string): PrepDoc | undefined {
  return prepDocs.find((d) => d.slug === slug);
}

/** Prep page for a document-registry id, if one exists (mirrors
 *  education's topicForDocument). */
export function prepForDocument(docId: string): PrepDoc | undefined {
  return prepDocs.find((d) => d.docId === docId);
}
