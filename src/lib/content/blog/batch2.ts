// Blog port, batch 2 (legacy posts 7–11). Titles and dates match the old site
// exactly; article bodies are original EN/ES prose written for the rebuild,
// with VI/KO/AR machine translations still awaiting native-speaker review.

import type { BlogPost } from "../types";

export const batch2: BlogPost[] = [
  {
    slug: "understanding-the-difference-between-ibs-and-ibd",
    legacyPath: "/blog/1435553-understanding-the-difference-between-ibs-and-ibd",
    title: {
      en: "Understanding the Difference Between IBS and IBD",
      es: "Entienda la diferencia entre el SII y la EII",
      vi: "Tìm hiểu sự khác biệt giữa IBS và IBD",
      ko: "IBS와 IBD의 차이 이해하기",
      ar: "فهم الفرق بين متلازمة القولون العصبي (IBS) ومرض التهاب الأمعاء (IBD)",
    },
    posted: "2026-03-16",
    teaser: {
      en: "IBS and IBD sound alike and share some symptoms, but they are very different conditions. Learn how each affects the digestive tract and when it makes sense to seek an evaluation.",
      es: "El SII y la EII suenan parecido y comparten algunos síntomas, pero son condiciones muy distintas. Conozca cómo afecta cada una al tubo digestivo y cuándo conviene buscar una evaluación.",
      vi: "IBS và IBD nghe tên rất giống nhau và có chung một số triệu chứng, nhưng đây là hai bệnh lý rất khác nhau. Hãy tìm hiểu mỗi bệnh ảnh hưởng đến đường tiêu hóa ra sao và khi nào nên đi khám để được đánh giá.",
      ko: "IBS와 IBD는 이름이 비슷하고 일부 증상도 겹치지만, 실제로는 매우 다른 질환입니다. 각 질환이 소화관에 어떤 영향을 미치는지, 그리고 언제 진료를 받아 보는 것이 좋은지 알아보십시오.",
      ar: "قد يتشابه اسما متلازمة القولون العصبي (IBS) ومرض التهاب الأمعاء (IBD) ويشتركان في بعض الأعراض، لكنهما حالتان مختلفتان تمامًا. تعرّف على تأثير كل منهما في الجهاز الهضمي ومتى يُستحسن طلب تقييم طبي.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Irritable bowel syndrome (IBS) and inflammatory bowel disease (IBD) are two of the most commonly confused terms in digestive health. The names look nearly identical, and both conditions can cause abdominal pain and changes in bowel habits. Beneath the surface, however, they are very different problems.",
            es: "El síndrome del intestino irritable (SII) y la enfermedad inflamatoria intestinal (EII) son dos de los términos que más se confunden en la salud digestiva. Los nombres se parecen mucho, y ambas condiciones pueden causar dolor abdominal y cambios en los hábitos intestinales. En el fondo, sin embargo, se trata de problemas muy diferentes.",
            vi: "Hội chứng ruột kích thích (IBS) và bệnh viêm ruột (IBD) là hai trong số những thuật ngữ dễ bị nhầm lẫn nhất trong lĩnh vực sức khỏe tiêu hóa. Tên gọi của chúng trông gần như giống hệt nhau, và cả hai bệnh đều có thể gây đau bụng và thay đổi thói quen đại tiện. Tuy nhiên, về bản chất, đây là hai vấn đề rất khác nhau.",
            ko: "과민성 대장 증후군(IBS)과 염증성 장 질환(IBD)은 소화기 건강 분야에서 가장 자주 혼동되는 용어에 속합니다. 이름이 거의 똑같아 보이고, 두 질환 모두 복통과 배변 습관의 변화를 일으킬 수 있습니다. 그러나 그 이면을 들여다보면 매우 다른 문제입니다.",
            ar: "تُعدّ متلازمة القولون العصبي (IBS) ومرض التهاب الأمعاء (IBD) من أكثر المصطلحات التي يشيع الخلط بينها في مجال صحة الجهاز الهضمي. فالاسمان متشابهان إلى حد كبير، وكلتا الحالتين قد تسببان ألمًا في البطن وتغيرات في عادات التبرز. غير أنهما في جوهرهما مشكلتان مختلفتان تمامًا.",
          },
          {
            en: "Knowing how the two differ can make it easier to describe your symptoms, ask useful questions, and understand why your care team may recommend certain tests.",
            es: "Saber en qué se diferencian puede facilitarle describir sus síntomas, hacer preguntas útiles y entender por qué su equipo médico puede recomendar ciertos estudios.",
            vi: "Biết được hai bệnh này khác nhau ở điểm nào có thể giúp quý vị dễ dàng mô tả triệu chứng của mình, đặt những câu hỏi hữu ích và hiểu vì sao đội ngũ y tế có thể đề nghị một số xét nghiệm nhất định.",
            ko: "두 질환의 차이를 알아 두면 증상을 설명하고, 유용한 질문을 하고, 의료진이 특정 검사를 권하는 이유를 이해하기가 한결 쉬워집니다.",
            ar: "إن معرفة الفرق بينهما تسهّل عليك وصف أعراضك، وطرح أسئلة مفيدة، وفهم سبب توصية فريق الرعاية بإجراء فحوصات معينة.",
          },
        ],
      },
      {
        heading: {
          en: "What Is Irritable Bowel Syndrome (IBS)?",
          es: "¿Qué es el síndrome del intestino irritable (SII)?",
          vi: "Hội chứng ruột kích thích (IBS) là gì?",
          ko: "과민성 대장 증후군(IBS)이란 무엇입니까?",
          ar: "ما هي متلازمة القولون العصبي (IBS)؟",
        },
        paragraphs: [
          {
            en: "IBS is what doctors call a functional disorder: the bowel looks healthy on testing, but the way it squeezes, empties, and senses doesn't always work smoothly. The result can be cramping, bloating, gas, and episodes of diarrhea, constipation, or a mix of both.",
            es: "El SII es lo que los médicos llaman un trastorno funcional: el intestino se ve sano en los estudios, pero su manera de contraerse, vaciarse y percibir no siempre funciona con normalidad. El resultado puede ser cólicos, hinchazón, gases y episodios de diarrea, estreñimiento o una combinación de ambos.",
            vi: "IBS là tình trạng mà các bác sĩ gọi là rối loạn chức năng: ruột trông khỏe mạnh trên các xét nghiệm, nhưng cách ruột co bóp, tống xuất và cảm nhận không phải lúc nào cũng vận hành trơn tru. Kết quả có thể là đau quặn bụng, chướng bụng, đầy hơi và những đợt tiêu chảy, táo bón hoặc xen kẽ cả hai.",
            ko: "IBS는 의사들이 기능성 장애라고 부르는 질환입니다. 검사에서 장은 건강해 보이지만, 장이 수축하고 비우고 감각을 느끼는 방식이 항상 매끄럽게 작동하지는 않습니다. 그 결과 복부 경련, 복부 팽만감, 가스와 함께 설사나 변비, 또는 두 가지가 섞인 증상이 반복될 수 있습니다.",
            ar: "متلازمة القولون العصبي هي ما يسميه الأطباء اضطرابًا وظيفيًا: تبدو الأمعاء سليمة في الفحوصات، لكن طريقة انقباضها وتفريغها وإحساسها لا تعمل دائمًا بسلاسة. وقد ينتج عن ذلك تقلصات وانتفاخ وغازات ونوبات من الإسهال أو الإمساك أو مزيج منهما.",
          },
          {
            en: "Symptoms tend to come and go, and many people notice flare-ups after certain meals, during stressful stretches, or when their routine changes. IBS can be genuinely disruptive, but it does not inflame or scar the intestine, and it is not known to lead to more serious bowel damage.",
            es: "Los síntomas tienden a aparecer y desaparecer, y muchas personas notan brotes después de ciertas comidas, en épocas de estrés o cuando cambia su rutina. El SII puede ser muy molesto, pero no inflama ni cicatriza el intestino, y no se asocia con daños intestinales más graves.",
            vi: "Các triệu chứng thường xuất hiện rồi tự hết, và nhiều người nhận thấy bệnh bùng phát sau một số bữa ăn nhất định, trong những giai đoạn căng thẳng hoặc khi nếp sinh hoạt thay đổi. IBS có thể gây phiền toái thật sự, nhưng bệnh không gây viêm hay để lại sẹo ở ruột, và không được biết là dẫn đến tổn thương ruột nghiêm trọng hơn.",
            ko: "증상은 나타났다 사라지기를 반복하는 경향이 있으며, 많은 분들이 특정 음식을 먹은 뒤, 스트레스가 심한 시기, 또는 생활 리듬이 바뀔 때 증상이 심해지는 것을 느낍니다. IBS는 일상에 큰 지장을 줄 수 있지만, 장에 염증이나 흉터를 남기지 않으며 더 심각한 장 손상으로 이어진다고 알려져 있지도 않습니다.",
            ar: "تميل الأعراض إلى الظهور ثم الزوال، ويلاحظ كثيرون اشتدادها بعد وجبات معينة، أو في فترات التوتر، أو عند تغيّر روتينهم اليومي. وقد تكون متلازمة القولون العصبي مزعجة حقًا، لكنها لا تسبب التهابًا أو تندبًا في الأمعاء، وليس من المعروف أنها تؤدي إلى ضرر أشد خطورة في الأمعاء.",
          },
        ],
      },
      {
        heading: {
          en: "What Is Inflammatory Bowel Disease (IBD)?",
          es: "¿Qué es la enfermedad inflamatoria intestinal (EII)?",
          vi: "Bệnh viêm ruột (IBD) là gì?",
          ko: "염증성 장 질환(IBD)이란 무엇입니까?",
          ar: "ما هو مرض التهاب الأمعاء (IBD)؟",
        },
        paragraphs: [
          {
            en: "IBD is a different kind of condition. It is an umbrella term for chronic diseases — mainly Crohn's disease and ulcerative colitis — in which the immune system produces real, ongoing inflammation in the digestive tract.",
            es: "La EII es un tipo de condición distinto. Es un término general para enfermedades crónicas —principalmente la enfermedad de Crohn y la colitis ulcerosa— en las que el sistema inmunitario produce una inflamación real y continua en el tubo digestivo.",
            vi: "IBD là một loại bệnh lý khác hẳn. Đây là thuật ngữ chung cho các bệnh mạn tính — chủ yếu là bệnh Crohn và viêm loét đại tràng — trong đó hệ miễn dịch gây ra tình trạng viêm thật sự và kéo dài trong đường tiêu hóa.",
            ko: "IBD는 이와는 다른 종류의 질환입니다. 면역 체계가 소화관에 실제적이고 지속적인 염증을 일으키는 만성 질환들, 주로 크론병과 궤양성 대장염을 아우르는 용어입니다.",
            ar: "أما مرض التهاب الأمعاء فهو حالة من نوع مختلف. فهو مصطلح شامل لأمراض مزمنة — أبرزها داء كرون والتهاب القولون التقرحي — يُحدث فيها الجهاز المناعي التهابًا حقيقيًا ومستمرًا في الجهاز الهضمي.",
          },
          {
            en: "That inflammation can injure the intestinal lining over time. Along with abdominal pain and persistent diarrhea, people with IBD may notice blood in the stool, fatigue, or weight loss they didn't intend. Because the disease can cause lasting damage, it calls for ongoing medical treatment and monitoring rather than lifestyle changes alone.",
            es: "Con el tiempo, esa inflamación puede dañar el revestimiento intestinal. Además del dolor abdominal y la diarrea persistente, las personas con EII pueden notar sangre en las heces, fatiga o una pérdida de peso involuntaria. Como la enfermedad puede causar daños duraderos, requiere tratamiento y seguimiento médico continuos, no solo cambios en el estilo de vida.",
            vi: "Theo thời gian, tình trạng viêm đó có thể làm tổn thương niêm mạc ruột. Ngoài đau bụng và tiêu chảy dai dẳng, người mắc IBD có thể thấy máu trong phân, mệt mỏi hoặc sụt cân ngoài ý muốn. Vì bệnh có thể gây tổn thương lâu dài, nên nó đòi hỏi điều trị và theo dõi y tế liên tục chứ không chỉ thay đổi lối sống.",
            ko: "이 염증은 시간이 지나면서 장 점막을 손상시킬 수 있습니다. IBD가 있는 분들은 복통과 지속되는 설사 외에도 혈변, 피로, 의도하지 않은 체중 감소를 겪을 수 있습니다. 이 질환은 지속적인 손상을 남길 수 있으므로 생활 습관 개선만으로는 부족하며, 꾸준한 의학적 치료와 경과 관찰이 필요합니다.",
            ar: "ويمكن لهذا الالتهاب أن يُلحق الضرر ببطانة الأمعاء مع مرور الوقت. فإلى جانب ألم البطن والإسهال المستمر، قد يلاحظ المصابون بمرض التهاب الأمعاء دمًا في البراز أو تعبًا أو فقدانًا غير مقصود للوزن. ولأن المرض قد يسبب ضررًا دائمًا، فهو يستلزم علاجًا ومتابعة طبية مستمرين، لا مجرد تغييرات في نمط الحياة.",
          },
        ],
      },
      {
        heading: {
          en: "The Key Differences",
          es: "Las diferencias principales",
          vi: "Những điểm khác biệt chính",
          ko: "핵심적인 차이점",
          ar: "الفروق الأساسية",
        },
        paragraphs: [
          {
            en: "The clearest dividing line is inflammation. IBS changes how the bowel behaves without injuring it; IBD physically inflames and damages intestinal tissue.",
            es: "La línea divisoria más clara es la inflamación. El SII cambia el comportamiento del intestino sin lesionarlo; la EII inflama y daña físicamente el tejido intestinal.",
            vi: "Ranh giới rõ ràng nhất là tình trạng viêm. IBS làm thay đổi cách hoạt động của ruột mà không gây tổn thương ruột; còn IBD gây viêm và tổn thương thực thể cho mô ruột.",
            ko: "가장 분명한 구분선은 염증입니다. IBS는 장을 손상시키지 않으면서 장이 움직이는 방식을 바꾸는 반면, IBD는 장 조직에 실제로 염증을 일으키고 손상을 입힙니다.",
            ar: "الخط الفاصل الأوضح هو الالتهاب. فمتلازمة القولون العصبي تغيّر طريقة عمل الأمعاء دون أن تصيبها بأذى، بينما يسبب مرض التهاب الأمعاء التهابًا وضررًا فعليين في أنسجة الأمعاء.",
          },
          {
            en: "The two also follow different patterns. IBS symptoms often track with food, stress, and daily routine. IBD tends to move through cycles of flare-ups and quieter stretches, and over the years it can bring complications — such as scarring or trouble absorbing nutrients — that need a specialist's care.",
            es: "Además, siguen patrones distintos. Los síntomas del SII suelen relacionarse con la comida, el estrés y la rutina diaria. La EII tiende a alternar entre brotes y períodos más tranquilos, y con los años puede traer complicaciones —como cicatrización o dificultad para absorber nutrientes— que necesitan la atención de un especialista.",
            vi: "Hai bệnh cũng diễn tiến theo những kiểu khác nhau. Triệu chứng của IBS thường gắn với thức ăn, căng thẳng và nếp sinh hoạt hằng ngày. IBD thường trải qua các chu kỳ gồm những đợt bùng phát và những giai đoạn lắng dịu, và qua nhiều năm có thể mang đến các biến chứng — như hình thành sẹo hoặc khó hấp thu chất dinh dưỡng — cần đến sự chăm sóc của bác sĩ chuyên khoa.",
            ko: "두 질환은 진행 양상도 다릅니다. IBS 증상은 음식, 스트레스, 하루하루의 생활 리듬을 따라 나타나는 경우가 많습니다. IBD는 증상이 심해지는 시기와 잠잠한 시기가 반복되는 경향이 있으며, 세월이 흐르면서 흉터나 영양분 흡수 장애 같은 합병증이 생겨 전문의의 진료가 필요해질 수 있습니다.",
            ar: "كما تتبع الحالتان نمطين مختلفين. فأعراض متلازمة القولون العصبي كثيرًا ما ترتبط بالطعام والتوتر والروتين اليومي. أما مرض التهاب الأمعاء فيميل إلى التنقل بين نوبات اشتداد وفترات أهدأ، وقد يجلب على مر السنين مضاعفات — مثل التندب أو صعوبة امتصاص العناصر الغذائية — تستدعي رعاية طبيب متخصص.",
          },
        ],
      },
      {
        heading: {
          en: "When to See a Gastroenterologist",
          es: "Cuándo consultar a un gastroenterólogo",
          vi: "Khi nào nên đi khám bác sĩ chuyên khoa tiêu hóa",
          ko: "소화기내과 전문의를 찾아야 할 때",
          ar: "متى ينبغي مراجعة طبيب الجهاز الهضمي",
        },
        paragraphs: [
          {
            en: "Because the symptoms overlap, it is hard to tell these conditions apart on your own. A gastroenterologist can use lab work, imaging, and procedures such as colonoscopy to determine whether IBS, IBD, or something else entirely is behind your symptoms.",
            es: "Como los síntomas se superponen, es difícil distinguir estas condiciones por su cuenta. Un gastroenterólogo puede usar análisis de laboratorio, estudios de imagen y procedimientos como la colonoscopia para determinar si detrás de sus síntomas está el SII, la EII u otra cosa completamente distinta.",
            vi: "Vì các triệu chứng chồng lấp nhau, quý vị khó có thể tự mình phân biệt các bệnh này. Bác sĩ chuyên khoa tiêu hóa có thể dựa vào xét nghiệm, chẩn đoán hình ảnh và các thủ thuật như nội soi đại tràng để xác định đằng sau các triệu chứng của quý vị là IBS, IBD hay một vấn đề hoàn toàn khác.",
            ko: "증상이 서로 겹치기 때문에 이 질환들을 혼자서 구별하기는 어렵습니다. 소화기내과 전문의는 검사실 검사와 영상 검사, 그리고 대장 내시경과 같은 시술을 활용해 증상의 원인이 IBS인지, IBD인지, 아니면 전혀 다른 문제인지 가려낼 수 있습니다.",
            ar: "نظرًا إلى تداخل الأعراض، يصعب التمييز بين هاتين الحالتين بمفردك. يمكن لطبيب الجهاز الهضمي الاستعانة بالتحاليل المخبرية والتصوير الطبي وإجراءات مثل تنظير القولون لتحديد ما إذا كان وراء أعراضك متلازمة القولون العصبي أو مرض التهاب الأمعاء أو أمر آخر مختلف تمامًا.",
          },
          {
            en: "Warning signs such as blood in the stool, unexplained weight loss, or pain that keeps getting worse deserve an appointment without delay. An accurate diagnosis is the starting point for treatment that fits your condition — and for real peace of mind.",
            es: "Señales de alerta como sangre en las heces, pérdida de peso sin explicación o un dolor que va en aumento ameritan una cita sin demora. Un diagnóstico preciso es el punto de partida para un tratamiento adecuado a su condición, y para una verdadera tranquilidad.",
            vi: "Những dấu hiệu cảnh báo như máu trong phân, sụt cân không rõ nguyên nhân hoặc cơn đau ngày càng nặng cần được đặt hẹn khám ngay, không nên trì hoãn. Chẩn đoán chính xác là điểm khởi đầu cho phác đồ điều trị phù hợp với tình trạng của quý vị — và cho sự an tâm thật sự.",
            ko: "혈변, 원인을 알 수 없는 체중 감소, 점점 심해지는 통증과 같은 경고 신호가 있다면 지체하지 말고 진료 예약을 하시기 바랍니다. 정확한 진단은 자신의 상태에 맞는 치료의 출발점이며, 진정한 마음의 안정으로 가는 출발점이기도 합니다.",
            ar: "علامات التحذير مثل وجود دم في البراز، أو فقدان الوزن غير المبرر، أو ألم يزداد سوءًا، تستحق موعدًا طبيًا دون تأخير. فالتشخيص الدقيق هو نقطة البداية لعلاج يناسب حالتك — ولراحة بال حقيقية.",
          },
        ],
      },
    ],
  },
  {
    slug: "when-to-see-a-specialist-for-ongoing-digestive-issues",
    legacyPath: "/blog/1433238-when-to-see-a-specialist-for-ongoing-digestive-issues",
    title: {
      en: "When to See a Specialist for Ongoing Digestive Issues",
      es: "Cuándo consultar a un especialista por problemas digestivos persistentes",
      vi: "Khi nào nên đi khám bác sĩ chuyên khoa vì các vấn đề tiêu hóa kéo dài",
      ko: "지속되는 소화기 문제로 전문의를 찾아야 할 때",
      ar: "متى ينبغي مراجعة طبيب متخصص بشأن مشكلات الجهاز الهضمي المستمرة",
    },
    posted: "2026-03-10",
    teaser: {
      en: "An upset stomach now and then is normal, but symptoms that linger for weeks are worth a closer look. These are the signs that it may be time to see a gastroenterologist.",
      es: "Un malestar estomacal de vez en cuando es normal, pero los síntomas que se prolongan por semanas merecen más atención. Estas son las señales de que puede ser momento de consultar a un gastroenterólogo.",
      vi: "Thỉnh thoảng bị khó chịu ở bụng là chuyện bình thường, nhưng các triệu chứng kéo dài hàng tuần liền thì đáng được xem xét kỹ hơn. Dưới đây là những dấu hiệu cho thấy có thể đã đến lúc quý vị nên đi khám bác sĩ chuyên khoa tiêu hóa.",
      ko: "가끔 속이 불편한 것은 정상이지만, 몇 주씩 이어지는 증상은 좀 더 자세히 살펴볼 필요가 있습니다. 소화기내과 전문의를 만나 볼 때가 되었을 수 있음을 알려 주는 신호들은 다음과 같습니다.",
      ar: "من الطبيعي أن تنزعج معدتك بين الحين والآخر، أما الأعراض التي تستمر لأسابيع فتستحق نظرة أدق. إليك العلامات التي قد تدل على أن الوقت قد حان لمراجعة طبيب الجهاز الهضمي.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Almost everyone deals with digestive trouble from time to time. A heavy meal, a stressful week, or a passing virus can throw things off for a few days, and matters usually settle on their own.",
            es: "Casi todo el mundo tiene molestias digestivas de vez en cuando. Una comida pesada, una semana estresante o un virus pasajero pueden alterar la digestión por unos días, y por lo general todo se normaliza por sí solo.",
            vi: "Hầu như ai cũng thỉnh thoảng gặp trục trặc về tiêu hóa. Một bữa ăn quá no, một tuần căng thẳng hay một đợt nhiễm vi-rút thoáng qua có thể làm rối loạn tiêu hóa trong vài ngày, và mọi chuyện thường tự ổn định trở lại.",
            ko: "누구나 때때로 소화 문제를 겪습니다. 푸짐한 식사, 스트레스가 심한 한 주, 잠깐 스쳐 가는 바이러스 감염이 며칠간 소화를 흐트러뜨릴 수 있지만, 대개는 저절로 가라앉습니다.",
            ar: "يواجه الجميع تقريبًا اضطرابات هضمية من وقت لآخر. فوجبة دسمة أو أسبوع مرهق أو فيروس عابر قد يعكّر صفو الهضم لبضعة أيام، ثم تعود الأمور عادةً إلى طبيعتها من تلقاء نفسها.",
          },
          {
            en: "The picture changes when symptoms stay. Digestive problems that last for weeks, keep returning, or start interfering with meals, sleep, or work deserve more than home remedies — they deserve a careful evaluation.",
            es: "El panorama cambia cuando los síntomas no desaparecen. Los problemas digestivos que duran semanas, que regresan una y otra vez o que empiezan a interferir con las comidas, el sueño o el trabajo merecen algo más que remedios caseros: merecen una evaluación cuidadosa.",
            vi: "Tình hình sẽ khác khi các triệu chứng không chịu biến mất. Những vấn đề tiêu hóa kéo dài hàng tuần, tái đi tái lại hoặc bắt đầu ảnh hưởng đến bữa ăn, giấc ngủ hay công việc xứng đáng nhận được nhiều hơn là các biện pháp tại nhà — chúng xứng đáng được thăm khám đánh giá cẩn thận.",
            ko: "그러나 증상이 사라지지 않고 계속되면 이야기가 달라집니다. 몇 주씩 지속되거나, 자꾸 재발하거나, 식사와 수면, 일에 지장을 주기 시작한 소화기 문제는 가정 요법으로 넘길 일이 아니라 세심한 평가가 필요한 일입니다.",
            ar: "لكن الصورة تتغير حين تبقى الأعراض. فمشكلات الهضم التي تستمر لأسابيع، أو تعاود الظهور مرارًا، أو تبدأ في التأثير على الطعام أو النوم أو العمل، تستحق أكثر من العلاجات المنزلية — إنها تستحق تقييمًا طبيًا دقيقًا.",
          },
        ],
      },
      {
        heading: {
          en: "Pain or Bowel Changes That Persist",
          es: "Dolor o cambios intestinales que persisten",
          vi: "Đau hoặc thay đổi thói quen đại tiện kéo dài",
          ko: "지속되는 통증이나 배변 변화",
          ar: "ألم أو تغيرات في الأمعاء لا تزول",
        },
        paragraphs: [
          {
            en: "Abdominal pain that continues or keeps coming back is one of the most common reasons people end up seeing a gastroenterologist. So are lasting shifts in bowel habits: diarrhea or constipation that goes on for more than a few weeks, or a pattern that alternates between the two.",
            es: "El dolor abdominal que continúa o que reaparece una y otra vez es una de las razones más comunes por las que las personas terminan consultando a un gastroenterólogo. También lo son los cambios duraderos en los hábitos intestinales: diarrea o estreñimiento que se prolonga por más de unas semanas, o un patrón que alterna entre los dos.",
            vi: "Đau bụng kéo dài hoặc tái đi tái lại là một trong những lý do phổ biến nhất khiến người bệnh cuối cùng phải tìm đến bác sĩ chuyên khoa tiêu hóa. Những thay đổi kéo dài trong thói quen đại tiện cũng vậy: tiêu chảy hoặc táo bón kéo dài hơn vài tuần, hoặc kiểu đại tiện luân phiên giữa hai tình trạng này.",
            ko: "계속되거나 자꾸 재발하는 복통은 사람들이 결국 소화기내과 전문의를 찾게 되는 가장 흔한 이유 중 하나입니다. 배변 습관의 지속적인 변화도 마찬가지입니다. 몇 주 이상 이어지는 설사나 변비, 또는 두 가지가 번갈아 나타나는 양상이 그렇습니다.",
            ar: "ألم البطن الذي يستمر أو يعاود الظهور مرارًا هو من أكثر الأسباب شيوعًا التي تدفع الناس في النهاية إلى مراجعة طبيب الجهاز الهضمي. وكذلك التغيرات المستمرة في عادات التبرز: إسهال أو إمساك يدوم أكثر من بضعة أسابيع، أو نمط يتناوب بينهما.",
          },
          {
            en: "Symptoms like these have many possible explanations, from irritable bowel syndrome to inflammation somewhere in the digestive tract. Testing is often the only way to tell them apart, and it is far better to know than to guess.",
            es: "Síntomas como estos tienen muchas explicaciones posibles, desde el síndrome del intestino irritable hasta una inflamación en algún punto del tubo digestivo. Con frecuencia, los estudios son la única manera de distinguirlas, y siempre es mejor saber que adivinar.",
            vi: "Những triệu chứng như vậy có nhiều cách giải thích khả dĩ, từ hội chứng ruột kích thích đến tình trạng viêm ở đâu đó trong đường tiêu hóa. Thông thường, chỉ có làm xét nghiệm mới phân biệt được chúng, và biết rõ vẫn tốt hơn nhiều so với phỏng đoán.",
            ko: "이러한 증상의 원인은 과민성 대장 증후군에서 소화관 어딘가의 염증까지 매우 다양합니다. 이를 구별하려면 검사가 유일한 방법인 경우가 많으며, 짐작만 하는 것보다 정확히 아는 것이 훨씬 낫습니다.",
            ar: "لمثل هذه الأعراض تفسيرات محتملة كثيرة، من متلازمة القولون العصبي إلى التهاب في موضع ما من الجهاز الهضمي. وكثيرًا ما تكون الفحوصات هي السبيل الوحيد للتمييز بينها، والمعرفة أفضل بكثير من التخمين.",
          },
        ],
      },
      {
        heading: {
          en: "Heartburn That Keeps Coming Back",
          es: "Acidez que reaparece una y otra vez",
          vi: "Ợ nóng tái đi tái lại",
          ko: "자꾸 재발하는 속쓰림",
          ar: "حرقة معدة تعاود الظهور مرارًا",
        },
        paragraphs: [
          {
            en: "Occasional heartburn after a big or spicy meal is common. When reflux flares several times a week, though, or you find yourself relying on antacids day after day, it may be gastroesophageal reflux disease, known as GERD.",
            es: "Es común sentir acidez ocasional después de una comida abundante o condimentada. Sin embargo, cuando el reflujo aparece varias veces por semana, o usted depende de antiácidos día tras día, puede tratarse de la enfermedad por reflujo gastroesofágico, conocida como ERGE.",
            vi: "Thỉnh thoảng bị ợ nóng sau một bữa ăn thịnh soạn hoặc cay là chuyện thường gặp. Tuy nhiên, khi chứng trào ngược bùng lên vài lần mỗi tuần, hoặc quý vị thấy mình phải dựa vào thuốc kháng axit ngày này qua ngày khác, đó có thể là bệnh trào ngược dạ dày thực quản, thường gọi là GERD.",
            ko: "푸짐하거나 매운 음식을 먹은 뒤 가끔 속쓰림을 느끼는 것은 흔한 일입니다. 하지만 역류가 일주일에 여러 번 나타나거나 날마다 제산제에 의존하게 된다면, 위식도 역류 질환, 즉 GERD일 수 있습니다.",
            ar: "من الشائع الشعور بحرقة المعدة أحيانًا بعد وجبة كبيرة أو حارّة. ولكن عندما يشتد الارتجاع عدة مرات في الأسبوع، أو تجد نفسك تعتمد على مضادات الحموضة يومًا بعد يوم، فقد يكون ذلك مرض الارتجاع المعدي المريئي، المعروف باسم GERD.",
          },
          {
            en: "Reflux that goes unaddressed can irritate the esophagus over time. A specialist can confirm what is happening and recommend ways to protect the esophagus and manage day-to-day symptoms.",
            es: "El reflujo que no se atiende puede irritar el esófago con el tiempo. Un especialista puede confirmar qué está ocurriendo y recomendar maneras de proteger el esófago y controlar los síntomas del día a día.",
            vi: "Chứng trào ngược không được xử trí có thể kích ứng thực quản theo thời gian. Bác sĩ chuyên khoa có thể xác nhận điều gì đang xảy ra và đề xuất các cách bảo vệ thực quản cũng như kiểm soát triệu chứng hằng ngày.",
            ko: "그대로 방치한 역류는 시간이 지나면서 식도를 자극할 수 있습니다. 전문의는 무슨 일이 일어나고 있는지 확인하고, 식도를 보호하면서 일상적인 증상을 관리하는 방법을 권해 드릴 수 있습니다.",
            ar: "الارتجاع الذي يُترك دون علاج قد يهيّج المريء مع مرور الوقت. ويمكن للطبيب المتخصص أن يتأكد مما يحدث وأن يوصي بطرق لحماية المريء والسيطرة على الأعراض اليومية.",
          },
        ],
      },
      {
        heading: {
          en: "Symptoms That Should Not Wait",
          es: "Síntomas que no deben esperar",
          vi: "Những triệu chứng không nên chờ đợi",
          ko: "미루면 안 되는 증상",
          ar: "أعراض لا تحتمل الانتظار",
        },
        paragraphs: [
          {
            en: "Some signs call for prompt attention rather than watchful waiting: blood in the stool, difficulty swallowing, persistent nausea or vomiting, weight loss you can't explain, and fatigue with no clear cause.",
            es: "Algunas señales requieren atención pronta en lugar de espera: sangre en las heces, dificultad para tragar, náuseas o vómitos persistentes, una pérdida de peso que no puede explicar y fatiga sin causa clara.",
            vi: "Một số dấu hiệu đòi hỏi được thăm khám sớm thay vì chỉ theo dõi chờ đợi: máu trong phân, khó nuốt, buồn nôn hoặc nôn kéo dài, sụt cân không giải thích được và mệt mỏi không rõ nguyên nhân.",
            ko: "어떤 신호들은 지켜보며 기다리기보다 신속한 진료가 필요합니다. 혈변, 삼킴 곤란, 지속되는 메스꺼움이나 구토, 이유를 알 수 없는 체중 감소, 뚜렷한 원인이 없는 피로가 그렇습니다.",
            ar: "بعض العلامات تستدعي اهتمامًا عاجلًا بدلًا من الترقب والانتظار: دم في البراز، وصعوبة في البلع، وغثيان أو قيء مستمر، وفقدان وزن لا تجد له تفسيرًا، وتعب دون سبب واضح.",
          },
          {
            en: "These symptoms do not automatically mean something serious is wrong, but they can point to conditions that are much easier to address when found early. Don't wait for them to resolve on their own.",
            es: "Estos síntomas no significan automáticamente que exista algo grave, pero pueden indicar condiciones que son mucho más fáciles de atender cuando se detectan a tiempo. No espere a que desaparezcan por sí solos.",
            vi: "Những triệu chứng này không mặc nhiên có nghĩa là có điều gì đó nghiêm trọng, nhưng chúng có thể chỉ ra những bệnh lý sẽ dễ xử trí hơn nhiều nếu được phát hiện sớm. Đừng chờ chúng tự khỏi.",
            ko: "이러한 증상이 있다고 해서 반드시 심각한 문제가 있다는 뜻은 아니지만, 일찍 발견할수록 훨씬 다루기 쉬운 질환을 가리키는 신호일 수 있습니다. 저절로 나아지기를 기다리지 마십시오.",
            ar: "لا تعني هذه الأعراض تلقائيًا وجود مشكلة خطيرة، لكنها قد تشير إلى حالات يكون التعامل معها أسهل بكثير عند اكتشافها مبكرًا. فلا تنتظر أن تزول من تلقاء نفسها.",
          },
        ],
      },
      {
        heading: {
          en: "How a Gastroenterologist Can Help",
          es: "Cómo puede ayudar un gastroenterólogo",
          vi: "Bác sĩ chuyên khoa tiêu hóa có thể giúp gì",
          ko: "소화기내과 전문의가 드릴 수 있는 도움",
          ar: "كيف يمكن لطبيب الجهاز الهضمي أن يساعد",
        },
        paragraphs: [
          {
            en: "Gastroenterologists focus entirely on the digestive system. They can order the right tests, perform procedures such as endoscopy or colonoscopy when needed, and build a treatment plan aimed at the cause of your symptoms rather than just the discomfort.",
            es: "Los gastroenterólogos se dedican por completo al sistema digestivo. Pueden ordenar los estudios adecuados, realizar procedimientos como la endoscopia o la colonoscopia cuando se necesitan, y elaborar un plan de tratamiento dirigido a la causa de sus síntomas y no solo al malestar.",
            vi: "Bác sĩ chuyên khoa tiêu hóa tập trung hoàn toàn vào hệ tiêu hóa. Họ có thể chỉ định đúng các xét nghiệm cần thiết, thực hiện các thủ thuật như nội soi hay nội soi đại tràng khi cần, và xây dựng phác đồ điều trị nhắm vào nguyên nhân gây ra triệu chứng chứ không chỉ vào cảm giác khó chịu.",
            ko: "소화기내과 전문의는 오로지 소화기계에 집중합니다. 알맞은 검사를 처방하고, 필요할 때 내시경이나 대장 내시경 같은 시술을 시행하며, 단순히 불편함을 달래는 것이 아니라 증상의 원인을 겨냥한 치료 계획을 세울 수 있습니다.",
            ar: "يركّز أطباء الجهاز الهضمي عملهم كله على الجهاز الهضمي. فبإمكانهم طلب الفحوصات المناسبة، وإجراء عمليات مثل التنظير الداخلي أو تنظير القولون عند الحاجة، ووضع خطة علاج تستهدف سبب الأعراض لا مجرد الشعور بالانزعاج.",
          },
          {
            en: "If your digestion hasn't felt right for weeks, trust that instinct. An early conversation with a specialist can bring clarity — and a plan for protecting your digestive health over the long run.",
            es: "Si su digestión no se ha sentido bien por semanas, confíe en esa intuición. Una conversación temprana con un especialista puede brindarle claridad, y un plan para proteger su salud digestiva a largo plazo.",
            vi: "Nếu hệ tiêu hóa của quý vị đã không ổn suốt nhiều tuần, hãy tin vào trực giác đó. Trao đổi sớm với bác sĩ chuyên khoa có thể mang lại sự sáng tỏ — và một kế hoạch bảo vệ sức khỏe tiêu hóa của quý vị về lâu dài.",
            ko: "몇 주째 소화가 편치 않다고 느껴진다면 그 직감을 믿으시기 바랍니다. 전문의와 일찍 상담하면 상황이 분명해지고, 장기적으로 소화기 건강을 지킬 계획도 세울 수 있습니다.",
            ar: "إذا كنت تشعر منذ أسابيع بأن هضمك ليس على ما يرام، فثق بهذا الإحساس. فالحديث المبكر مع طبيب متخصص يمكن أن يجلب الوضوح — وخطة لحماية صحة جهازك الهضمي على المدى البعيد.",
          },
        ],
      },
    ],
  },
  {
    slug: "common-digestive-habits-that-impact-daily-comfort",
    legacyPath: "/blog/1428373-common-digestive-habits-that-impact-daily-comfort",
    title: {
      en: "Common Digestive Habits That Impact Daily Comfort",
      es: "Hábitos digestivos comunes que afectan su comodidad diaria",
      vi: "Những thói quen tiêu hóa thường gặp ảnh hưởng đến sự thoải mái hằng ngày",
      ko: "일상의 편안함을 좌우하는 흔한 소화 습관",
      ar: "عادات هضمية شائعة تؤثر في راحتك اليومية",
    },
    posted: "2026-02-24",
    teaser: {
      en: "How fast you eat, how much water you drink, and how you handle stress all shape how your gut feels. Small, steady adjustments can add up to noticeably more comfortable days.",
      es: "La rapidez con la que come, la cantidad de agua que toma y la forma en que maneja el estrés influyen en cómo se siente su sistema digestivo. Los ajustes pequeños y constantes pueden traducirse en días notablemente más cómodos.",
      vi: "Tốc độ ăn, lượng nước uống và cách quý vị ứng phó với căng thẳng đều góp phần định hình cảm giác của đường ruột. Những điều chỉnh nhỏ và đều đặn có thể cộng dồn thành những ngày dễ chịu hơn thấy rõ.",
      ko: "얼마나 빨리 먹는지, 물을 얼마나 마시는지, 스트레스를 어떻게 다스리는지가 모두 장의 상태를 좌우합니다. 작지만 꾸준한 조정이 쌓이면 하루하루가 눈에 띄게 편안해질 수 있습니다.",
      ar: "سرعة تناولك للطعام، وكمية الماء التي تشربها، وطريقة تعاملك مع التوتر، كلها تشكّل ما تشعر به أمعاؤك. والتعديلات الصغيرة المنتظمة قد تتراكم لتمنحك أيامًا أكثر راحة بشكل ملحوظ.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "How your stomach feels at the end of the day often has less to do with luck than with habit. Everyday choices around meals, fluids, movement, and stress all influence bloating, regularity, and overall comfort.",
            es: "Cómo se siente su estómago al final del día suele tener menos que ver con la suerte que con los hábitos. Las decisiones cotidianas sobre las comidas, los líquidos, el movimiento y el estrés influyen en la hinchazón, la regularidad y la comodidad general.",
            vi: "Cảm giác trong bụng của quý vị vào cuối ngày thường phụ thuộc vào thói quen nhiều hơn là may rủi. Những lựa chọn thường nhật về bữa ăn, nước uống, vận động và căng thẳng đều ảnh hưởng đến chứng chướng bụng, sự đều đặn của việc đại tiện và cảm giác dễ chịu nói chung.",
            ko: "하루가 끝날 무렵 속이 어떤가는 운보다 습관과 더 깊은 관련이 있는 경우가 많습니다. 식사, 수분 섭취, 몸의 움직임, 스트레스에 관한 일상의 선택들이 복부 팽만감, 규칙적인 배변, 전반적인 편안함에 모두 영향을 미칩니다.",
            ar: "ما تشعر به معدتك في نهاية اليوم كثيرًا ما يرتبط بالعادات أكثر مما يرتبط بالحظ. فالخيارات اليومية المتعلقة بالوجبات والسوائل والحركة والتوتر تؤثر جميعها في الانتفاخ وانتظام التبرز والراحة العامة.",
          },
          {
            en: "The encouraging part is that habits can change. Small, consistent adjustments are often enough to ease familiar complaints like gas, uncomfortable fullness, and irregularity.",
            es: "Lo alentador es que los hábitos pueden cambiar. Con frecuencia, pequeños ajustes constantes bastan para aliviar molestias conocidas como los gases, la sensación incómoda de llenura y la irregularidad.",
            vi: "Điều đáng mừng là thói quen có thể thay đổi được. Những điều chỉnh nhỏ nhưng đều đặn thường đủ để làm dịu các phiền toái quen thuộc như đầy hơi, cảm giác no căng khó chịu và đại tiện thất thường.",
            ko: "다행스러운 점은 습관은 바꿀 수 있다는 것입니다. 작지만 꾸준한 조정만으로도 가스, 불편한 더부룩함, 불규칙한 배변 같은 익숙한 불편들이 한결 나아지는 경우가 많습니다.",
            ar: "والجانب المشجع هو أن العادات قابلة للتغيير. فكثيرًا ما تكفي تعديلات صغيرة ومنتظمة لتخفيف الشكاوى المألوفة مثل الغازات والشعور المزعج بالامتلاء وعدم انتظام التبرز.",
          },
        ],
      },
      {
        heading: {
          en: "How You Eat Matters as Much as What You Eat",
          es: "Cómo come importa tanto como qué come",
          vi: "Cách ăn quan trọng không kém việc ăn gì",
          ko: "무엇을 먹는지 못지않게 어떻게 먹는지도 중요합니다",
          ar: "طريقة الأكل لا تقل أهمية عما تأكله",
        },
        paragraphs: [
          {
            en: "Eating quickly or finishing very large portions gives the digestive system a great deal to handle at once. Rushing also outpaces the body's fullness signals, which need time to catch up — so hurried meals often turn into oversized ones.",
            es: "Comer rápido o servirse porciones muy grandes le da al sistema digestivo demasiado que procesar de una sola vez. Además, comer con prisa se adelanta a las señales de saciedad del cuerpo, que tardan en llegar; por eso las comidas apuradas suelen convertirse en comidas excesivas.",
            vi: "Ăn nhanh hoặc ăn hết những phần ăn quá lớn khiến hệ tiêu hóa phải xử lý rất nhiều thứ cùng một lúc. Ăn vội cũng đi trước các tín hiệu no của cơ thể, vốn cần thời gian mới theo kịp — vì vậy những bữa ăn vội vàng thường biến thành những bữa ăn quá nhiều.",
            ko: "빨리 먹거나 아주 많은 양을 다 먹으면 소화기관이 한꺼번에 처리해야 할 일이 많아집니다. 서둘러 먹으면 뒤늦게 도착하는 몸의 포만감 신호보다 식사가 앞서 나가기 때문에, 급하게 먹은 식사는 과식으로 이어지기 쉽습니다.",
            ar: "الأكل بسرعة أو إنهاء كميات كبيرة جدًا يضع على الجهاز الهضمي عبئًا كبيرًا دفعة واحدة. كما أن الاستعجال يسبق إشارات الشبع في الجسم التي تحتاج وقتًا حتى تلحق — ولهذا كثيرًا ما تتحول الوجبات المتعجلة إلى وجبات مفرطة.",
          },
          {
            en: "Slowing down, chewing well, and spreading moderate portions across the day can make digestion feel smoother and keep energy steadier between meals. Lighter evening meals can also make bedtime more comfortable, especially for people prone to reflux.",
            es: "Comer más despacio, masticar bien y repartir porciones moderadas a lo largo del día puede hacer que la digestión se sienta más ligera y que la energía se mantenga más estable entre comidas. Cenar más ligero también puede hacer más cómoda la hora de dormir, sobre todo para quienes tienden a tener reflujo.",
            vi: "Ăn chậm lại, nhai kỹ và chia các phần ăn vừa phải ra trong ngày có thể giúp tiêu hóa nhẹ nhàng hơn và giữ năng lượng ổn định hơn giữa các bữa. Bữa tối nhẹ hơn cũng có thể giúp giờ đi ngủ dễ chịu hơn, nhất là với những người dễ bị trào ngược.",
            ko: "천천히 먹고, 꼭꼭 씹고, 적당한 양을 하루에 걸쳐 나누어 먹으면 소화가 한결 수월해지고 식사 사이 에너지도 더 안정적으로 유지됩니다. 저녁을 가볍게 먹으면 잠자리도 더 편안해지는데, 특히 역류가 잘 생기는 분들에게 그렇습니다.",
            ar: "التمهل في الأكل والمضغ الجيد وتوزيع كميات معتدلة على مدار اليوم يمكن أن يجعل الهضم أكثر سلاسة ويحافظ على طاقة أكثر ثباتًا بين الوجبات. كما أن عشاءً أخف يجعل وقت النوم أكثر راحة، خاصة لمن هم عرضة للارتجاع.",
          },
        ],
      },
      {
        heading: {
          en: "Water and Food Choices",
          es: "El agua y la elección de alimentos",
          vi: "Nước và lựa chọn thực phẩm",
          ko: "물과 음식의 선택",
          ar: "الماء وخيارات الطعام",
        },
        paragraphs: [
          {
            en: "Water softens food as it digests, helps it move through the intestines, and keeps bowel movements regular. Falling short is a common, easy-to-miss contributor to constipation, and it helps to sip steadily through the day instead of catching up with one big glass at night.",
            es: "El agua ablanda los alimentos durante la digestión, ayuda a que avancen por los intestinos y mantiene las evacuaciones regulares. Tomar poca agua es una causa común, y fácil de pasar por alto, del estreñimiento; ayuda beber a sorbos a lo largo del día en lugar de intentar compensar por la noche con un vaso grande.",
            vi: "Nước làm mềm thức ăn trong quá trình tiêu hóa, giúp thức ăn di chuyển qua ruột và giữ cho việc đại tiện đều đặn. Uống thiếu nước là một nguyên nhân phổ biến nhưng dễ bị bỏ qua của táo bón, và tốt hơn là uống từng ngụm đều đặn trong ngày thay vì bù lại bằng một ly lớn vào buổi tối.",
            ko: "물은 소화 중인 음식을 부드럽게 하고, 음식물이 장을 지나가도록 돕고, 배변을 규칙적으로 유지해 줍니다. 수분 부족은 변비의 흔하지만 놓치기 쉬운 원인이며, 밤에 큰 잔으로 몰아 마시기보다 하루 동안 꾸준히 조금씩 마시는 것이 도움이 됩니다.",
            ar: "الماء يليّن الطعام أثناء هضمه، ويساعده على التحرك عبر الأمعاء، ويحافظ على انتظام التبرز. ونقص شرب الماء سبب شائع للإمساك يسهل إغفاله، ومن المفيد الشرب برشفات منتظمة على مدار اليوم بدلًا من التعويض بكوب كبير في الليل.",
          },
          {
            en: "Food choices matter too, and they are personal. Fried or heavily processed foods, large amounts of sugar, dairy, or strongly seasoned dishes bother some people and not others. Noticing how you feel after meals — even keeping brief notes for a couple of weeks — can reveal patterns worth acting on.",
            es: "La elección de alimentos también importa, y es algo personal. Las frituras o los alimentos muy procesados, el exceso de azúcar, los lácteos o los platos muy condimentados les caen mal a algunas personas y a otras no. Prestar atención a cómo se siente después de comer —incluso tomar notas breves durante un par de semanas— puede revelar patrones que vale la pena atender.",
            vi: "Lựa chọn thực phẩm cũng quan trọng, và điều này tùy từng người. Đồ chiên rán hoặc thực phẩm chế biến công nghiệp, nhiều đường, sữa và các chế phẩm từ sữa, hay các món nêm nếm đậm gây khó chịu cho người này nhưng lại không sao với người khác. Để ý xem quý vị cảm thấy thế nào sau bữa ăn — thậm chí ghi chú ngắn gọn trong đôi ba tuần — có thể giúp phát hiện những quy luật đáng để điều chỉnh.",
            ko: "음식 선택도 중요하며, 이는 사람마다 다릅니다. 튀긴 음식이나 고도로 가공된 식품, 다량의 설탕, 유제품, 양념이 강한 음식이 어떤 사람에게는 탈이 되고 다른 사람에게는 괜찮습니다. 식사 후 몸 상태를 살펴보면 — 두어 주 동안 간단히 기록해 보는 것만으로도 — 조치해 볼 만한 패턴을 발견할 수 있습니다.",
            ar: "خيارات الطعام مهمة أيضًا، وهي مسألة شخصية. فالأطعمة المقلية أو عالية المعالجة، والكميات الكبيرة من السكر، ومنتجات الألبان، والأطباق كثيرة التوابل تزعج بعض الناس دون غيرهم. وملاحظة ما تشعر به بعد الوجبات — بل وتدوين ملاحظات موجزة لأسبوعين أو نحو ذلك — قد تكشف أنماطًا تستحق التصرف بناءً عليها.",
          },
        ],
      },
      {
        heading: {
          en: "Movement and Stress",
          es: "El movimiento y el estrés",
          vi: "Vận động và căng thẳng",
          ko: "몸의 움직임과 스트레스",
          ar: "الحركة والتوتر",
        },
        paragraphs: [
          {
            en: "The gut works better when the body moves. Regular activity helps food travel through the digestive tract, while long sedentary stretches can slow everything down. Even a short walk after meals may ease bloating.",
            es: "El intestino trabaja mejor cuando el cuerpo se mueve. La actividad regular ayuda a que los alimentos avancen por el tubo digestivo, mientras que pasar muchas horas sentado puede volverlo todo más lento. Incluso una caminata corta después de comer puede aliviar la hinchazón.",
            vi: "Đường ruột hoạt động tốt hơn khi cơ thể vận động. Hoạt động đều đặn giúp thức ăn di chuyển qua đường tiêu hóa, trong khi ngồi lâu một chỗ trong thời gian dài có thể khiến mọi thứ chậm lại. Chỉ cần đi bộ một quãng ngắn sau bữa ăn cũng có thể làm dịu chứng chướng bụng.",
            ko: "몸이 움직여야 장도 더 잘 움직입니다. 규칙적인 활동은 음식물이 소화관을 지나가도록 돕는 반면, 오래 앉아만 있으면 모든 과정이 느려질 수 있습니다. 식사 후 잠깐 걷는 것만으로도 복부 팽만감이 줄어들 수 있습니다.",
            ar: "تعمل الأمعاء على نحو أفضل عندما يتحرك الجسم. فالنشاط المنتظم يساعد الطعام على الانتقال عبر الجهاز الهضمي، بينما قد تؤدي فترات الجلوس الطويلة إلى إبطاء كل شيء. وحتى المشي القصير بعد الوجبات قد يخفف الانتفاخ.",
          },
          {
            en: "Stress shows up in the gut as well, often as cramping, appetite changes, or irregular bowel habits. Consistent sleep, a few minutes of slow breathing, and a predictable daily routine can quiet some of that noise.",
            es: "El estrés también se refleja en el intestino, muchas veces en forma de cólicos, cambios de apetito o hábitos intestinales irregulares. Dormir con horarios constantes, dedicar unos minutos a respirar despacio y mantener una rutina diaria predecible puede calmar parte de ese efecto.",
            vi: "Căng thẳng cũng biểu hiện ở đường ruột, thường dưới dạng đau quặn bụng, thay đổi cảm giác ngon miệng hoặc đại tiện thất thường. Ngủ nghỉ điều độ, dành vài phút hít thở chậm và giữ nếp sinh hoạt hằng ngày ổn định có thể làm dịu bớt phần nào những xáo trộn đó.",
            ko: "스트레스도 장에 나타나는데, 흔히 복부 경련, 식욕 변화, 불규칙한 배변 습관의 형태를 띱니다. 일정한 수면, 몇 분간의 느린 호흡, 예측 가능한 하루 일과가 그런 동요를 어느 정도 가라앉혀 줄 수 있습니다.",
            ar: "يظهر التوتر في الأمعاء أيضًا، وكثيرًا ما يكون على شكل تقلصات أو تغيرات في الشهية أو عادات تبرز غير منتظمة. والنوم المنتظم، وبضع دقائق من التنفس البطيء، وروتين يومي ثابت، كلها قد تهدئ شيئًا من هذا الاضطراب.",
          },
        ],
      },
      {
        heading: {
          en: "When Habits Aren't Enough",
          es: "Cuando los hábitos no bastan",
          vi: "Khi thói quen thôi là chưa đủ",
          ko: "습관만으로 부족할 때",
          ar: "عندما لا تكفي العادات",
        },
        paragraphs: [
          {
            en: "Lifestyle changes go a long way, but they have limits. Bloating, abdominal pain, or bowel changes that persist despite your best efforts — or weight changes you can't explain — should be evaluated by a gastroenterologist.",
            es: "Los cambios de estilo de vida ayudan mucho, pero tienen límites. La hinchazón, el dolor abdominal o los cambios intestinales que persisten a pesar de sus esfuerzos —o los cambios de peso que no puede explicar— deben ser evaluados por un gastroenterólogo.",
            vi: "Thay đổi lối sống giúp ích rất nhiều, nhưng cũng có giới hạn. Chướng bụng, đau bụng hoặc thay đổi thói quen đại tiện vẫn dai dẳng dù quý vị đã cố gắng hết sức — hoặc thay đổi cân nặng mà quý vị không giải thích được — cần được bác sĩ chuyên khoa tiêu hóa thăm khám đánh giá.",
            ko: "생활 습관 개선은 큰 힘이 되지만 한계도 있습니다. 최선을 다했는데도 복부 팽만감, 복통, 배변 변화가 계속되거나 이유를 알 수 없는 체중 변화가 있다면 소화기내과 전문의의 평가를 받아야 합니다.",
            ar: "تغييرات نمط الحياة تفيد كثيرًا، لكن لها حدودًا. فالانتفاخ أو ألم البطن أو تغيرات التبرز التي تستمر رغم بذل قصارى جهدك — أو تغيرات الوزن التي لا تجد لها تفسيرًا — ينبغي أن يقيّمها طبيب الجهاز الهضمي.",
          },
          {
            en: "A specialist can determine whether an underlying condition is at work and help you address it directly. Getting answers early is one of the simplest ways to protect your long-term digestive comfort and health.",
            es: "Un especialista puede determinar si hay una condición de fondo y ayudarle a atenderla directamente. Obtener respuestas a tiempo es una de las maneras más sencillas de proteger su comodidad y su salud digestiva a largo plazo.",
            vi: "Bác sĩ chuyên khoa có thể xác định liệu có một bệnh lý tiềm ẩn đang gây ra vấn đề hay không và giúp quý vị xử trí tận gốc. Tìm được câu trả lời sớm là một trong những cách đơn giản nhất để bảo vệ sự thoải mái và sức khỏe tiêu hóa lâu dài của quý vị.",
            ko: "전문의는 숨어 있는 질환이 원인인지 판단하고 이를 직접 해결하도록 도와드릴 수 있습니다. 일찍 답을 얻는 것은 장기적인 소화기 편안함과 건강을 지키는 가장 간단한 방법 중 하나입니다.",
            ar: "يستطيع الطبيب المتخصص تحديد ما إذا كانت هناك حالة كامنة وراء ذلك ومساعدتك على معالجتها مباشرة. والحصول على إجابات مبكرًا من أبسط الطرق لحماية راحتك الهضمية وصحتك على المدى البعيد.",
          },
        ],
      },
    ],
  },
  {
    slug: "how-gut-health-supports-immune-function-and-energy",
    legacyPath: "/blog/1423233-how-gut-health-supports-immune-function-and-energy",
    title: {
      en: "How Gut Health Supports Immune Function and Energy",
      es: "Cómo la salud intestinal apoya la función inmunitaria y la energía",
      vi: "Sức khỏe đường ruột hỗ trợ chức năng miễn dịch và năng lượng như thế nào",
      ko: "장 건강이 면역 기능과 활력을 뒷받침하는 방식",
      ar: "كيف تدعم صحة الأمعاء وظيفة المناعة والطاقة",
    },
    posted: "2026-02-06",
    teaser: {
      en: "Your gut does far more than digest food — it houses much of your immune defense and supplies the fuel behind your daily energy. Here's how that connection works and how to care for it.",
      es: "Su intestino hace mucho más que digerir alimentos: alberga gran parte de su defensa inmunitaria y aporta el combustible de su energía diaria. Le explicamos cómo funciona esa conexión y cómo cuidarla.",
      vi: "Đường ruột của quý vị làm được nhiều việc hơn hẳn chuyện tiêu hóa thức ăn — nơi đây tập trung phần lớn hàng rào miễn dịch và cung cấp nguồn nhiên liệu cho năng lượng mỗi ngày của quý vị. Sau đây là cách mối liên hệ này vận hành và cách chăm sóc nó.",
      ko: "장은 음식을 소화하는 것보다 훨씬 많은 일을 합니다. 면역 방어의 상당 부분이 장에 자리 잡고 있고, 하루하루의 활력을 만드는 연료도 장에서 공급됩니다. 그 연결 고리가 어떻게 작동하고 어떻게 돌보면 되는지 소개합니다.",
      ar: "تفعل أمعاؤك أكثر بكثير من هضم الطعام — فهي تحتضن جزءًا كبيرًا من دفاعك المناعي وتوفر الوقود الذي يقف وراء طاقتك اليومية. إليك كيف تعمل هذه الصلة وكيف تعتني بها.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "It is easy to think of the gut as a simple food processor, but it does much more than digest meals. The gastrointestinal tract absorbs the vitamins and minerals the body runs on, and it plays a surprisingly large role in defending against illness.",
            es: "Es fácil pensar en el intestino como un simple procesador de alimentos, pero hace mucho más que digerir comidas. El tubo digestivo absorbe las vitaminas y los minerales con los que funciona el cuerpo, y cumple un papel sorprendentemente importante en la defensa contra las enfermedades.",
            vi: "Chúng ta dễ nghĩ về đường ruột như một cỗ máy xử lý thức ăn đơn thuần, nhưng nó làm được nhiều hơn hẳn việc tiêu hóa các bữa ăn. Đường tiêu hóa hấp thu các vitamin và khoáng chất mà cơ thể cần để hoạt động, và đóng một vai trò lớn đến bất ngờ trong việc chống lại bệnh tật.",
            ko: "장을 단순한 음식 처리 장치로 생각하기 쉽지만, 장은 식사를 소화하는 것보다 훨씬 많은 일을 합니다. 위장관은 몸을 움직이는 데 필요한 비타민과 미네랄을 흡수하며, 질병을 막아 내는 데에도 놀랄 만큼 큰 역할을 합니다.",
            ar: "من السهل النظر إلى الأمعاء على أنها مجرد جهاز لمعالجة الطعام، لكنها تفعل ما هو أكثر بكثير من هضم الوجبات. فالقناة الهضمية تمتص الفيتامينات والمعادن التي يعمل بها الجسم، وتؤدي دورًا كبيرًا على نحو مدهش في الدفاع ضد المرض.",
          },
          {
            en: "When digestion works well, the benefits reach the whole body: steadier energy, stronger defenses, and a more consistent sense of feeling well.",
            es: "Cuando la digestión funciona bien, los beneficios llegan a todo el cuerpo: energía más estable, defensas más fuertes y una sensación de bienestar más constante.",
            vi: "Khi tiêu hóa hoạt động tốt, lợi ích lan tỏa khắp cơ thể: năng lượng ổn định hơn, sức đề kháng mạnh hơn và cảm giác khỏe khoắn đều đặn hơn.",
            ko: "소화가 잘되면 그 혜택은 온몸에 미칩니다. 에너지가 더 안정되고, 방어력이 더 튼튼해지고, 몸이 좋다는 느낌이 더 한결같아집니다.",
            ar: "عندما يعمل الهضم جيدًا، تمتد الفوائد إلى الجسم كله: طاقة أكثر ثباتًا، ودفاعات أقوى، وشعور بالعافية أكثر انتظامًا.",
          },
        ],
      },
      {
        heading: {
          en: "Your Gut Is Part of Your Immune System",
          es: "Su intestino es parte de su sistema inmunitario",
          vi: "Đường ruột là một phần của hệ miễn dịch",
          ko: "장은 면역 체계의 일부입니다",
          ar: "أمعاؤك جزء من جهازك المناعي",
        },
        paragraphs: [
          {
            en: "Much of the body's immune activity happens in and around the digestive tract. The intestinal lining forms a barrier that keeps harmful bacteria and other unwanted substances out of the bloodstream, while the community of beneficial bacteria living in the gut helps regulate immune responses and keep inflammation in check.",
            es: "Gran parte de la actividad inmunitaria del cuerpo ocurre en el tubo digestivo y a su alrededor. El revestimiento intestinal forma una barrera que impide que bacterias dañinas y otras sustancias indeseadas pasen a la sangre, mientras que la comunidad de bacterias beneficiosas que vive en el intestino ayuda a regular las respuestas inmunitarias y a mantener la inflamación bajo control.",
            vi: "Phần lớn hoạt động miễn dịch của cơ thể diễn ra trong và xung quanh đường tiêu hóa. Niêm mạc ruột tạo thành một hàng rào ngăn vi khuẩn có hại và các chất không mong muốn khác xâm nhập vào máu, trong khi quần thể vi khuẩn có lợi sống trong ruột giúp điều hòa các phản ứng miễn dịch và kiềm chế tình trạng viêm.",
            ko: "몸의 면역 활동 가운데 많은 부분이 소화관 안팎에서 일어납니다. 장 점막은 해로운 세균과 원치 않는 물질이 혈류로 들어가지 못하게 막는 장벽을 이루고, 장에 사는 유익균 무리는 면역 반응을 조절하고 염증을 억제하는 데 도움을 줍니다.",
            ar: "يحدث جزء كبير من النشاط المناعي للجسم داخل الجهاز الهضمي وحوله. فبطانة الأمعاء تشكّل حاجزًا يمنع البكتيريا الضارة والمواد غير المرغوب فيها من الوصول إلى مجرى الدم، بينما يساعد مجتمع البكتيريا النافعة الذي يعيش في الأمعاء على تنظيم الاستجابات المناعية وإبقاء الالتهاب تحت السيطرة.",
          },
          {
            en: "When that bacterial balance is disturbed — by illness, certain medications, or a poor diet — immune defenses can be affected along with it. Caring for your digestion is one way of supporting the body's own protections.",
            es: "Cuando ese equilibrio bacteriano se altera —por una enfermedad, ciertos medicamentos o una mala alimentación—, las defensas inmunitarias también pueden verse afectadas. Cuidar la digestión es una forma de apoyar las protecciones propias del cuerpo.",
            vi: "Khi sự cân bằng vi khuẩn đó bị xáo trộn — do bệnh tật, một số loại thuốc hoặc chế độ ăn kém lành mạnh — sức phòng vệ miễn dịch cũng có thể bị ảnh hưởng theo. Chăm sóc tiêu hóa là một cách hỗ trợ các cơ chế bảo vệ tự nhiên của cơ thể.",
            ko: "질병, 특정 약물, 부실한 식사로 이 세균 균형이 흔들리면 면역 방어도 함께 영향을 받을 수 있습니다. 소화를 잘 돌보는 것은 몸이 스스로를 지키는 힘을 뒷받침하는 한 가지 방법입니다.",
            ar: "وعندما يختل هذا التوازن البكتيري — بسبب مرض أو أدوية معينة أو نظام غذائي سيئ — قد تتأثر معه الدفاعات المناعية. والاعتناء بهضمك هو إحدى طرق دعم وسائل الحماية الذاتية في الجسم.",
          },
        ],
      },
      {
        heading: {
          en: "Where Daily Energy Comes From",
          es: "De dónde viene la energía diaria",
          vi: "Năng lượng hằng ngày đến từ đâu",
          ko: "일상의 에너지가 나오는 곳",
          ar: "من أين تأتي الطاقة اليومية",
        },
        paragraphs: [
          {
            en: "Every bit of energy you use starts as food the gut must break down and absorb. Nutrients such as protein, iron, B vitamins, and magnesium are especially important for stamina and muscle strength.",
            es: "Toda la energía que usted usa comienza como alimento que el intestino debe descomponer y absorber. Nutrientes como las proteínas, el hierro, las vitaminas B y el magnesio son especialmente importantes para la resistencia y la fuerza muscular.",
            vi: "Từng chút năng lượng quý vị sử dụng đều khởi đầu từ thức ăn mà đường ruột phải phân giải và hấp thu. Các chất dinh dưỡng như chất đạm, sắt, các vitamin nhóm B và magiê đặc biệt quan trọng cho sức bền và sức mạnh cơ bắp.",
            ko: "우리가 쓰는 에너지는 모두 장이 분해하고 흡수해야 하는 음식에서 시작됩니다. 단백질, 철분, 비타민 B군, 마그네슘 같은 영양소는 지구력과 근력에 특히 중요합니다.",
            ar: "كل ذرة من الطاقة التي تستخدمها تبدأ في صورة طعام يتعين على الأمعاء تفكيكه وامتصاصه. وتكتسي عناصر غذائية مثل البروتين والحديد وفيتامينات ب والمغنيسيوم أهمية خاصة للقدرة على التحمل وقوة العضلات.",
          },
          {
            en: "If absorption is impaired, fatigue can set in even when you are eating well. Bloating, discomfort, and irregular bowel habits can also interrupt sleep and make it harder to concentrate, which compounds the tiredness.",
            es: "Si la absorción está afectada, el cansancio puede aparecer aun cuando usted come bien. La hinchazón, las molestias y los hábitos intestinales irregulares también pueden interrumpir el sueño y dificultar la concentración, lo que agrava la fatiga.",
            vi: "Nếu khả năng hấp thu bị suy giảm, mệt mỏi có thể xuất hiện ngay cả khi quý vị ăn uống đầy đủ. Chướng bụng, cảm giác khó chịu và đại tiện thất thường cũng có thể làm gián đoạn giấc ngủ và khiến khó tập trung hơn, càng chồng chất thêm sự mệt mỏi.",
            ko: "흡수가 제대로 되지 않으면 잘 먹고 있어도 피로가 찾아올 수 있습니다. 복부 팽만감, 불편함, 불규칙한 배변 습관은 수면을 방해하고 집중을 어렵게 만들어 피로를 한층 가중시킵니다.",
            ar: "إذا تعطّل الامتصاص، فقد يتسلل التعب حتى وأنت تتناول طعامًا جيدًا. كما أن الانتفاخ والانزعاج وعادات التبرز غير المنتظمة قد تقطع النوم وتصعّب التركيز، مما يفاقم الإرهاق.",
          },
        ],
      },
      {
        heading: {
          en: "Everyday Factors That Shape Gut Health",
          es: "Factores cotidianos que influyen en la salud intestinal",
          vi: "Những yếu tố hằng ngày định hình sức khỏe đường ruột",
          ko: "장 건강을 좌우하는 일상 요인",
          ar: "عوامل يومية تشكّل صحة الأمعاء",
        },
        paragraphs: [
          {
            en: "Daily choices influence how well the gut performs. Fiber, fluids, regular meals, physical activity, and consistent sleep all support normal digestion, while ongoing stress and heavily processed diets tend to work against it.",
            es: "Las decisiones diarias influyen en el desempeño del intestino. La fibra, los líquidos, las comidas regulares, la actividad física y el sueño constante apoyan la digestión normal, mientras que el estrés continuo y las dietas muy procesadas tienden a perjudicarla.",
            vi: "Các lựa chọn hằng ngày ảnh hưởng đến hiệu quả hoạt động của đường ruột. Chất xơ, nước, các bữa ăn đúng giờ, hoạt động thể chất và giấc ngủ điều độ đều hỗ trợ tiêu hóa bình thường, trong khi căng thẳng kéo dài và chế độ ăn nhiều thực phẩm chế biến công nghiệp thường gây tác dụng ngược.",
            ko: "매일의 선택이 장의 기능을 좌우합니다. 식이섬유, 수분, 규칙적인 식사, 신체 활동, 일정한 수면은 모두 정상적인 소화를 뒷받침하는 반면, 계속되는 스트레스와 고도로 가공된 식단은 소화를 방해하는 쪽으로 작용합니다.",
            ar: "الخيارات اليومية تؤثر في مدى جودة أداء الأمعاء. فالألياف والسوائل والوجبات المنتظمة والنشاط البدني والنوم المنتظم كلها تدعم الهضم الطبيعي، بينما يميل التوتر المستمر والأنظمة الغذائية عالية المعالجة إلى العمل ضده.",
          },
          {
            en: "Some medications, including antibiotics and long-term use of acid-reducing medicines, can also shift the gut's bacterial balance. And chronic conditions such as irritable bowel syndrome, reflux, or inflammatory bowel disease may need medical care rather than lifestyle changes alone.",
            es: "Algunos medicamentos, incluidos los antibióticos y el uso prolongado de medicinas que reducen el ácido estomacal, también pueden alterar el equilibrio bacteriano del intestino. Y condiciones crónicas como el síndrome del intestino irritable, el reflujo o la enfermedad inflamatoria intestinal pueden requerir atención médica, no solo cambios de estilo de vida.",
            vi: "Một số loại thuốc, bao gồm kháng sinh và việc dùng lâu dài các thuốc giảm axit, cũng có thể làm thay đổi cân bằng vi khuẩn của đường ruột. Và những bệnh mạn tính như hội chứng ruột kích thích, trào ngược hay bệnh viêm ruột có thể cần đến chăm sóc y tế chứ không chỉ thay đổi lối sống.",
            ko: "항생제나 위산을 줄이는 약의 장기 복용을 비롯한 일부 약물도 장내 세균 균형을 바꿀 수 있습니다. 그리고 과민성 대장 증후군, 역류, 염증성 장 질환 같은 만성 질환은 생활 습관 개선만으로는 부족하고 의학적 치료가 필요할 수 있습니다.",
            ar: "بعض الأدوية، ومنها المضادات الحيوية والاستخدام الطويل الأمد لأدوية خفض الحموضة، قد تغيّر أيضًا التوازن البكتيري في الأمعاء. كما أن الحالات المزمنة مثل متلازمة القولون العصبي أو الارتجاع أو مرض التهاب الأمعاء قد تحتاج إلى رعاية طبية لا إلى تغييرات نمط الحياة وحدها.",
          },
        ],
      },
      {
        heading: {
          en: "When to Talk with a Gastroenterologist",
          es: "Cuándo hablar con un gastroenterólogo",
          vi: "Khi nào nên trao đổi với bác sĩ chuyên khoa tiêu hóa",
          ko: "소화기내과 전문의와 상담해야 할 때",
          ar: "متى ينبغي التحدث مع طبيب الجهاز الهضمي",
        },
        paragraphs: [
          {
            en: "If you are dealing with ongoing abdominal pain, frequent heartburn, changing bowel habits, or fatigue with no clear explanation, it is reasonable to have your digestive health evaluated.",
            es: "Si usted tiene dolor abdominal continuo, acidez frecuente, cambios en los hábitos intestinales o una fatiga sin explicación clara, es razonable buscar una evaluación de su salud digestiva.",
            vi: "Nếu quý vị đang chịu đựng đau bụng kéo dài, ợ nóng thường xuyên, thay đổi thói quen đại tiện hoặc mệt mỏi không có lời giải thích rõ ràng, thì việc đi khám đánh giá sức khỏe tiêu hóa là điều hợp lý.",
            ko: "지속되는 복통, 잦은 속쓰림, 배변 습관의 변화, 뚜렷한 이유 없는 피로를 겪고 있다면 소화기 건강 평가를 받아 보는 것이 합리적입니다.",
            ar: "إذا كنت تعاني ألمًا مستمرًا في البطن، أو حرقة معدة متكررة، أو تغيرًا في عادات التبرز، أو تعبًا بلا تفسير واضح، فمن المعقول أن تخضع صحتك الهضمية للتقييم.",
          },
          {
            en: "A gastroenterologist can look for underlying causes and recommend a plan suited to you. Supporting your gut is not a quick fix, but over time it is one of the most practical things you can do for your overall health.",
            es: "Un gastroenterólogo puede buscar las causas de fondo y recomendar un plan adecuado para usted. Cuidar el intestino no es una solución instantánea, pero con el tiempo es una de las cosas más prácticas que puede hacer por su salud general.",
            vi: "Bác sĩ chuyên khoa tiêu hóa có thể tìm các nguyên nhân tiềm ẩn và đề xuất một kế hoạch phù hợp với quý vị. Chăm lo cho đường ruột không phải là giải pháp tức thời, nhưng theo thời gian, đó là một trong những việc thiết thực nhất quý vị có thể làm cho sức khỏe tổng thể của mình.",
            ko: "소화기내과 전문의는 근본 원인을 찾고 자신에게 맞는 계획을 권해 드릴 수 있습니다. 장을 돌보는 일은 하루아침에 끝나는 일이 아니지만, 시간이 지나고 보면 전반적인 건강을 위해 할 수 있는 가장 실질적인 일 중 하나입니다.",
            ar: "يستطيع طبيب الجهاز الهضمي البحث عن الأسباب الكامنة والتوصية بخطة تناسبك. إن دعم أمعائك ليس حلًا سريعًا، لكنه مع مرور الوقت من أكثر الأمور العملية التي يمكنك القيام بها من أجل صحتك العامة.",
          },
        ],
      },
    ],
  },
  {
    slug: "how-digestive-health-affects-daily-energy-and-well-being",
    legacyPath: "/blog/1417811-how-digestive-health-affects-daily-energy-and-well-being",
    title: {
      en: "How Digestive Health Affects Daily Energy and Well-Being",
      es: "Cómo la salud digestiva influye en su energía y bienestar diarios",
      vi: "Sức khỏe tiêu hóa ảnh hưởng thế nào đến năng lượng và sự khỏe khoắn hằng ngày",
      ko: "소화기 건강이 일상의 활력과 웰빙에 미치는 영향",
      ar: "كيف تؤثر صحة الجهاز الهضمي في طاقتك وعافيتك اليومية",
    },
    posted: "2026-01-26",
    teaser: {
      en: "Fatigue, trouble focusing, and low mood can sometimes trace back to the digestive system. Understanding the link can help you decide when tiredness deserves a doctor's attention.",
      es: "El cansancio, la dificultad para concentrarse y el ánimo bajo a veces tienen su origen en el sistema digestivo. Entender esa conexión puede ayudarle a decidir cuándo la fatiga merece la atención de un médico.",
      vi: "Mệt mỏi, khó tập trung và tâm trạng uể oải đôi khi bắt nguồn từ hệ tiêu hóa. Hiểu được mối liên hệ này có thể giúp quý vị quyết định khi nào cơn mệt mỏi cần được bác sĩ quan tâm.",
      ko: "피로, 집중력 저하, 가라앉은 기분은 때때로 소화기계에서 비롯됩니다. 이 연관성을 이해하면 피곤함이 의사의 진료를 받아야 할 정도인지 판단하는 데 도움이 됩니다.",
      ar: "التعب وصعوبة التركيز وتراجع المزاج قد تعود جذورها أحيانًا إلى الجهاز الهضمي. وفهم هذه الصلة يساعدك على تحديد متى يستحق الإرهاق عناية الطبيب.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "When people feel run down week after week, digestion is rarely the first thing they suspect. Yet the digestive system sits at the center of daily well-being: it turns meals into usable energy, and when it struggles, fatigue, discomfort, and changes in mood or focus often follow.",
            es: "Cuando alguien se siente agotado semana tras semana, rara vez sospecha primero de la digestión. Sin embargo, el sistema digestivo está en el centro del bienestar diario: convierte las comidas en energía utilizable y, cuando tiene problemas, suelen aparecer fatiga, molestias y cambios en el ánimo o la concentración.",
            vi: "Khi cảm thấy kiệt sức tuần này qua tuần khác, hiếm ai nghĩ ngay đến tiêu hóa. Thế nhưng hệ tiêu hóa nằm ở trung tâm của sự khỏe khoắn hằng ngày: nó biến các bữa ăn thành năng lượng sử dụng được, và khi nó trục trặc, mệt mỏi, khó chịu cùng những thay đổi về tâm trạng hay khả năng tập trung thường kéo theo.",
            ko: "몇 주째 계속 기운이 없을 때 소화부터 의심하는 사람은 드뭅니다. 그러나 소화기계는 일상적 웰빙의 중심에 있습니다. 식사를 쓸 수 있는 에너지로 바꾸는 곳이 바로 소화기계이며, 여기가 제 역할을 못 하면 피로와 불편함, 기분이나 집중력의 변화가 뒤따르곤 합니다.",
            ar: "عندما يشعر المرء بالإنهاك أسبوعًا بعد أسبوع، نادرًا ما يكون الهضم أول ما يشك فيه. غير أن الجهاز الهضمي يقع في قلب العافية اليومية: فهو يحوّل الوجبات إلى طاقة قابلة للاستخدام، وعندما يتعثر، كثيرًا ما يتبع ذلك تعب وانزعاج وتغيرات في المزاج أو التركيز.",
          },
          {
            en: "Recognizing that connection matters, because it can point you toward answers — and the right care — sooner.",
            es: "Reconocer esa conexión es importante, porque puede orientarle hacia respuestas —y hacia la atención adecuada— más pronto.",
            vi: "Nhận ra mối liên hệ đó rất quan trọng, vì nó có thể đưa quý vị đến với câu trả lời — và sự chăm sóc phù hợp — sớm hơn.",
            ko: "이 연관성을 알아차리는 것이 중요합니다. 그래야 더 빨리 답을 찾고 알맞은 치료로 이어질 수 있기 때문입니다.",
            ar: "إدراك هذه الصلة مهم، لأنه قد يقودك إلى الإجابات — وإلى الرعاية المناسبة — في وقت أبكر.",
          },
        ],
      },
      {
        heading: {
          en: "From Food to Fuel",
          es: "De los alimentos a la energía",
          vi: "Từ thức ăn đến năng lượng",
          ko: "음식이 에너지가 되기까지",
          ar: "من الطعام إلى الطاقة",
        },
        paragraphs: [
          {
            en: "The body's energy supply depends on digestion doing its job. Carbohydrates, fats, proteins, vitamins, and minerals all have to be broken down and absorbed before cells can put them to use.",
            es: "El suministro de energía del cuerpo depende de que la digestión haga su trabajo. Los carbohidratos, las grasas, las proteínas, las vitaminas y los minerales deben descomponerse y absorberse antes de que las células puedan aprovecharlos.",
            vi: "Nguồn năng lượng của cơ thể phụ thuộc vào việc hệ tiêu hóa làm tốt nhiệm vụ của mình. Carbohydrate, chất béo, chất đạm, vitamin và khoáng chất đều phải được phân giải và hấp thu thì các tế bào mới sử dụng được.",
            ko: "몸의 에너지 공급은 소화가 제 몫을 해내는 데 달려 있습니다. 탄수화물, 지방, 단백질, 비타민, 미네랄 모두 분해되고 흡수되어야 비로소 세포가 활용할 수 있습니다.",
            ar: "يعتمد إمداد الجسم بالطاقة على قيام الهضم بعمله. فالكربوهيدرات والدهون والبروتينات والفيتامينات والمعادن يجب أن تُفكك وتُمتص جميعها قبل أن تتمكن الخلايا من الاستفادة منها.",
          },
          {
            en: "Inflammation, sluggish movement through the bowel, or an imbalance in gut bacteria can interfere with that process. When it does, you may feel weak or worn out even while eating a balanced diet. Many people are surprised to learn that their low energy and their stomach troubles are connected.",
            es: "La inflamación, un tránsito intestinal lento o un desequilibrio en las bacterias del intestino pueden interferir con ese proceso. Cuando eso ocurre, usted puede sentirse débil o agotado aunque lleve una dieta balanceada. A muchas personas les sorprende descubrir que su falta de energía y sus problemas estomacales están relacionados.",
            vi: "Tình trạng viêm, nhu động ruột chậm chạp hoặc mất cân bằng vi khuẩn đường ruột có thể cản trở quá trình đó. Khi điều đó xảy ra, quý vị có thể cảm thấy yếu sức hay rã rời dù vẫn ăn uống cân đối. Nhiều người ngạc nhiên khi biết rằng tình trạng thiếu năng lượng và các vấn đề dạ dày của họ có liên quan với nhau.",
            ko: "염증, 느려진 장운동, 장내 세균의 불균형은 이 과정을 방해할 수 있습니다. 그렇게 되면 균형 잡힌 식사를 하고 있어도 힘이 없고 지친 느낌이 들 수 있습니다. 기운 없는 것과 속이 불편한 것이 서로 이어져 있다는 사실에 놀라는 분들이 많습니다.",
            ar: "قد يعيق هذه العملية التهابٌ أو بطء في حركة الأمعاء أو خلل في توازن بكتيريا الأمعاء. وعندما يحدث ذلك، قد تشعر بالضعف أو الإنهاك حتى مع اتباع نظام غذائي متوازن. ويفاجأ كثيرون حين يعلمون أن انخفاض طاقتهم ومتاعب معدتهم مرتبطان.",
          },
        ],
      },
      {
        heading: {
          en: "How Digestive Problems Wear You Down",
          es: "Cómo lo desgastan los problemas digestivos",
          vi: "Các vấn đề tiêu hóa bào mòn sức lực của quý vị như thế nào",
          ko: "소화기 문제가 심신을 지치게 하는 과정",
          ar: "كيف تستنزفك مشكلات الجهاز الهضمي",
        },
        paragraphs: [
          {
            en: "Reflux, bloating, constipation, diarrhea, and irritable bowel symptoms are uncomfortable in their own right, and that discomfort affects concentration and patience. Symptoms that flare at night can also chip away at sleep, adding daytime drowsiness on top.",
            es: "El reflujo, la hinchazón, el estreñimiento, la diarrea y los síntomas de intestino irritable son incómodos por sí mismos, y esa incomodidad afecta la concentración y la paciencia. Los síntomas que se agravan de noche también pueden restarle sueño, sumando somnolencia durante el día.",
            vi: "Trào ngược, chướng bụng, táo bón, tiêu chảy và các triệu chứng ruột kích thích tự thân đã gây khó chịu, và sự khó chịu đó ảnh hưởng đến khả năng tập trung lẫn tính kiên nhẫn. Các triệu chứng bùng lên về đêm còn có thể gặm nhấm giấc ngủ, chồng thêm cơn buồn ngủ vào ban ngày.",
            ko: "역류, 복부 팽만감, 변비, 설사, 과민성 대장 증상은 그 자체로도 불편하고, 그 불편함은 집중력과 인내심에 영향을 줍니다. 밤에 심해지는 증상은 잠을 조금씩 갉아먹어 낮 동안의 졸음까지 더합니다.",
            ar: "الارتجاع والانتفاخ والإمساك والإسهال وأعراض القولون العصبي مزعجة في حد ذاتها، وهذا الانزعاج يؤثر في التركيز والصبر. والأعراض التي تشتد ليلًا قد تنال من النوم أيضًا، فتضيف نعاسًا نهاريًا فوق ذلك.",
          },
          {
            en: "Ongoing irritation in the digestive tract places quiet stress on the rest of the body as well. Over time, some people notice headaches, general aches, or simply a lasting sense of not feeling quite right, even when no single symptom seems serious.",
            es: "La irritación continua en el tubo digestivo también somete al resto del cuerpo a un estrés silencioso. Con el tiempo, algunas personas notan dolores de cabeza, malestares generales o simplemente una sensación persistente de no estar del todo bien, aun cuando ningún síntoma por sí solo parezca grave.",
            vi: "Sự kích ứng kéo dài trong đường tiêu hóa cũng âm thầm tạo áp lực lên phần còn lại của cơ thể. Theo thời gian, một số người thấy đau đầu, đau nhức toàn thân hoặc đơn giản là cảm giác dai dẳng rằng mình không được khỏe, ngay cả khi không có triệu chứng riêng lẻ nào trông có vẻ nghiêm trọng.",
            ko: "소화관의 지속적인 자극은 몸의 나머지 부분에도 조용히 부담을 줍니다. 시간이 지나면서 두통이나 전신의 통증을 느끼는 분들도 있고, 어느 한 증상도 심각해 보이지 않는데 어딘가 계속 개운치 않다고 느끼는 분들도 있습니다.",
            ar: "كما أن التهيج المستمر في الجهاز الهضمي يضع ضغطًا صامتًا على بقية الجسم. ومع مرور الوقت، يلاحظ بعض الناس صداعًا أو أوجاعًا عامة أو مجرد شعور دائم بأنهم ليسوا على ما يرام، حتى عندما لا يبدو أي عرض بمفرده خطيرًا.",
          },
        ],
      },
      {
        heading: {
          en: "Care and Lifestyle Work Together",
          es: "La atención médica y el estilo de vida van de la mano",
          vi: "Chăm sóc y tế và lối sống song hành cùng nhau",
          ko: "치료와 생활 습관은 함께 갑니다",
          ar: "الرعاية الطبية ونمط الحياة يعملان معًا",
        },
        paragraphs: [
          {
            en: "Feeling well again usually involves two tracks at once. Medical evaluation looks for root causes — inflammation, food sensitivities, infection, or problems with how the gut moves — so treatment can address the actual problem instead of masking it.",
            es: "Volver a sentirse bien suele requerir dos caminos a la vez. La evaluación médica busca las causas de fondo —inflamación, sensibilidades alimentarias, infecciones o problemas de movimiento del intestino— para que el tratamiento atienda el problema real en lugar de solo ocultarlo.",
            vi: "Để khỏe lại, thường cần đi trên hai con đường cùng lúc. Việc thăm khám y tế tìm các nguyên nhân gốc rễ — viêm, nhạy cảm với thức ăn, nhiễm trùng hoặc trục trặc trong nhu động ruột — để việc điều trị giải quyết đúng vấn đề thật sự thay vì chỉ che lấp nó.",
            ko: "다시 건강해지려면 대개 두 갈래 길을 함께 가야 합니다. 의학적 평가는 염증, 음식 민감성, 감염, 장운동 이상 같은 근본 원인을 찾아내어, 치료가 문제를 가리는 대신 실제 문제를 해결하도록 해 줍니다.",
            ar: "استعادة الشعور بالعافية تسير عادةً في مسارين معًا. فالتقييم الطبي يبحث عن الأسباب الجذرية — التهاب، أو حساسية تجاه أطعمة، أو عدوى، أو مشكلات في حركة الأمعاء — حتى يتصدى العلاج للمشكلة الحقيقية بدلًا من إخفائها.",
          },
          {
            en: "Daily habits carry real weight too. A balanced diet, steady hydration, regular movement, and consistent sleep give the digestive system better conditions for doing its work.",
            es: "Los hábitos diarios también tienen un peso real. Una dieta balanceada, una buena hidratación, el movimiento regular y un sueño constante le dan al sistema digestivo mejores condiciones para hacer su trabajo.",
            vi: "Các thói quen hằng ngày cũng có sức nặng thật sự. Một chế độ ăn cân đối, uống đủ nước đều đặn, vận động thường xuyên và giấc ngủ điều độ tạo cho hệ tiêu hóa những điều kiện tốt hơn để làm việc của mình.",
            ko: "일상의 습관도 실제로 큰 몫을 합니다. 균형 잡힌 식사, 꾸준한 수분 섭취, 규칙적인 움직임, 일정한 수면은 소화기계가 제 일을 하기에 더 좋은 조건을 만들어 줍니다.",
            ar: "للعادات اليومية وزنها الحقيقي أيضًا. فالنظام الغذائي المتوازن، وشرب الماء بانتظام، والحركة المنتظمة، والنوم الثابت، كلها تهيئ للجهاز الهضمي ظروفًا أفضل لأداء عمله.",
          },
        ],
      },
      {
        heading: {
          en: "When to Seek an Evaluation",
          es: "Cuándo buscar una evaluación",
          vi: "Khi nào nên đi khám để được đánh giá",
          ko: "진료 평가를 받아야 할 때",
          ar: "متى ينبغي طلب التقييم",
        },
        paragraphs: [
          {
            en: "Digestive symptoms that persist, fatigue you can't explain, changing bowel habits, or discomfort that interferes with daily life are all good reasons to see a gastroenterologist. The earlier the evaluation, the easier answers tend to be.",
            es: "Los síntomas digestivos persistentes, la fatiga que no puede explicar, los cambios en los hábitos intestinales o las molestias que interfieren con la vida diaria son buenas razones para consultar a un gastroenterólogo. Cuanto antes se haga la evaluación, más fáciles suelen ser las respuestas.",
            vi: "Các triệu chứng tiêu hóa dai dẳng, mệt mỏi không giải thích được, thay đổi thói quen đại tiện hoặc cảm giác khó chịu cản trở cuộc sống hằng ngày đều là những lý do chính đáng để đi khám bác sĩ chuyên khoa tiêu hóa. Đánh giá càng sớm, câu trả lời thường càng dễ tìm.",
            ko: "가라앉지 않는 소화기 증상, 이유를 알 수 없는 피로, 배변 습관의 변화, 일상생활에 지장을 주는 불편함은 모두 소화기내과 전문의를 찾을 충분한 이유가 됩니다. 평가가 빠를수록 답을 찾기도 대체로 더 쉽습니다.",
            ar: "الأعراض الهضمية المستمرة، أو التعب الذي لا تجد له تفسيرًا، أو تغير عادات التبرز، أو الانزعاج الذي يعطّل الحياة اليومية، كلها أسباب وجيهة لمراجعة طبيب الجهاز الهضمي. وكلما كان التقييم أبكر، كانت الإجابات أيسر في العادة.",
          },
          {
            en: "Digestion touches energy, focus, mood, and quality of life. Taking digestive symptoms seriously is not an overreaction — it is often the first step toward feeling like yourself again.",
            es: "La digestión influye en la energía, la concentración, el estado de ánimo y la calidad de vida. Tomar en serio los síntomas digestivos no es una exageración: muchas veces es el primer paso para volver a sentirse como usted mismo.",
            vi: "Tiêu hóa liên quan đến năng lượng, khả năng tập trung, tâm trạng và chất lượng cuộc sống. Xem trọng các triệu chứng tiêu hóa không phải là phản ứng thái quá — mà thường là bước đầu tiên để quý vị trở lại là chính mình.",
            ko: "소화는 에너지, 집중력, 기분, 삶의 질과 맞닿아 있습니다. 소화기 증상을 진지하게 받아들이는 것은 지나친 걱정이 아니라, 다시 예전의 나로 돌아가기 위한 첫걸음인 경우가 많습니다.",
            ar: "يمسّ الهضم الطاقة والتركيز والمزاج ونوعية الحياة. وأخذ الأعراض الهضمية على محمل الجد ليس مبالغة — بل كثيرًا ما يكون الخطوة الأولى نحو أن تعود إلى طبيعتك من جديد.",
          },
        ],
      },
    ],
  },
];
