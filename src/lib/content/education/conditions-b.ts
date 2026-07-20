// Patient-education topics, batch B: condition pages whose old printable
// "disease information sheets" were dead PDFs on the previous site. These are
// ORIGINAL plain-language articles written from standard medical knowledge
// (no captured source bodies existed). Each topic pairs with its printable
// sheet slot in lib/documents.ts via relatedDocId. Spanish is a faithful
// translation of the English in a neutral "usted" register; Spanish and the
// VI/KO/AR machine translations still await native-speaker review.

import type { EducationTopic } from "../types";

export const conditionsB: EducationTopic[] = [
  {
    slug: "abdominal-pain",
    group: "conditions",
    title: {
      en: "Abdominal Pain",
      es: "Dolor abdominal",
      vi: "Đau bụng",
      ko: "복통",
      ar: "ألم البطن",
    },
    summary: {
      en: "Abdominal pain is one of the most common reasons patients see a gastroenterologist. Learn what different patterns of pain can mean, how the cause is found, and which warning signs need prompt attention.",
      es: "El dolor abdominal es uno de los motivos más comunes de consulta con un gastroenterólogo. Conozca qué pueden significar los distintos patrones de dolor, cómo se identifica la causa y qué señales de alerta requieren atención inmediata.",
      vi: "Đau bụng là một trong những lý do phổ biến nhất khiến bệnh nhân đến gặp bác sĩ chuyên khoa tiêu hóa. Tìm hiểu các kiểu đau khác nhau có thể có ý nghĩa gì, cách tìm ra nguyên nhân và những dấu hiệu cảnh báo nào cần được chú ý kịp thời.",
      ko: "복통은 환자가 소화기내과 전문의를 찾는 가장 흔한 이유 중 하나입니다. 여러 가지 통증 양상이 무엇을 의미할 수 있는지, 원인을 어떻게 찾는지, 어떤 경고 신호에 신속한 대처가 필요한지 알아보십시오.",
      ar: "ألم البطن من أكثر الأسباب شيوعًا لزيارة طبيب الجهاز الهضمي. تعرَّف على ما يمكن أن تعنيه أنماط الألم المختلفة، وكيفية تحديد السبب، والعلامات التحذيرية التي تستدعي اهتمامًا عاجلًا.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Abdominal pain is pain or discomfort felt anywhere between the chest and the groin. Nearly everyone experiences it from time to time, and most episodes pass on their own. Pain that is severe, keeps returning, or comes with other symptoms can be a sign of a digestive condition that deserves a closer look.",
            es: "El dolor abdominal es el dolor o malestar que se siente en cualquier punto entre el pecho y la ingle. Casi todas las personas lo experimentan de vez en cuando, y la mayoría de los episodios pasan por sí solos. Un dolor intenso, que reaparece con frecuencia o que se acompaña de otros síntomas puede ser señal de una condición digestiva que merece una evaluación más detallada.",
            vi: "Đau bụng là cảm giác đau hoặc khó chịu ở bất kỳ vị trí nào giữa ngực và bẹn. Hầu như ai cũng thỉnh thoảng gặp phải, và phần lớn các cơn đau tự khỏi. Cơn đau dữ dội, tái đi tái lại hoặc kèm theo các triệu chứng khác có thể là dấu hiệu của một bệnh lý tiêu hóa cần được xem xét kỹ hơn.",
            ko: "복통은 가슴과 사타구니 사이 어느 부위에서든 느껴지는 통증이나 불편감을 말합니다. 거의 모든 사람이 때때로 복통을 겪으며, 대부분은 저절로 가라앉습니다. 그러나 통증이 심하거나, 계속 재발하거나, 다른 증상을 동반한다면 자세한 검사가 필요한 소화기 질환의 신호일 수 있습니다.",
            ar: "ألم البطن هو ألم أو انزعاج يُشعر به في أي موضع بين الصدر والأربية (أعلى الفخذ). يعاني منه الجميع تقريبًا من حين لآخر، وتزول معظم النوبات من تلقاء نفسها. أما الألم الشديد، أو الذي يعاود الظهور باستمرار، أو الذي تصاحبه أعراض أخرى، فقد يكون علامة على حالة هضمية تستحق فحصًا أدق.",
          },
          {
            en: "Many organs share this part of the body, including the stomach, intestines, gallbladder, pancreas, and liver. That is why finding the cause of abdominal pain takes a careful, step-by-step approach.",
            es: "Muchos órganos comparten esta parte del cuerpo, entre ellos el estómago, los intestinos, la vesícula biliar, el páncreas y el hígado. Por eso, encontrar la causa del dolor abdominal requiere un proceso cuidadoso, paso a paso.",
            vi: "Nhiều cơ quan cùng nằm trong vùng này của cơ thể, bao gồm dạ dày, ruột, túi mật, tụy và gan. Vì vậy, việc tìm ra nguyên nhân gây đau bụng đòi hỏi một quy trình thăm khám cẩn thận, từng bước một.",
            ko: "이 부위에는 위, 장, 담낭, 췌장, 간 등 여러 장기가 자리하고 있습니다. 그렇기 때문에 복통의 원인을 찾으려면 신중하고 단계적인 접근이 필요합니다.",
            ar: "تتشارك أعضاء كثيرة هذا الجزء من الجسم، منها المعدة والأمعاء والمرارة والبنكرياس والكبد. ولهذا يتطلب تحديد سبب ألم البطن نهجًا دقيقًا متدرجًا خطوة بخطوة.",
          },
        ],
      },
      {
        heading: {
          en: "Common patterns and symptoms",
          es: "Patrones y síntomas comunes",
          vi: "Các kiểu đau và triệu chứng thường gặp",
          ko: "흔한 통증 양상과 증상",
          ar: "الأنماط والأعراض الشائعة",
        },
        paragraphs: [
          {
            en: "The way pain feels often offers clues. Cramping that comes in waves may be related to gas, intestinal spasm, or a blockage. Burning in the upper abdomen can point to acid irritation or an ulcer, while pain under the right ribs after a rich meal may involve the gallbladder.",
            es: "La forma en que se siente el dolor suele dar pistas. Los cólicos que vienen en oleadas pueden estar relacionados con gases, espasmos intestinales o una obstrucción. El ardor en la parte superior del abdomen puede indicar irritación por ácido o una úlcera, mientras que el dolor debajo de las costillas derechas después de una comida abundante puede estar relacionado con la vesícula biliar.",
            vi: "Cách cơn đau biểu hiện thường cho ta manh mối. Đau quặn từng cơn có thể liên quan đến hơi trong ruột, co thắt ruột hoặc tắc nghẽn. Cảm giác nóng rát ở vùng bụng trên có thể là dấu hiệu kích ứng do axit hoặc loét, trong khi đau dưới sườn phải sau bữa ăn nhiều dầu mỡ có thể liên quan đến túi mật.",
            ko: "통증의 느낌은 종종 단서가 됩니다. 물결처럼 밀려오는 쥐어짜는 통증은 가스, 장 경련 또는 폐색과 관련이 있을 수 있습니다. 윗배의 화끈거림은 위산 자극이나 궤양을 시사할 수 있으며, 기름진 식사 후 오른쪽 갈비뼈 아래의 통증은 담낭과 관련이 있을 수 있습니다.",
            ar: "غالبًا ما تقدم طبيعة الألم دلائل مفيدة. فالمغص الذي يأتي على شكل موجات قد يرتبط بالغازات أو تشنج الأمعاء أو انسدادها. والحرقة في أعلى البطن قد تشير إلى تهيّج بفعل الحمض أو إلى قرحة، بينما قد يكون الألم تحت الأضلاع اليمنى بعد وجبة دسمة مرتبطًا بالمرارة.",
          },
          {
            en: "Along with the pain itself, pay attention to bloating, changes in bowel habits, nausea, fever, or unintended weight loss. Mentioning these details at your visit helps your care team narrow the search.",
            es: "Además del dolor, preste atención a la hinchazón, los cambios en el hábito intestinal, las náuseas, la fiebre o la pérdida de peso involuntaria. Mencionar estos detalles en su consulta ayuda a su equipo de atención a orientar la búsqueda.",
            vi: "Ngoài cơn đau, quý vị cũng nên chú ý đến tình trạng chướng bụng, thay đổi thói quen đi tiêu, buồn nôn, sốt hoặc sụt cân không chủ ý. Nêu rõ những chi tiết này trong buổi khám sẽ giúp đội ngũ chăm sóc thu hẹp phạm vi tìm kiếm nguyên nhân.",
            ko: "통증 자체와 더불어 복부 팽만감, 배변 습관의 변화, 메스꺼움, 발열, 의도하지 않은 체중 감소에도 주의를 기울이십시오. 진료 시 이러한 세부 사항을 알려 주시면 의료진이 원인을 좁혀 가는 데 도움이 됩니다.",
            ar: "وإلى جانب الألم نفسه، انتبه إلى الانتفاخ، وتغيّر عادات التبرز، والغثيان، والحمى، وفقدان الوزن غير المقصود. إن ذكر هذه التفاصيل أثناء زيارتك يساعد فريق الرعاية على حصر نطاق البحث.",
          },
        ],
      },
      {
        heading: {
          en: "How abdominal pain is evaluated",
          es: "Cómo se evalúa el dolor abdominal",
          vi: "Đánh giá đau bụng bằng cách nào",
          ko: "복통은 어떻게 진찰하는가",
          ar: "كيف يُقيَّم ألم البطن",
        },
        paragraphs: [
          {
            en: "Your gastroenterologist will start by asking detailed questions about where the pain is, when it happens, and what makes it better or worse, followed by a physical examination. Depending on the findings, testing may include blood work, stool studies, or imaging such as an ultrasound or CT scan. In some situations, an upper endoscopy or a colonoscopy is recommended to look directly at the lining of the digestive tract.",
            es: "Su gastroenterólogo comenzará con preguntas detalladas sobre dónde se localiza el dolor, cuándo aparece y qué lo mejora o lo empeora, seguidas de un examen físico. Según los hallazgos, las pruebas pueden incluir análisis de sangre, estudios de heces o imágenes como una ecografía o una tomografía computarizada. En algunos casos se recomienda una endoscopia superior o una colonoscopia para observar directamente el revestimiento del tubo digestivo.",
            vi: "Bác sĩ chuyên khoa tiêu hóa sẽ bắt đầu bằng những câu hỏi chi tiết về vị trí đau, thời điểm đau và điều gì làm cơn đau dịu đi hay nặng thêm, sau đó là khám lâm sàng. Tùy theo kết quả, các xét nghiệm có thể bao gồm xét nghiệm máu, xét nghiệm phân, hoặc chẩn đoán hình ảnh như siêu âm hay chụp CT. Trong một số trường hợp, bác sĩ sẽ đề nghị nội soi đường tiêu hóa trên hoặc nội soi đại tràng để quan sát trực tiếp niêm mạc ống tiêu hóa.",
            ko: "소화기내과 전문의는 먼저 통증의 위치, 발생 시점, 통증을 완화하거나 악화시키는 요인에 대해 자세히 질문한 뒤 신체 진찰을 진행합니다. 소견에 따라 혈액 검사, 대변 검사, 초음파나 CT 촬영 같은 영상 검사를 시행할 수 있습니다. 경우에 따라 소화관 내벽을 직접 관찰하기 위해 상부 내시경이나 대장내시경 검사를 권장하기도 합니다.",
            ar: "سيبدأ طبيب الجهاز الهضمي بطرح أسئلة مفصلة عن موضع الألم ووقت حدوثه وما يخففه أو يزيده، يلي ذلك فحص سريري. وبحسب النتائج، قد تشمل الفحوصات تحاليل الدم أو دراسات البراز أو التصوير مثل الموجات فوق الصوتية أو الأشعة المقطعية. وفي بعض الحالات يُوصى بتنظير علوي أو تنظير للقولون لفحص بطانة القناة الهضمية مباشرة.",
          },
        ],
      },
      {
        heading: {
          en: "General approaches to treatment",
          es: "Enfoques generales de tratamiento",
          vi: "Các hướng điều trị chung",
          ko: "일반적인 치료 방향",
          ar: "التوجهات العامة للعلاج",
        },
        paragraphs: [
          {
            en: "Treatment is directed at the underlying cause rather than at the pain alone. That may mean adjusting the diet, treating acid or an infection, relieving constipation, or calming an irritable bowel. Many causes of abdominal pain improve considerably once they are identified and treated correctly.",
            es: "El tratamiento se dirige a la causa de fondo y no solo al dolor. Eso puede significar ajustar la alimentación, tratar el exceso de ácido o una infección, aliviar el estreñimiento o calmar un intestino irritable. Muchas causas de dolor abdominal mejoran considerablemente una vez que se identifican y se tratan de manera adecuada.",
            vi: "Việc điều trị nhắm vào nguyên nhân gốc rễ chứ không chỉ vào cơn đau. Điều đó có thể là điều chỉnh chế độ ăn, điều trị dư axit hoặc nhiễm trùng, giảm táo bón, hoặc làm dịu hội chứng ruột kích thích. Nhiều nguyên nhân gây đau bụng cải thiện đáng kể một khi được xác định và điều trị đúng cách.",
            ko: "치료는 통증 자체가 아니라 근본 원인을 겨냥합니다. 식단을 조정하거나, 위산 과다나 감염을 치료하거나, 변비를 해소하거나, 과민해진 장을 진정시키는 것이 이에 해당할 수 있습니다. 복통의 원인 중 상당수는 정확히 밝혀 알맞게 치료하면 크게 호전됩니다.",
            ar: "يوجَّه العلاج إلى السبب الكامن وليس إلى الألم وحده. وقد يعني ذلك تعديل النظام الغذائي، أو علاج زيادة الحمض أو عدوى، أو تخفيف الإمساك، أو تهدئة القولون المتهيج. وكثير من أسباب ألم البطن تتحسن تحسنًا ملحوظًا متى حُددت وعولجت على النحو الصحيح.",
          },
        ],
      },
      {
        heading: {
          en: "When to contact a gastroenterologist",
          es: "Cuándo consultar a un gastroenterólogo",
          vi: "Khi nào cần đến gặp bác sĩ chuyên khoa tiêu hóa",
          ko: "소화기내과 전문의와 상담해야 할 때",
          ar: "متى تراجع طبيب الجهاز الهضمي",
        },
        paragraphs: [
          {
            en: "Seek medical care right away for sudden, severe pain, pain with fever or repeated vomiting, a rigid or swollen abdomen, or blood in vomit or stool. Make an appointment if pain lasts more than a few days, keeps coming back, wakes you from sleep, or arrives with weight loss or a change in bowel habits.",
            es: "Busque atención médica de inmediato si el dolor es repentino e intenso, si se acompaña de fiebre o vómitos repetidos, si el abdomen está rígido o hinchado, o si hay sangre en el vómito o en las heces. Haga una cita si el dolor dura más de unos días, reaparece con frecuencia, lo despierta por la noche o se presenta junto con pérdida de peso o cambios en el hábito intestinal.",
            vi: "Hãy đi khám ngay nếu cơn đau xuất hiện đột ngột và dữ dội, đau kèm sốt hoặc nôn nhiều lần, bụng cứng hoặc trướng, hoặc có máu trong chất nôn hay trong phân. Hãy đặt lịch khám nếu cơn đau kéo dài hơn vài ngày, tái đi tái lại, làm quý vị thức giấc ban đêm, hoặc đi kèm sụt cân hay thay đổi thói quen đi tiêu.",
            ko: "갑작스럽고 심한 통증, 발열이나 반복적인 구토를 동반한 통증, 복부가 딱딱해지거나 부풀어 오른 경우, 구토물이나 대변에 피가 섞인 경우에는 즉시 진료를 받으십시오. 통증이 며칠 이상 지속되거나, 계속 재발하거나, 잠에서 깰 정도이거나, 체중 감소나 배변 습관 변화를 동반하면 진료 예약을 하시기 바랍니다.",
            ar: "اطلب الرعاية الطبية فورًا عند ألم مفاجئ شديد، أو ألم مصحوب بحمى أو قيء متكرر، أو تصلب البطن أو انتفاخه، أو وجود دم في القيء أو البراز. وحدد موعدًا إذا استمر الألم أكثر من بضعة أيام، أو ظل يعاود الظهور، أو أيقظك من النوم، أو ترافق مع فقدان وزن أو تغيّر في عادات التبرز.",
          },
        ],
      },
    ],
    relatedDocId: "info-abdominal-pain",
  },
  {
    slug: "barretts-esophagus",
    group: "conditions",
    title: {
      en: "Barrett's Esophagus",
      es: "Esófago de Barrett",
      vi: "Thực quản Barrett",
      ko: "바렛 식도(Barrett 식도)",
      ar: "مريء باريت (Barrett)",
    },
    summary: {
      en: "Barrett's esophagus is a change in the lining of the esophagus that can follow years of acid reflux. Learn why it matters, how it is found, and how it is monitored over time.",
      es: "El esófago de Barrett es un cambio en el revestimiento del esófago que puede aparecer tras años de reflujo ácido. Conozca por qué es importante, cómo se detecta y cómo se vigila con el tiempo.",
      vi: "Thực quản Barrett là sự biến đổi của lớp niêm mạc thực quản, có thể xuất hiện sau nhiều năm bị trào ngược axit. Tìm hiểu vì sao tình trạng này quan trọng, cách phát hiện và cách theo dõi theo thời gian.",
      ko: "바렛 식도는 수년간의 위산 역류 후에 생길 수 있는 식도 내벽의 변화입니다. 이 질환이 왜 중요한지, 어떻게 발견하는지, 시간을 두고 어떻게 관찰하는지 알아보십시오.",
      ar: "مريء باريت هو تغيّر في بطانة المريء قد يحدث بعد سنوات من ارتجاع الحمض. تعرَّف على سبب أهميته، وكيفية اكتشافه، وكيفية مراقبته مع مرور الوقت.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Barrett's esophagus is a condition in which the lining of the lower esophagus — the tube that carries food from the mouth to the stomach — changes to resemble the lining of the intestine. It usually develops after years of gastroesophageal reflux disease (GERD), when stomach acid repeatedly irritates the esophagus.",
            es: "El esófago de Barrett es una condición en la que el revestimiento de la parte baja del esófago — el tubo que lleva los alimentos de la boca al estómago — cambia y se vuelve parecido al revestimiento del intestino. Suele desarrollarse tras años de enfermedad por reflujo gastroesofágico (ERGE), cuando el ácido del estómago irrita el esófago una y otra vez.",
            vi: "Thực quản Barrett là tình trạng lớp niêm mạc ở phần dưới thực quản — ống dẫn thức ăn từ miệng xuống dạ dày — biến đổi trở nên giống với niêm mạc ruột. Tình trạng này thường phát triển sau nhiều năm mắc bệnh trào ngược dạ dày–thực quản (GERD), khi axit dạ dày kích thích thực quản lặp đi lặp lại.",
            ko: "바렛 식도는 식도 아랫부분 — 입에서 위까지 음식을 운반하는 관 — 의 내벽이 장 점막과 비슷하게 변하는 질환입니다. 대개 위식도 역류질환(GERD)을 여러 해 앓는 동안 위산이 식도를 반복적으로 자극하면서 생깁니다.",
            ar: "مريء باريت حالة تتغيّر فيها بطانة الجزء السفلي من المريء — الأنبوب الذي ينقل الطعام من الفم إلى المعدة — لتصبح شبيهة ببطانة الأمعاء. وعادةً ما تتطور بعد سنوات من داء الارتجاع المعدي المريئي (GERD)، حين يهيّج حمضُ المعدة المريءَ مرارًا وتكرارًا.",
          },
          {
            en: "Barrett's esophagus is not cancer, and most people who have it never develop cancer. It does, however, somewhat increase the risk of a cancer of the esophagus, which is why doctors keep an eye on it over time.",
            es: "El esófago de Barrett no es cáncer, y la mayoría de las personas que lo tienen nunca desarrollan cáncer. Sin embargo, aumenta en cierta medida el riesgo de un cáncer de esófago, y por eso los médicos lo vigilan a lo largo del tiempo.",
            vi: "Thực quản Barrett không phải là ung thư, và hầu hết những người mắc bệnh này không bao giờ bị ung thư. Tuy nhiên, tình trạng này làm tăng phần nào nguy cơ ung thư thực quản, và đó là lý do các bác sĩ theo dõi nó theo thời gian.",
            ko: "바렛 식도는 암이 아니며, 이 질환이 있는 대부분의 사람은 평생 암에 걸리지 않습니다. 다만 식도암의 위험을 어느 정도 높이기 때문에 의사들이 시간을 두고 관찰합니다.",
            ar: "مريء باريت ليس سرطانًا، ومعظم المصابين به لا يصابون بالسرطان أبدًا. غير أنه يزيد إلى حد ما خطر الإصابة بسرطان المريء، ولهذا يحرص الأطباء على مراقبته مع مرور الوقت.",
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
            en: "Barrett's esophagus does not cause symptoms of its own. Most people learn they have it during an evaluation for long-standing reflux symptoms such as heartburn, regurgitation of food or sour liquid, difficulty swallowing, or chest discomfort. Some people with Barrett's esophagus have never had noticeable heartburn at all.",
            es: "El esófago de Barrett no causa síntomas por sí mismo. La mayoría de las personas lo descubren durante una evaluación por síntomas de reflujo de larga data, como acidez (agruras), regurgitación de comida o líquido agrio, dificultad para tragar o molestias en el pecho. Algunas personas con esófago de Barrett nunca han tenido acidez notable.",
            vi: "Thực quản Barrett tự nó không gây ra triệu chứng. Hầu hết mọi người phát hiện bệnh khi đi khám vì các triệu chứng trào ngược kéo dài như ợ nóng, trớ thức ăn hoặc dịch chua, khó nuốt, hoặc khó chịu ở ngực. Một số người mắc thực quản Barrett thậm chí chưa bao giờ bị ợ nóng rõ rệt.",
            ko: "바렛 식도 자체는 증상을 일으키지 않습니다. 대부분은 속쓰림, 음식물이나 신물의 역류, 삼킴 곤란, 가슴 불편감 같은 오래된 역류 증상 때문에 검사를 받다가 발견하게 됩니다. 바렛 식도가 있는 사람 중에는 눈에 띄는 속쓰림을 한 번도 겪지 않은 경우도 있습니다.",
            ar: "لا يسبب مريء باريت أعراضًا بحد ذاته. ويكتشفه معظم المصابين أثناء تقييم أعراض ارتجاع مزمنة مثل حرقة المعدة، أو ارتجاع الطعام أو سائل حامض، أو صعوبة البلع، أو انزعاج في الصدر. وبعض المصابين بمريء باريت لم يشعروا قط بحرقة معدة ملحوظة.",
          },
        ],
      },
      {
        heading: {
          en: "How it is diagnosed",
          es: "Cómo se diagnostica",
          vi: "Chẩn đoán bằng cách nào",
          ko: "진단 방법",
          ar: "كيف يُشخَّص",
        },
        paragraphs: [
          {
            en: "The only way to diagnose Barrett's esophagus is with an upper endoscopy. While you are sedated, the doctor passes a thin, flexible tube with a camera through the mouth and examines the esophagus. Small tissue samples (biopsies) are taken and reviewed under a microscope to confirm the change and to check for precancerous cells, called dysplasia.",
            es: "La única manera de diagnosticar el esófago de Barrett es con una endoscopia superior. Mientras usted está sedado, el médico pasa por la boca un tubo delgado y flexible con una cámara y examina el esófago. Se toman pequeñas muestras de tejido (biopsias) que se estudian bajo el microscopio para confirmar el cambio y buscar células precancerosas, llamadas displasia.",
            vi: "Cách duy nhất để chẩn đoán thực quản Barrett là nội soi đường tiêu hóa trên. Trong khi quý vị được an thần, bác sĩ đưa một ống mềm, mảnh có gắn camera qua đường miệng để quan sát thực quản. Các mẫu mô nhỏ (sinh thiết) được lấy ra và xem dưới kính hiển vi để xác nhận sự biến đổi và kiểm tra các tế bào tiền ung thư, gọi là loạn sản.",
            ko: "바렛 식도를 진단하는 유일한 방법은 상부 내시경 검사입니다. 진정 상태에서 의사가 카메라가 달린 가늘고 유연한 관을 입으로 넣어 식도를 관찰합니다. 작은 조직 샘플(조직검사)을 채취해 현미경으로 검토하여 변화를 확인하고, 이형성증이라고 하는 전암성 세포가 있는지 확인합니다.",
            ar: "الطريقة الوحيدة لتشخيص مريء باريت هي التنظير العلوي. فبينما تكون تحت التخدير المهدئ، يُدخل الطبيب أنبوبًا رفيعًا مرنًا مزودًا بكاميرا عبر الفم ويفحص المريء. وتُؤخذ عينات نسيجية صغيرة (خزعات) تُفحص تحت المجهر لتأكيد التغيّر والبحث عن خلايا سابقة للتسرطن تُسمى خلل التنسج.",
          },
        ],
      },
      {
        heading: {
          en: "Treatment and monitoring",
          es: "Tratamiento y vigilancia",
          vi: "Điều trị và theo dõi",
          ko: "치료와 추적 관찰",
          ar: "العلاج والمتابعة",
        },
        paragraphs: [
          {
            en: "Management focuses on controlling reflux and watching the tissue over time. Acid-reducing medicines, along with steps such as weight management and avoiding late meals, help protect the esophagus.",
            es: "El manejo se centra en controlar el reflujo y vigilar el tejido a lo largo del tiempo. Los medicamentos que reducen el ácido, junto con medidas como controlar el peso y evitar las comidas tarde en la noche, ayudan a proteger el esófago.",
            vi: "Việc kiểm soát bệnh tập trung vào khống chế trào ngược và theo dõi mô theo thời gian. Các thuốc giảm axit, cùng với những biện pháp như kiểm soát cân nặng và tránh ăn khuya, giúp bảo vệ thực quản.",
            ko: "관리는 역류를 조절하고 조직을 시간에 걸쳐 관찰하는 데 중점을 둡니다. 위산을 줄이는 약과 함께 체중 관리, 늦은 식사 피하기 같은 조치가 식도를 보호하는 데 도움이 됩니다.",
            ar: "يركز التدبير العلاجي على السيطرة على الارتجاع ومراقبة النسيج مع مرور الوقت. وتساعد الأدوية الخافضة للحمض، إلى جانب خطوات مثل ضبط الوزن وتجنب الوجبات المتأخرة، على حماية المريء.",
          },
          {
            en: "Your gastroenterologist will recommend a schedule of periodic surveillance endoscopies based on your biopsy results. If dysplasia is found, treatments performed through the endoscope can remove or destroy the abnormal tissue, with the goal of treating it before it progresses.",
            es: "Su gastroenterólogo le recomendará un calendario de endoscopias de vigilancia periódicas según los resultados de sus biopsias. Si se encuentra displasia, existen tratamientos que se realizan a través del endoscopio para extirpar o destruir el tejido anormal, con el objetivo de tratarlo antes de que avance.",
            vi: "Bác sĩ chuyên khoa tiêu hóa sẽ đề nghị lịch nội soi giám sát định kỳ dựa trên kết quả sinh thiết của quý vị. Nếu phát hiện loạn sản, có những phương pháp điều trị thực hiện qua ống nội soi để cắt bỏ hoặc phá hủy mô bất thường, với mục tiêu xử lý trước khi nó tiến triển.",
            ko: "소화기내과 전문의는 조직검사 결과에 따라 정기적인 감시 내시경 일정을 권장합니다. 이형성증이 발견되면 내시경을 통해 비정상 조직을 제거하거나 파괴하는 치료를 시행할 수 있으며, 병변이 진행되기 전에 치료하는 것이 목표입니다.",
            ar: "سيوصي طبيب الجهاز الهضمي بجدول لتنظيرات مراقبة دورية بناءً على نتائج خزعاتك. وإذا وُجد خلل التنسج، فهناك علاجات تُجرى عبر المنظار لاستئصال النسيج غير الطبيعي أو تدميره، بهدف علاجه قبل أن يتفاقم.",
          },
        ],
      },
      {
        heading: {
          en: "When to contact a gastroenterologist",
          es: "Cuándo consultar a un gastroenterólogo",
          vi: "Khi nào cần đến gặp bác sĩ chuyên khoa tiêu hóa",
          ko: "소화기내과 전문의와 상담해야 할 때",
          ar: "متى تراجع طبيب الجهاز الهضمي",
        },
        paragraphs: [
          {
            en: "Talk with a gastroenterologist if you have had heartburn or reflux for many years, especially if it occurs several times a week or requires daily medicine. Difficulty swallowing, food sticking, unintended weight loss, vomiting blood, or black stools deserve prompt evaluation. If you have already been diagnosed with Barrett's esophagus, keep your recommended surveillance appointments even when you feel well.",
            es: "Hable con un gastroenterólogo si ha tenido acidez o reflujo durante muchos años, sobre todo si ocurre varias veces por semana o requiere medicamento a diario. La dificultad para tragar, la sensación de que la comida se atora, la pérdida de peso involuntaria, el vómito con sangre o las heces negras merecen una evaluación pronta. Si ya le diagnosticaron esófago de Barrett, cumpla con sus citas de vigilancia recomendadas aunque se sienta bien.",
            vi: "Hãy trao đổi với bác sĩ chuyên khoa tiêu hóa nếu quý vị bị ợ nóng hoặc trào ngược trong nhiều năm, nhất là khi xảy ra vài lần mỗi tuần hoặc phải dùng thuốc hằng ngày. Khó nuốt, cảm giác thức ăn bị nghẹn lại, sụt cân không chủ ý, nôn ra máu hoặc phân đen cần được thăm khám sớm. Nếu quý vị đã được chẩn đoán thực quản Barrett, hãy tuân thủ các buổi hẹn giám sát được khuyến nghị ngay cả khi cảm thấy khỏe.",
            ko: "여러 해 동안 속쓰림이나 역류가 있었다면, 특히 주 여러 차례 발생하거나 매일 약이 필요한 경우 소화기내과 전문의와 상담하십시오. 삼킴 곤란, 음식물이 걸리는 느낌, 의도하지 않은 체중 감소, 피를 토하는 증상, 검은 변은 신속한 검사가 필요합니다. 이미 바렛 식도로 진단받았다면 몸 상태가 좋더라도 권장된 감시 검사 일정을 지키시기 바랍니다.",
            ar: "تحدث مع طبيب الجهاز الهضمي إذا كنت تعاني من حرقة المعدة أو الارتجاع منذ سنوات عديدة، خصوصًا إذا كان يحدث عدة مرات في الأسبوع أو يتطلب دواءً يوميًا. وتستدعي صعوبةُ البلع، أو الإحساس بانحشار الطعام، أو فقدان الوزن غير المقصود، أو تقيؤ الدم، أو البراز الأسود تقييمًا عاجلًا. وإذا كنت قد شُخّصت بالفعل بمريء باريت، فالتزم بمواعيد المراقبة الموصى بها حتى وإن كنت تشعر أنك بخير.",
          },
        ],
      },
    ],
    relatedDocId: "info-barretts-esophagus",
  },
  {
    slug: "constipation",
    group: "conditions",
    title: {
      en: "Constipation",
      es: "Estreñimiento",
      vi: "Táo bón",
      ko: "변비",
      ar: "الإمساك",
    },
    summary: {
      en: "Constipation is one of the most common digestive complaints, and it becomes more frequent with age. Learn what usually causes it, when testing is needed, and the treatments that help.",
      es: "El estreñimiento es una de las molestias digestivas más comunes y se vuelve más frecuente con la edad. Conozca sus causas habituales, cuándo se necesitan pruebas y los tratamientos que ayudan.",
      vi: "Táo bón là một trong những phàn nàn tiêu hóa phổ biến nhất và càng thường gặp hơn khi tuổi cao. Tìm hiểu những nguyên nhân thường gặp, khi nào cần làm xét nghiệm và các phương pháp điều trị hữu ích.",
      ko: "변비는 가장 흔한 소화기 불편 증상 중 하나이며 나이가 들수록 더 자주 나타납니다. 일반적인 원인과 검사가 필요한 시점, 도움이 되는 치료법을 알아보십시오.",
      ar: "الإمساك من أكثر الشكاوى الهضمية شيوعًا، ويزداد تواترًا مع التقدم في العمر. تعرَّف على أسبابه المعتادة، ومتى تلزم الفحوصات، والعلاجات التي تساعد.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Constipation means bowel movements that are infrequent, hard, or difficult to pass. It is one of the most common digestive complaints, and it becomes more frequent as people get older.",
            es: "El estreñimiento significa evacuaciones poco frecuentes, duras o difíciles de expulsar. Es una de las molestias digestivas más comunes y se vuelve más frecuente a medida que las personas envejecen.",
            vi: "Táo bón nghĩa là đi tiêu thưa, phân cứng hoặc khó rặn ra. Đây là một trong những phàn nàn tiêu hóa phổ biến nhất, và càng thường gặp hơn khi con người già đi.",
            ko: "변비란 배변 횟수가 적거나, 변이 단단하거나, 배변이 힘든 상태를 말합니다. 가장 흔한 소화기 불편 증상 중 하나이며, 나이가 들수록 더 자주 나타납니다.",
            ar: "يعني الإمساك أن يكون التبرز قليل التواتر أو قاسيًا أو عسير الإخراج. وهو من أكثر الشكاوى الهضمية شيوعًا، ويزداد تواترًا مع تقدم الناس في العمر.",
          },
          {
            en: "In most cases constipation is not caused by a serious disease. Diet, fluid intake, physical activity, and certain medicines — including some pain, blood pressure, and iron medicines — are frequent contributors. Even so, a persistent change in your bowel habits deserves an evaluation.",
            es: "En la mayoría de los casos, el estreñimiento no se debe a una enfermedad grave. La alimentación, el consumo de líquidos, la actividad física y ciertos medicamentos — incluidos algunos para el dolor, la presión arterial y el hierro — contribuyen con frecuencia. Aun así, un cambio persistente en su hábito intestinal merece una evaluación.",
            vi: "Trong đa số trường hợp, táo bón không phải do một bệnh nghiêm trọng gây ra. Chế độ ăn, lượng nước uống, mức vận động và một số loại thuốc — bao gồm một số thuốc giảm đau, thuốc huyết áp và thuốc sắt — là những yếu tố góp phần thường gặp. Dù vậy, sự thay đổi kéo dài trong thói quen đi tiêu của quý vị vẫn cần được thăm khám.",
            ko: "대부분의 경우 변비는 심각한 질병 때문에 생기는 것이 아닙니다. 식단, 수분 섭취, 신체 활동, 그리고 일부 진통제·혈압약·철분제를 포함한 특정 약물이 흔한 원인이 됩니다. 그렇더라도 배변 습관의 변화가 지속된다면 진찰을 받아 볼 필요가 있습니다.",
            ar: "في معظم الحالات لا يكون الإمساك ناجمًا عن مرض خطير. فالنظام الغذائي، وكمية السوائل، والنشاط البدني، وبعض الأدوية — ومنها بعض أدوية الألم وضغط الدم ومكملات الحديد — من العوامل المساهمة الشائعة. ومع ذلك، فإن أي تغيّر مستمر في عادات التبرز لديك يستحق التقييم.",
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
            en: "People with constipation may have fewer bowel movements than usual, strain to pass stool, or pass stools that are hard and lumpy. Some feel unable to empty completely, or notice bloating and a sluggish, uncomfortable abdomen. Symptoms that build gradually and vary with diet are common; a sudden, unexplained change in bowel habits is more concerning.",
            es: "Las personas con estreñimiento pueden tener menos evacuaciones de lo habitual, hacer esfuerzo para evacuar o expulsar heces duras y grumosas. Algunas sienten que no logran vaciar por completo el intestino, o notan hinchazón y un abdomen pesado e incómodo. Los síntomas que aparecen poco a poco y varían con la dieta son comunes; un cambio repentino e inexplicable en el hábito intestinal es más preocupante.",
            vi: "Người bị táo bón có thể đi tiêu ít hơn bình thường, phải rặn nhiều, hoặc đi ra phân cứng và lổn nhổn. Một số người cảm thấy không thể đi hết phân, hoặc nhận thấy chướng bụng và bụng nặng nề, khó chịu. Các triệu chứng hình thành dần dần và thay đổi theo chế độ ăn là điều thường gặp; còn sự thay đổi đột ngột, không giải thích được trong thói quen đi tiêu thì đáng lo ngại hơn.",
            ko: "변비가 있는 사람은 평소보다 배변 횟수가 줄거나, 배변 시 힘을 많이 주어야 하거나, 단단하고 덩어리진 변을 봅니다. 변을 다 비우지 못한 느낌이 들거나, 복부 팽만감과 더부룩하고 불편한 배를 느끼는 경우도 있습니다. 증상이 서서히 나타나고 식단에 따라 달라지는 것은 흔한 일이지만, 배변 습관이 갑자기 이유 없이 바뀌는 것은 더 우려되는 신호입니다.",
            ar: "قد يقل عدد مرات التبرز لدى المصابين بالإمساك عن المعتاد، أو يجهدون أنفسهم لإخراج البراز، أو يخرجون برازًا قاسيًا متكتلًا. ويشعر بعضهم بعدم القدرة على الإفراغ الكامل، أو يلاحظون انتفاخًا وثقلًا وانزعاجًا في البطن. الأعراض التي تتراكم تدريجيًا وتتغير مع النظام الغذائي شائعة؛ أما التغيّر المفاجئ غير المفسَّر في عادات التبرز فهو أكثر إثارة للقلق.",
          },
        ],
      },
      {
        heading: {
          en: "How constipation is evaluated",
          es: "Cómo se evalúa el estreñimiento",
          vi: "Đánh giá táo bón bằng cách nào",
          ko: "변비는 어떻게 진찰하는가",
          ar: "كيف يُقيَّم الإمساك",
        },
        paragraphs: [
          {
            en: "Your gastroenterologist will review your bowel pattern, diet, medicines, and overall health, and examine your abdomen. Blood tests can check for thyroid problems and other contributing conditions. If there are warning signs — bleeding, anemia, unintended weight loss, a family history of colon cancer, or a new change after age forty-five — a colonoscopy may be recommended to examine the colon directly. Specialized tests of colon and pelvic-floor function are available for difficult cases.",
            es: "Su gastroenterólogo revisará su patrón intestinal, su alimentación, sus medicamentos y su salud general, y examinará su abdomen. Los análisis de sangre pueden detectar problemas de tiroides y otras condiciones que contribuyen. Si hay señales de alerta — sangrado, anemia, pérdida de peso involuntaria, antecedentes familiares de cáncer de colon o un cambio nuevo después de los cuarenta y cinco años — puede recomendarse una colonoscopia para examinar el colon directamente. Para los casos difíciles existen pruebas especializadas del funcionamiento del colon y del piso pélvico.",
            vi: "Bác sĩ chuyên khoa tiêu hóa sẽ xem xét thói quen đi tiêu, chế độ ăn, các thuốc đang dùng và sức khỏe tổng quát của quý vị, đồng thời khám bụng. Xét nghiệm máu có thể kiểm tra bệnh tuyến giáp và các bệnh lý góp phần khác. Nếu có dấu hiệu cảnh báo — chảy máu, thiếu máu, sụt cân không chủ ý, tiền sử gia đình bị ung thư đại tràng, hoặc thay đổi mới xuất hiện sau tuổi bốn mươi lăm — bác sĩ có thể đề nghị nội soi đại tràng để kiểm tra đại tràng trực tiếp. Với các trường hợp khó, có những xét nghiệm chuyên sâu về chức năng đại tràng và sàn chậu.",
            ko: "소화기내과 전문의는 배변 패턴, 식단, 복용 중인 약, 전반적인 건강 상태를 검토하고 복부를 진찰합니다. 혈액 검사로 갑상샘 질환과 그 밖의 원인 질환을 확인할 수 있습니다. 출혈, 빈혈, 의도하지 않은 체중 감소, 대장암 가족력, 45세 이후 새로 생긴 변화 같은 경고 신호가 있으면 대장을 직접 살펴보기 위해 대장내시경 검사를 권장할 수 있습니다. 난치성 사례에는 대장과 골반저 기능에 대한 특수 검사도 있습니다.",
            ar: "سيراجع طبيب الجهاز الهضمي نمط التبرز لديك ونظامك الغذائي وأدويتك وصحتك العامة، ويفحص بطنك. ويمكن لتحاليل الدم الكشف عن مشكلات الغدة الدرقية وغيرها من الحالات المساهمة. وإذا وُجدت علامات تحذيرية — نزيف، أو فقر دم، أو فقدان وزن غير مقصود، أو تاريخ عائلي لسرطان القولون، أو تغيّر جديد بعد سن الخامسة والأربعين — فقد يُوصى بتنظير القولون لفحصه مباشرة. وتتوفر للحالات المستعصية فحوصات متخصصة لوظيفة القولون وقاع الحوض.",
          },
        ],
      },
      {
        heading: {
          en: "Treatment approaches",
          es: "Opciones de tratamiento",
          vi: "Các phương pháp điều trị",
          ko: "치료 방법",
          ar: "طرق العلاج",
        },
        paragraphs: [
          {
            en: "Treatment usually starts with simple measures: more fiber from fruits, vegetables, and whole grains; enough fluids; and regular physical activity. Fiber supplements and gentle over-the-counter laxatives can help when diet alone is not enough.",
            es: "El tratamiento suele comenzar con medidas sencillas: más fibra de frutas, verduras y granos integrales; suficientes líquidos; y actividad física regular. Los suplementos de fibra y los laxantes suaves de venta libre pueden ayudar cuando la dieta por sí sola no basta.",
            vi: "Việc điều trị thường bắt đầu bằng các biện pháp đơn giản: ăn nhiều chất xơ hơn từ trái cây, rau củ và ngũ cốc nguyên hạt; uống đủ nước; và vận động thể chất đều đặn. Thực phẩm bổ sung chất xơ và thuốc nhuận tràng nhẹ không kê đơn có thể giúp ích khi chế độ ăn đơn thuần chưa đủ.",
            ko: "치료는 보통 간단한 방법으로 시작합니다. 과일, 채소, 통곡물에서 섬유질을 더 섭취하고, 수분을 충분히 마시고, 규칙적으로 신체 활동을 하는 것입니다. 식단만으로 부족할 때는 섬유질 보충제와 순한 일반의약품 완하제가 도움이 될 수 있습니다.",
            ar: "يبدأ العلاج عادةً بتدابير بسيطة: مزيد من الألياف من الفواكه والخضروات والحبوب الكاملة؛ وسوائل كافية؛ ونشاط بدني منتظم. ويمكن لمكملات الألياف والمليّنات اللطيفة المتاحة دون وصفة أن تساعد عندما لا يكفي النظام الغذائي وحده.",
          },
          {
            en: "For persistent constipation, prescription medicines that draw water into the bowel or stimulate its movement are available. Pelvic-floor physical therapy helps when the muscles used to pass stool do not coordinate properly. Your care team can help you build a plan that is safe alongside your other medicines.",
            es: "Para el estreñimiento persistente existen medicamentos con receta que atraen agua hacia el intestino o estimulan su movimiento. La terapia física del piso pélvico ayuda cuando los músculos que se usan para evacuar no se coordinan bien. Su equipo de atención puede ayudarle a armar un plan que sea seguro junto con sus demás medicamentos.",
            vi: "Đối với táo bón dai dẳng, có các thuốc kê đơn giúp kéo nước vào ruột hoặc kích thích nhu động ruột. Vật lý trị liệu sàn chậu hữu ích khi các cơ dùng để đi tiêu không phối hợp nhịp nhàng. Đội ngũ chăm sóc có thể giúp quý vị xây dựng một kế hoạch an toàn khi dùng cùng các thuốc khác của mình.",
            ko: "지속되는 변비에는 장으로 수분을 끌어들이거나 장 운동을 자극하는 처방약이 있습니다. 배변에 쓰이는 근육이 제대로 협응하지 않을 때는 골반저 물리치료가 도움이 됩니다. 의료진이 복용 중인 다른 약과 함께 사용해도 안전한 계획을 세우도록 도와드릴 수 있습니다.",
            ar: "للإمساك المستمر تتوفر أدوية بوصفة طبية تسحب الماء إلى الأمعاء أو تحفّز حركتها. ويساعد العلاج الطبيعي لقاع الحوض عندما لا تتناسق العضلات المستخدمة في إخراج البراز على النحو الصحيح. ويمكن لفريق الرعاية مساعدتك في وضع خطة آمنة إلى جانب أدويتك الأخرى.",
          },
        ],
      },
      {
        heading: {
          en: "When to contact a gastroenterologist",
          es: "Cuándo consultar a un gastroenterólogo",
          vi: "Khi nào cần đến gặp bác sĩ chuyên khoa tiêu hóa",
          ko: "소화기내과 전문의와 상담해야 할 때",
          ar: "متى تراجع طبيب الجهاز الهضمي",
        },
        paragraphs: [
          {
            en: "See a doctor promptly if constipation begins suddenly without explanation, or if it comes with blood in the stool, black stools, unintended weight loss, severe pain, or vomiting. Also make an appointment if constipation lasts more than a few weeks despite home measures, or if you regularly depend on laxatives to have a bowel movement.",
            es: "Consulte a un médico pronto si el estreñimiento comienza de manera repentina y sin explicación, o si se acompaña de sangre en las heces, heces negras, pérdida de peso involuntaria, dolor intenso o vómitos. Haga también una cita si el estreñimiento dura más de unas semanas a pesar de las medidas caseras, o si usted depende con regularidad de los laxantes para poder evacuar.",
            vi: "Hãy đi khám sớm nếu táo bón khởi phát đột ngột không rõ lý do, hoặc kèm theo máu trong phân, phân đen, sụt cân không chủ ý, đau dữ dội hoặc nôn. Cũng hãy đặt lịch khám nếu táo bón kéo dài hơn vài tuần dù đã áp dụng các biện pháp tại nhà, hoặc nếu quý vị thường xuyên phải phụ thuộc vào thuốc nhuận tràng mới đi tiêu được.",
            ko: "변비가 갑자기 이유 없이 시작되거나, 혈변, 검은 변, 의도하지 않은 체중 감소, 심한 통증, 구토를 동반하면 신속히 진료를 받으십시오. 또한 집에서 관리해도 변비가 몇 주 이상 지속되거나, 배변을 위해 완하제에 상습적으로 의존하고 있다면 진료 예약을 하시기 바랍니다.",
            ar: "راجع الطبيب سريعًا إذا بدأ الإمساك فجأة دون تفسير، أو إذا صاحبه دم في البراز، أو براز أسود، أو فقدان وزن غير مقصود، أو ألم شديد، أو قيء. وحدد موعدًا أيضًا إذا استمر الإمساك أكثر من بضعة أسابيع رغم التدابير المنزلية، أو إذا كنت تعتمد بانتظام على المليّنات لتتمكن من التبرز.",
          },
        ],
      },
    ],
    relatedDocId: "info-constipation",
  },
  {
    slug: "food-allergy-intolerance",
    group: "conditions",
    title: {
      en: "Food Allergy and Intolerance",
      es: "Alergia e intolerancia alimentaria",
      vi: "Dị ứng và không dung nạp thực phẩm",
      ko: "음식 알레르기와 불내증",
      ar: "حساسية الطعام وعدم تحمّله",
    },
    summary: {
      en: "Food allergies and food intolerances can cause similar discomfort but are very different problems. Learn how to tell them apart, how each is diagnosed, and how both are managed.",
      es: "Las alergias y las intolerancias alimentarias pueden causar molestias parecidas, pero son problemas muy distintos. Conozca cómo diferenciarlas, cómo se diagnostica cada una y cómo se manejan.",
      vi: "Dị ứng thực phẩm và không dung nạp thực phẩm có thể gây khó chịu tương tự nhau nhưng là hai vấn đề rất khác nhau. Tìm hiểu cách phân biệt, cách chẩn đoán từng loại và cách kiểm soát cả hai.",
      ko: "음식 알레르기와 음식 불내증은 비슷한 불편을 일으킬 수 있지만 매우 다른 문제입니다. 두 질환을 구별하는 방법과 각각의 진단법, 관리 방법을 알아보십시오.",
      ar: "قد تسبب حساسية الطعام وعدم تحمّل الطعام انزعاجًا متشابهًا، لكنهما مشكلتان مختلفتان تمامًا. تعرَّف على كيفية التمييز بينهما، وكيفية تشخيص كل منهما، وكيفية التعامل معهما.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Food allergies and food intolerances both cause trouble after eating, but they are different problems. A food allergy involves the immune system: the body mistakes a food protein for a threat and reacts, sometimes severely.",
            es: "Las alergias y las intolerancias alimentarias causan problemas después de comer, pero son condiciones diferentes. Una alergia alimentaria involucra al sistema inmunitario: el cuerpo confunde una proteína del alimento con una amenaza y reacciona, a veces de forma grave.",
            vi: "Dị ứng thực phẩm và không dung nạp thực phẩm đều gây rắc rối sau khi ăn, nhưng là hai vấn đề khác nhau. Dị ứng thực phẩm liên quan đến hệ miễn dịch: cơ thể nhầm một loại protein trong thức ăn là mối đe dọa và phản ứng lại, đôi khi rất nghiêm trọng.",
            ko: "음식 알레르기와 음식 불내증은 모두 음식을 먹은 뒤 문제를 일으키지만 서로 다른 질환입니다. 음식 알레르기는 면역계와 관련이 있습니다. 몸이 음식 단백질을 위협으로 오인해 반응하는 것으로, 때로는 심각한 반응이 나타납니다.",
            ar: "تسبب حساسية الطعام وعدم تحمّل الطعام كلاهما متاعب بعد الأكل، لكنهما مشكلتان مختلفتان. فحساسية الطعام تتعلق بجهاز المناعة: إذ يخطئ الجسم في اعتبار بروتين في الطعام تهديدًا فيتفاعل معه، بشدة أحيانًا.",
          },
          {
            en: "A food intolerance involves digestion. The body has difficulty processing a component of the food — such as lactose, the sugar in milk — and the result is uncomfortable but not dangerous in the same way. Telling the two apart is the key to eating safely without restricting more than necessary.",
            es: "Una intolerancia alimentaria tiene que ver con la digestión. El cuerpo tiene dificultad para procesar un componente del alimento — como la lactosa, el azúcar de la leche — y el resultado es incómodo, pero no peligroso de la misma manera. Distinguir una de otra es la clave para comer con seguridad sin restringir más de lo necesario.",
            vi: "Không dung nạp thực phẩm liên quan đến tiêu hóa. Cơ thể gặp khó khăn khi xử lý một thành phần của thức ăn — chẳng hạn lactose, loại đường trong sữa — và hậu quả là khó chịu nhưng không nguy hiểm theo cùng cách. Phân biệt được hai tình trạng này là chìa khóa để ăn uống an toàn mà không phải kiêng khem quá mức cần thiết.",
            ko: "음식 불내증은 소화와 관련이 있습니다. 몸이 음식의 특정 성분 — 예를 들어 우유에 든 당분인 유당 — 을 처리하기 어려워하는 것으로, 그 결과는 불편하지만 알레르기와 같은 방식으로 위험하지는 않습니다. 두 질환을 구별하는 것이 필요 이상으로 음식을 제한하지 않으면서 안전하게 먹는 열쇠입니다.",
            ar: "أما عدم تحمّل الطعام فيتعلق بالهضم. إذ يجد الجسم صعوبة في معالجة أحد مكونات الطعام — مثل اللاكتوز، وهو سكر الحليب — والنتيجة مزعجة لكنها ليست خطيرة بالطريقة نفسها. والتمييز بين الحالتين هو مفتاح الأكل بأمان دون تقييد أكثر من اللازم.",
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
            en: "Allergic reactions usually begin within minutes to a couple of hours after eating and can include hives, itching, swelling of the lips or throat, vomiting, wheezing, or dizziness. A severe allergic reaction, called anaphylaxis, is a medical emergency. Intolerances tend to cause digestive symptoms — bloating, gas, cramping, and diarrhea — that build more gradually and depend on how much of the food was eaten.",
            es: "Las reacciones alérgicas suelen comenzar entre minutos y un par de horas después de comer, y pueden incluir ronchas, comezón, hinchazón de los labios o la garganta, vómitos, silbidos al respirar o mareo. Una reacción alérgica grave, llamada anafilaxia, es una emergencia médica. Las intolerancias tienden a causar síntomas digestivos — hinchazón, gases, cólicos y diarrea — que aparecen de forma más gradual y dependen de cuánto se comió del alimento.",
            vi: "Phản ứng dị ứng thường bắt đầu trong vòng vài phút đến vài giờ sau khi ăn và có thể bao gồm nổi mề đay, ngứa, sưng môi hoặc cổ họng, nôn, thở khò khè hoặc chóng mặt. Phản ứng dị ứng nặng, gọi là sốc phản vệ, là một cấp cứu y khoa. Không dung nạp thường gây các triệu chứng tiêu hóa — chướng bụng, đầy hơi, đau quặn và tiêu chảy — xuất hiện từ từ hơn và tùy thuộc vào lượng thức ăn đã ăn.",
            ko: "알레르기 반응은 보통 음식을 먹은 뒤 몇 분에서 두어 시간 이내에 시작되며, 두드러기, 가려움, 입술이나 목의 부종, 구토, 쌕쌕거림, 어지러움이 나타날 수 있습니다. 아나필락시스라고 하는 중증 알레르기 반응은 응급 상황입니다. 불내증은 복부 팽만, 가스, 복부 경련, 설사 같은 소화기 증상을 일으키는 경향이 있으며, 증상이 더 서서히 나타나고 먹은 양에 따라 달라집니다.",
            ar: "تبدأ التفاعلات التحسسية عادةً في غضون دقائق إلى ساعتين بعد الأكل، وقد تشمل الشرى (طفحًا جلديًا)، والحكة، وتورّم الشفتين أو الحلق، والقيء، والأزيز، أو الدوخة. والتفاعل التحسسي الشديد، المسمى التأق، حالة طبية طارئة. أما عدم التحمل فيميل إلى إحداث أعراض هضمية — انتفاخ وغازات ومغص وإسهال — تتراكم بشكل أكثر تدرجًا وتعتمد على كمية الطعام المتناولة.",
          },
        ],
      },
      {
        heading: {
          en: "How they are evaluated",
          es: "Cómo se evalúan",
          vi: "Đánh giá bằng cách nào",
          ko: "어떻게 진찰하는가",
          ar: "كيف يُقيَّمان",
        },
        paragraphs: [
          {
            en: "The evaluation starts with a careful history: which foods are involved, how much was eaten, how quickly symptoms appear, and what they look like. A food and symptom diary is often helpful. A suspected allergy is usually evaluated together with an allergist, using skin or blood testing.",
            es: "La evaluación comienza con una historia clínica cuidadosa: qué alimentos están involucrados, cuánto se comió, qué tan rápido aparecen los síntomas y cómo son. Llevar un diario de alimentos y síntomas suele ser útil. Cuando se sospecha una alergia, la evaluación suele hacerse junto con un alergólogo, mediante pruebas en la piel o de sangre.",
            vi: "Việc đánh giá bắt đầu bằng khai thác bệnh sử kỹ lưỡng: những thức ăn nào có liên quan, đã ăn bao nhiêu, triệu chứng xuất hiện nhanh ra sao và biểu hiện như thế nào. Nhật ký ăn uống và triệu chứng thường rất hữu ích. Khi nghi ngờ dị ứng, việc đánh giá thường được thực hiện cùng với bác sĩ chuyên khoa dị ứng, bằng xét nghiệm da hoặc xét nghiệm máu.",
            ko: "진찰은 면밀한 병력 청취로 시작합니다. 어떤 음식이 관련되어 있는지, 얼마나 먹었는지, 증상이 얼마나 빨리 나타나는지, 어떤 양상인지 확인합니다. 음식과 증상을 기록한 일지가 도움이 되는 경우가 많습니다. 알레르기가 의심되면 보통 알레르기 전문의와 함께 피부 검사나 혈액 검사로 평가합니다.",
            ar: "يبدأ التقييم بتاريخ مرضي دقيق: أي الأطعمة متورطة، وكم أُكل منها، وبأي سرعة تظهر الأعراض، وكيف تبدو. وغالبًا ما يفيد الاحتفاظ بمفكرة للطعام والأعراض. وعند الاشتباه في حساسية، يُجرى التقييم عادةً بالتعاون مع اختصاصي حساسية، باستخدام اختبارات الجلد أو الدم.",
          },
          {
            en: "For intolerances, your gastroenterologist may suggest a structured elimination of the suspected food followed by reintroduction, breath testing for lactose intolerance, or blood testing for celiac disease, which can mimic both.",
            es: "Para las intolerancias, su gastroenterólogo puede sugerir eliminar de forma estructurada el alimento sospechoso y luego reintroducirlo, una prueba de aliento para la intolerancia a la lactosa, o análisis de sangre para la enfermedad celíaca, que puede imitar a ambas.",
            vi: "Đối với không dung nạp, bác sĩ chuyên khoa tiêu hóa có thể đề nghị loại bỏ thức ăn nghi ngờ theo cách có hệ thống rồi ăn lại, làm xét nghiệm hơi thở cho chứng không dung nạp lactose, hoặc xét nghiệm máu tìm bệnh celiac, vốn có thể giống cả hai tình trạng trên.",
            ko: "불내증의 경우 소화기내과 전문의가 의심되는 음식을 체계적으로 제외했다가 다시 먹어 보는 방법, 유당불내증에 대한 호흡 검사, 또는 두 질환 모두와 비슷하게 나타날 수 있는 셀리악병에 대한 혈액 검사를 제안할 수 있습니다.",
            ar: "وبالنسبة لعدم التحمّل، قد يقترح طبيب الجهاز الهضمي استبعادًا منظّمًا للطعام المشتبه به ثم إعادة إدخاله، أو اختبار تنفس لعدم تحمّل اللاكتوز، أو تحليل دم للداء البطني (السيلياك) الذي يمكن أن يحاكي كلتا الحالتين.",
          },
        ],
      },
      {
        heading: {
          en: "Managing food allergy and intolerance",
          es: "Manejo de la alergia y la intolerancia alimentaria",
          vi: "Kiểm soát dị ứng và không dung nạp thực phẩm",
          ko: "음식 알레르기와 불내증의 관리",
          ar: "التعامل مع حساسية الطعام وعدم تحمّله",
        },
        paragraphs: [
          {
            en: "A confirmed food allergy is managed by strictly avoiding the food, reading ingredient labels, and carrying the emergency medicine your doctor prescribes in case of accidental exposure. Intolerances rarely require complete avoidance: many people do well by limiting portion sizes, choosing products such as lactose-free milk, or using enzyme supplements. A dietitian can help you keep your meals balanced while avoiding your trigger foods.",
            es: "Una alergia alimentaria confirmada se maneja evitando estrictamente el alimento, leyendo las etiquetas de ingredientes y llevando consigo el medicamento de emergencia que su médico le recete por si ocurre una exposición accidental. Las intolerancias rara vez exigen evitar el alimento por completo: a muchas personas les va bien limitando las porciones, eligiendo productos como leche sin lactosa o usando suplementos de enzimas. Un dietista puede ayudarle a mantener una alimentación balanceada mientras evita los alimentos que le causan síntomas.",
            vi: "Dị ứng thực phẩm đã được xác định được kiểm soát bằng cách tránh nghiêm ngặt loại thức ăn đó, đọc nhãn thành phần và luôn mang theo thuốc cấp cứu mà bác sĩ kê đơn phòng khi vô tình tiếp xúc. Không dung nạp hiếm khi đòi hỏi phải kiêng hoàn toàn: nhiều người vẫn ổn khi hạn chế khẩu phần, chọn các sản phẩm như sữa không lactose, hoặc dùng thực phẩm bổ sung enzyme. Chuyên gia dinh dưỡng có thể giúp quý vị giữ bữa ăn cân bằng trong khi tránh những thức ăn gây triệu chứng.",
            ko: "확진된 음식 알레르기는 해당 음식을 엄격히 피하고, 성분 표시를 확인하며, 우발적으로 노출될 경우에 대비해 의사가 처방한 응급 약을 휴대하는 방식으로 관리합니다. 불내증은 완전히 피해야 하는 경우가 드뭅니다. 많은 사람이 섭취량을 줄이거나, 무유당 우유 같은 제품을 선택하거나, 효소 보충제를 사용하는 것으로 잘 지냅니다. 영양사가 유발 음식을 피하면서도 균형 잡힌 식사를 유지하도록 도와드릴 수 있습니다.",
            ar: "تُدار حساسية الطعام المؤكدة بتجنب الطعام تجنبًا صارمًا، وقراءة ملصقات المكونات، وحمل دواء الطوارئ الذي يصفه طبيبك تحسبًا للتعرض العرضي. ونادرًا ما يتطلب عدم التحمّل تجنبًا كاملًا: فكثيرون يكونون بخير بتقليل الكميات، أو اختيار منتجات مثل الحليب الخالي من اللاكتوز، أو استخدام مكملات الإنزيمات. ويمكن لاختصاصي التغذية مساعدتك في الحفاظ على وجبات متوازنة مع تجنب الأطعمة المسببة لأعراضك.",
          },
        ],
      },
      {
        heading: {
          en: "When to contact a gastroenterologist",
          es: "Cuándo consultar a un gastroenterólogo",
          vi: "Khi nào cần đến gặp bác sĩ chuyên khoa tiêu hóa",
          ko: "소화기내과 전문의와 상담해야 할 때",
          ar: "متى تراجع طبيب الجهاز الهضمي",
        },
        paragraphs: [
          {
            en: "Seek an evaluation if digestive symptoms after eating keep returning, if you find yourself restricting more and more foods without clear answers, or if symptoms come with unintended weight loss, blood in the stool, or anemia. Any reaction that involves throat swelling or difficulty breathing needs emergency care first, followed by a formal allergy evaluation.",
            es: "Busque una evaluación si los síntomas digestivos después de comer siguen regresando, si usted está restringiendo cada vez más alimentos sin respuestas claras, o si los síntomas se acompañan de pérdida de peso involuntaria, sangre en las heces o anemia. Cualquier reacción con hinchazón de la garganta o dificultad para respirar necesita primero atención de emergencia y, después, una evaluación formal de alergia.",
            vi: "Hãy đi khám nếu các triệu chứng tiêu hóa sau khi ăn cứ tái diễn, nếu quý vị thấy mình phải kiêng ngày càng nhiều thức ăn mà không có câu trả lời rõ ràng, hoặc nếu triệu chứng đi kèm sụt cân không chủ ý, máu trong phân hoặc thiếu máu. Bất kỳ phản ứng nào gây sưng cổ họng hoặc khó thở cần được cấp cứu trước, sau đó là đánh giá dị ứng chính thức.",
            ko: "먹은 뒤 소화기 증상이 계속 재발하거나, 명확한 답 없이 피하는 음식이 점점 늘어나거나, 증상이 의도하지 않은 체중 감소, 혈변, 빈혈을 동반한다면 진찰을 받으십시오. 목이 붓거나 호흡이 곤란해지는 반응은 무엇이든 먼저 응급 진료를 받은 뒤 정식 알레르기 검사를 받아야 합니다.",
            ar: "اطلب التقييم إذا ظلت الأعراض الهضمية بعد الأكل تعاود الظهور، أو إذا وجدت نفسك تقيّد المزيد والمزيد من الأطعمة دون إجابات واضحة، أو إذا صاحبت الأعراضَ فقدانُ وزن غير مقصود أو دم في البراز أو فقر دم. وأي تفاعل يشمل تورّم الحلق أو صعوبة التنفس يحتاج أولًا إلى رعاية طارئة، يليها تقييم رسمي للحساسية.",
          },
        ],
      },
    ],
    relatedDocId: "info-food-allergy",
  },
  {
    slug: "gallstones",
    group: "conditions",
    title: {
      en: "Gallstones",
      es: "Cálculos biliares",
      vi: "Sỏi mật",
      ko: "담석",
      ar: "حصوات المرارة",
    },
    summary: {
      en: "Gallstones are very common and often cause no symptoms at all — until one blocks the flow of bile. Learn how gallstone attacks feel, how they are diagnosed, and when treatment is needed.",
      es: "Los cálculos biliares son muy comunes y a menudo no causan ningún síntoma, hasta que uno bloquea el flujo de la bilis. Conozca cómo se sienten los ataques, cómo se diagnostican y cuándo se necesita tratamiento.",
      vi: "Sỏi mật rất phổ biến và thường không gây triệu chứng gì — cho đến khi một viên sỏi làm tắc dòng chảy của mật. Tìm hiểu cơn đau sỏi mật có cảm giác ra sao, cách chẩn đoán và khi nào cần điều trị.",
      ko: "담석은 매우 흔하며 대개 아무 증상도 일으키지 않습니다 — 담석이 담즙의 흐름을 막기 전까지는 말입니다. 담석 발작이 어떻게 느껴지는지, 어떻게 진단하는지, 언제 치료가 필요한지 알아보십시오.",
      ar: "حصوات المرارة شائعة جدًا وغالبًا لا تسبب أي أعراض على الإطلاق — إلى أن تسد إحداها مجرى الصفراء. تعرَّف على شكل نوبات الحصوات، وكيفية تشخيصها، ومتى يلزم العلاج.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Gallstones are hard pieces of material, most often formed from cholesterol, that develop in the gallbladder — a small pouch beneath the liver that stores bile to help digest fat. Gallstones are very common, and many people carry them for years without knowing it.",
            es: "Los cálculos biliares son piezas duras de material, formadas la mayoría de las veces por colesterol, que se desarrollan en la vesícula biliar — una pequeña bolsa debajo del hígado que almacena bilis para ayudar a digerir la grasa. Son muy comunes, y muchas personas los tienen durante años sin saberlo.",
            vi: "Sỏi mật là những khối vật chất cứng, thường hình thành từ cholesterol, phát triển trong túi mật — một túi nhỏ nằm dưới gan, chứa mật để giúp tiêu hóa chất béo. Sỏi mật rất phổ biến, và nhiều người mang sỏi trong nhiều năm mà không hề hay biết.",
            ko: "담석은 주로 콜레스테롤로 이루어진 단단한 덩어리로, 담낭 — 지방 소화를 돕는 담즙을 저장하는, 간 아래쪽의 작은 주머니 — 안에서 생깁니다. 담석은 매우 흔하며, 많은 사람이 있는 줄도 모른 채 여러 해 동안 담석을 지니고 지냅니다.",
            ar: "حصوات المرارة قطع صلبة من مادة تتكون في أغلب الأحيان من الكوليسترول، وتنشأ في المرارة — وهي كيس صغير تحت الكبد يخزّن الصفراء للمساعدة على هضم الدهون. وهذه الحصوات شائعة جدًا، ويحملها كثيرون لسنوات دون أن يعلموا.",
          },
          {
            en: "Stones become a problem when one blocks the flow of bile, causing pain or inflammation. They are more common with age, in women, during pregnancy, and in people with obesity or after rapid weight loss.",
            es: "Los cálculos se vuelven un problema cuando uno bloquea el flujo de la bilis y causa dolor o inflamación. Son más comunes con la edad, en las mujeres, durante el embarazo y en personas con obesidad o después de una pérdida de peso rápida.",
            vi: "Sỏi trở thành vấn đề khi một viên làm tắc dòng chảy của mật, gây đau hoặc viêm. Sỏi mật thường gặp hơn khi tuổi cao, ở phụ nữ, trong thai kỳ, và ở người béo phì hoặc sau khi sụt cân nhanh.",
            ko: "담석이 담즙의 흐름을 막아 통증이나 염증을 일으킬 때 문제가 됩니다. 담석은 나이가 많을수록, 여성에서, 임신 중에, 비만이 있거나 급격한 체중 감량 후에 더 흔합니다.",
            ar: "تصبح الحصوات مشكلة عندما تسد إحداها مجرى الصفراء فتسبب ألمًا أو التهابًا. وهي أكثر شيوعًا مع التقدم في العمر، ولدى النساء، وأثناء الحمل، وعند المصابين بالسمنة أو بعد فقدان الوزن السريع.",
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
            en: "The classic symptom is a steady pain in the upper right or upper middle abdomen, often after a heavy or fatty meal, sometimes spreading to the back or the right shoulder blade. Attacks may last from thirty minutes to several hours and can come with nausea or vomiting. Fever, chills, or yellowing of the skin and eyes (jaundice) suggest a blocked duct or an infection and need urgent attention.",
            es: "El síntoma clásico es un dolor constante en la parte superior derecha o central del abdomen, a menudo después de una comida pesada o grasosa, que a veces se extiende a la espalda o al omóplato derecho. Los ataques pueden durar de treinta minutos a varias horas y acompañarse de náuseas o vómitos. La fiebre, los escalofríos o el color amarillento de la piel y los ojos (ictericia) sugieren un conducto bloqueado o una infección y requieren atención urgente.",
            vi: "Triệu chứng kinh điển là cơn đau liên tục ở vùng bụng trên bên phải hoặc giữa bụng trên, thường sau bữa ăn nhiều hoặc nhiều dầu mỡ, đôi khi lan ra sau lưng hoặc lên bả vai phải. Cơn đau có thể kéo dài từ ba mươi phút đến vài giờ và có thể kèm buồn nôn hoặc nôn. Sốt, ớn lạnh, hoặc vàng da và mắt (vàng da) gợi ý ống mật bị tắc hoặc nhiễm trùng và cần được chăm sóc khẩn cấp.",
            ko: "전형적인 증상은 오른쪽 윗배나 윗배 가운데에서 지속되는 통증으로, 기름지거나 푸짐한 식사 후에 흔히 나타나며, 때로는 등이나 오른쪽 어깨뼈로 퍼집니다. 발작은 30분에서 몇 시간까지 지속될 수 있고 메스꺼움이나 구토를 동반할 수 있습니다. 발열, 오한, 피부와 눈이 노랗게 변하는 황달은 담관 폐쇄나 감염을 시사하며 긴급한 진료가 필요합니다.",
            ar: "العَرَض التقليدي ألم متواصل في أعلى البطن الأيمن أو أعلى وسطه، غالبًا بعد وجبة ثقيلة أو دسمة، وقد يمتد أحيانًا إلى الظهر أو لوح الكتف الأيمن. وقد تستمر النوبات من ثلاثين دقيقة إلى عدة ساعات، وقد يصاحبها غثيان أو قيء. أما الحمى أو القشعريرة أو اصفرار الجلد والعينين (اليرقان) فتشير إلى انسداد قناة أو عدوى وتستدعي عناية عاجلة.",
          },
        ],
      },
      {
        heading: {
          en: "How gallstones are diagnosed",
          es: "Cómo se diagnostican los cálculos biliares",
          vi: "Chẩn đoán sỏi mật bằng cách nào",
          ko: "담석의 진단 방법",
          ar: "كيف تُشخَّص حصوات المرارة",
        },
        paragraphs: [
          {
            en: "An abdominal ultrasound is usually the first test; it is painless and shows most gallbladder stones clearly. Blood tests help look for inflammation, infection, or a blocked bile duct. When a stone is suspected in the bile duct itself, additional imaging — such as an MRI of the bile ducts or an endoscopic ultrasound — may be recommended.",
            es: "Una ecografía abdominal suele ser la primera prueba; no causa dolor y muestra con claridad la mayoría de los cálculos de la vesícula. Los análisis de sangre ayudan a buscar inflamación, infección o un conducto biliar bloqueado. Cuando se sospecha que hay un cálculo en el propio conducto biliar, pueden recomendarse imágenes adicionales, como una resonancia magnética de las vías biliares o un ultrasonido endoscópico.",
            vi: "Siêu âm bụng thường là xét nghiệm đầu tiên; không gây đau và cho thấy rõ hầu hết sỏi trong túi mật. Xét nghiệm máu giúp tìm dấu hiệu viêm, nhiễm trùng hoặc tắc ống mật. Khi nghi ngờ có sỏi nằm ngay trong ống mật, bác sĩ có thể đề nghị chụp thêm hình ảnh — như chụp cộng hưởng từ đường mật hoặc siêu âm nội soi.",
            ko: "복부 초음파가 대개 첫 번째 검사입니다. 통증이 없고 대부분의 담낭 담석을 선명하게 보여 줍니다. 혈액 검사는 염증, 감염, 담관 폐쇄를 확인하는 데 도움이 됩니다. 담관 자체에 담석이 있는 것으로 의심되면 담관 MRI나 내시경 초음파 같은 추가 영상 검사를 권장할 수 있습니다.",
            ar: "عادةً ما يكون تصوير البطن بالموجات فوق الصوتية أول فحص؛ فهو غير مؤلم ويُظهر معظم حصوات المرارة بوضوح. وتساعد تحاليل الدم في البحث عن التهاب أو عدوى أو انسداد في القناة الصفراوية. وعند الاشتباه في وجود حصاة داخل القناة الصفراوية نفسها، قد يُوصى بتصوير إضافي — مثل التصوير بالرنين المغناطيسي للقنوات الصفراوية أو التصوير بالموجات فوق الصوتية عبر المنظار.",
          },
        ],
      },
      {
        heading: {
          en: "Treatment approaches",
          es: "Opciones de tratamiento",
          vi: "Các phương pháp điều trị",
          ko: "치료 방법",
          ar: "طرق العلاج",
        },
        paragraphs: [
          {
            en: "Gallstones found by chance that cause no symptoms usually need no treatment. For stones that cause attacks, the standard treatment is surgical removal of the gallbladder, most often done through small incisions; the body digests food well without a gallbladder. A stone lodged in the bile duct can usually be removed without surgery, using an endoscopic procedure called ERCP.",
            es: "Los cálculos que se encuentran por casualidad y no causan síntomas generalmente no necesitan tratamiento. Para los que causan ataques, el tratamiento estándar es la extirpación quirúrgica de la vesícula, casi siempre a través de pequeñas incisiones; el cuerpo digiere bien los alimentos sin la vesícula. Un cálculo atascado en el conducto biliar por lo general puede extraerse sin cirugía mediante un procedimiento endoscópico llamado CPRE.",
            vi: "Sỏi mật phát hiện tình cờ và không gây triệu chứng thường không cần điều trị. Với sỏi gây ra các cơn đau, phương pháp điều trị tiêu chuẩn là phẫu thuật cắt túi mật, thường thực hiện qua các vết mổ nhỏ; cơ thể vẫn tiêu hóa thức ăn tốt khi không còn túi mật. Sỏi kẹt trong ống mật thường có thể được lấy ra mà không cần phẫu thuật, bằng một thủ thuật nội soi gọi là ERCP.",
            ko: "우연히 발견되었고 증상이 없는 담석은 대개 치료가 필요 없습니다. 발작을 일으키는 담석의 표준 치료는 담낭을 수술로 제거하는 것으로, 대부분 작은 절개로 시행합니다. 담낭이 없어도 몸은 음식을 잘 소화합니다. 담관에 박힌 담석은 보통 ERCP라는 내시경 시술로 수술 없이 제거할 수 있습니다.",
            ar: "الحصوات التي تُكتشف مصادفة ولا تسبب أعراضًا لا تحتاج عادةً إلى علاج. أما الحصوات المسببة للنوبات، فالعلاج القياسي هو الاستئصال الجراحي للمرارة، ويُجرى في الغالب عبر شقوق صغيرة؛ ويهضم الجسم الطعام جيدًا من دون المرارة. والحصاة المنحشرة في القناة الصفراوية يمكن عادةً إزالتها دون جراحة، بإجراء تنظيري يُسمى ERCP.",
          },
        ],
      },
      {
        heading: {
          en: "When to contact a gastroenterologist",
          es: "Cuándo consultar a un gastroenterólogo",
          vi: "Khi nào cần đến gặp bác sĩ chuyên khoa tiêu hóa",
          ko: "소화기내과 전문의와 상담해야 할 때",
          ar: "متى تراجع طبيب الجهاز الهضمي",
        },
        paragraphs: [
          {
            en: "Make an appointment if you have repeated episodes of upper abdominal pain after meals, especially with nausea. Seek emergency care for pain that does not ease after several hours, or for pain with fever, chills, persistent vomiting, or jaundice — these can signal a blocked duct, an infected gallbladder, or pancreatitis.",
            es: "Haga una cita si tiene episodios repetidos de dolor en la parte superior del abdomen después de las comidas, sobre todo con náuseas. Busque atención de emergencia si el dolor no cede después de varias horas, o si se acompaña de fiebre, escalofríos, vómitos persistentes o ictericia — pueden ser señales de un conducto bloqueado, una vesícula infectada o una pancreatitis.",
            vi: "Hãy đặt lịch khám nếu quý vị có những cơn đau vùng bụng trên lặp đi lặp lại sau bữa ăn, nhất là kèm buồn nôn. Hãy đi cấp cứu nếu cơn đau không dịu sau vài giờ, hoặc đau kèm sốt, ớn lạnh, nôn kéo dài hoặc vàng da — đây có thể là dấu hiệu của ống mật bị tắc, túi mật nhiễm trùng hoặc viêm tụy.",
            ko: "식사 후 윗배 통증이 반복되면, 특히 메스꺼움을 동반하면 진료 예약을 하십시오. 통증이 몇 시간이 지나도 가라앉지 않거나, 발열, 오한, 지속적인 구토, 황달을 동반하면 응급 진료를 받으십시오. 담관 폐쇄, 담낭 감염, 췌장염의 신호일 수 있습니다.",
            ar: "حدد موعدًا إذا كانت لديك نوبات متكررة من ألم أعلى البطن بعد الوجبات، لا سيما مع الغثيان. واطلب الرعاية الطارئة إذا لم يخف الألم بعد عدة ساعات، أو إذا صاحبته حمى أو قشعريرة أو قيء مستمر أو يرقان — فقد تدل هذه على انسداد قناة، أو التهاب المرارة، أو التهاب البنكرياس.",
          },
        ],
      },
    ],
    relatedDocId: "info-gallstones",
  },
  {
    slug: "hemochromatosis",
    group: "conditions",
    title: {
      en: "Hemochromatosis",
      es: "Hemocromatosis",
      vi: "Bệnh thừa sắt (hemochromatosis)",
      ko: "혈색소증",
      ar: "داء ترسّب الأصبغة الدموية (فرط حِمل الحديد)",
    },
    summary: {
      en: "Hemochromatosis causes the body to store too much iron, which can quietly damage the liver and other organs over many years. Learn who should be tested and how it is treated.",
      es: "La hemocromatosis hace que el cuerpo almacene demasiado hierro, lo que puede dañar silenciosamente el hígado y otros órganos con los años. Conozca quiénes deben hacerse la prueba y cómo se trata.",
      vi: "Bệnh thừa sắt khiến cơ thể tích trữ quá nhiều sắt, có thể âm thầm gây tổn thương gan và các cơ quan khác qua nhiều năm. Tìm hiểu ai nên đi xét nghiệm và bệnh được điều trị ra sao.",
      ko: "혈색소증은 몸에 철분이 지나치게 축적되게 하여 여러 해에 걸쳐 간과 다른 장기를 소리 없이 손상시킬 수 있습니다. 누가 검사를 받아야 하는지, 어떻게 치료하는지 알아보십시오.",
      ar: "يجعل داء ترسّب الأصبغة الدموية الجسم يخزّن كمية مفرطة من الحديد، ما قد يُلحق ضررًا صامتًا بالكبد وأعضاء أخرى على مدى سنوات. تعرَّف على من ينبغي له إجراء الفحص وكيفية العلاج.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Hemochromatosis is a condition in which the body absorbs and stores too much iron. The most common form is inherited and runs in families.",
            es: "La hemocromatosis es una condición en la que el cuerpo absorbe y almacena demasiado hierro. La forma más común es hereditaria y se presenta en familias.",
            vi: "Bệnh thừa sắt là tình trạng cơ thể hấp thu và tích trữ quá nhiều sắt. Dạng phổ biến nhất là do di truyền và xuất hiện trong gia đình.",
            ko: "혈색소증은 몸이 철분을 지나치게 흡수하고 저장하는 질환입니다. 가장 흔한 형태는 유전성으로, 가족 내에서 대물림됩니다.",
            ar: "داء ترسّب الأصبغة الدموية حالة يمتص فيها الجسم كمية مفرطة من الحديد ويخزّنها. وأكثر أشكاله شيوعًا وراثيّ وينتقل في العائلات.",
          },
          {
            en: "Over many years, the extra iron builds up in organs — especially the liver, but also the heart, pancreas, joints, and skin — and can damage them. Found early, hemochromatosis is one of the most treatable causes of liver disease.",
            es: "Con el paso de los años, el exceso de hierro se acumula en los órganos — especialmente el hígado, pero también el corazón, el páncreas, las articulaciones y la piel — y puede dañarlos. Detectada a tiempo, la hemocromatosis es una de las causas de enfermedad hepática más tratables.",
            vi: "Qua nhiều năm, lượng sắt dư thừa tích tụ trong các cơ quan — đặc biệt là gan, nhưng cả tim, tụy, khớp và da — và có thể gây tổn thương. Nếu được phát hiện sớm, bệnh thừa sắt là một trong những nguyên nhân gây bệnh gan dễ điều trị nhất.",
            ko: "여러 해에 걸쳐 과잉 철분이 장기에 쌓입니다. 특히 간에 많이 쌓이지만 심장, 췌장, 관절, 피부에도 축적되어 손상을 일으킬 수 있습니다. 조기에 발견하면 혈색소증은 간 질환의 원인 중 가장 치료가 잘 되는 축에 속합니다.",
            ar: "على مدى سنوات كثيرة يتراكم الحديد الزائد في الأعضاء — لا سيما الكبد، وكذلك القلب والبنكرياس والمفاصل والجلد — وقد يُلحق بها الضرر. وإذا اكتُشف مبكرًا، فإن هذا الداء من أكثر أسباب أمراض الكبد قابلية للعلاج.",
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
            en: "Early hemochromatosis often causes no symptoms; many people are found through routine blood work or family screening. When symptoms appear, they are often general: fatigue, joint aches (classically in the knuckles), and abdominal discomfort. Later signs can include a bronze or gray skin tone, diabetes, heart problems, or evidence of liver disease. Because these changes develop slowly, the diagnosis is easy to miss without testing.",
            es: "En sus etapas tempranas, la hemocromatosis a menudo no causa síntomas; muchas personas se detectan por análisis de sangre de rutina o por estudios familiares. Cuando aparecen síntomas, suelen ser generales: fatiga, dolores articulares (clásicamente en los nudillos) y molestias abdominales. Los signos más tardíos pueden incluir un tono de piel bronceado o grisáceo, diabetes, problemas cardíacos o señales de enfermedad hepática. Como estos cambios se desarrollan lentamente, el diagnóstico es fácil de pasar por alto sin pruebas.",
            vi: "Ở giai đoạn sớm, bệnh thừa sắt thường không gây triệu chứng; nhiều người được phát hiện qua xét nghiệm máu định kỳ hoặc tầm soát gia đình. Khi triệu chứng xuất hiện, chúng thường chung chung: mệt mỏi, đau nhức khớp (điển hình ở các khớp ngón tay) và khó chịu ở bụng. Các dấu hiệu muộn hơn có thể gồm da ngả màu đồng hoặc xám, tiểu đường, bệnh tim, hoặc dấu hiệu bệnh gan. Vì những thay đổi này diễn tiến chậm, chẩn đoán rất dễ bị bỏ sót nếu không xét nghiệm.",
            ko: "초기 혈색소증은 증상이 없는 경우가 많으며, 상당수는 정기 혈액 검사나 가족 선별 검사에서 발견됩니다. 증상이 나타나더라도 피로, 관절통(전형적으로 손가락 관절), 복부 불편감처럼 일반적인 경우가 많습니다. 후기 징후로는 청동색이나 회색으로 변한 피부, 당뇨병, 심장 질환, 간 질환의 소견이 있을 수 있습니다. 이런 변화는 서서히 진행되므로 검사 없이는 진단을 놓치기 쉽습니다.",
            ar: "غالبًا لا يسبب داء ترسّب الأصبغة الدموية المبكر أعراضًا؛ ويُكتشف كثيرون عبر تحاليل الدم الروتينية أو فحص أفراد العائلة. وعندما تظهر الأعراض تكون عامة في الغالب: تعب، وآلام في المفاصل (في مفاصل أصابع اليد عادةً)، وانزعاج في البطن. وقد تشمل العلامات المتأخرة لونًا برونزيًا أو رماديًا للجلد، أو السكري، أو مشكلات قلبية، أو دلائل على مرض كبدي. ولأن هذه التغيّرات تتطور ببطء، يسهل إغفال التشخيص من دون فحوصات.",
          },
        ],
      },
      {
        heading: {
          en: "How it is diagnosed",
          es: "Cómo se diagnostica",
          vi: "Chẩn đoán bằng cách nào",
          ko: "진단 방법",
          ar: "كيف يُشخَّص",
        },
        paragraphs: [
          {
            en: "Diagnosis starts with blood tests that measure iron, usually ferritin and transferrin saturation. If these are elevated, a genetic test can confirm the inherited form. Your doctor may also check liver blood tests and use imaging — such as a specialized MRI or an elastography scan — to estimate iron buildup and look for scarring. Because the condition is inherited, close relatives of a person with hemochromatosis are usually advised to be tested as well.",
            es: "El diagnóstico comienza con análisis de sangre que miden el hierro, generalmente la ferritina y la saturación de transferrina. Si están elevadas, una prueba genética puede confirmar la forma hereditaria. Su médico también puede revisar las pruebas hepáticas en sangre y usar imágenes — como una resonancia magnética especializada o una elastografía — para estimar la acumulación de hierro y buscar cicatrización. Como la condición es hereditaria, generalmente se aconseja que los familiares cercanos de una persona con hemocromatosis también se hagan la prueba.",
            vi: "Chẩn đoán bắt đầu bằng các xét nghiệm máu đo lượng sắt, thường là ferritin và độ bão hòa transferrin. Nếu các chỉ số này tăng cao, xét nghiệm di truyền có thể xác nhận dạng di truyền của bệnh. Bác sĩ cũng có thể kiểm tra xét nghiệm máu về gan và dùng chẩn đoán hình ảnh — như chụp cộng hưởng từ chuyên biệt hoặc đo đàn hồi gan — để ước lượng mức tích tụ sắt và tìm sẹo gan. Vì bệnh có tính di truyền, người thân gần của người mắc bệnh thừa sắt thường cũng được khuyên đi xét nghiệm.",
            ko: "진단은 철분을 측정하는 혈액 검사, 보통 페리틴과 트랜스페린 포화도 검사로 시작합니다. 수치가 높으면 유전자 검사로 유전형을 확인할 수 있습니다. 의사는 간 혈액 검사를 확인하고, 특수 MRI나 간 탄성도 검사 같은 영상 검사로 철분 축적 정도를 추정하고 흉터(섬유화)를 살펴볼 수도 있습니다. 유전 질환이므로 혈색소증 환자의 가까운 친척도 대개 검사를 받도록 권고됩니다.",
            ar: "يبدأ التشخيص بتحاليل دم تقيس الحديد، عادةً الفيريتين ونسبة تشبّع الترانسفيرين. فإذا كانت مرتفعة، أمكن لاختبار جيني تأكيد الشكل الوراثي. وقد يفحص طبيبك أيضًا تحاليل الكبد الدموية ويستخدم التصوير — مثل رنين مغناطيسي متخصص أو فحص قياس مرونة الكبد — لتقدير تراكم الحديد والبحث عن تندّب. ولأن الحالة وراثية، يُنصح عادةً أن يخضع أقارب المصاب المقرّبون للفحص أيضًا.",
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
            en: "Treatment is straightforward: blood is removed at regular intervals, a process called therapeutic phlebotomy that feels much like donating blood. Each session removes iron along with the blood, and over months the body's iron stores come back toward normal. After that, maintenance sessions a few times a year usually keep iron in a safe range.",
            es: "El tratamiento es sencillo: se extrae sangre a intervalos regulares, un proceso llamado flebotomía terapéutica que se siente muy parecido a donar sangre. Cada sesión elimina hierro junto con la sangre y, con el paso de los meses, las reservas de hierro del cuerpo vuelven hacia lo normal. Después, las sesiones de mantenimiento unas cuantas veces al año suelen mantener el hierro en un rango seguro.",
            vi: "Việc điều trị khá đơn giản: máu được rút ra theo định kỳ, một quy trình gọi là trích máu điều trị, cảm giác rất giống hiến máu. Mỗi lần trích máu sẽ loại bỏ sắt cùng với máu, và qua nhiều tháng, lượng sắt dự trữ của cơ thể trở về gần mức bình thường. Sau đó, các buổi trích máu duy trì vài lần mỗi năm thường giữ được sắt trong ngưỡng an toàn.",
            ko: "치료는 간단합니다. 정기적으로 피를 뽑는 치료적 사혈이라는 과정으로, 헌혈과 매우 비슷하게 느껴집니다. 매 회차마다 혈액과 함께 철분이 제거되며, 몇 달에 걸쳐 몸의 철분 저장량이 정상 수준으로 돌아옵니다. 그 후에는 연간 몇 차례의 유지 사혈로 대개 철분을 안전한 범위로 유지할 수 있습니다.",
            ar: "العلاج بسيط ومباشر: يُسحب الدم على فترات منتظمة، في عملية تُسمى الفصادة العلاجية تشبه إلى حد كبير التبرع بالدم. وتزيل كل جلسة الحديد مع الدم، وعلى مدى أشهر تعود مخازن الحديد في الجسم نحو المعدل الطبيعي. بعد ذلك، تكفي عادةً جلسات صيانة بضع مرات في السنة لإبقاء الحديد في نطاق آمن.",
          },
          {
            en: "People with hemochromatosis are generally advised to avoid iron and high-dose vitamin C supplements, limit alcohol, and avoid eating raw shellfish, which carries a particular infection risk when body iron is high.",
            es: "A las personas con hemocromatosis generalmente se les aconseja evitar los suplementos de hierro y las dosis altas de vitamina C, limitar el alcohol y no comer mariscos crudos, que representan un riesgo particular de infección cuando el hierro corporal está alto.",
            vi: "Người mắc bệnh thừa sắt thường được khuyên tránh các thực phẩm bổ sung sắt và vitamin C liều cao, hạn chế rượu bia, và không ăn hải sản có vỏ còn sống, vì loại thực phẩm này mang nguy cơ nhiễm trùng đặc biệt khi lượng sắt trong cơ thể cao.",
            ko: "혈색소증이 있는 사람은 일반적으로 철분제와 고용량 비타민 C 보충제를 피하고, 술을 제한하며, 날 조개류를 먹지 않도록 권고받습니다. 몸의 철분이 높을 때 날 조개류는 특히 감염 위험이 크기 때문입니다.",
            ar: "يُنصح المصابون بهذا الداء عمومًا بتجنب مكملات الحديد وجرعات فيتامين C العالية، والحد من الكحول، وتجنب أكل المحار النيء الذي يحمل خطر عدوى خاصًا عندما يكون حديد الجسم مرتفعًا.",
          },
        ],
      },
      {
        heading: {
          en: "When to contact a gastroenterologist",
          es: "Cuándo consultar a un gastroenterólogo",
          vi: "Khi nào cần đến gặp bác sĩ chuyên khoa tiêu hóa",
          ko: "소화기내과 전문의와 상담해야 할 때",
          ar: "متى تراجع طبيب الجهاز الهضمي",
        },
        paragraphs: [
          {
            en: "See a doctor if blood work shows high iron or ferritin, if a close relative has hemochromatosis, or if you have unexplained fatigue, joint pain, and abnormal liver tests together. A gastroenterologist can confirm the diagnosis, check whether the liver has been affected, and set up a treatment and monitoring plan.",
            es: "Consulte a un médico si sus análisis muestran hierro o ferritina elevados, si un familiar cercano tiene hemocromatosis, o si presenta a la vez fatiga inexplicada, dolor articular y pruebas hepáticas anormales. Un gastroenterólogo puede confirmar el diagnóstico, revisar si el hígado se ha visto afectado y establecer un plan de tratamiento y seguimiento.",
            vi: "Hãy đi khám nếu xét nghiệm máu cho thấy sắt hoặc ferritin cao, nếu có người thân gần mắc bệnh thừa sắt, hoặc nếu quý vị đồng thời bị mệt mỏi không rõ nguyên nhân, đau khớp và xét nghiệm gan bất thường. Bác sĩ chuyên khoa tiêu hóa có thể xác nhận chẩn đoán, kiểm tra xem gan đã bị ảnh hưởng chưa và lập kế hoạch điều trị cùng theo dõi.",
            ko: "혈액 검사에서 철분이나 페리틴이 높게 나오거나, 가까운 친척이 혈색소증을 앓고 있거나, 원인 모를 피로와 관절통에 간 수치 이상까지 함께 나타난다면 진료를 받으십시오. 소화기내과 전문의가 진단을 확정하고, 간이 영향을 받았는지 확인하며, 치료와 추적 관찰 계획을 세워 드릴 수 있습니다.",
            ar: "راجع الطبيب إذا أظهرت تحاليلك ارتفاع الحديد أو الفيريتين، أو إذا كان أحد أقاربك المقرّبين مصابًا بداء ترسّب الأصبغة الدموية، أو إذا اجتمع لديك تعب غير مفسَّر وألم مفصلي وتحاليل كبد غير طبيعية. ويمكن لطبيب الجهاز الهضمي تأكيد التشخيص، والتحقق مما إذا كان الكبد قد تأثر، ووضع خطة للعلاج والمتابعة.",
          },
        ],
      },
    ],
    relatedDocId: "info-hemochromatosis",
  },
  {
    slug: "inflammatory-bowel-disease",
    group: "conditions",
    title: {
      en: "Inflammatory Bowel Disease",
      es: "Enfermedad inflamatoria intestinal",
      vi: "Bệnh viêm ruột (IBD)",
      ko: "염증성 장질환(IBD)",
      ar: "داء الأمعاء الالتهابي (IBD)",
    },
    summary: {
      en: "Inflammatory bowel disease — Crohn's disease and ulcerative colitis — causes ongoing inflammation in the digestive tract. Learn how it differs from IBS, how it is diagnosed, and how it is treated and monitored.",
      es: "La enfermedad inflamatoria intestinal — la enfermedad de Crohn y la colitis ulcerosa — causa inflamación continua en el tubo digestivo. Conozca en qué se diferencia del intestino irritable, cómo se diagnostica y cómo se trata y se le da seguimiento.",
      vi: "Bệnh viêm ruột — bệnh Crohn và viêm loét đại tràng — gây viêm kéo dài trong ống tiêu hóa. Tìm hiểu bệnh khác với hội chứng ruột kích thích ra sao, cách chẩn đoán, cách điều trị và theo dõi.",
      ko: "염증성 장질환 — 크론병과 궤양성 대장염 — 은 소화관에 지속적인 염증을 일으킵니다. 과민성 장증후군과 어떻게 다른지, 어떻게 진단하고 치료하며 관리하는지 알아보십시오.",
      ar: "يسبب داء الأمعاء الالتهابي — داء كرون (Crohn) والتهاب القولون التقرحي — التهابًا مستمرًا في القناة الهضمية. تعرَّف على اختلافه عن القولون العصبي، وكيفية تشخيصه، وكيفية علاجه ومتابعته.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Inflammatory bowel disease (IBD) is the name for a group of chronic conditions in which the immune system causes ongoing inflammation in the digestive tract. The two main types are Crohn's disease, which can affect any part of the tract from mouth to anus, and ulcerative colitis, which affects the colon and rectum.",
            es: "La enfermedad inflamatoria intestinal (EII) es el nombre de un grupo de condiciones crónicas en las que el sistema inmunitario causa una inflamación continua en el tubo digestivo. Los dos tipos principales son la enfermedad de Crohn, que puede afectar cualquier parte del tubo digestivo desde la boca hasta el ano, y la colitis ulcerosa, que afecta el colon y el recto.",
            vi: "Bệnh viêm ruột (IBD) là tên gọi của một nhóm bệnh mạn tính trong đó hệ miễn dịch gây viêm kéo dài trong ống tiêu hóa. Hai loại chính là bệnh Crohn, có thể ảnh hưởng đến bất kỳ đoạn nào của ống tiêu hóa từ miệng đến hậu môn, và viêm loét đại tràng, ảnh hưởng đến đại tràng và trực tràng.",
            ko: "염증성 장질환(IBD)은 면역계가 소화관에 지속적인 염증을 일으키는 만성 질환군을 부르는 이름입니다. 두 가지 주요 유형은 입에서 항문까지 소화관의 어느 부위든 침범할 수 있는 크론병과, 대장과 직장을 침범하는 궤양성 대장염입니다.",
            ar: "داء الأمعاء الالتهابي (IBD) هو اسم لمجموعة من الحالات المزمنة يسبب فيها جهاز المناعة التهابًا مستمرًا في القناة الهضمية. ونوعاه الرئيسيان هما داء كرون، الذي يمكن أن يصيب أي جزء من القناة من الفم إلى الشرج، والتهاب القولون التقرحي، الذي يصيب القولون والمستقيم.",
          },
          {
            en: "IBD is different from irritable bowel syndrome (IBS), which can cause similar discomfort but does not produce inflammation or visible damage. IBD tends to alternate between flare-ups and quieter periods called remission.",
            es: "La EII es diferente del síndrome de intestino irritable (SII), que puede causar molestias parecidas pero no produce inflamación ni daño visible. La EII tiende a alternar entre brotes y períodos más tranquilos llamados remisión.",
            vi: "IBD khác với hội chứng ruột kích thích (IBS), vốn có thể gây khó chịu tương tự nhưng không gây viêm hay tổn thương nhìn thấy được. IBD có xu hướng xen kẽ giữa các đợt bùng phát và những giai đoạn yên ắng hơn gọi là lui bệnh.",
            ko: "IBD는 과민성 장증후군(IBS)과 다릅니다. IBS는 비슷한 불편을 일으킬 수 있지만 염증이나 눈에 보이는 손상을 만들지 않습니다. IBD는 증상이 심해지는 악화기와 완화(관해)라고 하는 잠잠한 시기가 번갈아 나타나는 경향이 있습니다.",
            ar: "يختلف داء الأمعاء الالتهابي عن متلازمة القولون المتهيج (IBS) التي قد تسبب انزعاجًا مشابهًا لكنها لا تُحدث التهابًا ولا ضررًا مرئيًا. ويميل داء الأمعاء الالتهابي إلى التناوب بين نوبات اشتداد وفترات أهدأ تُسمى الهدأة.",
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
            en: "Typical symptoms include diarrhea that persists for weeks, abdominal pain and cramping, blood in the stool, urgency, fatigue, and unintended weight loss. Some people also have symptoms outside the gut, such as joint pain, skin problems, or eye irritation. Symptoms vary widely from person to person and can change over time.",
            es: "Los síntomas típicos incluyen diarrea que persiste durante semanas, dolor abdominal y cólicos, sangre en las heces, urgencia para evacuar, fatiga y pérdida de peso involuntaria. Algunas personas también tienen síntomas fuera del intestino, como dolor en las articulaciones, problemas de la piel o irritación de los ojos. Los síntomas varían mucho de una persona a otra y pueden cambiar con el tiempo.",
            vi: "Các triệu chứng điển hình gồm tiêu chảy kéo dài hàng tuần, đau bụng và đau quặn, máu trong phân, mót đi tiêu gấp, mệt mỏi và sụt cân không chủ ý. Một số người còn có triệu chứng ngoài đường ruột, như đau khớp, vấn đề về da hoặc kích ứng mắt. Triệu chứng khác nhau rất nhiều giữa người này với người khác và có thể thay đổi theo thời gian.",
            ko: "전형적인 증상으로는 몇 주씩 지속되는 설사, 복통과 복부 경련, 혈변, 급박한 변의, 피로, 의도하지 않은 체중 감소가 있습니다. 관절통, 피부 문제, 눈 자극처럼 장 밖의 증상이 나타나는 사람도 있습니다. 증상은 사람마다 크게 다르며 시간이 지나면서 변할 수 있습니다.",
            ar: "تشمل الأعراض النمطية إسهالًا يستمر أسابيع، وألمًا ومغصًا في البطن، ودمًا في البراز، وإلحاحًا في التبرز، وتعبًا، وفقدان وزن غير مقصود. ولدى بعض المصابين أعراض خارج الأمعاء أيضًا، مثل ألم المفاصل أو مشكلات الجلد أو تهيّج العين. وتتفاوت الأعراض كثيرًا من شخص لآخر وقد تتغير مع الوقت.",
          },
        ],
      },
      {
        heading: {
          en: "How IBD is diagnosed",
          es: "Cómo se diagnostica la EII",
          vi: "Chẩn đoán IBD bằng cách nào",
          ko: "IBD의 진단 방법",
          ar: "كيف يُشخَّص داء الأمعاء الالتهابي",
        },
        paragraphs: [
          {
            en: "There is no single test for IBD. Your gastroenterologist will combine blood tests, stool tests that measure intestinal inflammation, and endoscopy. A colonoscopy with biopsies is the cornerstone: it lets the doctor see the inflammation directly and confirm it under the microscope. Imaging such as CT or MRI is sometimes used to examine parts of the small intestine the scope cannot reach.",
            es: "No existe una sola prueba para la EII. Su gastroenterólogo combinará análisis de sangre, pruebas de heces que miden la inflamación intestinal y endoscopia. La colonoscopia con biopsias es la pieza central: permite al médico ver la inflamación directamente y confirmarla bajo el microscopio. En ocasiones se usan imágenes como la tomografía o la resonancia magnética para examinar partes del intestino delgado que el endoscopio no alcanza.",
            vi: "Không có xét nghiệm đơn lẻ nào cho IBD. Bác sĩ chuyên khoa tiêu hóa sẽ kết hợp xét nghiệm máu, xét nghiệm phân đo mức viêm trong ruột và nội soi. Nội soi đại tràng kèm sinh thiết là nền tảng: cho phép bác sĩ nhìn thấy tình trạng viêm trực tiếp và xác nhận dưới kính hiển vi. Đôi khi cần chẩn đoán hình ảnh như chụp CT hoặc cộng hưởng từ để kiểm tra những đoạn ruột non mà ống nội soi không tới được.",
            ko: "IBD를 진단하는 단일 검사는 없습니다. 소화기내과 전문의는 혈액 검사, 장 염증을 측정하는 대변 검사, 내시경 검사를 종합합니다. 조직검사를 동반한 대장내시경이 핵심입니다. 의사가 염증을 직접 보고 현미경으로 확인할 수 있기 때문입니다. 내시경이 닿지 않는 소장 부위를 살펴보기 위해 CT나 MRI 같은 영상 검사를 쓰기도 합니다.",
            ar: "لا يوجد اختبار واحد لداء الأمعاء الالتهابي. سيجمع طبيب الجهاز الهضمي بين تحاليل الدم، وفحوص البراز التي تقيس التهاب الأمعاء، والتنظير. وتنظير القولون مع الخزعات هو حجر الأساس: إذ يتيح للطبيب رؤية الالتهاب مباشرة وتأكيده تحت المجهر. ويُستخدم التصوير مثل الأشعة المقطعية أو الرنين المغناطيسي أحيانًا لفحص أجزاء الأمعاء الدقيقة التي لا يبلغها المنظار.",
          },
        ],
      },
      {
        heading: {
          en: "Treatment approaches",
          es: "Opciones de tratamiento",
          vi: "Các phương pháp điều trị",
          ko: "치료 방법",
          ar: "طرق العلاج",
        },
        paragraphs: [
          {
            en: "Treatment aims to calm the inflammation, relieve symptoms, and keep the disease in remission. Options range from anti-inflammatory and immune-modulating medicines to newer targeted therapies given as injections or infusions; the right choice depends on the type, location, and severity of your disease.",
            es: "El tratamiento busca calmar la inflamación, aliviar los síntomas y mantener la enfermedad en remisión. Las opciones van desde medicamentos antiinflamatorios e inmunomoduladores hasta terapias dirigidas más recientes que se administran en inyecciones o infusiones; la elección correcta depende del tipo, la ubicación y la gravedad de su enfermedad.",
            vi: "Việc điều trị nhằm làm dịu viêm, giảm triệu chứng và giữ bệnh trong giai đoạn lui bệnh. Các lựa chọn trải từ thuốc kháng viêm và thuốc điều hòa miễn dịch đến các liệu pháp nhắm trúng đích mới hơn dùng đường tiêm hoặc truyền; lựa chọn phù hợp tùy thuộc vào loại bệnh, vị trí và mức độ nặng của bệnh.",
            ko: "치료의 목표는 염증을 가라앉히고, 증상을 완화하며, 질환을 관해 상태로 유지하는 것입니다. 항염증제와 면역조절제부터 주사나 수액으로 투여하는 최신 표적 치료제까지 선택지가 다양하며, 올바른 선택은 질환의 유형, 위치, 중증도에 따라 달라집니다.",
            ar: "يهدف العلاج إلى تهدئة الالتهاب وتخفيف الأعراض وإبقاء المرض في حالة هدأة. وتتراوح الخيارات من الأدوية المضادة للالتهاب والمعدِّلة للمناعة إلى علاجات موجّهة أحدث تُعطى حقنًا أو بالتسريب الوريدي؛ ويعتمد الخيار الصحيح على نوع مرضك وموقعه وشدته.",
          },
          {
            en: "Some people eventually need surgery for complications or for disease that no longer responds to medicine. Ongoing monitoring — including colon cancer screening at shorter intervals than usual — is part of long-term care.",
            es: "Algunas personas con el tiempo necesitan cirugía por complicaciones o porque la enfermedad ya no responde a los medicamentos. El seguimiento continuo — que incluye pruebas de detección de cáncer de colon con mayor frecuencia de lo habitual — es parte del cuidado a largo plazo.",
            vi: "Một số người cuối cùng cần phẫu thuật vì biến chứng hoặc vì bệnh không còn đáp ứng với thuốc. Theo dõi liên tục — bao gồm tầm soát ung thư đại tràng với khoảng cách ngắn hơn bình thường — là một phần của việc chăm sóc lâu dài.",
            ko: "일부 환자는 합병증이 생기거나 약물에 더 이상 반응하지 않는 질환 때문에 결국 수술이 필요합니다. 평소보다 짧은 간격의 대장암 선별 검사를 포함한 지속적인 추적 관찰이 장기 관리의 일부입니다.",
            ar: "يحتاج بعض المرضى في نهاية المطاف إلى جراحة بسبب المضاعفات أو لأن المرض لم يعد يستجيب للدواء. وتُعد المراقبة المستمرة — بما فيها فحص الكشف عن سرطان القولون على فترات أقصر من المعتاد — جزءًا من الرعاية طويلة الأمد.",
          },
        ],
      },
      {
        heading: {
          en: "When to contact a gastroenterologist",
          es: "Cuándo consultar a un gastroenterólogo",
          vi: "Khi nào cần đến gặp bác sĩ chuyên khoa tiêu hóa",
          ko: "소화기내과 전문의와 상담해야 할 때",
          ar: "متى تراجع طبيب الجهاز الهضمي",
        },
        paragraphs: [
          {
            en: "See a gastroenterologist for diarrhea that lasts more than a couple of weeks, blood in the stool, bowel movements that wake you at night, or abdominal pain with weight loss. If you already have IBD, contact your care team early during a flare — fever, worsening pain, persistent bleeding, or dehydration should not wait for the next routine visit.",
            es: "Consulte a un gastroenterólogo si tiene diarrea que dura más de un par de semanas, sangre en las heces, evacuaciones que lo despiertan por la noche o dolor abdominal con pérdida de peso. Si ya tiene EII, comuníquese pronto con su equipo de atención durante un brote — la fiebre, el dolor que empeora, el sangrado persistente o la deshidratación no deben esperar a la próxima visita de rutina.",
            vi: "Hãy đến gặp bác sĩ chuyên khoa tiêu hóa nếu tiêu chảy kéo dài hơn vài tuần, có máu trong phân, phải thức dậy ban đêm để đi tiêu, hoặc đau bụng kèm sụt cân. Nếu quý vị đã mắc IBD, hãy liên hệ sớm với đội ngũ chăm sóc khi có đợt bùng phát — sốt, đau nặng lên, chảy máu kéo dài hoặc mất nước không nên chờ đến buổi khám định kỳ tiếp theo.",
            ko: "설사가 2주 이상 지속되거나, 혈변이 있거나, 밤에 배변 때문에 잠에서 깨거나, 복통과 체중 감소가 함께 나타나면 소화기내과 전문의를 찾으십시오. 이미 IBD가 있다면 악화기에는 의료진에게 일찍 연락하십시오. 발열, 심해지는 통증, 지속되는 출혈, 탈수는 다음 정기 진료까지 기다려서는 안 됩니다.",
            ar: "راجع طبيب الجهاز الهضمي عند إسهال يدوم أكثر من أسبوعين، أو دم في البراز، أو تبرز يوقظك ليلًا، أو ألم بطني مع فقدان وزن. وإذا كنت مصابًا بالفعل بداء الأمعاء الالتهابي، فتواصل مع فريق رعايتك مبكرًا أثناء النوبة — فالحمى أو الألم المتفاقم أو النزيف المستمر أو الجفاف أمور لا ينبغي أن تنتظر الزيارة الروتينية التالية.",
          },
        ],
      },
    ],
    relatedDocId: "info-ibd",
  },
  {
    slug: "intestinal-gas",
    group: "conditions",
    title: {
      en: "Intestinal Gas",
      es: "Gases intestinales",
      vi: "Hơi trong ruột",
      ko: "장내 가스",
      ar: "غازات الأمعاء",
    },
    summary: {
      en: "Gas is a normal part of digestion, but bloating and discomfort can interfere with daily life. Learn what causes excess gas, which foods are common triggers, and when symptoms deserve an evaluation.",
      es: "Los gases son una parte normal de la digestión, pero la hinchazón y las molestias pueden interferir con la vida diaria. Conozca qué causa el exceso de gases, qué alimentos suelen provocarlos y cuándo los síntomas merecen una evaluación.",
      vi: "Hơi trong ruột là một phần bình thường của quá trình tiêu hóa, nhưng chướng bụng và khó chịu có thể ảnh hưởng đến sinh hoạt hằng ngày. Tìm hiểu nguyên nhân gây dư hơi, những thức ăn thường gây ra và khi nào triệu chứng cần được thăm khám.",
      ko: "가스는 소화의 정상적인 일부이지만, 복부 팽만감과 불편함은 일상생활에 지장을 줄 수 있습니다. 가스가 과도해지는 원인과 흔한 유발 음식, 어떤 증상에 진찰이 필요한지 알아보십시오.",
      ar: "الغازات جزء طبيعي من الهضم، لكن الانتفاخ والانزعاج قد يتعارضان مع الحياة اليومية. تعرَّف على أسباب زيادة الغازات، والأطعمة الشائعة المسببة لها، ومتى تستحق الأعراض تقييمًا.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Everyone has intestinal gas. It is a normal product of swallowing air and of digestion itself, especially the work bacteria do breaking down food in the colon. Passing gas many times a day is normal.",
            es: "Todas las personas tienen gases intestinales. Son un producto normal de tragar aire y de la propia digestión, especialmente del trabajo que hacen las bacterias al descomponer los alimentos en el colon. Expulsar gases muchas veces al día es normal.",
            vi: "Ai cũng có hơi trong ruột. Đó là sản phẩm bình thường của việc nuốt không khí và của chính quá trình tiêu hóa, nhất là hoạt động của vi khuẩn khi phân giải thức ăn trong đại tràng. Trung tiện nhiều lần trong ngày là điều bình thường.",
            ko: "장내 가스는 누구에게나 있습니다. 공기를 삼키는 것과 소화 과정 자체, 특히 대장에서 세균이 음식을 분해하는 활동에서 생기는 정상적인 산물입니다. 하루에 여러 차례 가스를 배출하는 것은 정상입니다.",
            ar: "غازات الأمعاء موجودة لدى الجميع. فهي ناتج طبيعي عن ابتلاع الهواء وعن الهضم نفسه، ولا سيما عمل البكتيريا في تفكيك الطعام داخل القولون. وإخراج الغازات مرات عديدة في اليوم أمر طبيعي.",
          },
          {
            en: "Gas becomes a medical question when it causes persistent bloating, pain, or embarrassment, or when it appears alongside other digestive changes.",
            es: "Los gases se convierten en un asunto médico cuando causan hinchazón persistente, dolor o vergüenza, o cuando aparecen junto con otros cambios digestivos.",
            vi: "Hơi trong ruột trở thành vấn đề y khoa khi gây chướng bụng kéo dài, đau hoặc ngại ngùng, hoặc khi xuất hiện cùng những thay đổi tiêu hóa khác.",
            ko: "가스가 지속적인 복부 팽만감, 통증, 곤란함을 일으키거나 다른 소화기 변화와 함께 나타날 때는 의학적으로 살펴볼 문제가 됩니다.",
            ar: "تصبح الغازات مسألة طبية عندما تسبب انتفاخًا مستمرًا أو ألمًا أو إحراجًا، أو عندما تظهر مصحوبة بتغيّرات هضمية أخرى.",
          },
        ],
      },
      {
        heading: {
          en: "Common symptoms and causes",
          es: "Síntomas y causas comunes",
          vi: "Các triệu chứng và nguyên nhân thường gặp",
          ko: "흔한 증상과 원인",
          ar: "الأعراض والأسباب الشائعة",
        },
        paragraphs: [
          {
            en: "Gas-related complaints include belching, bloating, a visibly swollen abdomen, cramping, and passing gas frequently. Common contributors include carbonated drinks, eating quickly, chewing gum, and foods rich in fermentable carbohydrates — beans, lentils, onions, broccoli, cabbage, and some fruits. Milk products cause gas in people with lactose intolerance, and sugar substitutes such as sorbitol are frequent culprits as well.",
            es: "Las molestias relacionadas con los gases incluyen eructos, hinchazón, un abdomen visiblemente distendido, cólicos y expulsión frecuente de gases. Entre los factores comunes están las bebidas gaseosas, comer deprisa, masticar chicle y los alimentos ricos en carbohidratos fermentables — frijoles, lentejas, cebolla, brócoli, repollo y algunas frutas. Los productos lácteos causan gases en personas con intolerancia a la lactosa, y los sustitutos del azúcar como el sorbitol también son culpables frecuentes.",
            vi: "Các phàn nàn liên quan đến hơi gồm ợ hơi, chướng bụng, bụng trướng lên rõ rệt, đau quặn và trung tiện thường xuyên. Những yếu tố góp phần thường gặp gồm đồ uống có ga, ăn nhanh, nhai kẹo cao su và các thức ăn giàu carbohydrate dễ lên men — đậu, đậu lăng, hành, bông cải xanh, bắp cải và một số loại trái cây. Sản phẩm từ sữa gây đầy hơi ở người không dung nạp lactose, và các chất tạo ngọt thay thế đường như sorbitol cũng là thủ phạm thường gặp.",
            ko: "가스 관련 불편으로는 트림, 복부 팽만감, 눈에 띄게 부풀어 오른 배, 복부 경련, 잦은 가스 배출이 있습니다. 흔한 원인으로는 탄산음료, 빨리 먹는 습관, 껌 씹기, 그리고 발효되기 쉬운 탄수화물이 풍부한 음식 — 콩, 렌틸콩, 양파, 브로콜리, 양배추, 일부 과일 — 이 있습니다. 유당불내증이 있는 사람에게는 유제품이 가스를 일으키며, 소르비톨 같은 설탕 대체재도 흔한 원인입니다.",
            ar: "تشمل الشكاوى المتعلقة بالغازات التجشؤ، والانتفاخ، وتمدد البطن الظاهر للعيان، والمغص، وإخراج الغازات كثيرًا. ومن العوامل الشائعة المشروبات الغازية، والأكل بسرعة، ومضغ العلكة، والأطعمة الغنية بالكربوهيدرات القابلة للتخمر — كالفاصوليا والعدس والبصل والبروكلي والملفوف وبعض الفواكه. وتسبب منتجات الحليب الغازات لدى من لديهم عدم تحمّل اللاكتوز، كما أن بدائل السكر مثل السوربيتول من المسببات المتكررة أيضًا.",
          },
        ],
      },
      {
        heading: {
          en: "How gas problems are evaluated",
          es: "Cómo se evalúan los problemas de gases",
          vi: "Đánh giá vấn đề về hơi bằng cách nào",
          ko: "가스 문제는 어떻게 진찰하는가",
          ar: "كيف تُقيَّم مشكلات الغازات",
        },
        paragraphs: [
          {
            en: "Most gas complaints can be evaluated with a careful history, a food and symptom diary, and a physical examination. If symptoms persist or are unusual, your gastroenterologist may check for lactose intolerance or bacterial overgrowth with breath testing, screen for celiac disease with blood work, or recommend imaging or endoscopy when bloating comes with warning signs. The goal is to separate ordinary gas from conditions that can mimic it.",
            es: "La mayoría de las molestias por gases pueden evaluarse con una historia clínica cuidadosa, un diario de alimentos y síntomas, y un examen físico. Si los síntomas persisten o son inusuales, su gastroenterólogo puede buscar intolerancia a la lactosa o sobrecrecimiento bacteriano con pruebas de aliento, descartar enfermedad celíaca con análisis de sangre, o recomendar imágenes o una endoscopia cuando la hinchazón se acompaña de señales de alerta. El objetivo es distinguir los gases comunes de las condiciones que pueden imitarlos.",
            vi: "Hầu hết các phàn nàn về hơi có thể được đánh giá bằng khai thác bệnh sử kỹ lưỡng, nhật ký ăn uống và triệu chứng, cùng khám lâm sàng. Nếu triệu chứng kéo dài hoặc bất thường, bác sĩ chuyên khoa tiêu hóa có thể kiểm tra không dung nạp lactose hoặc vi khuẩn phát triển quá mức bằng xét nghiệm hơi thở, tầm soát bệnh celiac bằng xét nghiệm máu, hoặc đề nghị chẩn đoán hình ảnh hay nội soi khi chướng bụng kèm dấu hiệu cảnh báo. Mục tiêu là phân biệt hơi thông thường với những bệnh lý có thể biểu hiện giống như vậy.",
            ko: "가스 관련 불편은 대부분 면밀한 병력 청취, 음식·증상 일지, 신체 진찰로 평가할 수 있습니다. 증상이 지속되거나 특이하다면 소화기내과 전문의가 호흡 검사로 유당불내증이나 세균 과증식을 확인하고, 혈액 검사로 셀리악병을 선별하며, 팽만감에 경고 신호가 동반될 때는 영상 검사나 내시경을 권할 수 있습니다. 목표는 평범한 가스와 가스처럼 보일 수 있는 질환을 구별하는 것입니다.",
            ar: "يمكن تقييم معظم شكاوى الغازات بتاريخ مرضي دقيق، ومفكرة للطعام والأعراض، وفحص سريري. وإذا استمرت الأعراض أو كانت غير معتادة، فقد يتحقق طبيب الجهاز الهضمي من عدم تحمّل اللاكتوز أو فرط النمو البكتيري باختبارات التنفس، أو يفحص الداء البطني بتحاليل الدم، أو يوصي بالتصوير أو التنظير عندما يصاحب الانتفاخَ علاماتٌ تحذيرية. والهدف هو التمييز بين الغازات العادية والحالات التي قد تحاكيها.",
          },
        ],
      },
      {
        heading: {
          en: "Managing intestinal gas",
          es: "Manejo de los gases intestinales",
          vi: "Kiểm soát hơi trong ruột",
          ko: "장내 가스의 관리",
          ar: "التعامل مع غازات الأمعاء",
        },
        paragraphs: [
          {
            en: "Simple changes help many people: eat more slowly, limit carbonated beverages and gum, and identify trigger foods one at a time rather than cutting out whole food groups at once. Over-the-counter simethicone or enzyme supplements — lactase for dairy, alpha-galactosidase for beans — help some people. If a specific condition such as lactose intolerance, celiac disease, or bacterial overgrowth is found, treating it directly usually improves the gas.",
            es: "Los cambios sencillos ayudan a muchas personas: coma más despacio, limite las bebidas gaseosas y el chicle, e identifique los alimentos desencadenantes uno por uno en lugar de eliminar grupos enteros de alimentos de una vez. La simeticona de venta libre o los suplementos de enzimas — lactasa para los lácteos, alfa-galactosidasa para los frijoles — ayudan a algunas personas. Si se encuentra una condición específica como intolerancia a la lactosa, enfermedad celíaca o sobrecrecimiento bacteriano, tratarla directamente suele mejorar los gases.",
            vi: "Những thay đổi đơn giản giúp ích cho nhiều người: ăn chậm hơn, hạn chế đồ uống có ga và kẹo cao su, và xác định thức ăn gây triệu chứng từng món một thay vì cắt bỏ cả nhóm thực phẩm cùng lúc. Simethicone không kê đơn hoặc thực phẩm bổ sung enzyme — lactase cho sữa, alpha-galactosidase cho đậu — giúp ích cho một số người. Nếu tìm thấy một bệnh lý cụ thể như không dung nạp lactose, bệnh celiac hoặc vi khuẩn phát triển quá mức, điều trị trực tiếp bệnh đó thường cải thiện tình trạng đầy hơi.",
            ko: "간단한 변화가 많은 사람에게 도움이 됩니다. 더 천천히 먹고, 탄산음료와 껌을 줄이고, 식품군 전체를 한꺼번에 끊기보다 유발 음식을 하나씩 찾아내십시오. 일반의약품인 시메티콘이나 효소 보충제 — 유제품에는 락타아제, 콩류에는 알파-갈락토시다아제 — 가 도움이 되는 사람도 있습니다. 유당불내증, 셀리악병, 세균 과증식 같은 특정 질환이 발견되면 그 질환을 직접 치료하는 것이 대개 가스 증상을 개선합니다.",
            ar: "تساعد التغييرات البسيطة كثيرين: كُل بمزيد من التمهل، وقلّل المشروبات الغازية والعلكة، وحدّد الأطعمة المسببة واحدًا تلو الآخر بدلًا من استبعاد مجموعات غذائية كاملة دفعة واحدة. ويستفيد بعض الأشخاص من السيميثيكون المتاح دون وصفة أو مكملات الإنزيمات — اللاكتاز لمنتجات الألبان، والألفا-غالاكتوزيداز للبقوليات. وإذا وُجدت حالة محددة مثل عدم تحمّل اللاكتوز أو الداء البطني أو فرط النمو البكتيري، فإن علاجها مباشرة يحسّن الغازات عادةً.",
          },
        ],
      },
      {
        heading: {
          en: "When to contact a gastroenterologist",
          es: "Cuándo consultar a un gastroenterólogo",
          vi: "Khi nào cần đến gặp bác sĩ chuyên khoa tiêu hóa",
          ko: "소화기내과 전문의와 상담해야 할 때",
          ar: "متى تراجع طبيب الجهاز الهضمي",
        },
        paragraphs: [
          {
            en: "Make an appointment if bloating or gas pain is persistent, worsening, or interfering with daily life, or if changes at home have not helped. Seek evaluation promptly if gas symptoms come with unintended weight loss, blood in the stool, persistent diarrhea, vomiting, fever, or a change in bowel habits — those features point beyond ordinary gas.",
            es: "Haga una cita si la hinchazón o el dolor por gases es persistente, va en aumento o interfiere con su vida diaria, o si los cambios en casa no han ayudado. Busque una evaluación pronto si los gases se acompañan de pérdida de peso involuntaria, sangre en las heces, diarrea persistente, vómitos, fiebre o un cambio en el hábito intestinal — esas características apuntan a algo más que gases comunes.",
            vi: "Hãy đặt lịch khám nếu chướng bụng hoặc đau do hơi kéo dài, nặng dần lên hoặc ảnh hưởng đến sinh hoạt hằng ngày, hoặc nếu các thay đổi tại nhà không giúp ích. Hãy đi khám sớm nếu triệu chứng đầy hơi kèm sụt cân không chủ ý, máu trong phân, tiêu chảy kéo dài, nôn, sốt hoặc thay đổi thói quen đi tiêu — những đặc điểm đó cho thấy vấn đề không chỉ là hơi thông thường.",
            ko: "복부 팽만감이나 가스 통증이 지속되거나, 점점 심해지거나, 일상생활에 지장을 주거나, 집에서의 조치가 효과가 없다면 진료 예약을 하십시오. 가스 증상이 의도하지 않은 체중 감소, 혈변, 지속적인 설사, 구토, 발열, 배변 습관의 변화를 동반하면 신속히 진찰을 받으십시오. 이런 특징은 평범한 가스를 넘어서는 문제를 시사합니다.",
            ar: "حدد موعدًا إذا كان الانتفاخ أو ألم الغازات مستمرًا أو متفاقمًا أو معطِّلًا لحياتك اليومية، أو إذا لم تُجدِ التغييرات المنزلية نفعًا. واطلب التقييم سريعًا إذا صاحبت أعراضَ الغازات فقدانُ وزن غير مقصود، أو دم في البراز، أو إسهال مستمر، أو قيء، أو حمى، أو تغيّر في عادات التبرز — فهذه السمات تشير إلى ما هو أبعد من الغازات العادية.",
          },
        ],
      },
    ],
    relatedDocId: "info-intestinal-gas",
  },
  {
    slug: "liver-disease",
    group: "conditions",
    title: {
      en: "Liver Disease",
      es: "Enfermedad hepática",
      vi: "Bệnh gan",
      ko: "간 질환",
      ar: "أمراض الكبد",
    },
    summary: {
      en: "Liver disease often develops silently, and fatty liver disease is now the most common form. Learn the warning signs, how the liver is checked without surgery, and the steps that protect it.",
      es: "La enfermedad hepática suele desarrollarse en silencio, y el hígado graso es hoy la forma más común. Conozca las señales de alerta, cómo se examina el hígado sin cirugía y las medidas que lo protegen.",
      vi: "Bệnh gan thường tiến triển âm thầm, và gan nhiễm mỡ hiện là dạng phổ biến nhất. Tìm hiểu các dấu hiệu cảnh báo, cách kiểm tra gan không cần phẫu thuật và những biện pháp bảo vệ gan.",
      ko: "간 질환은 대개 소리 없이 진행되며, 지방간 질환이 현재 가장 흔한 형태입니다. 경고 신호와 수술 없이 간을 검사하는 방법, 간을 보호하는 방법을 알아보십시오.",
      ar: "غالبًا ما تتطور أمراض الكبد بصمت، ومرض الكبد الدهني هو اليوم أكثر أشكالها شيوعًا. تعرَّف على العلامات التحذيرية، وكيفية فحص الكبد دون جراحة، والخطوات التي تحميه.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "The liver filters the blood, processes nutrients and medicines, and makes proteins the body needs. Liver disease is any condition that keeps it from doing that work, including fatty liver disease, viral hepatitis, alcohol-related liver disease, and inherited or autoimmune conditions.",
            es: "El hígado filtra la sangre, procesa los nutrientes y los medicamentos, y produce proteínas que el cuerpo necesita. La enfermedad hepática es cualquier condición que le impide hacer ese trabajo, incluidos el hígado graso, las hepatitis virales, la enfermedad hepática por alcohol y las condiciones hereditarias o autoinmunes.",
            vi: "Gan lọc máu, xử lý dưỡng chất và thuốc, và tạo ra các protein mà cơ thể cần. Bệnh gan là bất kỳ tình trạng nào cản trở gan làm công việc đó, bao gồm gan nhiễm mỡ, viêm gan siêu vi, bệnh gan do rượu và các bệnh di truyền hoặc tự miễn.",
            ko: "간은 혈액을 걸러 내고, 영양분과 약물을 처리하며, 몸에 필요한 단백질을 만듭니다. 간 질환이란 이 일을 방해하는 모든 질환을 말하며, 지방간 질환, 바이러스성 간염, 알코올 관련 간 질환, 유전성 또는 자가면역 질환이 이에 포함됩니다.",
            ar: "يرشّح الكبد الدم، ويعالج المغذيات والأدوية، ويصنع بروتينات يحتاجها الجسم. ومرض الكبد هو أي حالة تمنعه من أداء هذا العمل، ومن ذلك مرض الكبد الدهني، والتهابات الكبد الفيروسية، ومرض الكبد المرتبط بالكحول، والحالات الوراثية أو المناعية الذاتية.",
          },
          {
            en: "The most common form today is fatty liver disease, in which extra fat collects in the liver cells. It is closely linked to body weight, diabetes, and cholesterol, and it usually causes no symptoms until it is advanced. When ongoing injury scars the liver, the scarring is called fibrosis; severe, widespread scarring is called cirrhosis.",
            es: "La forma más común hoy en día es el hígado graso, en el que se acumula grasa dentro de las células del hígado. Está estrechamente ligado al peso corporal, la diabetes y el colesterol, y por lo general no causa síntomas hasta que está avanzado. Cuando una lesión continua cicatriza el hígado, esa cicatrización se llama fibrosis; la cicatrización grave y extendida se llama cirrosis.",
            vi: "Dạng phổ biến nhất hiện nay là gan nhiễm mỡ, trong đó mỡ dư thừa tích tụ trong các tế bào gan. Bệnh liên quan chặt chẽ với cân nặng, tiểu đường và cholesterol, và thường không gây triệu chứng cho đến khi đã tiến triển nặng. Khi tổn thương kéo dài làm gan hình thành sẹo, tình trạng sẹo đó gọi là xơ hóa; sẹo nặng và lan rộng gọi là xơ gan.",
            ko: "오늘날 가장 흔한 형태는 간세포에 지방이 과도하게 쌓이는 지방간 질환입니다. 체중, 당뇨병, 콜레스테롤과 밀접하게 연관되어 있으며, 진행되기 전까지는 대개 증상이 없습니다. 지속적인 손상으로 간에 흉터가 생기는 것을 섬유화라고 하며, 심하고 광범위한 흉터를 간경변증이라고 합니다.",
            ar: "أكثر الأشكال شيوعًا اليوم هو مرض الكبد الدهني، حيث تتجمع دهون زائدة داخل خلايا الكبد. وهو وثيق الصلة بوزن الجسم والسكري والكوليسترول، ولا يسبب عادةً أعراضًا حتى يبلغ مرحلة متقدمة. وعندما تُحدث الإصابة المستمرة تندّبًا في الكبد، يُسمى هذا التندّب التليّف؛ أما التندّب الشديد الواسع الانتشار فيُسمى تشمّع الكبد.",
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
            en: "Early liver disease is usually silent, which is why it is often discovered through routine blood work. When signs do appear, they can include fatigue, discomfort in the upper right abdomen, nausea, itching, easy bruising, swelling in the legs or abdomen, and yellowing of the skin or eyes (jaundice). Dark urine and pale stools can also signal a liver or bile duct problem.",
            es: "La enfermedad hepática temprana suele ser silenciosa, y por eso a menudo se descubre en análisis de sangre de rutina. Cuando aparecen señales, pueden incluir fatiga, molestias en la parte superior derecha del abdomen, náuseas, comezón, moretones con facilidad, hinchazón en las piernas o el abdomen, y color amarillento de la piel o los ojos (ictericia). La orina oscura y las heces pálidas también pueden señalar un problema del hígado o de las vías biliares.",
            vi: "Bệnh gan giai đoạn sớm thường không có triệu chứng, vì vậy bệnh hay được phát hiện qua xét nghiệm máu định kỳ. Khi dấu hiệu xuất hiện, có thể gồm mệt mỏi, khó chịu ở vùng bụng trên bên phải, buồn nôn, ngứa, dễ bầm tím, phù chân hoặc bụng, và vàng da hoặc vàng mắt (vàng da). Nước tiểu sẫm màu và phân nhạt màu cũng có thể báo hiệu vấn đề ở gan hoặc đường mật.",
            ko: "초기 간 질환은 대개 증상이 없어 정기 혈액 검사에서 발견되는 경우가 많습니다. 징후가 나타난다면 피로, 오른쪽 윗배의 불편감, 메스꺼움, 가려움, 쉽게 드는 멍, 다리나 복부의 부종, 피부나 눈이 노래지는 황달이 있을 수 있습니다. 짙은 색 소변과 옅은 색 변도 간이나 담관의 문제를 알리는 신호일 수 있습니다.",
            ar: "عادةً ما يكون مرض الكبد المبكر صامتًا، ولهذا يُكتشف غالبًا عبر تحاليل الدم الروتينية. وعندما تظهر العلامات، فقد تشمل التعب، والانزعاج في أعلى البطن الأيمن، والغثيان، والحكة، وسهولة التكدم، وتورّم الساقين أو البطن، واصفرار الجلد أو العينين (اليرقان). كما يمكن أن يدل البول الداكن والبراز الشاحب على مشكلة في الكبد أو القنوات الصفراوية.",
          },
        ],
      },
      {
        heading: {
          en: "How liver disease is evaluated",
          es: "Cómo se evalúa la enfermedad hepática",
          vi: "Đánh giá bệnh gan bằng cách nào",
          ko: "간 질환은 어떻게 진찰하는가",
          ar: "كيف تُقيَّم أمراض الكبد",
        },
        paragraphs: [
          {
            en: "Evaluation usually begins with blood tests that measure liver enzymes and liver function, along with tests for viral hepatitis and other specific causes. An ultrasound is commonly used to look at the liver itself. A painless scan called liver elastography measures the stiffness of the liver to estimate scarring, often avoiding the need for a biopsy; a liver biopsy is reserved for cases where the diagnosis remains unclear.",
            es: "La evaluación suele comenzar con análisis de sangre que miden las enzimas y la función del hígado, junto con pruebas para hepatitis virales y otras causas específicas. Comúnmente se usa una ecografía para observar el hígado. Un estudio sin dolor llamado elastografía hepática mide la rigidez del hígado para estimar la cicatrización, y muchas veces evita la necesidad de una biopsia; la biopsia hepática se reserva para los casos en que el diagnóstico sigue sin estar claro.",
            vi: "Việc đánh giá thường bắt đầu bằng các xét nghiệm máu đo men gan và chức năng gan, cùng các xét nghiệm viêm gan siêu vi và những nguyên nhân cụ thể khác. Siêu âm thường được dùng để quan sát chính lá gan. Một kỹ thuật không đau gọi là đo đàn hồi gan đo độ cứng của gan để ước lượng mức độ sẹo, thường giúp tránh phải sinh thiết; sinh thiết gan được dành cho những trường hợp chẩn đoán vẫn chưa rõ ràng.",
            ko: "진찰은 보통 간 효소와 간 기능을 측정하는 혈액 검사와 함께 바이러스성 간염 및 기타 특정 원인에 대한 검사로 시작합니다. 간 자체를 살펴보는 데는 흔히 초음파를 사용합니다. 간 탄성도 검사라는 통증 없는 검사는 간의 단단한 정도를 측정해 흉터를 추정하며, 조직검사의 필요를 덜어 주는 경우가 많습니다. 간 조직검사는 진단이 여전히 불분명한 경우를 위해 남겨 둡니다.",
            ar: "يبدأ التقييم عادةً بتحاليل دم تقيس إنزيمات الكبد ووظيفته، إلى جانب فحوص لالتهابات الكبد الفيروسية وأسباب محددة أخرى. ويُستخدم التصوير بالموجات فوق الصوتية عادةً للنظر إلى الكبد نفسه. ويقيس فحص غير مؤلم يُسمى قياس مرونة الكبد صلابةَ الكبد لتقدير التندّب، متجنبًا في كثير من الأحيان الحاجة إلى خزعة؛ وتُحفظ خزعة الكبد للحالات التي يبقى فيها التشخيص غير واضح.",
          },
        ],
      },
      {
        heading: {
          en: "Treatment approaches",
          es: "Opciones de tratamiento",
          vi: "Các phương pháp điều trị",
          ko: "치료 방법",
          ar: "طرق العلاج",
        },
        paragraphs: [
          {
            en: "Treatment depends on the cause. For fatty liver disease, the foundation is gradual weight loss through diet and regular physical activity, along with good control of diabetes, blood pressure, and cholesterol; even modest weight loss can reduce the fat in the liver.",
            es: "El tratamiento depende de la causa. Para el hígado graso, la base es una pérdida de peso gradual mediante la alimentación y la actividad física regular, junto con un buen control de la diabetes, la presión arterial y el colesterol; incluso una pérdida de peso modesta puede reducir la grasa en el hígado.",
            vi: "Việc điều trị tùy thuộc vào nguyên nhân. Với gan nhiễm mỡ, nền tảng là giảm cân từ từ qua chế độ ăn và vận động thể chất đều đặn, cùng với kiểm soát tốt tiểu đường, huyết áp và cholesterol; ngay cả giảm cân ở mức vừa phải cũng có thể làm giảm mỡ trong gan.",
            ko: "치료는 원인에 따라 다릅니다. 지방간 질환의 기본은 식이 요법과 규칙적인 신체 활동을 통한 점진적인 체중 감량, 그리고 당뇨병, 혈압, 콜레스테롤의 철저한 관리입니다. 체중을 조금만 줄여도 간의 지방을 줄일 수 있습니다.",
            ar: "يعتمد العلاج على السبب. فبالنسبة لمرض الكبد الدهني، الأساس هو فقدان الوزن التدريجي عبر النظام الغذائي والنشاط البدني المنتظم، مع ضبط جيد للسكري وضغط الدم والكوليسترول؛ وحتى فقدان الوزن المتواضع يمكن أن يقلل الدهون في الكبد.",
          },
          {
            en: "Viral hepatitis can be treated with antiviral medicines. Whatever the cause, limiting alcohol, reviewing all medicines and supplements with your doctor, and staying current on recommended vaccinations help protect the liver. Regular follow-up shows whether the liver is improving or scarring is progressing.",
            es: "Las hepatitis virales pueden tratarse con medicamentos antivirales. Sea cual sea la causa, limitar el alcohol, revisar todos los medicamentos y suplementos con su médico y mantenerse al día con las vacunas recomendadas ayuda a proteger el hígado. El seguimiento regular muestra si el hígado está mejorando o si la cicatrización avanza.",
            vi: "Viêm gan siêu vi có thể điều trị bằng thuốc kháng vi-rút. Dù nguyên nhân là gì, hạn chế rượu bia, rà soát tất cả thuốc và thực phẩm chức năng với bác sĩ, và tiêm ngừa đầy đủ theo khuyến nghị đều giúp bảo vệ gan. Tái khám định kỳ cho biết gan đang cải thiện hay tình trạng sẹo đang tiến triển.",
            ko: "바이러스성 간염은 항바이러스제로 치료할 수 있습니다. 원인이 무엇이든 술을 제한하고, 모든 약과 보충제를 의사와 함께 점검하고, 권장 예방접종을 최신으로 유지하는 것이 간을 보호하는 데 도움이 됩니다. 정기적인 추적 검사를 통해 간이 좋아지고 있는지, 흉터가 진행되고 있는지 확인할 수 있습니다.",
            ar: "يمكن علاج التهابات الكبد الفيروسية بأدوية مضادة للفيروسات. وأيًّا كان السبب، فإن الحد من الكحول، ومراجعة جميع الأدوية والمكملات مع طبيبك، والمواظبة على اللقاحات الموصى بها، كلها تساعد على حماية الكبد. وتُظهر المتابعة المنتظمة ما إذا كان الكبد يتحسن أم أن التندّب يتقدم.",
          },
        ],
      },
      {
        heading: {
          en: "When to contact a gastroenterologist",
          es: "Cuándo consultar a un gastroenterólogo",
          vi: "Khi nào cần đến gặp bác sĩ chuyên khoa tiêu hóa",
          ko: "소화기내과 전문의와 상담해야 할 때",
          ar: "متى تراجع طبيب الجهاز الهضمي",
        },
        paragraphs: [
          {
            en: "See a gastroenterologist if your blood tests show elevated liver enzymes, if imaging shows fat in the liver, or if you have risk factors such as diabetes and have never had your liver checked. Seek care promptly for jaundice, vomiting blood, black stools, new confusion, or rapid swelling of the abdomen — these can signal advanced disease and need urgent attention.",
            es: "Consulte a un gastroenterólogo si sus análisis muestran enzimas hepáticas elevadas, si las imágenes muestran grasa en el hígado, o si tiene factores de riesgo como diabetes y nunca le han revisado el hígado. Busque atención pronto si presenta ictericia, vómito con sangre, heces negras, confusión nueva o hinchazón rápida del abdomen — pueden ser señales de enfermedad avanzada y requieren atención urgente.",
            vi: "Hãy đến gặp bác sĩ chuyên khoa tiêu hóa nếu xét nghiệm máu cho thấy men gan tăng, nếu hình ảnh học cho thấy mỡ trong gan, hoặc nếu quý vị có yếu tố nguy cơ như tiểu đường mà chưa từng kiểm tra gan. Hãy đi khám ngay nếu bị vàng da, nôn ra máu, phân đen, lú lẫn mới xuất hiện, hoặc bụng trướng nhanh — đây có thể là dấu hiệu bệnh đã tiến triển nặng và cần được chăm sóc khẩn cấp.",
            ko: "혈액 검사에서 간 효소 수치가 높게 나오거나, 영상 검사에서 간에 지방이 보이거나, 당뇨병 같은 위험 요인이 있는데 간 검사를 받아 본 적이 없다면 소화기내과 전문의를 찾으십시오. 황달, 피를 토하는 증상, 검은 변, 새로 생긴 의식 혼란, 빠르게 부풀어 오르는 배는 진행된 질환의 신호일 수 있으므로 즉시 진료를 받으십시오.",
            ar: "راجع طبيب الجهاز الهضمي إذا أظهرت تحاليلك ارتفاع إنزيمات الكبد، أو أظهر التصوير دهونًا في الكبد، أو كانت لديك عوامل خطر مثل السكري ولم يُفحص كبدك من قبل. واطلب الرعاية سريعًا عند اليرقان، أو تقيؤ الدم، أو البراز الأسود، أو تشوّش ذهني جديد، أو تورّم سريع في البطن — فقد تدل هذه على مرض متقدم وتستدعي اهتمامًا عاجلًا.",
          },
        ],
      },
    ],
    relatedDocId: "info-liver-disease",
  },
  {
    slug: "rectal-disease",
    group: "conditions",
    title: {
      en: "Rectal Disease",
      es: "Enfermedades rectales",
      vi: "Bệnh trực tràng",
      ko: "직장 질환",
      ar: "أمراض المستقيم",
    },
    summary: {
      en: "Hemorrhoids, fissures, and other rectal conditions are common, uncomfortable, and very treatable. Learn the usual symptoms, why rectal bleeding always deserves evaluation, and what treatment involves.",
      es: "Las hemorroides, las fisuras y otras condiciones rectales son comunes, incómodas y muy tratables. Conozca los síntomas habituales, por qué el sangrado rectal siempre merece evaluación y en qué consiste el tratamiento.",
      vi: "Trĩ, nứt hậu môn và các bệnh trực tràng khác rất phổ biến, gây khó chịu nhưng rất dễ điều trị. Tìm hiểu các triệu chứng thường gặp, vì sao chảy máu trực tràng luôn cần được thăm khám và việc điều trị gồm những gì.",
      ko: "치질, 치열을 비롯한 직장 질환은 흔하고 불편하지만 치료가 잘 됩니다. 흔한 증상과 직장 출혈에 항상 진찰이 필요한 이유, 치료 내용에 대해 알아보십시오.",
      ar: "البواسير والشقوق وغيرها من حالات المستقيم شائعة ومزعجة وقابلة للعلاج إلى حد كبير. تعرَّف على الأعراض المعتادة، ولماذا يستحق نزيف المستقيم التقييم دائمًا، وما الذي يتضمنه العلاج.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "The rectum is the final section of the large intestine, and several common conditions can affect it and the anal area. The most frequent are hemorrhoids — swollen veins that can itch, ache, or bleed — and anal fissures, small tears in the lining that cause sharp pain with bowel movements.",
            es: "El recto es la sección final del intestino grueso, y varias condiciones comunes pueden afectarlo, al igual que a la zona anal. Las más frecuentes son las hemorroides — venas inflamadas que pueden causar comezón, dolor o sangrado — y las fisuras anales, pequeños desgarros en el revestimiento que causan un dolor agudo al evacuar.",
            vi: "Trực tràng là đoạn cuối của ruột già, và một số bệnh phổ biến có thể ảnh hưởng đến trực tràng cùng vùng hậu môn. Thường gặp nhất là trĩ — các tĩnh mạch sưng phồng có thể gây ngứa, đau hoặc chảy máu — và nứt hậu môn, những vết rách nhỏ ở niêm mạc gây đau nhói khi đi tiêu.",
            ko: "직장은 대장의 마지막 부분이며, 여러 흔한 질환이 직장과 항문 부위를 침범할 수 있습니다. 가장 흔한 것은 가렵거나 아프거나 피가 날 수 있는 부풀어 오른 정맥인 치질과, 배변 시 날카로운 통증을 일으키는 점막의 작은 찢어짐인 치열입니다.",
            ar: "المستقيم هو القسم الأخير من الأمعاء الغليظة، ويمكن لعدة حالات شائعة أن تصيبه هو ومنطقة الشرج. وأكثرها تواترًا البواسير — أوردة متورمة قد تسبب حكة أو ألمًا أو نزيفًا — والشقوق الشرجية، وهي تمزقات صغيرة في البطانة تسبب ألمًا حادًا عند التبرز.",
          },
          {
            en: "Other rectal conditions include infections and abscesses, fistulas (abnormal tunnels that can form after an abscess), rectal prolapse, and inflammation of the rectum called proctitis. These problems are common and treatable, and nothing to be embarrassed about discussing with your doctor.",
            es: "Otras condiciones rectales incluyen infecciones y abscesos, fístulas (túneles anormales que pueden formarse después de un absceso), prolapso rectal e inflamación del recto llamada proctitis. Estos problemas son comunes y tratables, y no debe darle pena hablarlos con su médico.",
            vi: "Các bệnh trực tràng khác gồm nhiễm trùng và áp-xe, rò hậu môn (đường hầm bất thường có thể hình thành sau áp-xe), sa trực tràng và viêm trực tràng. Đây là những vấn đề phổ biến và điều trị được, quý vị không có gì phải ngại khi trao đổi với bác sĩ.",
            ko: "그 밖의 직장 질환으로는 감염과 농양, 치루(농양 후 생길 수 있는 비정상적인 통로), 직장 탈출증, 직장염이라고 하는 직장의 염증이 있습니다. 이런 문제는 흔하고 치료할 수 있으므로, 의사와 상의하기를 부끄러워할 일이 전혀 아닙니다.",
            ar: "تشمل حالات المستقيم الأخرى العدوى والخراجات، والنواسير (أنفاق غير طبيعية قد تتكون بعد الخراج)، وتدلي المستقيم، والتهاب المستقيم. وهذه مشكلات شائعة وقابلة للعلاج، ولا داعي للخجل من مناقشتها مع طبيبك.",
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
            en: "Rectal conditions usually announce themselves with bleeding — bright red blood on the toilet paper or in the bowl — pain or burning with bowel movements, itching, swelling or a lump near the anus, mucus discharge, or a feeling of incomplete emptying. Because symptoms of minor conditions overlap with those of more serious ones, including rectal cancer, new or persistent symptoms should be evaluated rather than assumed to be hemorrhoids.",
            es: "Las condiciones rectales suelen manifestarse con sangrado — sangre roja brillante en el papel higiénico o en el inodoro — dolor o ardor al evacuar, comezón, hinchazón o un bulto cerca del ano, secreción de moco o una sensación de vaciado incompleto. Como los síntomas de las condiciones menores se parecen a los de otras más serias, incluido el cáncer de recto, los síntomas nuevos o persistentes deben evaluarse en lugar de asumir que son hemorroides.",
            vi: "Bệnh trực tràng thường biểu hiện bằng chảy máu — máu đỏ tươi trên giấy vệ sinh hoặc trong bồn cầu — đau hoặc rát khi đi tiêu, ngứa, sưng hoặc có khối u gần hậu môn, tiết dịch nhầy, hoặc cảm giác đi tiêu không hết. Vì triệu chứng của các bệnh nhẹ trùng lặp với những bệnh nghiêm trọng hơn, kể cả ung thư trực tràng, các triệu chứng mới hoặc kéo dài cần được thăm khám thay vì mặc định là trĩ.",
            ko: "직장 질환은 대개 출혈 — 휴지나 변기에 묻는 선홍색 피 — 배변 시 통증이나 화끈거림, 가려움, 항문 근처의 부기나 멍울, 점액 분비물, 잔변감으로 나타납니다. 가벼운 질환의 증상이 직장암을 포함한 더 심각한 질환의 증상과 겹치기 때문에, 새로 생기거나 지속되는 증상은 치질이라고 단정하지 말고 진찰을 받아야 합니다.",
            ar: "عادةً ما تعلن حالات المستقيم عن نفسها بنزيف — دم أحمر فاتح على ورق التواليت أو في المرحاض — أو ألم أو حرقة عند التبرز، أو حكة، أو تورّم أو كتلة قرب الشرج، أو إفرازات مخاطية، أو شعور بعدم الإفراغ الكامل. ولأن أعراض الحالات البسيطة تتداخل مع أعراض حالات أخطر، ومنها سرطان المستقيم، ينبغي تقييم الأعراض الجديدة أو المستمرة بدلًا من افتراض أنها بواسير.",
          },
        ],
      },
      {
        heading: {
          en: "How rectal disease is evaluated",
          es: "Cómo se evalúan las enfermedades rectales",
          vi: "Đánh giá bệnh trực tràng bằng cách nào",
          ko: "직장 질환은 어떻게 진찰하는가",
          ar: "كيف تُقيَّم أمراض المستقيم",
        },
        paragraphs: [
          {
            en: "Evaluation typically includes a visual inspection and a gentle digital examination of the area. It may also include anoscopy, a brief office examination of the anal canal with a small instrument. Depending on your age, symptoms, and history, your gastroenterologist may recommend a flexible sigmoidoscopy or a colonoscopy to examine further inside and rule out other sources of bleeding.",
            es: "La evaluación generalmente incluye una inspección visual y un examen digital suave de la zona. También puede incluir una anoscopia, un examen breve del canal anal que se hace en el consultorio con un pequeño instrumento. Según su edad, sus síntomas y sus antecedentes, su gastroenterólogo puede recomendar una sigmoidoscopia flexible o una colonoscopia para examinar más adentro y descartar otras fuentes de sangrado.",
            vi: "Việc đánh giá thường gồm quan sát bên ngoài và thăm khám nhẹ nhàng bằng ngón tay. Cũng có thể gồm soi hậu môn, một thăm khám ngắn tại phòng khám bằng một dụng cụ nhỏ để xem ống hậu môn. Tùy theo tuổi, triệu chứng và bệnh sử của quý vị, bác sĩ chuyên khoa tiêu hóa có thể đề nghị nội soi đại tràng sigma bằng ống mềm hoặc nội soi đại tràng để kiểm tra sâu hơn bên trong và loại trừ các nguồn chảy máu khác.",
            ko: "진찰은 보통 육안 관찰과 부드러운 손가락 촉진으로 이루어집니다. 작은 기구로 항문관을 살펴보는 짧은 외래 검사인 항문경 검사가 포함될 수도 있습니다. 나이, 증상, 병력에 따라 소화기내과 전문의가 더 안쪽을 검사하고 다른 출혈 원인을 배제하기 위해 연성 에스결장내시경이나 대장내시경 검사를 권장할 수 있습니다.",
            ar: "يشمل التقييم عادةً معاينة بصرية وفحصًا إصبعيًا لطيفًا للمنطقة. وقد يشمل أيضًا تنظير الشرج، وهو فحص قصير للقناة الشرجية في العيادة بأداة صغيرة. وبحسب عمرك وأعراضك وتاريخك المرضي، قد يوصي طبيب الجهاز الهضمي بتنظير سيني مرن أو تنظير للقولون لفحص الداخل بعمق أكبر واستبعاد مصادر أخرى للنزيف.",
          },
        ],
      },
      {
        heading: {
          en: "Treatment approaches",
          es: "Opciones de tratamiento",
          vi: "Các phương pháp điều trị",
          ko: "치료 방법",
          ar: "طرق العلاج",
        },
        paragraphs: [
          {
            en: "Many rectal conditions improve with simple measures: more fiber and fluids to soften the stool, not straining or sitting on the toilet for long periods, warm sitz baths, and short courses of over-the-counter creams.",
            es: "Muchas condiciones rectales mejoran con medidas sencillas: más fibra y líquidos para ablandar las heces, no hacer esfuerzo ni permanecer sentado en el inodoro por períodos largos, baños de asiento con agua tibia y tandas cortas de cremas de venta libre.",
            vi: "Nhiều bệnh trực tràng cải thiện với các biện pháp đơn giản: thêm chất xơ và nước để phân mềm hơn, không rặn hoặc ngồi bồn cầu quá lâu, ngâm hậu môn nước ấm, và dùng các đợt ngắn kem bôi không kê đơn.",
            ko: "많은 직장 질환이 간단한 조치로 좋아집니다. 변을 부드럽게 하기 위해 섬유질과 수분을 늘리고, 배변 시 힘을 주거나 변기에 오래 앉아 있지 않으며, 따뜻한 좌욕을 하고, 일반의약품 연고를 단기간 사용하는 것입니다.",
            ar: "تتحسن كثير من حالات المستقيم بتدابير بسيطة: مزيد من الألياف والسوائل لتليين البراز، وتجنب الإجهاد أو الجلوس على المرحاض مدة طويلة، وحمّامات المقعدة الدافئة، ودورات قصيرة من الكريمات المتاحة دون وصفة.",
          },
          {
            en: "Hemorrhoids that keep bleeding can often be treated in the office with rubber band ligation, a quick procedure that cuts off the hemorrhoid's blood supply so it shrinks. Fissures are treated with stool softening and prescription ointments that relax the anal muscle so the tear can heal. Abscesses and fistulas usually require drainage or minor surgery.",
            es: "Las hemorroides que siguen sangrando muchas veces pueden tratarse en el consultorio con ligadura con banda elástica, un procedimiento rápido que corta el suministro de sangre de la hemorroide para que se encoja. Las fisuras se tratan ablandando las heces y con ungüentos recetados que relajan el músculo anal para que el desgarro pueda sanar. Los abscesos y las fístulas por lo general requieren drenaje o una cirugía menor.",
            vi: "Trĩ chảy máu kéo dài thường có thể điều trị tại phòng khám bằng thắt vòng cao su, một thủ thuật nhanh cắt nguồn máu nuôi búi trĩ để nó teo lại. Nứt hậu môn được điều trị bằng cách làm mềm phân và thuốc mỡ kê đơn giúp thư giãn cơ hậu môn để vết rách lành lại. Áp-xe và rò hậu môn thường cần dẫn lưu hoặc phẫu thuật nhỏ.",
            ko: "출혈이 계속되는 치질은 대개 외래에서 고무 밴드 결찰술로 치료할 수 있습니다. 치질로 가는 혈류를 차단해 쪼그라들게 하는 빠른 시술입니다. 치열은 변을 부드럽게 하고 항문 근육을 이완시키는 처방 연고로 치료하여 찢어진 부위가 아물게 합니다. 농양과 치루는 보통 배농이나 간단한 수술이 필요합니다.",
            ar: "البواسير التي يستمر نزيفها يمكن علاجها غالبًا في العيادة بربطها بشريط مطاطي، وهو إجراء سريع يقطع إمداد الباسور بالدم فينكمش. وتُعالج الشقوق بتليين البراز ومراهم بوصفة طبية ترخي عضلة الشرج ليتمكن التمزق من الالتئام. أما الخراجات والنواسير فتتطلب عادةً تصريفًا أو جراحة بسيطة.",
          },
        ],
      },
      {
        heading: {
          en: "When to contact a gastroenterologist",
          es: "Cuándo consultar a un gastroenterólogo",
          vi: "Khi nào cần đến gặp bác sĩ chuyên khoa tiêu hóa",
          ko: "소화기내과 전문의와 상담해야 할 때",
          ar: "متى تراجع طبيب الجهاز الهضمي",
        },
        paragraphs: [
          {
            en: "Any rectal bleeding deserves an evaluation, even if you suspect hemorrhoids — especially if you are over forty-five, have a family history of colorectal cancer, or notice blood mixed into the stool. Also seek care for severe or worsening anal pain, a painful lump, fever with rectal pain, a change in bowel habits, or symptoms that persist despite a week or two of home care.",
            es: "Todo sangrado rectal merece una evaluación, incluso si usted sospecha que son hemorroides — sobre todo si tiene más de cuarenta y cinco años, antecedentes familiares de cáncer colorrectal o nota sangre mezclada con las heces. Busque atención también por dolor anal intenso o que empeora, un bulto doloroso, fiebre con dolor rectal, un cambio en el hábito intestinal o síntomas que persisten a pesar de una o dos semanas de cuidados en casa.",
            vi: "Mọi trường hợp chảy máu trực tràng đều cần được thăm khám, ngay cả khi quý vị nghi là trĩ — nhất là nếu quý vị trên bốn mươi lăm tuổi, có tiền sử gia đình bị ung thư đại trực tràng, hoặc thấy máu lẫn trong phân. Cũng hãy đi khám nếu đau hậu môn dữ dội hoặc nặng dần, có khối u đau, sốt kèm đau trực tràng, thay đổi thói quen đi tiêu, hoặc triệu chứng vẫn còn dù đã chăm sóc tại nhà một hai tuần.",
            ko: "치질로 짐작되더라도 직장 출혈은 어떤 경우든 진찰이 필요합니다. 특히 45세가 넘었거나, 대장직장암 가족력이 있거나, 변에 피가 섞여 있는 경우에는 더욱 그렇습니다. 심하거나 점점 심해지는 항문 통증, 아픈 멍울, 직장 통증을 동반한 발열, 배변 습관의 변화, 한두 주간 집에서 관리해도 지속되는 증상도 진료를 받아야 합니다.",
            ar: "أي نزيف من المستقيم يستحق التقييم، حتى وإن كنت تظنه بواسير — خصوصًا إذا تجاوزت الخامسة والأربعين، أو كان لديك تاريخ عائلي لسرطان القولون والمستقيم، أو لاحظت دمًا مختلطًا بالبراز. واطلب الرعاية أيضًا عند ألم شرجي شديد أو متفاقم، أو كتلة مؤلمة، أو حمى مع ألم في المستقيم، أو تغيّر في عادات التبرز، أو أعراض تستمر رغم أسبوع أو أسبوعين من العناية المنزلية.",
          },
        ],
      },
    ],
    relatedDocId: "info-rectal-disease",
  },
  {
    slug: "ulcers",
    group: "conditions",
    title: {
      en: "Ulcers",
      es: "Úlceras",
      vi: "Loét dạ dày tá tràng",
      ko: "궤양",
      ar: "القرحات",
    },
    summary: {
      en: "Peptic ulcers are open sores in the lining of the stomach or upper small intestine, most often caused by a common bacterium or by pain relievers. Learn the symptoms, the tests that find them, and how they heal.",
      es: "Las úlceras pépticas son llagas abiertas en el revestimiento del estómago o de la primera parte del intestino delgado, causadas la mayoría de las veces por una bacteria común o por analgésicos. Conozca los síntomas, las pruebas que las detectan y cómo se curan.",
      vi: "Loét dạ dày tá tràng là những vết loét hở ở niêm mạc dạ dày hoặc phần đầu ruột non, thường do một loại vi khuẩn phổ biến hoặc do thuốc giảm đau gây ra. Tìm hiểu các triệu chứng, những xét nghiệm phát hiện loét và cách chữa lành.",
      ko: "소화성 궤양은 위나 소장 윗부분의 점막에 생기는 헐어 있는 상처로, 흔한 세균이나 진통제가 주된 원인입니다. 증상과 궤양을 찾아내는 검사, 낫는 과정을 알아보십시오.",
      ar: "القرحات الهضمية تقرحات مفتوحة في بطانة المعدة أو الجزء العلوي من الأمعاء الدقيقة، وتنجم في أغلب الأحيان عن بكتيريا شائعة أو عن مسكنات الألم. تعرَّف على الأعراض، والفحوص التي تكشفها، وكيفية شفائها.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "A peptic ulcer is an open sore in the lining of the stomach (a gastric ulcer) or in the first part of the small intestine (a duodenal ulcer). Ulcers form when the layer of mucus that protects the lining from stomach acid wears down.",
            es: "Una úlcera péptica es una llaga abierta en el revestimiento del estómago (úlcera gástrica) o en la primera parte del intestino delgado (úlcera duodenal). Las úlceras se forman cuando se desgasta la capa de moco que protege el revestimiento del ácido del estómago.",
            vi: "Loét dạ dày tá tràng là vết loét hở ở niêm mạc dạ dày (loét dạ dày) hoặc ở phần đầu ruột non (loét tá tràng). Loét hình thành khi lớp chất nhầy bảo vệ niêm mạc khỏi axit dạ dày bị bào mòn.",
            ko: "소화성 궤양은 위 점막(위궤양)이나 소장의 첫 부분(십이지장궤양)에 생기는 헐어 있는 상처입니다. 궤양은 위산으로부터 점막을 보호하는 점액층이 닳아 없어질 때 생깁니다.",
            ar: "القرحة الهضمية تقرح مفتوح في بطانة المعدة (قرحة معدية) أو في الجزء الأول من الأمعاء الدقيقة (قرحة عفجية). وتتكون القرحات عندما تتآكل طبقة المخاط التي تحمي البطانة من حمض المعدة.",
          },
          {
            en: "The two most common causes are infection with a bacterium called Helicobacter pylori and regular use of pain relievers known as NSAIDs, such as ibuprofen, naproxen, and aspirin. Contrary to old belief, stress and spicy food do not cause ulcers, though they can aggravate symptoms.",
            es: "Las dos causas más comunes son la infección por una bacteria llamada Helicobacter pylori y el uso frecuente de analgésicos conocidos como AINE, como el ibuprofeno, el naproxeno y la aspirina. A diferencia de lo que se creía antes, el estrés y la comida picante no causan úlceras, aunque pueden agravar los síntomas.",
            vi: "Hai nguyên nhân phổ biến nhất là nhiễm vi khuẩn Helicobacter pylori và việc dùng thường xuyên các thuốc giảm đau gọi là NSAID, như ibuprofen, naproxen và aspirin. Trái với quan niệm cũ, căng thẳng và đồ ăn cay không gây loét, dù chúng có thể làm triệu chứng nặng thêm.",
            ko: "가장 흔한 두 가지 원인은 헬리코박터 파일로리(Helicobacter pylori)라는 세균 감염과 이부프로펜, 나프록센, 아스피린 같은 NSAID 계열 진통제의 상습 복용입니다. 예전 통념과 달리 스트레스와 매운 음식은 궤양을 일으키지 않습니다. 다만 증상을 악화시킬 수는 있습니다.",
            ar: "السببان الأكثر شيوعًا هما العدوى ببكتيريا تُسمى الملوية البوابية (Helicobacter pylori) والاستخدام المنتظم لمسكنات الألم المعروفة بمضادات الالتهاب اللاستيرويدية (NSAIDs)، مثل الإيبوبروفين والنابروكسين والأسبرين. وخلافًا للاعتقاد القديم، لا يسبب التوتر ولا الطعام الحار القرحات، وإن كانا قد يفاقمان الأعراض.",
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
            en: "The most common symptom is a burning or gnawing pain in the upper abdomen, often between meals or during the night, that may ease for a while with food or antacids. Other symptoms include bloating, feeling full quickly, nausea, and loss of appetite. Some ulcers — especially those caused by NSAIDs — produce no pain at all and first show themselves with bleeding.",
            es: "El síntoma más común es un dolor ardoroso o corrosivo en la parte superior del abdomen, a menudo entre comidas o durante la noche, que puede aliviarse por un rato con alimentos o antiácidos. Otros síntomas incluyen hinchazón, saciedad rápida, náuseas y pérdida del apetito. Algunas úlceras — sobre todo las causadas por los AINE — no producen ningún dolor y se manifiestan por primera vez con un sangrado.",
            vi: "Triệu chứng phổ biến nhất là cảm giác đau rát hoặc cồn cào ở vùng bụng trên, thường giữa các bữa ăn hoặc về đêm, có thể dịu đi một lúc khi ăn hoặc dùng thuốc kháng axit. Các triệu chứng khác gồm chướng bụng, mau no, buồn nôn và chán ăn. Một số vết loét — nhất là loét do NSAID — hoàn toàn không gây đau và biểu hiện lần đầu bằng chảy máu.",
            ko: "가장 흔한 증상은 윗배가 타는 듯하거나 갉아 대는 듯한 통증으로, 주로 식사 사이나 밤에 나타나며 음식을 먹거나 제산제를 복용하면 한동안 가라앉기도 합니다. 그 외에 복부 팽만감, 빨리 배부름, 메스꺼움, 식욕 부진이 있을 수 있습니다. 일부 궤양 — 특히 NSAID로 인한 궤양 — 은 전혀 아프지 않다가 출혈로 처음 모습을 드러냅니다.",
            ar: "أكثر الأعراض شيوعًا ألم حارق أو قارض في أعلى البطن، غالبًا بين الوجبات أو أثناء الليل، وقد يهدأ لفترة مع الطعام أو مضادات الحموضة. وتشمل الأعراض الأخرى الانتفاخ، والشبع المبكر، والغثيان، وفقدان الشهية. وبعض القرحات — لا سيما الناجمة عن مضادات الالتهاب اللاستيرويدية — لا تسبب أي ألم إطلاقًا وتظهر أول ما تظهر بنزيف.",
          },
        ],
      },
      {
        heading: {
          en: "How ulcers are diagnosed",
          es: "Cómo se diagnostican las úlceras",
          vi: "Chẩn đoán loét bằng cách nào",
          ko: "궤양의 진단 방법",
          ar: "كيف تُشخَّص القرحات",
        },
        paragraphs: [
          {
            en: "Your gastroenterologist may test for H. pylori with a breath, stool, or blood test. The most direct way to confirm an ulcer is an upper endoscopy: while you are sedated, a thin, flexible camera examines the esophagus, stomach, and duodenum. Biopsies taken during the exam can confirm the infection and make sure a stomach ulcer is not hiding anything more serious.",
            es: "Su gastroenterólogo puede buscar H. pylori con una prueba de aliento, de heces o de sangre. La forma más directa de confirmar una úlcera es una endoscopia superior: mientras usted está sedado, una cámara delgada y flexible examina el esófago, el estómago y el duodeno. Las biopsias tomadas durante el examen pueden confirmar la infección y asegurar que una úlcera del estómago no esconde algo más serio.",
            vi: "Bác sĩ chuyên khoa tiêu hóa có thể tìm H. pylori bằng xét nghiệm hơi thở, phân hoặc máu. Cách trực tiếp nhất để xác nhận loét là nội soi đường tiêu hóa trên: trong khi quý vị được an thần, một camera mảnh, mềm sẽ kiểm tra thực quản, dạ dày và tá tràng. Các mẫu sinh thiết lấy trong lúc nội soi có thể xác nhận nhiễm khuẩn và bảo đảm vết loét dạ dày không che giấu điều gì nghiêm trọng hơn.",
            ko: "소화기내과 전문의는 호흡, 대변, 혈액 검사로 H. pylori를 확인할 수 있습니다. 궤양을 확인하는 가장 직접적인 방법은 상부 내시경입니다. 진정 상태에서 가늘고 유연한 카메라로 식도, 위, 십이지장을 검사합니다. 검사 중 채취한 조직검사로 감염을 확인하고, 위궤양 뒤에 더 심각한 문제가 숨어 있지 않은지 확인할 수 있습니다.",
            ar: "قد يفحص طبيب الجهاز الهضمي بكتيريا H. pylori باختبار تنفس أو براز أو دم. وأكثر الطرق مباشرةً لتأكيد القرحة هو التنظير العلوي: فبينما تكون تحت التخدير المهدئ، تفحص كاميرا رفيعة مرنة المريءَ والمعدة والعفج. ويمكن للخزعات المأخوذة أثناء الفحص تأكيد العدوى والتأكد من أن قرحة المعدة لا تخفي شيئًا أخطر.",
          },
        ],
      },
      {
        heading: {
          en: "Treatment approaches",
          es: "Opciones de tratamiento",
          vi: "Các phương pháp điều trị",
          ko: "치료 방법",
          ar: "طرق العلاج",
        },
        paragraphs: [
          {
            en: "Most ulcers heal with a course of acid-reducing medicine, usually a proton pump inhibitor, which lowers acid so the lining can repair itself. If H. pylori is present, it is treated with a combination of antibiotics plus acid reduction, and follow-up testing confirms the infection is gone.",
            es: "La mayoría de las úlceras sanan con un curso de medicamento reductor de ácido, generalmente un inhibidor de la bomba de protones, que disminuye el ácido para que el revestimiento pueda repararse. Si hay H. pylori, se trata con una combinación de antibióticos más reducción del ácido, y una prueba de seguimiento confirma que la infección desapareció.",
            vi: "Hầu hết vết loét lành với một đợt thuốc giảm axit, thường là thuốc ức chế bơm proton, giúp giảm axit để niêm mạc tự hồi phục. Nếu có H. pylori, bệnh được điều trị bằng phối hợp kháng sinh cùng thuốc giảm axit, và xét nghiệm theo dõi sau đó xác nhận vi khuẩn đã hết.",
            ko: "대부분의 궤양은 위산을 줄이는 약, 보통 양성자펌프억제제를 일정 기간 복용하면 낫습니다. 위산이 줄어들면 점막이 스스로 회복됩니다. H. pylori가 있으면 항생제와 위산 억제제를 병용해 치료하고, 추적 검사로 감염이 사라졌는지 확인합니다.",
            ar: "تلتئم معظم القرحات بدورة من دواء خافض للحمض، عادةً مثبط مضخة البروتون، الذي يقلل الحمض لتتمكن البطانة من إصلاح نفسها. وإذا وُجدت بكتيريا H. pylori، فتُعالج بمزيج من المضادات الحيوية مع خفض الحمض، ويؤكد فحص المتابعة زوال العدوى.",
          },
          {
            en: "If NSAIDs caused the ulcer, your doctor will help you stop them or find a safer alternative. Stomach ulcers are often rechecked with a follow-up endoscopy to confirm they have healed completely.",
            es: "Si los AINE causaron la úlcera, su médico le ayudará a suspenderlos o a encontrar una alternativa más segura. Las úlceras del estómago a menudo se vuelven a revisar con una endoscopia de seguimiento para confirmar que sanaron por completo.",
            vi: "Nếu NSAID là nguyên nhân gây loét, bác sĩ sẽ giúp quý vị ngưng thuốc hoặc tìm lựa chọn an toàn hơn. Loét dạ dày thường được kiểm tra lại bằng nội soi theo dõi để xác nhận đã lành hoàn toàn.",
            ko: "NSAID가 궤양의 원인이라면 의사가 복용을 중단하거나 더 안전한 대안을 찾도록 도와드립니다. 위궤양은 완전히 나았는지 확인하기 위해 추적 내시경으로 다시 점검하는 경우가 많습니다.",
            ar: "إذا كانت مضادات الالتهاب اللاستيرويدية هي سبب القرحة، فسيساعدك طبيبك على إيقافها أو إيجاد بديل أكثر أمانًا. وكثيرًا ما يُعاد فحص قرحات المعدة بتنظير متابعة للتأكد من التئامها التام.",
          },
        ],
      },
      {
        heading: {
          en: "When to contact a gastroenterologist",
          es: "Cuándo consultar a un gastroenterólogo",
          vi: "Khi nào cần đến gặp bác sĩ chuyên khoa tiêu hóa",
          ko: "소화기내과 전문의와 상담해야 할 때",
          ar: "متى تراجع طبيب الجهاز الهضمي",
        },
        paragraphs: [
          {
            en: "Make an appointment for upper abdominal pain that keeps returning, especially if you take NSAIDs regularly. Seek emergency care for vomiting blood or material that looks like coffee grounds, black or tarry stools, sudden severe abdominal pain, or lightheadedness along with stomach symptoms — these can signal a bleeding or perforated ulcer.",
            es: "Haga una cita si tiene dolor en la parte superior del abdomen que sigue regresando, sobre todo si toma AINE con regularidad. Busque atención de emergencia si vomita sangre o material con aspecto de café molido, si tiene heces negras o alquitranadas, dolor abdominal repentino e intenso, o mareo junto con síntomas estomacales — pueden ser señales de una úlcera sangrante o perforada.",
            vi: "Hãy đặt lịch khám nếu đau vùng bụng trên cứ tái diễn, nhất là khi quý vị dùng NSAID thường xuyên. Hãy đi cấp cứu nếu nôn ra máu hoặc chất trông như bã cà phê, phân đen hoặc như hắc ín, đau bụng đột ngột dữ dội, hoặc choáng váng kèm các triệu chứng dạ dày — đây có thể là dấu hiệu của loét đang chảy máu hoặc thủng.",
            ko: "윗배 통증이 계속 재발하면, 특히 NSAID를 자주 복용한다면 진료 예약을 하십시오. 피나 커피 찌꺼기 같은 것을 토하거나, 검거나 타르 같은 변을 보거나, 갑작스럽고 심한 복통이 있거나, 위장 증상과 함께 어지러움이 나타나면 응급 진료를 받으십시오. 출혈성 궤양이나 천공된 궤양의 신호일 수 있습니다.",
            ar: "حدد موعدًا عند ألم في أعلى البطن يظل يعاود الظهور، خصوصًا إذا كنت تتناول مضادات الالتهاب اللاستيرويدية بانتظام. واطلب الرعاية الطارئة عند تقيؤ دم أو مادة تشبه ثفل القهوة، أو براز أسود أو قطراني، أو ألم بطني مفاجئ شديد، أو دوار مصحوب بأعراض معدية — فقد تدل هذه على قرحة نازفة أو مثقوبة.",
          },
        ],
      },
    ],
    relatedDocId: "info-ulcers",
  },
];
