// Patient-education topics, "procedures" group. Ported 1:1 by topic/title from
// the old site's ASGE-licensed article library (legacyId = old library id), but
// every body below is ORIGINAL plain-language writing in both languages — the
// licensed article text was not reused. Spanish follows the site's neutral
// Latin-American "usted" register.

import type { EducationTopic } from "../types";

export const procedures: EducationTopic[] = [
  {
    slug: "colorectal-cancer-screening",
    legacyId: "48148",
    group: "procedures",
    title: { en: "Understanding Colorectal Cancer Screening", es: "Entienda las pruebas de detección del cáncer colorrectal" },
    summary: { en: "Screening finds polyps and early cancer before symptoms appear, and removing polyps can often keep colorectal cancer from developing at all. Learn when to start and which test options exist.", es: "Las pruebas de detección encuentran pólipos y cánceres en etapa temprana antes de que aparezcan síntomas, y extirpar los pólipos a menudo puede evitar que el cáncer colorrectal llegue a desarrollarse. Conozca cuándo comenzar y qué opciones existen." },
    sections: [
      {
        paragraphs: [
          {
            en: "Colorectal cancer develops in the colon or rectum, usually growing slowly over many years from small growths called polyps. Screening means looking for these polyps, or for early cancer, in people who feel well and have no symptoms. Because polyps can be found and removed before they ever become cancer, screening is one of the few tests that can actually prevent a cancer rather than simply detect it.",
            es: "El cáncer colorrectal se desarrolla en el colon o en el recto, por lo general creciendo lentamente durante muchos años a partir de pequeños crecimientos llamados pólipos. Hacerse pruebas de detección significa buscar esos pólipos, o un cáncer en etapa temprana, en personas que se sienten bien y no tienen síntomas. Como los pólipos pueden encontrarse y extirparse antes de que se conviertan en cáncer, la detección es una de las pocas pruebas que puede realmente prevenir un cáncer, y no solo encontrarlo.",
          },
          {
            en: "Your gastroenterologist will help you decide when to start screening and which test fits your health history. Many adults at average risk begin at age 45, and screening may start earlier if colorectal cancer or certain polyps run in the family.",
            es: "Su gastroenterólogo le ayudará a decidir cuándo comenzar y qué prueba se ajusta a su historia de salud. Muchos adultos con riesgo promedio comienzan a los 45 años, y la detección puede empezar antes si hay antecedentes familiares de cáncer colorrectal o de ciertos pólipos.",
          },
        ],
      },
      {
        heading: { en: "Why screening matters", es: "Por qué es importante la detección" },
        paragraphs: [
          {
            en: "Polyps rarely cause symptoms while they are small, so waiting for warning signs is not a reliable plan. When screening finds a polyp, it can usually be removed during the same colonoscopy. When screening finds a cancer early, treatment tends to be simpler and more effective. Your doctor will discuss how your personal and family history affects your timing and choice of test.",
            es: "Los pólipos rara vez causan síntomas mientras son pequeños, así que esperar señales de alarma no es un plan confiable. Cuando la prueba encuentra un pólipo, por lo general puede extirparse durante la misma colonoscopia. Cuando se encuentra un cáncer a tiempo, el tratamiento suele ser más sencillo y más eficaz. Su médico conversará con usted sobre cómo sus antecedentes personales y familiares influyen en el momento y en la elección de la prueba.",
          },
        ],
      },
      {
        heading: { en: "Your screening options", es: "Sus opciones de detección" },
        paragraphs: [
          {
            en: "Colonoscopy is the most complete option. It examines the entire colon, and any polyps found can be removed right away, which is why many patients choose it as their first screening test. When the exam is normal, it usually does not need to be repeated for several years.",
            es: "La colonoscopia es la opción más completa. Examina todo el colon, y cualquier pólipo que se encuentre puede extirparse de inmediato; por eso muchos pacientes la eligen como su primera prueba de detección. Cuando el examen es normal, por lo general no necesita repetirse durante varios años.",
          },
          {
            en: "Stool-based tests are done at home on a small sample and look for hidden blood or abnormal cells. They are easier to complete but must be repeated more often, and a positive result still needs to be followed by a colonoscopy. Imaging-based options exist as well, and your gastroenterologist can review which choice makes sense for you.",
            es: "Las pruebas de heces se hacen en casa con una muestra pequeña y buscan sangre oculta o células anormales. Son más fáciles de completar, pero deben repetirse con más frecuencia, y un resultado positivo siempre debe confirmarse con una colonoscopia. También existen opciones basadas en imágenes, y su gastroenterólogo puede revisar con usted cuál tiene sentido en su caso.",
          },
        ],
      },
      {
        heading: { en: "How to prepare", es: "Cómo prepararse" },
        paragraphs: [
          {
            en: "Stool tests require little preparation beyond following the kit instructions. Colonoscopy requires a bowel preparation: a day of clear liquids and a prescribed laxative solution that empties the colon so your doctor can see clearly. Your care team will give you step-by-step instructions and adjust your regular medicines if needed.",
            es: "Las pruebas de heces requieren poca preparación más allá de seguir las instrucciones del kit. La colonoscopia requiere una preparación intestinal: un día de líquidos claros y una solución laxante recetada que vacía el colon para que su médico pueda ver con claridad. Su equipo de atención le dará instrucciones paso a paso y ajustará sus medicamentos habituales si es necesario.",
          },
        ],
      },
      {
        heading: { en: "What to expect", es: "Qué esperar" },
        paragraphs: [
          {
            en: "If you have a colonoscopy, you will receive sedation, and most patients sleep comfortably through the exam. You will need someone to drive you home, and most people return to normal activities the next day.",
            es: "Si se realiza una colonoscopia, recibirá sedación, y la mayoría de los pacientes duerme cómodamente durante todo el examen. Necesitará que alguien le lleve a casa, y la mayoría de las personas retoma sus actividades normales al día siguiente.",
          },
          {
            en: "Your doctor will explain the findings, how often you should be screened going forward, and any follow-up you need. If a stool test comes back positive, try not to be alarmed: it means a colonoscopy is needed to find the cause, which is often something other than cancer.",
            es: "Su médico le explicará los hallazgos, con qué frecuencia debe hacerse pruebas en adelante y el seguimiento que necesite. Si una prueba de heces resulta positiva, procure no alarmarse: significa que se necesita una colonoscopia para encontrar la causa, que muchas veces es algo distinto al cáncer.",
          },
        ],
      },
    ],
    relatedDocId: "info-colorectal-cancer",
  },
  {
    slug: "upper-endoscopy",
    legacyId: "48150",
    group: "procedures",
    title: { en: "Understanding Upper Endoscopy", es: "Entienda la endoscopia superior" },
    summary: { en: "A short, sedated exam that lets your gastroenterologist see the esophagus, stomach, and duodenum, and take samples or treat certain problems during the same visit.", es: "Un examen breve, con sedación, que permite a su gastroenterólogo ver el esófago, el estómago y el duodeno, y tomar muestras o tratar ciertos problemas en la misma visita." },
    sections: [
      {
        paragraphs: [
          {
            en: "An upper endoscopy, often called an EGD (short for esophagogastroduodenoscopy), is an exam of the upper digestive tract: the esophagus, the stomach, and the duodenum, the first stretch of the small intestine. Your gastroenterologist guides a thin, flexible tube with a light and a tiny camera through your mouth and watches the images on a video monitor.",
            es: "La endoscopia superior, a menudo llamada EGD (abreviatura de esofagogastroduodenoscopia), es un examen del tracto digestivo superior: el esófago, el estómago y el duodeno, la primera porción del intestino delgado. Su gastroenterólogo guía por la boca un tubo delgado y flexible con luz y una pequeña cámara, y observa las imágenes en un monitor.",
          },
          {
            en: "Beyond simply looking, the endoscope also lets your doctor take painless tissue samples, called biopsies, and treat certain problems during the same visit.",
            es: "Además de observar, el endoscopio también permite a su médico tomar muestras de tejido sin dolor, llamadas biopsias, y tratar ciertos problemas en la misma visita.",
          },
        ],
      },
      {
        heading: { en: "Why your gastroenterologist may recommend it", es: "Por qué su gastroenterólogo puede recomendarla" },
        paragraphs: [
          {
            en: "Upper endoscopy helps explain symptoms such as persistent heartburn, difficulty or pain when swallowing, ongoing nausea or vomiting, upper abdominal pain, or unexplained weight loss or anemia. It is also used to keep watch on known conditions, such as ulcers or Barrett's esophagus.",
            es: "La endoscopia superior ayuda a explicar síntomas como acidez persistente, dificultad o dolor al tragar, náuseas o vómitos continuos, dolor en la parte alta del abdomen, o pérdida de peso o anemia sin explicación. También se usa para vigilar condiciones ya conocidas, como úlceras o el esófago de Barrett.",
          },
          {
            en: "The same exam can treat some problems on the spot; for example, gently widening a narrowed esophagus, stopping a bleeding site, or removing something that was swallowed.",
            es: "El mismo examen puede tratar algunos problemas en el momento; por ejemplo, ensanchar con suavidad un esófago estrechado, detener un punto de sangrado o retirar un objeto tragado.",
          },
        ],
      },
      {
        heading: { en: "How to prepare", es: "Cómo prepararse" },
        paragraphs: [
          {
            en: "Your stomach needs to be empty, so you will be asked not to eat or drink for several hours beforehand; your instructions will list the exact times. Tell your care team about all the medicines you take, especially blood thinners and diabetes medicines, and arrange for someone to drive you home, since you will receive sedation.",
            es: "El estómago debe estar vacío, así que se le pedirá no comer ni beber durante varias horas antes; sus instrucciones indicarán los horarios exactos. Informe a su equipo de atención sobre todos los medicamentos que toma, en especial anticoagulantes y medicamentos para la diabetes, y organice que alguien le lleve a casa, ya que recibirá sedación.",
          },
        ],
      },
      {
        heading: { en: "During the procedure", es: "Durante el procedimiento" },
        paragraphs: [
          {
            en: "Medicine given through a small IV keeps you relaxed and drowsy, and many patients sleep through the exam entirely. A plastic mouthguard protects your teeth, and the tube does not interfere with your breathing.",
            es: "Un medicamento administrado por una vía intravenosa le mantiene relajado y somnoliento, y muchos pacientes duermen durante todo el examen. Un protector bucal de plástico cuida sus dientes, y el tubo no interfiere con la respiración.",
          },
          {
            en: "The exam itself usually takes less than half an hour, and you will not feel it if biopsies are taken.",
            es: "El examen en sí suele durar menos de media hora, y usted no sentirá nada si se toman biopsias.",
          },
        ],
      },
      {
        heading: { en: "Afterward", es: "Después del procedimiento" },
        paragraphs: [
          {
            en: "You will rest in a recovery area until the sedation wears off. A mildly sore throat or a bloated feeling is common and fades quickly. Plan to take the rest of the day off from driving, work, and important decisions.",
            es: "Descansará en un área de recuperación hasta que pase el efecto de la sedación. Es común tener la garganta un poco irritada o sensación de inflamación, y desaparece pronto. Planee no conducir, no trabajar y no tomar decisiones importantes durante el resto del día.",
          },
          {
            en: "Your doctor will usually share the initial findings before you leave; biopsy results take a few more days. Your care team will tell you when to resume eating and your regular medicines, and which symptoms should prompt you to contact them.",
            es: "Por lo general, su médico le comentará los hallazgos iniciales antes de que se vaya; los resultados de las biopsias tardan unos días más. Su equipo de atención le indicará cuándo volver a comer y a tomar sus medicamentos habituales, y qué síntomas deben motivarle a comunicarse con ellos.",
          },
        ],
      },
    ],
  },
  {
    slug: "endoscopic-ultrasonography",
    legacyId: "48151",
    group: "procedures",
    title: { en: "Understanding Endoscopic Ultrasonography", es: "Entienda el ultrasonido endoscópico" },
    summary: { en: "EUS combines an endoscope with a tiny ultrasound probe to see beneath the lining of the digestive tract and into nearby organs such as the pancreas, and to guide precise tissue sampling.", es: "El EUS combina un endoscopio con una pequeña sonda de ultrasonido para ver debajo del revestimiento del tracto digestivo y hacia órganos cercanos como el páncreas, y para guiar una toma de muestras precisa." },
    sections: [
      {
        paragraphs: [
          {
            en: "Endoscopic ultrasonography, usually called EUS, pairs a flexible endoscope with a miniature ultrasound probe at its tip. While a standard endoscope shows the surface lining of the digestive tract, the ultrasound adds a view beneath that surface: through the layers of the wall and into neighboring organs such as the pancreas, bile ducts, gallbladder, liver, and nearby lymph nodes.",
            es: "La ultrasonografía endoscópica, generalmente llamada EUS por sus siglas en inglés, une un endoscopio flexible con una sonda de ultrasonido en miniatura en la punta. Mientras que un endoscopio común muestra la superficie del revestimiento del tracto digestivo, el ultrasonido agrega una vista por debajo de esa superficie: a través de las capas de la pared y hacia órganos vecinos como el páncreas, las vías biliares, la vesícula, el hígado y los ganglios linfáticos cercanos.",
          },
          {
            en: "Because it shows areas that ordinary endoscopy and many scans cannot capture in fine detail, EUS often answers questions that other tests leave open.",
            es: "Como muestra zonas que la endoscopia común y muchos estudios de imagen no captan con detalle fino, el EUS a menudo responde preguntas que otras pruebas dejan abiertas.",
          },
        ],
      },
      {
        heading: { en: "Why it is recommended", es: "Por qué se recomienda" },
        paragraphs: [
          {
            en: "Your gastroenterologist may suggest EUS to take a closer look at something found on a CT scan or other imaging, to evaluate cysts or masses in the pancreas, to search for stones in the bile duct, or to examine a lump beneath the lining of the esophagus, stomach, or rectum.",
            es: "Su gastroenterólogo puede sugerir un EUS para observar de cerca algo detectado en una tomografía u otro estudio de imagen, para evaluar quistes o masas en el páncreas, para buscar cálculos en la vía biliar o para examinar un bulto debajo del revestimiento del esófago, el estómago o el recto.",
          },
          {
            en: "EUS also helps show how deep an abnormality goes, which guides treatment planning. When a tissue sample is needed, the doctor can pass a very fine needle through the scope, guided by the ultrasound image, often avoiding a more invasive procedure.",
            es: "El EUS también ayuda a mostrar qué tan profunda es una anomalía, lo que orienta el plan de tratamiento. Cuando se necesita una muestra de tejido, el médico puede pasar una aguja muy fina a través del endoscopio, guiada por la imagen de ultrasonido, evitando muchas veces un procedimiento más invasivo.",
          },
        ],
      },
      {
        heading: { en: "How to prepare", es: "Cómo prepararse" },
        paragraphs: [
          {
            en: "For an upper EUS your stomach must be empty, so you will not eat or drink for several hours beforehand. If the rectum is the area being examined, you may be asked to use an enema or a light prep. Review your medicines with your care team, especially blood thinners, since a needle sample may be taken, and arrange a ride home.",
            es: "Para un EUS superior el estómago debe estar vacío, así que no comerá ni beberá durante varias horas antes. Si la zona a examinar es el recto, es posible que se le pida usar un enema o una preparación ligera. Revise sus medicamentos con su equipo de atención, en especial los anticoagulantes, ya que podría tomarse una muestra con aguja, y organice quién le llevará a casa.",
          },
        ],
      },
      {
        heading: { en: "During the procedure", es: "Durante el procedimiento" },
        paragraphs: [
          {
            en: "You will receive sedation through an IV, and most patients remember little or nothing of the exam. The endoscope is passed gently through the mouth, or the rectum, depending on the area being studied, while your doctor watches the ultrasound images. Any needle sampling happens while you are sedated, so you will not feel it. Most exams are finished within an hour.",
            es: "Recibirá sedación por vía intravenosa, y la mayoría de los pacientes recuerda poco o nada del examen. El endoscopio se pasa con suavidad por la boca, o por el recto, según la zona a estudiar, mientras su médico observa las imágenes de ultrasonido. Cualquier toma de muestra con aguja ocurre mientras usted está sedado, así que no la sentirá. La mayoría de los exámenes termina en menos de una hora.",
          },
        ],
      },
      {
        heading: { en: "Afterward", es: "Después del procedimiento" },
        paragraphs: [
          {
            en: "After a short recovery you can usually go home the same day, perhaps with a mild sore throat or some bloating that settles on its own. Do not drive for the rest of the day.",
            es: "Tras una recuperación breve, por lo general puede irse a casa el mismo día, quizá con la garganta levemente irritada o algo de inflamación que se alivia sola. No conduzca durante el resto del día.",
          },
          {
            en: "Your doctor will go over the initial images with you; results from any tissue samples take several days. Your care team will explain the findings and what, if anything, comes next.",
            es: "Su médico revisará con usted las imágenes iniciales; los resultados de las muestras de tejido tardan varios días. Su equipo de atención le explicará los hallazgos y los pasos a seguir, si los hay.",
          },
        ],
      },
    ],
  },
  {
    slug: "colonoscopy",
    legacyId: "48155",
    group: "procedures",
    title: { en: "Understanding Colonoscopy", es: "Entienda la colonoscopia" },
    summary: { en: "The exam that lets your gastroenterologist inspect the entire colon and remove polyps in the same visit — the most complete way to screen for colorectal cancer.", es: "El examen que permite a su gastroenterólogo revisar todo el colon y extirpar pólipos en la misma visita: la forma más completa de detectar el cáncer colorrectal." },
    sections: [
      {
        paragraphs: [
          {
            en: "A colonoscopy is an exam of the rectum and the entire colon, or large intestine. Your gastroenterologist uses a colonoscope, a thin and flexible tube with a light and a camera, to inspect the lining of the colon on a video monitor.",
            es: "La colonoscopia es un examen del recto y de todo el colon, o intestino grueso. Su gastroenterólogo usa un colonoscopio, un tubo delgado y flexible con luz y cámara, para revisar el revestimiento del colon en un monitor.",
          },
          {
            en: "It is the one screening test that can both find and fix: if polyps are discovered, they are usually removed during the very same exam, before they have a chance to turn into cancer.",
            es: "Es la prueba de detección que puede encontrar y a la vez resolver: si se descubren pólipos, por lo general se extirpan durante el mismo examen, antes de que tengan oportunidad de convertirse en cáncer.",
          },
        ],
      },
      {
        heading: { en: "Why your gastroenterologist recommends it", es: "Por qué la recomienda su gastroenterólogo" },
        paragraphs: [
          {
            en: "The most common reason is colorectal cancer screening. Most colorectal cancers begin as polyps, and removing polyps early is the best protection available.",
            es: "La razón más común es la detección del cáncer colorrectal. La mayoría de estos cánceres comienza como pólipos, y extirparlos a tiempo es la mejor protección disponible.",
          },
          {
            en: "Colonoscopy is also used to investigate symptoms such as bleeding, a lasting change in bowel habits, chronic diarrhea, unexplained anemia, or abdominal pain, and to keep watch after previous polyps or in conditions such as inflammatory bowel disease.",
            es: "La colonoscopia también se usa para investigar síntomas como sangrado, un cambio persistente en los hábitos intestinales, diarrea crónica, anemia sin explicación o dolor abdominal, y para dar seguimiento después de pólipos previos o en condiciones como la enfermedad inflamatoria intestinal.",
          },
        ],
      },
      {
        heading: { en: "Preparing for the exam", es: "La preparación para el examen" },
        paragraphs: [
          {
            en: "The colon must be completely clean for your doctor to see small polyps. Starting a few days before, you may be asked to avoid certain high-fiber foods; the day before, you will switch to clear liquids and take your prescribed prep, usually split into an evening dose and an early-morning dose.",
            es: "El colon debe estar completamente limpio para que su médico pueda ver pólipos pequeños. Desde unos días antes, es posible que se le pida evitar ciertos alimentos altos en fibra; el día anterior, pasará a líquidos claros y tomará la preparación recetada, por lo general dividida en una dosis por la noche y otra en la madrugada.",
          },
          {
            en: "The prep causes frequent, watery bowel movements — that means it is working. Follow every step of your instructions, and arrange for someone to drive you home.",
            es: "La preparación provoca evacuaciones frecuentes y líquidas: eso significa que está funcionando. Siga cada paso de sus instrucciones y organice que alguien le lleve a casa.",
          },
        ],
      },
      {
        heading: { en: "During the procedure", es: "Durante el procedimiento" },
        paragraphs: [
          {
            en: "Sedation is given through a small IV, and most patients sleep comfortably and feel little or nothing. While you rest on your side, the doctor guides the colonoscope through the colon and examines the lining carefully.",
            es: "La sedación se administra por una vía intravenosa, y la mayoría de los pacientes duerme cómodamente y siente poco o nada. Mientras usted descansa de lado, el médico guía el colonoscopio a través del colon y examina el revestimiento con cuidado.",
          },
          {
            en: "Removing polyps and taking biopsies are painless. The exam itself typically takes well under an hour.",
            es: "Extirpar pólipos y tomar biopsias no duele. El examen en sí normalmente dura bastante menos de una hora.",
          },
        ],
      },
      {
        heading: { en: "Afterward and your results", es: "Después del examen y sus resultados" },
        paragraphs: [
          {
            en: "You will wake in a recovery area and may feel gassy or bloated for a short while as the air used during the exam passes. Most people eat normally later the same day and return to their usual activities the next morning.",
            es: "Despertará en un área de recuperación y puede sentir gases o inflamación por un rato, mientras sale el aire utilizado durante el examen. La mayoría de las personas come normalmente ese mismo día y retoma sus actividades habituales a la mañana siguiente.",
          },
          {
            en: "Your doctor will usually explain what was found before you go home; biopsy results follow within days. How soon you need another colonoscopy depends on what was found, and your care team will give you a clear timeline.",
            es: "Por lo general, su médico le explicará lo que se encontró antes de que regrese a casa; los resultados de las biopsias llegan en unos días. Cuándo necesitará otra colonoscopia depende de los hallazgos, y su equipo de atención le dará un calendario claro.",
          },
        ],
      },
    ],
  },
  {
    slug: "capsule-endoscopy",
    legacyId: "48156",
    group: "procedures",
    title: { en: "Understanding Capsule Endoscopy", es: "Entienda la endoscopia por cápsula" },
    summary: { en: "A pill-sized camera you swallow photographs the small intestine — the part of the digestive tract other scopes cannot easily reach — with no sedation needed.", es: "Una cámara del tamaño de una píldora que usted traga fotografía el intestino delgado, la parte del tubo digestivo que otros endoscopios no alcanzan con facilidad, sin necesidad de sedación." },
    sections: [
      {
        paragraphs: [
          {
            en: "Capsule endoscopy uses a camera the size of a large vitamin pill. You swallow it with water, and as it travels naturally through your digestive system it takes thousands of pictures of the small intestine, the long middle section of the gut that standard endoscopes cannot easily reach.",
            es: "La endoscopia por cápsula utiliza una cámara del tamaño de una vitamina grande. Usted la traga con agua y, mientras recorre de forma natural su sistema digestivo, toma miles de fotografías del intestino delgado, la larga sección media del tubo digestivo que los endoscopios convencionales no alcanzan con facilidad.",
          },
          {
            en: "The images are transmitted to a small recorder you wear during the day. The capsule itself is disposable: it leaves your body in a bowel movement, usually within a day or two, and is not retrieved.",
            es: "Las imágenes se transmiten a una pequeña grabadora que usted lleva puesta durante el día. La cápsula es desechable: sale del cuerpo en una evacuación, por lo general en uno o dos días, y no se recupera.",
          },
        ],
      },
      {
        heading: { en: "Why it is recommended", es: "Por qué se recomienda" },
        paragraphs: [
          {
            en: "Your gastroenterologist may recommend capsule endoscopy when the source of a problem seems to lie in the small intestine — for example, unexplained bleeding or iron-deficiency anemia after a normal upper endoscopy and colonoscopy, suspected Crohn's disease of the small bowel, or the need to check for small-intestine polyps or tumors.",
            es: "Su gastroenterólogo puede recomendar la endoscopia por cápsula cuando el origen de un problema parece estar en el intestino delgado; por ejemplo, sangrado o anemia por deficiencia de hierro sin explicación después de una endoscopia superior y una colonoscopia normales, sospecha de enfermedad de Crohn del intestino delgado, o la necesidad de buscar pólipos o tumores en esa zona.",
          },
        ],
      },
      {
        heading: { en: "How to prepare", es: "Cómo prepararse" },
        paragraphs: [
          {
            en: "You will typically stop eating the evening before the test, and your doctor may prescribe a light prep so the images are clear. Ask which of your medicines you should take that morning.",
            es: "Normalmente dejará de comer la noche anterior a la prueba, y su médico puede recetar una preparación ligera para que las imágenes salgan claras. Pregunte cuáles de sus medicamentos debe tomar esa mañana.",
          },
          {
            en: "Tell your care team if you have trouble swallowing, previous abdominal surgery, a known narrowing of the bowel, or an implanted heart device such as a pacemaker; these are all things your doctor weighs beforehand.",
            es: "Informe a su equipo de atención si tiene dificultad para tragar, cirugías abdominales previas, un estrechamiento conocido del intestino o un dispositivo cardíaco implantado, como un marcapasos; todo esto lo evalúa su médico de antemano.",
          },
        ],
      },
      {
        heading: { en: "On the day of the test", es: "El día de la prueba" },
        paragraphs: [
          {
            en: "At the office you will swallow the capsule with a sip of water and be fitted with the small recorder, worn on a belt or over the shoulder. You can then leave and go about a quiet, normal day.",
            es: "En el consultorio tragará la cápsula con un sorbo de agua y se le colocará la pequeña grabadora, que se lleva en un cinturón o colgada al hombro. Después podrá salir y pasar un día tranquilo y normal.",
          },
          {
            en: "Your instructions will say when you may drink clear liquids and eat a light snack, usually a few hours in. Avoid strenuous exercise, and do not schedule an MRI until you are sure the capsule has passed.",
            es: "Sus instrucciones indicarán cuándo puede beber líquidos claros y comer algo ligero, por lo general unas horas después. Evite el ejercicio intenso y no programe una resonancia magnética hasta estar seguro de que la cápsula salió del cuerpo.",
          },
        ],
      },
      {
        heading: { en: "Afterward and results", es: "Después de la prueba y resultados" },
        paragraphs: [
          {
            en: "You will return the recorder at the end of the day, usually after about eight hours. There is no sedation and no recovery time, so most people work or run errands as usual while wearing it.",
            es: "Devolverá la grabadora al final del día, por lo general después de unas ocho horas. No hay sedación ni tiempo de recuperación, así que la mayoría de las personas trabaja o hace sus pendientes con normalidad mientras la lleva puesta.",
          },
          {
            en: "Reviewing many thousands of images takes time, so expect results in the days that follow rather than the same day. If you have not seen the capsule pass, or you develop abdominal pain, bloating, or vomiting, contact your care team; rarely, an X-ray is used to confirm the capsule has left the body.",
            es: "Revisar muchos miles de imágenes toma tiempo, así que espere los resultados en los días siguientes y no el mismo día. Si no ha visto salir la cápsula, o presenta dolor abdominal, inflamación o vómitos, comuníquese con su equipo de atención; en casos poco comunes se usa una radiografía para confirmar que la cápsula salió del cuerpo.",
          },
        ],
      },
    ],
  },
  {
    slug: "peg-feeding-tube",
    legacyId: "48157",
    group: "procedures",
    title: { en: "Understanding Percutaneous Endoscopic Gastrostomy (PEG)", es: "Entienda la gastrostomía endoscópica percutánea (PEG)" },
    summary: { en: "A PEG places a soft feeding tube through the skin into the stomach, so patients who cannot swallow safely can still receive nutrition, fluids, and medicines.", es: "La PEG coloca una sonda de alimentación suave a través de la piel hasta el estómago, para que los pacientes que no pueden tragar con seguridad reciban nutrición, líquidos y medicamentos." },
    sections: [
      {
        paragraphs: [
          {
            en: "A percutaneous endoscopic gastrostomy, or PEG, is a procedure that places a soft feeding tube through the skin of the abdomen directly into the stomach. The tube allows nutrition, fluids, and medicines to be given without swallowing.",
            es: "La gastrostomía endoscópica percutánea, o PEG por sus siglas en inglés, es un procedimiento que coloca una sonda de alimentación suave a través de la piel del abdomen, directamente hasta el estómago. La sonda permite dar nutrición, líquidos y medicamentos sin necesidad de tragar.",
          },
          {
            en: "A PEG can be temporary or long-term, depending on the condition being treated. Your gastroenterologist will discuss the goals of the tube, and the alternatives, with you and your family before anything is scheduled.",
            es: "Una PEG puede ser temporal o de largo plazo, según la condición que se esté tratando. Su gastroenterólogo conversará sobre los objetivos de la sonda, y las alternativas, con usted y su familia antes de programar nada.",
          },
        ],
      },
      {
        heading: { en: "Why it may be recommended", es: "Por qué puede recomendarse" },
        paragraphs: [
          {
            en: "A PEG is considered when someone cannot swallow safely, or cannot take in enough food by mouth for a prolonged period, but the stomach and intestines still work. Common examples include swallowing problems after a stroke or with certain neurologic conditions, and treatments of the head and neck that make eating difficult. The aim is simple: dependable nutrition while protecting the lungs from food going down the wrong way.",
            es: "Una PEG se considera cuando una persona no puede tragar con seguridad, o no logra alimentarse lo suficiente por la boca durante un periodo prolongado, pero el estómago y los intestinos siguen funcionando. Ejemplos comunes incluyen problemas para tragar después de un derrame cerebral o con ciertas condiciones neurológicas, y tratamientos de cabeza y cuello que dificultan comer. El objetivo es simple: una nutrición confiable mientras se protege a los pulmones de que la comida se vaya por el camino equivocado.",
          },
        ],
      },
      {
        heading: { en: "How to prepare", es: "Cómo prepararse" },
        paragraphs: [
          {
            en: "You will fast for several hours beforehand. Your care team will review your medicines, blood thinners in particular, and usually gives a dose of antibiotics before the procedure to lower the chance of infection. Because sedation is used, plan for someone to accompany you and take you home.",
            es: "Ayunará durante varias horas antes. Su equipo de atención revisará sus medicamentos, en particular los anticoagulantes, y por lo general administra una dosis de antibióticos antes del procedimiento para reducir la probabilidad de infección. Como se usa sedación, planee que alguien le acompañe y le lleve a casa.",
          },
        ],
      },
      {
        heading: { en: "How the tube is placed", es: "Cómo se coloca la sonda" },
        paragraphs: [
          {
            en: "With you sedated and comfortable, the doctor passes an endoscope through the mouth into the stomach and uses its light to choose a safe spot on the skin. That small area is numbed, a small opening is made, and the tube is guided into position.",
            es: "Con usted sedado y cómodo, el médico pasa un endoscopio por la boca hasta el estómago y usa su luz para elegir un punto seguro en la piel. Esa pequeña zona se adormece con anestesia local, se hace una abertura pequeña y la sonda se guía hasta su posición.",
          },
          {
            en: "A soft internal bumper and an external disc hold it gently in place. The placement itself usually takes less than an hour.",
            es: "Un tope interno suave y un disco externo la sostienen con suavidad en su lugar. La colocación en sí suele tomar menos de una hora.",
          },
        ],
      },
      {
        heading: { en: "Caring for a PEG tube", es: "El cuidado de la sonda PEG" },
        paragraphs: [
          {
            en: "Mild soreness at the site is normal for a few days and is managed with simple measures. Before you go home, your care team will show you, and anyone helping you, how to keep the skin clean, flush the tube, and give feedings and medicines through it.",
            es: "Una molestia leve en el sitio es normal durante unos días y se maneja con medidas sencillas. Antes de irse a casa, su equipo de atención le mostrará, a usted y a quien le ayude, cómo mantener la piel limpia, cómo enjuagar la sonda y cómo dar las alimentaciones y los medicamentos a través de ella.",
          },
          {
            en: "Once healed, the site needs only routine care, and most daily activities can continue. Contact your care team promptly if you notice spreading redness, drainage, fever, or worsening pain at the site, or if the tube comes out. When the tube is no longer needed, your doctor can remove or replace it.",
            es: "Una vez cicatrizado, el sitio solo necesita cuidados de rutina, y la mayoría de las actividades diarias puede continuar. Comuníquese pronto con su equipo de atención si nota enrojecimiento que se extiende, secreción, fiebre o dolor que empeora en el sitio, o si la sonda se sale. Cuando la sonda ya no sea necesaria, su médico puede retirarla o reemplazarla.",
          },
        ],
      },
    ],
  },
  {
    slug: "esophageal-manometry-ph-impedance",
    legacyId: "48160",
    group: "procedures",
    title: { en: "Understanding Esophageal Manometry & 24-Hour pH and Impedance Tests", es: "Entienda la manometría esofágica y las pruebas de pH e impedancia de 24 horas" },
    summary: { en: "Two companion tests: manometry measures how well the esophagus moves, and the 24-hour pH and impedance study measures reflux during an ordinary day.", es: "Dos pruebas complementarias: la manometría mide qué tan bien se mueve el esófago, y el estudio de pH e impedancia de 24 horas mide el reflujo durante un día normal." },
    sections: [
      {
        paragraphs: [
          {
            en: "The esophagus is the muscular tube that carries food from your mouth to your stomach. When it stops working smoothly, two related tests help show why. Esophageal manometry measures the strength and coordination of the esophageal muscles and of the valve at the bottom of the esophagus.",
            es: "El esófago es el tubo muscular que lleva la comida de la boca al estómago. Cuando deja de funcionar con normalidad, dos pruebas relacionadas ayudan a mostrar por qué. La manometría esofágica mide la fuerza y la coordinación de los músculos del esófago y de la válvula que está en su parte baja.",
          },
          {
            en: "A 24-hour pH and impedance study measures how often stomach contents, acidic or not, flow back up into the esophagus over a full, ordinary day. The two tests are often done around the same time, because together they give a complete picture of swallowing and reflux.",
            es: "El estudio de pH e impedancia de 24 horas mide con qué frecuencia el contenido del estómago, ácido o no, sube de regreso al esófago a lo largo de un día completo y normal. Las dos pruebas suelen hacerse por las mismas fechas, porque juntas dan una imagen completa de la deglución y del reflujo.",
          },
        ],
      },
      {
        heading: { en: "Why your gastroenterologist may recommend them", es: "Por qué su gastroenterólogo puede recomendarlas" },
        paragraphs: [
          {
            en: "These tests help evaluate difficulty swallowing, the feeling of food sticking, chest pain once the heart has been ruled out, and heartburn or regurgitation that persists despite treatment. They are also a standard step before certain anti-reflux operations, because the results help confirm that surgery is the right choice.",
            es: "Estas pruebas ayudan a evaluar la dificultad para tragar, la sensación de que la comida se atora, el dolor de pecho una vez descartado el corazón, y la acidez o regurgitación que persiste a pesar del tratamiento. También son un paso habitual antes de ciertas cirugías antirreflujo, porque los resultados ayudan a confirmar que la operación es la opción correcta.",
          },
        ],
      },
      {
        heading: { en: "How to prepare", es: "Cómo prepararse" },
        paragraphs: [
          {
            en: "You will be asked not to eat or drink for several hours before the catheter is placed. Some acid-reducing and motility medicines change the results, so your care team will tell you exactly which ones to pause and when; do not stop anything on your own. Sedation is generally not used, because the tests depend on your normal swallowing.",
            es: "Se le pedirá no comer ni beber durante varias horas antes de colocar el catéter. Algunos medicamentos para el ácido y para la motilidad alteran los resultados, así que su equipo de atención le dirá exactamente cuáles suspender y cuándo; no deje de tomar nada por su cuenta. Generalmente no se usa sedación, porque las pruebas dependen de su deglución normal.",
          },
        ],
      },
      {
        heading: { en: "During the tests", es: "Durante las pruebas" },
        paragraphs: [
          {
            en: "For manometry, a thin, soft catheter is passed through a numbed nostril down into the esophagus. You will sit or lie comfortably and swallow small sips of water on cue while sensors record the pressures. It is common to gag briefly as the tube goes in; that feeling settles quickly, and the study takes roughly half an hour.",
            es: "Para la manometría, se pasa un catéter delgado y suave por una fosa nasal adormecida hasta el esófago. Usted estará sentado o acostado cómodamente y tragará pequeños sorbos de agua cuando se le indique, mientras los sensores registran las presiones. Es común tener arcadas breves cuando entra el catéter; esa sensación pasa rápido, y el estudio dura alrededor de media hora.",
          },
          {
            en: "For the 24-hour study, an even thinner catheter stays in place for about a day, taped at the nose and connected to a small recorder you wear. You will go home, eat normally, stay active, and keep a short diary of meals, symptoms, and sleep; living your regular day is exactly what makes the recording useful.",
            es: "Para el estudio de 24 horas, un catéter aún más delgado permanece colocado durante aproximadamente un día, fijado con cinta en la nariz y conectado a una pequeña grabadora que usted lleva consigo. Irá a casa, comerá con normalidad, se mantendrá activo y llevará un breve diario de comidas, síntomas y sueño; vivir su día habitual es justamente lo que hace útil el registro.",
          },
        ],
      },
      {
        heading: { en: "Afterward and results", es: "Después de las pruebas y resultados" },
        paragraphs: [
          {
            en: "Removing the catheter takes only a moment, and your nose and throat may feel mildly irritated for a short while.",
            es: "Retirar el catéter toma solo un momento, y la nariz y la garganta pueden sentirse levemente irritadas por un rato.",
          },
          {
            en: "A specialist then analyzes the measurements, and your gastroenterologist will review the results with you at a follow-up visit. The findings help decide the next step: adjusting medicines, further testing, or a conversation about surgery.",
            es: "Después, un especialista analiza las mediciones, y su gastroenterólogo revisará los resultados con usted en una visita de seguimiento. Los hallazgos ayudan a decidir el siguiente paso: ajustar medicamentos, hacer más pruebas o conversar sobre una cirugía.",
          },
        ],
      },
    ],
  },
  {
    slug: "ercp",
    legacyId: "48162",
    group: "procedures",
    title: { en: "Understanding ERCP", es: "Entienda la CPRE" },
    summary: { en: "ERCP pairs endoscopy with X-ray imaging to find blockages in the bile and pancreatic ducts — and treat many of them during the same procedure.", es: "La CPRE combina la endoscopia con imágenes de rayos X para encontrar obstrucciones en las vías biliares y el conducto pancreático, y tratar muchas de ellas durante el mismo procedimiento." },
    sections: [
      {
        paragraphs: [
          {
            en: "Endoscopic retrograde cholangiopancreatography, ERCP for short, is a procedure that examines the drainage ducts of the liver, gallbladder, and pancreas. Bile ducts carry bile from the liver to the intestine; the pancreatic duct does the same for the digestive juices of the pancreas.",
            es: "La colangiopancreatografía retrógrada endoscópica (CPRE, o ERCP por sus siglas en inglés) es un procedimiento que examina los conductos de drenaje del hígado, la vesícula y el páncreas. Las vías biliares llevan la bilis del hígado al intestino; el conducto pancreático hace lo mismo con los jugos digestivos del páncreas.",
          },
          {
            en: "ERCP combines a flexible endoscope with contrast dye and X-ray images to show these ducts clearly. What sets it apart from a scan is that your doctor can treat many problems during the same procedure, not just find them.",
            es: "La CPRE combina un endoscopio flexible con un medio de contraste e imágenes de rayos X para mostrar estos conductos con claridad. Lo que la distingue de un estudio de imagen es que su médico puede tratar muchos problemas durante el mismo procedimiento, no solo encontrarlos.",
          },
        ],
      },
      {
        heading: { en: "Why it is recommended", es: "Por qué se recomienda" },
        paragraphs: [
          {
            en: "ERCP is used most often when a duct is blocked or narrowed. Common reasons include gallstones that have moved into the bile duct, jaundice (a yellowing of the skin or eyes), bile leaks after gallbladder surgery, narrowing caused by inflammation or a tumor, and certain problems of the pancreas.",
            es: "La CPRE se usa con mayor frecuencia cuando un conducto está obstruido o estrechado. Las razones comunes incluyen cálculos biliares que pasaron a la vía biliar, ictericia (un color amarillento de la piel o de los ojos), fugas de bilis después de una cirugía de vesícula, estrechamientos causados por inflamación o por un tumor, y ciertos problemas del páncreas.",
          },
          {
            en: "During the procedure, the doctor can remove stones, widen the duct opening, place a small tube called a stent to keep a duct draining, or take tissue samples.",
            es: "Durante el procedimiento, el médico puede retirar cálculos, ampliar la abertura del conducto, colocar un pequeño tubo llamado stent para que el conducto siga drenando, o tomar muestras de tejido.",
          },
        ],
      },
      {
        heading: { en: "How to prepare", es: "Cómo prepararse" },
        paragraphs: [
          {
            en: "You will fast for several hours beforehand. Tell your care team about all of your medicines, especially blood thinners, and about any allergies, including past reactions to contrast dye. Because X-rays are used, let the team know if there is any chance you are pregnant, and arrange for someone to take you home.",
            es: "Ayunará durante varias horas antes. Informe a su equipo de atención sobre todos sus medicamentos, en especial los anticoagulantes, y sobre cualquier alergia, incluidas reacciones previas al medio de contraste. Como se usan rayos X, avise al equipo si existe alguna posibilidad de embarazo, y organice que alguien le lleve a casa.",
          },
        ],
      },
      {
        heading: { en: "During the procedure", es: "Durante el procedimiento" },
        paragraphs: [
          {
            en: "ERCP is done with deep sedation or anesthesia, so you rest comfortably throughout. While you lie on your side or stomach, the endoscope is passed through your mouth to the point where the ducts empty into the intestine. A slender catheter is guided into the duct, contrast dye is injected, and X-ray pictures reveal any blockage; treatment follows in the same session as needed. Depending on what is done, the procedure may take from about half an hour to well over an hour.",
            es: "La CPRE se realiza con sedación profunda o anestesia, de modo que usted descansa cómodamente todo el tiempo. Mientras está acostado de lado o boca abajo, el endoscopio se pasa por la boca hasta el punto donde los conductos desembocan en el intestino. Un catéter delgado se guía hacia el conducto, se inyecta el medio de contraste y las imágenes de rayos X revelan cualquier obstrucción; el tratamiento se realiza en la misma sesión según se necesite. Dependiendo de lo que se haga, el procedimiento puede tomar desde una media hora hasta bastante más de una hora.",
          },
        ],
      },
      {
        heading: { en: "Afterward", es: "Después del procedimiento" },
        paragraphs: [
          {
            en: "You will be observed while the sedation wears off. Recovery is a little longer than after a routine endoscopy, and some patients stay overnight for observation. A sore throat and some bloating are common and pass.",
            es: "Se le observará mientras pasa el efecto de la sedación. La recuperación es un poco más larga que después de una endoscopia de rutina, y algunos pacientes se quedan una noche en observación. La garganta irritada y algo de inflamación son comunes y desaparecen.",
          },
          {
            en: "Because ERCP is more involved than other endoscopic exams, your doctor will go over its specific risks with you beforehand; the most important one to know about is pancreatitis, an inflammation of the pancreas. Contact your care team promptly if you develop worsening abdominal pain, fever, chills, or vomiting after you go home. Results and next steps are explained once the findings are clear.",
            es: "Como la CPRE es más compleja que otros exámenes endoscópicos, su médico repasará con usted sus riesgos específicos antes del procedimiento; el más importante de conocer es la pancreatitis, una inflamación del páncreas. Comuníquese pronto con su equipo de atención si presenta dolor abdominal que empeora, fiebre, escalofríos o vómitos después de volver a casa. Los resultados y los siguientes pasos se explican una vez que los hallazgos están claros.",
          },
        ],
      },
    ],
  },
  {
    slug: "bowel-preparation",
    legacyId: "48163",
    group: "procedures",
    title: { en: "Understanding Bowel Preparation", es: "Entienda la preparación intestinal" },
    summary: { en: "A clean colon is what makes a colonoscopy accurate. Learn how the prep works, what to eat and drink, and how to finish it successfully.", es: "Un colon limpio es lo que hace precisa una colonoscopia. Conozca cómo funciona la preparación, qué comer y beber, y cómo completarla con éxito." },
    sections: [
      {
        paragraphs: [
          {
            en: "Bowel preparation, or the prep, is the process of emptying and cleaning the colon before a colonoscopy. It combines a short period of diet changes with a prescribed laxative solution that flushes the colon clear.",
            es: "La preparación intestinal es el proceso de vaciar y limpiar el colon antes de una colonoscopia. Combina un periodo corto de cambios en la dieta con una solución laxante recetada que deja el colon limpio.",
          },
          {
            en: "It is fair to say the prep is most people's least favorite part of a colonoscopy. It is also the part that matters most: a clean colon lets your gastroenterologist see small polyps and subtle changes, while a poorly cleaned one can hide them or mean the exam has to be repeated.",
            es: "Es justo decir que la preparación es la parte menos querida de la colonoscopia para la mayoría de las personas. También es la parte que más importa: un colon limpio permite a su gastroenterólogo ver pólipos pequeños y cambios sutiles, mientras que un colon mal limpiado puede ocultarlos u obligar a repetir el examen.",
          },
        ],
      },
      {
        heading: { en: "Changing what you eat", es: "Los cambios en la alimentación" },
        paragraphs: [
          {
            en: "A few days before the exam, your instructions may ask you to avoid high-fiber foods such as seeds, nuts, corn, and raw vegetables.",
            es: "Unos días antes del examen, sus instrucciones pueden pedirle evitar alimentos altos en fibra, como semillas, nueces, maíz y verduras crudas.",
          },
          {
            en: "The day before, you will switch to clear liquids only: water, broth, clear juices without pulp, plain gelatin, and coffee or tea without milk. Skip anything colored red or purple, which can be mistaken for blood during the exam, and avoid alcohol.",
            es: "El día anterior pasará a tomar únicamente líquidos claros: agua, caldo, jugos claros sin pulpa, gelatina sencilla, y café o té sin leche. Evite todo lo de color rojo o morado, que puede confundirse con sangre durante el examen, y no tome alcohol.",
          },
        ],
      },
      {
        heading: { en: "Taking your prep", es: "Cómo tomar su preparación" },
        paragraphs: [
          {
            en: "Your prescribed prep is usually taken in two parts: the first dose the evening before, and the second dose several hours before your procedure. This split schedule cleans the colon best, even though it can mean an early alarm; set one, and take the second dose on time.",
            es: "La preparación recetada suele tomarse en dos partes: la primera dosis la noche anterior y la segunda varias horas antes del procedimiento. Este esquema dividido es el que mejor limpia el colon, aunque implique poner una alarma temprano; póngala y tome la segunda dosis a tiempo.",
          },
          {
            en: "Expect frequent, urgent, watery bowel movements within an hour or so of starting, so plan to stay near a bathroom. Chilling the solution, drinking it through a straw, and sipping steadily rather than gulping all make it easier. If you feel nauseated, slow down, take a short break, and then continue.",
            es: "Espere evacuaciones frecuentes, urgentes y líquidas alrededor de una hora después de comenzar, así que planee estar cerca de un baño. Enfriar la solución, beberla con una pajilla y tomarla a sorbos constantes en lugar de apurarla la hacen más llevadera. Si siente náuseas, vaya más despacio, tome un descanso corto y luego continúe.",
          },
          {
            en: "Keep drinking the clear liquids your instructions allow so you stay hydrated; the prep works best, and you will feel best, when you do. Stop all liquids, including the prep, at the cutoff time your care team gives you before the procedure.",
            es: "Siga bebiendo los líquidos claros que sus instrucciones permitan para mantenerse hidratado; la preparación funciona mejor, y usted se sentirá mejor, si lo hace. Suspenda todos los líquidos, incluida la preparación, a la hora límite que su equipo de atención le indique antes del procedimiento.",
          },
        ],
      },
      {
        heading: { en: "Common questions", es: "Preguntas frecuentes" },
        paragraphs: [
          {
            en: "How do you know it worked? By the end, your bowel movements should look like clear or pale yellow liquid. If they are still brown or cloudy, finish the remaining prep and mention it when you arrive.",
            es: "¿Cómo saber si funcionó? Al final, sus evacuaciones deben verse como un líquido claro o amarillo pálido. Si siguen siendo de color marrón o turbias, termine la preparación restante y coméntelo al llegar.",
          },
          {
            en: "What about your medicines? Ask your care team which morning medicines to take with a small sip of water. Blood thinners and diabetes medicines often need special timing, so bring them up when your colonoscopy is scheduled rather than the night before.",
            es: "¿Y sus medicamentos? Pregunte a su equipo de atención qué medicamentos de la mañana puede tomar con un pequeño sorbo de agua. Los anticoagulantes y los medicamentos para la diabetes suelen requerir horarios especiales, así que menciónelos cuando se programe su colonoscopia y no la noche anterior.",
          },
          {
            en: "And if you cannot finish? If you vomit repeatedly or truly cannot drink any more, contact your care team before your appointment instead of simply skipping doses; they will tell you how to proceed.",
            es: "¿Y si no puede terminarla? Si vomita varias veces o de verdad no puede beber más, comuníquese con su equipo de atención antes de su cita en lugar de simplemente saltarse dosis; ellos le dirán cómo proceder.",
          },
        ],
      },
    ],
  },
];
