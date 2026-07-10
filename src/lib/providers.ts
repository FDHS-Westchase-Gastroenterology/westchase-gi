// Provider roster + profile content with VERBATIM credentials (practice
// directive: titles are specific and must not be changed). Sources: the
// practice's own door sign, its published provider card graphics (whose text
// is transcribed below, faithfully), the nurse-practitioner brochure, and the
// practice's 2026-07-06 correction: Awad is MD only (never FACG); Chang is
// MD, FACG; Mendoza is MD, MS (never FACG). Credential LINES follow the door
// sign + correction even where a card graphic differs (Chang's card adds
// FACP; Mendoza's card says MHSc) — bio prose keeps the practice's own
// claims as published.
//
// All display text is real, localizable type (client requirement 2026-07-07:
// graphic-borne text must follow the site language). The original card
// graphics stay in /images/staff/ byte-exact and open in a same-page
// lightbox from each profile (ProfileCardViewer); the clean headshots are
// derived from the practice's own photo set (originals preserved in the
// project's assets archive).

import type { Bi } from "./content/types";

type Img = { src: string; width: number; height: number };

export type ProfileSection =
  | { kind: "timeline"; heading: Bi; entries: Array<{ title: Bi; detail: Bi }> }
  | { kind: "list"; heading: Bi; lead?: Bi; items: Bi[] }
  | { kind: "paragraphs"; heading: Bi; text: Bi[] };

export type Physician = {
  id: string;
  name: string;
  /** Verbatim, identical in every language (practice directive). */
  credentials: string;
  /** Direct Google write-review link for THIS physician's own listing
   * (each doctor has a separate place ID; liveness-verified 2026-07-05). */
  googleReview: string;
  role: Bi;
  experience: Bi;
  boardCertified: Bi[];
  languagesSpoken: Bi;
  intro: Bi[];
  sections: ProfileSection[];
  quote: Bi | null;
  headshot: Img;
  /** The practice's own published card graphic, byte-exact, shown in the in-page viewer. */
  card: Img;
  alt: Bi;
};

