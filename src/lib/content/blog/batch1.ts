// Blog port, batch 1 (legacy posts 1–6). Titles and dates match the old site
// exactly; article bodies are original bilingual prose written for the rebuild.

import type { BlogPost } from "../types";

export const batch1: BlogPost[] = [
  {
    slug: "what-a-colonoscopy-involves-and-why-it-matters",
    legacyPath: "/blog/1468523-what-a-colonoscopy-involves-and-why-it-matters",
    title: {
      en: "What a Colonoscopy Involves and Why It Matters",
      es: "En qué consiste una colonoscopia y por qué es importante",
    },
    posted: "2026-06-23",
    teaser: {
      en: "A colonoscopy lets a gastroenterologist find and remove polyps before they can become cancer. Here is what the exam involves, from preparation to the procedure itself, and why it plays such an important role in digestive care.",
      es: "La colonoscopia permite al gastroenterólogo encontrar y extirpar pólipos antes de que puedan convertirse en cáncer. Le explicamos en qué consiste el examen, desde la preparación hasta el procedimiento en sí, y por qué cumple un papel tan importante en el cuidado digestivo.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "A colonoscopy is an examination of the large intestine, and it is one of the most useful tests in digestive medicine. It gives a gastroenterologist a direct view of the colon's lining, which makes it possible to find — and often remove — small growths long before they cause trouble. If the idea of the procedure makes you nervous, you are far from alone. Understanding what actually happens, step by step, takes much of the mystery out of it.",
            es: "La colonoscopia es un examen del intestino grueso y una de las pruebas más útiles de la medicina digestiva. Le permite al gastroenterólogo ver directamente el revestimiento del colon, lo que hace posible encontrar —y muchas veces extirpar— pequeños crecimientos mucho antes de que causen problemas. Si la idea del procedimiento le genera nervios, le ocurre a muchas personas. Entender lo que realmente sucede, paso a paso, le quita gran parte del misterio.",
          },
        ],
      },
      {
        heading: {
          en: "Why Colonoscopies Are Important",
          es: "Por qué es importante la colonoscopia",
        },
        paragraphs: [
          {
            en: "Most colorectal cancers begin as polyps: small growths on the inner wall of the colon that are harmless at first and change slowly over many years. When a polyp is found during a colonoscopy, it can usually be removed on the spot — which means the test does not just detect cancer, it can help keep it from developing in the first place.",
            es: "La mayoría de los cánceres colorrectales comienzan como pólipos: pequeños crecimientos en la pared interna del colon que al principio son inofensivos y cambian lentamente a lo largo de muchos años. Cuando se encuentra un pólipo durante una colonoscopia, por lo general puede extirparse en ese mismo momento, lo que significa que la prueba no solo detecta el cáncer, sino que puede ayudar a evitar que llegue a desarrollarse.",
          },
          {
            en: "A colonoscopy is also a diagnostic tool. Rectal bleeding, diarrhea that will not settle, unexplained abdominal pain, low iron levels, or a lasting change in bowel habits are all reasons a gastroenterologist may recommend the exam. And because early colorectal cancer often causes no symptoms at all, staying on schedule with screening matters even when you feel perfectly well.",
            es: "La colonoscopia también es una herramienta de diagnóstico. El sangrado rectal, la diarrea que no cede, el dolor abdominal sin explicación, los niveles bajos de hierro o un cambio duradero en los hábitos intestinales son motivos por los que un gastroenterólogo puede recomendar el examen. Y como el cáncer colorrectal en etapas tempranas muchas veces no causa ningún síntoma, cumplir a tiempo con las pruebas de detección es importante incluso cuando usted se siente perfectamente bien.",
          },
        ],
      },
      {
        heading: {
          en: "What Happens Before the Procedure?",
          es: "¿Qué sucede antes del procedimiento?",
        },
        paragraphs: [
          {
            en: "The colon has to be empty for the doctor to see its lining clearly, so preparation is the part you do at home. In the day or so before the exam, you follow specific dietary instructions and drink a prescribed laxative solution that flushes out the bowel. The prep is rarely anyone's favorite step, but doing it thoroughly is what allows even small abnormalities to be spotted.",
            es: "El colon debe estar vacío para que el médico pueda ver su revestimiento con claridad, así que la preparación es la parte que usted hace en casa. Durante el día previo al examen, aproximadamente, usted sigue instrucciones específicas de dieta y toma una solución laxante recetada que limpia el intestino. La preparación rara vez es el paso favorito de nadie, pero hacerla a conciencia es lo que permite detectar incluso anomalías pequeñas.",
          },
          {
            en: "Your care team also reviews your medications and medical history in advance, so the day of the procedure goes safely and smoothly.",
            es: "Su equipo médico también revisa de antemano sus medicamentos y su historia clínica, para que el día del procedimiento transcurra de forma segura y sin contratiempos.",
          },
        ],
      },
      {
        heading: {
          en: "What Happens During a Colonoscopy?",
          es: "¿Qué sucede durante una colonoscopia?",
        },
        paragraphs: [
          {
            en: "On the day of the exam you receive sedation, and most people doze through the procedure and remember little or nothing of it. The gastroenterologist gently guides a thin, flexible tube fitted with a light and a small camera through the colon, examining the lining on a video screen.",
            es: "El día del examen usted recibe sedación, y la mayoría de las personas duermen durante el procedimiento y recuerdan poco o nada de él. El gastroenterólogo guía con cuidado a través del colon un tubo delgado y flexible, equipado con una luz y una pequeña cámara, mientras examina el revestimiento en una pantalla.",
          },
          {
            en: "If a polyp or another area of concern appears, it can usually be removed or sampled during the same exam, with no separate surgery required. The examination itself typically takes less than an hour, and you go home the same day once the sedation wears off, with someone to drive you.",
            es: "Si aparece un pólipo u otra área que genere duda, por lo general puede extirparse o tomarse una muestra durante el mismo examen, sin necesidad de una cirugía aparte. El examen en sí suele durar menos de una hora, y usted regresa a casa el mismo día cuando pasa el efecto de la sedación, acompañado de alguien que pueda llevarle.",
          },
        ],
      },
      {
        heading: {
          en: "Why Colonoscopy Matters",
          es: "Por qué importa la colonoscopia",
        },
        paragraphs: [
          {
            en: "Because precancerous polyps can be removed before they turn into anything worse, colonoscopy is one of the few tests that can actually lower the risk of developing colorectal cancer rather than only finding it earlier. It also provides clear answers when symptoms need an explanation, which helps guide treatment decisions.",
            es: "Como los pólipos precancerosos pueden extirparse antes de que se conviertan en algo peor, la colonoscopia es una de las pocas pruebas que realmente puede reducir el riesgo de desarrollar cáncer colorrectal, y no solo detectarlo más temprano. También ofrece respuestas claras cuando los síntomas necesitan una explicación, lo que ayuda a orientar las decisiones de tratamiento.",
          },
          {
            en: "When to begin screening, and how often to repeat it, depends on your age, personal health, and family history — so the right plan is an individual one. If you are due for screening, or you have symptoms you have been putting off, talk with a gastroenterologist about the timing that makes sense for you.",
            es: "Cuándo comenzar las pruebas de detección, y con qué frecuencia repetirlas, depende de su edad, su salud personal y sus antecedentes familiares; por eso el plan correcto es individual. Si le corresponde hacerse una prueba de detección, o tiene síntomas que ha estado postergando, hable con un gastroenterólogo sobre el momento más adecuado para usted.",
          },
        ],
      },
    ],
  },
  {
    slug: "understanding-gastroparesis-symptoms-and-management",
    legacyPath: "/blog/1465777-understanding-gastroparesis-symptoms-and-management",
    title: {
      en: "Understanding Gastroparesis: Symptoms and Management",
      es: "Entienda la gastroparesia: síntomas y manejo",
    },
    posted: "2026-06-12",
    teaser: {
      en: "Gastroparesis slows the stomach's normal emptying and can cause nausea, early fullness, and unintended weight loss. Learn how the condition is diagnosed and the practical steps that help manage it.",
      es: "La gastroparesia retrasa el vaciamiento normal del estómago y puede causar náuseas, saciedad temprana y pérdida de peso involuntaria. Conozca cómo se diagnostica esta condición y los pasos prácticos que ayudan a manejarla.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "After a meal, the stomach normally grinds food down and releases it into the small intestine at a steady, controlled pace. In gastroparesis, that emptying slows — not because something is blocking the way, but because the stomach muscles, or the nerves that direct them, are not working as they should. Living with the condition can be frustrating, but with an accurate diagnosis and a workable plan, symptoms can often be managed considerably better.",
            es: "Después de una comida, el estómago normalmente tritura los alimentos y los libera hacia el intestino delgado a un ritmo constante y controlado. En la gastroparesia, ese vaciamiento se vuelve lento, no porque algo esté obstruyendo el paso, sino porque los músculos del estómago, o los nervios que los dirigen, no funcionan como deberían. Vivir con esta condición puede ser frustrante, pero con un diagnóstico certero y un plan realista, muchas veces los síntomas pueden manejarse bastante mejor.",
          },
        ],
      },
      {
        heading: {
          en: "What Is Gastroparesis?",
          es: "¿Qué es la gastroparesia?",
        },
        paragraphs: [
          {
            en: "Gastroparesis refers to weakness of the stomach's muscular movement; doctors also call the condition delayed gastric emptying. Digestion depends on coordinated muscle contractions, guided by nerve signals, that move food along the tract. When that coordination falters, food sits in the stomach far longer than it should.",
            es: "La gastroparesia se refiere a una debilidad del movimiento muscular del estómago; los médicos también la llaman vaciamiento gástrico retardado. La digestión depende de contracciones musculares coordinadas, guiadas por señales nerviosas, que hacen avanzar los alimentos. Cuando esa coordinación falla, la comida permanece en el estómago mucho más tiempo del debido.",
          },
          {
            en: "Diabetes is one of the best-known causes, because years of elevated blood sugar can injure the nerves that help govern digestion. Certain medications slow stomach emptying as a side effect, and previous surgery or neurological disease can contribute as well. In many patients, though, no specific cause is ever identified.",
            es: "La diabetes es una de las causas más conocidas, porque años de niveles elevados de azúcar en la sangre pueden dañar los nervios que ayudan a regular la digestión. Algunos medicamentos retrasan el vaciamiento del estómago como efecto secundario, y una cirugía previa o una enfermedad neurológica también pueden contribuir. En muchos pacientes, sin embargo, nunca se identifica una causa específica.",
          },
        ],
      },
      {
        heading: {
          en: "Common Symptoms of Gastroparesis",
          es: "Síntomas comunes de la gastroparesia",
        },
        paragraphs: [
          {
            en: "Because food lingers in the stomach, people with gastroparesis often feel full after only a few bites, or stay uncomfortably full for hours after a meal. Nausea, vomiting, bloating, and discomfort in the upper abdomen are common companions.",
            es: "Como la comida se queda en el estómago, las personas con gastroparesia a menudo se sienten llenas después de apenas unos bocados, o permanecen incómodamente llenas durante horas después de comer. Las náuseas, los vómitos, la hinchazón y las molestias en la parte alta del abdomen también son frecuentes.",
          },
          {
            en: "Eating less, in turn, can lead to weight loss and gaps in nutrition — sometimes before a person realizes how much their intake has dropped. Symptoms usually build gradually, which is one reason the condition can go unrecognized for quite a while.",
            es: "Comer menos, a su vez, puede llevar a pérdida de peso y a deficiencias en la nutrición, a veces antes de que la persona se dé cuenta de cuánto ha disminuido su alimentación. Los síntomas suelen aparecer de forma gradual, y esa es una de las razones por las que la condición puede pasar desapercibida durante bastante tiempo.",
          },
        ],
      },
      {
        heading: {
          en: "How Gastroparesis Is Diagnosed and Treated",
          es: "Cómo se diagnostica y se trata la gastroparesia",
        },
        paragraphs: [
          {
            en: "Evaluation starts with a careful history and physical exam, because several digestive disorders cause similar complaints. A gastroenterologist may order a gastric emptying study, which tracks how quickly a standard meal leaves the stomach, along with an upper endoscopy or imaging to make sure a blockage or another condition is not responsible.",
            es: "La evaluación comienza con una historia clínica detallada y un examen físico, porque varios trastornos digestivos producen molestias parecidas. Un gastroenterólogo puede ordenar un estudio de vaciamiento gástrico, que mide qué tan rápido sale del estómago una comida estándar, junto con una endoscopia superior o estudios de imagen para descartar una obstrucción u otra condición.",
          },
          {
            en: "Treatment centers on helping food move through more comfortably and protecting nutrition. Many patients feel better with smaller meals spread across the day and softer foods that digest more easily. Depending on symptom severity, medication to support stomach emptying or relieve nausea may be added, and the plan is refined over time as your response becomes clear.",
            es: "El tratamiento se centra en ayudar a que los alimentos avancen con mayor comodidad y en proteger la nutrición. Muchos pacientes se sienten mejor con porciones más pequeñas repartidas a lo largo del día y con alimentos blandos, que se digieren con más facilidad. Según la gravedad de los síntomas, pueden añadirse medicamentos para favorecer el vaciamiento del estómago o aliviar las náuseas, y el plan se ajusta con el tiempo a medida que se aclara su respuesta.",
          },
        ],
      },
      {
        heading: {
          en: "When to Seek Medical Evaluation",
          es: "Cuándo buscar una evaluación médica",
        },
        paragraphs: [
          {
            en: "Nausea or vomiting that keeps returning, fullness after small amounts of food, persistent bloating, or weight loss you did not intend all deserve a medical evaluation. Left alone, these symptoms can gradually wear down nutrition, hydration, and energy. A gastroenterologist can help determine whether gastroparesis or another condition is behind them — and getting that answer early makes it easier to protect your health and comfort.",
            es: "Las náuseas o los vómitos que regresan una y otra vez, la sensación de llenura con poca comida, la hinchazón persistente o una pérdida de peso involuntaria merecen una evaluación médica. Si no se atienden, estos síntomas pueden desgastar poco a poco la nutrición, la hidratación y la energía. Un gastroenterólogo puede ayudar a determinar si detrás de ellos hay gastroparesia u otra condición, y obtener esa respuesta temprano facilita proteger su salud y su bienestar.",
          },
        ],
      },
    ],
  },
  {
    slug: "celiac-disease-vs-gluten-sensitivity-understanding-the-difference",
    legacyPath:
      "/blog/1461310-celiac-disease-vs-gluten-sensitivity-understanding-the-difference",
    title: {
      en: "Celiac Disease vs. Gluten Sensitivity: Understanding the Difference",
      es: "Enfermedad celíaca frente a sensibilidad al gluten: entienda la diferencia",
    },
    posted: "2026-05-28",
    teaser: {
      en: "Celiac disease and gluten sensitivity can feel similar, but one involves lasting damage to the small intestine and the other does not. Here is how the two differ and why testing before going gluten-free matters.",
      es: "La enfermedad celíaca y la sensibilidad al gluten pueden sentirse parecidas, pero una implica daño duradero al intestino delgado y la otra no. Le explicamos en qué se diferencian y por qué conviene hacerse las pruebas antes de dejar el gluten.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Plenty of people notice that bread, pasta, or baked goods leave them bloated or generally unwell, and many wonder whether gluten is the culprit. Gluten is a protein that occurs naturally in wheat, barley, and rye, which puts it in a long list of everyday foods. Two distinct conditions can sit behind gluten-related symptoms — celiac disease and non-celiac gluten sensitivity — and although they can feel alike from the inside, they are not the same problem. Telling them apart has real consequences for your long-term health.",
            es: "Muchas personas notan que el pan, la pasta o los productos horneados las dejan hinchadas o con malestar general, y se preguntan si el gluten es el responsable. El gluten es una proteína presente de forma natural en el trigo, la cebada y el centeno, lo que lo coloca en una larga lista de alimentos cotidianos. Detrás de los síntomas relacionados con el gluten puede haber dos condiciones distintas —la enfermedad celíaca y la sensibilidad al gluten no celíaca— y, aunque pueden sentirse iguales por dentro, no son el mismo problema. Distinguirlas tiene consecuencias reales para su salud a largo plazo.",
          },
        ],
      },
      {
        heading: {
          en: "Understanding Celiac Disease",
          es: "Entienda la enfermedad celíaca",
        },
        paragraphs: [
          {
            en: "Celiac disease is an autoimmune condition. In a person who has it, eating gluten prompts the immune system to attack the lining of the small intestine, wearing down the tiny finger-like projections, called villi, that absorb nutrients from food. Abdominal pain, bloating, diarrhea or constipation, gas, and nausea are common results — but they are only part of the picture.",
            es: "La enfermedad celíaca es una condición autoinmune. En una persona que la padece, comer gluten provoca que el sistema inmunitario ataque el revestimiento del intestino delgado y desgaste las pequeñas proyecciones en forma de dedo, llamadas vellosidades, que absorben los nutrientes de los alimentos. El dolor abdominal, la hinchazón, la diarrea o el estreñimiento, los gases y las náuseas son resultados comunes, pero son solo una parte del cuadro.",
          },
          {
            en: "Because a damaged intestine absorbs nutrients poorly, celiac disease can also surface as anemia, fatigue, unexplained weight changes, joint aches, headaches, or skin rashes. Some people have dramatic symptoms; others feel nearly nothing while the damage quietly continues. That wide range is one reason the disease is easy to miss.",
            es: "Como un intestino dañado absorbe mal los nutrientes, la enfermedad celíaca también puede manifestarse como anemia, fatiga, cambios de peso sin explicación, dolores articulares, dolores de cabeza o erupciones en la piel. Algunas personas tienen síntomas muy marcados; otras casi no sienten nada mientras el daño continúa en silencio. Ese rango tan amplio es una de las razones por las que la enfermedad es fácil de pasar por alto.",
          },
        ],
      },
      {
        heading: {
          en: "What Is Gluten Sensitivity?",
          es: "¿Qué es la sensibilidad al gluten?",
        },
        paragraphs: [
          {
            en: "Non-celiac gluten sensitivity describes a different situation. Gluten triggers genuinely uncomfortable symptoms — bloating, abdominal discomfort, tiredness, headaches, or mental fog — but testing shows none of the intestinal injury or immune markers that define celiac disease. The symptoms deserve to be taken seriously, yet the underlying process, and what it means for the years ahead, is different.",
            es: "La sensibilidad al gluten no celíaca describe una situación diferente. El gluten provoca síntomas realmente incómodos —hinchazón, molestias abdominales, cansancio, dolores de cabeza o una sensación de mente nublada—, pero las pruebas no muestran la lesión intestinal ni los marcadores inmunitarios que definen la enfermedad celíaca. Los síntomas merecen tomarse en serio; sin embargo, el proceso de fondo, y lo que significa para los años por venir, es distinto.",
          },
        ],
      },
      {
        heading: {
          en: "Why Accurate Diagnosis Matters",
          es: "Por qué importa un diagnóstico preciso",
        },
        paragraphs: [
          {
            en: "The two conditions call for different long-term care, so it pays to know which one you are dealing with. Celiac disease is usually identified through blood tests that look for specific antibodies, sometimes followed by an upper endoscopy with small biopsies of the intestinal lining.",
            es: "Las dos condiciones requieren cuidados distintos a largo plazo, así que vale la pena saber cuál es la suya. La enfermedad celíaca suele identificarse mediante análisis de sangre que buscan anticuerpos específicos, a veces seguidos de una endoscopia superior con pequeñas biopsias del revestimiento intestinal.",
          },
          {
            en: "One detail catches many people off guard: those tests can come back falsely negative if you have already cut gluten out. Whenever possible, complete the evaluation before starting a strict gluten-free diet. If celiac disease is confirmed, the treatment is a lifelong gluten-free diet, which allows the intestine to heal and helps prevent complications. With gluten sensitivity, the approach is more flexible and can be tailored to how clearly symptoms respond to dietary change — ideally with professional guidance, so nutrition does not suffer along the way.",
            es: "Hay un detalle que sorprende a muchas personas: esas pruebas pueden dar un resultado falsamente negativo si usted ya eliminó el gluten. Siempre que sea posible, complete la evaluación antes de comenzar una dieta estricta sin gluten. Si se confirma la enfermedad celíaca, el tratamiento es una dieta sin gluten de por vida, que permite que el intestino sane y ayuda a prevenir complicaciones. Con la sensibilidad al gluten, el enfoque es más flexible y puede ajustarse según qué tanto respondan los síntomas al cambio de alimentación, idealmente con orientación profesional, para que la nutrición no se vea afectada en el camino.",
          },
        ],
      },
      {
        heading: {
          en: "When to Seek a Gastroenterology Evaluation",
          es: "Cuándo buscar una evaluación con gastroenterología",
        },
        paragraphs: [
          {
            en: "Bloating, abdominal pain, changes in bowel habits, ongoing fatigue, or symptoms that reliably follow gluten-containing meals are all good reasons to see a gastroenterologist — especially if celiac disease runs in your family. Sorting out the true cause gives you a clear path forward, whether it ultimately involves gluten or something else entirely.",
            es: "La hinchazón, el dolor abdominal, los cambios en los hábitos intestinales, la fatiga continua o los síntomas que aparecen de manera constante después de comidas con gluten son buenas razones para consultar a un gastroenterólogo, especialmente si hay enfermedad celíaca en su familia. Aclarar la verdadera causa le da un camino claro hacia adelante, ya sea que al final tenga que ver con el gluten o con algo completamente distinto.",
          },
        ],
      },
    ],
  },
  {
    slug: "how-fiber-supports-your-digestive-health",
    legacyPath: "/blog/1457051-how-fiber-supports-your-digestive-health",
    title: {
      en: "How Fiber Supports Your Digestive Health",
      es: "Cómo la fibra apoya su salud digestiva",
    },
    posted: "2026-05-18",
    teaser: {
      en: "Fiber does more than keep you regular — it supports comfortable digestion and feeds the gut's healthy bacteria. Learn how the two types of fiber work and how to add more of it comfortably.",
      es: "La fibra hace más que mantener la regularidad: favorece una digestión cómoda y alimenta las bacterias saludables del intestino. Conozca cómo funcionan los dos tipos de fibra y cómo aumentar su consumo sin molestias.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Fiber rarely gets much attention, but it quietly does a great deal for everyday digestive comfort. Most people connect it only with staying regular, yet fiber also nourishes the gut's beneficial bacteria and supports the digestive tract's steady work over the long run. A diet that stays low in fiber — which is common — tends to invite constipation, bloating, and sluggish digestion over time.",
            es: "La fibra rara vez recibe mucha atención, pero en silencio hace muchísimo por la comodidad digestiva de todos los días. La mayoría de las personas la relaciona únicamente con la regularidad; sin embargo, la fibra también nutre las bacterias beneficiosas del intestino y respalda el trabajo constante del aparato digestivo a largo plazo. Una alimentación baja en fibra —algo bastante común— tiende a favorecer con el tiempo el estreñimiento, la hinchazón y una digestión lenta.",
          },
        ],
      },
      {
        heading: {
          en: "What Fiber Does in the Digestive System",
          es: "Qué hace la fibra en el aparato digestivo",
        },
        paragraphs: [
          {
            en: "Fiber is the portion of plant foods that the body cannot fully break down. Rather than being absorbed, it travels the length of the digestive tract, adding bulk to stool and helping waste move along at a healthy pace. Some fiber also holds water, which keeps stool soft and easier to pass.",
            es: "La fibra es la porción de los alimentos vegetales que el cuerpo no puede descomponer por completo. En lugar de absorberse, recorre todo el tubo digestivo, dando volumen a las heces y ayudando a que los desechos avancen a un ritmo saludable. Parte de la fibra también retiene agua, lo que mantiene las heces blandas y más fáciles de evacuar.",
          },
          {
            en: "That simple mechanical role pays off in several ways. Comfortable, regular bowel movements mean less straining — something that matters for anyone prone to hemorrhoids — and steady bowel habits are often part of managing diverticular disease. Fiber also serves as food for beneficial gut bacteria, helping keep the digestive system's inner ecosystem in balance.",
            es: "Ese papel mecánico tan sencillo rinde frutos de varias maneras. Evacuar con regularidad y sin molestias significa hacer menos esfuerzo —algo importante para quien es propenso a las hemorroides—, y unos hábitos intestinales estables suelen formar parte del manejo de la enfermedad diverticular. La fibra también sirve de alimento a las bacterias intestinales beneficiosas, lo que ayuda a mantener en equilibrio el ecosistema interno del aparato digestivo.",
          },
        ],
      },
      {
        heading: {
          en: "Soluble and Insoluble Fiber",
          es: "Fibra soluble e insoluble",
        },
        paragraphs: [
          {
            en: "There are two broad types of fiber, and they help in different ways. Soluble fiber dissolves in water, turning into a soft gel; beyond easing the passage of stool, it can help support healthy cholesterol and blood sugar levels. Oats, beans, apples, and citrus fruits are good sources.",
            es: "Existen dos grandes tipos de fibra, y ayudan de maneras diferentes. La fibra soluble se disuelve en agua y se convierte en un gel suave; además de facilitar el paso de las heces, puede ayudar a mantener niveles saludables de colesterol y de azúcar en la sangre. La avena, los frijoles, las manzanas y los cítricos son buenas fuentes.",
          },
          {
            en: "Insoluble fiber does not dissolve. It supplies the bulk that keeps material moving through the intestines, and it comes from foods such as whole grains, nuts, and many vegetables. A varied diet naturally provides both kinds — and both matter for digestion.",
            es: "La fibra insoluble no se disuelve. Aporta el volumen que mantiene el contenido en movimiento a través de los intestinos, y proviene de alimentos como los granos integrales, las nueces y muchas verduras. Una alimentación variada aporta de forma natural ambos tipos, y los dos son importantes para la digestión.",
          },
        ],
      },
      {
        heading: {
          en: "Adding Fiber Gradually, With Enough Water",
          es: "Aumente la fibra poco a poco y con suficiente agua",
        },
        paragraphs: [
          {
            en: "If your meals have been low in fiber, adding a large amount overnight often backfires, with gas, bloating, and cramping as the result. Build up slowly over a few weeks — an extra serving of vegetables here, a switch to whole grains there — so your digestive system has time to adjust.",
            es: "Si sus comidas han sido bajas en fibra, agregar una gran cantidad de un día para otro suele salir mal, con gases, hinchazón y cólicos como resultado. Aumente poco a poco durante algunas semanas —una porción adicional de verduras por aquí, un cambio a granos integrales por allá— para que su aparato digestivo tenga tiempo de adaptarse.",
          },
          {
            en: "Water is the other half of the equation. Fiber needs fluid to soften stool and do its work; adding fiber without enough water can actually make constipation worse. Pairing fiber-rich foods with steady hydration throughout the day is what makes the whole approach succeed.",
            es: "El agua es la otra mitad de la ecuación. La fibra necesita líquido para ablandar las heces y cumplir su función; añadir fibra sin suficiente agua puede incluso empeorar el estreñimiento. Combinar alimentos ricos en fibra con una hidratación constante a lo largo del día es lo que hace que todo el enfoque funcione.",
          },
        ],
      },
      {
        heading: {
          en: "Supporting Long-Term Digestive Wellness",
          es: "Apoye su bienestar digestivo a largo plazo",
        },
        paragraphs: [
          {
            en: "Fruits, vegetables, beans and lentils, and whole grains spread across the day cover most people's fiber needs without supplements or complicated rules. Consistency counts for more than any single food choice.",
            es: "Las frutas, las verduras, los frijoles y las lentejas, y los granos integrales repartidos a lo largo del día cubren las necesidades de fibra de la mayoría de las personas, sin suplementos ni reglas complicadas. La constancia cuenta más que cualquier alimento en particular.",
          },
          {
            en: "If constipation, bloating, abdominal pain, or a change in bowel habits persists despite better eating habits, it is worth going beyond self-adjustment. A gastroenterologist can look for underlying causes and help shape an approach suited to your particular situation.",
            es: "Si el estreñimiento, la hinchazón, el dolor abdominal o un cambio en los hábitos intestinales persisten a pesar de mejores hábitos de alimentación, vale la pena ir más allá de los ajustes por cuenta propia. Un gastroenterólogo puede buscar causas de fondo y ayudarle a definir un enfoque adecuado a su situación particular.",
          },
        ],
      },
    ],
  },
  {
    slug: "signs-your-heartburn-may-need-medical-attention",
    legacyPath: "/blog/1450012-signs-your-heartburn-may-need-medical-attention",
    title: {
      en: "Signs Your Heartburn May Need Medical Attention",
      es: "Señales de que su acidez estomacal puede requerir atención médica",
    },
    posted: "2026-04-27",
    teaser: {
      en: "Occasional heartburn is common, but frequent or worsening symptoms can point to reflux disease and deserve a closer look. These are the warning signs that mean it is time to see a doctor.",
      es: "La acidez estomacal ocasional es común, pero los síntomas frecuentes o que van empeorando pueden indicar enfermedad por reflujo y merecen una revisión. Estas son las señales de alerta que indican que es hora de consultar al médico.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "That burning sensation rising behind the breastbone after a heavy dinner is familiar to almost everyone. Occasional heartburn is common and usually harmless — an annoyance to manage, not a warning sign. When the burning starts appearing several times a week, though, or keeps growing stronger, it is telling you something different. Knowing where that line falls helps you decide when symptoms should be evaluated rather than simply endured.",
            es: "Esa sensación de ardor que sube detrás del esternón después de una cena pesada le resulta familiar a casi todo el mundo. La acidez estomacal ocasional es común y, por lo general, inofensiva: una molestia que se maneja, no una señal de alarma. Sin embargo, cuando el ardor empieza a aparecer varias veces por semana, o se vuelve cada vez más intenso, le está diciendo algo distinto. Saber dónde está esa línea le ayuda a decidir cuándo conviene evaluar los síntomas en lugar de simplemente soportarlos.",
          },
        ],
      },
      {
        heading: {
          en: "When Heartburn Becomes More Than Occasional",
          es: "Cuando la acidez deja de ser ocasional",
        },
        paragraphs: [
          {
            en: "Heartburn happens when stomach acid washes backward into the esophagus, the tube that carries food from the mouth to the stomach. Once in a while, that is a normal event. When it happens often, doctors may diagnose gastroesophageal reflux disease, usually shortened to GERD.",
            es: "La acidez ocurre cuando el ácido del estómago regresa hacia el esófago, el conducto que lleva los alimentos de la boca al estómago. De vez en cuando, eso es un evento normal. Cuando sucede con frecuencia, los médicos pueden diagnosticar enfermedad por reflujo gastroesofágico, conocida por sus siglas como ERGE.",
          },
          {
            en: "Repeated acid exposure irritates the lining of the esophagus, and over the years that irritation can cause inflammation and, in some people, lasting changes in the tissue. Keeping track of how often symptoms occur — and whether the pattern is intensifying — gives your doctor exactly the information needed to decide on next steps.",
            es: "La exposición repetida al ácido irrita el revestimiento del esófago y, con los años, esa irritación puede causar inflamación y, en algunas personas, cambios duraderos en el tejido. Llevar un registro de la frecuencia de sus síntomas —y de si el patrón se está intensificando— le da a su médico justo la información que necesita para decidir los siguientes pasos.",
          },
        ],
      },
      {
        heading: {
          en: "Warning Signs That Require Attention",
          es: "Señales de alerta que requieren atención",
        },
        paragraphs: [
          {
            en: "Some symptoms deserve prompt attention no matter how long you have had heartburn. Trouble swallowing, the sensation of food sticking on the way down, a sore throat that will not clear, a lingering cough, or hoarseness can all mean reflux is doing more than causing discomfort.",
            es: "Algunos síntomas merecen atención pronta sin importar cuánto tiempo lleve usted con acidez. La dificultad para tragar, la sensación de que la comida se atora al bajar, un dolor de garganta que no se quita, una tos persistente o la ronquera pueden significar que el reflujo está haciendo algo más que causar molestias.",
          },
          {
            en: "Weight loss you were not trying for, repeated vomiting, or signs of bleeding, such as black stools, are also red flags. None of these automatically means something serious is happening — but each one is a reason to be evaluated instead of waiting.",
            es: "Una pérdida de peso que usted no buscaba, los vómitos repetidos o las señales de sangrado, como heces de color negro, también son señales de alarma. Ninguno de estos signos significa automáticamente que ocurra algo grave, pero cada uno es una razón para hacerse una evaluación en lugar de esperar.",
          },
        ],
      },
      {
        heading: {
          en: "How Heartburn Can Affect Daily Life",
          es: "Cómo la acidez puede afectar la vida diaria",
        },
        paragraphs: [
          {
            en: "Beyond the physical discomfort, persistent reflux has a way of shrinking daily life. Symptoms that flare at night can rob you of sleep. Favorite foods start coming off the menu, meals out become something to plan around, and lying down after dinner starts to feel risky. When heartburn is dictating your routines, that by itself is a sign it deserves proper evaluation and treatment rather than more workarounds.",
            es: "Más allá de la molestia física, el reflujo persistente tiende a reducir la vida diaria. Los síntomas que se intensifican por la noche pueden robarle el sueño. Los platos favoritos comienzan a salir del menú, comer fuera se convierte en algo que hay que planear con cuidado, y acostarse después de la cena empieza a sentirse arriesgado. Cuando la acidez está dictando sus rutinas, eso por sí solo es una señal de que merece una evaluación y un tratamiento adecuados, y no más soluciones provisionales.",
          },
        ],
      },
      {
        heading: {
          en: "When to Seek Medical Evaluation",
          es: "Cuándo buscar una evaluación médica",
        },
        paragraphs: [
          {
            en: "See a doctor if heartburn is frequent, worsening, or paired with any of the warning signs above — and also if you find yourself relying on antacids most days just to stay comfortable. A gastroenterologist can identify what is driving the reflux, examine the condition of the esophagus when needed, and recommend treatment that fits your situation. Evaluating persistent reflux early helps lower the risk of complications and protects your long-term digestive health.",
            es: "Consulte a un médico si la acidez es frecuente, va empeorando o se acompaña de cualquiera de las señales de alerta anteriores, y también si nota que depende de los antiácidos casi todos los días solo para sentirse bien. Un gastroenterólogo puede identificar qué está provocando el reflujo, examinar el estado del esófago cuando sea necesario y recomendar un tratamiento acorde a su situación. Evaluar a tiempo el reflujo persistente ayuda a reducir el riesgo de complicaciones y protege su salud digestiva a largo plazo.",
          },
        ],
      },
    ],
  },
  {
    slug: "how-diet-choices-influence-digestive-comfort",
    legacyPath: "/blog/1444891-how-diet-choices-influence-digestive-comfort",
    title: {
      en: "How Diet Choices Influence Digestive Comfort",
      es: "Cómo la alimentación influye en el bienestar digestivo",
    },
    posted: "2026-04-09",
    teaser: {
      en: "What you eat — and how you eat it — shapes how your digestive system feels day to day. Learn practical ways to spot your trigger foods and build habits that keep digestion comfortable.",
      es: "Lo que usted come —y la manera en que lo come— influye en cómo se siente su aparato digestivo día a día. Conozca maneras prácticas de identificar los alimentos que le caen mal y de crear hábitos que mantengan una digestión cómoda.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Some meals sit well, and some decidedly do not. The connection between what is on your plate and how your abdomen feels afterward is real, and it goes beyond the occasional heavy dinner. Paying deliberate attention to food choices — and to eating habits — is one of the simplest ways to make digestion more predictable and comfortable.",
            es: "Hay comidas que caen bien y otras que decididamente no. La conexión entre lo que hay en su plato y cómo se siente su abdomen después es real, y va más allá de la cena pesada ocasional. Prestar atención deliberada a la elección de los alimentos —y a los hábitos al comer— es una de las maneras más sencillas de lograr una digestión más predecible y cómoda.",
          },
        ],
      },
      {
        heading: {
          en: "How Food Affects Digestion",
          es: "Cómo los alimentos afectan la digestión",
        },
        paragraphs: [
          {
            en: "Digestion is the work of breaking food down into nutrients the body can absorb, and not every food makes that work equally easy. Fried and very fatty dishes take longer to leave the stomach. Heavily processed items and intensely spiced meals can irritate a sensitive gut. Any of these can show up afterward as bloating, gas, or a heavy, uncomfortable feeling.",
            es: "La digestión es el trabajo de descomponer los alimentos en nutrientes que el cuerpo pueda absorber, y no todos los alimentos facilitan esa labor por igual. Los platos fritos o muy grasosos tardan más en salir del estómago. Los productos muy procesados y las comidas muy condimentadas pueden irritar un intestino sensible. Cualquiera de ellos puede manifestarse después como hinchazón, gases o una sensación pesada e incómoda.",
          },
          {
            en: "Meals built around vegetables, whole grains, lean proteins, and adequate fluids generally ask less of the digestive system — and the difference is often noticeable in how you feel after eating.",
            es: "Las comidas basadas en verduras, granos integrales, proteínas magras y suficientes líquidos suelen exigirle menos al aparato digestivo, y la diferencia a menudo se nota en cómo se siente usted después de comer.",
          },
        ],
      },
      {
        heading: {
          en: "Common Triggers of Digestive Discomfort",
          es: "Desencadenantes comunes de las molestias digestivas",
        },
        paragraphs: [
          {
            en: "Trigger foods are personal. Dairy bothers some people and not others, and the same is true of caffeine, spicy dishes, and foods high in sugar. If cramping, indigestion, or a change in bowel habits tends to follow particular foods, that pattern is worth writing down — a simple food-and-symptom diary often reveals connections that memory misses.",
            es: "Los alimentos desencadenantes son algo personal. Los lácteos les caen mal a algunas personas y a otras no, y lo mismo ocurre con la cafeína, los platos picantes y los alimentos altos en azúcar. Si los cólicos, la indigestión o un cambio en los hábitos intestinales tienden a aparecer después de ciertos alimentos, vale la pena anotar ese patrón: un diario sencillo de comidas y síntomas a menudo revela conexiones que la memoria pasa por alto.",
          },
          {
            en: "Portion size and pace matter as well. Oversized meals and rushed eating both hand the digestive system more than it can comfortably handle at once, which often ends in pressure, fullness, or reflux.",
            es: "El tamaño de las porciones y el ritmo también cuentan. Las comidas demasiado abundantes y el comer con prisa le entregan al aparato digestivo más de lo que puede manejar cómodamente a la vez, lo que suele terminar en presión, llenura o reflujo.",
          },
        ],
      },
      {
        heading: {
          en: "Habits That Support Comfortable Digestion",
          es: "Hábitos que favorecen una digestión cómoda",
        },
        paragraphs: [
          {
            en: "A few steady habits carry most of the load. Fiber from fruits, vegetables, and whole grains keeps food moving through the digestive tract, and water supports every step of the process, including preventing constipation. Neither works well without the other.",
            es: "Unos cuantos hábitos constantes hacen la mayor parte del trabajo. La fibra de las frutas, las verduras y los granos integrales mantiene los alimentos en movimiento a lo largo del tubo digestivo, y el agua apoya cada paso del proceso, incluida la prevención del estreñimiento. Ninguno de los dos funciona bien sin el otro.",
          },
          {
            en: "Beyond what you eat, how you eat counts. Sitting down to meals at fairly regular times, eating at an unhurried pace, and chewing thoroughly all give digestion a head start. Small adjustments maintained consistently tend to accomplish more than dramatic overhauls that last a week.",
            es: "Más allá de lo que come, importa cómo come. Sentarse a comer en horarios más o menos regulares, hacerlo sin prisa y masticar bien le dan a la digestión una ventaja desde el inicio. Los ajustes pequeños sostenidos en el tiempo tienden a lograr más que los cambios drásticos que duran una semana.",
          },
        ],
      },
      {
        heading: {
          en: "When to Seek Medical Guidance",
          es: "Cuándo buscar orientación médica",
        },
        paragraphs: [
          {
            en: "Occasional indigestion is part of life, and thoughtful diet adjustments resolve much of it. Symptoms that persist are a different matter. Bloating that keeps returning, ongoing abdominal pain, or a lasting change in bowel habits deserves an evaluation rather than another round of trial and error. A gastroenterologist can look for underlying causes and recommend treatment based on what is actually going on — not guesswork.",
            es: "La indigestión ocasional es parte de la vida, y unos ajustes cuidadosos en la alimentación resuelven buena parte de ella. Los síntomas que persisten son otro asunto. La hinchazón que regresa una y otra vez, el dolor abdominal continuo o un cambio duradero en los hábitos intestinales merecen una evaluación, en lugar de otra ronda de prueba y error. Un gastroenterólogo puede buscar las causas de fondo y recomendar un tratamiento basado en lo que realmente está ocurriendo, no en conjeturas.",
          },
        ],
      },
    ],
  },
];
