// Patient resource links. Every URL verified live 2026-07-04 (recon link
// audit or manual fetch). Changes from the old Links page:
// - ccfa.org (unreachable; the foundation renamed) -> crohnscolitisfoundation.org
// - the 17-topic ASGE library the old vendor hosted -> ASGE's own patient hub
// liverfoundation.org and crohnscolitisfoundation.org block automated
// requests (HTTP 403) but load normally in a browser; both are the
// organizations' canonical domains.

import type { Bi } from "./content/types";

export type ResourceLink = {
  topic: Bi;
  org: string;
  url: string;
  description: Bi;
};

export const patientResources: ResourceLink[] = [
  {
    topic: { en: "Irritable Bowel Syndrome", es: "Síndrome del intestino irritable", vi: "Hội chứng ruột kích thích", ko: "과민성 대장 증후군", ar: "متلازمة القولون العصبي" },
    org: "International Foundation for Gastrointestinal Disorders",
    url: "https://www.iffgd.org",
    description: {
      en: "Information on irritable bowel syndrome, bloating, and many other GI disorders where the function of the bowel is involved.",
      es: "Información sobre el síndrome del intestino irritable, la distensión abdominal y muchos otros trastornos funcionales del aparato digestivo.",
      vi: "Thông tin về hội chứng ruột kích thích, chướng bụng và nhiều rối loạn tiêu hóa khác liên quan đến chức năng của ruột.",
      ko: "과민성 대장 증후군, 복부 팽만감을 비롯해 장 기능과 관련된 다양한 소화기 질환에 대한 정보를 제공합니다.",
      ar: "معلومات عن متلازمة القولون العصبي والانتفاخ والعديد من اضطرابات الجهاز الهضمي الأخرى التي تتعلق بوظيفة الأمعاء.",
    },
  },
  {
    topic: { en: "Inflammatory Bowel Disease", es: "Enfermedad inflamatoria intestinal", vi: "Bệnh viêm ruột", ko: "염증성 장 질환", ar: "داء الأمعاء الالتهابي" },
    org: "Crohn's & Colitis Foundation",
    url: "https://www.crohnscolitisfoundation.org",
    description: {
      en: "A very helpful resource for patients with Crohn's disease and ulcerative colitis.",
      es: "Un recurso muy útil para pacientes con enfermedad de Crohn y colitis ulcerosa.",
      vi: "Nguồn thông tin rất hữu ích cho bệnh nhân mắc bệnh Crohn và viêm loét đại tràng.",
      ko: "크론병과 궤양성 대장염 환자에게 매우 유용한 자료입니다.",
      ar: "مصدر مفيد جدًا لمرضى داء كرون والتهاب القولون التقرحي.",
    },
  },
  {
    topic: { en: "Liver Disease", es: "Enfermedad hepática", vi: "Bệnh gan", ko: "간 질환", ar: "أمراض الكبد" },
    org: "American Liver Foundation",
    url: "https://www.liverfoundation.org",
    description: {
      en: "Information on many different liver conditions.",
      es: "Información sobre una gran variedad de enfermedades del hígado.",
      vi: "Thông tin về nhiều bệnh lý gan khác nhau.",
      ko: "다양한 간 질환에 대한 정보를 제공합니다.",
      ar: "معلومات عن العديد من أمراض الكبد المختلفة.",
    },
  },
  {
    topic: { en: "Hemochromatosis", es: "Hemocromatosis", vi: "Bệnh nhiễm sắc tố sắt mô (hemochromatosis)", ko: "혈색소증", ar: "داء ترسب الأصبغة الدموية" },
    org: "Iron Overload Disease Association",
    url: "https://www.ironoverload.org",
    description: {
      en: "Information about hemochromatosis and iron overload.",
      es: "Información sobre la hemocromatosis y la sobrecarga de hierro.",
      vi: "Thông tin về bệnh nhiễm sắc tố sắt mô (hemochromatosis) và tình trạng quá tải sắt.",
      ko: "혈색소증과 철분 과잉에 대한 정보를 제공합니다.",
      ar: "معلومات عن داء ترسب الأصبغة الدموية وفرط حمل الحديد.",
    },
  },
  {
    topic: { en: "Celiac Disease", es: "Enfermedad celíaca", vi: "Bệnh Celiac", ko: "셀리악병", ar: "الداء البطني (السيلياك)" },
    org: "Celiac.com",
    url: "https://www.celiac.com",
    description: {
      en: "Helpful information regarding celiac disease and dietary needs.",
      es: "Información útil sobre la enfermedad celíaca y las necesidades dietéticas.",
      vi: "Thông tin hữu ích về bệnh Celiac và các nhu cầu về chế độ ăn.",
      ko: "셀리악병과 식이 요구 사항에 관한 유용한 정보를 제공합니다.",
      ar: "معلومات مفيدة عن الداء البطني (السيلياك) والاحتياجات الغذائية.",
    },
  },
  {
    topic: { en: "Ostomy", es: "Ostomía", vi: "Lỗ mở thông (ostomy)", ko: "장루·요루", ar: "الفغرة" },
    org: "United Ostomy Associations",
    url: "https://www.uoa.org",
    description: {
      en: "Information on intestinal and urinary ostomies.",
      es: "Información sobre ostomías intestinales y urinarias.",
      vi: "Thông tin về lỗ mở thông ruột và lỗ mở thông đường tiết niệu.",
      ko: "장루 및 요루에 대한 정보를 제공합니다.",
      ar: "معلومات عن الفغرات المعوية والبولية.",
    },
  },
];

export const professionalOrgs = [
  { name: "American College of Gastroenterology", url: "https://gi.org" },
  { name: "American Society for Gastrointestinal Endoscopy", url: "https://www.asge.org" },
  { name: "American Gastroenterological Association", url: "https://www.gastro.org" },
];

// ASGE's public patient hub replaces the vendor-hosted article library.
export const patientEducation = {
  url: "https://www.asge.org/home/for-patients",
  conditionsUrl: "https://www.asge.org/home/for-patients/conditions",
  proceduresUrl: "https://www.asge.org/home/for-patients/procedures",
};