export const physicians: Physician[] = [
  {
    id: "john-chang",
    name: "John Chang",
    credentials: "MD, FACG",
    googleReview: "https://search.google.com/local/writereview?placeid=ChIJ1XxEt_TqwogRwXffFfsFWf0",
    role: {
      en: "Gastroenterologist",
      es: "Gastroenterólogo",
      vi: "Bác sĩ chuyên khoa tiêu hóa",
      ko: "소화기내과 전문의",
      ar: "أخصائي أمراض الجهاز الهضمي",
    },
    experience: {
      en: "30+ years of experience",
      es: "Más de 30 años de experiencia",
      vi: "Hơn 30 năm kinh nghiệm",
      ko: "30년 이상의 경력",
      ar: "أكثر من 30 عامًا من الخبرة",
    },
    boardCertified: [
      {
        en: "Internal Medicine",
        es: "Medicina Interna",
        vi: "Nội khoa",
        ko: "내과",
        ar: "الطب الباطني",
      },
      {
        en: "Gastroenterology",
        es: "Gastroenterología",
        vi: "Tiêu hóa",
        ko: "소화기내과",
        ar: "أمراض الجهاز الهضمي",
      },
    ],
    languagesSpoken: {
      en: "English & Korean",
      es: "Inglés y coreano",
      vi: "Tiếng Anh và tiếng Hàn",
      ko: "영어와 한국어",
      ar: "الإنجليزية والكورية",
    },
    intro: [
      {
        en: "Dr. John Chang has been practicing gastroenterology in Florida for more than 30 years. He is board-certified in Gastroenterology and Internal Medicine and is a Fellow of both the American College of Physicians (FACP) and the American College of Gastroenterology (FACG).",
        es: "El Dr. John Chang ejerce la gastroenterología en Florida desde hace más de 30 años. Está certificado por la junta en Gastroenterología y Medicina Interna, y es Fellow del American College of Physicians (FACP) y del American College of Gastroenterology (FACG).",
        vi: "Bác sĩ John Chang đã hành nghề chuyên khoa tiêu hóa tại Florida hơn 30 năm. Ông được hội đồng chuyên khoa chứng nhận về Tiêu hóa và Nội khoa, đồng thời là Fellow của cả American College of Physicians (FACP) và American College of Gastroenterology (FACG).",
        ko: "John Chang 박사는 30년 넘게 플로리다에서 소화기내과 진료를 해왔습니다. 소화기내과와 내과 전문의 자격을 보유하고 있으며, American College of Physicians(FACP)와 American College of Gastroenterology(FACG) 두 곳의 펠로우(Fellow)입니다.",
        ar: "يمارس الدكتور John Chang طب الجهاز الهضمي في فلوريدا منذ أكثر من 30 عامًا. وهو حاصل على شهادة البورد في أمراض الجهاز الهضمي والطب الباطني، وزميل (Fellow) في كل من American College of Physicians (FACP) وAmerican College of Gastroenterology (FACG).",
      },
      {
        en: "Since relocating his practice to the Tampa Bay area in 2007, Dr. Chang has remained committed to providing compassionate, patient-centered care and delivering the highest standards of digestive health services to the community.",
        es: "Desde que trasladó su consulta al área de Tampa Bay en 2007, el Dr. Chang mantiene su compromiso de brindar una atención compasiva y centrada en el paciente, con los más altos estándares de salud digestiva para la comunidad.",
        vi: "Kể từ khi chuyển phòng khám đến khu vực Tampa Bay vào năm 2007, bác sĩ Chang luôn cam kết mang đến sự chăm sóc tận tâm, lấy bệnh nhân làm trung tâm và cung cấp các dịch vụ sức khỏe tiêu hóa theo tiêu chuẩn cao nhất cho cộng đồng.",
        ko: "2007년 탬파베이 지역으로 진료지를 옮긴 이후, Chang 박사는 따뜻하고 환자 중심적인 진료와 함께 최고 수준의 소화기 건강 서비스를 지역사회에 제공하는 데 변함없이 헌신하고 있습니다.",
        ar: "منذ نقل عيادته إلى منطقة خليج تامبا في عام 2007، ظل الدكتور Chang ملتزمًا بتقديم رعاية رحيمة محورها المريض وبتوفير أعلى معايير خدمات صحة الجهاز الهضمي للمجتمع.",
      },
    ],
    sections: [
      {
        kind: "timeline",
        heading: {
          en: "Education & training",
          es: "Educación y formación",
          vi: "Học vấn và đào tạo",
          ko: "학력 및 수련",
          ar: "التعليم والتدريب",
        },
        entries: [
          {
            title: {
              en: "Columbia University · Birmingham-Southern College",
              es: "Columbia University · Birmingham-Southern College",
              vi: "Columbia University · Birmingham-Southern College",
              ko: "Columbia University · Birmingham-Southern College",
              ar: "Columbia University · Birmingham-Southern College",
            },
            detail: {
              en: "Undergraduate studies in New York; Bachelor of Science in Birmingham, AL.",
              es: "Estudios universitarios en Nueva York; Bachelor of Science en Birmingham, AL.",
              vi: "Học chương trình đại học tại New York; nhận bằng Bachelor of Science tại Birmingham, AL.",
              ko: "뉴욕에서 학부 과정을 마쳤으며, Birmingham, AL에서 이학 학사(Bachelor of Science)를 취득했습니다.",
              ar: "دراسات جامعية في نيويورك؛ وبكالوريوس العلوم من Birmingham, AL.",
            },
          },
          {
            title: {
              en: "University of South Alabama College of Medicine",
              es: "University of South Alabama College of Medicine",
              vi: "University of South Alabama College of Medicine",
              ko: "University of South Alabama College of Medicine",
              ar: "University of South Alabama College of Medicine",
            },
            detail: {
              en: "Earned his medical degree in Mobile, AL.",
              es: "Obtuvo su título de médico en Mobile, AL.",
              vi: "Tốt nghiệp bác sĩ y khoa tại Mobile, AL.",
              ko: "Mobile, AL에서 의학 학위를 취득했습니다.",
              ar: "حصل على شهادته في الطب في Mobile, AL.",
            },
          },
          {
            title: {
              en: "St. Vincent's Medical Center, New York",
              es: "St. Vincent's Medical Center, Nueva York",
              vi: "St. Vincent's Medical Center, New York",
              ko: "St. Vincent's Medical Center, 뉴욕",
              ar: "St. Vincent's Medical Center، نيويورك",
            },
            detail: {
              en: "Internship and residency training in Internal Medicine.",
              es: "Internado y residencia en Medicina Interna.",
              vi: "Chương trình thực tập và nội trú về Nội khoa.",
              ko: "내과 인턴 및 레지던트 수련.",
              ar: "تدريب الامتياز والإقامة الطبية في الطب الباطني.",
            },
          },
          {
            title: {
              en: "Nassau University Medical Center, Long Island",
              es: "Nassau University Medical Center, Long Island",
              vi: "Nassau University Medical Center, Long Island",
              ko: "Nassau University Medical Center, 롱아일랜드",
              ar: "Nassau University Medical Center، لونغ آيلاند",
            },
            detail: {
              en: "Fellowship training in Gastroenterology.",
              es: "Fellowship (subespecialización) en Gastroenterología.",
              vi: "Đào tạo Fellowship (chuyên khoa sâu) về Tiêu hóa.",
              ko: "소화기내과 펠로우십(전임의) 수련.",
              ar: "تدريب الزمالة (Fellowship) في أمراض الجهاز الهضمي.",
            },
          },
        ],
      },
      {
        kind: "list",
        heading: {
          en: "Expert care for a wide range of conditions",
          es: "Atención experta para una amplia gama de condiciones",
          vi: "Chăm sóc chuyên sâu cho nhiều bệnh lý khác nhau",
          ko: "다양한 질환에 대한 전문적인 진료",
          ar: "رعاية متخصصة لمجموعة واسعة من الحالات",
        },
        items: [
          {
            en: "Acid reflux & GERD",
            es: "Reflujo ácido y ERGE",
            vi: "Trào ngược axit và GERD",
            ko: "위산 역류 및 위식도 역류질환(GERD)",
            ar: "الارتجاع الحمضي والارتجاع المعدي المريئي (GERD)",
          },
          {
            en: "Irritable bowel syndrome (IBS)",
            es: "Síndrome del intestino irritable (SII)",
            vi: "Hội chứng ruột kích thích (IBS)",
            ko: "과민성 대장 증후군(IBS)",
            ar: "متلازمة القولون العصبي (IBS)",
          },
          {
            en: "Crohn's disease & ulcerative colitis",
            es: "Enfermedad de Crohn y colitis ulcerosa",
            vi: "Bệnh Crohn và viêm loét đại tràng",
            ko: "크론병 및 궤양성 대장염",
            ar: "داء كرون والتهاب القولون التقرحي",
          },
          {
            en: "Liver diseases",
            es: "Enfermedades del hígado",
            vi: "Các bệnh về gan",
            ko: "간질환",
            ar: "أمراض الكبد",
          },
          {
            en: "Colon polyps & colorectal cancer screening",
            es: "Pólipos de colon y detección del cáncer colorrectal",
            vi: "Polyp đại tràng và tầm soát ung thư đại trực tràng",
            ko: "대장 용종 및 대장암 검진",
            ar: "سلائل القولون والكشف عن سرطان القولون والمستقيم",
          },
          {
            en: "Hepatitis & pancreatic disorders",
            es: "Hepatitis y trastornos del páncreas",
            vi: "Viêm gan và các rối loạn tuyến tụy",
            ko: "간염 및 췌장 질환",
            ar: "التهاب الكبد واضطرابات البنكرياس",
          },
          {
            en: "Constipation, diarrhea & more",
            es: "Estreñimiento, diarrea y más",
            vi: "Táo bón, tiêu chảy và nhiều vấn đề khác",
            ko: "변비, 설사 등",
            ar: "الإمساك والإسهال وغير ذلك",
          },
        ],
      },
    ],
    quote: null,
    headshot: { src: "/images/staff/headshots/dr-chang.jpg", width: 880, height: 1161 },
    card: { src: "/images/staff/dr-chang.png", width: 1024, height: 1535 },
    alt: {
      en: "Dr. John Chang, MD, FACG, gastroenterologist at Westchase Gastroenterology",
      es: "Dr. John Chang, MD, FACG, gastroenterólogo de Westchase Gastroenterology",
      vi: "Bác sĩ John Chang, MD, FACG, bác sĩ chuyên khoa tiêu hóa tại Westchase Gastroenterology",
      ko: "Westchase Gastroenterology의 소화기내과 전문의 John Chang, MD, FACG",
      ar: "الدكتور John Chang، MD, FACG، أخصائي أمراض الجهاز الهضمي في Westchase Gastroenterology",
    },
  },
  {
    id: "amir-awad",
    name: "Amir Awad",
    credentials: "MD",
    googleReview: "https://search.google.com/local/writereview?placeid=ChIJ1XxEt_TqwogRejiysvVdwqc",
    role: {
      en: "Gastroenterologist",
      es: "Gastroenterólogo",
      vi: "Bác sĩ chuyên khoa tiêu hóa",
      ko: "소화기내과 전문의",
      ar: "أخصائي أمراض الجهاز الهضمي",
    },
    experience: {
      en: "20+ years of experience",
      es: "Más de 20 años de experiencia",
      vi: "Hơn 20 năm kinh nghiệm",
      ko: "20년 이상의 경력",
      ar: "أكثر من 20 عامًا من الخبرة",
    },
    boardCertified: [
      {
        en: "Internal Medicine",
        es: "Medicina Interna",
        vi: "Nội khoa",
        ko: "내과",
        ar: "الطب الباطني",
      },
      {
        en: "Gastroenterology",
        es: "Gastroenterología",
        vi: "Tiêu hóa",
        ko: "소화기내과",
        ar: "أمراض الجهاز الهضمي",
      },
    ],
    languagesSpoken: {
      en: "English & Arabic",
      es: "Inglés y árabe",
      vi: "Tiếng Anh và tiếng Ả Rập",
      ko: "영어와 아랍어",
      ar: "الإنجليزية والعربية",
    },
    intro: [
      {
        en: "Dr. Amir Awad is a board-certified gastroenterologist dedicated to providing exceptional, state-of-the-art care to patients across the Tampa Bay area, with specialty fellowship training in Endoscopic Ultrasound and ERCP at Beth Israel Medical Center, New York.",
        es: "El Dr. Amir Awad es un gastroenterólogo certificado por la junta, dedicado a brindar una atención excepcional y de vanguardia a los pacientes del área de Tampa Bay, con formación de subespecialidad en Ultrasonido Endoscópico y CPRE en el Beth Israel Medical Center de Nueva York.",
        vi: "Bác sĩ Amir Awad là bác sĩ tiêu hóa được hội đồng chuyên khoa chứng nhận, tận tâm mang đến sự chăm sóc xuất sắc và hiện đại cho bệnh nhân trên khắp khu vực Tampa Bay, với chương trình đào tạo chuyên khoa sâu (fellowship) về Siêu âm nội soi và ERCP tại Beth Israel Medical Center, New York.",
        ko: "Amir Awad 박사는 소화기내과 전문의로서 탬파베이 지역 전역의 환자들에게 탁월한 최첨단 진료를 제공하는 데 전념하고 있으며, 뉴욕의 Beth Israel Medical Center에서 내시경 초음파와 ERCP 분야의 전문 펠로우십 수련을 받았습니다.",
        ar: "الدكتور Amir Awad أخصائي أمراض جهاز هضمي حاصل على شهادة البورد، يكرّس جهوده لتقديم رعاية استثنائية وفق أحدث المعايير للمرضى في جميع أنحاء منطقة خليج تامبا، وقد أتم تدريب الزمالة التخصصي في الموجات فوق الصوتية بالمنظار (EUS) وتنظير القنوات الصفراوية والبنكرياسية بالطريق الراجع (ERCP) في Beth Israel Medical Center في نيويورك.",
      },
    ],
    sections: [
      {
        kind: "timeline",
        heading: {
          en: "Leadership & innovation",
          es: "Liderazgo e innovación",
          vi: "Vai trò lãnh đạo và đổi mới",
          ko: "리더십과 혁신",
          ar: "القيادة والابتكار",
        },
        entries: [
          {
            title: {
              en: "2006 — Bronx Lebanon Hospital",
              es: "2006 — Bronx Lebanon Hospital",
              vi: "2006 — Bronx Lebanon Hospital",
              ko: "2006 — Bronx Lebanon Hospital",
              ar: "2006 — Bronx Lebanon Hospital",
            },
            detail: {
              en: "Started the hospital's Endoscopic Ultrasound program, pioneering advanced diagnostic capabilities.",
              es: "Fundó el programa de Ultrasonido Endoscópico del hospital, siendo pionero en capacidades diagnósticas avanzadas.",
              vi: "Sáng lập chương trình Siêu âm nội soi của bệnh viện, tiên phong trong các năng lực chẩn đoán tiên tiến.",
              ko: "병원의 내시경 초음파 프로그램을 신설하여 첨단 진단 역량의 기틀을 마련했습니다.",
              ar: "أسس برنامج الموجات فوق الصوتية بالمنظار في المستشفى، رائدًا في تطوير قدرات تشخيصية متقدمة.",
            },
          },
          {
            title: {
              en: "2009 — Tampa",
              es: "2009 — Tampa",
              vi: "2009 — Tampa",
              ko: "2009 — 탬파",
              ar: "2009 — تامبا",
            },
            detail: {
              en: "Introduced Endoscopic Ultrasound technology to Town and Country Hospital, where he continues to practice today.",
              es: "Introdujo la tecnología de Ultrasonido Endoscópico en el Town and Country Hospital, donde continúa ejerciendo hoy.",
              vi: "Đưa công nghệ Siêu âm nội soi đến Town and Country Hospital, nơi ông vẫn đang hành nghề cho đến nay.",
              ko: "Town and Country Hospital에 내시경 초음파 기술을 도입했으며, 현재까지 그곳에서 진료를 이어가고 있습니다.",
              ar: "أدخل تقنية الموجات فوق الصوتية بالمنظار إلى Town and Country Hospital، حيث يواصل ممارسة الطب حتى اليوم.",
            },
          },
          {
            title: {
              en: "Today",
              es: "Hoy",
              vi: "Hiện nay",
              ko: "현재",
              ar: "اليوم",
            },
            detail: {
              en: "Proudly serving the Tampa Bay community with advanced, compassionate gastroenterological care.",
              es: "Sirviendo con orgullo a la comunidad de Tampa Bay con atención gastroenterológica avanzada y compasiva.",
              vi: "Tự hào phục vụ cộng đồng Tampa Bay với dịch vụ chăm sóc tiêu hóa tiên tiến và tận tâm.",
              ko: "첨단 기술과 따뜻한 마음으로 탬파베이 지역사회에 소화기 진료를 제공하고 있음을 자랑스럽게 생각합니다.",
              ar: "يفخر بخدمة مجتمع خليج تامبا برعاية متقدمة ورحيمة في أمراض الجهاز الهضمي.",
            },
          },
        ],
      },
      {
        kind: "list",
        heading: {
          en: "Comprehensive expertise",
          es: "Experiencia integral",
          vi: "Chuyên môn toàn diện",
          ko: "포괄적인 전문 분야",
          ar: "خبرة شاملة",
        },
        lead: {
          en: "Dr. Awad specializes in a full range of gastroenterological services, including:",
          es: "El Dr. Awad se especializa en una gama completa de servicios gastroenterológicos, que incluye:",
          vi: "Bác sĩ Awad chuyên về đầy đủ các dịch vụ tiêu hóa, bao gồm:",
          ko: "Awad 박사는 다음을 포함한 모든 범위의 소화기 진료를 전문으로 합니다.",
          ar: "يتخصص الدكتور Awad في مجموعة كاملة من خدمات الجهاز الهضمي، بما في ذلك:",
        },
        items: [
          {
            en: "Endoscopic ultrasound (EUS)",
            es: "Ultrasonido endoscópico (EUS)",
            vi: "Siêu âm nội soi (EUS)",
            ko: "내시경 초음파(EUS)",
            ar: "الموجات فوق الصوتية بالمنظار (EUS)",
          },
          {
            en: "ERCP",
            es: "CPRE",
            vi: "ERCP (nội soi mật tụy ngược dòng)",
            ko: "ERCP(내시경 역행 담췌관 조영술)",
            ar: "ERCP (تنظير القنوات الصفراوية والبنكرياسية بالطريق الراجع)",
          },
          {
            en: "Pancreatic & biliary disorders",
            es: "Trastornos pancreáticos y biliares",
            vi: "Các rối loạn tuyến tụy và đường mật",
            ko: "췌장 및 담도 질환",
            ar: "اضطرابات البنكرياس والقنوات الصفراوية",
          },
          {
            en: "Liver diseases",
            es: "Enfermedades del hígado",
            vi: "Các bệnh về gan",
            ko: "간질환",
            ar: "أمراض الكبد",
          },
          {
            en: "Inflammatory bowel disease",
            es: "Enfermedad inflamatoria intestinal",
            vi: "Bệnh viêm ruột",
            ko: "염증성 장질환",
            ar: "داء الأمعاء الالتهابي",
          },
          {
            en: "Colonoscopy & colon cancer screening",
            es: "Colonoscopia y detección del cáncer de colon",
            vi: "Nội soi đại tràng và tầm soát ung thư đại tràng",
            ko: "대장내시경 및 대장암 검진",
            ar: "تنظير القولون والكشف عن سرطان القولون",
          },
          {
            en: "GERD & acid reflux",
            es: "ERGE y reflujo ácido",
            vi: "GERD và trào ngược axit",
            ko: "위식도 역류질환(GERD) 및 위산 역류",
            ar: "الارتجاع المعدي المريئي (GERD) والارتجاع الحمضي",
          },
          {
            en: "General gastroenterology",
            es: "Gastroenterología general",
            vi: "Tiêu hóa tổng quát",
            ko: "일반 소화기내과",
            ar: "أمراض الجهاز الهضمي العامة",
          },
        ],
      },
      {
        kind: "paragraphs",
        heading: {
          en: "Beyond medicine",
          es: "Más allá de la medicina",
          vi: "Ngoài công việc y khoa",
          ko: "의료 활동 그 너머",
          ar: "خارج نطاق الطب",
        },
        text: [
          {
            en: "Dr. Awad is a devoted husband and proud father of three children. He enjoys fishing with his family and values time spent together.",
            es: "El Dr. Awad es un esposo dedicado y padre orgulloso de tres hijos. Disfruta pescar con su familia y valora el tiempo que pasan juntos.",
            vi: "Bác sĩ Awad là một người chồng tận tụy và người cha tự hào của ba người con. Ông thích đi câu cá cùng gia đình và trân trọng thời gian bên nhau.",
            ko: "Awad 박사는 헌신적인 남편이자 세 자녀를 둔 자랑스러운 아버지입니다. 가족과 함께 낚시를 즐기며 함께 보내는 시간을 소중히 여깁니다.",
            ar: "الدكتور Awad زوج مخلص وأب فخور لثلاثة أطفال. يستمتع بصيد الأسماك مع عائلته ويقدّر الوقت الذي يقضونه معًا.",
          },
          {
            en: "He is passionate about serving others both locally and globally: he has volunteered in numerous medical missions and charity clinics around the world, providing care to underserved communities in regions including Africa and South America.",
            es: "Le apasiona servir a los demás tanto a nivel local como global: ha sido voluntario en numerosas misiones médicas y clínicas benéficas alrededor del mundo, brindando atención a comunidades desatendidas en regiones como África y Sudamérica.",
            vi: "Ông có niềm đam mê phục vụ mọi người cả ở địa phương lẫn trên toàn cầu: ông đã tình nguyện tham gia nhiều đoàn công tác y tế và phòng khám từ thiện trên khắp thế giới, chăm sóc các cộng đồng thiếu điều kiện y tế ở các khu vực bao gồm châu Phi và Nam Mỹ.",
            ko: "그는 지역사회와 전 세계에서 타인을 위해 봉사하는 데 열정을 갖고 있습니다. 전 세계 곳곳의 수많은 의료 봉사단과 자선 진료소에서 자원봉사를 하며 아프리카와 남미를 포함한 여러 지역의 의료 소외 계층에게 진료를 제공해 왔습니다.",
            ar: "وهو شغوف بخدمة الآخرين محليًا وعالميًا: فقد تطوع في العديد من البعثات الطبية والعيادات الخيرية حول العالم، مقدّمًا الرعاية للمجتمعات المحرومة في مناطق تشمل إفريقيا وأمريكا الجنوبية.",
          },
        ],
      },
    ],
    quote: {
      en: "My goal is to combine advanced technology with compassionate care to deliver the best possible outcomes for every patient.",
      es: "Mi objetivo es combinar tecnología avanzada con atención compasiva para lograr los mejores resultados posibles para cada paciente.",
      vi: "Mục tiêu của tôi là kết hợp công nghệ tiên tiến với sự chăm sóc tận tâm để mang lại kết quả tốt nhất có thể cho mỗi bệnh nhân.",
      ko: "저의 목표는 첨단 기술과 따뜻한 진료를 결합하여 모든 환자에게 가능한 최선의 결과를 드리는 것입니다.",
      ar: "هدفي هو الجمع بين التقنية المتقدمة والرعاية الرحيمة لتحقيق أفضل النتائج الممكنة لكل مريض.",
    },
    headshot: { src: "/images/staff/headshots/dr-awad.jpg", width: 880, height: 1155 },
    card: { src: "/images/staff/dr-awad.png", width: 1024, height: 1535 },
    alt: {
      en: "Dr. Amir Awad, MD, gastroenterologist at Westchase Gastroenterology",
      es: "Dr. Amir Awad, MD, gastroenterólogo de Westchase Gastroenterology",
      vi: "Bác sĩ Amir Awad, MD, bác sĩ chuyên khoa tiêu hóa tại Westchase Gastroenterology",
      ko: "Westchase Gastroenterology의 소화기내과 전문의 Amir Awad, MD",
      ar: "الدكتور Amir Awad، MD، أخصائي أمراض الجهاز الهضمي في Westchase Gastroenterology",
    },
  },
  {
    id: "alfredo-mendoza",
    name: "Alfredo Mendoza",
    credentials: "MD, MS",
    googleReview: "https://search.google.com/local/writereview?placeid=ChIJ1XxEt_TqwogRzZ4Jiq8ZMlA",
    role: {
      en: "Gastroenterologist",
      es: "Gastroenterólogo",
      vi: "Bác sĩ chuyên khoa tiêu hóa",
      ko: "소화기내과 전문의",
      ar: "أخصائي أمراض الجهاز الهضمي",
    },
    experience: {
      en: "20+ years of experience",
      es: "Más de 20 años de experiencia",
      vi: "Hơn 20 năm kinh nghiệm",
      ko: "20년 이상의 경력",
      ar: "أكثر من 20 عامًا من الخبرة",
    },
    boardCertified: [
      {
        en: "Internal Medicine",
        es: "Medicina Interna",
        vi: "Nội khoa",
        ko: "내과",
        ar: "الطب الباطني",
      },
      {
        en: "Gastroenterology",
        es: "Gastroenterología",
        vi: "Tiêu hóa",
        ko: "소화기내과",
        ar: "أمراض الجهاز الهضمي",
      },
      {
        en: "Transplant Hepatology",
        es: "Hepatología de Trasplante",
        vi: "Gan học ghép tạng",
        ko: "이식 간장학",
        ar: "طب زراعة الكبد",
      },
    ],
    languagesSpoken: {
      en: "English & Spanish",
      es: "Inglés y español",
      vi: "Tiếng Anh và tiếng Tây Ban Nha",
      ko: "영어와 스페인어",
      ar: "الإنجليزية والإسبانية",
    },
    intro: [
      {
        en: "With more than 20 years of experience, Dr. Alfredo Mendoza provides comprehensive, state-of-the-art care for patients with gastrointestinal and liver diseases.",
        es: "Con más de 20 años de experiencia, el Dr. Alfredo Mendoza brinda una atención integral y de vanguardia a pacientes con enfermedades gastrointestinales y hepáticas.",
        vi: "Với hơn 20 năm kinh nghiệm, bác sĩ Alfredo Mendoza mang đến sự chăm sóc toàn diện và hiện đại cho bệnh nhân mắc các bệnh về đường tiêu hóa và gan.",
        ko: "20년이 넘는 경력을 지닌 Alfredo Mendoza 박사는 위장관 및 간질환 환자에게 포괄적인 최첨단 진료를 제공합니다.",
        ar: "بخبرة تزيد على 20 عامًا، يقدم الدكتور Alfredo Mendoza رعاية شاملة وفق أحدث المعايير للمرضى المصابين بأمراض الجهاز الهضمي والكبد.",
      },
    ],
    sections: [
      {
        kind: "timeline",
        heading: {
          en: "Education & training",
          es: "Educación y formación",
          vi: "Học vấn và đào tạo",
          ko: "학력 및 수련",
          ar: "التعليم والتدريب",
        },
        entries: [
          {
            title: {
              en: "Penn State Hershey Medical Center",
              es: "Penn State Hershey Medical Center",
              vi: "Penn State Hershey Medical Center",
              ko: "Penn State Hershey Medical Center",
              ar: "Penn State Hershey Medical Center",
            },
            detail: {
              en: "Internal Medicine residency and Gastroenterology fellowship in Hershey, Pennsylvania.",
              es: "Residencia en Medicina Interna y fellowship en Gastroenterología en Hershey, Pensilvania.",
              vi: "Nội trú Nội khoa và fellowship Tiêu hóa tại Hershey, Pennsylvania.",
              ko: "펜실베이니아주 Hershey에서 내과 레지던트 및 소화기내과 펠로우십 수련.",
              ar: "الإقامة الطبية في الطب الباطني والزمالة (Fellowship) في أمراض الجهاز الهضمي في Hershey، بنسلفانيا.",
            },
          },
          {
            title: {
              en: "Queen Elizabeth Hospital, United Kingdom",
              es: "Queen Elizabeth Hospital, Reino Unido",
              vi: "Queen Elizabeth Hospital, Vương quốc Anh",
              ko: "Queen Elizabeth Hospital, 영국",
              ar: "Queen Elizabeth Hospital، المملكة المتحدة",
            },
            detail: {
              en: "Hepatology fellowship in Birmingham, England.",
              es: "Fellowship en Hepatología en Birmingham, Inglaterra.",
              vi: "Fellowship về Gan học tại Birmingham, Anh.",
              ko: "잉글랜드 Birmingham에서 간장학 펠로우십 수련.",
              ar: "زمالة (Fellowship) في طب الكبد في Birmingham، إنجلترا.",
            },
          },
          {
            title: {
              en: "Penn State University",
              es: "Penn State University",
              vi: "Penn State University",
              ko: "Penn State University",
              ar: "Penn State University",
            },
            detail: {
              en: "Master of Science in Health Evaluation Sciences, University Park, Pennsylvania.",
              es: "Maestría en Ciencias de Evaluación de la Salud, University Park, Pensilvania.",
              vi: "Thạc sĩ Khoa học về Khoa học Đánh giá Sức khỏe, University Park, Pennsylvania.",
              ko: "펜실베이니아주 University Park에서 보건평가과학 이학 석사(Master of Science) 취득.",
              ar: "ماجستير العلوم في علوم تقييم الصحة، University Park، بنسلفانيا.",
            },
          },
        ],
      },
      {
        kind: "list",
        heading: {
          en: "Areas of expertise",
          es: "Áreas de especialización",
          vi: "Các lĩnh vực chuyên môn",
          ko: "전문 진료 분야",
          ar: "مجالات الخبرة",
        },
        items: [
          {
            en: "General gastroenterology",
            es: "Gastroenterología general",
            vi: "Tiêu hóa tổng quát",
            ko: "일반 소화기내과",
            ar: "أمراض الجهاز الهضمي العامة",
          },
          {
            en: "Colonoscopy and polyp removal",
            es: "Colonoscopia y extirpación de pólipos",
            vi: "Nội soi đại tràng và cắt polyp",
            ko: "대장내시경 및 용종 제거",
            ar: "تنظير القولون واستئصال السلائل",
          },
          {
            en: "GERD and acid reflux",
            es: "ERGE y reflujo ácido",
            vi: "GERD và trào ngược axit",
            ko: "위식도 역류질환(GERD) 및 위산 역류",
            ar: "الارتجاع المعدي المريئي (GERD) والارتجاع الحمضي",
          },
          {
            en: "Crohn's disease",
            es: "Enfermedad de Crohn",
            vi: "Bệnh Crohn",
            ko: "크론병",
            ar: "داء كرون",
          },
          {
            en: "Ulcerative colitis",
            es: "Colitis ulcerosa",
            vi: "Viêm loét đại tràng",
            ko: "궤양성 대장염",
            ar: "التهاب القولون التقرحي",
          },
          {
            en: "Liver diseases",
            es: "Enfermedades del hígado",
            vi: "Các bệnh về gan",
            ko: "간질환",
            ar: "أمراض الكبد",
          },
          {
            en: "Fatty liver disease",
            es: "Enfermedad de hígado graso",
            vi: "Bệnh gan nhiễm mỡ",
            ko: "지방간 질환",
            ar: "مرض الكبد الدهني",
          },
        ],
      },
      {
        kind: "list",
        heading: {
          en: "Professional highlights",
          es: "Aspectos profesionales destacados",
          vi: "Những điểm nổi bật trong sự nghiệp",
          ko: "주요 경력 사항",
          ar: "أبرز المحطات المهنية",
        },
        items: [
          {
            en: "Joined Westchase Gastroenterology from Tampa General Hospital",
            es: "Se unió a Westchase Gastroenterology procedente del Tampa General Hospital",
            vi: "Gia nhập Westchase Gastroenterology sau thời gian công tác tại Tampa General Hospital",
            ko: "Tampa General Hospital에서 근무한 뒤 Westchase Gastroenterology에 합류",
            ar: "انضم إلى Westchase Gastroenterology قادمًا من Tampa General Hospital",
          },
          {
            en: "Broad experience in the clinical management of complex gastrointestinal and liver conditions",
            es: "Amplia experiencia en el manejo clínico de condiciones gastrointestinales y hepáticas complejas",
            vi: "Kinh nghiệm sâu rộng trong điều trị lâm sàng các bệnh lý tiêu hóa và gan phức tạp",
            ko: "복잡한 위장관 및 간질환의 임상 관리에 대한 폭넓은 경험 보유",
            ar: "خبرة واسعة في الإدارة السريرية لحالات الجهاز الهضمي والكبد المعقدة",
          },
          {
            en: "Committed to delivering high-quality, compassionate care with excellent outcomes",
            es: "Comprometido con brindar una atención compasiva y de alta calidad, con excelentes resultados",
            vi: "Cam kết mang đến sự chăm sóc tận tâm, chất lượng cao với kết quả điều trị xuất sắc",
            ko: "우수한 치료 결과와 함께 수준 높고 따뜻한 진료를 제공하는 데 전념",
            ar: "ملتزم بتقديم رعاية رحيمة عالية الجودة مع نتائج ممتازة",
          },
        ],
      },
    ],
    quote: {
      en: "My goal is to provide the highest quality care with compassion, integrity, and respect — helping each patient achieve better health and a better quality of life.",
      es: "Mi objetivo es brindar la más alta calidad de atención con compasión, integridad y respeto, ayudando a cada paciente a lograr mejor salud y mejor calidad de vida.",
      vi: "Mục tiêu của tôi là mang đến sự chăm sóc chất lượng cao nhất với lòng tận tâm, chính trực và tôn trọng — giúp mỗi bệnh nhân đạt được sức khỏe tốt hơn và chất lượng cuộc sống tốt hơn.",
      ko: "저의 목표는 연민과 정직, 존중을 바탕으로 최고 수준의 진료를 제공하여 모든 환자가 더 나은 건강과 더 나은 삶의 질을 누리도록 돕는 것입니다.",
      ar: "هدفي هو تقديم رعاية بأعلى مستويات الجودة مع الرحمة والنزاهة والاحترام — لمساعدة كل مريض على تحقيق صحة أفضل وجودة حياة أفضل.",
    },
    headshot: { src: "/images/staff/headshots/dr-mendoza.jpg", width: 880, height: 1141 },
    card: { src: "/images/staff/dr-mendoza.png", width: 922, height: 1382 },
    alt: {
      en: "Dr. Alfredo Mendoza, MD, MS, gastroenterologist at Westchase Gastroenterology",
      es: "Dr. Alfredo Mendoza, MD, MS, gastroenterólogo de Westchase Gastroenterology",
      vi: "Bác sĩ Alfredo Mendoza, MD, MS, bác sĩ chuyên khoa tiêu hóa tại Westchase Gastroenterology",
      ko: "Westchase Gastroenterology의 소화기내과 전문의 Alfredo Mendoza, MD, MS",
      ar: "الدكتور Alfredo Mendoza، MD, MS، أخصائي أمراض الجهاز الهضمي في Westchase Gastroenterology",
    },
  },
];

