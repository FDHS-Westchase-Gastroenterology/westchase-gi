// Patient-education topics: conditions, part A (8 of the old library's 17
// topics). Slugs, titles, and legacy ids mirror the old ASGE-licensed library
// 1:1; the bodies use original plain-language EN/ES writing, with VI/KO/AR
// machine translations still awaiting native-speaker review.

import type { EducationTopic } from "../types";

export const conditionsA: EducationTopic[] = [
  {
    slug: "diet-and-colon-health",
    legacyId: "48158",
    group: "conditions",
    title: {
      en: "Diet and Colon Health",
      es: "La dieta y la salud del colon",
      vi: "Chế độ ăn và sức khỏe đại tràng",
      ko: "식단과 대장 건강",
      ar: "النظام الغذائي وصحة القولون",
    },
    summary: {
      en: "What you eat has a direct effect on how your colon works. Learn how fiber, fluids, and everyday habits support digestive health and help prevent common colon problems.",
      es: "Lo que usted come influye directamente en el funcionamiento de su colon. Conozca cómo la fibra, los líquidos y los hábitos diarios apoyan la salud digestiva y ayudan a prevenir problemas comunes del colon.",
      vi: "Những gì quý vị ăn có ảnh hưởng trực tiếp đến hoạt động của đại tràng. Tìm hiểu cách chất xơ, nước uống và các thói quen hằng ngày hỗ trợ sức khỏe tiêu hóa và giúp phòng ngừa các vấn đề thường gặp ở đại tràng.",
      ko: "먹는 음식은 대장이 일하는 방식에 직접적인 영향을 미칩니다. 식이섬유, 수분, 일상 습관이 어떻게 소화기 건강을 돕고 흔한 대장 질환을 예방하는 데 도움이 되는지 알아보십시오.",
      ar: "لما تأكله تأثير مباشر في طريقة عمل القولون لديك. تعرَّف على الدور الذي تؤديه الألياف والسوائل والعادات اليومية في دعم صحة الجهاز الهضمي والوقاية من مشكلات القولون الشائعة.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "The food you eat does more than provide energy. As meals move through the digestive system, they shape how well the colon — the large intestine — absorbs water and carries waste out of the body. Daily choices about food, fluids, and activity have a real influence on how comfortably and regularly your bowels work.",
            es: "Los alimentos que usted come hacen más que aportar energía. A medida que las comidas avanzan por el aparato digestivo, influyen en la forma en que el colon — el intestino grueso — absorbe agua y elimina los desechos del cuerpo. Las decisiones diarias sobre la comida, los líquidos y la actividad física tienen un efecto real en la comodidad y regularidad de su intestino.",
            vi: "Thức ăn quý vị ăn vào không chỉ cung cấp năng lượng. Khi thức ăn di chuyển qua hệ tiêu hóa, nó ảnh hưởng đến khả năng của đại tràng — tức ruột già — trong việc hấp thụ nước và đưa chất thải ra khỏi cơ thể. Những lựa chọn hằng ngày về ăn uống, nước và vận động có ảnh hưởng thật sự đến việc ruột của quý vị hoạt động thoải mái và đều đặn đến mức nào.",
            ko: "우리가 먹는 음식은 에너지를 공급하는 것 이상의 역할을 합니다. 음식물이 소화기관을 지나는 동안 대장, 즉 큰창자가 수분을 흡수하고 노폐물을 몸 밖으로 내보내는 기능에 영향을 줍니다. 음식, 수분, 활동에 대한 일상의 선택은 배변이 얼마나 편안하고 규칙적으로 이루어지는지에 실제로 영향을 미칩니다.",
            ar: "الطعام الذي تتناوله يفعل أكثر من مجرد إمداد الجسم بالطاقة. فمع مرور الوجبات عبر الجهاز الهضمي، فإنها تؤثر في مدى قدرة القولون — أي الأمعاء الغليظة — على امتصاص الماء وإخراج الفضلات من الجسم. وللخيارات اليومية بشأن الطعام والسوائل والنشاط البدني تأثير حقيقي في مدى راحة الأمعاء وانتظام عملها.",
          },
          {
            en: "Diet is closely connected to several common colon conditions, including constipation, hemorrhoids, and diverticular disease. Food alone does not cause or cure these problems, but the right eating pattern can ease symptoms and lower the chance of complications.",
            es: "La dieta está estrechamente relacionada con varias condiciones comunes del colon, como el estreñimiento, las hemorroides y la enfermedad diverticular. La alimentación por sí sola no causa ni cura estos problemas, pero un buen patrón de alimentación puede aliviar los síntomas y reducir la probabilidad de complicaciones.",
            vi: "Chế độ ăn có liên quan chặt chẽ đến một số bệnh lý thường gặp ở đại tràng, bao gồm táo bón, trĩ và bệnh túi thừa. Thức ăn đơn thuần không gây ra cũng không chữa khỏi những vấn đề này, nhưng một chế độ ăn hợp lý có thể làm dịu triệu chứng và giảm nguy cơ biến chứng.",
            ko: "식단은 변비, 치핵, 게실 질환 등 여러 흔한 대장 질환과 밀접하게 연관되어 있습니다. 음식만으로 이러한 문제가 생기거나 낫는 것은 아니지만, 올바른 식사 습관은 증상을 완화하고 합병증이 생길 가능성을 낮출 수 있습니다.",
            ar: "يرتبط النظام الغذائي ارتباطًا وثيقًا بعدد من حالات القولون الشائعة، ومنها الإمساك والبواسير وداء الرتوج. والطعام وحده لا يسبب هذه المشكلات ولا يشفيها، لكن نمط الأكل الصحيح يمكن أن يخفف الأعراض ويقلل احتمال حدوث المضاعفات.",
          },
        ],
      },
      {
        heading: {
          en: "Why fiber matters",
          es: "Por qué es importante la fibra",
          vi: "Vì sao chất xơ quan trọng",
          ko: "식이섬유가 중요한 이유",
          ar: "لماذا تُعد الألياف مهمة",
        },
        paragraphs: [
          {
            en: "Fiber is the part of plant foods that the body cannot completely digest. It adds bulk to the stool and holds water, which keeps bowel movements softer and easier to pass. Vegetables, fruits, beans, lentils, and whole grains are dependable sources.",
            es: "La fibra es la parte de los alimentos vegetales que el cuerpo no puede digerir por completo. Da volumen a las heces y retiene agua, lo que mantiene las evacuaciones más blandas y fáciles de pasar. Las verduras, las frutas, los frijoles, las lentejas y los granos integrales son fuentes confiables.",
            vi: "Chất xơ là phần trong thực phẩm có nguồn gốc thực vật mà cơ thể không thể tiêu hóa hoàn toàn. Chất xơ làm tăng khối lượng phân và giữ nước, giúp phân mềm hơn và dễ đi ngoài hơn. Rau, trái cây, các loại đậu, đậu lăng và ngũ cốc nguyên hạt là những nguồn chất xơ đáng tin cậy.",
            ko: "식이섬유는 식물성 식품 중에서 몸이 완전히 소화하지 못하는 부분입니다. 대변의 부피를 늘리고 수분을 머금어 변을 더 부드럽고 보기 쉽게 만들어 줍니다. 채소, 과일, 콩류, 렌틸콩, 통곡물이 믿을 만한 공급원입니다.",
            ar: "الألياف هي الجزء من الأطعمة النباتية الذي لا يستطيع الجسم هضمه بالكامل. وهي تزيد حجم البراز وتحتفظ بالماء، مما يجعل التبرز أكثر ليونة وأسهل خروجًا. وتُعد الخضروات والفواكه والفاصوليا والعدس والحبوب الكاملة مصادر موثوقة للألياف.",
          },
          {
            en: "Eating enough fiber supports regular bowel habits and reduces straining. Less straining means less pressure on the veins of the rectum, which helps prevent hemorrhoid flare-ups, and a fiber-rich pattern appears to benefit people with diverticulosis as well. Increase fiber gradually and drink plenty of water, because a sudden jump can cause temporary gas and bloating.",
            es: "Consumir suficiente fibra favorece un hábito intestinal regular y reduce el esfuerzo al evacuar. Menos esfuerzo significa menos presión sobre las venas del recto, lo que ayuda a prevenir las crisis de hemorroides, y un patrón rico en fibra también parece beneficiar a las personas con diverticulosis. Aumente la fibra poco a poco y beba abundante agua, porque un cambio brusco puede causar gases e hinchazón temporales.",
            vi: "Ăn đủ chất xơ giúp duy trì thói quen đi ngoài đều đặn và giảm rặn. Ít rặn hơn nghĩa là ít áp lực hơn lên các tĩnh mạch ở trực tràng, giúp phòng ngừa các đợt bùng phát trĩ, và chế độ ăn giàu chất xơ dường như cũng có lợi cho người bị bệnh túi thừa đại tràng. Hãy tăng chất xơ từ từ và uống nhiều nước, vì tăng đột ngột có thể gây đầy hơi và chướng bụng tạm thời.",
            ko: "식이섬유를 충분히 섭취하면 규칙적인 배변 습관에 도움이 되고 배변 시 힘주기가 줄어듭니다. 힘을 덜 주면 직장 정맥에 가해지는 압력이 줄어 치핵이 악화되는 것을 예방하는 데 도움이 되며, 섬유질이 풍부한 식사는 게실증이 있는 분들에게도 도움이 되는 것으로 보입니다. 갑자기 늘리면 일시적인 가스와 복부 팽만이 생길 수 있으므로 식이섬유는 서서히 늘리고 물을 충분히 마시십시오.",
            ar: "تناول كمية كافية من الألياف يدعم انتظام عادات الأمعاء ويقلل الشد أثناء التبرز. وقلة الشد تعني ضغطًا أقل على أوردة المستقيم، مما يساعد على الوقاية من نوبات البواسير، كما يبدو أن النمط الغذائي الغني بالألياف يفيد المصابين بداء الرتوج أيضًا. زد الألياف تدريجيًا واشرب كمية وافرة من الماء، لأن الزيادة المفاجئة قد تسبب غازات وانتفاخًا مؤقتين.",
          },
        ],
      },
      {
        heading: {
          en: "Habits that support a healthy colon",
          es: "Hábitos que apoyan un colon sano",
          vi: "Những thói quen giúp đại tràng khỏe mạnh",
          ko: "건강한 대장을 지키는 습관",
          ar: "عادات تدعم صحة القولون",
        },
        paragraphs: [
          {
            en: "Beyond fiber, a few routines protect the colon. Drinking fluids throughout the day keeps stool soft. Regular physical activity, even a daily walk, encourages the bowel to stay on schedule. Keeping a healthy weight, limiting red and processed meats, and not smoking also reduce strain on the digestive system.",
            es: "Además de la fibra, algunas rutinas protegen el colon. Beber líquidos a lo largo del día mantiene las heces blandas. La actividad física regular, aunque sea una caminata diaria, ayuda a que el intestino mantenga su ritmo. Mantener un peso saludable, limitar las carnes rojas y procesadas y no fumar también reducen la carga sobre el aparato digestivo.",
            vi: "Ngoài chất xơ, một số thói quen hằng ngày cũng bảo vệ đại tràng. Uống nước đều đặn trong ngày giúp phân mềm. Vận động thể chất thường xuyên, dù chỉ là đi bộ mỗi ngày, giúp ruột hoạt động đúng nhịp. Giữ cân nặng hợp lý, hạn chế thịt đỏ và thịt chế biến sẵn, và không hút thuốc cũng giúp giảm gánh nặng cho hệ tiêu hóa.",
            ko: "식이섬유 외에도 몇 가지 생활 습관이 대장을 보호합니다. 하루 동안 수분을 꾸준히 마시면 변이 부드럽게 유지됩니다. 매일 걷기라도 규칙적으로 몸을 움직이면 장이 제 리듬을 지키는 데 도움이 됩니다. 건강한 체중을 유지하고, 붉은 고기와 가공육을 줄이고, 담배를 피우지 않는 것도 소화기관의 부담을 덜어 줍니다.",
            ar: "إلى جانب الألياف، هناك عادات قليلة تحمي القولون. فشرب السوائل على مدار اليوم يحافظ على ليونة البراز. والنشاط البدني المنتظم، ولو كان مشيًا يوميًا، يشجع الأمعاء على الحفاظ على انتظامها. كما أن الحفاظ على وزن صحي، والإقلال من اللحوم الحمراء والمصنّعة، والامتناع عن التدخين تخفف جميعها العبء عن الجهاز الهضمي.",
          },
          {
            en: "Some old food rules have not held up. People with diverticulosis were once told to avoid nuts, corn, and seeds, but that restriction is no longer considered necessary for most. Your care team can help you decide what applies to your situation.",
            es: "Algunas reglas antiguas sobre la comida no han resistido el paso del tiempo. Antes se les decía a las personas con diverticulosis que evitaran las nueces, el maíz y las semillas, pero esa restricción ya no se considera necesaria para la mayoría. Su equipo médico puede ayudarle a decidir qué aplica a su situación.",
            vi: "Một số quy tắc ăn uống cũ đã không còn đứng vững. Trước đây, người bị bệnh túi thừa đại tràng được khuyên tránh quả hạch, bắp và các loại hạt, nhưng với hầu hết mọi người, hạn chế đó nay không còn được xem là cần thiết. Đội ngũ chăm sóc của quý vị có thể giúp quý vị xác định điều gì áp dụng cho trường hợp của mình.",
            ko: "오래된 음식 규칙 중에는 더 이상 맞지 않는 것도 있습니다. 예전에는 게실증이 있는 사람에게 견과류, 옥수수, 씨앗류를 피하라고 했지만, 이제는 대부분의 경우 그런 제한이 필요하지 않은 것으로 봅니다. 자신의 상황에 무엇이 해당되는지는 의료진과 상의하여 정할 수 있습니다.",
            ar: "بعض القواعد الغذائية القديمة لم تعد صحيحة. فقد كان يُطلب سابقًا من المصابين بداء الرتوج تجنب المكسرات والذرة والبذور، لكن هذا التقييد لم يعد يُعتبر ضروريًا لمعظم الناس. ويمكن لفريق الرعاية الخاص بك مساعدتك في تحديد ما ينطبق على حالتك.",
          },
        ],
      },
      {
        heading: {
          en: "When diet alone is not enough",
          es: "Cuando la dieta no es suficiente",
          vi: "Khi chế độ ăn đơn thuần là chưa đủ",
          ko: "식단만으로 충분하지 않을 때",
          ar: "عندما لا يكفي النظام الغذائي وحده",
        },
        paragraphs: [
          {
            en: "Dietary changes take a few weeks to show their effect, and they cannot fix every problem. If constipation, diarrhea, bloating, or abdominal discomfort continues despite better habits, an evaluation can look for an underlying cause. Depending on your symptoms, your gastroenterologist may suggest blood or stool tests, or a direct look at the colon with a colonoscopy.",
            es: "Los cambios en la dieta tardan algunas semanas en mostrar su efecto y no pueden resolver todos los problemas. Si el estreñimiento, la diarrea, la hinchazón o las molestias abdominales continúan a pesar de mejores hábitos, una evaluación puede buscar la causa de fondo. Según sus síntomas, su gastroenterólogo puede sugerir análisis de sangre o de heces, o una revisión directa del colon mediante una colonoscopia.",
            vi: "Những thay đổi trong chế độ ăn cần vài tuần mới thấy rõ tác dụng, và không thể giải quyết mọi vấn đề. Nếu táo bón, tiêu chảy, chướng bụng hoặc khó chịu ở bụng vẫn tiếp diễn dù đã có thói quen tốt hơn, việc thăm khám có thể giúp tìm nguyên nhân gốc rễ. Tùy theo triệu chứng của quý vị, bác sĩ chuyên khoa tiêu hóa có thể đề nghị xét nghiệm máu hoặc phân, hoặc quan sát trực tiếp đại tràng bằng nội soi đại tràng.",
            ko: "식단 변화는 효과가 나타나기까지 몇 주가 걸리며, 모든 문제를 해결하지는 못합니다. 습관을 개선했는데도 변비, 설사, 복부 팽만, 복부 불편감이 계속된다면 진료를 통해 근본 원인을 찾아볼 수 있습니다. 증상에 따라 소화기내과 전문의가 혈액검사나 대변검사, 또는 대장내시경으로 대장을 직접 살펴보는 검사를 권할 수 있습니다.",
            ar: "تحتاج التغييرات الغذائية إلى بضعة أسابيع حتى يظهر أثرها، وهي لا تستطيع حل كل مشكلة. فإذا استمر الإمساك أو الإسهال أو الانتفاخ أو انزعاج البطن رغم تحسين العادات، يمكن للتقييم الطبي البحث عن سبب كامن. وبحسب الأعراض، قد يقترح طبيب الجهاز الهضمي تحاليل للدم أو البراز، أو فحص القولون مباشرة بتنظير القولون.",
          },
        ],
      },
      {
        heading: {
          en: "When to talk to a gastroenterologist",
          es: "Cuándo hablar con un gastroenterólogo",
          vi: "Khi nào nên trao đổi với bác sĩ chuyên khoa tiêu hóa",
          ko: "소화기내과 전문의와 상담해야 할 때",
          ar: "متى ينبغي التحدث مع طبيب الجهاز الهضمي",
        },
        paragraphs: [
          {
            en: "Make an appointment if you notice blood in the stool, black or tarry stools, unintended weight loss, persistent pain, or a lasting change in your bowel habits. Those symptoms call for an evaluation rather than dietary trial and error. It is also worth reviewing your colon cancer screening plan with your care team, because screening can find problems long before symptoms appear.",
            es: "Haga una cita si nota sangre en las heces, heces negras o alquitranadas, pérdida de peso involuntaria, dolor persistente o un cambio duradero en su hábito intestinal. Esos síntomas requieren una evaluación, no pruebas de ensayo y error con la dieta. También vale la pena revisar con su equipo médico su plan de detección del cáncer de colon, porque las pruebas de detección pueden encontrar problemas mucho antes de que aparezcan los síntomas.",
            vi: "Hãy đặt hẹn khám nếu quý vị thấy máu trong phân, phân đen hoặc như hắc ín, sụt cân không chủ ý, đau kéo dài, hoặc thay đổi kéo dài trong thói quen đi ngoài. Những triệu chứng đó cần được thăm khám thay vì tự thử điều chỉnh chế độ ăn. Quý vị cũng nên trao đổi với đội ngũ chăm sóc về kế hoạch tầm soát ung thư đại tràng, vì tầm soát có thể phát hiện vấn đề từ rất lâu trước khi triệu chứng xuất hiện.",
            ko: "대변에 피가 보이거나, 검거나 타르 같은 변, 의도하지 않은 체중 감소, 지속되는 통증, 오래 지속되는 배변 습관의 변화가 있으면 진료 예약을 하십시오. 이러한 증상은 식단을 이리저리 바꿔 보는 것이 아니라 진료가 필요한 증상입니다. 또한 선별검사는 증상이 나타나기 훨씬 전에 문제를 찾아낼 수 있으므로, 대장암 선별검사 계획을 의료진과 함께 점검해 보는 것이 좋습니다.",
            ar: "احجز موعدًا إذا لاحظت دمًا في البراز، أو برازًا أسود أو قطرانيًا، أو فقدان وزن غير مقصود، أو ألمًا مستمرًا، أو تغيرًا دائمًا في عادات الأمعاء. فهذه الأعراض تستدعي تقييمًا طبيًا لا تجربة الحلول الغذائية واحدًا بعد آخر. ومن المفيد أيضًا مراجعة خطة فحص الكشف عن سرطان القولون مع فريق الرعاية الخاص بك، لأن فحوصات الكشف يمكن أن تجد المشكلات قبل ظهور الأعراض بوقت طويل.",
          },
        ],
      },
    ],
  },
  {
    slug: "ibs-with-diarrhea",
    legacyId: "48149",
    group: "conditions",
    title: {
      en: "Understanding Irritable Bowel Syndrome with Diarrhea (IBS-D)",
      es: "Entienda el síndrome del intestino irritable con diarrea (SII-D)",
      vi: "Tìm hiểu hội chứng ruột kích thích thể tiêu chảy (IBS-D)",
      ko: "설사형 과민대장증후군(IBS-D) 이해하기",
      ar: "فهم متلازمة القولون المتهيج المصحوبة بالإسهال (IBS-D)",
    },
    summary: {
      en: "IBS with diarrhea is a common, manageable disorder that causes abdominal pain along with frequent loose stools. Learn how it is diagnosed and the many ways symptoms can be brought under control.",
      es: "El síndrome del intestino irritable con diarrea es un trastorno común y manejable que causa dolor abdominal junto con evacuaciones sueltas frecuentes. Conozca cómo se diagnostica y las muchas maneras de controlar los síntomas.",
      vi: "Hội chứng ruột kích thích thể tiêu chảy là một rối loạn thường gặp và có thể kiểm soát được, gây đau bụng kèm theo đi ngoài phân lỏng thường xuyên. Tìm hiểu cách chẩn đoán và nhiều cách để kiểm soát triệu chứng.",
      ko: "설사형 과민대장증후군은 복통과 함께 잦은 묽은 변을 일으키는 흔하고 관리 가능한 질환입니다. 어떻게 진단하는지, 그리고 증상을 조절하는 여러 방법을 알아보십시오.",
      ar: "متلازمة القولون المتهيج المصحوبة بالإسهال اضطراب شائع يمكن السيطرة عليه، يسبب ألمًا في البطن مع براز رخو متكرر. تعرَّف على كيفية تشخيصه والطرق العديدة للسيطرة على أعراضه.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Irritable bowel syndrome, often shortened to IBS, is a long-term disorder of how the bowel works rather than a disease that damages it. In IBS, the intestine is unusually sensitive, and the muscle contractions that move its contents along can fall out of rhythm. When the main result is frequent loose or watery stools, the condition is called IBS with diarrhea, or IBS-D.",
            es: "El síndrome del intestino irritable, conocido como SII, es un trastorno crónico del funcionamiento del intestino, no una enfermedad que lo dañe. En el SII, el intestino es especialmente sensible y las contracciones musculares que mueven su contenido pueden perder el ritmo. Cuando el resultado principal son evacuaciones sueltas o líquidas frecuentes, la condición se llama SII con diarrea, o SII-D.",
            vi: "Hội chứng ruột kích thích, thường viết tắt là IBS, là một rối loạn lâu dài về cách hoạt động của ruột chứ không phải một bệnh gây tổn thương ruột. Trong IBS, ruột nhạy cảm một cách bất thường, và các cơn co thắt cơ đẩy chất chứa trong ruột đi tới có thể mất nhịp. Khi hậu quả chính là đi ngoài phân lỏng hoặc phân nước thường xuyên, tình trạng này được gọi là hội chứng ruột kích thích thể tiêu chảy, hay IBS-D.",
            ko: "과민대장증후군(흔히 IBS라고 줄여 부릅니다)은 장을 손상시키는 병이 아니라 장이 일하는 방식에 생긴 장기적인 기능 이상입니다. IBS에서는 장이 유난히 예민해지고, 장 내용물을 밀어 보내는 근육 수축의 리듬이 흐트러질 수 있습니다. 그 주된 결과가 잦은 묽은 변이나 물설사라면 이를 설사형 과민대장증후군, 즉 IBS-D라고 부릅니다.",
            ar: "متلازمة القولون المتهيج، التي يُشار إليها اختصارًا بـ IBS، اضطراب طويل الأمد في طريقة عمل الأمعاء وليست مرضًا يتلفها. ففي هذه المتلازمة تكون الأمعاء حساسة على نحو غير معتاد، وقد تفقد الانقباضات العضلية التي تدفع محتوياتها إيقاعها المنتظم. وعندما تكون النتيجة الرئيسية برازًا رخوًا أو مائيًا متكررًا، تُسمى الحالة متلازمة القولون المتهيج المصحوبة بالإسهال، أو IBS-D.",
          },
          {
            en: "IBS-D can be disruptive and, at times, embarrassing. It does not injure the intestine, however, and it does not lead to cancer. With an accurate diagnosis and a personal plan, most people gain far better control of their symptoms.",
            es: "El SII-D puede ser muy molesto y, a veces, incómodo en la vida diaria. Sin embargo, no lesiona el intestino ni conduce al cáncer. Con un diagnóstico preciso y un plan personalizado, la mayoría de las personas logra controlar mucho mejor sus síntomas.",
            vi: "IBS-D có thể gây xáo trộn cuộc sống và đôi khi khiến quý vị ngại ngùng. Tuy nhiên, nó không làm tổn thương ruột và không dẫn đến ung thư. Với chẩn đoán chính xác và một kế hoạch riêng cho từng người, hầu hết mọi người kiểm soát triệu chứng tốt hơn hẳn.",
            ko: "IBS-D는 생활에 지장을 주고 때로는 난처하게 만들 수 있습니다. 그러나 장을 손상시키지 않으며 암으로 이어지지도 않습니다. 정확한 진단과 개인에게 맞춘 계획이 있으면 대부분 증상을 훨씬 잘 조절하게 됩니다.",
            ar: "قد تكون متلازمة IBS-D مزعجة ومحرجة أحيانًا. لكنها لا تؤذي الأمعاء ولا تؤدي إلى السرطان. ومع تشخيص دقيق وخطة شخصية، يتمكن معظم المصابين من السيطرة على أعراضهم على نحو أفضل بكثير.",
          },
        ],
      },
      {
        heading: {
          en: "Common symptoms",
          es: "Síntomas comunes",
          vi: "Các triệu chứng thường gặp",
          ko: "흔한 증상",
          ar: "الأعراض الشائعة",
        },
        paragraphs: [
          {
            en: "The core symptoms are abdominal pain or cramping connected to bowel movements, together with loose stools that occur more often than normal. Many people also notice bloating, gas, mucus in the stool, or sudden urges that make it hard to delay a trip to the bathroom.",
            es: "Los síntomas centrales son dolor o cólicos abdominales relacionados con las evacuaciones, junto con heces sueltas más frecuentes de lo normal. Muchas personas también notan hinchazón, gases, moco en las heces o urgencias repentinas que hacen difícil posponer una visita al baño.",
            vi: "Các triệu chứng cốt lõi là đau bụng hoặc đau quặn bụng liên quan đến việc đi ngoài, kèm theo phân lỏng xảy ra thường xuyên hơn bình thường. Nhiều người cũng thấy chướng bụng, đầy hơi, có chất nhầy trong phân, hoặc những cơn mót đi ngoài đột ngột khiến khó trì hoãn việc vào nhà vệ sinh.",
            ko: "핵심 증상은 배변과 관련된 복통이나 복부 경련, 그리고 평소보다 잦은 묽은 변입니다. 많은 분들이 복부 팽만감, 가스, 대변의 점액, 또는 화장실 가는 것을 미루기 어려울 만큼 갑작스러운 변의도 함께 느낍니다.",
            ar: "الأعراض الأساسية هي ألم أو تقلصات في البطن مرتبطة بالتبرز، مع براز رخو يحدث أكثر من المعتاد. ويلاحظ كثيرون أيضًا انتفاخًا أو غازات أو مخاطًا في البراز، أو رغبة مفاجئة وملحّة تجعل تأجيل الذهاب إلى الحمام صعبًا.",
          },
          {
            en: "Symptoms tend to come and go, and stress, certain foods, or poor sleep can stir them up. Bleeding, fever, weight loss, or symptoms that wake you at night are not typical of IBS and should always be reported to your care team.",
            es: "Los síntomas suelen ir y venir, y el estrés, ciertos alimentos o el mal sueño pueden activarlos. El sangrado, la fiebre, la pérdida de peso o los síntomas que lo despiertan por la noche no son típicos del SII y siempre deben informarse a su equipo médico.",
            vi: "Triệu chứng thường lúc có lúc không, và căng thẳng, một số loại thức ăn hoặc ngủ kém có thể làm chúng bùng lên. Chảy máu, sốt, sụt cân, hoặc triệu chứng làm quý vị thức giấc ban đêm không phải là biểu hiện điển hình của IBS và luôn cần được báo cho đội ngũ chăm sóc của quý vị.",
            ko: "증상은 나타났다 사라지기를 반복하는 경향이 있으며, 스트레스, 특정 음식, 수면 부족이 증상을 자극할 수 있습니다. 출혈, 발열, 체중 감소, 또는 밤에 잠을 깨우는 증상은 IBS의 전형적인 증상이 아니므로 반드시 의료진에게 알려야 합니다.",
            ar: "تميل الأعراض إلى الظهور والاختفاء، وقد يثيرها التوتر أو أطعمة معينة أو قلة النوم. أما النزيف أو الحمى أو فقدان الوزن أو الأعراض التي توقظك ليلًا فليست معتادة في متلازمة القولون المتهيج، ويجب دائمًا إبلاغ فريق الرعاية بها.",
          },
        ],
      },
      {
        heading: {
          en: "How IBS-D is diagnosed",
          es: "Cómo se diagnostica el SII-D",
          vi: "Cách chẩn đoán IBS-D",
          ko: "IBS-D의 진단 방법",
          ar: "كيف تُشخَّص متلازمة IBS-D",
        },
        paragraphs: [
          {
            en: "No single test proves IBS. Your gastroenterologist begins with a careful review of your symptoms and history, followed by a physical exam. Blood and stool tests are often ordered to rule out conditions that can look similar, such as celiac disease, infection, or inflammatory bowel disease. Depending on your age and risk factors, a colonoscopy may be recommended to be certain nothing else explains the pattern.",
            es: "Ninguna prueba por sí sola confirma el SII. Su gastroenterólogo comienza con una revisión cuidadosa de sus síntomas y su historia clínica, seguida de un examen físico. Con frecuencia se piden análisis de sangre y de heces para descartar condiciones parecidas, como la enfermedad celíaca, una infección o la enfermedad inflamatoria intestinal. Según su edad y sus factores de riesgo, puede recomendarse una colonoscopia para asegurarse de que nada más explique el cuadro.",
            vi: "Không có xét nghiệm đơn lẻ nào khẳng định được IBS. Bác sĩ chuyên khoa tiêu hóa của quý vị bắt đầu bằng việc xem xét kỹ triệu chứng và bệnh sử, sau đó khám thực thể. Xét nghiệm máu và phân thường được chỉ định để loại trừ những bệnh có biểu hiện tương tự, như bệnh celiac, nhiễm trùng hoặc bệnh viêm ruột. Tùy theo tuổi và các yếu tố nguy cơ của quý vị, có thể được khuyên nội soi đại tràng để chắc chắn không có nguyên nhân nào khác giải thích các triệu chứng.",
            ko: "단 하나의 검사로 IBS를 확진할 수는 없습니다. 소화기내과 전문의는 먼저 증상과 병력을 자세히 살펴본 뒤 신체 진찰을 합니다. 셀리악병, 감염, 염증성 장질환처럼 비슷해 보일 수 있는 질환을 배제하기 위해 혈액검사와 대변검사를 흔히 시행합니다. 나이와 위험 요인에 따라, 다른 원인이 없는지 확실히 하기 위해 대장내시경 검사를 권할 수도 있습니다.",
            ar: "لا يوجد فحص واحد يثبت الإصابة بمتلازمة القولون المتهيج. يبدأ طبيب الجهاز الهضمي بمراجعة دقيقة لأعراضك وتاريخك المرضي، يليها فحص سريري. وكثيرًا ما تُطلب تحاليل الدم والبراز لاستبعاد حالات قد تشبهها، مثل الداء البطني (السيلياك) أو العدوى أو داء الأمعاء الالتهابي. وبحسب عمرك وعوامل الخطورة لديك، قد يُوصى بتنظير القولون للتأكد من عدم وجود سبب آخر يفسر هذه الأعراض.",
          },
        ],
      },
      {
        heading: {
          en: "Treatment and management",
          es: "Tratamiento y manejo",
          vi: "Điều trị và kiểm soát",
          ko: "치료 및 관리",
          ar: "العلاج والتدبير",
        },
        paragraphs: [
          {
            en: "Care usually starts with everyday measures: identifying trigger foods, eating meals on a regular schedule, limiting caffeine and alcohol, and finding workable ways to manage stress. Some people improve with a structured eating plan, such as a diet low in certain fermentable carbohydrates, which is best followed with professional guidance.",
            es: "La atención suele comenzar con medidas cotidianas: identificar los alimentos que le provocan síntomas, comer en horarios regulares, limitar la cafeína y el alcohol, y encontrar maneras prácticas de manejar el estrés. Algunas personas mejoran con un plan de alimentación estructurado, como una dieta baja en ciertos carbohidratos fermentables, que conviene seguir con orientación profesional.",
            vi: "Việc chăm sóc thường bắt đầu bằng các biện pháp hằng ngày: nhận biết những thức ăn gây khởi phát triệu chứng, ăn đúng giờ, hạn chế caffeine và rượu bia, và tìm những cách khả thi để kiểm soát căng thẳng. Một số người cải thiện nhờ một kế hoạch ăn uống có cấu trúc, chẳng hạn chế độ ăn ít một số loại carbohydrate dễ lên men, tốt nhất nên thực hiện dưới sự hướng dẫn của chuyên gia.",
            ko: "치료는 대개 일상적인 조치에서 시작합니다. 증상을 유발하는 음식을 찾아내고, 규칙적인 시간에 식사하고, 카페인과 술을 줄이고, 실천 가능한 스트레스 관리 방법을 찾는 것입니다. 특정 발효성 탄수화물을 줄인 식단과 같은 체계적인 식사 계획으로 좋아지는 분들도 있는데, 이런 식단은 전문가의 지도를 받으며 따르는 것이 가장 좋습니다.",
            ar: "تبدأ الرعاية عادة بتدابير يومية: تحديد الأطعمة المحفزة للأعراض، وتناول الوجبات في مواعيد منتظمة، والإقلال من الكافيين والكحول، وإيجاد طرق عملية للتعامل مع التوتر. ويتحسن بعض الأشخاص باتباع خطة غذائية منظمة، مثل نظام غذائي قليل المحتوى من بعض الكربوهيدرات القابلة للتخمر، ويُفضَّل اتباعه بإشراف مختص.",
          },
          {
            en: "When lifestyle steps are not enough, medicines can ease cramping, slow diarrhea, or act on the communication between the gut and the brain. No single prescription fits everyone, so your gastroenterologist will match options to your symptom pattern and adjust them over time.",
            es: "Cuando los cambios de estilo de vida no bastan, los medicamentos pueden aliviar los cólicos, disminuir la diarrea o actuar sobre la comunicación entre el intestino y el cerebro. Ninguna receta única sirve para todos, así que su gastroenterólogo ajustará las opciones a su patrón de síntomas con el tiempo.",
            vi: "Khi các biện pháp về lối sống chưa đủ, thuốc có thể làm dịu cơn đau quặn, giảm tiêu chảy, hoặc tác động lên sự liên lạc giữa ruột và não. Không có một đơn thuốc chung cho tất cả mọi người, vì vậy bác sĩ chuyên khoa tiêu hóa sẽ chọn phương án phù hợp với kiểu triệu chứng của quý vị và điều chỉnh dần theo thời gian.",
            ko: "생활 습관 개선만으로 충분하지 않을 때는 약물이 경련을 완화하거나, 설사를 늦추거나, 장과 뇌 사이의 신호 전달에 작용할 수 있습니다. 모든 사람에게 맞는 단일 처방은 없으므로, 소화기내과 전문의가 증상 양상에 맞는 약을 선택하고 시간을 두고 조절해 나갑니다.",
            ar: "عندما لا تكفي خطوات نمط الحياة، يمكن للأدوية أن تخفف التقلصات أو تبطئ الإسهال أو تعمل على التواصل بين الأمعاء والدماغ. ولا توجد وصفة واحدة تناسب الجميع، لذلك سيوائم طبيب الجهاز الهضمي الخيارات مع نمط أعراضك ويعدّلها مع مرور الوقت.",
          },
        ],
      },
      {
        heading: {
          en: "When to talk to a gastroenterologist",
          es: "Cuándo hablar con un gastroenterólogo",
          vi: "Khi nào nên trao đổi với bác sĩ chuyên khoa tiêu hóa",
          ko: "소화기내과 전문의와 상담해야 할 때",
          ar: "متى ينبغي التحدث مع طبيب الجهاز الهضمي",
        },
        paragraphs: [
          {
            en: "See a gastroenterologist if diarrhea or abdominal pain keeps returning, limits your work or travel, or simply worries you. Seek care promptly if you notice blood in the stool, unexplained weight loss, or fever, or if colon cancer, celiac disease, or inflammatory bowel disease runs in your family. A confident diagnosis is the first step toward relief.",
            es: "Consulte a un gastroenterólogo si la diarrea o el dolor abdominal regresan una y otra vez, limitan su trabajo o sus viajes, o simplemente le preocupan. Busque atención pronto si nota sangre en las heces, pérdida de peso sin explicación o fiebre, o si en su familia hay antecedentes de cáncer de colon, enfermedad celíaca o enfermedad inflamatoria intestinal. Un diagnóstico seguro es el primer paso hacia el alivio.",
            vi: "Hãy đi khám bác sĩ chuyên khoa tiêu hóa nếu tiêu chảy hoặc đau bụng cứ tái đi tái lại, cản trở công việc hay những chuyến đi của quý vị, hoặc đơn giản là khiến quý vị lo lắng. Hãy đi khám sớm nếu quý vị thấy máu trong phân, sụt cân không rõ nguyên nhân hoặc sốt, hoặc nếu gia đình quý vị có người bị ung thư đại tràng, bệnh celiac hoặc bệnh viêm ruột. Một chẩn đoán chắc chắn là bước đầu tiên hướng tới sự nhẹ nhõm.",
            ko: "설사나 복통이 자꾸 재발하거나, 일이나 여행에 지장을 주거나, 그저 걱정이 된다면 소화기내과 전문의의 진료를 받으십시오. 대변에 피가 보이거나, 원인 모를 체중 감소나 발열이 있거나, 가족 중에 대장암, 셀리악병, 염증성 장질환이 있는 경우에는 지체하지 말고 진료를 받으십시오. 확실한 진단이 증상 완화로 가는 첫걸음입니다.",
            ar: "راجع طبيب الجهاز الهضمي إذا كان الإسهال أو ألم البطن يعاود الظهور مرارًا، أو يحدّ من عملك أو سفرك، أو كان ببساطة يقلقك. واطلب الرعاية سريعًا إذا لاحظت دمًا في البراز أو فقدان وزن غير مبرر أو حمى، أو إذا كان سرطان القولون أو الداء البطني (السيلياك) أو داء الأمعاء الالتهابي منتشرًا في عائلتك. فالتشخيص الموثوق هو الخطوة الأولى نحو الراحة.",
          },
        ],
      },
    ],
  },
  {
    slug: "ulcerative-colitis",
    legacyId: "48153",
    group: "conditions",
    title: {
      en: "Understanding Ulcerative Colitis",
      es: "Entienda la colitis ulcerosa",
      vi: "Tìm hiểu viêm loét đại tràng",
      ko: "궤양성 대장염 이해하기",
      ar: "فهم التهاب القولون التقرحي",
    },
    summary: {
      en: "Ulcerative colitis is a chronic inflammatory disease of the colon and rectum that alternates between flares and quiet periods. Learn its symptoms, how it is diagnosed, and how treatment keeps it under control.",
      es: "La colitis ulcerosa es una enfermedad inflamatoria crónica del colon y el recto que alterna entre brotes y períodos de calma. Conozca sus síntomas, cómo se diagnostica y cómo el tratamiento la mantiene bajo control.",
      vi: "Viêm loét đại tràng là một bệnh viêm mạn tính của đại tràng và trực tràng, luân phiên giữa các đợt bùng phát và những giai đoạn yên ổn. Tìm hiểu triệu chứng, cách chẩn đoán và cách điều trị giúp kiểm soát bệnh.",
      ko: "궤양성 대장염은 증상이 심해지는 시기와 잠잠한 시기가 번갈아 나타나는 대장과 직장의 만성 염증성 질환입니다. 증상과 진단 방법, 그리고 치료로 어떻게 병을 조절하는지 알아보십시오.",
      ar: "التهاب القولون التقرحي مرض التهابي مزمن يصيب القولون والمستقيم، ويتناوب بين نوبات نشطة وفترات هادئة. تعرَّف على أعراضه وكيفية تشخيصه وكيف يُبقيه العلاج تحت السيطرة.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Ulcerative colitis is a chronic condition in which the immune system mistakenly attacks the lining of the large intestine, causing inflammation and small open sores. It belongs to a group of disorders known as inflammatory bowel disease, or IBD. Unlike Crohn's disease, which can involve any part of the digestive tract, ulcerative colitis is limited to the colon and rectum and affects the innermost lining.",
            es: "La colitis ulcerosa es una condición crónica en la que el sistema inmunitario ataca por error el revestimiento del intestino grueso, causando inflamación y pequeñas llagas abiertas. Pertenece a un grupo de trastornos conocido como enfermedad inflamatoria intestinal, o EII. A diferencia de la enfermedad de Crohn, que puede afectar cualquier parte del tubo digestivo, la colitis ulcerosa se limita al colon y al recto y afecta el revestimiento más interno.",
            vi: "Viêm loét đại tràng là một bệnh mạn tính trong đó hệ miễn dịch tấn công nhầm vào lớp niêm mạc của ruột già, gây viêm và những vết loét hở nhỏ. Bệnh thuộc nhóm rối loạn được gọi là bệnh viêm ruột, hay IBD. Khác với bệnh Crohn có thể ảnh hưởng đến bất kỳ phần nào của ống tiêu hóa, viêm loét đại tràng chỉ giới hạn ở đại tràng và trực tràng và ảnh hưởng đến lớp niêm mạc trong cùng.",
            ko: "궤양성 대장염은 면역계가 큰창자의 점막을 잘못 공격하여 염증과 작은 궤양을 일으키는 만성 질환입니다. 염증성 장질환(IBD)이라고 불리는 질환군에 속합니다. 소화관 어느 부위든 침범할 수 있는 크론병과 달리, 궤양성 대장염은 대장과 직장에 국한되며 가장 안쪽 점막층을 침범합니다.",
            ar: "التهاب القولون التقرحي حالة مزمنة يهاجم فيها الجهاز المناعي بطانة الأمعاء الغليظة عن طريق الخطأ، مسببًا التهابًا وقروحًا مفتوحة صغيرة. وينتمي إلى مجموعة اضطرابات تُعرف بداء الأمعاء الالتهابي، أو IBD. وبخلاف داء كرون الذي قد يصيب أي جزء من القناة الهضمية، يقتصر التهاب القولون التقرحي على القولون والمستقيم ويصيب الطبقة الداخلية من البطانة.",
          },
          {
            en: "The condition usually alternates between flares, when symptoms are active, and remission, when the bowel is calm. It most often begins in younger adults, but it can appear at any age.",
            es: "La condición suele alternar entre brotes, cuando los síntomas están activos, y remisión, cuando el intestino está en calma. Con mayor frecuencia comienza en adultos jóvenes, pero puede aparecer a cualquier edad.",
            vi: "Bệnh thường luân phiên giữa các đợt bùng phát, khi triệu chứng hoạt động, và giai đoạn thuyên giảm, khi ruột yên ổn. Bệnh thường khởi phát nhất ở người trưởng thành trẻ tuổi, nhưng có thể xuất hiện ở bất kỳ độ tuổi nào.",
            ko: "이 질환은 대개 증상이 활발한 악화기와 장이 잠잠한 관해기가 번갈아 나타납니다. 젊은 성인에게 가장 흔히 시작되지만 어느 연령에서도 나타날 수 있습니다.",
            ar: "تتناوب الحالة عادة بين نوبات يكون فيها المرض نشطًا وفترات هدأة تكون فيها الأمعاء هادئة. وغالبًا ما تبدأ لدى البالغين الأصغر سنًا، لكنها قد تظهر في أي عمر.",
          },
        ],
      },
      {
        heading: {
          en: "Common symptoms",
          es: "Síntomas comunes",
          vi: "Các triệu chứng thường gặp",
          ko: "흔한 증상",
          ar: "الأعراض الشائعة",
        },
        paragraphs: [
          {
            en: "Typical symptoms include diarrhea that may contain blood or mucus, cramping abdominal pain, and a frequent or urgent need to move the bowels. During flares, some people also have fatigue, poor appetite, weight loss, or fever.",
            es: "Los síntomas típicos incluyen diarrea que puede contener sangre o moco, dolor abdominal tipo cólico y una necesidad frecuente o urgente de evacuar. Durante los brotes, algunas personas también tienen fatiga, poco apetito, pérdida de peso o fiebre.",
            vi: "Các triệu chứng điển hình bao gồm tiêu chảy có thể lẫn máu hoặc chất nhầy, đau quặn bụng, và nhu cầu đi ngoài thường xuyên hoặc gấp gáp. Trong các đợt bùng phát, một số người còn bị mệt mỏi, ăn kém, sụt cân hoặc sốt.",
            ko: "전형적인 증상으로는 피나 점액이 섞일 수 있는 설사, 쥐어짜는 듯한 복통, 잦거나 급한 변의가 있습니다. 악화기에는 피로, 식욕 부진, 체중 감소, 발열이 함께 나타나는 분들도 있습니다.",
            ar: "تشمل الأعراض النموذجية إسهالًا قد يحتوي على دم أو مخاط، وألمًا تقلصيًا في البطن، وحاجة متكررة أو ملحّة للتبرز. وخلال النوبات، يعاني بعض الأشخاص أيضًا من التعب أو ضعف الشهية أو فقدان الوزن أو الحمى.",
          },
          {
            en: "Because the immune system is involved, ulcerative colitis can occasionally cause problems beyond the gut, such as joint aches, skin changes, or eye irritation. Severity varies widely from person to person and can change over time.",
            es: "Como el sistema inmunitario está involucrado, la colitis ulcerosa a veces causa problemas fuera del intestino, como dolores en las articulaciones, cambios en la piel o irritación de los ojos. La gravedad varía mucho de una persona a otra y puede cambiar con el tiempo.",
            vi: "Vì có sự tham gia của hệ miễn dịch, viêm loét đại tràng đôi khi có thể gây ra vấn đề ngoài đường ruột, như đau khớp, thay đổi ở da hoặc kích ứng mắt. Mức độ nặng nhẹ khác nhau rất nhiều giữa từng người và có thể thay đổi theo thời gian.",
            ko: "면역계가 관여하는 질환이므로, 궤양성 대장염은 관절 통증, 피부 변화, 눈 자극과 같이 장 바깥의 문제를 일으키기도 합니다. 중증도는 사람마다 크게 다르며 시간이 지나면서 달라질 수 있습니다.",
            ar: "ولأن الجهاز المناعي له دور في المرض، قد يسبب التهاب القولون التقرحي أحيانًا مشكلات خارج الأمعاء، مثل أوجاع المفاصل أو تغيرات الجلد أو تهيج العينين. وتتفاوت شدة المرض كثيرًا من شخص لآخر وقد تتغير مع الوقت.",
          },
        ],
      },
      {
        heading: {
          en: "How it is diagnosed",
          es: "Cómo se diagnostica",
          vi: "Cách chẩn đoán",
          ko: "진단 방법",
          ar: "كيفية التشخيص",
        },
        paragraphs: [
          {
            en: "Diagnosis brings together several pieces of information. Blood and stool tests look for inflammation, anemia, and infection. The central test is a colonoscopy, which allows your gastroenterologist to examine the lining of the colon directly and collect small tissue samples called biopsies. Biopsy results confirm the diagnosis and help distinguish ulcerative colitis from other conditions, including Crohn's disease.",
            es: "El diagnóstico reúne varias piezas de información. Los análisis de sangre y de heces buscan inflamación, anemia e infección. La prueba central es la colonoscopia, que permite a su gastroenterólogo examinar directamente el revestimiento del colon y tomar pequeñas muestras de tejido llamadas biopsias. Los resultados de las biopsias confirman el diagnóstico y ayudan a distinguir la colitis ulcerosa de otras condiciones, incluida la enfermedad de Crohn.",
            vi: "Chẩn đoán dựa trên việc tổng hợp nhiều nguồn thông tin. Xét nghiệm máu và phân tìm dấu hiệu viêm, thiếu máu và nhiễm trùng. Xét nghiệm trung tâm là nội soi đại tràng, cho phép bác sĩ chuyên khoa tiêu hóa quan sát trực tiếp niêm mạc đại tràng và lấy các mẫu mô nhỏ gọi là sinh thiết. Kết quả sinh thiết xác nhận chẩn đoán và giúp phân biệt viêm loét đại tràng với các bệnh khác, bao gồm bệnh Crohn.",
            ko: "진단은 여러 정보를 종합해 이루어집니다. 혈액검사와 대변검사로 염증, 빈혈, 감염 여부를 확인합니다. 중심이 되는 검사는 대장내시경으로, 소화기내과 전문의가 대장 점막을 직접 관찰하고 조직검사라고 하는 작은 조직 샘플을 채취할 수 있습니다. 조직검사 결과는 진단을 확정하고 궤양성 대장염을 크론병을 비롯한 다른 질환과 구별하는 데 도움이 됩니다.",
            ar: "يجمع التشخيص عدة معلومات معًا. فتحاليل الدم والبراز تبحث عن الالتهاب وفقر الدم والعدوى. أما الفحص المحوري فهو تنظير القولون، الذي يتيح لطبيب الجهاز الهضمي فحص بطانة القولون مباشرة وأخذ عينات نسيجية صغيرة تُسمى الخزعات. وتؤكد نتائج الخزعات التشخيص وتساعد على تمييز التهاب القولون التقرحي من حالات أخرى، من بينها داء كرون.",
          },
        ],
      },
      {
        heading: {
          en: "Treatment and management",
          es: "Tratamiento y manejo",
          vi: "Điều trị và kiểm soát",
          ko: "치료 및 관리",
          ar: "العلاج والتدبير",
        },
        paragraphs: [
          {
            en: "Treatment aims to calm the inflammation, relieve symptoms, and then keep the disease in remission. Several families of medicines are used, from anti-inflammatory drugs that work within the intestine to therapies that adjust the immune response. The best choice depends on how much of the colon is involved and how active the disease is.",
            es: "El tratamiento busca calmar la inflamación, aliviar los síntomas y luego mantener la enfermedad en remisión. Se usan varias familias de medicamentos, desde antiinflamatorios que actúan dentro del intestino hasta terapias que regulan la respuesta inmunitaria. La mejor opción depende de cuánto colon está afectado y de qué tan activa está la enfermedad.",
            vi: "Điều trị nhằm làm dịu tình trạng viêm, giảm triệu chứng, rồi giữ cho bệnh ở giai đoạn thuyên giảm. Nhiều nhóm thuốc được sử dụng, từ thuốc kháng viêm tác dụng tại ruột đến các liệu pháp điều chỉnh đáp ứng miễn dịch. Lựa chọn tốt nhất tùy thuộc vào mức độ lan rộng của bệnh trong đại tràng và mức độ hoạt động của bệnh.",
            ko: "치료의 목표는 염증을 가라앉히고 증상을 완화한 뒤 관해 상태를 유지하는 것입니다. 장 안에서 작용하는 항염증제부터 면역 반응을 조절하는 치료제까지 여러 계열의 약물이 사용됩니다. 가장 적합한 선택은 대장의 침범 범위와 질병의 활동 정도에 따라 달라집니다.",
            ar: "يهدف العلاج إلى تهدئة الالتهاب وتخفيف الأعراض ثم إبقاء المرض في طور الهدأة. وتُستخدم عدة عائلات من الأدوية، من الأدوية المضادة للالتهاب التي تعمل داخل الأمعاء إلى العلاجات التي تعدّل الاستجابة المناعية. ويعتمد الخيار الأفضل على مقدار الجزء المصاب من القولون ومدى نشاط المرض.",
          },
          {
            en: "Most people manage ulcerative colitis with medicines and regular follow-up. Surgery to remove the colon is reserved for severe disease that does not respond to treatment or for certain complications. Because long-standing inflammation can slowly raise the risk of colon cancer, your gastroenterologist will also set a schedule of periodic surveillance colonoscopies.",
            es: "La mayoría de las personas controla la colitis ulcerosa con medicamentos y seguimiento regular. La cirugía para extirpar el colon se reserva para la enfermedad grave que no responde al tratamiento o para ciertas complicaciones. Como la inflamación de muchos años puede aumentar lentamente el riesgo de cáncer de colon, su gastroenterólogo también establecerá un calendario de colonoscopias periódicas de vigilancia.",
            vi: "Hầu hết mọi người kiểm soát viêm loét đại tràng bằng thuốc và tái khám định kỳ. Phẫu thuật cắt bỏ đại tràng chỉ dành cho bệnh nặng không đáp ứng điều trị hoặc một số biến chứng nhất định. Vì tình trạng viêm kéo dài nhiều năm có thể từ từ làm tăng nguy cơ ung thư đại tràng, bác sĩ chuyên khoa tiêu hóa của quý vị cũng sẽ lập lịch nội soi đại tràng giám sát định kỳ.",
            ko: "대부분은 약물과 정기적인 추적 관찰로 궤양성 대장염을 관리합니다. 대장을 절제하는 수술은 치료에 반응하지 않는 중증 질환이나 특정 합병증이 있는 경우에만 고려합니다. 오래 지속된 염증은 대장암 위험을 서서히 높일 수 있으므로, 소화기내과 전문의가 정기적인 감시 대장내시경 일정도 정해 드립니다.",
            ar: "يتحكم معظم المصابين في التهاب القولون التقرحي بالأدوية والمتابعة المنتظمة. أما جراحة استئصال القولون فتُحفظ للمرض الشديد الذي لا يستجيب للعلاج أو لبعض المضاعفات. ولأن الالتهاب الطويل الأمد قد يرفع خطر سرطان القولون ببطء، سيضع طبيب الجهاز الهضمي أيضًا جدولًا لتنظير القولون الدوري بغرض المراقبة.",
          },
        ],
      },
      {
        heading: {
          en: "When to talk to a gastroenterologist",
          es: "Cuándo hablar con un gastroenterólogo",
          vi: "Khi nào nên trao đổi với bác sĩ chuyên khoa tiêu hóa",
          ko: "소화기내과 전문의와 상담해야 할 때",
          ar: "متى ينبغي التحدث مع طبيب الجهاز الهضمي",
        },
        paragraphs: [
          {
            en: "Talk to a gastroenterologist if you have ongoing diarrhea, blood in your stool, or abdominal pain that keeps returning. If you already live with ulcerative colitis, contact your care team when a flare does not settle, new symptoms appear, or your medicines cause concerns. Consistent follow-up is one of the strongest tools for staying in remission.",
            es: "Hable con un gastroenterólogo si tiene diarrea continua, sangre en las heces o dolor abdominal que regresa una y otra vez. Si usted ya vive con colitis ulcerosa, comuníquese con su equipo médico cuando un brote no ceda, aparezcan síntomas nuevos o sus medicamentos le causen dudas. El seguimiento constante es una de las herramientas más sólidas para mantenerse en remisión.",
            vi: "Hãy trao đổi với bác sĩ chuyên khoa tiêu hóa nếu quý vị bị tiêu chảy kéo dài, có máu trong phân, hoặc đau bụng tái đi tái lại. Nếu quý vị đã đang sống chung với viêm loét đại tràng, hãy liên hệ với đội ngũ chăm sóc khi một đợt bùng phát không dịu đi, xuất hiện triệu chứng mới, hoặc thuốc khiến quý vị lo ngại. Tái khám đều đặn là một trong những công cụ mạnh nhất để duy trì giai đoạn thuyên giảm.",
            ko: "설사가 계속되거나, 대변에 피가 섞이거나, 복통이 자꾸 재발하면 소화기내과 전문의와 상담하십시오. 이미 궤양성 대장염을 앓고 계시다면, 악화 증상이 가라앉지 않거나, 새로운 증상이 나타나거나, 복용 중인 약에 대해 걱정되는 점이 있을 때 의료진에게 연락하십시오. 꾸준한 추적 관찰은 관해 상태를 유지하는 가장 든든한 수단 중 하나입니다.",
            ar: "تحدث مع طبيب الجهاز الهضمي إذا كان لديك إسهال مستمر أو دم في البراز أو ألم بطني يعاود الظهور. وإذا كنت تعيش بالفعل مع التهاب القولون التقرحي، فتواصل مع فريق الرعاية عندما لا تهدأ إحدى النوبات، أو تظهر أعراض جديدة، أو تثير أدويتك مخاوف لديك. فالمتابعة المنتظمة من أقوى الأدوات للبقاء في طور الهدأة.",
          },
        ],
      },
    ],
    relatedDocId: "info-ulcerative-colitis",
  },
  {
    slug: "colon-polyps",
    legacyId: "48154",
    group: "conditions",
    title: {
      en: "Understanding Colon Polyps and Their Treatment",
      es: "Entienda los pólipos del colon y su tratamiento",
      vi: "Tìm hiểu polyp đại tràng và cách điều trị",
      ko: "대장 용종과 그 치료 이해하기",
      ar: "فهم سلائل القولون وعلاجها",
    },
    summary: {
      en: "Colon polyps are common growths on the inner lining of the colon, and certain types can slowly turn into cancer. Finding and removing them during colonoscopy is one of the most effective ways to prevent colon cancer.",
      es: "Los pólipos del colon son crecimientos comunes en el revestimiento interno del colon, y ciertos tipos pueden convertirse lentamente en cáncer. Encontrarlos y extirparlos durante una colonoscopia es una de las formas más eficaces de prevenir el cáncer de colon.",
      vi: "Polyp đại tràng là những khối tăng sinh thường gặp trên lớp niêm mạc trong của đại tràng, và một số loại có thể từ từ chuyển thành ung thư. Phát hiện và cắt bỏ polyp trong khi nội soi đại tràng là một trong những cách hiệu quả nhất để phòng ngừa ung thư đại tràng.",
      ko: "대장 용종은 대장 안쪽 점막에 생기는 흔한 혹으로, 일부 유형은 서서히 암으로 변할 수 있습니다. 대장내시경 중에 용종을 발견해 제거하는 것은 대장암을 예방하는 가장 효과적인 방법 중 하나입니다.",
      ar: "سلائل القولون زوائد شائعة تنمو على البطانة الداخلية للقولون، ويمكن لأنواع معينة منها أن تتحول ببطء إلى سرطان. والعثور عليها وإزالتها أثناء تنظير القولون من أكثر الطرق فعالية للوقاية من سرطان القولون.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "A colon polyp is a small growth that forms on the inner lining of the large intestine. Polyps are common, and most never cause harm. Certain types, however — especially those called adenomas — can slowly change into colon cancer over a period of years.",
            es: "Un pólipo del colon es un pequeño crecimiento que se forma en el revestimiento interno del intestino grueso. Los pólipos son comunes y la mayoría nunca causa daño. Sin embargo, ciertos tipos — en especial los llamados adenomas — pueden convertirse lentamente en cáncer de colon a lo largo de los años.",
            vi: "Polyp đại tràng là một khối tăng sinh nhỏ hình thành trên lớp niêm mạc trong của ruột già. Polyp rất thường gặp, và hầu hết không bao giờ gây hại. Tuy nhiên, một số loại — đặc biệt là loại được gọi là u tuyến (adenoma) — có thể từ từ chuyển thành ung thư đại tràng trong nhiều năm.",
            ko: "대장 용종은 큰창자 안쪽 점막에 생기는 작은 혹입니다. 용종은 흔하며 대부분은 해를 끼치지 않습니다. 그러나 특정 유형, 특히 선종이라고 불리는 용종은 여러 해에 걸쳐 서서히 대장암으로 변할 수 있습니다.",
            ar: "سليلة القولون زائدة صغيرة تتكون على البطانة الداخلية للأمعاء الغليظة. والسلائل شائعة، ومعظمها لا يسبب ضررًا أبدًا. غير أن أنواعًا معينة — خصوصًا ما يُسمى الأورام الغدية — يمكن أن تتحول ببطء إلى سرطان القولون على مدى سنوات.",
          },
          {
            en: "That slow timeline is actually good news. When polyps are found and removed early, most colon cancers never get the chance to develop. Polyps vary in shape and size: some lie flat against the colon wall, others hang from a small stalk, and a person may have one or several.",
            es: "Ese ritmo lento es, en realidad, una buena noticia. Cuando los pólipos se encuentran y se extirpan a tiempo, la mayoría de los cánceres de colon nunca llega a desarrollarse. Los pólipos varían en forma y tamaño: algunos quedan planos contra la pared del colon, otros cuelgan de un pequeño tallo, y una persona puede tener uno o varios.",
            vi: "Tiến trình chậm rãi đó thật ra là tin tốt. Khi polyp được phát hiện và cắt bỏ sớm, hầu hết các ca ung thư đại tràng không bao giờ có cơ hội hình thành. Polyp đa dạng về hình dạng và kích thước: có polyp nằm phẳng sát thành đại tràng, có polyp treo trên một cuống nhỏ, và một người có thể có một hoặc nhiều polyp.",
            ko: "이렇게 천천히 진행된다는 것은 오히려 좋은 소식입니다. 용종을 일찍 발견해 제거하면 대부분의 대장암은 생길 기회조차 얻지 못합니다. 용종은 모양과 크기가 다양합니다. 대장 벽에 납작하게 붙어 있는 것도 있고, 작은 줄기에 매달려 있는 것도 있으며, 한 사람에게 한 개 또는 여러 개가 있을 수 있습니다.",
            ar: "هذا المسار البطيء خبر جيد في الحقيقة. فعندما تُكتشف السلائل وتُزال مبكرًا، لا تجد معظم سرطانات القولون فرصة للتكون أصلًا. وتختلف السلائل في الشكل والحجم: فبعضها مسطح ملتصق بجدار القولون، وبعضها يتدلى من ساق صغيرة، وقد يكون لدى الشخص سليلة واحدة أو عدة سلائل.",
          },
        ],
      },
      {
        heading: {
          en: "Do polyps cause symptoms?",
          es: "¿Los pólipos causan síntomas?",
          vi: "Polyp có gây triệu chứng không?",
          ko: "용종은 증상을 일으킵니까?",
          ar: "هل تسبب السلائل أعراضًا؟",
        },
        paragraphs: [
          {
            en: "Most polyps cause no symptoms at all, which is exactly why screening matters. Occasionally, a larger polyp bleeds, showing up as visible blood in the stool or as unexplained low iron on a blood test. Rarely, a large polyp can change bowel habits.",
            es: "La mayoría de los pólipos no causa ningún síntoma, y precisamente por eso las pruebas de detección son tan importantes. En ocasiones, un pólipo grande sangra y se nota como sangre visible en las heces o como un nivel bajo de hierro sin explicación en un análisis de sangre. Rara vez, un pólipo grande puede cambiar el hábito intestinal.",
            vi: "Hầu hết polyp hoàn toàn không gây triệu chứng, và đó chính là lý do tầm soát lại quan trọng. Thỉnh thoảng, một polyp lớn hơn có thể chảy máu, biểu hiện là máu nhìn thấy được trong phân hoặc mức sắt thấp không rõ nguyên nhân trong xét nghiệm máu. Hiếm khi, một polyp lớn có thể làm thay đổi thói quen đi ngoài.",
            ko: "대부분의 용종은 아무 증상도 일으키지 않으며, 바로 그래서 선별검사가 중요합니다. 이따금 큰 용종에서 피가 나면 대변에 눈에 보이는 피가 섞이거나 혈액검사에서 원인 모를 철분 부족으로 나타날 수 있습니다. 드물게는 큰 용종이 배변 습관을 바꾸기도 합니다.",
            ar: "معظم السلائل لا تسبب أي أعراض على الإطلاق، وهذا بالضبط ما يجعل فحوصات الكشف مهمة. وأحيانًا تنزف سليلة كبيرة، فيظهر ذلك على شكل دم مرئي في البراز أو انخفاض غير مفسر في الحديد في تحليل الدم. ونادرًا ما يمكن لسليلة كبيرة أن تغيّر عادات الأمعاء.",
          },
          {
            en: "Because warning signs are so uncommon, waiting for symptoms is not a dependable strategy. Screening is designed to find polyps while they are silent and simple to remove.",
            es: "Como las señales de alerta son tan poco comunes, esperar a tener síntomas no es una estrategia confiable. La detección está diseñada para encontrar los pólipos mientras son silenciosos y fáciles de extirpar.",
            vi: "Vì các dấu hiệu cảnh báo rất hiếm gặp, chờ đến khi có triệu chứng không phải là cách làm đáng tin cậy. Tầm soát được thiết kế để tìm ra polyp khi chúng còn im lặng và dễ cắt bỏ.",
            ko: "경고 신호가 이렇게 드물기 때문에 증상이 나타나기를 기다리는 것은 믿을 만한 방법이 아닙니다. 선별검사는 용종이 아직 조용하고 제거하기 쉬울 때 찾아내도록 설계된 검사입니다.",
            ar: "ولأن العلامات التحذيرية نادرة إلى هذا الحد، فإن انتظار الأعراض ليس استراتيجية يُعتمد عليها. فقد صُممت فحوصات الكشف للعثور على السلائل وهي صامتة وسهلة الإزالة.",
          },
        ],
      },
      {
        heading: {
          en: "How polyps are found",
          es: "Cómo se encuentran los pólipos",
          vi: "Cách phát hiện polyp",
          ko: "용종을 찾는 방법",
          ar: "كيف يُعثر على السلائل",
        },
        paragraphs: [
          {
            en: "Colonoscopy is the most thorough test, because it examines the full length of the colon and allows polyps to be removed during the same visit. Stool-based screening tests can detect hidden blood or abnormal DNA, but a positive result still needs to be followed by a colonoscopy. Your gastroenterologist can help you choose the screening approach that fits your history.",
            es: "La colonoscopia es la prueba más completa, porque examina todo el colon y permite extirpar los pólipos en la misma visita. Las pruebas de detección en heces pueden encontrar sangre oculta o ADN anormal, pero un resultado positivo debe confirmarse después con una colonoscopia. Su gastroenterólogo puede ayudarle a elegir la opción de detección que mejor se ajuste a su historia.",
            vi: "Nội soi đại tràng là xét nghiệm toàn diện nhất, vì nó khảo sát toàn bộ chiều dài đại tràng và cho phép cắt bỏ polyp ngay trong cùng lần khám. Các xét nghiệm tầm soát dựa trên phân có thể phát hiện máu ẩn hoặc DNA bất thường, nhưng kết quả dương tính vẫn cần được nội soi đại tràng sau đó. Bác sĩ chuyên khoa tiêu hóa có thể giúp quý vị chọn phương pháp tầm soát phù hợp với tiền sử của mình.",
            ko: "대장내시경은 대장 전체 길이를 살펴보고 같은 방문에서 용종을 바로 제거할 수 있으므로 가장 철저한 검사입니다. 대변 기반 선별검사는 잠혈이나 비정상 DNA를 찾아낼 수 있지만, 양성 결과가 나오면 반드시 대장내시경 검사로 이어져야 합니다. 소화기내과 전문의가 병력에 맞는 선별검사 방법을 고르도록 도와드릴 수 있습니다.",
            ar: "تنظير القولون هو الفحص الأشمل، لأنه يفحص القولون بكامل طوله ويتيح إزالة السلائل في الزيارة نفسها. ويمكن لفحوصات الكشف المعتمدة على البراز اكتشاف الدم الخفي أو الحمض النووي (DNA) غير الطبيعي، لكن النتيجة الإيجابية يجب أن يتبعها تنظير للقولون. ويمكن لطبيب الجهاز الهضمي مساعدتك في اختيار أسلوب الكشف الذي يناسب تاريخك الصحي.",
          },
        ],
      },
      {
        heading: {
          en: "How polyps are treated",
          es: "Cómo se tratan los pólipos",
          vi: "Cách điều trị polyp",
          ko: "용종의 치료 방법",
          ar: "كيف تُعالج السلائل",
        },
        paragraphs: [
          {
            en: "Nearly all polyps can be removed during a colonoscopy, most often with a thin wire loop passed through the scope. Removal is generally painless and adds little time to the exam. Each polyp is then sent to a laboratory, where a specialist examines it under a microscope and identifies its type.",
            es: "Casi todos los pólipos pueden extirparse durante una colonoscopia, generalmente con un asa delgada de alambre que se pasa a través del endoscopio. La extirpación no suele causar dolor y agrega poco tiempo al examen. Cada pólipo se envía después a un laboratorio, donde un especialista lo examina al microscopio e identifica su tipo.",
            vi: "Gần như tất cả polyp đều có thể được cắt bỏ trong khi nội soi đại tràng, thường bằng một vòng dây kim loại mảnh luồn qua ống nội soi. Việc cắt bỏ thường không đau và chỉ kéo dài cuộc khám thêm chút ít. Sau đó, mỗi polyp được gửi đến phòng xét nghiệm, nơi một chuyên gia soi dưới kính hiển vi và xác định loại polyp.",
            ko: "거의 모든 용종은 대장내시경 중에 제거할 수 있으며, 대개는 내시경을 통해 넣은 가는 철사 올가미를 사용합니다. 제거는 일반적으로 통증이 없고 검사 시간도 거의 늘어나지 않습니다. 제거한 용종은 각각 검사실로 보내져 전문의가 현미경으로 관찰하고 유형을 판별합니다.",
            ar: "يمكن إزالة جميع السلائل تقريبًا أثناء تنظير القولون، وغالبًا ما يتم ذلك بعروة سلكية رفيعة تُمرَّر عبر المنظار. والإزالة غير مؤلمة عمومًا ولا تضيف إلى الفحص سوى وقت قليل. ثم تُرسل كل سليلة إلى المختبر، حيث يفحصها اختصاصي تحت المجهر ويحدد نوعها.",
          },
          {
            en: "Those results guide the follow-up plan. Based on the number, size, and type of polyps found, your gastroenterologist will recommend when your next colonoscopy should take place. Keeping that schedule is the most reliable way to keep new polyps from becoming a problem.",
            es: "Esos resultados guían el plan de seguimiento. Según el número, el tamaño y el tipo de pólipos encontrados, su gastroenterólogo le recomendará cuándo debe realizarse su próxima colonoscopia. Cumplir ese calendario es la manera más confiable de evitar que nuevos pólipos se conviertan en un problema.",
            vi: "Những kết quả đó định hướng kế hoạch theo dõi. Dựa trên số lượng, kích thước và loại polyp tìm thấy, bác sĩ chuyên khoa tiêu hóa sẽ khuyến nghị thời điểm quý vị nên nội soi đại tràng lần tiếp theo. Tuân thủ lịch hẹn đó là cách đáng tin cậy nhất để không cho các polyp mới trở thành vấn đề.",
            ko: "이 결과에 따라 추적 관찰 계획이 정해집니다. 발견된 용종의 개수, 크기, 유형을 바탕으로 소화기내과 전문의가 다음 대장내시경 검사 시기를 권고해 드립니다. 그 일정을 지키는 것이 새로 생기는 용종이 문제가 되지 않게 하는 가장 확실한 방법입니다.",
            ar: "توجّه هذه النتائج خطة المتابعة. فبناءً على عدد السلائل المكتشفة وحجمها ونوعها، سيوصي طبيب الجهاز الهضمي بموعد تنظير القولون التالي. والالتزام بذلك الجدول هو الطريقة الأكثر موثوقية لمنع السلائل الجديدة من التحول إلى مشكلة.",
          },
        ],
      },
      {
        heading: {
          en: "When to talk to a gastroenterologist",
          es: "Cuándo hablar con un gastroenterólogo",
          vi: "Khi nào nên trao đổi với bác sĩ chuyên khoa tiêu hóa",
          ko: "소화기내과 전문의와 상담해야 할 때",
          ar: "متى ينبغي التحدث مع طبيب الجهاز الهضمي",
        },
        paragraphs: [
          {
            en: "Most adults should begin discussing colon cancer screening with their care team at age 45, and sooner when polyps or colon cancer run in the family. Whatever your age, make an appointment if you notice rectal bleeding, unexplained anemia or fatigue, or a lasting change in your bowel habits.",
            es: "La mayoría de los adultos debe comenzar a hablar sobre la detección del cáncer de colon con su equipo médico a los 45 años, y antes cuando hay antecedentes familiares de pólipos o de cáncer de colon. Sin importar su edad, haga una cita si nota sangrado rectal, anemia o cansancio sin explicación, o un cambio duradero en su hábito intestinal.",
            vi: "Hầu hết người trưởng thành nên bắt đầu trao đổi với đội ngũ chăm sóc về tầm soát ung thư đại tràng ở tuổi 45, và sớm hơn nếu gia đình có người bị polyp hoặc ung thư đại tràng. Dù ở tuổi nào, hãy đặt hẹn khám nếu quý vị thấy chảy máu trực tràng, thiếu máu hoặc mệt mỏi không rõ nguyên nhân, hoặc thay đổi kéo dài trong thói quen đi ngoài.",
            ko: "대부분의 성인은 45세부터 의료진과 대장암 선별검사를 상의하기 시작해야 하며, 가족 중에 용종이나 대장암이 있는 경우에는 더 일찍 시작해야 합니다. 나이와 관계없이 직장 출혈, 원인 모를 빈혈이나 피로, 오래 지속되는 배변 습관의 변화가 있으면 진료 예약을 하십시오.",
            ar: "ينبغي لمعظم البالغين البدء بمناقشة فحص الكشف عن سرطان القولون مع فريق الرعاية في سن 45، وقبل ذلك إذا كانت السلائل أو سرطان القولون منتشرة في العائلة. وأيًا كان عمرك، احجز موعدًا إذا لاحظت نزيفًا من المستقيم، أو فقر دم أو تعبًا غير مفسرين، أو تغيرًا دائمًا في عادات الأمعاء.",
          },
        ],
      },
    ],
  },
  {
    slug: "diverticulosis",
    legacyId: "48159",
    group: "conditions",
    title: {
      en: "Understanding Diverticulosis",
      es: "Entienda la diverticulosis",
      vi: "Tìm hiểu bệnh túi thừa đại tràng",
      ko: "게실증 이해하기",
      ar: "فهم داء الرتوج",
    },
    summary: {
      en: "Diverticulosis means small pouches have formed in the wall of the colon. Most people never have problems, but it helps to recognize the signs of complications and the habits that support colon health.",
      es: "La diverticulosis significa que se han formado pequeñas bolsas en la pared del colon. La mayoría de las personas nunca tiene problemas, pero conviene reconocer las señales de complicaciones y los hábitos que apoyan la salud del colon.",
      vi: "Bệnh túi thừa đại tràng nghĩa là đã hình thành những túi nhỏ trong thành đại tràng. Hầu hết mọi người không bao giờ gặp vấn đề, nhưng việc nhận biết các dấu hiệu biến chứng và những thói quen hỗ trợ sức khỏe đại tràng là rất hữu ích.",
      ko: "게실증은 대장 벽에 작은 주머니들이 생겼다는 뜻입니다. 대부분은 아무 문제 없이 지내지만, 합병증의 징후와 대장 건강을 지키는 습관을 알아 두면 도움이 됩니다.",
      ar: "داء الرتوج يعني أن جيوبًا صغيرة قد تكوّنت في جدار القولون. ومعظم الناس لا يواجهون مشكلات أبدًا، لكن من المفيد التعرف على علامات المضاعفات والعادات التي تدعم صحة القولون.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Diverticulosis means that small pouches, called diverticula, have developed in the wall of the colon. They form where the inner lining bulges outward through weaker areas of the muscle layer, most often in the lower left portion of the colon. The pouches themselves are not cancerous.",
            es: "La diverticulosis significa que se han desarrollado pequeñas bolsas, llamadas divertículos, en la pared del colon. Se forman donde el revestimiento interno se abomba hacia afuera a través de zonas más débiles de la capa muscular, con mayor frecuencia en la parte inferior izquierda del colon. Las bolsas en sí no son cancerosas.",
            vi: "Bệnh túi thừa đại tràng nghĩa là những túi nhỏ, gọi là túi thừa, đã hình thành trong thành đại tràng. Chúng xuất hiện ở nơi lớp niêm mạc trong phình ra ngoài qua những vùng yếu hơn của lớp cơ, thường gặp nhất ở phần dưới bên trái của đại tràng. Bản thân các túi này không phải là ung thư.",
            ko: "게실증은 대장 벽에 게실이라고 하는 작은 주머니들이 생긴 상태를 말합니다. 게실은 안쪽 점막이 근육층의 약한 부위를 뚫고 바깥쪽으로 불거져 나온 곳에 생기며, 대장의 왼쪽 아랫부분에 가장 흔합니다. 이 주머니 자체는 암이 아닙니다.",
            ar: "داء الرتوج يعني أن جيوبًا صغيرة، تُسمى الرتوج، قد تكوّنت في جدار القولون. وتتشكل حيث تنتفخ البطانة الداخلية إلى الخارج عبر مناطق أضعف من الطبقة العضلية، وغالبًا في الجزء السفلي الأيسر من القولون. والجيوب نفسها ليست سرطانية.",
          },
          {
            en: "Diverticulosis becomes more common with age, and many adults only learn they have it when a colonoscopy or scan done for another reason happens to show the pouches.",
            es: "La diverticulosis se vuelve más común con la edad, y muchos adultos se enteran de que la tienen solo cuando una colonoscopia o un estudio de imagen hecho por otra razón muestra las bolsas.",
            vi: "Bệnh túi thừa đại tràng trở nên phổ biến hơn theo tuổi, và nhiều người trưởng thành chỉ biết mình mắc bệnh khi một lần nội soi đại tràng hoặc chụp chiếu vì lý do khác tình cờ cho thấy các túi này.",
            ko: "게실증은 나이가 들수록 흔해지며, 많은 성인이 다른 이유로 받은 대장내시경이나 영상 검사에서 우연히 주머니가 보여서야 게실증이 있다는 것을 알게 됩니다.",
            ar: "يصبح داء الرتوج أكثر شيوعًا مع التقدم في العمر، وكثير من البالغين لا يكتشفون إصابتهم به إلا حين تظهر الجيوب مصادفةً في تنظير للقولون أو فحص تصويري أُجري لسبب آخر.",
          },
        ],
      },
      {
        heading: {
          en: "Common symptoms",
          es: "Síntomas comunes",
          vi: "Các triệu chứng thường gặp",
          ko: "흔한 증상",
          ar: "الأعراض الشائعة",
        },
        paragraphs: [
          {
            en: "Most people with diverticulosis never notice it. Some have occasional mild cramping, bloating, or irregular bowel habits.",
            es: "La mayoría de las personas con diverticulosis nunca la nota. Algunas tienen de vez en cuando cólicos leves, hinchazón o un hábito intestinal irregular.",
            vi: "Hầu hết người có bệnh túi thừa đại tràng không bao giờ nhận thấy nó. Một số người thỉnh thoảng bị đau quặn nhẹ, chướng bụng hoặc đi ngoài không đều.",
            ko: "게실증이 있는 사람 대부분은 전혀 느끼지 못합니다. 일부는 이따금 가벼운 경련성 복통, 복부 팽만, 불규칙한 배변을 겪습니다.",
            ar: "معظم المصابين بداء الرتوج لا يشعرون به أبدًا. ويعاني بعضهم أحيانًا من تقلصات خفيفة أو انتفاخ أو عادات أمعاء غير منتظمة.",
          },
          {
            en: "Trouble starts when a pouch becomes inflamed or infected, a condition called diverticulitis. That usually causes steady abdominal pain — often in the lower left side — sometimes with fever, nausea, or a change in bowel habits. A pouch can also bleed on occasion, producing red or maroon blood in the stool, typically without pain.",
            es: "Los problemas comienzan cuando una bolsa se inflama o se infecta, una condición llamada diverticulitis. Eso suele causar un dolor abdominal constante — a menudo en el lado inferior izquierdo — a veces con fiebre, náuseas o un cambio en el hábito intestinal. Una bolsa también puede sangrar en ocasiones y producir sangre roja o de color vino en las heces, por lo general sin dolor.",
            vi: "Vấn đề bắt đầu khi một túi thừa bị viêm hoặc nhiễm trùng, tình trạng gọi là viêm túi thừa. Điều đó thường gây đau bụng liên tục — hay gặp ở vùng bụng dưới bên trái — đôi khi kèm sốt, buồn nôn hoặc thay đổi thói quen đi ngoài. Thỉnh thoảng, một túi thừa cũng có thể chảy máu, tạo ra máu đỏ tươi hoặc đỏ sẫm trong phân, thường không kèm đau.",
            ko: "문제는 주머니에 염증이 생기거나 감염될 때 시작되며, 이를 게실염이라고 합니다. 게실염은 보통 지속적인 복통을 일으키는데, 흔히 왼쪽 아랫배에 나타나며 때로 발열, 메스꺼움, 배변 습관의 변화가 동반됩니다. 또한 주머니에서 이따금 피가 나서 대변에 붉거나 검붉은 피가 섞여 나올 수 있는데, 이때는 대개 통증이 없습니다.",
            ar: "تبدأ المشكلات عندما يلتهب أحد الجيوب أو يُصاب بالعدوى، وهي حالة تُسمى التهاب الرتوج. ويسبب ذلك عادة ألمًا بطنيًا ثابتًا — غالبًا في الجانب السفلي الأيسر — يصاحبه أحيانًا حمى أو غثيان أو تغير في عادات الأمعاء. وقد ينزف أحد الجيوب أحيانًا فيظهر دم أحمر أو داكن اللون في البراز، عادة من دون ألم.",
          },
        ],
      },
      {
        heading: {
          en: "How it is diagnosed",
          es: "Cómo se diagnostica",
          vi: "Cách chẩn đoán",
          ko: "진단 방법",
          ar: "كيفية التشخيص",
        },
        paragraphs: [
          {
            en: "Diverticulosis itself is usually discovered during a screening colonoscopy or on imaging done for another purpose. When diverticulitis is suspected, a CT scan of the abdomen is the usual test, because it shows inflammation around the pouches, and blood tests help gauge the severity. After an episode of diverticulitis has fully settled, your gastroenterologist may recommend a colonoscopy to examine the colon.",
            es: "La diverticulosis suele descubrirse durante una colonoscopia de detección o en estudios de imagen hechos por otro motivo. Cuando se sospecha diverticulitis, la prueba habitual es una tomografía computarizada del abdomen, porque muestra la inflamación alrededor de las bolsas, y los análisis de sangre ayudan a medir la gravedad. Después de que un episodio de diverticulitis se ha calmado por completo, su gastroenterólogo puede recomendar una colonoscopia para examinar el colon.",
            vi: "Bản thân bệnh túi thừa đại tràng thường được phát hiện trong lần nội soi đại tràng tầm soát hoặc trên hình ảnh chụp vì mục đích khác. Khi nghi ngờ viêm túi thừa, chụp cắt lớp vi tính (CT) vùng bụng là xét nghiệm thường dùng, vì nó cho thấy tình trạng viêm quanh các túi thừa, và xét nghiệm máu giúp đánh giá mức độ nặng. Sau khi một đợt viêm túi thừa đã lắng hẳn, bác sĩ chuyên khoa tiêu hóa có thể khuyên nội soi đại tràng để kiểm tra đại tràng.",
            ko: "게실증 자체는 대개 선별 대장내시경 검사에서, 또는 다른 목적으로 시행한 영상 검사에서 발견됩니다. 게실염이 의심될 때는 복부 CT가 일반적인 검사인데, 주머니 주변의 염증을 보여 주기 때문이며, 혈액검사는 중증도를 가늠하는 데 도움이 됩니다. 게실염이 완전히 가라앉은 뒤에는 소화기내과 전문의가 대장을 살펴보기 위해 대장내시경 검사를 권할 수 있습니다.",
            ar: "يُكتشف داء الرتوج نفسه عادة أثناء تنظير القولون للكشف المبكر أو في تصوير أُجري لغرض آخر. وعند الاشتباه في التهاب الرتوج، يكون التصوير المقطعي المحوسب (CT) للبطن هو الفحص المعتاد لأنه يُظهر الالتهاب حول الجيوب، وتساعد تحاليل الدم في تقدير شدة الحالة. وبعد أن تهدأ نوبة التهاب الرتوج تمامًا، قد يوصي طبيب الجهاز الهضمي بتنظير للقولون لفحصه.",
          },
        ],
      },
      {
        heading: {
          en: "Treatment and management",
          es: "Tratamiento y manejo",
          vi: "Điều trị và kiểm soát",
          ko: "치료 및 관리",
          ar: "العلاج والتدبير",
        },
        paragraphs: [
          {
            en: "Diverticulosis without symptoms needs no treatment. A fiber-rich diet with plenty of fluids supports soft, regular bowel movements and may lower the chance of complications, and staying active and keeping a healthy weight help as well. Despite a long-standing belief, most people with diverticulosis do not need to avoid nuts, seeds, or popcorn.",
            es: "La diverticulosis sin síntomas no necesita tratamiento. Una dieta rica en fibra con abundantes líquidos favorece evacuaciones blandas y regulares y puede reducir la probabilidad de complicaciones; mantenerse activo y conservar un peso saludable también ayudan. A pesar de una creencia muy extendida, la mayoría de las personas con diverticulosis no necesita evitar las nueces, las semillas ni las palomitas de maíz.",
            vi: "Bệnh túi thừa đại tràng không có triệu chứng thì không cần điều trị. Chế độ ăn giàu chất xơ với nhiều nước giúp đi ngoài phân mềm, đều đặn và có thể giảm nguy cơ biến chứng; duy trì vận động và giữ cân nặng hợp lý cũng có ích. Trái với một niềm tin đã có từ lâu, hầu hết người bị bệnh túi thừa đại tràng không cần kiêng quả hạch, các loại hạt hay bắp rang.",
            ko: "증상이 없는 게실증은 치료가 필요 없습니다. 식이섬유가 풍부한 식단과 충분한 수분은 부드럽고 규칙적인 배변을 돕고 합병증 가능성을 낮출 수 있으며, 활동적으로 지내고 건강한 체중을 유지하는 것도 도움이 됩니다. 오래된 통념과 달리, 게실증이 있는 사람 대부분은 견과류, 씨앗류, 팝콘을 피할 필요가 없습니다.",
            ar: "داء الرتوج غير المصحوب بأعراض لا يحتاج إلى علاج. فالنظام الغذائي الغني بالألياف مع سوائل وافرة يدعم تبرزًا لينًا ومنتظمًا وقد يقلل احتمال المضاعفات، كما يساعد البقاء نشيطًا والحفاظ على وزن صحي أيضًا. وخلافًا لاعتقاد قديم، لا يحتاج معظم المصابين بداء الرتوج إلى تجنب المكسرات أو البذور أو الفشار.",
          },
          {
            en: "Diverticulitis is treated according to its severity. A milder episode may be managed at home with rest, a temporary adjustment in diet, and close follow-up, while a more severe episode can call for antibiotics or hospital care. Your care team will tailor the plan to your situation.",
            es: "La diverticulitis se trata según su gravedad. Un episodio leve puede manejarse en casa con reposo, un ajuste temporal de la dieta y un seguimiento cercano, mientras que un episodio más grave puede requerir antibióticos o atención hospitalaria. Su equipo médico adaptará el plan a su situación.",
            vi: "Viêm túi thừa được điều trị tùy theo mức độ nặng. Một đợt nhẹ có thể được xử trí tại nhà bằng nghỉ ngơi, điều chỉnh chế độ ăn tạm thời và theo dõi sát, trong khi một đợt nặng hơn có thể cần kháng sinh hoặc chăm sóc tại bệnh viện. Đội ngũ chăm sóc sẽ điều chỉnh kế hoạch cho phù hợp với tình trạng của quý vị.",
            ko: "게실염은 중증도에 따라 치료합니다. 가벼운 경우에는 휴식, 일시적인 식단 조절, 세심한 추적 관찰로 집에서 관리할 수 있고, 더 심한 경우에는 항생제나 입원 치료가 필요할 수 있습니다. 의료진이 상황에 맞게 계획을 조정해 드립니다.",
            ar: "يُعالج التهاب الرتوج بحسب شدته. فقد تُدار النوبة الأخف في المنزل بالراحة وتعديل مؤقت في النظام الغذائي ومتابعة عن قرب، بينما قد تستدعي النوبة الأشد مضادات حيوية أو رعاية في المستشفى. وسيكيّف فريق الرعاية الخطة بما يناسب حالتك.",
          },
        ],
      },
      {
        heading: {
          en: "When to talk to a gastroenterologist",
          es: "Cuándo hablar con un gastroenterólogo",
          vi: "Khi nào nên trao đổi với bác sĩ chuyên khoa tiêu hóa",
          ko: "소화기내과 전문의와 상담해야 할 때",
          ar: "متى ينبغي التحدث مع طبيب الجهاز الهضمي",
        },
        paragraphs: [
          {
            en: "Seek care promptly if you develop steady abdominal pain with fever, or any bleeding from the rectum. If you have had diverticulitis before, a gastroenterologist can help you plan sensible follow-up and lower the chance of another episode.",
            es: "Busque atención pronto si presenta dolor abdominal constante con fiebre, o cualquier sangrado por el recto. Si ya ha tenido diverticulitis, un gastroenterólogo puede ayudarle a planear un seguimiento sensato y a reducir la probabilidad de otro episodio.",
            vi: "Hãy đi khám sớm nếu quý vị bị đau bụng liên tục kèm sốt, hoặc có bất kỳ chảy máu nào từ trực tràng. Nếu quý vị từng bị viêm túi thừa, bác sĩ chuyên khoa tiêu hóa có thể giúp quý vị lập kế hoạch theo dõi hợp lý và giảm nguy cơ xảy ra một đợt khác.",
            ko: "발열을 동반한 지속적인 복통이 생기거나 직장에서 출혈이 조금이라도 있으면 지체하지 말고 진료를 받으십시오. 이전에 게실염을 앓았다면, 소화기내과 전문의가 합리적인 추적 관찰 계획을 세우고 재발 가능성을 낮추도록 도와드릴 수 있습니다.",
            ar: "اطلب الرعاية سريعًا إذا أصبت بألم بطني ثابت مع حمى، أو بأي نزيف من المستقيم. وإذا سبق أن أُصبت بالتهاب الرتوج، فيمكن لطبيب الجهاز الهضمي مساعدتك في وضع خطة متابعة حكيمة وتقليل احتمال حدوث نوبة أخرى.",
          },
        ],
      },
    ],
    relatedDocId: "info-diverticular-disease",
  },
  {
    slug: "minor-rectal-bleeding",
    legacyId: "48161",
    group: "conditions",
    title: {
      en: "Understanding Minor Rectal Bleeding",
      es: "Entienda el sangrado rectal leve",
      vi: "Tìm hiểu chảy máu trực tràng nhẹ",
      ko: "경미한 직장 출혈 이해하기",
      ar: "فهم النزيف المستقيمي البسيط",
    },
    summary: {
      en: "Small amounts of bright red blood with bowel movements usually come from a treatable cause near the anus, but the source should always be confirmed. Learn about common causes, testing, and treatment.",
      es: "Pequeñas cantidades de sangre roja brillante con las evacuaciones suelen provenir de una causa tratable cercana al ano, pero el origen siempre debe confirmarse. Conozca las causas comunes, las pruebas y el tratamiento.",
      vi: "Một lượng nhỏ máu đỏ tươi khi đi ngoài thường xuất phát từ một nguyên nhân có thể điều trị được ở gần hậu môn, nhưng nguồn chảy máu luôn cần được xác nhận. Tìm hiểu về các nguyên nhân thường gặp, xét nghiệm và điều trị.",
      ko: "배변 시 소량의 선홍색 피는 대개 항문 근처의 치료 가능한 원인에서 나오지만, 출혈 부위는 반드시 확인해야 합니다. 흔한 원인과 검사, 치료에 대해 알아보십시오.",
      ar: "غالبًا ما تأتي الكميات الصغيرة من الدم الأحمر الفاتح مع التبرز من سبب قابل للعلاج قرب فتحة الشرج، لكن يجب دائمًا تأكيد مصدر النزيف. تعرَّف على الأسباب الشائعة والفحوصات والعلاج.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Minor rectal bleeding means passing small amounts of bright red blood, noticed on toilet paper, on the surface of the stool, or in the toilet bowl. It is a common experience, and in most people the source turns out to be a treatable condition near the anus.",
            es: "El sangrado rectal leve significa expulsar pequeñas cantidades de sangre roja brillante, que se nota en el papel higiénico, en la superficie de las heces o en el inodoro. Es una experiencia común y, en la mayoría de las personas, el origen resulta ser una condición tratable cercana al ano.",
            vi: "Chảy máu trực tràng nhẹ nghĩa là ra một lượng nhỏ máu đỏ tươi, thấy trên giấy vệ sinh, trên bề mặt phân hoặc trong bồn cầu. Đây là trải nghiệm thường gặp, và ở hầu hết mọi người, nguồn chảy máu hóa ra là một bệnh có thể điều trị được ở gần hậu môn.",
            ko: "경미한 직장 출혈이란 휴지, 대변 표면, 변기 물에서 발견되는 소량의 선홍색 피를 말합니다. 흔히 겪는 일이며, 대부분의 경우 출혈 부위는 항문 근처의 치료 가능한 질환으로 밝혀집니다.",
            ar: "النزيف المستقيمي البسيط يعني خروج كميات صغيرة من الدم الأحمر الفاتح، تُلاحظ على ورق الحمام أو على سطح البراز أو في المرحاض. وهو أمر شائع، وفي معظم الناس يتبين أن مصدره حالة قابلة للعلاج قرب فتحة الشرج.",
          },
          {
            en: "Even so, blood in the stool is never something to guess about. Bleeding can occasionally be the first sign of a more serious problem, including colon cancer, and the only way to know is to find the source.",
            es: "Aun así, la sangre en las heces nunca es algo que deba adivinarse. En ocasiones el sangrado puede ser la primera señal de un problema más serio, incluido el cáncer de colon, y la única manera de saberlo es encontrar el origen.",
            vi: "Dù vậy, máu trong phân không bao giờ là điều nên tự phỏng đoán. Đôi khi chảy máu có thể là dấu hiệu đầu tiên của một vấn đề nghiêm trọng hơn, bao gồm ung thư đại tràng, và cách duy nhất để biết là tìm ra nguồn chảy máu.",
            ko: "그렇더라도 대변에 섞인 피를 짐작으로 넘겨서는 안 됩니다. 출혈은 때로 대장암을 비롯한 더 심각한 문제의 첫 신호일 수 있으며, 확인할 유일한 방법은 출혈 부위를 찾는 것입니다.",
            ar: "ومع ذلك، فإن الدم في البراز ليس أمرًا يُترك للتخمين أبدًا. فقد يكون النزيف أحيانًا أول علامة على مشكلة أخطر، بما في ذلك سرطان القولون، والطريقة الوحيدة للمعرفة هي العثور على المصدر.",
          },
        ],
      },
      {
        heading: {
          en: "Common causes",
          es: "Causas comunes",
          vi: "Các nguyên nhân thường gặp",
          ko: "흔한 원인",
          ar: "الأسباب الشائعة",
        },
        paragraphs: [
          {
            en: "Hemorrhoids, which are swollen veins in the rectum or anus, are the most frequent cause. They may itch, ache, or bleed, especially after straining. Anal fissures — small tears in the lining of the anal canal — typically cause sharp pain during bowel movements along with streaks of bright blood.",
            es: "Las hemorroides, que son venas hinchadas en el recto o el ano, son la causa más frecuente. Pueden picar, doler o sangrar, sobre todo después de hacer esfuerzo. Las fisuras anales — pequeños desgarros en el revestimiento del canal anal — suelen causar un dolor agudo durante las evacuaciones junto con rayas de sangre brillante.",
            vi: "Trĩ, tức các tĩnh mạch sưng phồng ở trực tràng hoặc hậu môn, là nguyên nhân thường gặp nhất. Trĩ có thể ngứa, đau nhức hoặc chảy máu, nhất là sau khi rặn. Nứt hậu môn — những vết rách nhỏ ở niêm mạc ống hậu môn — thường gây đau nhói khi đi ngoài kèm theo những vệt máu tươi.",
            ko: "가장 흔한 원인은 직장이나 항문의 정맥이 부풀어 오른 치핵입니다. 치핵은 가렵거나 아프거나 피가 날 수 있으며, 특히 힘을 준 뒤에 그렇습니다. 치열은 항문관 점막에 생긴 작은 찢어짐으로, 대개 배변 중 날카로운 통증과 함께 선홍색 피가 줄무늬처럼 묻어 나옵니다.",
            ar: "البواسير، وهي أوردة متورمة في المستقيم أو الشرج، هي السبب الأكثر تكرارًا. وقد تسبب حكة أو ألمًا أو نزيفًا، خصوصًا بعد الشد أثناء التبرز. أما الشقوق الشرجية — وهي تمزقات صغيرة في بطانة القناة الشرجية — فتسبب عادة ألمًا حادًا أثناء التبرز مع خطوط من الدم الفاتح.",
          },
          {
            en: "Other possibilities include polyps, inflammation of the rectum, and bleeding from diverticula. Cancers of the colon and rectum can bleed as well, which is why the cause should be confirmed rather than assumed.",
            es: "Otras posibilidades incluyen los pólipos, la inflamación del recto y el sangrado de los divertículos. Los cánceres del colon y del recto también pueden sangrar, y por eso la causa debe confirmarse en lugar de suponerse.",
            vi: "Các khả năng khác bao gồm polyp, viêm trực tràng và chảy máu từ túi thừa. Ung thư đại tràng và trực tràng cũng có thể chảy máu, và đó là lý do nguyên nhân cần được xác nhận thay vì phỏng đoán.",
            ko: "그 밖의 가능성으로는 용종, 직장의 염증, 게실 출혈이 있습니다. 대장과 직장의 암도 출혈을 일으킬 수 있으므로, 원인은 짐작할 것이 아니라 확인해야 합니다.",
            ar: "تشمل الاحتمالات الأخرى السلائل والتهاب المستقيم والنزيف من الرتوج. وقد تنزف سرطانات القولون والمستقيم أيضًا، ولهذا يجب تأكيد السبب لا افتراضه.",
          },
        ],
      },
      {
        heading: {
          en: "How the cause is found",
          es: "Cómo se encuentra la causa",
          vi: "Cách tìm nguyên nhân",
          ko: "원인을 찾는 방법",
          ar: "كيف يُحدَّد السبب",
        },
        paragraphs: [
          {
            en: "Your gastroenterologist will ask about your symptoms and bowel habits and gently examine the anal area. Depending on your age, your history, and the findings, the next step may be an exam with a short, flexible scope to view the rectum and lower colon, or a colonoscopy to inspect the entire colon. These exams locate the source of bleeding, and some problems, such as polyps, can be treated during the same procedure.",
            es: "Su gastroenterólogo le preguntará sobre sus síntomas y su hábito intestinal y examinará con cuidado la zona anal. Según su edad, su historia y los hallazgos, el siguiente paso puede ser un examen con un endoscopio corto y flexible para ver el recto y la parte baja del colon, o una colonoscopia para revisar todo el colon. Estos exámenes localizan el origen del sangrado, y algunos problemas, como los pólipos, pueden tratarse durante el mismo procedimiento.",
            vi: "Bác sĩ chuyên khoa tiêu hóa sẽ hỏi về triệu chứng và thói quen đi ngoài của quý vị và khám nhẹ nhàng vùng hậu môn. Tùy theo tuổi, bệnh sử và các phát hiện khi khám, bước tiếp theo có thể là khám bằng một ống soi ngắn, mềm để quan sát trực tràng và phần dưới đại tràng, hoặc nội soi đại tràng để kiểm tra toàn bộ đại tràng. Các thăm khám này xác định vị trí nguồn chảy máu, và một số vấn đề, như polyp, có thể được điều trị ngay trong cùng thủ thuật.",
            ko: "소화기내과 전문의가 증상과 배변 습관을 묻고 항문 부위를 조심스럽게 진찰합니다. 나이, 병력, 진찰 소견에 따라 다음 단계로 짧고 유연한 내시경으로 직장과 대장 아랫부분을 보는 검사나, 대장 전체를 살펴보는 대장내시경 검사를 할 수 있습니다. 이러한 검사로 출혈 부위를 찾아내며, 용종 같은 일부 문제는 같은 시술 중에 바로 치료할 수 있습니다.",
            ar: "سيسألك طبيب الجهاز الهضمي عن أعراضك وعادات الأمعاء لديك ويفحص منطقة الشرج بلطف. وبحسب عمرك وتاريخك المرضي ونتائج الفحص، قد تكون الخطوة التالية فحصًا بمنظار قصير مرن لرؤية المستقيم وأسفل القولون، أو تنظيرًا للقولون لفحص القولون بأكمله. وتحدد هذه الفحوصات مصدر النزيف، ويمكن علاج بعض المشكلات، مثل السلائل، أثناء الإجراء نفسه.",
          },
        ],
      },
      {
        heading: {
          en: "Treatment",
          es: "Tratamiento",
          vi: "Điều trị",
          ko: "치료",
          ar: "العلاج",
        },
        paragraphs: [
          {
            en: "Treatment depends on the cause. Hemorrhoids often improve with more fiber, more fluids, and less straining, and persistent ones can be treated in the office with simple techniques such as rubber band ligation. Anal fissures usually heal with measures that soften the stool and prescription ointments that relax the anal muscle. Polyps are removed during colonoscopy, and other sources are treated on their own terms.",
            es: "El tratamiento depende de la causa. Las hemorroides a menudo mejoran con más fibra, más líquidos y menos esfuerzo al evacuar, y las persistentes pueden tratarse en el consultorio con técnicas sencillas como la ligadura con bandas elásticas. Las fisuras anales suelen sanar con medidas que ablandan las heces y pomadas recetadas que relajan el músculo anal. Los pólipos se extirpan durante la colonoscopia, y las demás causas se tratan según corresponda.",
            vi: "Việc điều trị tùy thuộc vào nguyên nhân. Trĩ thường cải thiện khi ăn nhiều chất xơ hơn, uống nhiều nước hơn và bớt rặn, còn trĩ dai dẳng có thể được điều trị ngay tại phòng khám bằng các kỹ thuật đơn giản như thắt bằng vòng cao su. Nứt hậu môn thường lành nhờ các biện pháp làm mềm phân và thuốc mỡ kê đơn giúp thư giãn cơ hậu môn. Polyp được cắt bỏ trong khi nội soi đại tràng, và các nguyên nhân khác được điều trị theo cách phù hợp với từng bệnh.",
            ko: "치료는 원인에 따라 다릅니다. 치핵은 식이섬유와 수분을 늘리고 힘주기를 줄이면 좋아지는 경우가 많으며, 잘 낫지 않는 치핵은 고무 밴드 결찰술 같은 간단한 방법으로 외래에서 치료할 수 있습니다. 치열은 대개 변을 부드럽게 하는 조치와 항문 근육을 이완시키는 처방 연고로 낫습니다. 용종은 대장내시경 중에 제거하고, 그 밖의 원인은 각각에 맞게 치료합니다.",
            ar: "يعتمد العلاج على السبب. فالبواسير كثيرًا ما تتحسن بمزيد من الألياف والسوائل وتقليل الشد أثناء التبرز، ويمكن علاج البواسير المستمرة في العيادة بتقنيات بسيطة مثل الربط بالأشرطة المطاطية. وتلتئم الشقوق الشرجية عادة بتدابير تليّن البراز ومراهم موصوفة تُرخي العضلة الشرجية. وتُزال السلائل أثناء تنظير القولون، وتُعالج المصادر الأخرى كل بحسب حالته.",
          },
        ],
      },
      {
        heading: {
          en: "When to talk to a gastroenterologist",
          es: "Cuándo hablar con un gastroenterólogo",
          vi: "Khi nào nên trao đổi với bác sĩ chuyên khoa tiêu hóa",
          ko: "소화기내과 전문의와 상담해야 할 때",
          ar: "متى ينبغي التحدث مع طبيب الجهاز الهضمي",
        },
        paragraphs: [
          {
            en: "Any rectal bleeding deserves a conversation with a medical professional, even when it seems minor or stops on its own. Seek care promptly if bleeding is heavy or keeps returning, if your stools turn black or tarry, or if bleeding comes with dizziness, weakness, abdominal pain, or unintended weight loss. In most cases, a clear answer brings both effective treatment and real peace of mind.",
            es: "Todo sangrado rectal merece una conversación con un profesional médico, incluso cuando parece leve o se detiene por sí solo. Busque atención pronto si el sangrado es abundante o regresa una y otra vez, si sus heces se vuelven negras o alquitranadas, o si el sangrado se acompaña de mareo, debilidad, dolor abdominal o pérdida de peso involuntaria. En la mayoría de los casos, una respuesta clara trae un tratamiento eficaz y verdadera tranquilidad.",
            vi: "Mọi trường hợp chảy máu trực tràng đều đáng để trao đổi với nhân viên y tế, ngay cả khi có vẻ nhẹ hoặc tự ngừng. Hãy đi khám sớm nếu chảy máu nhiều hoặc cứ tái diễn, nếu phân của quý vị trở nên đen hoặc như hắc ín, hoặc nếu chảy máu kèm theo chóng mặt, yếu người, đau bụng hoặc sụt cân không chủ ý. Trong hầu hết các trường hợp, một câu trả lời rõ ràng mang lại cả điều trị hiệu quả lẫn sự an tâm thật sự.",
            ko: "직장 출혈은 아무리 가벼워 보이거나 저절로 멎더라도 의료진과 상담할 가치가 있습니다. 출혈이 많거나 자꾸 반복되면, 변이 검거나 타르처럼 변하면, 또는 출혈과 함께 어지럼증, 기력 저하, 복통, 의도하지 않은 체중 감소가 나타나면 지체하지 말고 진료를 받으십시오. 대부분의 경우 명확한 답을 얻으면 효과적인 치료와 진정한 안심을 모두 얻게 됩니다.",
            ar: "أي نزيف مستقيمي يستحق حديثًا مع مختص طبي، حتى عندما يبدو بسيطًا أو يتوقف من تلقاء نفسه. اطلب الرعاية سريعًا إذا كان النزيف غزيرًا أو يعاود الظهور، أو إذا أصبح برازك أسود أو قطرانيًا، أو إذا صاحب النزيف دوخة أو ضعف أو ألم في البطن أو فقدان وزن غير مقصود. وفي معظم الحالات، تجلب الإجابة الواضحة علاجًا فعالًا وطمأنينة حقيقية معًا.",
          },
        ],
      },
    ],
  },
  {
    slug: "crohns-disease",
    legacyId: "48164",
    group: "conditions",
    title: {
      en: "Understanding Crohn's Disease",
      es: "Entienda la enfermedad de Crohn",
      vi: "Tìm hiểu bệnh Crohn",
      ko: "크론병 이해하기",
      ar: "فهم داء كرون",
    },
    summary: {
      en: "Crohn's disease is a chronic inflammatory condition of the digestive tract that alternates between flares and remission. Learn about its symptoms, how it is diagnosed, and today's treatment options.",
      es: "La enfermedad de Crohn es una condición inflamatoria crónica del tubo digestivo que alterna entre brotes y remisión. Conozca sus síntomas, cómo se diagnostica y las opciones de tratamiento actuales.",
      vi: "Bệnh Crohn là một bệnh viêm mạn tính của ống tiêu hóa, luân phiên giữa các đợt bùng phát và giai đoạn thuyên giảm. Tìm hiểu về triệu chứng, cách chẩn đoán và các lựa chọn điều trị hiện nay.",
      ko: "크론병은 악화기와 관해기가 번갈아 나타나는 소화관의 만성 염증성 질환입니다. 증상과 진단 방법, 오늘날의 치료 선택지에 대해 알아보십시오.",
      ar: "داء كرون حالة التهابية مزمنة في القناة الهضمية تتناوب بين النوبات والهدأة. تعرَّف على أعراضه وكيفية تشخيصه وخيارات العلاج المتاحة اليوم.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Crohn's disease is a chronic form of inflammatory bowel disease, or IBD, in which the immune system drives ongoing inflammation in the digestive tract. The inflammation can appear anywhere along that tract, though it most often settles where the small intestine meets the colon. It tends to affect scattered segments of bowel, leaving healthy stretches in between, and it can reach through the deeper layers of the intestinal wall.",
            es: "La enfermedad de Crohn es una forma crónica de enfermedad inflamatoria intestinal, o EII, en la que el sistema inmunitario provoca una inflamación continua en el tubo digestivo. La inflamación puede aparecer en cualquier punto de ese trayecto, aunque con mayor frecuencia se asienta donde el intestino delgado se une con el colon. Suele afectar segmentos salteados del intestino, dejando tramos sanos entre ellos, y puede penetrar las capas más profundas de la pared intestinal.",
            vi: "Bệnh Crohn là một dạng mạn tính của bệnh viêm ruột, hay IBD, trong đó hệ miễn dịch gây ra tình trạng viêm liên tục trong ống tiêu hóa. Viêm có thể xuất hiện ở bất kỳ vị trí nào dọc theo ống tiêu hóa, nhưng thường gặp nhất là nơi ruột non nối với đại tràng. Bệnh có xu hướng ảnh hưởng đến những đoạn ruột rải rác, xen giữa là các đoạn khỏe mạnh, và có thể ăn sâu qua các lớp sâu hơn của thành ruột.",
            ko: "크론병은 염증성 장질환(IBD)의 만성 형태로, 면역계가 소화관에 지속적인 염증을 일으키는 병입니다. 염증은 소화관 어디에나 생길 수 있지만, 소장과 대장이 만나는 부위에 가장 흔히 자리 잡습니다. 중간중간 건강한 구간을 남겨 두고 띄엄띄엄 떨어진 장 구간을 침범하는 경향이 있으며, 장벽의 깊은 층까지 파고들 수 있습니다.",
            ar: "داء كرون شكل مزمن من داء الأمعاء الالتهابي (IBD)، يقود فيه الجهاز المناعي التهابًا مستمرًا في القناة الهضمية. ويمكن أن يظهر الالتهاب في أي موضع على امتداد هذه القناة، وإن كان يستقر غالبًا حيث تلتقي الأمعاء الدقيقة بالقولون. ويميل إلى إصابة مقاطع متفرقة من الأمعاء تفصل بينها مقاطع سليمة، ويمكن أن يمتد عبر الطبقات الأعمق من جدار الأمعاء.",
          },
          {
            en: "Crohn's disease usually moves between active periods, called flares, and quieter periods called remission. It is a lifelong condition, but treatment has advanced steadily, and many people keep it well controlled for years at a time.",
            es: "La enfermedad de Crohn suele alternar entre períodos activos, llamados brotes, y períodos más tranquilos llamados remisión. Es una condición de por vida, pero el tratamiento ha avanzado de manera constante y muchas personas la mantienen bien controlada durante años.",
            vi: "Bệnh Crohn thường chuyển qua lại giữa các giai đoạn hoạt động, gọi là đợt bùng phát, và những giai đoạn yên ổn hơn gọi là thuyên giảm. Đây là bệnh suốt đời, nhưng việc điều trị đã tiến bộ đều đặn, và nhiều người giữ được bệnh trong tầm kiểm soát tốt suốt nhiều năm liền.",
            ko: "크론병은 보통 증상이 활발한 악화기와 비교적 잠잠한 관해기를 오가며 진행합니다. 평생 함께하는 질환이지만 치료법이 꾸준히 발전해 왔으며, 많은 분들이 한 번에 수년씩 병을 잘 조절하며 지냅니다.",
            ar: "يتنقل داء كرون عادة بين فترات نشطة تُسمى النوبات وفترات أهدأ تُسمى الهدأة. وهو حالة تدوم مدى الحياة، لكن العلاج تقدم باطراد، وكثيرون يبقونه تحت سيطرة جيدة لسنوات متواصلة.",
          },
        ],
      },
      {
        heading: {
          en: "Common symptoms",
          es: "Síntomas comunes",
          vi: "Các triệu chứng thường gặp",
          ko: "흔한 증상",
          ar: "الأعراض الشائعة",
        },
        paragraphs: [
          {
            en: "Frequent symptoms include abdominal pain or cramping, persistent diarrhea, fatigue, reduced appetite, and weight loss. Some people develop mouth sores or pain and drainage around the anus.",
            es: "Los síntomas frecuentes incluyen dolor o cólicos abdominales, diarrea persistente, fatiga, menos apetito y pérdida de peso. Algunas personas desarrollan llagas en la boca o dolor y supuración alrededor del ano.",
            vi: "Các triệu chứng hay gặp bao gồm đau bụng hoặc đau quặn bụng, tiêu chảy dai dẳng, mệt mỏi, giảm cảm giác thèm ăn và sụt cân. Một số người bị loét miệng hoặc đau và chảy dịch quanh hậu môn.",
            ko: "흔한 증상으로는 복통이나 복부 경련, 지속되는 설사, 피로, 식욕 감소, 체중 감소가 있습니다. 입안 궤양이 생기거나 항문 주위에 통증과 분비물이 생기는 분들도 있습니다.",
            ar: "تشمل الأعراض المتكررة ألمًا أو تقلصات في البطن، وإسهالًا مستمرًا، وتعبًا، وقلة شهية، وفقدان وزن. ويصاب بعض الأشخاص بقروح في الفم أو بألم وإفرازات حول فتحة الشرج.",
          },
          {
            en: "Because the inflammation runs deep, Crohn's disease can create complications over time, such as narrowed segments of intestine called strictures or abnormal connecting tunnels called fistulas. It can also cause symptoms outside the gut, including joint pain, skin problems, and eye irritation.",
            es: "Como la inflamación es profunda, la enfermedad de Crohn puede crear complicaciones con el tiempo, como segmentos estrechados del intestino llamados estenosis o túneles anormales de conexión llamados fístulas. También puede causar síntomas fuera del intestino, como dolor en las articulaciones, problemas de la piel e irritación de los ojos.",
            vi: "Vì tình trạng viêm ăn sâu, bệnh Crohn có thể tạo ra biến chứng theo thời gian, như các đoạn ruột bị hẹp gọi là chít hẹp, hoặc các đường hầm nối bất thường gọi là rò. Bệnh cũng có thể gây triệu chứng ngoài đường ruột, bao gồm đau khớp, vấn đề về da và kích ứng mắt.",
            ko: "염증이 깊이 침범하기 때문에 크론병은 시간이 지나면서 협착이라고 하는 장이 좁아진 구간이나 누공이라고 하는 비정상적인 연결 통로 같은 합병증을 만들 수 있습니다. 또한 관절 통증, 피부 문제, 눈 자극 등 장 바깥의 증상도 일으킬 수 있습니다.",
            ar: "ولأن الالتهاب يمتد عميقًا، قد يُحدث داء كرون مضاعفات مع مرور الوقت، مثل مقاطع متضيقة من الأمعاء تُسمى التضيقات أو أنفاق اتصال غير طبيعية تُسمى النواسير. وقد يسبب أيضًا أعراضًا خارج الأمعاء، منها ألم المفاصل ومشكلات الجلد وتهيج العينين.",
          },
        ],
      },
      {
        heading: {
          en: "How it is diagnosed",
          es: "Cómo se diagnostica",
          vi: "Cách chẩn đoán",
          ko: "진단 방법",
          ar: "كيفية التشخيص",
        },
        paragraphs: [
          {
            en: "No single test settles the question, so your gastroenterologist gathers evidence from several directions. Blood and stool tests look for inflammation and rule out infection. A colonoscopy with biopsies examines the colon and the end of the small intestine, while imaging studies such as CT or MRI scans show segments of small bowel that a scope cannot easily reach. Together, these results confirm the diagnosis and map where the disease is active.",
            es: "Ninguna prueba por sí sola resuelve la pregunta, así que su gastroenterólogo reúne evidencia desde varios frentes. Los análisis de sangre y de heces buscan inflamación y descartan infecciones. Una colonoscopia con biopsias examina el colon y el final del intestino delgado, mientras que estudios de imagen como la tomografía computarizada o la resonancia magnética muestran los segmentos del intestino delgado que un endoscopio no alcanza con facilidad. En conjunto, estos resultados confirman el diagnóstico y ubican dónde está activa la enfermedad.",
            vi: "Không có xét nghiệm đơn lẻ nào trả lời dứt điểm câu hỏi này, vì vậy bác sĩ chuyên khoa tiêu hóa thu thập bằng chứng từ nhiều hướng. Xét nghiệm máu và phân tìm dấu hiệu viêm và loại trừ nhiễm trùng. Nội soi đại tràng kèm sinh thiết khảo sát đại tràng và đoạn cuối ruột non, trong khi các chẩn đoán hình ảnh như chụp CT hoặc MRI cho thấy những đoạn ruột non mà ống nội soi khó tiếp cận. Kết hợp lại, các kết quả này xác nhận chẩn đoán và định vị nơi bệnh đang hoạt động.",
            ko: "단 하나의 검사로 결론이 나지 않으므로, 소화기내과 전문의는 여러 방향에서 근거를 모읍니다. 혈액검사와 대변검사로 염증을 확인하고 감염을 배제합니다. 조직검사를 포함한 대장내시경으로 대장과 소장 끝부분을 살펴보고, CT나 MRI 같은 영상 검사로 내시경이 닿기 어려운 소장 구간을 확인합니다. 이 결과들을 종합해 진단을 확정하고 병이 활동 중인 부위를 파악합니다.",
            ar: "لا يحسم فحص واحد المسألة، لذلك يجمع طبيب الجهاز الهضمي الأدلة من عدة اتجاهات. فتحاليل الدم والبراز تبحث عن الالتهاب وتستبعد العدوى. ويفحص تنظير القولون مع الخزعات القولون ونهاية الأمعاء الدقيقة، بينما تُظهر الفحوصات التصويرية مثل الأشعة المقطعية (CT) أو الرنين المغناطيسي (MRI) مقاطع الأمعاء الدقيقة التي يصعب على المنظار الوصول إليها. وتؤكد هذه النتائج مجتمعةً التشخيص وتحدد مواضع نشاط المرض.",
          },
        ],
      },
      {
        heading: {
          en: "Treatment and management",
          es: "Tratamiento y manejo",
          vi: "Điều trị và kiểm soát",
          ko: "치료 및 관리",
          ar: "العلاج والتدبير",
        },
        paragraphs: [
          {
            en: "Treatment aims to quiet the inflammation, relieve symptoms, and maintain remission. Options range from anti-inflammatory and immune-modifying medicines to biologic therapies that block specific steps in the inflammatory process. Good nutrition and regular follow-up strengthen any plan, and quitting smoking matters greatly, because smoking makes Crohn's disease harder to control.",
            es: "El tratamiento busca calmar la inflamación, aliviar los síntomas y mantener la remisión. Las opciones van desde medicamentos antiinflamatorios e inmunomoduladores hasta terapias biológicas que bloquean pasos específicos del proceso inflamatorio. Una buena nutrición y un seguimiento regular fortalecen cualquier plan, y dejar de fumar importa muchísimo, porque fumar hace que la enfermedad de Crohn sea más difícil de controlar.",
            vi: "Điều trị nhằm làm dịu tình trạng viêm, giảm triệu chứng và duy trì thuyên giảm. Các lựa chọn trải dài từ thuốc kháng viêm và thuốc điều hòa miễn dịch đến các liệu pháp sinh học chặn những bước cụ thể trong quá trình viêm. Dinh dưỡng tốt và tái khám đều đặn củng cố mọi kế hoạch điều trị, và bỏ thuốc lá đặc biệt quan trọng, vì hút thuốc khiến bệnh Crohn khó kiểm soát hơn.",
            ko: "치료의 목표는 염증을 가라앉히고 증상을 완화하며 관해를 유지하는 것입니다. 항염증제와 면역조절제부터 염증 과정의 특정 단계를 차단하는 생물학적 제제까지 다양한 선택지가 있습니다. 좋은 영양과 정기적인 추적 관찰은 어떤 치료 계획이든 든든하게 뒷받침하며, 흡연은 크론병을 조절하기 어렵게 만들기 때문에 금연이 매우 중요합니다.",
            ar: "يهدف العلاج إلى تهدئة الالتهاب وتخفيف الأعراض والحفاظ على الهدأة. وتمتد الخيارات من الأدوية المضادة للالتهاب والمعدّلة للمناعة إلى العلاجات الحيوية التي تعترض خطوات محددة في عملية الالتهاب. وتقوّي التغذية الجيدة والمتابعة المنتظمة أي خطة علاجية، والإقلاع عن التدخين مهم للغاية، لأن التدخين يجعل السيطرة على داء كرون أصعب.",
          },
          {
            en: "Some people eventually need surgery to repair a stricture or fistula or to remove a badly damaged segment of bowel. Surgery does not cure Crohn's disease, but paired with ongoing medical therapy, it can restore comfort and day-to-day function.",
            es: "Algunas personas con el tiempo necesitan cirugía para reparar una estenosis o una fístula, o para extirpar un segmento muy dañado del intestino. La cirugía no cura la enfermedad de Crohn, pero junto con el tratamiento médico continuo puede devolver la comodidad y el funcionamiento diario.",
            vi: "Một số người cuối cùng cần phẫu thuật để sửa chữa chỗ chít hẹp hoặc đường rò, hoặc cắt bỏ một đoạn ruột bị tổn thương nặng. Phẫu thuật không chữa khỏi bệnh Crohn, nhưng khi kết hợp với điều trị nội khoa liên tục, nó có thể khôi phục sự thoải mái và sinh hoạt hằng ngày.",
            ko: "일부 환자는 결국 협착이나 누공을 교정하거나 심하게 손상된 장 구간을 제거하는 수술이 필요합니다. 수술이 크론병을 완치하지는 못하지만, 지속적인 약물 치료와 함께하면 편안함과 일상 기능을 되찾는 데 도움이 될 수 있습니다.",
            ar: "يحتاج بعض الأشخاص في نهاية المطاف إلى جراحة لإصلاح تضيق أو ناسور أو لاستئصال مقطع من الأمعاء تضرر بشدة. والجراحة لا تشفي داء كرون، لكنها مع استمرار العلاج الدوائي يمكن أن تعيد الراحة والقدرة على أداء المهام اليومية.",
          },
        ],
      },
      {
        heading: {
          en: "When to talk to a gastroenterologist",
          es: "Cuándo hablar con un gastroenterólogo",
          vi: "Khi nào nên trao đổi với bác sĩ chuyên khoa tiêu hóa",
          ko: "소화기내과 전문의와 상담해야 할 때",
          ar: "متى ينبغي التحدث مع طبيب الجهاز الهضمي",
        },
        paragraphs: [
          {
            en: "See a gastroenterologist if you have persistent diarrhea, recurring abdominal pain, unexplained weight loss, or blood in your stool. If you already live with Crohn's disease, keep your care team informed about flares, new symptoms, or medication side effects. A steady partnership with your gastroenterologist is central to living well with this condition.",
            es: "Consulte a un gastroenterólogo si tiene diarrea persistente, dolor abdominal recurrente, pérdida de peso sin explicación o sangre en las heces. Si usted ya vive con la enfermedad de Crohn, mantenga informado a su equipo médico sobre los brotes, los síntomas nuevos o los efectos secundarios de los medicamentos. Una relación constante con su gastroenterólogo es clave para vivir bien con esta condición.",
            vi: "Hãy đi khám bác sĩ chuyên khoa tiêu hóa nếu quý vị bị tiêu chảy dai dẳng, đau bụng tái diễn, sụt cân không rõ nguyên nhân hoặc có máu trong phân. Nếu quý vị đã đang sống chung với bệnh Crohn, hãy thông báo cho đội ngũ chăm sóc về các đợt bùng phát, triệu chứng mới hoặc tác dụng phụ của thuốc. Mối quan hệ đồng hành bền vững với bác sĩ chuyên khoa tiêu hóa là điều cốt lõi để sống khỏe với căn bệnh này.",
            ko: "설사가 계속되거나, 복통이 반복되거나, 원인 모를 체중 감소가 있거나, 대변에 피가 섞이면 소화기내과 전문의의 진료를 받으십시오. 이미 크론병을 앓고 계시다면 악화, 새로운 증상, 약물 부작용을 의료진에게 계속 알려 주십시오. 소화기내과 전문의와의 꾸준한 협력 관계는 이 병과 함께 잘 살아가는 데 중심이 됩니다.",
            ar: "راجع طبيب الجهاز الهضمي إذا كان لديك إسهال مستمر أو ألم بطني متكرر أو فقدان وزن غير مبرر أو دم في البراز. وإذا كنت تعيش بالفعل مع داء كرون، فأبقِ فريق الرعاية على اطلاع بالنوبات أو الأعراض الجديدة أو الآثار الجانبية للأدوية. فالشراكة الثابتة مع طبيب الجهاز الهضمي أساس للعيش الجيد مع هذه الحالة.",
          },
        ],
      },
    ],
    relatedDocId: "info-crohns-disease",
  },
  {
    slug: "gerd",
    legacyId: "48165",
    group: "conditions",
    title: {
      en: "Understanding Gastroesophageal Reflux Disease",
      es: "Entienda la enfermedad por reflujo gastroesofágico",
      vi: "Tìm hiểu bệnh trào ngược dạ dày thực quản",
      ko: "위식도 역류질환 이해하기",
      ar: "فهم داء الارتجاع المعدي المريئي",
    },
    summary: {
      en: "GERD is reflux that happens often enough to cause heartburn or injure the esophagus. Learn its symptoms, when testing helps, and the habits and medicines that bring relief.",
      es: "La ERGE es el reflujo que ocurre con tanta frecuencia que causa acidez o daña el esófago. Conozca sus síntomas, cuándo ayudan las pruebas, y los hábitos y medicamentos que brindan alivio.",
      vi: "GERD là tình trạng trào ngược xảy ra thường xuyên đến mức gây ợ nóng hoặc làm tổn thương thực quản. Tìm hiểu triệu chứng, khi nào cần làm xét nghiệm, và những thói quen cùng thuốc giúp giảm nhẹ.",
      ko: "GERD는 가슴쓰림을 일으키거나 식도를 손상시킬 만큼 자주 일어나는 역류를 말합니다. 증상과 검사가 도움이 되는 경우, 그리고 완화를 가져다주는 습관과 약에 대해 알아보십시오.",
      ar: "داء الارتجاع المعدي المريئي (GERD) هو الارتجاع الذي يحدث بتكرار يكفي لإحداث حرقة المعدة أو إيذاء المريء. تعرَّف على أعراضه، ومتى تفيد الفحوصات، وعلى العادات والأدوية التي تجلب الراحة.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Gastroesophageal reflux disease, or GERD, is a condition in which stomach contents rise into the esophagus — the tube that carries food from the mouth to the stomach — often enough to cause symptoms or damage. A ring of muscle at the lower end of the esophagus normally works like a one-way door; when it weakens or relaxes at the wrong moments, acid can wash upward.",
            es: "La enfermedad por reflujo gastroesofágico, o ERGE, es una condición en la que el contenido del estómago sube hacia el esófago — el tubo que lleva los alimentos de la boca al estómago — con la frecuencia suficiente para causar síntomas o daño. Un anillo de músculo en la parte baja del esófago normalmente funciona como una puerta de un solo sentido; cuando se debilita o se relaja en momentos indebidos, el ácido puede subir.",
            vi: "Bệnh trào ngược dạ dày thực quản, hay GERD, là tình trạng các chất trong dạ dày trào lên thực quản — ống dẫn thức ăn từ miệng xuống dạ dày — thường xuyên đến mức gây ra triệu chứng hoặc tổn thương. Một vòng cơ ở đầu dưới thực quản bình thường hoạt động như cánh cửa một chiều; khi nó yếu đi hoặc giãn ra không đúng lúc, axit có thể trào ngược lên trên.",
            ko: "위식도 역류질환(GERD)은 위 내용물이 식도(입에서 위까지 음식을 나르는 관)로 올라오는 일이 증상이나 손상을 일으킬 만큼 자주 일어나는 질환입니다. 식도 아래쪽 끝의 고리 모양 근육은 평소 한쪽으로만 열리는 문처럼 작동하는데, 이 근육이 약해지거나 엉뚱한 순간에 느슨해지면 위산이 위로 올라올 수 있습니다.",
            ar: "داء الارتجاع المعدي المريئي، أو GERD، حالة تصعد فيها محتويات المعدة إلى المريء — الأنبوب الذي ينقل الطعام من الفم إلى المعدة — بتكرار يكفي لإحداث أعراض أو ضرر. فهناك حلقة عضلية في الطرف السفلي من المريء تعمل في الحالة الطبيعية كباب باتجاه واحد؛ وعندما تضعف أو ترتخي في أوقات غير مناسبة، يمكن للحمض أن يندفع إلى الأعلى.",
          },
          {
            en: "An occasional episode of heartburn after a heavy meal is common and is not the same as GERD. The diagnosis applies when reflux is frequent, persistent, or begins to irritate the lining of the esophagus.",
            es: "Un episodio ocasional de acidez después de una comida pesada es común y no es lo mismo que la ERGE. El diagnóstico corresponde cuando el reflujo es frecuente, persistente o comienza a irritar el revestimiento del esófago.",
            vi: "Thỉnh thoảng bị ợ nóng sau một bữa ăn thịnh soạn là chuyện thường gặp và không giống với GERD. Chẩn đoán này chỉ đặt ra khi trào ngược xảy ra thường xuyên, dai dẳng, hoặc bắt đầu gây kích ứng niêm mạc thực quản.",
            ko: "푸짐한 식사 뒤에 가끔 가슴쓰림이 생기는 것은 흔한 일이며 GERD와는 다릅니다. 역류가 잦거나 지속되거나 식도 점막을 자극하기 시작할 때 GERD로 진단합니다.",
            ar: "حدوث حرقة المعدة أحيانًا بعد وجبة دسمة أمر شائع وليس هو نفسه داء الارتجاع المعدي المريئي. فالتشخيص ينطبق عندما يكون الارتجاع متكررًا أو مستمرًا أو يبدأ في تهييج بطانة المريء.",
          },
        ],
      },
      {
        heading: {
          en: "Common symptoms",
          es: "Síntomas comunes",
          vi: "Các triệu chứng thường gặp",
          ko: "흔한 증상",
          ar: "الأعراض الشائعة",
        },
        paragraphs: [
          {
            en: "Heartburn, a burning sensation behind the breastbone, is the most recognizable symptom, along with regurgitation, the feeling of sour liquid or food rising into the throat or mouth. Symptoms are often worse after meals, when bending over, or when lying down at night.",
            es: "La acidez, una sensación de ardor detrás del esternón, es el síntoma más reconocible, junto con la regurgitación, la sensación de líquido agrio o comida que sube hacia la garganta o la boca. Los síntomas suelen empeorar después de las comidas, al inclinarse o al acostarse por la noche.",
            vi: "Ợ nóng, cảm giác nóng rát sau xương ức, là triệu chứng dễ nhận biết nhất, cùng với ợ trớ, cảm giác dịch chua hoặc thức ăn trào lên cổ họng hoặc miệng. Triệu chứng thường nặng hơn sau bữa ăn, khi cúi người, hoặc khi nằm vào ban đêm.",
            ko: "가장 알아차리기 쉬운 증상은 가슴뼈 뒤가 타는 듯한 가슴쓰림이며, 신물이나 음식물이 목이나 입으로 올라오는 느낌인 역류 증상도 함께 나타납니다. 증상은 식사 후, 몸을 숙일 때, 밤에 누울 때 심해지는 경우가 많습니다.",
            ar: "حرقة المعدة، وهي إحساس بالحرقان خلف عظمة الصدر، أكثر الأعراض تميزًا، إلى جانب القلس، وهو الإحساس بصعود سائل حامض أو طعام إلى الحلق أو الفم. وكثيرًا ما تسوء الأعراض بعد الوجبات، أو عند الانحناء، أو عند الاستلقاء ليلًا.",
          },
          {
            en: "GERD can also appear in less obvious ways, including a lingering cough, hoarseness, a sore throat in the morning, trouble swallowing, or the sensation of a lump in the throat.",
            es: "La ERGE también puede manifestarse de maneras menos evidentes, como una tos que no cede, ronquera, dolor de garganta por la mañana, dificultad para tragar o la sensación de un nudo en la garganta.",
            vi: "GERD cũng có thể biểu hiện theo những cách kín đáo hơn, bao gồm ho dai dẳng, khàn tiếng, đau họng vào buổi sáng, khó nuốt, hoặc cảm giác có khối vướng trong cổ họng.",
            ko: "GERD는 잘 낫지 않는 기침, 쉰 목소리, 아침의 목 통증, 삼킴 곤란, 목에 무언가 걸린 듯한 느낌처럼 덜 뚜렷한 방식으로 나타나기도 합니다.",
            ar: "وقد يظهر داء الارتجاع المعدي المريئي أيضًا بطرق أقل وضوحًا، منها سعال لا يزول، وبحّة في الصوت، والتهاب حلق في الصباح، وصعوبة في البلع، أو الإحساس بكتلة في الحلق.",
          },
        ],
      },
      {
        heading: {
          en: "How it is diagnosed",
          es: "Cómo se diagnostica",
          vi: "Cách chẩn đoán",
          ko: "진단 방법",
          ar: "كيفية التشخيص",
        },
        paragraphs: [
          {
            en: "When symptoms are typical, your gastroenterologist may begin with lifestyle changes and acid-reducing medicine, and a good response helps support the diagnosis. If symptoms persist, keep returning, or include warning signs, an upper endoscopy allows the doctor to look directly at the esophagus and check for irritation or other changes. Specialized tests that measure acid exposure or esophageal muscle function are available when the picture is less clear.",
            es: "Cuando los síntomas son típicos, su gastroenterólogo puede comenzar con cambios de estilo de vida y medicamentos que reducen el ácido, y una buena respuesta ayuda a respaldar el diagnóstico. Si los síntomas persisten, regresan una y otra vez o incluyen señales de alerta, una endoscopia superior permite al médico observar directamente el esófago y buscar irritación u otros cambios. Cuando el cuadro es menos claro, existen pruebas especializadas que miden la exposición al ácido o la función muscular del esófago.",
            vi: "Khi triệu chứng điển hình, bác sĩ chuyên khoa tiêu hóa có thể bắt đầu bằng thay đổi lối sống và thuốc giảm axit, và đáp ứng tốt với điều trị giúp củng cố chẩn đoán. Nếu triệu chứng kéo dài, cứ tái diễn, hoặc kèm các dấu hiệu cảnh báo, nội soi đường tiêu hóa trên cho phép bác sĩ quan sát trực tiếp thực quản và kiểm tra tình trạng kích ứng hoặc các thay đổi khác. Khi bệnh cảnh chưa rõ ràng, còn có các xét nghiệm chuyên sâu đo mức tiếp xúc axit hoặc chức năng cơ thực quản.",
            ko: "증상이 전형적일 때는 소화기내과 전문의가 생활 습관 개선과 위산 억제제로 치료를 시작할 수 있으며, 반응이 좋으면 진단을 뒷받침하는 근거가 됩니다. 증상이 지속되거나 자꾸 재발하거나 경고 신호가 동반되면, 상부 내시경으로 식도를 직접 보고 자극이나 다른 변화가 있는지 확인할 수 있습니다. 상황이 분명하지 않을 때는 위산 노출이나 식도 근육 기능을 측정하는 특수 검사도 할 수 있습니다.",
            ar: "عندما تكون الأعراض نموذجية، قد يبدأ طبيب الجهاز الهضمي بتغييرات في نمط الحياة ودواء مخفض للحمض، والاستجابة الجيدة تدعم التشخيص. وإذا استمرت الأعراض أو ظلت تعود أو تضمنت علامات تحذيرية، فإن التنظير العلوي يتيح للطبيب النظر مباشرة إلى المريء والتحقق من وجود تهيج أو تغيرات أخرى. وتتوفر فحوصات متخصصة تقيس التعرض للحمض أو وظيفة عضلات المريء عندما تكون الصورة أقل وضوحًا.",
          },
        ],
      },
      {
        heading: {
          en: "Treatment and management",
          es: "Tratamiento y manejo",
          vi: "Điều trị và kiểm soát",
          ko: "치료 및 관리",
          ar: "العلاج والتدبير",
        },
        paragraphs: [
          {
            en: "Daily habits make a real difference: eating smaller meals, finishing dinner a few hours before bedtime, raising the head of the bed, limiting personal trigger foods such as fried dishes, alcohol, and caffeine, reaching a healthy weight, and not smoking.",
            es: "Los hábitos diarios marcan una diferencia real: comer porciones más pequeñas, cenar unas horas antes de acostarse, elevar la cabecera de la cama, limitar los alimentos que le provocan síntomas — como frituras, alcohol y cafeína —, alcanzar un peso saludable y no fumar.",
            vi: "Thói quen hằng ngày tạo ra khác biệt thật sự: ăn bữa nhỏ hơn, ăn tối xong vài giờ trước khi đi ngủ, nâng cao đầu giường, hạn chế những thức ăn dễ gây triệu chứng cho riêng mình — như đồ chiên, rượu bia và caffeine —, đạt cân nặng hợp lý và không hút thuốc.",
            ko: "일상 습관이 실제로 큰 차이를 만듭니다. 식사량을 줄이고, 잠자리에 들기 몇 시간 전에 저녁 식사를 마치고, 침대 머리 쪽을 높이고, 튀긴 음식, 술, 카페인처럼 자신에게 증상을 일으키는 음식을 줄이고, 건강한 체중에 도달하고, 담배를 피우지 않는 것입니다.",
            ar: "العادات اليومية تُحدث فرقًا حقيقيًا: تناول وجبات أصغر، وإنهاء العشاء قبل النوم ببضع ساعات، ورفع رأس السرير، والإقلال من الأطعمة التي تحفز الأعراض لديك مثل المقليات والكحول والكافيين، والوصول إلى وزن صحي، والامتناع عن التدخين.",
          },
          {
            en: "Acid-reducing medicines relieve symptoms for many people and come in several families and strengths. Long-standing or hard-to-control GERD deserves specialist follow-up, because years of acid exposure can change the lining of the esophagus — a condition called Barrett's esophagus that calls for periodic monitoring. For carefully selected patients, procedures that reinforce the reflux barrier are also an option.",
            es: "Los medicamentos que reducen el ácido alivian los síntomas de muchas personas y existen en varias familias y concentraciones. La ERGE de larga duración o difícil de controlar merece seguimiento con un especialista, porque años de exposición al ácido pueden cambiar el revestimiento del esófago — una condición llamada esófago de Barrett que requiere vigilancia periódica. Para pacientes cuidadosamente seleccionados, los procedimientos que refuerzan la barrera antirreflujo también son una opción.",
            vi: "Thuốc giảm axit giúp giảm triệu chứng cho nhiều người và có nhiều nhóm với nhiều hàm lượng khác nhau. GERD kéo dài hoặc khó kiểm soát cần được bác sĩ chuyên khoa theo dõi, vì nhiều năm tiếp xúc với axit có thể làm biến đổi niêm mạc thực quản — tình trạng gọi là thực quản Barrett, cần theo dõi định kỳ. Với những bệnh nhân được chọn lọc kỹ, các thủ thuật gia cố hàng rào chống trào ngược cũng là một lựa chọn.",
            ko: "위산 억제제는 많은 분들의 증상을 덜어 주며 여러 계열과 용량이 있습니다. 오래되었거나 조절이 어려운 GERD는 전문의의 추적 관찰이 필요합니다. 여러 해에 걸친 위산 노출은 식도 점막을 변화시킬 수 있는데, 이를 바렛식도라고 하며 주기적인 관찰이 필요합니다. 신중하게 선별된 환자에게는 역류 방지 장벽을 보강하는 시술도 선택지가 됩니다.",
            ar: "تخفف الأدوية المخفضة للحمض الأعراض لدى كثير من الناس، وهي متوفرة بعدة عائلات وتركيزات. وداء الارتجاع الطويل الأمد أو الصعب السيطرة عليه يستحق متابعة اختصاصي، لأن سنوات من التعرض للحمض قد تغيّر بطانة المريء — وهي حالة تُسمى مريء باريت وتستدعي مراقبة دورية. وبالنسبة لمرضى يُختارون بعناية، تكون الإجراءات التي تقوّي حاجز مقاومة الارتجاع خيارًا أيضًا.",
          },
        ],
      },
      {
        heading: {
          en: "When to talk to a gastroenterologist",
          es: "Cuándo hablar con un gastroenterólogo",
          vi: "Khi nào nên trao đổi với bác sĩ chuyên khoa tiêu hóa",
          ko: "소화기내과 전문의와 상담해야 할 때",
          ar: "متى ينبغي التحدث مع طبيب الجهاز الهضمي",
        },
        paragraphs: [
          {
            en: "Talk to a gastroenterologist if heartburn happens more than a couple of times a week, returns whenever medicine stops, or has gone on for years without a fresh look. Seek care promptly for trouble swallowing, food getting stuck, repeated vomiting, black stools, or unintended weight loss. Chest pain should always be evaluated urgently to rule out heart problems first.",
            es: "Hable con un gastroenterólogo si la acidez ocurre más de un par de veces por semana, regresa cada vez que suspende el medicamento o lleva años sin una nueva evaluación. Busque atención pronto si tiene dificultad para tragar, comida que se atora, vómitos repetidos, heces negras o pérdida de peso involuntaria. El dolor de pecho siempre debe evaluarse con urgencia para descartar primero un problema del corazón.",
            vi: "Hãy trao đổi với bác sĩ chuyên khoa tiêu hóa nếu ợ nóng xảy ra hơn vài lần mỗi tuần, quay lại mỗi khi ngừng thuốc, hoặc đã kéo dài nhiều năm mà chưa được đánh giá lại. Hãy đi khám sớm nếu khó nuốt, thức ăn bị mắc nghẹn, nôn nhiều lần, phân đen, hoặc sụt cân không chủ ý. Đau ngực luôn cần được đánh giá khẩn cấp để loại trừ vấn đề tim mạch trước tiên.",
            ko: "가슴쓰림이 일주일에 두어 번 이상 생기거나, 약을 끊을 때마다 재발하거나, 새로 검사받지 않은 채 여러 해 계속되었다면 소화기내과 전문의와 상담하십시오. 삼키기 어렵거나, 음식이 걸리거나, 구토가 반복되거나, 변이 검게 나오거나, 의도하지 않게 체중이 줄면 지체하지 말고 진료를 받으십시오. 가슴 통증은 심장 문제를 먼저 배제하기 위해 항상 긴급하게 평가받아야 합니다.",
            ar: "تحدث مع طبيب الجهاز الهضمي إذا كانت حرقة المعدة تحدث أكثر من مرتين في الأسبوع، أو تعود كلما توقف الدواء، أو استمرت لسنوات من دون تقييم جديد. واطلب الرعاية سريعًا عند صعوبة البلع، أو انحشار الطعام، أو القيء المتكرر، أو البراز الأسود، أو فقدان الوزن غير المقصود. أما ألم الصدر فيجب تقييمه دائمًا على وجه السرعة لاستبعاد مشكلات القلب أولًا.",
          },
        ],
      },
    ],
    relatedDocId: "info-gerd",
  },
];
