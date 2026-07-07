// Patient-education topics: conditions, part A (8 of the old library's 17
// topics). Slugs, titles, and legacy ids mirror the old ASGE-licensed library
// 1:1; the bodies are original plain-language writing in both languages.

import type { EducationTopic } from "../types";

export const conditionsA: EducationTopic[] = [
  {
    slug: "diet-and-colon-health",
    legacyId: "48158",
    group: "conditions",
    title: {
      en: "Diet and Colon Health",
      es: "La dieta y la salud del colon",
    },
    summary: {
      en: "What you eat has a direct effect on how your colon works. Learn how fiber, fluids, and everyday habits support digestive health and help prevent common colon problems.",
      es: "Lo que usted come influye directamente en el funcionamiento de su colon. Conozca cómo la fibra, los líquidos y los hábitos diarios apoyan la salud digestiva y ayudan a prevenir problemas comunes del colon.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "The food you eat does more than provide energy. As meals move through the digestive system, they shape how well the colon — the large intestine — absorbs water and carries waste out of the body. Daily choices about food, fluids, and activity have a real influence on how comfortably and regularly your bowels work.",
            es: "Los alimentos que usted come hacen más que aportar energía. A medida que las comidas avanzan por el aparato digestivo, influyen en la forma en que el colon — el intestino grueso — absorbe agua y elimina los desechos del cuerpo. Las decisiones diarias sobre la comida, los líquidos y la actividad física tienen un efecto real en la comodidad y regularidad de su intestino.",
          },
          {
            en: "Diet is closely connected to several common colon conditions, including constipation, hemorrhoids, and diverticular disease. Food alone does not cause or cure these problems, but the right eating pattern can ease symptoms and lower the chance of complications.",
            es: "La dieta está estrechamente relacionada con varias condiciones comunes del colon, como el estreñimiento, las hemorroides y la enfermedad diverticular. La alimentación por sí sola no causa ni cura estos problemas, pero un buen patrón de alimentación puede aliviar los síntomas y reducir la probabilidad de complicaciones.",
          },
        ],
      },
      {
        heading: { en: "Why fiber matters", es: "Por qué es importante la fibra" },
        paragraphs: [
          {
            en: "Fiber is the part of plant foods that the body cannot completely digest. It adds bulk to the stool and holds water, which keeps bowel movements softer and easier to pass. Vegetables, fruits, beans, lentils, and whole grains are dependable sources.",
            es: "La fibra es la parte de los alimentos vegetales que el cuerpo no puede digerir por completo. Da volumen a las heces y retiene agua, lo que mantiene las evacuaciones más blandas y fáciles de pasar. Las verduras, las frutas, los frijoles, las lentejas y los granos integrales son fuentes confiables.",
          },
          {
            en: "Eating enough fiber supports regular bowel habits and reduces straining. Less straining means less pressure on the veins of the rectum, which helps prevent hemorrhoid flare-ups, and a fiber-rich pattern appears to benefit people with diverticulosis as well. Increase fiber gradually and drink plenty of water, because a sudden jump can cause temporary gas and bloating.",
            es: "Consumir suficiente fibra favorece un hábito intestinal regular y reduce el esfuerzo al evacuar. Menos esfuerzo significa menos presión sobre las venas del recto, lo que ayuda a prevenir las crisis de hemorroides, y un patrón rico en fibra también parece beneficiar a las personas con diverticulosis. Aumente la fibra poco a poco y beba abundante agua, porque un cambio brusco puede causar gases e hinchazón temporales.",
          },
        ],
      },
      {
        heading: {
          en: "Habits that support a healthy colon",
          es: "Hábitos que apoyan un colon sano",
        },
        paragraphs: [
          {
            en: "Beyond fiber, a few routines protect the colon. Drinking fluids throughout the day keeps stool soft. Regular physical activity, even a daily walk, encourages the bowel to stay on schedule. Keeping a healthy weight, limiting red and processed meats, and not smoking also reduce strain on the digestive system.",
            es: "Además de la fibra, algunas rutinas protegen el colon. Beber líquidos a lo largo del día mantiene las heces blandas. La actividad física regular, aunque sea una caminata diaria, ayuda a que el intestino mantenga su ritmo. Mantener un peso saludable, limitar las carnes rojas y procesadas y no fumar también reducen la carga sobre el aparato digestivo.",
          },
          {
            en: "Some old food rules have not held up. People with diverticulosis were once told to avoid nuts, corn, and seeds, but that restriction is no longer considered necessary for most. Your care team can help you decide what applies to your situation.",
            es: "Algunas reglas antiguas sobre la comida no han resistido el paso del tiempo. Antes se les decía a las personas con diverticulosis que evitaran las nueces, el maíz y las semillas, pero esa restricción ya no se considera necesaria para la mayoría. Su equipo médico puede ayudarle a decidir qué aplica a su situación.",
          },
        ],
      },
      {
        heading: {
          en: "When diet alone is not enough",
          es: "Cuando la dieta no es suficiente",
        },
        paragraphs: [
          {
            en: "Dietary changes take a few weeks to show their effect, and they cannot fix every problem. If constipation, diarrhea, bloating, or abdominal discomfort continues despite better habits, an evaluation can look for an underlying cause. Depending on your symptoms, your gastroenterologist may suggest blood or stool tests, or a direct look at the colon with a colonoscopy.",
            es: "Los cambios en la dieta tardan algunas semanas en mostrar su efecto y no pueden resolver todos los problemas. Si el estreñimiento, la diarrea, la hinchazón o las molestias abdominales continúan a pesar de mejores hábitos, una evaluación puede buscar la causa de fondo. Según sus síntomas, su gastroenterólogo puede sugerir análisis de sangre o de heces, o una revisión directa del colon mediante una colonoscopia.",
          },
        ],
      },
      {
        heading: {
          en: "When to talk to a gastroenterologist",
          es: "Cuándo hablar con un gastroenterólogo",
        },
        paragraphs: [
          {
            en: "Make an appointment if you notice blood in the stool, black or tarry stools, unintended weight loss, persistent pain, or a lasting change in your bowel habits. Those symptoms call for an evaluation rather than dietary trial and error. It is also worth reviewing your colon cancer screening plan with your care team, because screening can find problems long before symptoms appear.",
            es: "Haga una cita si nota sangre en las heces, heces negras o alquitranadas, pérdida de peso involuntaria, dolor persistente o un cambio duradero en su hábito intestinal. Esos síntomas requieren una evaluación, no pruebas de ensayo y error con la dieta. También vale la pena revisar con su equipo médico su plan de detección del cáncer de colon, porque las pruebas de detección pueden encontrar problemas mucho antes de que aparezcan los síntomas.",
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
    },
    summary: {
      en: "IBS with diarrhea is a common, manageable disorder that causes abdominal pain along with frequent loose stools. Learn how it is diagnosed and the many ways symptoms can be brought under control.",
      es: "El síndrome del intestino irritable con diarrea es un trastorno común y manejable que causa dolor abdominal junto con evacuaciones sueltas frecuentes. Conozca cómo se diagnostica y las muchas maneras de controlar los síntomas.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Irritable bowel syndrome, often shortened to IBS, is a long-term disorder of how the bowel works rather than a disease that damages it. In IBS, the intestine is unusually sensitive, and the muscle contractions that move its contents along can fall out of rhythm. When the main result is frequent loose or watery stools, the condition is called IBS with diarrhea, or IBS-D.",
            es: "El síndrome del intestino irritable, conocido como SII, es un trastorno crónico del funcionamiento del intestino, no una enfermedad que lo dañe. En el SII, el intestino es especialmente sensible y las contracciones musculares que mueven su contenido pueden perder el ritmo. Cuando el resultado principal son evacuaciones sueltas o líquidas frecuentes, la condición se llama SII con diarrea, o SII-D.",
          },
          {
            en: "IBS-D can be disruptive and, at times, embarrassing. It does not injure the intestine, however, and it does not lead to cancer. With an accurate diagnosis and a personal plan, most people gain far better control of their symptoms.",
            es: "El SII-D puede ser muy molesto y, a veces, incómodo en la vida diaria. Sin embargo, no lesiona el intestino ni conduce al cáncer. Con un diagnóstico preciso y un plan personalizado, la mayoría de las personas logra controlar mucho mejor sus síntomas.",
          },
        ],
      },
      {
        heading: { en: "Common symptoms", es: "Síntomas comunes" },
        paragraphs: [
          {
            en: "The core symptoms are abdominal pain or cramping connected to bowel movements, together with loose stools that occur more often than normal. Many people also notice bloating, gas, mucus in the stool, or sudden urges that make it hard to delay a trip to the bathroom.",
            es: "Los síntomas centrales son dolor o cólicos abdominales relacionados con las evacuaciones, junto con heces sueltas más frecuentes de lo normal. Muchas personas también notan hinchazón, gases, moco en las heces o urgencias repentinas que hacen difícil posponer una visita al baño.",
          },
          {
            en: "Symptoms tend to come and go, and stress, certain foods, or poor sleep can stir them up. Bleeding, fever, weight loss, or symptoms that wake you at night are not typical of IBS and should always be reported to your care team.",
            es: "Los síntomas suelen ir y venir, y el estrés, ciertos alimentos o el mal sueño pueden activarlos. El sangrado, la fiebre, la pérdida de peso o los síntomas que lo despiertan por la noche no son típicos del SII y siempre deben informarse a su equipo médico.",
          },
        ],
      },
      {
        heading: { en: "How IBS-D is diagnosed", es: "Cómo se diagnostica el SII-D" },
        paragraphs: [
          {
            en: "No single test proves IBS. Your gastroenterologist begins with a careful review of your symptoms and history, followed by a physical exam. Blood and stool tests are often ordered to rule out conditions that can look similar, such as celiac disease, infection, or inflammatory bowel disease. Depending on your age and risk factors, a colonoscopy may be recommended to be certain nothing else explains the pattern.",
            es: "Ninguna prueba por sí sola confirma el SII. Su gastroenterólogo comienza con una revisión cuidadosa de sus síntomas y su historia clínica, seguida de un examen físico. Con frecuencia se piden análisis de sangre y de heces para descartar condiciones parecidas, como la enfermedad celíaca, una infección o la enfermedad inflamatoria intestinal. Según su edad y sus factores de riesgo, puede recomendarse una colonoscopia para asegurarse de que nada más explique el cuadro.",
          },
        ],
      },
      {
        heading: { en: "Treatment and management", es: "Tratamiento y manejo" },
        paragraphs: [
          {
            en: "Care usually starts with everyday measures: identifying trigger foods, eating meals on a regular schedule, limiting caffeine and alcohol, and finding workable ways to manage stress. Some people improve with a structured eating plan, such as a diet low in certain fermentable carbohydrates, which is best followed with professional guidance.",
            es: "La atención suele comenzar con medidas cotidianas: identificar los alimentos que le provocan síntomas, comer en horarios regulares, limitar la cafeína y el alcohol, y encontrar maneras prácticas de manejar el estrés. Algunas personas mejoran con un plan de alimentación estructurado, como una dieta baja en ciertos carbohidratos fermentables, que conviene seguir con orientación profesional.",
          },
          {
            en: "When lifestyle steps are not enough, medicines can ease cramping, slow diarrhea, or act on the communication between the gut and the brain. No single prescription fits everyone, so your gastroenterologist will match options to your symptom pattern and adjust them over time.",
            es: "Cuando los cambios de estilo de vida no bastan, los medicamentos pueden aliviar los cólicos, disminuir la diarrea o actuar sobre la comunicación entre el intestino y el cerebro. Ninguna receta única sirve para todos, así que su gastroenterólogo ajustará las opciones a su patrón de síntomas con el tiempo.",
          },
        ],
      },
      {
        heading: {
          en: "When to talk to a gastroenterologist",
          es: "Cuándo hablar con un gastroenterólogo",
        },
        paragraphs: [
          {
            en: "See a gastroenterologist if diarrhea or abdominal pain keeps returning, limits your work or travel, or simply worries you. Seek care promptly if you notice blood in the stool, unexplained weight loss, or fever, or if colon cancer, celiac disease, or inflammatory bowel disease runs in your family. A confident diagnosis is the first step toward relief.",
            es: "Consulte a un gastroenterólogo si la diarrea o el dolor abdominal regresan una y otra vez, limitan su trabajo o sus viajes, o simplemente le preocupan. Busque atención pronto si nota sangre en las heces, pérdida de peso sin explicación o fiebre, o si en su familia hay antecedentes de cáncer de colon, enfermedad celíaca o enfermedad inflamatoria intestinal. Un diagnóstico seguro es el primer paso hacia el alivio.",
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
    },
    summary: {
      en: "Ulcerative colitis is a chronic inflammatory disease of the colon and rectum that alternates between flares and quiet periods. Learn its symptoms, how it is diagnosed, and how treatment keeps it under control.",
      es: "La colitis ulcerosa es una enfermedad inflamatoria crónica del colon y el recto que alterna entre brotes y períodos de calma. Conozca sus síntomas, cómo se diagnostica y cómo el tratamiento la mantiene bajo control.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Ulcerative colitis is a chronic condition in which the immune system mistakenly attacks the lining of the large intestine, causing inflammation and small open sores. It belongs to a group of disorders known as inflammatory bowel disease, or IBD. Unlike Crohn's disease, which can involve any part of the digestive tract, ulcerative colitis is limited to the colon and rectum and affects the innermost lining.",
            es: "La colitis ulcerosa es una condición crónica en la que el sistema inmunitario ataca por error el revestimiento del intestino grueso, causando inflamación y pequeñas llagas abiertas. Pertenece a un grupo de trastornos conocido como enfermedad inflamatoria intestinal, o EII. A diferencia de la enfermedad de Crohn, que puede afectar cualquier parte del tubo digestivo, la colitis ulcerosa se limita al colon y al recto y afecta el revestimiento más interno.",
          },
          {
            en: "The condition usually alternates between flares, when symptoms are active, and remission, when the bowel is calm. It most often begins in younger adults, but it can appear at any age.",
            es: "La condición suele alternar entre brotes, cuando los síntomas están activos, y remisión, cuando el intestino está en calma. Con mayor frecuencia comienza en adultos jóvenes, pero puede aparecer a cualquier edad.",
          },
        ],
      },
      {
        heading: { en: "Common symptoms", es: "Síntomas comunes" },
        paragraphs: [
          {
            en: "Typical symptoms include diarrhea that may contain blood or mucus, cramping abdominal pain, and a frequent or urgent need to move the bowels. During flares, some people also have fatigue, poor appetite, weight loss, or fever.",
            es: "Los síntomas típicos incluyen diarrea que puede contener sangre o moco, dolor abdominal tipo cólico y una necesidad frecuente o urgente de evacuar. Durante los brotes, algunas personas también tienen fatiga, poco apetito, pérdida de peso o fiebre.",
          },
          {
            en: "Because the immune system is involved, ulcerative colitis can occasionally cause problems beyond the gut, such as joint aches, skin changes, or eye irritation. Severity varies widely from person to person and can change over time.",
            es: "Como el sistema inmunitario está involucrado, la colitis ulcerosa a veces causa problemas fuera del intestino, como dolores en las articulaciones, cambios en la piel o irritación de los ojos. La gravedad varía mucho de una persona a otra y puede cambiar con el tiempo.",
          },
        ],
      },
      {
        heading: { en: "How it is diagnosed", es: "Cómo se diagnostica" },
        paragraphs: [
          {
            en: "Diagnosis brings together several pieces of information. Blood and stool tests look for inflammation, anemia, and infection. The central test is a colonoscopy, which allows your gastroenterologist to examine the lining of the colon directly and collect small tissue samples called biopsies. Biopsy results confirm the diagnosis and help distinguish ulcerative colitis from other conditions, including Crohn's disease.",
            es: "El diagnóstico reúne varias piezas de información. Los análisis de sangre y de heces buscan inflamación, anemia e infección. La prueba central es la colonoscopia, que permite a su gastroenterólogo examinar directamente el revestimiento del colon y tomar pequeñas muestras de tejido llamadas biopsias. Los resultados de las biopsias confirman el diagnóstico y ayudan a distinguir la colitis ulcerosa de otras condiciones, incluida la enfermedad de Crohn.",
          },
        ],
      },
      {
        heading: { en: "Treatment and management", es: "Tratamiento y manejo" },
        paragraphs: [
          {
            en: "Treatment aims to calm the inflammation, relieve symptoms, and then keep the disease in remission. Several families of medicines are used, from anti-inflammatory drugs that work within the intestine to therapies that adjust the immune response. The best choice depends on how much of the colon is involved and how active the disease is.",
            es: "El tratamiento busca calmar la inflamación, aliviar los síntomas y luego mantener la enfermedad en remisión. Se usan varias familias de medicamentos, desde antiinflamatorios que actúan dentro del intestino hasta terapias que regulan la respuesta inmunitaria. La mejor opción depende de cuánto colon está afectado y de qué tan activa está la enfermedad.",
          },
          {
            en: "Most people manage ulcerative colitis with medicines and regular follow-up. Surgery to remove the colon is reserved for severe disease that does not respond to treatment or for certain complications. Because long-standing inflammation can slowly raise the risk of colon cancer, your gastroenterologist will also set a schedule of periodic surveillance colonoscopies.",
            es: "La mayoría de las personas controla la colitis ulcerosa con medicamentos y seguimiento regular. La cirugía para extirpar el colon se reserva para la enfermedad grave que no responde al tratamiento o para ciertas complicaciones. Como la inflamación de muchos años puede aumentar lentamente el riesgo de cáncer de colon, su gastroenterólogo también establecerá un calendario de colonoscopias periódicas de vigilancia.",
          },
        ],
      },
      {
        heading: {
          en: "When to talk to a gastroenterologist",
          es: "Cuándo hablar con un gastroenterólogo",
        },
        paragraphs: [
          {
            en: "Talk to a gastroenterologist if you have ongoing diarrhea, blood in your stool, or abdominal pain that keeps returning. If you already live with ulcerative colitis, contact your care team when a flare does not settle, new symptoms appear, or your medicines cause concerns. Consistent follow-up is one of the strongest tools for staying in remission.",
            es: "Hable con un gastroenterólogo si tiene diarrea continua, sangre en las heces o dolor abdominal que regresa una y otra vez. Si usted ya vive con colitis ulcerosa, comuníquese con su equipo médico cuando un brote no ceda, aparezcan síntomas nuevos o sus medicamentos le causen dudas. El seguimiento constante es una de las herramientas más sólidas para mantenerse en remisión.",
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
    },
    summary: {
      en: "Colon polyps are common growths on the inner lining of the colon, and certain types can slowly turn into cancer. Finding and removing them during colonoscopy is one of the most effective ways to prevent colon cancer.",
      es: "Los pólipos del colon son crecimientos comunes en el revestimiento interno del colon, y ciertos tipos pueden convertirse lentamente en cáncer. Encontrarlos y extirparlos durante una colonoscopia es una de las formas más eficaces de prevenir el cáncer de colon.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "A colon polyp is a small growth that forms on the inner lining of the large intestine. Polyps are common, and most never cause harm. Certain types, however — especially those called adenomas — can slowly change into colon cancer over a period of years.",
            es: "Un pólipo del colon es un pequeño crecimiento que se forma en el revestimiento interno del intestino grueso. Los pólipos son comunes y la mayoría nunca causa daño. Sin embargo, ciertos tipos — en especial los llamados adenomas — pueden convertirse lentamente en cáncer de colon a lo largo de los años.",
          },
          {
            en: "That slow timeline is actually good news. When polyps are found and removed early, most colon cancers never get the chance to develop. Polyps vary in shape and size: some lie flat against the colon wall, others hang from a small stalk, and a person may have one or several.",
            es: "Ese ritmo lento es, en realidad, una buena noticia. Cuando los pólipos se encuentran y se extirpan a tiempo, la mayoría de los cánceres de colon nunca llega a desarrollarse. Los pólipos varían en forma y tamaño: algunos quedan planos contra la pared del colon, otros cuelgan de un pequeño tallo, y una persona puede tener uno o varios.",
          },
        ],
      },
      {
        heading: { en: "Do polyps cause symptoms?", es: "¿Los pólipos causan síntomas?" },
        paragraphs: [
          {
            en: "Most polyps cause no symptoms at all, which is exactly why screening matters. Occasionally, a larger polyp bleeds, showing up as visible blood in the stool or as unexplained low iron on a blood test. Rarely, a large polyp can change bowel habits.",
            es: "La mayoría de los pólipos no causa ningún síntoma, y precisamente por eso las pruebas de detección son tan importantes. En ocasiones, un pólipo grande sangra y se nota como sangre visible en las heces o como un nivel bajo de hierro sin explicación en un análisis de sangre. Rara vez, un pólipo grande puede cambiar el hábito intestinal.",
          },
          {
            en: "Because warning signs are so uncommon, waiting for symptoms is not a dependable strategy. Screening is designed to find polyps while they are silent and simple to remove.",
            es: "Como las señales de alerta son tan poco comunes, esperar a tener síntomas no es una estrategia confiable. La detección está diseñada para encontrar los pólipos mientras son silenciosos y fáciles de extirpar.",
          },
        ],
      },
      {
        heading: { en: "How polyps are found", es: "Cómo se encuentran los pólipos" },
        paragraphs: [
          {
            en: "Colonoscopy is the most thorough test, because it examines the full length of the colon and allows polyps to be removed during the same visit. Stool-based screening tests can detect hidden blood or abnormal DNA, but a positive result still needs to be followed by a colonoscopy. Your gastroenterologist can help you choose the screening approach that fits your history.",
            es: "La colonoscopia es la prueba más completa, porque examina todo el colon y permite extirpar los pólipos en la misma visita. Las pruebas de detección en heces pueden encontrar sangre oculta o ADN anormal, pero un resultado positivo debe confirmarse después con una colonoscopia. Su gastroenterólogo puede ayudarle a elegir la opción de detección que mejor se ajuste a su historia.",
          },
        ],
      },
      {
        heading: { en: "How polyps are treated", es: "Cómo se tratan los pólipos" },
        paragraphs: [
          {
            en: "Nearly all polyps can be removed during a colonoscopy, most often with a thin wire loop passed through the scope. Removal is generally painless and adds little time to the exam. Each polyp is then sent to a laboratory, where a specialist examines it under a microscope and identifies its type.",
            es: "Casi todos los pólipos pueden extirparse durante una colonoscopia, generalmente con un asa delgada de alambre que se pasa a través del endoscopio. La extirpación no suele causar dolor y agrega poco tiempo al examen. Cada pólipo se envía después a un laboratorio, donde un especialista lo examina al microscopio e identifica su tipo.",
          },
          {
            en: "Those results guide the follow-up plan. Based on the number, size, and type of polyps found, your gastroenterologist will recommend when your next colonoscopy should take place. Keeping that schedule is the most reliable way to keep new polyps from becoming a problem.",
            es: "Esos resultados guían el plan de seguimiento. Según el número, el tamaño y el tipo de pólipos encontrados, su gastroenterólogo le recomendará cuándo debe realizarse su próxima colonoscopia. Cumplir ese calendario es la manera más confiable de evitar que nuevos pólipos se conviertan en un problema.",
          },
        ],
      },
      {
        heading: {
          en: "When to talk to a gastroenterologist",
          es: "Cuándo hablar con un gastroenterólogo",
        },
        paragraphs: [
          {
            en: "Most adults should begin discussing colon cancer screening with their care team at age 45, and sooner when polyps or colon cancer run in the family. Whatever your age, make an appointment if you notice rectal bleeding, unexplained anemia or fatigue, or a lasting change in your bowel habits.",
            es: "La mayoría de los adultos debe comenzar a hablar sobre la detección del cáncer de colon con su equipo médico a los 45 años, y antes cuando hay antecedentes familiares de pólipos o de cáncer de colon. Sin importar su edad, haga una cita si nota sangrado rectal, anemia o cansancio sin explicación, o un cambio duradero en su hábito intestinal.",
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
    },
    summary: {
      en: "Diverticulosis means small pouches have formed in the wall of the colon. Most people never have problems, but it helps to recognize the signs of complications and the habits that support colon health.",
      es: "La diverticulosis significa que se han formado pequeñas bolsas en la pared del colon. La mayoría de las personas nunca tiene problemas, pero conviene reconocer las señales de complicaciones y los hábitos que apoyan la salud del colon.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Diverticulosis means that small pouches, called diverticula, have developed in the wall of the colon. They form where the inner lining bulges outward through weaker areas of the muscle layer, most often in the lower left portion of the colon. The pouches themselves are not cancerous.",
            es: "La diverticulosis significa que se han desarrollado pequeñas bolsas, llamadas divertículos, en la pared del colon. Se forman donde el revestimiento interno se abomba hacia afuera a través de zonas más débiles de la capa muscular, con mayor frecuencia en la parte inferior izquierda del colon. Las bolsas en sí no son cancerosas.",
          },
          {
            en: "Diverticulosis becomes more common with age, and many adults only learn they have it when a colonoscopy or scan done for another reason happens to show the pouches.",
            es: "La diverticulosis se vuelve más común con la edad, y muchos adultos se enteran de que la tienen solo cuando una colonoscopia o un estudio de imagen hecho por otra razón muestra las bolsas.",
          },
        ],
      },
      {
        heading: { en: "Common symptoms", es: "Síntomas comunes" },
        paragraphs: [
          {
            en: "Most people with diverticulosis never notice it. Some have occasional mild cramping, bloating, or irregular bowel habits.",
            es: "La mayoría de las personas con diverticulosis nunca la nota. Algunas tienen de vez en cuando cólicos leves, hinchazón o un hábito intestinal irregular.",
          },
          {
            en: "Trouble starts when a pouch becomes inflamed or infected, a condition called diverticulitis. That usually causes steady abdominal pain — often in the lower left side — sometimes with fever, nausea, or a change in bowel habits. A pouch can also bleed on occasion, producing red or maroon blood in the stool, typically without pain.",
            es: "Los problemas comienzan cuando una bolsa se inflama o se infecta, una condición llamada diverticulitis. Eso suele causar un dolor abdominal constante — a menudo en el lado inferior izquierdo — a veces con fiebre, náuseas o un cambio en el hábito intestinal. Una bolsa también puede sangrar en ocasiones y producir sangre roja o de color vino en las heces, por lo general sin dolor.",
          },
        ],
      },
      {
        heading: { en: "How it is diagnosed", es: "Cómo se diagnostica" },
        paragraphs: [
          {
            en: "Diverticulosis itself is usually discovered during a screening colonoscopy or on imaging done for another purpose. When diverticulitis is suspected, a CT scan of the abdomen is the usual test, because it shows inflammation around the pouches, and blood tests help gauge the severity. After an episode of diverticulitis has fully settled, your gastroenterologist may recommend a colonoscopy to examine the colon.",
            es: "La diverticulosis suele descubrirse durante una colonoscopia de detección o en estudios de imagen hechos por otro motivo. Cuando se sospecha diverticulitis, la prueba habitual es una tomografía computarizada del abdomen, porque muestra la inflamación alrededor de las bolsas, y los análisis de sangre ayudan a medir la gravedad. Después de que un episodio de diverticulitis se ha calmado por completo, su gastroenterólogo puede recomendar una colonoscopia para examinar el colon.",
          },
        ],
      },
      {
        heading: { en: "Treatment and management", es: "Tratamiento y manejo" },
        paragraphs: [
          {
            en: "Diverticulosis without symptoms needs no treatment. A fiber-rich diet with plenty of fluids supports soft, regular bowel movements and may lower the chance of complications, and staying active and keeping a healthy weight help as well. Despite a long-standing belief, most people with diverticulosis do not need to avoid nuts, seeds, or popcorn.",
            es: "La diverticulosis sin síntomas no necesita tratamiento. Una dieta rica en fibra con abundantes líquidos favorece evacuaciones blandas y regulares y puede reducir la probabilidad de complicaciones; mantenerse activo y conservar un peso saludable también ayudan. A pesar de una creencia muy extendida, la mayoría de las personas con diverticulosis no necesita evitar las nueces, las semillas ni las palomitas de maíz.",
          },
          {
            en: "Diverticulitis is treated according to its severity. A milder episode may be managed at home with rest, a temporary adjustment in diet, and close follow-up, while a more severe episode can call for antibiotics or hospital care. Your care team will tailor the plan to your situation.",
            es: "La diverticulitis se trata según su gravedad. Un episodio leve puede manejarse en casa con reposo, un ajuste temporal de la dieta y un seguimiento cercano, mientras que un episodio más grave puede requerir antibióticos o atención hospitalaria. Su equipo médico adaptará el plan a su situación.",
          },
        ],
      },
      {
        heading: {
          en: "When to talk to a gastroenterologist",
          es: "Cuándo hablar con un gastroenterólogo",
        },
        paragraphs: [
          {
            en: "Seek care promptly if you develop steady abdominal pain with fever, or any bleeding from the rectum. If you have had diverticulitis before, a gastroenterologist can help you plan sensible follow-up and lower the chance of another episode.",
            es: "Busque atención pronto si presenta dolor abdominal constante con fiebre, o cualquier sangrado por el recto. Si ya ha tenido diverticulitis, un gastroenterólogo puede ayudarle a planear un seguimiento sensato y a reducir la probabilidad de otro episodio.",
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
    },
    summary: {
      en: "Small amounts of bright red blood with bowel movements usually come from a treatable cause near the anus, but the source should always be confirmed. Learn about common causes, testing, and treatment.",
      es: "Pequeñas cantidades de sangre roja brillante con las evacuaciones suelen provenir de una causa tratable cercana al ano, pero el origen siempre debe confirmarse. Conozca las causas comunes, las pruebas y el tratamiento.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Minor rectal bleeding means passing small amounts of bright red blood, noticed on toilet paper, on the surface of the stool, or in the toilet bowl. It is a common experience, and in most people the source turns out to be a treatable condition near the anus.",
            es: "El sangrado rectal leve significa expulsar pequeñas cantidades de sangre roja brillante, que se nota en el papel higiénico, en la superficie de las heces o en el inodoro. Es una experiencia común y, en la mayoría de las personas, el origen resulta ser una condición tratable cercana al ano.",
          },
          {
            en: "Even so, blood in the stool is never something to guess about. Bleeding can occasionally be the first sign of a more serious problem, including colon cancer, and the only way to know is to find the source.",
            es: "Aun así, la sangre en las heces nunca es algo que deba adivinarse. En ocasiones el sangrado puede ser la primera señal de un problema más serio, incluido el cáncer de colon, y la única manera de saberlo es encontrar el origen.",
          },
        ],
      },
      {
        heading: { en: "Common causes", es: "Causas comunes" },
        paragraphs: [
          {
            en: "Hemorrhoids, which are swollen veins in the rectum or anus, are the most frequent cause. They may itch, ache, or bleed, especially after straining. Anal fissures — small tears in the lining of the anal canal — typically cause sharp pain during bowel movements along with streaks of bright blood.",
            es: "Las hemorroides, que son venas hinchadas en el recto o el ano, son la causa más frecuente. Pueden picar, doler o sangrar, sobre todo después de hacer esfuerzo. Las fisuras anales — pequeños desgarros en el revestimiento del canal anal — suelen causar un dolor agudo durante las evacuaciones junto con rayas de sangre brillante.",
          },
          {
            en: "Other possibilities include polyps, inflammation of the rectum, and bleeding from diverticula. Cancers of the colon and rectum can bleed as well, which is why the cause should be confirmed rather than assumed.",
            es: "Otras posibilidades incluyen los pólipos, la inflamación del recto y el sangrado de los divertículos. Los cánceres del colon y del recto también pueden sangrar, y por eso la causa debe confirmarse en lugar de suponerse.",
          },
        ],
      },
      {
        heading: { en: "How the cause is found", es: "Cómo se encuentra la causa" },
        paragraphs: [
          {
            en: "Your gastroenterologist will ask about your symptoms and bowel habits and gently examine the anal area. Depending on your age, your history, and the findings, the next step may be an exam with a short, flexible scope to view the rectum and lower colon, or a colonoscopy to inspect the entire colon. These exams locate the source of bleeding, and some problems, such as polyps, can be treated during the same procedure.",
            es: "Su gastroenterólogo le preguntará sobre sus síntomas y su hábito intestinal y examinará con cuidado la zona anal. Según su edad, su historia y los hallazgos, el siguiente paso puede ser un examen con un endoscopio corto y flexible para ver el recto y la parte baja del colon, o una colonoscopia para revisar todo el colon. Estos exámenes localizan el origen del sangrado, y algunos problemas, como los pólipos, pueden tratarse durante el mismo procedimiento.",
          },
        ],
      },
      {
        heading: { en: "Treatment", es: "Tratamiento" },
        paragraphs: [
          {
            en: "Treatment depends on the cause. Hemorrhoids often improve with more fiber, more fluids, and less straining, and persistent ones can be treated in the office with simple techniques such as rubber band ligation. Anal fissures usually heal with measures that soften the stool and prescription ointments that relax the anal muscle. Polyps are removed during colonoscopy, and other sources are treated on their own terms.",
            es: "El tratamiento depende de la causa. Las hemorroides a menudo mejoran con más fibra, más líquidos y menos esfuerzo al evacuar, y las persistentes pueden tratarse en el consultorio con técnicas sencillas como la ligadura con bandas elásticas. Las fisuras anales suelen sanar con medidas que ablandan las heces y pomadas recetadas que relajan el músculo anal. Los pólipos se extirpan durante la colonoscopia, y las demás causas se tratan según corresponda.",
          },
        ],
      },
      {
        heading: {
          en: "When to talk to a gastroenterologist",
          es: "Cuándo hablar con un gastroenterólogo",
        },
        paragraphs: [
          {
            en: "Any rectal bleeding deserves a conversation with a medical professional, even when it seems minor or stops on its own. Seek care promptly if bleeding is heavy or keeps returning, if your stools turn black or tarry, or if bleeding comes with dizziness, weakness, abdominal pain, or unintended weight loss. In most cases, a clear answer brings both effective treatment and real peace of mind.",
            es: "Todo sangrado rectal merece una conversación con un profesional médico, incluso cuando parece leve o se detiene por sí solo. Busque atención pronto si el sangrado es abundante o regresa una y otra vez, si sus heces se vuelven negras o alquitranadas, o si el sangrado se acompaña de mareo, debilidad, dolor abdominal o pérdida de peso involuntaria. En la mayoría de los casos, una respuesta clara trae un tratamiento eficaz y verdadera tranquilidad.",
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
    },
    summary: {
      en: "Crohn's disease is a chronic inflammatory condition of the digestive tract that alternates between flares and remission. Learn about its symptoms, how it is diagnosed, and today's treatment options.",
      es: "La enfermedad de Crohn es una condición inflamatoria crónica del tubo digestivo que alterna entre brotes y remisión. Conozca sus síntomas, cómo se diagnostica y las opciones de tratamiento actuales.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Crohn's disease is a chronic form of inflammatory bowel disease, or IBD, in which the immune system drives ongoing inflammation in the digestive tract. The inflammation can appear anywhere along that tract, though it most often settles where the small intestine meets the colon. It tends to affect scattered segments of bowel, leaving healthy stretches in between, and it can reach through the deeper layers of the intestinal wall.",
            es: "La enfermedad de Crohn es una forma crónica de enfermedad inflamatoria intestinal, o EII, en la que el sistema inmunitario provoca una inflamación continua en el tubo digestivo. La inflamación puede aparecer en cualquier punto de ese trayecto, aunque con mayor frecuencia se asienta donde el intestino delgado se une con el colon. Suele afectar segmentos salteados del intestino, dejando tramos sanos entre ellos, y puede penetrar las capas más profundas de la pared intestinal.",
          },
          {
            en: "Crohn's disease usually moves between active periods, called flares, and quieter periods called remission. It is a lifelong condition, but treatment has advanced steadily, and many people keep it well controlled for years at a time.",
            es: "La enfermedad de Crohn suele alternar entre períodos activos, llamados brotes, y períodos más tranquilos llamados remisión. Es una condición de por vida, pero el tratamiento ha avanzado de manera constante y muchas personas la mantienen bien controlada durante años.",
          },
        ],
      },
      {
        heading: { en: "Common symptoms", es: "Síntomas comunes" },
        paragraphs: [
          {
            en: "Frequent symptoms include abdominal pain or cramping, persistent diarrhea, fatigue, reduced appetite, and weight loss. Some people develop mouth sores or pain and drainage around the anus.",
            es: "Los síntomas frecuentes incluyen dolor o cólicos abdominales, diarrea persistente, fatiga, menos apetito y pérdida de peso. Algunas personas desarrollan llagas en la boca o dolor y supuración alrededor del ano.",
          },
          {
            en: "Because the inflammation runs deep, Crohn's disease can create complications over time, such as narrowed segments of intestine called strictures or abnormal connecting tunnels called fistulas. It can also cause symptoms outside the gut, including joint pain, skin problems, and eye irritation.",
            es: "Como la inflamación es profunda, la enfermedad de Crohn puede crear complicaciones con el tiempo, como segmentos estrechados del intestino llamados estenosis o túneles anormales de conexión llamados fístulas. También puede causar síntomas fuera del intestino, como dolor en las articulaciones, problemas de la piel e irritación de los ojos.",
          },
        ],
      },
      {
        heading: { en: "How it is diagnosed", es: "Cómo se diagnostica" },
        paragraphs: [
          {
            en: "No single test settles the question, so your gastroenterologist gathers evidence from several directions. Blood and stool tests look for inflammation and rule out infection. A colonoscopy with biopsies examines the colon and the end of the small intestine, while imaging studies such as CT or MRI scans show segments of small bowel that a scope cannot easily reach. Together, these results confirm the diagnosis and map where the disease is active.",
            es: "Ninguna prueba por sí sola resuelve la pregunta, así que su gastroenterólogo reúne evidencia desde varios frentes. Los análisis de sangre y de heces buscan inflamación y descartan infecciones. Una colonoscopia con biopsias examina el colon y el final del intestino delgado, mientras que estudios de imagen como la tomografía computarizada o la resonancia magnética muestran los segmentos del intestino delgado que un endoscopio no alcanza con facilidad. En conjunto, estos resultados confirman el diagnóstico y ubican dónde está activa la enfermedad.",
          },
        ],
      },
      {
        heading: { en: "Treatment and management", es: "Tratamiento y manejo" },
        paragraphs: [
          {
            en: "Treatment aims to quiet the inflammation, relieve symptoms, and maintain remission. Options range from anti-inflammatory and immune-modifying medicines to biologic therapies that block specific steps in the inflammatory process. Good nutrition and regular follow-up strengthen any plan, and quitting smoking matters greatly, because smoking makes Crohn's disease harder to control.",
            es: "El tratamiento busca calmar la inflamación, aliviar los síntomas y mantener la remisión. Las opciones van desde medicamentos antiinflamatorios e inmunomoduladores hasta terapias biológicas que bloquean pasos específicos del proceso inflamatorio. Una buena nutrición y un seguimiento regular fortalecen cualquier plan, y dejar de fumar importa muchísimo, porque fumar hace que la enfermedad de Crohn sea más difícil de controlar.",
          },
          {
            en: "Some people eventually need surgery to repair a stricture or fistula or to remove a badly damaged segment of bowel. Surgery does not cure Crohn's disease, but paired with ongoing medical therapy, it can restore comfort and day-to-day function.",
            es: "Algunas personas con el tiempo necesitan cirugía para reparar una estenosis o una fístula, o para extirpar un segmento muy dañado del intestino. La cirugía no cura la enfermedad de Crohn, pero junto con el tratamiento médico continuo puede devolver la comodidad y el funcionamiento diario.",
          },
        ],
      },
      {
        heading: {
          en: "When to talk to a gastroenterologist",
          es: "Cuándo hablar con un gastroenterólogo",
        },
        paragraphs: [
          {
            en: "See a gastroenterologist if you have persistent diarrhea, recurring abdominal pain, unexplained weight loss, or blood in your stool. If you already live with Crohn's disease, keep your care team informed about flares, new symptoms, or medication side effects. A steady partnership with your gastroenterologist is central to living well with this condition.",
            es: "Consulte a un gastroenterólogo si tiene diarrea persistente, dolor abdominal recurrente, pérdida de peso sin explicación o sangre en las heces. Si usted ya vive con la enfermedad de Crohn, mantenga informado a su equipo médico sobre los brotes, los síntomas nuevos o los efectos secundarios de los medicamentos. Una relación constante con su gastroenterólogo es clave para vivir bien con esta condición.",
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
    },
    summary: {
      en: "GERD is reflux that happens often enough to cause heartburn or injure the esophagus. Learn its symptoms, when testing helps, and the habits and medicines that bring relief.",
      es: "La ERGE es el reflujo que ocurre con tanta frecuencia que causa acidez o daña el esófago. Conozca sus síntomas, cuándo ayudan las pruebas, y los hábitos y medicamentos que brindan alivio.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Gastroesophageal reflux disease, or GERD, is a condition in which stomach contents rise into the esophagus — the tube that carries food from the mouth to the stomach — often enough to cause symptoms or damage. A ring of muscle at the lower end of the esophagus normally works like a one-way door; when it weakens or relaxes at the wrong moments, acid can wash upward.",
            es: "La enfermedad por reflujo gastroesofágico, o ERGE, es una condición en la que el contenido del estómago sube hacia el esófago — el tubo que lleva los alimentos de la boca al estómago — con la frecuencia suficiente para causar síntomas o daño. Un anillo de músculo en la parte baja del esófago normalmente funciona como una puerta de un solo sentido; cuando se debilita o se relaja en momentos indebidos, el ácido puede subir.",
          },
          {
            en: "An occasional episode of heartburn after a heavy meal is common and is not the same as GERD. The diagnosis applies when reflux is frequent, persistent, or begins to irritate the lining of the esophagus.",
            es: "Un episodio ocasional de acidez después de una comida pesada es común y no es lo mismo que la ERGE. El diagnóstico corresponde cuando el reflujo es frecuente, persistente o comienza a irritar el revestimiento del esófago.",
          },
        ],
      },
      {
        heading: { en: "Common symptoms", es: "Síntomas comunes" },
        paragraphs: [
          {
            en: "Heartburn, a burning sensation behind the breastbone, is the most recognizable symptom, along with regurgitation, the feeling of sour liquid or food rising into the throat or mouth. Symptoms are often worse after meals, when bending over, or when lying down at night.",
            es: "La acidez, una sensación de ardor detrás del esternón, es el síntoma más reconocible, junto con la regurgitación, la sensación de líquido agrio o comida que sube hacia la garganta o la boca. Los síntomas suelen empeorar después de las comidas, al inclinarse o al acostarse por la noche.",
          },
          {
            en: "GERD can also appear in less obvious ways, including a lingering cough, hoarseness, a sore throat in the morning, trouble swallowing, or the sensation of a lump in the throat.",
            es: "La ERGE también puede manifestarse de maneras menos evidentes, como una tos que no cede, ronquera, dolor de garganta por la mañana, dificultad para tragar o la sensación de un nudo en la garganta.",
          },
        ],
      },
      {
        heading: { en: "How it is diagnosed", es: "Cómo se diagnostica" },
        paragraphs: [
          {
            en: "When symptoms are typical, your gastroenterologist may begin with lifestyle changes and acid-reducing medicine, and a good response helps support the diagnosis. If symptoms persist, keep returning, or include warning signs, an upper endoscopy allows the doctor to look directly at the esophagus and check for irritation or other changes. Specialized tests that measure acid exposure or esophageal muscle function are available when the picture is less clear.",
            es: "Cuando los síntomas son típicos, su gastroenterólogo puede comenzar con cambios de estilo de vida y medicamentos que reducen el ácido, y una buena respuesta ayuda a respaldar el diagnóstico. Si los síntomas persisten, regresan una y otra vez o incluyen señales de alerta, una endoscopia superior permite al médico observar directamente el esófago y buscar irritación u otros cambios. Cuando el cuadro es menos claro, existen pruebas especializadas que miden la exposición al ácido o la función muscular del esófago.",
          },
        ],
      },
      {
        heading: { en: "Treatment and management", es: "Tratamiento y manejo" },
        paragraphs: [
          {
            en: "Daily habits make a real difference: eating smaller meals, finishing dinner a few hours before bedtime, raising the head of the bed, limiting personal trigger foods such as fried dishes, alcohol, and caffeine, reaching a healthy weight, and not smoking.",
            es: "Los hábitos diarios marcan una diferencia real: comer porciones más pequeñas, cenar unas horas antes de acostarse, elevar la cabecera de la cama, limitar los alimentos que le provocan síntomas — como frituras, alcohol y cafeína —, alcanzar un peso saludable y no fumar.",
          },
          {
            en: "Acid-reducing medicines relieve symptoms for many people and come in several families and strengths. Long-standing or hard-to-control GERD deserves specialist follow-up, because years of acid exposure can change the lining of the esophagus — a condition called Barrett's esophagus that calls for periodic monitoring. For carefully selected patients, procedures that reinforce the reflux barrier are also an option.",
            es: "Los medicamentos que reducen el ácido alivian los síntomas de muchas personas y existen en varias familias y concentraciones. La ERGE de larga duración o difícil de controlar merece seguimiento con un especialista, porque años de exposición al ácido pueden cambiar el revestimiento del esófago — una condición llamada esófago de Barrett que requiere vigilancia periódica. Para pacientes cuidadosamente seleccionados, los procedimientos que refuerzan la barrera antirreflujo también son una opción.",
          },
        ],
      },
      {
        heading: {
          en: "When to talk to a gastroenterologist",
          es: "Cuándo hablar con un gastroenterólogo",
        },
        paragraphs: [
          {
            en: "Talk to a gastroenterologist if heartburn happens more than a couple of times a week, returns whenever medicine stops, or has gone on for years without a fresh look. Seek care promptly for trouble swallowing, food getting stuck, repeated vomiting, black stools, or unintended weight loss. Chest pain should always be evaluated urgently to rule out heart problems first.",
            es: "Hable con un gastroenterólogo si la acidez ocurre más de un par de veces por semana, regresa cada vez que suspende el medicamento o lleva años sin una nueva evaluación. Busque atención pronto si tiene dificultad para tragar, comida que se atora, vómitos repetidos, heces negras o pérdida de peso involuntaria. El dolor de pecho siempre debe evaluarse con urgencia para descartar primero un problema del corazón.",
          },
        ],
      },
    ],
    relatedDocId: "info-gerd",
  },
];