export type NursePractitioner = {
  id: string;
  name: string;
  credentials: string;
  role: Bi;
  focus: Bi[];
  tagline: Bi;
  headshot: Img;
  alt: Bi;
};

/** The practice's NP brochure/card content, per provider, as real text. */
export const nursePractitioners: {
  individuals: NursePractitioner[];
  /** The card's closing band — the joint framing for the shared material. */
  sharedTagline: { heading: Bi; sub: Bi };
  sharedFocus: { heading: Bi; items: Bi[] };
  card: Img;
} = {
  individuals: [
    {
      id: "yanessa-ricardo",
      name: "Yanessa Ricardo",
      credentials: "MSN, APRN, FNP-C",
      role: {
        en: "Family Nurse Practitioner",
        es: "Enfermera Practicante Familiar",
        vi: "Điều dưỡng Thực hành Gia đình",
        ko: "가정전문간호사",
        ar: "ممرضة ممارسة لطب الأسرة",
      },
      focus: [
        {
          en: "Compassionate & patient-centered care",
          es: "Atención compasiva y centrada en el paciente",
          vi: "Chăm sóc tận tâm, lấy bệnh nhân làm trung tâm",
          ko: "따뜻하고 환자 중심적인 진료",
          ar: "رعاية رحيمة محورها المريض",
        },
        {
          en: "Management of complex GI conditions",
          es: "Manejo de condiciones digestivas complejas",
          vi: "Điều trị các bệnh lý tiêu hóa phức tạp",
          ko: "복잡한 소화기 질환 관리",
          ar: "إدارة حالات الجهاز الهضمي المعقدة",
        },
        {
          en: "Personalized treatment plans",
          es: "Planes de tratamiento personalizados",
          vi: "Kế hoạch điều trị được cá nhân hóa",
          ko: "맞춤형 치료 계획",
          ar: "خطط علاجية مخصصة",
        },
        {
          en: "Committed to your well-being",
          es: "Comprometida con su bienestar",
          vi: "Tận tâm vì sức khỏe của quý vị",
          ko: "여러분의 건강과 안녕을 위한 헌신",
          ar: "ملتزمة برفاهيتكم",
        },
      ],
      tagline: {
        en: "Committed to providing high-quality care and achieving the best outcomes for every patient.",
        es: "Comprometida a brindar atención de alta calidad y lograr los mejores resultados para cada paciente.",
        vi: "Cam kết mang đến sự chăm sóc chất lượng cao và đạt kết quả tốt nhất cho mỗi bệnh nhân.",
        ko: "모든 환자에게 수준 높은 진료를 제공하고 최선의 결과를 이루어내는 데 전념합니다.",
        ar: "ملتزمة بتقديم رعاية عالية الجودة وتحقيق أفضل النتائج لكل مريض.",
      },
      headshot: { src: "/images/staff/headshots/yanessa-ricardo.jpg", width: 880, height: 1305 },
      alt: {
        en: "Yanessa Ricardo, MSN, APRN, FNP-C, family nurse practitioner at Westchase Gastroenterology",
        es: "Yanessa Ricardo, MSN, APRN, FNP-C, enfermera practicante familiar de Westchase Gastroenterology",
        vi: "Yanessa Ricardo, MSN, APRN, FNP-C, điều dưỡng thực hành gia đình tại Westchase Gastroenterology",
        ko: "Westchase Gastroenterology의 가정전문간호사 Yanessa Ricardo, MSN, APRN, FNP-C",
        ar: "Yanessa Ricardo، MSN, APRN, FNP-C، ممرضة ممارسة لطب الأسرة في Westchase Gastroenterology",
      },
    },
    {
      id: "taylor-emmerman",
      name: "Taylor Emmerman",
      credentials: "MSN, APRN, FNP-C",
      role: {
        en: "Family Nurse Practitioner",
        es: "Enfermera Practicante Familiar",
        vi: "Điều dưỡng Thực hành Gia đình",
        ko: "가정전문간호사",
        ar: "ممرضة ممارسة لطب الأسرة",
      },
      focus: [
        {
          en: "Compassionate, patient-focused care",
          es: "Atención compasiva y enfocada en el paciente",
          vi: "Chăm sóc tận tâm, chú trọng đến bệnh nhân",
          ko: "따뜻하고 환자 중심적인 진료",
          ar: "رعاية رحيمة تركز على المريض",
        },
        {
          en: "Expert in GI health & chronic conditions",
          es: "Experta en salud digestiva y condiciones crónicas",
          vi: "Chuyên gia về sức khỏe tiêu hóa và các bệnh mạn tính",
          ko: "소화기 건강 및 만성 질환 전문",
          ar: "خبيرة في صحة الجهاز الهضمي والحالات المزمنة",
        },
        {
          en: "Education & empowerment",
          es: "Educación y empoderamiento",
          vi: "Giáo dục và trao quyền cho bệnh nhân",
          ko: "환자 교육과 자기 관리 역량 강화",
          ar: "التثقيف والتمكين",
        },
        {
          en: "Evidence-based practice",
          es: "Práctica basada en la evidencia",
          vi: "Thực hành dựa trên bằng chứng",
          ko: "근거 기반 진료",
          ar: "ممارسة قائمة على الأدلة",
        },
      ],
      tagline: {
        en: "Dedicated to helping patients achieve better digestive health and an improved quality of life.",
        es: "Dedicada a ayudar a los pacientes a lograr una mejor salud digestiva y una mejor calidad de vida.",
        vi: "Tận tâm giúp bệnh nhân đạt được sức khỏe tiêu hóa tốt hơn và chất lượng cuộc sống được cải thiện.",
        ko: "환자들이 더 나은 소화기 건강과 향상된 삶의 질을 누리도록 돕는 데 헌신합니다.",
        ar: "متفانية في مساعدة المرضى على تحقيق صحة هضمية أفضل وجودة حياة محسّنة.",
      },
      headshot: { src: "/images/staff/headshots/taylor-emmerman.jpg", width: 880, height: 1320 },
      alt: {
        en: "Taylor Emmerman, MSN, APRN, FNP-C, family nurse practitioner at Westchase Gastroenterology",
        es: "Taylor Emmerman, MSN, APRN, FNP-C, enfermera practicante familiar de Westchase Gastroenterology",
        vi: "Taylor Emmerman, MSN, APRN, FNP-C, điều dưỡng thực hành gia đình tại Westchase Gastroenterology",
        ko: "Westchase Gastroenterology의 가정전문간호사 Taylor Emmerman, MSN, APRN, FNP-C",
        ar: "Taylor Emmerman، MSN, APRN, FNP-C، ممرضة ممارسة لطب الأسرة في Westchase Gastroenterology",
      },
    },
  ],
  sharedTagline: {
    heading: {
      en: "Two expert providers. One shared goal.",
      es: "Dos proveedoras expertas. Un mismo objetivo.",
      vi: "Hai chuyên gia điều trị. Một mục tiêu chung.",
      ko: "두 명의 전문 의료진, 하나의 공통된 목표.",
      ar: "مقدّمتا رعاية خبيرتان. هدف واحد مشترك.",
    },
    sub: {
      en: "Your health, our priority.",
      es: "Su salud, nuestra prioridad.",
      vi: "Sức khỏe của quý vị là ưu tiên của chúng tôi.",
      ko: "여러분의 건강이 저희의 최우선입니다.",
      ar: "صحتكم أولويتنا.",
    },
  },
  sharedFocus: {
    heading: {
      en: "Partnering with you for better digestive health",
      es: "Trabajando con usted por una mejor salud digestiva",
      vi: "Đồng hành cùng quý vị vì sức khỏe tiêu hóa tốt hơn",
      ko: "더 나은 소화기 건강을 위해 여러분과 함께합니다",
      ar: "نعمل معكم من أجل صحة هضمية أفضل",
    },
    items: [
      {
        en: "GERD & acid reflux",
        es: "ERGE y reflujo ácido",
        vi: "GERD và trào ngược axit",
        ko: "위식도 역류질환(GERD) 및 위산 역류",
        ar: "الارتجاع المعدي المريئي (GERD) والارتجاع الحمضي",
      },
      {
        en: "IBS, IBD & Crohn's disease",
        es: "SII, EII y enfermedad de Crohn",
        vi: "IBS, IBD và bệnh Crohn",
        ko: "과민성 대장 증후군(IBS), 염증성 장질환(IBD) 및 크론병",
        ar: "متلازمة القولون العصبي (IBS) وداء الأمعاء الالتهابي (IBD) وداء كرون",
      },
      {
        en: "Liver health & fatty liver disease",
        es: "Salud hepática e hígado graso",
        vi: "Sức khỏe gan và bệnh gan nhiễm mỡ",
        ko: "간 건강 및 지방간 질환",
        ar: "صحة الكبد ومرض الكبد الدهني",
      },
      {
        en: "Colon cancer screening",
        es: "Detección del cáncer de colon",
        vi: "Tầm soát ung thư đại tràng",
        ko: "대장암 검진",
        ar: "الكشف عن سرطان القولون",
      },
      {
        en: "Patient education & support",
        es: "Educación y apoyo al paciente",
        vi: "Giáo dục và hỗ trợ bệnh nhân",
        ko: "환자 교육 및 지원",
        ar: "تثقيف المرضى ودعمهم",
      },
      {
        en: "Whole-person, compassionate care",
        es: "Atención integral y compasiva",
        vi: "Chăm sóc toàn diện và tận tâm",
        ko: "전인적이고 따뜻한 진료",
        ar: "رعاية شاملة ورحيمة للفرد بأكمله",
      },
    ],
  },
  card: { src: "/images/staff/nurse-practitioners.png", width: 1022, height: 1533 },
};

