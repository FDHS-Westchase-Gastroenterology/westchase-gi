// Patient-education topics, batch B: condition pages whose old printable
// "disease information sheets" were dead PDFs on the previous site. These are
// ORIGINAL plain-language articles written from standard medical knowledge
// (no captured source bodies existed). Each topic pairs with its printable
// sheet slot in lib/documents.ts via relatedDocId. Spanish is a faithful
// translation of the English in a neutral "usted" register, pending the
// practice's native-speaker review.

import type { EducationTopic } from "../types";

export const conditionsB: EducationTopic[] = [
  {
    slug: "abdominal-pain",
    group: "conditions",
    title: { en: "Abdominal Pain", es: "Dolor abdominal" },
    summary: {
      en: "Abdominal pain is one of the most common reasons patients see a gastroenterologist. Learn what different patterns of pain can mean, how the cause is found, and which warning signs need prompt attention.",
      es: "El dolor abdominal es uno de los motivos más comunes de consulta con un gastroenterólogo. Conozca qué pueden significar los distintos patrones de dolor, cómo se identifica la causa y qué señales de alerta requieren atención inmediata.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Abdominal pain is pain or discomfort felt anywhere between the chest and the groin. Nearly everyone experiences it from time to time, and most episodes pass on their own. Pain that is severe, keeps returning, or comes with other symptoms can be a sign of a digestive condition that deserves a closer look.",
            es: "El dolor abdominal es el dolor o malestar que se siente en cualquier punto entre el pecho y la ingle. Casi todas las personas lo experimentan de vez en cuando, y la mayoría de los episodios pasan por sí solos. Un dolor intenso, que reaparece con frecuencia o que se acompaña de otros síntomas puede ser señal de una condición digestiva que merece una evaluación más detallada.",
          },
          {
            en: "Many organs share this part of the body, including the stomach, intestines, gallbladder, pancreas, and liver. That is why finding the cause of abdominal pain takes a careful, step-by-step approach.",
            es: "Muchos órganos comparten esta parte del cuerpo, entre ellos el estómago, los intestinos, la vesícula biliar, el páncreas y el hígado. Por eso, encontrar la causa del dolor abdominal requiere un proceso cuidadoso, paso a paso.",
          },
        ],
      },
      {
        heading: { en: "Common patterns and symptoms", es: "Patrones y síntomas comunes" },
        paragraphs: [
          {
            en: "The way pain feels often offers clues. Cramping that comes in waves may be related to gas, intestinal spasm, or a blockage. Burning in the upper abdomen can point to acid irritation or an ulcer, while pain under the right ribs after a rich meal may involve the gallbladder.",
            es: "La forma en que se siente el dolor suele dar pistas. Los cólicos que vienen en oleadas pueden estar relacionados con gases, espasmos intestinales o una obstrucción. El ardor en la parte superior del abdomen puede indicar irritación por ácido o una úlcera, mientras que el dolor debajo de las costillas derechas después de una comida abundante puede estar relacionado con la vesícula biliar.",
          },
          {
            en: "Along with the pain itself, pay attention to bloating, changes in bowel habits, nausea, fever, or unintended weight loss. Mentioning these details at your visit helps your care team narrow the search.",
            es: "Además del dolor, preste atención a la hinchazón, los cambios en el hábito intestinal, las náuseas, la fiebre o la pérdida de peso involuntaria. Mencionar estos detalles en su consulta ayuda a su equipo de atención a orientar la búsqueda.",
          },
        ],
      },
      {
        heading: { en: "How abdominal pain is evaluated", es: "Cómo se evalúa el dolor abdominal" },
        paragraphs: [
          {
            en: "Your gastroenterologist will start by asking detailed questions about where the pain is, when it happens, and what makes it better or worse, followed by a physical examination. Depending on the findings, testing may include blood work, stool studies, or imaging such as an ultrasound or CT scan. In some situations, an upper endoscopy or a colonoscopy is recommended to look directly at the lining of the digestive tract.",
            es: "Su gastroenterólogo comenzará con preguntas detalladas sobre dónde se localiza el dolor, cuándo aparece y qué lo mejora o lo empeora, seguidas de un examen físico. Según los hallazgos, las pruebas pueden incluir análisis de sangre, estudios de heces o imágenes como una ecografía o una tomografía computarizada. En algunos casos se recomienda una endoscopia superior o una colonoscopia para observar directamente el revestimiento del tubo digestivo.",
          },
        ],
      },
      {
        heading: { en: "General approaches to treatment", es: "Enfoques generales de tratamiento" },
        paragraphs: [
          {
            en: "Treatment is directed at the underlying cause rather than at the pain alone. That may mean adjusting the diet, treating acid or an infection, relieving constipation, or calming an irritable bowel. Many causes of abdominal pain improve considerably once they are identified and treated correctly.",
            es: "El tratamiento se dirige a la causa de fondo y no solo al dolor. Eso puede significar ajustar la alimentación, tratar el exceso de ácido o una infección, aliviar el estreñimiento o calmar un intestino irritable. Muchas causas de dolor abdominal mejoran considerablemente una vez que se identifican y se tratan de manera adecuada.",
          },
        ],
      },
      {
        heading: { en: "When to contact a gastroenterologist", es: "Cuándo consultar a un gastroenterólogo" },
        paragraphs: [
          {
            en: "Seek medical care right away for sudden, severe pain, pain with fever or repeated vomiting, a rigid or swollen abdomen, or blood in vomit or stool. Make an appointment if pain lasts more than a few days, keeps coming back, wakes you from sleep, or arrives with weight loss or a change in bowel habits.",
            es: "Busque atención médica de inmediato si el dolor es repentino e intenso, si se acompaña de fiebre o vómitos repetidos, si el abdomen está rígido o hinchado, o si hay sangre en el vómito o en las heces. Haga una cita si el dolor dura más de unos días, reaparece con frecuencia, lo despierta por la noche o se presenta junto con pérdida de peso o cambios en el hábito intestinal.",
          },
        ],
      },
    ],
    relatedDocId: "info-abdominal-pain",
  },
  {
    slug: "barretts-esophagus",
    group: "conditions",
    title: { en: "Barrett's Esophagus", es: "Esófago de Barrett" },
    summary: {
      en: "Barrett's esophagus is a change in the lining of the esophagus that can follow years of acid reflux. Learn why it matters, how it is found, and how it is monitored over time.",
      es: "El esófago de Barrett es un cambio en el revestimiento del esófago que puede aparecer tras años de reflujo ácido. Conozca por qué es importante, cómo se detecta y cómo se vigila con el tiempo.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Barrett's esophagus is a condition in which the lining of the lower esophagus — the tube that carries food from the mouth to the stomach — changes to resemble the lining of the intestine. It usually develops after years of gastroesophageal reflux disease (GERD), when stomach acid repeatedly irritates the esophagus.",
            es: "El esófago de Barrett es una condición en la que el revestimiento de la parte baja del esófago — el tubo que lleva los alimentos de la boca al estómago — cambia y se vuelve parecido al revestimiento del intestino. Suele desarrollarse tras años de enfermedad por reflujo gastroesofágico (ERGE), cuando el ácido del estómago irrita el esófago una y otra vez.",
          },
          {
            en: "Barrett's esophagus is not cancer, and most people who have it never develop cancer. It does, however, somewhat increase the risk of a cancer of the esophagus, which is why doctors keep an eye on it over time.",
            es: "El esófago de Barrett no es cáncer, y la mayoría de las personas que lo tienen nunca desarrollan cáncer. Sin embargo, aumenta en cierta medida el riesgo de un cáncer de esófago, y por eso los médicos lo vigilan a lo largo del tiempo.",
          },
        ],
      },
      {
        heading: { en: "Common symptoms", es: "Síntomas comunes" },
        paragraphs: [
          {
            en: "Barrett's esophagus does not cause symptoms of its own. Most people learn they have it during an evaluation for long-standing reflux symptoms such as heartburn, regurgitation of food or sour liquid, difficulty swallowing, or chest discomfort. Some people with Barrett's esophagus have never had noticeable heartburn at all.",
            es: "El esófago de Barrett no causa síntomas por sí mismo. La mayoría de las personas lo descubren durante una evaluación por síntomas de reflujo de larga data, como acidez (agruras), regurgitación de comida o líquido agrio, dificultad para tragar o molestias en el pecho. Algunas personas con esófago de Barrett nunca han tenido acidez notable.",
          },
        ],
      },
      {
        heading: { en: "How it is diagnosed", es: "Cómo se diagnostica" },
        paragraphs: [
          {
            en: "The only way to diagnose Barrett's esophagus is with an upper endoscopy. While you are sedated, the doctor passes a thin, flexible tube with a camera through the mouth and examines the esophagus. Small tissue samples (biopsies) are taken and reviewed under a microscope to confirm the change and to check for precancerous cells, called dysplasia.",
            es: "La única manera de diagnosticar el esófago de Barrett es con una endoscopia superior. Mientras usted está sedado, el médico pasa por la boca un tubo delgado y flexible con una cámara y examina el esófago. Se toman pequeñas muestras de tejido (biopsias) que se estudian bajo el microscopio para confirmar el cambio y buscar células precancerosas, llamadas displasia.",
          },
        ],
      },
      {
        heading: { en: "Treatment and monitoring", es: "Tratamiento y vigilancia" },
        paragraphs: [
          {
            en: "Management focuses on controlling reflux and watching the tissue over time. Acid-reducing medicines, along with steps such as weight management and avoiding late meals, help protect the esophagus.",
            es: "El manejo se centra en controlar el reflujo y vigilar el tejido a lo largo del tiempo. Los medicamentos que reducen el ácido, junto con medidas como controlar el peso y evitar las comidas tarde en la noche, ayudan a proteger el esófago.",
          },
          {
            en: "Your gastroenterologist will recommend a schedule of periodic surveillance endoscopies based on your biopsy results. If dysplasia is found, treatments performed through the endoscope can remove or destroy the abnormal tissue, with the goal of treating it before it progresses.",
            es: "Su gastroenterólogo le recomendará un calendario de endoscopias de vigilancia periódicas según los resultados de sus biopsias. Si se encuentra displasia, existen tratamientos que se realizan a través del endoscopio para extirpar o destruir el tejido anormal, con el objetivo de tratarlo antes de que avance.",
          },
        ],
      },
      {
        heading: { en: "When to contact a gastroenterologist", es: "Cuándo consultar a un gastroenterólogo" },
        paragraphs: [
          {
            en: "Talk with a gastroenterologist if you have had heartburn or reflux for many years, especially if it occurs several times a week or requires daily medicine. Difficulty swallowing, food sticking, unintended weight loss, vomiting blood, or black stools deserve prompt evaluation. If you have already been diagnosed with Barrett's esophagus, keep your recommended surveillance appointments even when you feel well.",
            es: "Hable con un gastroenterólogo si ha tenido acidez o reflujo durante muchos años, sobre todo si ocurre varias veces por semana o requiere medicamento a diario. La dificultad para tragar, la sensación de que la comida se atora, la pérdida de peso involuntaria, el vómito con sangre o las heces negras merecen una evaluación pronta. Si ya le diagnosticaron esófago de Barrett, cumpla con sus citas de vigilancia recomendadas aunque se sienta bien.",
          },
        ],
      },
    ],
    relatedDocId: "info-barretts-esophagus",
  },
  {
    slug: "constipation",
    group: "conditions",
    title: { en: "Constipation", es: "Estreñimiento" },
    summary: {
      en: "Constipation is one of the most common digestive complaints, and it becomes more frequent with age. Learn what usually causes it, when testing is needed, and the treatments that help.",
      es: "El estreñimiento es una de las molestias digestivas más comunes y se vuelve más frecuente con la edad. Conozca sus causas habituales, cuándo se necesitan pruebas y los tratamientos que ayudan.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Constipation means bowel movements that are infrequent, hard, or difficult to pass. It is one of the most common digestive complaints, and it becomes more frequent as people get older.",
            es: "El estreñimiento significa evacuaciones poco frecuentes, duras o difíciles de expulsar. Es una de las molestias digestivas más comunes y se vuelve más frecuente a medida que las personas envejecen.",
          },
          {
            en: "In most cases constipation is not caused by a serious disease. Diet, fluid intake, physical activity, and certain medicines — including some pain, blood pressure, and iron medicines — are frequent contributors. Even so, a persistent change in your bowel habits deserves an evaluation.",
            es: "En la mayoría de los casos, el estreñimiento no se debe a una enfermedad grave. La alimentación, el consumo de líquidos, la actividad física y ciertos medicamentos — incluidos algunos para el dolor, la presión arterial y el hierro — contribuyen con frecuencia. Aun así, un cambio persistente en su hábito intestinal merece una evaluación.",
          },
        ],
      },
      {
        heading: { en: "Common symptoms", es: "Síntomas comunes" },
        paragraphs: [
          {
            en: "People with constipation may have fewer bowel movements than usual, strain to pass stool, or pass stools that are hard and lumpy. Some feel unable to empty completely, or notice bloating and a sluggish, uncomfortable abdomen. Symptoms that build gradually and vary with diet are common; a sudden, unexplained change in bowel habits is more concerning.",
            es: "Las personas con estreñimiento pueden tener menos evacuaciones de lo habitual, hacer esfuerzo para evacuar o expulsar heces duras y grumosas. Algunas sienten que no logran vaciar por completo el intestino, o notan hinchazón y un abdomen pesado e incómodo. Los síntomas que aparecen poco a poco y varían con la dieta son comunes; un cambio repentino e inexplicable en el hábito intestinal es más preocupante.",
          },
        ],
      },
      {
        heading: { en: "How constipation is evaluated", es: "Cómo se evalúa el estreñimiento" },
        paragraphs: [
          {
            en: "Your gastroenterologist will review your bowel pattern, diet, medicines, and overall health, and examine your abdomen. Blood tests can check for thyroid problems and other contributing conditions. If there are warning signs — bleeding, anemia, unintended weight loss, a family history of colon cancer, or a new change after age forty-five — a colonoscopy may be recommended to examine the colon directly. Specialized tests of colon and pelvic-floor function are available for difficult cases.",
            es: "Su gastroenterólogo revisará su patrón intestinal, su alimentación, sus medicamentos y su salud general, y examinará su abdomen. Los análisis de sangre pueden detectar problemas de tiroides y otras condiciones que contribuyen. Si hay señales de alerta — sangrado, anemia, pérdida de peso involuntaria, antecedentes familiares de cáncer de colon o un cambio nuevo después de los cuarenta y cinco años — puede recomendarse una colonoscopia para examinar el colon directamente. Para los casos difíciles existen pruebas especializadas del funcionamiento del colon y del piso pélvico.",
          },
        ],
      },
      {
        heading: { en: "Treatment approaches", es: "Opciones de tratamiento" },
        paragraphs: [
          {
            en: "Treatment usually starts with simple measures: more fiber from fruits, vegetables, and whole grains; enough fluids; and regular physical activity. Fiber supplements and gentle over-the-counter laxatives can help when diet alone is not enough.",
            es: "El tratamiento suele comenzar con medidas sencillas: más fibra de frutas, verduras y granos integrales; suficientes líquidos; y actividad física regular. Los suplementos de fibra y los laxantes suaves de venta libre pueden ayudar cuando la dieta por sí sola no basta.",
          },
          {
            en: "For persistent constipation, prescription medicines that draw water into the bowel or stimulate its movement are available. Pelvic-floor physical therapy helps when the muscles used to pass stool do not coordinate properly. Your care team can help you build a plan that is safe alongside your other medicines.",
            es: "Para el estreñimiento persistente existen medicamentos con receta que atraen agua hacia el intestino o estimulan su movimiento. La terapia física del piso pélvico ayuda cuando los músculos que se usan para evacuar no se coordinan bien. Su equipo de atención puede ayudarle a armar un plan que sea seguro junto con sus demás medicamentos.",
          },
        ],
      },
      {
        heading: { en: "When to contact a gastroenterologist", es: "Cuándo consultar a un gastroenterólogo" },
        paragraphs: [
          {
            en: "See a doctor promptly if constipation begins suddenly without explanation, or if it comes with blood in the stool, black stools, unintended weight loss, severe pain, or vomiting. Also make an appointment if constipation lasts more than a few weeks despite home measures, or if you regularly depend on laxatives to have a bowel movement.",
            es: "Consulte a un médico pronto si el estreñimiento comienza de manera repentina y sin explicación, o si se acompaña de sangre en las heces, heces negras, pérdida de peso involuntaria, dolor intenso o vómitos. Haga también una cita si el estreñimiento dura más de unas semanas a pesar de las medidas caseras, o si usted depende con regularidad de los laxantes para poder evacuar.",
          },
        ],
      },
    ],
    relatedDocId: "info-constipation",
  },
  {
    slug: "food-allergy-intolerance",
    group: "conditions",
    title: { en: "Food Allergy and Intolerance", es: "Alergia e intolerancia alimentaria" },
    summary: {
      en: "Food allergies and food intolerances can cause similar discomfort but are very different problems. Learn how to tell them apart, how each is diagnosed, and how both are managed.",
      es: "Las alergias y las intolerancias alimentarias pueden causar molestias parecidas, pero son problemas muy distintos. Conozca cómo diferenciarlas, cómo se diagnostica cada una y cómo se manejan.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Food allergies and food intolerances both cause trouble after eating, but they are different problems. A food allergy involves the immune system: the body mistakes a food protein for a threat and reacts, sometimes severely.",
            es: "Las alergias y las intolerancias alimentarias causan problemas después de comer, pero son condiciones diferentes. Una alergia alimentaria involucra al sistema inmunitario: el cuerpo confunde una proteína del alimento con una amenaza y reacciona, a veces de forma grave.",
          },
          {
            en: "A food intolerance involves digestion. The body has difficulty processing a component of the food — such as lactose, the sugar in milk — and the result is uncomfortable but not dangerous in the same way. Telling the two apart is the key to eating safely without restricting more than necessary.",
            es: "Una intolerancia alimentaria tiene que ver con la digestión. El cuerpo tiene dificultad para procesar un componente del alimento — como la lactosa, el azúcar de la leche — y el resultado es incómodo, pero no peligroso de la misma manera. Distinguir una de otra es la clave para comer con seguridad sin restringir más de lo necesario.",
          },
        ],
      },
      {
        heading: { en: "Common symptoms", es: "Síntomas comunes" },
        paragraphs: [
          {
            en: "Allergic reactions usually begin within minutes to a couple of hours after eating and can include hives, itching, swelling of the lips or throat, vomiting, wheezing, or dizziness. A severe allergic reaction, called anaphylaxis, is a medical emergency. Intolerances tend to cause digestive symptoms — bloating, gas, cramping, and diarrhea — that build more gradually and depend on how much of the food was eaten.",
            es: "Las reacciones alérgicas suelen comenzar entre minutos y un par de horas después de comer, y pueden incluir ronchas, comezón, hinchazón de los labios o la garganta, vómitos, silbidos al respirar o mareo. Una reacción alérgica grave, llamada anafilaxia, es una emergencia médica. Las intolerancias tienden a causar síntomas digestivos — hinchazón, gases, cólicos y diarrea — que aparecen de forma más gradual y dependen de cuánto se comió del alimento.",
          },
        ],
      },
      {
        heading: { en: "How they are evaluated", es: "Cómo se evalúan" },
        paragraphs: [
          {
            en: "The evaluation starts with a careful history: which foods are involved, how much was eaten, how quickly symptoms appear, and what they look like. A food and symptom diary is often helpful. A suspected allergy is usually evaluated together with an allergist, using skin or blood testing.",
            es: "La evaluación comienza con una historia clínica cuidadosa: qué alimentos están involucrados, cuánto se comió, qué tan rápido aparecen los síntomas y cómo son. Llevar un diario de alimentos y síntomas suele ser útil. Cuando se sospecha una alergia, la evaluación suele hacerse junto con un alergólogo, mediante pruebas en la piel o de sangre.",
          },
          {
            en: "For intolerances, your gastroenterologist may suggest a structured elimination of the suspected food followed by reintroduction, breath testing for lactose intolerance, or blood testing for celiac disease, which can mimic both.",
            es: "Para las intolerancias, su gastroenterólogo puede sugerir eliminar de forma estructurada el alimento sospechoso y luego reintroducirlo, una prueba de aliento para la intolerancia a la lactosa, o análisis de sangre para la enfermedad celíaca, que puede imitar a ambas.",
          },
        ],
      },
      {
        heading: { en: "Managing food allergy and intolerance", es: "Manejo de la alergia y la intolerancia alimentaria" },
        paragraphs: [
          {
            en: "A confirmed food allergy is managed by strictly avoiding the food, reading ingredient labels, and carrying the emergency medicine your doctor prescribes in case of accidental exposure. Intolerances rarely require complete avoidance: many people do well by limiting portion sizes, choosing products such as lactose-free milk, or using enzyme supplements. A dietitian can help you keep your meals balanced while avoiding your trigger foods.",
            es: "Una alergia alimentaria confirmada se maneja evitando estrictamente el alimento, leyendo las etiquetas de ingredientes y llevando consigo el medicamento de emergencia que su médico le recete por si ocurre una exposición accidental. Las intolerancias rara vez exigen evitar el alimento por completo: a muchas personas les va bien limitando las porciones, eligiendo productos como leche sin lactosa o usando suplementos de enzimas. Un dietista puede ayudarle a mantener una alimentación balanceada mientras evita los alimentos que le causan síntomas.",
          },
        ],
      },
      {
        heading: { en: "When to contact a gastroenterologist", es: "Cuándo consultar a un gastroenterólogo" },
        paragraphs: [
          {
            en: "Seek an evaluation if digestive symptoms after eating keep returning, if you find yourself restricting more and more foods without clear answers, or if symptoms come with unintended weight loss, blood in the stool, or anemia. Any reaction that involves throat swelling or difficulty breathing needs emergency care first, followed by a formal allergy evaluation.",
            es: "Busque una evaluación si los síntomas digestivos después de comer siguen regresando, si usted está restringiendo cada vez más alimentos sin respuestas claras, o si los síntomas se acompañan de pérdida de peso involuntaria, sangre en las heces o anemia. Cualquier reacción con hinchazón de la garganta o dificultad para respirar necesita primero atención de emergencia y, después, una evaluación formal de alergia.",
          },
        ],
      },
    ],
    relatedDocId: "info-food-allergy",
  },
  {
    slug: "gallstones",
    group: "conditions",
    title: { en: "Gallstones", es: "Cálculos biliares" },
    summary: {
      en: "Gallstones are very common and often cause no symptoms at all — until one blocks the flow of bile. Learn how gallstone attacks feel, how they are diagnosed, and when treatment is needed.",
      es: "Los cálculos biliares son muy comunes y a menudo no causan ningún síntoma, hasta que uno bloquea el flujo de la bilis. Conozca cómo se sienten los ataques, cómo se diagnostican y cuándo se necesita tratamiento.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Gallstones are hard pieces of material, most often formed from cholesterol, that develop in the gallbladder — a small pouch beneath the liver that stores bile to help digest fat. Gallstones are very common, and many people carry them for years without knowing it.",
            es: "Los cálculos biliares son piezas duras de material, formadas la mayoría de las veces por colesterol, que se desarrollan en la vesícula biliar — una pequeña bolsa debajo del hígado que almacena bilis para ayudar a digerir la grasa. Son muy comunes, y muchas personas los tienen durante años sin saberlo.",
          },
          {
            en: "Stones become a problem when one blocks the flow of bile, causing pain or inflammation. They are more common with age, in women, during pregnancy, and in people with obesity or after rapid weight loss.",
            es: "Los cálculos se vuelven un problema cuando uno bloquea el flujo de la bilis y causa dolor o inflamación. Son más comunes con la edad, en las mujeres, durante el embarazo y en personas con obesidad o después de una pérdida de peso rápida.",
          },
        ],
      },
      {
        heading: { en: "Common symptoms", es: "Síntomas comunes" },
        paragraphs: [
          {
            en: "The classic symptom is a steady pain in the upper right or upper middle abdomen, often after a heavy or fatty meal, sometimes spreading to the back or the right shoulder blade. Attacks may last from thirty minutes to several hours and can come with nausea or vomiting. Fever, chills, or yellowing of the skin and eyes (jaundice) suggest a blocked duct or an infection and need urgent attention.",
            es: "El síntoma clásico es un dolor constante en la parte superior derecha o central del abdomen, a menudo después de una comida pesada o grasosa, que a veces se extiende a la espalda o al omóplato derecho. Los ataques pueden durar de treinta minutos a varias horas y acompañarse de náuseas o vómitos. La fiebre, los escalofríos o el color amarillento de la piel y los ojos (ictericia) sugieren un conducto bloqueado o una infección y requieren atención urgente.",
          },
        ],
      },
      {
        heading: { en: "How gallstones are diagnosed", es: "Cómo se diagnostican los cálculos biliares" },
        paragraphs: [
          {
            en: "An abdominal ultrasound is usually the first test; it is painless and shows most gallbladder stones clearly. Blood tests help look for inflammation, infection, or a blocked bile duct. When a stone is suspected in the bile duct itself, additional imaging — such as an MRI of the bile ducts or an endoscopic ultrasound — may be recommended.",
            es: "Una ecografía abdominal suele ser la primera prueba; no causa dolor y muestra con claridad la mayoría de los cálculos de la vesícula. Los análisis de sangre ayudan a buscar inflamación, infección o un conducto biliar bloqueado. Cuando se sospecha que hay un cálculo en el propio conducto biliar, pueden recomendarse imágenes adicionales, como una resonancia magnética de las vías biliares o un ultrasonido endoscópico.",
          },
        ],
      },
      {
        heading: { en: "Treatment approaches", es: "Opciones de tratamiento" },
        paragraphs: [
          {
            en: "Gallstones found by chance that cause no symptoms usually need no treatment. For stones that cause attacks, the standard treatment is surgical removal of the gallbladder, most often done through small incisions; the body digests food well without a gallbladder. A stone lodged in the bile duct can usually be removed without surgery, using an endoscopic procedure called ERCP.",
            es: "Los cálculos que se encuentran por casualidad y no causan síntomas generalmente no necesitan tratamiento. Para los que causan ataques, el tratamiento estándar es la extirpación quirúrgica de la vesícula, casi siempre a través de pequeñas incisiones; el cuerpo digiere bien los alimentos sin la vesícula. Un cálculo atascado en el conducto biliar por lo general puede extraerse sin cirugía mediante un procedimiento endoscópico llamado CPRE.",
          },
        ],
      },
      {
        heading: { en: "When to contact a gastroenterologist", es: "Cuándo consultar a un gastroenterólogo" },
        paragraphs: [
          {
            en: "Make an appointment if you have repeated episodes of upper abdominal pain after meals, especially with nausea. Seek emergency care for pain that does not ease after several hours, or for pain with fever, chills, persistent vomiting, or jaundice — these can signal a blocked duct, an infected gallbladder, or pancreatitis.",
            es: "Haga una cita si tiene episodios repetidos de dolor en la parte superior del abdomen después de las comidas, sobre todo con náuseas. Busque atención de emergencia si el dolor no cede después de varias horas, o si se acompaña de fiebre, escalofríos, vómitos persistentes o ictericia — pueden ser señales de un conducto bloqueado, una vesícula infectada o una pancreatitis.",
          },
        ],
      },
    ],
    relatedDocId: "info-gallstones",
  },
  {
    slug: "hemochromatosis",
    group: "conditions",
    title: { en: "Hemochromatosis", es: "Hemocromatosis" },
    summary: {
      en: "Hemochromatosis causes the body to store too much iron, which can quietly damage the liver and other organs over many years. Learn who should be tested and how it is treated.",
      es: "La hemocromatosis hace que el cuerpo almacene demasiado hierro, lo que puede dañar silenciosamente el hígado y otros órganos con los años. Conozca quiénes deben hacerse la prueba y cómo se trata.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Hemochromatosis is a condition in which the body absorbs and stores too much iron. The most common form is inherited and runs in families.",
            es: "La hemocromatosis es una condición en la que el cuerpo absorbe y almacena demasiado hierro. La forma más común es hereditaria y se presenta en familias.",
          },
          {
            en: "Over many years, the extra iron builds up in organs — especially the liver, but also the heart, pancreas, joints, and skin — and can damage them. Found early, hemochromatosis is one of the most treatable causes of liver disease.",
            es: "Con el paso de los años, el exceso de hierro se acumula en los órganos — especialmente el hígado, pero también el corazón, el páncreas, las articulaciones y la piel — y puede dañarlos. Detectada a tiempo, la hemocromatosis es una de las causas de enfermedad hepática más tratables.",
          },
        ],
      },
      {
        heading: { en: "Common symptoms", es: "Síntomas comunes" },
        paragraphs: [
          {
            en: "Early hemochromatosis often causes no symptoms; many people are found through routine blood work or family screening. When symptoms appear, they are often general: fatigue, joint aches (classically in the knuckles), and abdominal discomfort. Later signs can include a bronze or gray skin tone, diabetes, heart problems, or evidence of liver disease. Because these changes develop slowly, the diagnosis is easy to miss without testing.",
            es: "En sus etapas tempranas, la hemocromatosis a menudo no causa síntomas; muchas personas se detectan por análisis de sangre de rutina o por estudios familiares. Cuando aparecen síntomas, suelen ser generales: fatiga, dolores articulares (clásicamente en los nudillos) y molestias abdominales. Los signos más tardíos pueden incluir un tono de piel bronceado o grisáceo, diabetes, problemas cardíacos o señales de enfermedad hepática. Como estos cambios se desarrollan lentamente, el diagnóstico es fácil de pasar por alto sin pruebas.",
          },
        ],
      },
      {
        heading: { en: "How it is diagnosed", es: "Cómo se diagnostica" },
        paragraphs: [
          {
            en: "Diagnosis starts with blood tests that measure iron, usually ferritin and transferrin saturation. If these are elevated, a genetic test can confirm the inherited form. Your doctor may also check liver blood tests and use imaging — such as a specialized MRI or an elastography scan — to estimate iron buildup and look for scarring. Because the condition is inherited, close relatives of a person with hemochromatosis are usually advised to be tested as well.",
            es: "El diagnóstico comienza con análisis de sangre que miden el hierro, generalmente la ferritina y la saturación de transferrina. Si están elevadas, una prueba genética puede confirmar la forma hereditaria. Su médico también puede revisar las pruebas hepáticas en sangre y usar imágenes — como una resonancia magnética especializada o una elastografía — para estimar la acumulación de hierro y buscar cicatrización. Como la condición es hereditaria, generalmente se aconseja que los familiares cercanos de una persona con hemocromatosis también se hagan la prueba.",
          },
        ],
      },
      {
        heading: { en: "Treatment", es: "Tratamiento" },
        paragraphs: [
          {
            en: "Treatment is straightforward: blood is removed at regular intervals, a process called therapeutic phlebotomy that feels much like donating blood. Each session removes iron along with the blood, and over months the body's iron stores come back toward normal. After that, maintenance sessions a few times a year usually keep iron in a safe range.",
            es: "El tratamiento es sencillo: se extrae sangre a intervalos regulares, un proceso llamado flebotomía terapéutica que se siente muy parecido a donar sangre. Cada sesión elimina hierro junto con la sangre y, con el paso de los meses, las reservas de hierro del cuerpo vuelven hacia lo normal. Después, las sesiones de mantenimiento unas cuantas veces al año suelen mantener el hierro en un rango seguro.",
          },
          {
            en: "People with hemochromatosis are generally advised to avoid iron and high-dose vitamin C supplements, limit alcohol, and avoid eating raw shellfish, which carries a particular infection risk when body iron is high.",
            es: "A las personas con hemocromatosis generalmente se les aconseja evitar los suplementos de hierro y las dosis altas de vitamina C, limitar el alcohol y no comer mariscos crudos, que representan un riesgo particular de infección cuando el hierro corporal está alto.",
          },
        ],
      },
      {
        heading: { en: "When to contact a gastroenterologist", es: "Cuándo consultar a un gastroenterólogo" },
        paragraphs: [
          {
            en: "See a doctor if blood work shows high iron or ferritin, if a close relative has hemochromatosis, or if you have unexplained fatigue, joint pain, and abnormal liver tests together. A gastroenterologist can confirm the diagnosis, check whether the liver has been affected, and set up a treatment and monitoring plan.",
            es: "Consulte a un médico si sus análisis muestran hierro o ferritina elevados, si un familiar cercano tiene hemocromatosis, o si presenta a la vez fatiga inexplicada, dolor articular y pruebas hepáticas anormales. Un gastroenterólogo puede confirmar el diagnóstico, revisar si el hígado se ha visto afectado y establecer un plan de tratamiento y seguimiento.",
          },
        ],
      },
    ],
    relatedDocId: "info-hemochromatosis",
  },
  {
    slug: "inflammatory-bowel-disease",
    group: "conditions",
    title: { en: "Inflammatory Bowel Disease", es: "Enfermedad inflamatoria intestinal" },
    summary: {
      en: "Inflammatory bowel disease — Crohn's disease and ulcerative colitis — causes ongoing inflammation in the digestive tract. Learn how it differs from IBS, how it is diagnosed, and how it is treated and monitored.",
      es: "La enfermedad inflamatoria intestinal — la enfermedad de Crohn y la colitis ulcerosa — causa inflamación continua en el tubo digestivo. Conozca en qué se diferencia del intestino irritable, cómo se diagnostica y cómo se trata y se le da seguimiento.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Inflammatory bowel disease (IBD) is the name for a group of chronic conditions in which the immune system causes ongoing inflammation in the digestive tract. The two main types are Crohn's disease, which can affect any part of the tract from mouth to anus, and ulcerative colitis, which affects the colon and rectum.",
            es: "La enfermedad inflamatoria intestinal (EII) es el nombre de un grupo de condiciones crónicas en las que el sistema inmunitario causa una inflamación continua en el tubo digestivo. Los dos tipos principales son la enfermedad de Crohn, que puede afectar cualquier parte del tubo digestivo desde la boca hasta el ano, y la colitis ulcerosa, que afecta el colon y el recto.",
          },
          {
            en: "IBD is different from irritable bowel syndrome (IBS), which can cause similar discomfort but does not produce inflammation or visible damage. IBD tends to alternate between flare-ups and quieter periods called remission.",
            es: "La EII es diferente del síndrome de intestino irritable (SII), que puede causar molestias parecidas pero no produce inflamación ni daño visible. La EII tiende a alternar entre brotes y períodos más tranquilos llamados remisión.",
          },
        ],
      },
      {
        heading: { en: "Common symptoms", es: "Síntomas comunes" },
        paragraphs: [
          {
            en: "Typical symptoms include diarrhea that persists for weeks, abdominal pain and cramping, blood in the stool, urgency, fatigue, and unintended weight loss. Some people also have symptoms outside the gut, such as joint pain, skin problems, or eye irritation. Symptoms vary widely from person to person and can change over time.",
            es: "Los síntomas típicos incluyen diarrea que persiste durante semanas, dolor abdominal y cólicos, sangre en las heces, urgencia para evacuar, fatiga y pérdida de peso involuntaria. Algunas personas también tienen síntomas fuera del intestino, como dolor en las articulaciones, problemas de la piel o irritación de los ojos. Los síntomas varían mucho de una persona a otra y pueden cambiar con el tiempo.",
          },
        ],
      },
      {
        heading: { en: "How IBD is diagnosed", es: "Cómo se diagnostica la EII" },
        paragraphs: [
          {
            en: "There is no single test for IBD. Your gastroenterologist will combine blood tests, stool tests that measure intestinal inflammation, and endoscopy. A colonoscopy with biopsies is the cornerstone: it lets the doctor see the inflammation directly and confirm it under the microscope. Imaging such as CT or MRI is sometimes used to examine parts of the small intestine the scope cannot reach.",
            es: "No existe una sola prueba para la EII. Su gastroenterólogo combinará análisis de sangre, pruebas de heces que miden la inflamación intestinal y endoscopia. La colonoscopia con biopsias es la pieza central: permite al médico ver la inflamación directamente y confirmarla bajo el microscopio. En ocasiones se usan imágenes como la tomografía o la resonancia magnética para examinar partes del intestino delgado que el endoscopio no alcanza.",
          },
        ],
      },
      {
        heading: { en: "Treatment approaches", es: "Opciones de tratamiento" },
        paragraphs: [
          {
            en: "Treatment aims to calm the inflammation, relieve symptoms, and keep the disease in remission. Options range from anti-inflammatory and immune-modulating medicines to newer targeted therapies given as injections or infusions; the right choice depends on the type, location, and severity of your disease.",
            es: "El tratamiento busca calmar la inflamación, aliviar los síntomas y mantener la enfermedad en remisión. Las opciones van desde medicamentos antiinflamatorios e inmunomoduladores hasta terapias dirigidas más recientes que se administran en inyecciones o infusiones; la elección correcta depende del tipo, la ubicación y la gravedad de su enfermedad.",
          },
          {
            en: "Some people eventually need surgery for complications or for disease that no longer responds to medicine. Ongoing monitoring — including colon cancer screening at shorter intervals than usual — is part of long-term care.",
            es: "Algunas personas con el tiempo necesitan cirugía por complicaciones o porque la enfermedad ya no responde a los medicamentos. El seguimiento continuo — que incluye pruebas de detección de cáncer de colon con mayor frecuencia de lo habitual — es parte del cuidado a largo plazo.",
          },
        ],
      },
      {
        heading: { en: "When to contact a gastroenterologist", es: "Cuándo consultar a un gastroenterólogo" },
        paragraphs: [
          {
            en: "See a gastroenterologist for diarrhea that lasts more than a couple of weeks, blood in the stool, bowel movements that wake you at night, or abdominal pain with weight loss. If you already have IBD, contact your care team early during a flare — fever, worsening pain, persistent bleeding, or dehydration should not wait for the next routine visit.",
            es: "Consulte a un gastroenterólogo si tiene diarrea que dura más de un par de semanas, sangre en las heces, evacuaciones que lo despiertan por la noche o dolor abdominal con pérdida de peso. Si ya tiene EII, comuníquese pronto con su equipo de atención durante un brote — la fiebre, el dolor que empeora, el sangrado persistente o la deshidratación no deben esperar a la próxima visita de rutina.",
          },
        ],
      },
    ],
    relatedDocId: "info-ibd",
  },
  {
    slug: "intestinal-gas",
    group: "conditions",
    title: { en: "Intestinal Gas", es: "Gases intestinales" },
    summary: {
      en: "Gas is a normal part of digestion, but bloating and discomfort can interfere with daily life. Learn what causes excess gas, which foods are common triggers, and when symptoms deserve an evaluation.",
      es: "Los gases son una parte normal de la digestión, pero la hinchazón y las molestias pueden interferir con la vida diaria. Conozca qué causa el exceso de gases, qué alimentos suelen provocarlos y cuándo los síntomas merecen una evaluación.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Everyone has intestinal gas. It is a normal product of swallowing air and of digestion itself, especially the work bacteria do breaking down food in the colon. Passing gas many times a day is normal.",
            es: "Todas las personas tienen gases intestinales. Son un producto normal de tragar aire y de la propia digestión, especialmente del trabajo que hacen las bacterias al descomponer los alimentos en el colon. Expulsar gases muchas veces al día es normal.",
          },
          {
            en: "Gas becomes a medical question when it causes persistent bloating, pain, or embarrassment, or when it appears alongside other digestive changes.",
            es: "Los gases se convierten en un asunto médico cuando causan hinchazón persistente, dolor o vergüenza, o cuando aparecen junto con otros cambios digestivos.",
          },
        ],
      },
      {
        heading: { en: "Common symptoms and causes", es: "Síntomas y causas comunes" },
        paragraphs: [
          {
            en: "Gas-related complaints include belching, bloating, a visibly swollen abdomen, cramping, and passing gas frequently. Common contributors include carbonated drinks, eating quickly, chewing gum, and foods rich in fermentable carbohydrates — beans, lentils, onions, broccoli, cabbage, and some fruits. Milk products cause gas in people with lactose intolerance, and sugar substitutes such as sorbitol are frequent culprits as well.",
            es: "Las molestias relacionadas con los gases incluyen eructos, hinchazón, un abdomen visiblemente distendido, cólicos y expulsión frecuente de gases. Entre los factores comunes están las bebidas gaseosas, comer deprisa, masticar chicle y los alimentos ricos en carbohidratos fermentables — frijoles, lentejas, cebolla, brócoli, repollo y algunas frutas. Los productos lácteos causan gases en personas con intolerancia a la lactosa, y los sustitutos del azúcar como el sorbitol también son culpables frecuentes.",
          },
        ],
      },
      {
        heading: { en: "How gas problems are evaluated", es: "Cómo se evalúan los problemas de gases" },
        paragraphs: [
          {
            en: "Most gas complaints can be evaluated with a careful history, a food and symptom diary, and a physical examination. If symptoms persist or are unusual, your gastroenterologist may check for lactose intolerance or bacterial overgrowth with breath testing, screen for celiac disease with blood work, or recommend imaging or endoscopy when bloating comes with warning signs. The goal is to separate ordinary gas from conditions that can mimic it.",
            es: "La mayoría de las molestias por gases pueden evaluarse con una historia clínica cuidadosa, un diario de alimentos y síntomas, y un examen físico. Si los síntomas persisten o son inusuales, su gastroenterólogo puede buscar intolerancia a la lactosa o sobrecrecimiento bacteriano con pruebas de aliento, descartar enfermedad celíaca con análisis de sangre, o recomendar imágenes o una endoscopia cuando la hinchazón se acompaña de señales de alerta. El objetivo es distinguir los gases comunes de las condiciones que pueden imitarlos.",
          },
        ],
      },
      {
        heading: { en: "Managing intestinal gas", es: "Manejo de los gases intestinales" },
        paragraphs: [
          {
            en: "Simple changes help many people: eat more slowly, limit carbonated beverages and gum, and identify trigger foods one at a time rather than cutting out whole food groups at once. Over-the-counter simethicone or enzyme supplements — lactase for dairy, alpha-galactosidase for beans — help some people. If a specific condition such as lactose intolerance, celiac disease, or bacterial overgrowth is found, treating it directly usually improves the gas.",
            es: "Los cambios sencillos ayudan a muchas personas: coma más despacio, limite las bebidas gaseosas y el chicle, e identifique los alimentos desencadenantes uno por uno en lugar de eliminar grupos enteros de alimentos de una vez. La simeticona de venta libre o los suplementos de enzimas — lactasa para los lácteos, alfa-galactosidasa para los frijoles — ayudan a algunas personas. Si se encuentra una condición específica como intolerancia a la lactosa, enfermedad celíaca o sobrecrecimiento bacteriano, tratarla directamente suele mejorar los gases.",
          },
        ],
      },
      {
        heading: { en: "When to contact a gastroenterologist", es: "Cuándo consultar a un gastroenterólogo" },
        paragraphs: [
          {
            en: "Make an appointment if bloating or gas pain is persistent, worsening, or interfering with daily life, or if changes at home have not helped. Seek evaluation promptly if gas symptoms come with unintended weight loss, blood in the stool, persistent diarrhea, vomiting, fever, or a change in bowel habits — those features point beyond ordinary gas.",
            es: "Haga una cita si la hinchazón o el dolor por gases es persistente, va en aumento o interfiere con su vida diaria, o si los cambios en casa no han ayudado. Busque una evaluación pronto si los gases se acompañan de pérdida de peso involuntaria, sangre en las heces, diarrea persistente, vómitos, fiebre o un cambio en el hábito intestinal — esas características apuntan a algo más que gases comunes.",
          },
        ],
      },
    ],
    relatedDocId: "info-intestinal-gas",
  },
  {
    slug: "liver-disease",
    group: "conditions",
    title: { en: "Liver Disease", es: "Enfermedad hepática" },
    summary: {
      en: "Liver disease often develops silently, and fatty liver disease is now the most common form. Learn the warning signs, how the liver is checked without surgery, and the steps that protect it.",
      es: "La enfermedad hepática suele desarrollarse en silencio, y el hígado graso es hoy la forma más común. Conozca las señales de alerta, cómo se examina el hígado sin cirugía y las medidas que lo protegen.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "The liver filters the blood, processes nutrients and medicines, and makes proteins the body needs. Liver disease is any condition that keeps it from doing that work, including fatty liver disease, viral hepatitis, alcohol-related liver disease, and inherited or autoimmune conditions.",
            es: "El hígado filtra la sangre, procesa los nutrientes y los medicamentos, y produce proteínas que el cuerpo necesita. La enfermedad hepática es cualquier condición que le impide hacer ese trabajo, incluidos el hígado graso, las hepatitis virales, la enfermedad hepática por alcohol y las condiciones hereditarias o autoinmunes.",
          },
          {
            en: "The most common form today is fatty liver disease, in which extra fat collects in the liver cells. It is closely linked to body weight, diabetes, and cholesterol, and it usually causes no symptoms until it is advanced. When ongoing injury scars the liver, the scarring is called fibrosis; severe, widespread scarring is called cirrhosis.",
            es: "La forma más común hoy en día es el hígado graso, en el que se acumula grasa dentro de las células del hígado. Está estrechamente ligado al peso corporal, la diabetes y el colesterol, y por lo general no causa síntomas hasta que está avanzado. Cuando una lesión continua cicatriza el hígado, esa cicatrización se llama fibrosis; la cicatrización grave y extendida se llama cirrosis.",
          },
        ],
      },
      {
        heading: { en: "Common symptoms", es: "Síntomas comunes" },
        paragraphs: [
          {
            en: "Early liver disease is usually silent, which is why it is often discovered through routine blood work. When signs do appear, they can include fatigue, discomfort in the upper right abdomen, nausea, itching, easy bruising, swelling in the legs or abdomen, and yellowing of the skin or eyes (jaundice). Dark urine and pale stools can also signal a liver or bile duct problem.",
            es: "La enfermedad hepática temprana suele ser silenciosa, y por eso a menudo se descubre en análisis de sangre de rutina. Cuando aparecen señales, pueden incluir fatiga, molestias en la parte superior derecha del abdomen, náuseas, comezón, moretones con facilidad, hinchazón en las piernas o el abdomen, y color amarillento de la piel o los ojos (ictericia). La orina oscura y las heces pálidas también pueden señalar un problema del hígado o de las vías biliares.",
          },
        ],
      },
      {
        heading: { en: "How liver disease is evaluated", es: "Cómo se evalúa la enfermedad hepática" },
        paragraphs: [
          {
            en: "Evaluation usually begins with blood tests that measure liver enzymes and liver function, along with tests for viral hepatitis and other specific causes. An ultrasound is commonly used to look at the liver itself. A painless scan called liver elastography measures the stiffness of the liver to estimate scarring, often avoiding the need for a biopsy; a liver biopsy is reserved for cases where the diagnosis remains unclear.",
            es: "La evaluación suele comenzar con análisis de sangre que miden las enzimas y la función del hígado, junto con pruebas para hepatitis virales y otras causas específicas. Comúnmente se usa una ecografía para observar el hígado. Un estudio sin dolor llamado elastografía hepática mide la rigidez del hígado para estimar la cicatrización, y muchas veces evita la necesidad de una biopsia; la biopsia hepática se reserva para los casos en que el diagnóstico sigue sin estar claro.",
          },
        ],
      },
      {
        heading: { en: "Treatment approaches", es: "Opciones de tratamiento" },
        paragraphs: [
          {
            en: "Treatment depends on the cause. For fatty liver disease, the foundation is gradual weight loss through diet and regular physical activity, along with good control of diabetes, blood pressure, and cholesterol; even modest weight loss can reduce the fat in the liver.",
            es: "El tratamiento depende de la causa. Para el hígado graso, la base es una pérdida de peso gradual mediante la alimentación y la actividad física regular, junto con un buen control de la diabetes, la presión arterial y el colesterol; incluso una pérdida de peso modesta puede reducir la grasa en el hígado.",
          },
          {
            en: "Viral hepatitis can be treated with antiviral medicines. Whatever the cause, limiting alcohol, reviewing all medicines and supplements with your doctor, and staying current on recommended vaccinations help protect the liver. Regular follow-up shows whether the liver is improving or scarring is progressing.",
            es: "Las hepatitis virales pueden tratarse con medicamentos antivirales. Sea cual sea la causa, limitar el alcohol, revisar todos los medicamentos y suplementos con su médico y mantenerse al día con las vacunas recomendadas ayuda a proteger el hígado. El seguimiento regular muestra si el hígado está mejorando o si la cicatrización avanza.",
          },
        ],
      },
      {
        heading: { en: "When to contact a gastroenterologist", es: "Cuándo consultar a un gastroenterólogo" },
        paragraphs: [
          {
            en: "See a gastroenterologist if your blood tests show elevated liver enzymes, if imaging shows fat in the liver, or if you have risk factors such as diabetes and have never had your liver checked. Seek care promptly for jaundice, vomiting blood, black stools, new confusion, or rapid swelling of the abdomen — these can signal advanced disease and need urgent attention.",
            es: "Consulte a un gastroenterólogo si sus análisis muestran enzimas hepáticas elevadas, si las imágenes muestran grasa en el hígado, o si tiene factores de riesgo como diabetes y nunca le han revisado el hígado. Busque atención pronto si presenta ictericia, vómito con sangre, heces negras, confusión nueva o hinchazón rápida del abdomen — pueden ser señales de enfermedad avanzada y requieren atención urgente.",
          },
        ],
      },
    ],
    relatedDocId: "info-liver-disease",
  },
  {
    slug: "rectal-disease",
    group: "conditions",
    title: { en: "Rectal Disease", es: "Enfermedades rectales" },
    summary: {
      en: "Hemorrhoids, fissures, and other rectal conditions are common, uncomfortable, and very treatable. Learn the usual symptoms, why rectal bleeding always deserves evaluation, and what treatment involves.",
      es: "Las hemorroides, las fisuras y otras condiciones rectales son comunes, incómodas y muy tratables. Conozca los síntomas habituales, por qué el sangrado rectal siempre merece evaluación y en qué consiste el tratamiento.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "The rectum is the final section of the large intestine, and several common conditions can affect it and the anal area. The most frequent are hemorrhoids — swollen veins that can itch, ache, or bleed — and anal fissures, small tears in the lining that cause sharp pain with bowel movements.",
            es: "El recto es la sección final del intestino grueso, y varias condiciones comunes pueden afectarlo, al igual que a la zona anal. Las más frecuentes son las hemorroides — venas inflamadas que pueden causar comezón, dolor o sangrado — y las fisuras anales, pequeños desgarros en el revestimiento que causan un dolor agudo al evacuar.",
          },
          {
            en: "Other rectal conditions include infections and abscesses, fistulas (abnormal tunnels that can form after an abscess), rectal prolapse, and inflammation of the rectum called proctitis. These problems are common and treatable, and nothing to be embarrassed about discussing with your doctor.",
            es: "Otras condiciones rectales incluyen infecciones y abscesos, fístulas (túneles anormales que pueden formarse después de un absceso), prolapso rectal e inflamación del recto llamada proctitis. Estos problemas son comunes y tratables, y no debe darle pena hablarlos con su médico.",
          },
        ],
      },
      {
        heading: { en: "Common symptoms", es: "Síntomas comunes" },
        paragraphs: [
          {
            en: "Rectal conditions usually announce themselves with bleeding — bright red blood on the toilet paper or in the bowl — pain or burning with bowel movements, itching, swelling or a lump near the anus, mucus discharge, or a feeling of incomplete emptying. Because symptoms of minor conditions overlap with those of more serious ones, including rectal cancer, new or persistent symptoms should be evaluated rather than assumed to be hemorrhoids.",
            es: "Las condiciones rectales suelen manifestarse con sangrado — sangre roja brillante en el papel higiénico o en el inodoro — dolor o ardor al evacuar, comezón, hinchazón o un bulto cerca del ano, secreción de moco o una sensación de vaciado incompleto. Como los síntomas de las condiciones menores se parecen a los de otras más serias, incluido el cáncer de recto, los síntomas nuevos o persistentes deben evaluarse en lugar de asumir que son hemorroides.",
          },
        ],
      },
      {
        heading: { en: "How rectal disease is evaluated", es: "Cómo se evalúan las enfermedades rectales" },
        paragraphs: [
          {
            en: "Evaluation typically includes a visual inspection and a gentle digital examination of the area. It may also include anoscopy, a brief office examination of the anal canal with a small instrument. Depending on your age, symptoms, and history, your gastroenterologist may recommend a flexible sigmoidoscopy or a colonoscopy to examine further inside and rule out other sources of bleeding.",
            es: "La evaluación generalmente incluye una inspección visual y un examen digital suave de la zona. También puede incluir una anoscopia, un examen breve del canal anal que se hace en el consultorio con un pequeño instrumento. Según su edad, sus síntomas y sus antecedentes, su gastroenterólogo puede recomendar una sigmoidoscopia flexible o una colonoscopia para examinar más adentro y descartar otras fuentes de sangrado.",
          },
        ],
      },
      {
        heading: { en: "Treatment approaches", es: "Opciones de tratamiento" },
        paragraphs: [
          {
            en: "Many rectal conditions improve with simple measures: more fiber and fluids to soften the stool, not straining or sitting on the toilet for long periods, warm sitz baths, and short courses of over-the-counter creams.",
            es: "Muchas condiciones rectales mejoran con medidas sencillas: más fibra y líquidos para ablandar las heces, no hacer esfuerzo ni permanecer sentado en el inodoro por períodos largos, baños de asiento con agua tibia y tandas cortas de cremas de venta libre.",
          },
          {
            en: "Hemorrhoids that keep bleeding can often be treated in the office with rubber band ligation, a quick procedure that cuts off the hemorrhoid's blood supply so it shrinks. Fissures are treated with stool softening and prescription ointments that relax the anal muscle so the tear can heal. Abscesses and fistulas usually require drainage or minor surgery.",
            es: "Las hemorroides que siguen sangrando muchas veces pueden tratarse en el consultorio con ligadura con banda elástica, un procedimiento rápido que corta el suministro de sangre de la hemorroide para que se encoja. Las fisuras se tratan ablandando las heces y con ungüentos recetados que relajan el músculo anal para que el desgarro pueda sanar. Los abscesos y las fístulas por lo general requieren drenaje o una cirugía menor.",
          },
        ],
      },
      {
        heading: { en: "When to contact a gastroenterologist", es: "Cuándo consultar a un gastroenterólogo" },
        paragraphs: [
          {
            en: "Any rectal bleeding deserves an evaluation, even if you suspect hemorrhoids — especially if you are over forty-five, have a family history of colorectal cancer, or notice blood mixed into the stool. Also seek care for severe or worsening anal pain, a painful lump, fever with rectal pain, a change in bowel habits, or symptoms that persist despite a week or two of home care.",
            es: "Todo sangrado rectal merece una evaluación, incluso si usted sospecha que son hemorroides — sobre todo si tiene más de cuarenta y cinco años, antecedentes familiares de cáncer colorrectal o nota sangre mezclada con las heces. Busque atención también por dolor anal intenso o que empeora, un bulto doloroso, fiebre con dolor rectal, un cambio en el hábito intestinal o síntomas que persisten a pesar de una o dos semanas de cuidados en casa.",
          },
        ],
      },
    ],
    relatedDocId: "info-rectal-disease",
  },
  {
    slug: "ulcers",
    group: "conditions",
    title: { en: "Ulcers", es: "Úlceras" },
    summary: {
      en: "Peptic ulcers are open sores in the lining of the stomach or upper small intestine, most often caused by a common bacterium or by pain relievers. Learn the symptoms, the tests that find them, and how they heal.",
      es: "Las úlceras pépticas son llagas abiertas en el revestimiento del estómago o de la primera parte del intestino delgado, causadas la mayoría de las veces por una bacteria común o por analgésicos. Conozca los síntomas, las pruebas que las detectan y cómo se curan.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "A peptic ulcer is an open sore in the lining of the stomach (a gastric ulcer) or in the first part of the small intestine (a duodenal ulcer). Ulcers form when the layer of mucus that protects the lining from stomach acid wears down.",
            es: "Una úlcera péptica es una llaga abierta en el revestimiento del estómago (úlcera gástrica) o en la primera parte del intestino delgado (úlcera duodenal). Las úlceras se forman cuando se desgasta la capa de moco que protege el revestimiento del ácido del estómago.",
          },
          {
            en: "The two most common causes are infection with a bacterium called Helicobacter pylori and regular use of pain relievers known as NSAIDs, such as ibuprofen, naproxen, and aspirin. Contrary to old belief, stress and spicy food do not cause ulcers, though they can aggravate symptoms.",
            es: "Las dos causas más comunes son la infección por una bacteria llamada Helicobacter pylori y el uso frecuente de analgésicos conocidos como AINE, como el ibuprofeno, el naproxeno y la aspirina. A diferencia de lo que se creía antes, el estrés y la comida picante no causan úlceras, aunque pueden agravar los síntomas.",
          },
        ],
      },
      {
        heading: { en: "Common symptoms", es: "Síntomas comunes" },
        paragraphs: [
          {
            en: "The most common symptom is a burning or gnawing pain in the upper abdomen, often between meals or during the night, that may ease for a while with food or antacids. Other symptoms include bloating, feeling full quickly, nausea, and loss of appetite. Some ulcers — especially those caused by NSAIDs — produce no pain at all and first show themselves with bleeding.",
            es: "El síntoma más común es un dolor ardoroso o corrosivo en la parte superior del abdomen, a menudo entre comidas o durante la noche, que puede aliviarse por un rato con alimentos o antiácidos. Otros síntomas incluyen hinchazón, saciedad rápida, náuseas y pérdida del apetito. Algunas úlceras — sobre todo las causadas por los AINE — no producen ningún dolor y se manifiestan por primera vez con un sangrado.",
          },
        ],
      },
      {
        heading: { en: "How ulcers are diagnosed", es: "Cómo se diagnostican las úlceras" },
        paragraphs: [
          {
            en: "Your gastroenterologist may test for H. pylori with a breath, stool, or blood test. The most direct way to confirm an ulcer is an upper endoscopy: while you are sedated, a thin, flexible camera examines the esophagus, stomach, and duodenum. Biopsies taken during the exam can confirm the infection and make sure a stomach ulcer is not hiding anything more serious.",
            es: "Su gastroenterólogo puede buscar H. pylori con una prueba de aliento, de heces o de sangre. La forma más directa de confirmar una úlcera es una endoscopia superior: mientras usted está sedado, una cámara delgada y flexible examina el esófago, el estómago y el duodeno. Las biopsias tomadas durante el examen pueden confirmar la infección y asegurar que una úlcera del estómago no esconde algo más serio.",
          },
        ],
      },
      {
        heading: { en: "Treatment approaches", es: "Opciones de tratamiento" },
        paragraphs: [
          {
            en: "Most ulcers heal with a course of acid-reducing medicine, usually a proton pump inhibitor, which lowers acid so the lining can repair itself. If H. pylori is present, it is treated with a combination of antibiotics plus acid reduction, and follow-up testing confirms the infection is gone.",
            es: "La mayoría de las úlceras sanan con un curso de medicamento reductor de ácido, generalmente un inhibidor de la bomba de protones, que disminuye el ácido para que el revestimiento pueda repararse. Si hay H. pylori, se trata con una combinación de antibióticos más reducción del ácido, y una prueba de seguimiento confirma que la infección desapareció.",
          },
          {
            en: "If NSAIDs caused the ulcer, your doctor will help you stop them or find a safer alternative. Stomach ulcers are often rechecked with a follow-up endoscopy to confirm they have healed completely.",
            es: "Si los AINE causaron la úlcera, su médico le ayudará a suspenderlos o a encontrar una alternativa más segura. Las úlceras del estómago a menudo se vuelven a revisar con una endoscopia de seguimiento para confirmar que sanaron por completo.",
          },
        ],
      },
      {
        heading: { en: "When to contact a gastroenterologist", es: "Cuándo consultar a un gastroenterólogo" },
        paragraphs: [
          {
            en: "Make an appointment for upper abdominal pain that keeps returning, especially if you take NSAIDs regularly. Seek emergency care for vomiting blood or material that looks like coffee grounds, black or tarry stools, sudden severe abdominal pain, or lightheadedness along with stomach symptoms — these can signal a bleeding or perforated ulcer.",
            es: "Haga una cita si tiene dolor en la parte superior del abdomen que sigue regresando, sobre todo si toma AINE con regularidad. Busque atención de emergencia si vomita sangre o material con aspecto de café molido, si tiene heces negras o alquitranadas, dolor abdominal repentino e intenso, o mareo junto con síntomas estomacales — pueden ser señales de una úlcera sangrante o perforada.",
          },
        ],
      },
    ],
    relatedDocId: "info-ulcers",
  },
];