export type Biologic = { brand: string; generic: string; indication: Bi };

/** Juliet's own card content (RN, BSN per her card; practice-manager credit
 * added at the practice's request 2026-07-06 — she runs the office in
 * addition to infusion services). */
export const infusionNurse = {
  id: "juliet-oliva",
  name: "Juliet Oliva",
  credentials: "RN, BSN",
  role: {
    en: "Practice Manager & Infusion Nurse",
    es: "Gerente de la Oficina y Enfermera de Infusión",
    vi: "Quản lý Phòng khám kiêm Điều dưỡng Truyền dịch",
    ko: "행정 실장 겸 주입 치료 간호사",
    ar: "مديرة العيادة وممرضة التسريب",
  },
  motto: {
    en: "Comfort. Care. Compassion.",
    es: "Comodidad. Cuidado. Compasión.",
    vi: "Thoải mái. Chăm sóc. Tận tâm.",
    ko: "편안함. 보살핌. 따뜻한 마음.",
    ar: "راحة. رعاية. رحمة.",
  } as Bi,
  languagesSpoken: {
    en: "English & Spanish",
    es: "Inglés y español",
    vi: "Tiếng Anh và tiếng Tây Ban Nha",
    ko: "영어와 스페인어",
    ar: "الإنجليزية والإسبانية",
  },
  intro: [
    {
      en: "Juliet is a dedicated infusion nurse committed to providing exceptional care in a comfortable and supportive environment. She partners with our medical team to ensure each patient receives safe, effective, and personalized infusion therapy.",
      es: "Juliet es una enfermera de infusión dedicada, comprometida a brindar una atención excepcional en un ambiente cómodo y de apoyo. Trabaja junto a nuestro equipo médico para asegurar que cada paciente reciba una terapia de infusión segura, eficaz y personalizada.",
      vi: "Juliet là một điều dưỡng truyền dịch tận tụy, cam kết mang đến sự chăm sóc xuất sắc trong một môi trường thoải mái và hỗ trợ. Cô phối hợp với đội ngũ y tế của chúng tôi để đảm bảo mỗi bệnh nhân nhận được liệu pháp truyền thuốc an toàn, hiệu quả và được cá nhân hóa.",
      ko: "Juliet은 편안하고 신뢰할 수 있는 환경에서 특별한 케어를 제공하는 데 헌신하는 주입 치료 간호사입니다. 저희 의료진과 협력하여 모든 환자가 안전하고 효과적이며 맞춤화된 주입 치료를 받을 수 있도록 살핍니다.",
      ar: "Juliet ممرضة تسريب متفانية تلتزم بتقديم رعاية استثنائية في بيئة مريحة وداعمة. وهي تعمل جنبًا إلى جنب مع فريقنا الطبي لضمان حصول كل مريض على علاج بالتسريب آمن وفعال ومخصص له.",
    },
  ],
  specialty: {
    heading: {
      en: "Specializing in biologic infusion therapy",
      es: "Especializada en terapia de infusión biológica",
      vi: "Chuyên về liệu pháp truyền thuốc sinh học",
      ko: "생물학적 제제 주입 치료 전문",
      ar: "متخصصة في العلاج بالتسريب البيولوجي",
    },
    items: [
      {
        en: "Crohn's disease",
        es: "Enfermedad de Crohn",
        vi: "Bệnh Crohn",
        ko: "크론병",
        ar: "داء كرون",
      },
      {
        en: "Ulcerative colitis",
        es: "Colitis ulcerosa",
        vi: "Viêm loét đại tràng",
        ko: "궤양성 대장염",
        ar: "التهاب القولون التقرحي",
      },
      {
        en: "Inflammatory bowel disease (IBD)",
        es: "Enfermedad inflamatoria intestinal (EII)",
        vi: "Bệnh viêm ruột (IBD)",
        ko: "염증성 장질환(IBD)",
        ar: "داء الأمعاء الالتهابي (IBD)",
      },
    ],
  },
  approach: {
    heading: {
      en: "Her approach to care",
      es: "Su enfoque de atención",
      vi: "Phương pháp chăm sóc của cô",
      ko: "환자를 돌보는 방식",
      ar: "نهجها في الرعاية",
    },
    items: [
      {
        en: "Expert administration of biologic and specialty infusions",
        es: "Administración experta de infusiones biológicas y especializadas",
        vi: "Thực hiện thành thạo các liệu pháp truyền thuốc sinh học và thuốc chuyên biệt",
        ko: "생물학적 제제 및 특수 주입 치료의 전문적인 시행",
        ar: "إعطاء التسريبات البيولوجية والمتخصصة بخبرة عالية",
      },
      {
        en: "Patient education and treatment guidance",
        es: "Educación al paciente y orientación sobre el tratamiento",
        vi: "Giáo dục bệnh nhân và hướng dẫn về điều trị",
        ko: "환자 교육 및 치료 안내",
        ar: "تثقيف المرضى والإرشاد بشأن العلاج",
      },
      {
        en: "Monitoring during and after infusions",
        es: "Monitoreo durante y después de las infusiones",
        vi: "Theo dõi trong và sau khi truyền thuốc",
        ko: "주입 치료 중과 후의 모니터링",
        ar: "المراقبة أثناء التسريب وبعده",
      },
      {
        en: "Collaboration with physicians and the care team",
        es: "Colaboración con los médicos y el equipo de atención",
        vi: "Phối hợp với các bác sĩ và đội ngũ chăm sóc",
        ko: "의사 및 진료팀과의 협력",
        ar: "التعاون مع الأطباء وفريق الرعاية",
      },
      {
        en: "Insurance authorizations and scheduling",
        es: "Autorizaciones de seguro y programación de citas",
        vi: "Xin phê duyệt bảo hiểm và sắp xếp lịch hẹn",
        ko: "보험 사전 승인 및 일정 관리",
        ar: "الحصول على موافقات التأمين وتحديد المواعيد",
      },
      {
        en: "Compassionate, patient-centered care",
        es: "Atención compasiva y centrada en el paciente",
        vi: "Chăm sóc tận tâm, lấy bệnh nhân làm trung tâm",
        ko: "따뜻하고 환자 중심적인 케어",
        ar: "رعاية رحيمة محورها المريض",
      },
    ],
  },
  biologics: {
    heading: {
      en: "Biologic medications we infuse",
      es: "Medicamentos biológicos que infundimos",
      vi: "Các thuốc sinh học chúng tôi truyền",
      ko: "저희가 주입하는 생물학적 제제",
      ar: "الأدوية البيولوجية التي نقوم بتسريبها",
    },
    items: [
      {
        brand: "Entyvio",
        generic: "vedolizumab",
        indication: {
          en: "For moderate to severe Crohn's disease and ulcerative colitis",
          es: "Para enfermedad de Crohn y colitis ulcerosa de moderadas a graves",
          vi: "Cho bệnh Crohn và viêm loét đại tràng mức độ từ trung bình đến nặng",
          ko: "중등도에서 중증의 크론병 및 궤양성 대장염 치료용",
          ar: "لداء كرون والتهاب القولون التقرحي المتوسط إلى الشديد",
        },
      },
      {
        brand: "Skyrizi",
        generic: "risankizumab-rzaa",
        indication: {
          en: "For moderate to severe Crohn's disease and ulcerative colitis",
          es: "Para enfermedad de Crohn y colitis ulcerosa de moderadas a graves",
          vi: "Cho bệnh Crohn và viêm loét đại tràng mức độ từ trung bình đến nặng",
          ko: "중등도에서 중증의 크론병 및 궤양성 대장염 치료용",
          ar: "لداء كرون والتهاب القولون التقرحي المتوسط إلى الشديد",
        },
      },
      {
        brand: "Omvoh",
        generic: "mirikizumab-mrkz",
        indication: {
          en: "For moderately to severely active Crohn's disease",
          es: "Para enfermedad de Crohn activa de moderada a grave",
          vi: "Cho bệnh Crohn hoạt động mức độ từ trung bình đến nặng",
          ko: "중등도에서 중증의 활동성 크론병 치료용",
          ar: "لداء كرون النشط بدرجة متوسطة إلى شديدة",
        },
      },
      {
        brand: "Remicade",
        generic: "infliximab",
        indication: {
          en: "For Crohn's disease, ulcerative colitis, and other inflammatory conditions",
          es: "Para enfermedad de Crohn, colitis ulcerosa y otras condiciones inflamatorias",
          vi: "Cho bệnh Crohn, viêm loét đại tràng và các bệnh lý viêm khác",
          ko: "크론병, 궤양성 대장염 및 기타 염증성 질환 치료용",
          ar: "لداء كرون والتهاب القولون التقرحي وحالات التهابية أخرى",
        },
      },
      {
        brand: "Inflectra",
        generic: "infliximab-dyyb",
        indication: {
          en: "For Crohn's disease, ulcerative colitis, and other inflammatory conditions",
          es: "Para enfermedad de Crohn, colitis ulcerosa y otras condiciones inflamatorias",
          vi: "Cho bệnh Crohn, viêm loét đại tràng và các bệnh lý viêm khác",
          ko: "크론병, 궤양성 대장염 및 기타 염증성 질환 치료용",
          ar: "لداء كرون والتهاب القولون التقرحي وحالات التهابية أخرى",
        },
      },
    ] satisfies Biologic[],
    note: {
      en: "And more — additional therapies are available based on your treatment plan.",
      es: "Y más: hay terapias adicionales disponibles según su plan de tratamiento.",
      vi: "Và còn nữa — có các liệu pháp bổ sung tùy theo kế hoạch điều trị của quý vị.",
      ko: "이 외에도 치료 계획에 따라 추가적인 치료법이 제공될 수 있습니다.",
      ar: "وأكثر من ذلك — تتوفر علاجات إضافية بحسب خطتك العلاجية.",
    },
  },
  quote: {
    en: "My goal is to help every patient feel comfortable, informed, and confident throughout their infusion journey.",
    es: "Mi objetivo es que cada paciente se sienta cómodo, informado y seguro durante todo su proceso de infusión.",
    vi: "Mục tiêu của tôi là giúp mỗi bệnh nhân cảm thấy thoải mái, được thông tin đầy đủ và an tâm trong suốt quá trình truyền thuốc.",
    ko: "저의 목표는 모든 환자가 주입 치료 여정 내내 편안함을 느끼고, 충분한 정보를 얻고, 확신을 가질 수 있도록 돕는 것입니다.",
    ar: "هدفي هو مساعدة كل مريض على الشعور بالراحة والاطلاع والثقة طوال رحلة العلاج بالتسريب.",
  },
  headshot: { src: "/images/staff/headshots/juliet-oliva.jpg", width: 880, height: 1320 },
  card: { src: "/images/staff/juliet-infusion-nurse.png", width: 1536, height: 1024 },
  alt: {
    en: "Juliet Oliva, RN, BSN, practice manager and infusion nurse at Westchase Gastroenterology",
    es: "Juliet Oliva, RN, BSN, gerente de la oficina y enfermera de infusión de Westchase Gastroenterology",
    vi: "Juliet Oliva, RN, BSN, quản lý phòng khám kiêm điều dưỡng truyền dịch tại Westchase Gastroenterology",
    ko: "Westchase Gastroenterology의 행정 실장 겸 주입 치료 간호사 Juliet Oliva, RN, BSN",
    ar: "Juliet Oliva، RN, BSN، مديرة العيادة وممرضة التسريب في Westchase Gastroenterology",
  },
} as const;

export const team = {
  id: "team",
  heading: "Team Members / Equipo de Trabajo",
  // The team image the practice's site published (its team-page banner crop).
  image: { src: "/images/staff/team-banner.jpg", width: 600, height: 200 },
  alt: {
    en: "The office team of Westchase Gastroenterology",
    es: "El equipo de oficina de Westchase Gastroenterology",
    vi: "Đội ngũ nhân viên văn phòng của Westchase Gastroenterology",
    ko: "Westchase Gastroenterology의 사무실 팀",
    ar: "فريق مكتب Westchase Gastroenterology",
  },
} as const;
