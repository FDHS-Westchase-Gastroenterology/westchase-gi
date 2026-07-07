// Blog port, batch 2 (legacy posts 7–11). Titles and dates match the old site
// exactly; article bodies are original bilingual prose written for the rebuild.

import type { BlogPost } from "../types";

export const batch2: BlogPost[] = [
  {
    slug: "understanding-the-difference-between-ibs-and-ibd",
    legacyPath: "/blog/1435553-understanding-the-difference-between-ibs-and-ibd",
    title: {
      en: "Understanding the Difference Between IBS and IBD",
      es: "Entienda la diferencia entre el SII y la EII",
    },
    posted: "2026-03-16",
    teaser: {
      en: "IBS and IBD sound alike and share some symptoms, but they are very different conditions. Learn how each affects the digestive tract and when it makes sense to seek an evaluation.",
      es: "El SII y la EII suenan parecido y comparten algunos síntomas, pero son condiciones muy distintas. Conozca cómo afecta cada una al tubo digestivo y cuándo conviene buscar una evaluación.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Irritable bowel syndrome (IBS) and inflammatory bowel disease (IBD) are two of the most commonly confused terms in digestive health. The names look nearly identical, and both conditions can cause abdominal pain and changes in bowel habits. Beneath the surface, however, they are very different problems.",
            es: "El síndrome del intestino irritable (SII) y la enfermedad inflamatoria intestinal (EII) son dos de los términos que más se confunden en la salud digestiva. Los nombres se parecen mucho, y ambas condiciones pueden causar dolor abdominal y cambios en los hábitos intestinales. En el fondo, sin embargo, se trata de problemas muy diferentes.",
          },
          {
            en: "Knowing how the two differ can make it easier to describe your symptoms, ask useful questions, and understand why your care team may recommend certain tests.",
            es: "Saber en qué se diferencian puede facilitarle describir sus síntomas, hacer preguntas útiles y entender por qué su equipo médico puede recomendar ciertos estudios.",
          },
        ],
      },
      {
        heading: {
          en: "What Is Irritable Bowel Syndrome (IBS)?",
          es: "¿Qué es el síndrome del intestino irritable (SII)?",
        },
        paragraphs: [
          {
            en: "IBS is what doctors call a functional disorder: the bowel looks healthy on testing, but the way it squeezes, empties, and senses doesn't always work smoothly. The result can be cramping, bloating, gas, and episodes of diarrhea, constipation, or a mix of both.",
            es: "El SII es lo que los médicos llaman un trastorno funcional: el intestino se ve sano en los estudios, pero su manera de contraerse, vaciarse y percibir no siempre funciona con normalidad. El resultado puede ser cólicos, hinchazón, gases y episodios de diarrea, estreñimiento o una combinación de ambos.",
          },
          {
            en: "Symptoms tend to come and go, and many people notice flare-ups after certain meals, during stressful stretches, or when their routine changes. IBS can be genuinely disruptive, but it does not inflame or scar the intestine, and it is not known to lead to more serious bowel damage.",
            es: "Los síntomas tienden a aparecer y desaparecer, y muchas personas notan brotes después de ciertas comidas, en épocas de estrés o cuando cambia su rutina. El SII puede ser muy molesto, pero no inflama ni cicatriza el intestino, y no se asocia con daños intestinales más graves.",
          },
        ],
      },
      {
        heading: {
          en: "What Is Inflammatory Bowel Disease (IBD)?",
          es: "¿Qué es la enfermedad inflamatoria intestinal (EII)?",
        },
        paragraphs: [
          {
            en: "IBD is a different kind of condition. It is an umbrella term for chronic diseases — mainly Crohn's disease and ulcerative colitis — in which the immune system produces real, ongoing inflammation in the digestive tract.",
            es: "La EII es un tipo de condición distinto. Es un término general para enfermedades crónicas —principalmente la enfermedad de Crohn y la colitis ulcerosa— en las que el sistema inmunitario produce una inflamación real y continua en el tubo digestivo.",
          },
          {
            en: "That inflammation can injure the intestinal lining over time. Along with abdominal pain and persistent diarrhea, people with IBD may notice blood in the stool, fatigue, or weight loss they didn't intend. Because the disease can cause lasting damage, it calls for ongoing medical treatment and monitoring rather than lifestyle changes alone.",
            es: "Con el tiempo, esa inflamación puede dañar el revestimiento intestinal. Además del dolor abdominal y la diarrea persistente, las personas con EII pueden notar sangre en las heces, fatiga o una pérdida de peso involuntaria. Como la enfermedad puede causar daños duraderos, requiere tratamiento y seguimiento médico continuos, no solo cambios en el estilo de vida.",
          },
        ],
      },
      {
        heading: {
          en: "The Key Differences",
          es: "Las diferencias principales",
        },
        paragraphs: [
          {
            en: "The clearest dividing line is inflammation. IBS changes how the bowel behaves without injuring it; IBD physically inflames and damages intestinal tissue.",
            es: "La línea divisoria más clara es la inflamación. El SII cambia el comportamiento del intestino sin lesionarlo; la EII inflama y daña físicamente el tejido intestinal.",
          },
          {
            en: "The two also follow different patterns. IBS symptoms often track with food, stress, and daily routine. IBD tends to move through cycles of flare-ups and quieter stretches, and over the years it can bring complications — such as scarring or trouble absorbing nutrients — that need a specialist's care.",
            es: "Además, siguen patrones distintos. Los síntomas del SII suelen relacionarse con la comida, el estrés y la rutina diaria. La EII tiende a alternar entre brotes y períodos más tranquilos, y con los años puede traer complicaciones —como cicatrización o dificultad para absorber nutrientes— que necesitan la atención de un especialista.",
          },
        ],
      },
      {
        heading: {
          en: "When to See a Gastroenterologist",
          es: "Cuándo consultar a un gastroenterólogo",
        },
        paragraphs: [
          {
            en: "Because the symptoms overlap, it is hard to tell these conditions apart on your own. A gastroenterologist can use lab work, imaging, and procedures such as colonoscopy to determine whether IBS, IBD, or something else entirely is behind your symptoms.",
            es: "Como los síntomas se superponen, es difícil distinguir estas condiciones por su cuenta. Un gastroenterólogo puede usar análisis de laboratorio, estudios de imagen y procedimientos como la colonoscopia para determinar si detrás de sus síntomas está el SII, la EII u otra cosa completamente distinta.",
          },
          {
            en: "Warning signs such as blood in the stool, unexplained weight loss, or pain that keeps getting worse deserve an appointment without delay. An accurate diagnosis is the starting point for treatment that fits your condition — and for real peace of mind.",
            es: "Señales de alerta como sangre en las heces, pérdida de peso sin explicación o un dolor que va en aumento ameritan una cita sin demora. Un diagnóstico preciso es el punto de partida para un tratamiento adecuado a su condición, y para una verdadera tranquilidad.",
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
    },
    posted: "2026-03-10",
    teaser: {
      en: "An upset stomach now and then is normal, but symptoms that linger for weeks are worth a closer look. These are the signs that it may be time to see a gastroenterologist.",
      es: "Un malestar estomacal de vez en cuando es normal, pero los síntomas que se prolongan por semanas merecen más atención. Estas son las señales de que puede ser momento de consultar a un gastroenterólogo.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "Almost everyone deals with digestive trouble from time to time. A heavy meal, a stressful week, or a passing virus can throw things off for a few days, and matters usually settle on their own.",
            es: "Casi todo el mundo tiene molestias digestivas de vez en cuando. Una comida pesada, una semana estresante o un virus pasajero pueden alterar la digestión por unos días, y por lo general todo se normaliza por sí solo.",
          },
          {
            en: "The picture changes when symptoms stay. Digestive problems that last for weeks, keep returning, or start interfering with meals, sleep, or work deserve more than home remedies — they deserve a careful evaluation.",
            es: "El panorama cambia cuando los síntomas no desaparecen. Los problemas digestivos que duran semanas, que regresan una y otra vez o que empiezan a interferir con las comidas, el sueño o el trabajo merecen algo más que remedios caseros: merecen una evaluación cuidadosa.",
          },
        ],
      },
      {
        heading: {
          en: "Pain or Bowel Changes That Persist",
          es: "Dolor o cambios intestinales que persisten",
        },
        paragraphs: [
          {
            en: "Abdominal pain that continues or keeps coming back is one of the most common reasons people end up seeing a gastroenterologist. So are lasting shifts in bowel habits: diarrhea or constipation that goes on for more than a few weeks, or a pattern that alternates between the two.",
            es: "El dolor abdominal que continúa o que reaparece una y otra vez es una de las razones más comunes por las que las personas terminan consultando a un gastroenterólogo. También lo son los cambios duraderos en los hábitos intestinales: diarrea o estreñimiento que se prolonga por más de unas semanas, o un patrón que alterna entre los dos.",
          },
          {
            en: "Symptoms like these have many possible explanations, from irritable bowel syndrome to inflammation somewhere in the digestive tract. Testing is often the only way to tell them apart, and it is far better to know than to guess.",
            es: "Síntomas como estos tienen muchas explicaciones posibles, desde el síndrome del intestino irritable hasta una inflamación en algún punto del tubo digestivo. Con frecuencia, los estudios son la única manera de distinguirlas, y siempre es mejor saber que adivinar.",
          },
        ],
      },
      {
        heading: {
          en: "Heartburn That Keeps Coming Back",
          es: "Acidez que reaparece una y otra vez",
        },
        paragraphs: [
          {
            en: "Occasional heartburn after a big or spicy meal is common. When reflux flares several times a week, though, or you find yourself relying on antacids day after day, it may be gastroesophageal reflux disease, known as GERD.",
            es: "Es común sentir acidez ocasional después de una comida abundante o condimentada. Sin embargo, cuando el reflujo aparece varias veces por semana, o usted depende de antiácidos día tras día, puede tratarse de la enfermedad por reflujo gastroesofágico, conocida como ERGE.",
          },
          {
            en: "Reflux that goes unaddressed can irritate the esophagus over time. A specialist can confirm what is happening and recommend ways to protect the esophagus and manage day-to-day symptoms.",
            es: "El reflujo que no se atiende puede irritar el esófago con el tiempo. Un especialista puede confirmar qué está ocurriendo y recomendar maneras de proteger el esófago y controlar los síntomas del día a día.",
          },
        ],
      },
      {
        heading: {
          en: "Symptoms That Should Not Wait",
          es: "Síntomas que no deben esperar",
        },
        paragraphs: [
          {
            en: "Some signs call for prompt attention rather than watchful waiting: blood in the stool, difficulty swallowing, persistent nausea or vomiting, weight loss you can't explain, and fatigue with no clear cause.",
            es: "Algunas señales requieren atención pronta en lugar de espera: sangre en las heces, dificultad para tragar, náuseas o vómitos persistentes, una pérdida de peso que no puede explicar y fatiga sin causa clara.",
          },
          {
            en: "These symptoms do not automatically mean something serious is wrong, but they can point to conditions that are much easier to address when found early. Don't wait for them to resolve on their own.",
            es: "Estos síntomas no significan automáticamente que exista algo grave, pero pueden indicar condiciones que son mucho más fáciles de atender cuando se detectan a tiempo. No espere a que desaparezcan por sí solos.",
          },
        ],
      },
      {
        heading: {
          en: "How a Gastroenterologist Can Help",
          es: "Cómo puede ayudar un gastroenterólogo",
        },
        paragraphs: [
          {
            en: "Gastroenterologists focus entirely on the digestive system. They can order the right tests, perform procedures such as endoscopy or colonoscopy when needed, and build a treatment plan aimed at the cause of your symptoms rather than just the discomfort.",
            es: "Los gastroenterólogos se dedican por completo al sistema digestivo. Pueden ordenar los estudios adecuados, realizar procedimientos como la endoscopia o la colonoscopia cuando se necesitan, y elaborar un plan de tratamiento dirigido a la causa de sus síntomas y no solo al malestar.",
          },
          {
            en: "If your digestion hasn't felt right for weeks, trust that instinct. An early conversation with a specialist can bring clarity — and a plan for protecting your digestive health over the long run.",
            es: "Si su digestión no se ha sentido bien por semanas, confíe en esa intuición. Una conversación temprana con un especialista puede brindarle claridad, y un plan para proteger su salud digestiva a largo plazo.",
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
    },
    posted: "2026-02-24",
    teaser: {
      en: "How fast you eat, how much water you drink, and how you handle stress all shape how your gut feels. Small, steady adjustments can add up to noticeably more comfortable days.",
      es: "La rapidez con la que come, la cantidad de agua que toma y la forma en que maneja el estrés influyen en cómo se siente su sistema digestivo. Los ajustes pequeños y constantes pueden traducirse en días notablemente más cómodos.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "How your stomach feels at the end of the day often has less to do with luck than with habit. Everyday choices around meals, fluids, movement, and stress all influence bloating, regularity, and overall comfort.",
            es: "Cómo se siente su estómago al final del día suele tener menos que ver con la suerte que con los hábitos. Las decisiones cotidianas sobre las comidas, los líquidos, el movimiento y el estrés influyen en la hinchazón, la regularidad y la comodidad general.",
          },
          {
            en: "The encouraging part is that habits can change. Small, consistent adjustments are often enough to ease familiar complaints like gas, uncomfortable fullness, and irregularity.",
            es: "Lo alentador es que los hábitos pueden cambiar. Con frecuencia, pequeños ajustes constantes bastan para aliviar molestias conocidas como los gases, la sensación incómoda de llenura y la irregularidad.",
          },
        ],
      },
      {
        heading: {
          en: "How You Eat Matters as Much as What You Eat",
          es: "Cómo come importa tanto como qué come",
        },
        paragraphs: [
          {
            en: "Eating quickly or finishing very large portions gives the digestive system a great deal to handle at once. Rushing also outpaces the body's fullness signals, which need time to catch up — so hurried meals often turn into oversized ones.",
            es: "Comer rápido o servirse porciones muy grandes le da al sistema digestivo demasiado que procesar de una sola vez. Además, comer con prisa se adelanta a las señales de saciedad del cuerpo, que tardan en llegar; por eso las comidas apuradas suelen convertirse en comidas excesivas.",
          },
          {
            en: "Slowing down, chewing well, and spreading moderate portions across the day can make digestion feel smoother and keep energy steadier between meals. Lighter evening meals can also make bedtime more comfortable, especially for people prone to reflux.",
            es: "Comer más despacio, masticar bien y repartir porciones moderadas a lo largo del día puede hacer que la digestión se sienta más ligera y que la energía se mantenga más estable entre comidas. Cenar más ligero también puede hacer más cómoda la hora de dormir, sobre todo para quienes tienden a tener reflujo.",
          },
        ],
      },
      {
        heading: {
          en: "Water and Food Choices",
          es: "El agua y la elección de alimentos",
        },
        paragraphs: [
          {
            en: "Water softens food as it digests, helps it move through the intestines, and keeps bowel movements regular. Falling short is a common, easy-to-miss contributor to constipation, and it helps to sip steadily through the day instead of catching up with one big glass at night.",
            es: "El agua ablanda los alimentos durante la digestión, ayuda a que avancen por los intestinos y mantiene las evacuaciones regulares. Tomar poca agua es una causa común, y fácil de pasar por alto, del estreñimiento; ayuda beber a sorbos a lo largo del día en lugar de intentar compensar por la noche con un vaso grande.",
          },
          {
            en: "Food choices matter too, and they are personal. Fried or heavily processed foods, large amounts of sugar, dairy, or strongly seasoned dishes bother some people and not others. Noticing how you feel after meals — even keeping brief notes for a couple of weeks — can reveal patterns worth acting on.",
            es: "La elección de alimentos también importa, y es algo personal. Las frituras o los alimentos muy procesados, el exceso de azúcar, los lácteos o los platos muy condimentados les caen mal a algunas personas y a otras no. Prestar atención a cómo se siente después de comer —incluso tomar notas breves durante un par de semanas— puede revelar patrones que vale la pena atender.",
          },
        ],
      },
      {
        heading: {
          en: "Movement and Stress",
          es: "El movimiento y el estrés",
        },
        paragraphs: [
          {
            en: "The gut works better when the body moves. Regular activity helps food travel through the digestive tract, while long sedentary stretches can slow everything down. Even a short walk after meals may ease bloating.",
            es: "El intestino trabaja mejor cuando el cuerpo se mueve. La actividad regular ayuda a que los alimentos avancen por el tubo digestivo, mientras que pasar muchas horas sentado puede volverlo todo más lento. Incluso una caminata corta después de comer puede aliviar la hinchazón.",
          },
          {
            en: "Stress shows up in the gut as well, often as cramping, appetite changes, or irregular bowel habits. Consistent sleep, a few minutes of slow breathing, and a predictable daily routine can quiet some of that noise.",
            es: "El estrés también se refleja en el intestino, muchas veces en forma de cólicos, cambios de apetito o hábitos intestinales irregulares. Dormir con horarios constantes, dedicar unos minutos a respirar despacio y mantener una rutina diaria predecible puede calmar parte de ese efecto.",
          },
        ],
      },
      {
        heading: {
          en: "When Habits Aren't Enough",
          es: "Cuando los hábitos no bastan",
        },
        paragraphs: [
          {
            en: "Lifestyle changes go a long way, but they have limits. Bloating, abdominal pain, or bowel changes that persist despite your best efforts — or weight changes you can't explain — should be evaluated by a gastroenterologist.",
            es: "Los cambios de estilo de vida ayudan mucho, pero tienen límites. La hinchazón, el dolor abdominal o los cambios intestinales que persisten a pesar de sus esfuerzos —o los cambios de peso que no puede explicar— deben ser evaluados por un gastroenterólogo.",
          },
          {
            en: "A specialist can determine whether an underlying condition is at work and help you address it directly. Getting answers early is one of the simplest ways to protect your long-term digestive comfort and health.",
            es: "Un especialista puede determinar si hay una condición de fondo y ayudarle a atenderla directamente. Obtener respuestas a tiempo es una de las maneras más sencillas de proteger su comodidad y su salud digestiva a largo plazo.",
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
    },
    posted: "2026-02-06",
    teaser: {
      en: "Your gut does far more than digest food — it houses much of your immune defense and supplies the fuel behind your daily energy. Here's how that connection works and how to care for it.",
      es: "Su intestino hace mucho más que digerir alimentos: alberga gran parte de su defensa inmunitaria y aporta el combustible de su energía diaria. Le explicamos cómo funciona esa conexión y cómo cuidarla.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "It is easy to think of the gut as a simple food processor, but it does much more than digest meals. The gastrointestinal tract absorbs the vitamins and minerals the body runs on, and it plays a surprisingly large role in defending against illness.",
            es: "Es fácil pensar en el intestino como un simple procesador de alimentos, pero hace mucho más que digerir comidas. El tubo digestivo absorbe las vitaminas y los minerales con los que funciona el cuerpo, y cumple un papel sorprendentemente importante en la defensa contra las enfermedades.",
          },
          {
            en: "When digestion works well, the benefits reach the whole body: steadier energy, stronger defenses, and a more consistent sense of feeling well.",
            es: "Cuando la digestión funciona bien, los beneficios llegan a todo el cuerpo: energía más estable, defensas más fuertes y una sensación de bienestar más constante.",
          },
        ],
      },
      {
        heading: {
          en: "Your Gut Is Part of Your Immune System",
          es: "Su intestino es parte de su sistema inmunitario",
        },
        paragraphs: [
          {
            en: "Much of the body's immune activity happens in and around the digestive tract. The intestinal lining forms a barrier that keeps harmful bacteria and other unwanted substances out of the bloodstream, while the community of beneficial bacteria living in the gut helps regulate immune responses and keep inflammation in check.",
            es: "Gran parte de la actividad inmunitaria del cuerpo ocurre en el tubo digestivo y a su alrededor. El revestimiento intestinal forma una barrera que impide que bacterias dañinas y otras sustancias indeseadas pasen a la sangre, mientras que la comunidad de bacterias beneficiosas que vive en el intestino ayuda a regular las respuestas inmunitarias y a mantener la inflamación bajo control.",
          },
          {
            en: "When that bacterial balance is disturbed — by illness, certain medications, or a poor diet — immune defenses can be affected along with it. Caring for your digestion is one way of supporting the body's own protections.",
            es: "Cuando ese equilibrio bacteriano se altera —por una enfermedad, ciertos medicamentos o una mala alimentación—, las defensas inmunitarias también pueden verse afectadas. Cuidar la digestión es una forma de apoyar las protecciones propias del cuerpo.",
          },
        ],
      },
      {
        heading: {
          en: "Where Daily Energy Comes From",
          es: "De dónde viene la energía diaria",
        },
        paragraphs: [
          {
            en: "Every bit of energy you use starts as food the gut must break down and absorb. Nutrients such as protein, iron, B vitamins, and magnesium are especially important for stamina and muscle strength.",
            es: "Toda la energía que usted usa comienza como alimento que el intestino debe descomponer y absorber. Nutrientes como las proteínas, el hierro, las vitaminas B y el magnesio son especialmente importantes para la resistencia y la fuerza muscular.",
          },
          {
            en: "If absorption is impaired, fatigue can set in even when you are eating well. Bloating, discomfort, and irregular bowel habits can also interrupt sleep and make it harder to concentrate, which compounds the tiredness.",
            es: "Si la absorción está afectada, el cansancio puede aparecer aun cuando usted come bien. La hinchazón, las molestias y los hábitos intestinales irregulares también pueden interrumpir el sueño y dificultar la concentración, lo que agrava la fatiga.",
          },
        ],
      },
      {
        heading: {
          en: "Everyday Factors That Shape Gut Health",
          es: "Factores cotidianos que influyen en la salud intestinal",
        },
        paragraphs: [
          {
            en: "Daily choices influence how well the gut performs. Fiber, fluids, regular meals, physical activity, and consistent sleep all support normal digestion, while ongoing stress and heavily processed diets tend to work against it.",
            es: "Las decisiones diarias influyen en el desempeño del intestino. La fibra, los líquidos, las comidas regulares, la actividad física y el sueño constante apoyan la digestión normal, mientras que el estrés continuo y las dietas muy procesadas tienden a perjudicarla.",
          },
          {
            en: "Some medications, including antibiotics and long-term use of acid-reducing medicines, can also shift the gut's bacterial balance. And chronic conditions such as irritable bowel syndrome, reflux, or inflammatory bowel disease may need medical care rather than lifestyle changes alone.",
            es: "Algunos medicamentos, incluidos los antibióticos y el uso prolongado de medicinas que reducen el ácido estomacal, también pueden alterar el equilibrio bacteriano del intestino. Y condiciones crónicas como el síndrome del intestino irritable, el reflujo o la enfermedad inflamatoria intestinal pueden requerir atención médica, no solo cambios de estilo de vida.",
          },
        ],
      },
      {
        heading: {
          en: "When to Talk with a Gastroenterologist",
          es: "Cuándo hablar con un gastroenterólogo",
        },
        paragraphs: [
          {
            en: "If you are dealing with ongoing abdominal pain, frequent heartburn, changing bowel habits, or fatigue with no clear explanation, it is reasonable to have your digestive health evaluated.",
            es: "Si usted tiene dolor abdominal continuo, acidez frecuente, cambios en los hábitos intestinales o una fatiga sin explicación clara, es razonable buscar una evaluación de su salud digestiva.",
          },
          {
            en: "A gastroenterologist can look for underlying causes and recommend a plan suited to you. Supporting your gut is not a quick fix, but over time it is one of the most practical things you can do for your overall health.",
            es: "Un gastroenterólogo puede buscar las causas de fondo y recomendar un plan adecuado para usted. Cuidar el intestino no es una solución instantánea, pero con el tiempo es una de las cosas más prácticas que puede hacer por su salud general.",
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
    },
    posted: "2026-01-26",
    teaser: {
      en: "Fatigue, trouble focusing, and low mood can sometimes trace back to the digestive system. Understanding the link can help you decide when tiredness deserves a doctor's attention.",
      es: "El cansancio, la dificultad para concentrarse y el ánimo bajo a veces tienen su origen en el sistema digestivo. Entender esa conexión puede ayudarle a decidir cuándo la fatiga merece la atención de un médico.",
    },
    sections: [
      {
        paragraphs: [
          {
            en: "When people feel run down week after week, digestion is rarely the first thing they suspect. Yet the digestive system sits at the center of daily well-being: it turns meals into usable energy, and when it struggles, fatigue, discomfort, and changes in mood or focus often follow.",
            es: "Cuando alguien se siente agotado semana tras semana, rara vez sospecha primero de la digestión. Sin embargo, el sistema digestivo está en el centro del bienestar diario: convierte las comidas en energía utilizable y, cuando tiene problemas, suelen aparecer fatiga, molestias y cambios en el ánimo o la concentración.",
          },
          {
            en: "Recognizing that connection matters, because it can point you toward answers — and the right care — sooner.",
            es: "Reconocer esa conexión es importante, porque puede orientarle hacia respuestas —y hacia la atención adecuada— más pronto.",
          },
        ],
      },
      {
        heading: {
          en: "From Food to Fuel",
          es: "De los alimentos a la energía",
        },
        paragraphs: [
          {
            en: "The body's energy supply depends on digestion doing its job. Carbohydrates, fats, proteins, vitamins, and minerals all have to be broken down and absorbed before cells can put them to use.",
            es: "El suministro de energía del cuerpo depende de que la digestión haga su trabajo. Los carbohidratos, las grasas, las proteínas, las vitaminas y los minerales deben descomponerse y absorberse antes de que las células puedan aprovecharlos.",
          },
          {
            en: "Inflammation, sluggish movement through the bowel, or an imbalance in gut bacteria can interfere with that process. When it does, you may feel weak or worn out even while eating a balanced diet. Many people are surprised to learn that their low energy and their stomach troubles are connected.",
            es: "La inflamación, un tránsito intestinal lento o un desequilibrio en las bacterias del intestino pueden interferir con ese proceso. Cuando eso ocurre, usted puede sentirse débil o agotado aunque lleve una dieta balanceada. A muchas personas les sorprende descubrir que su falta de energía y sus problemas estomacales están relacionados.",
          },
        ],
      },
      {
        heading: {
          en: "How Digestive Problems Wear You Down",
          es: "Cómo lo desgastan los problemas digestivos",
        },
        paragraphs: [
          {
            en: "Reflux, bloating, constipation, diarrhea, and irritable bowel symptoms are uncomfortable in their own right, and that discomfort affects concentration and patience. Symptoms that flare at night can also chip away at sleep, adding daytime drowsiness on top.",
            es: "El reflujo, la hinchazón, el estreñimiento, la diarrea y los síntomas de intestino irritable son incómodos por sí mismos, y esa incomodidad afecta la concentración y la paciencia. Los síntomas que se agravan de noche también pueden restarle sueño, sumando somnolencia durante el día.",
          },
          {
            en: "Ongoing irritation in the digestive tract places quiet stress on the rest of the body as well. Over time, some people notice headaches, general aches, or simply a lasting sense of not feeling quite right, even when no single symptom seems serious.",
            es: "La irritación continua en el tubo digestivo también somete al resto del cuerpo a un estrés silencioso. Con el tiempo, algunas personas notan dolores de cabeza, malestares generales o simplemente una sensación persistente de no estar del todo bien, aun cuando ningún síntoma por sí solo parezca grave.",
          },
        ],
      },
      {
        heading: {
          en: "Care and Lifestyle Work Together",
          es: "La atención médica y el estilo de vida van de la mano",
        },
        paragraphs: [
          {
            en: "Feeling well again usually involves two tracks at once. Medical evaluation looks for root causes — inflammation, food sensitivities, infection, or problems with how the gut moves — so treatment can address the actual problem instead of masking it.",
            es: "Volver a sentirse bien suele requerir dos caminos a la vez. La evaluación médica busca las causas de fondo —inflamación, sensibilidades alimentarias, infecciones o problemas de movimiento del intestino— para que el tratamiento atienda el problema real en lugar de solo ocultarlo.",
          },
          {
            en: "Daily habits carry real weight too. A balanced diet, steady hydration, regular movement, and consistent sleep give the digestive system better conditions for doing its work.",
            es: "Los hábitos diarios también tienen un peso real. Una dieta balanceada, una buena hidratación, el movimiento regular y un sueño constante le dan al sistema digestivo mejores condiciones para hacer su trabajo.",
          },
        ],
      },
      {
        heading: {
          en: "When to Seek an Evaluation",
          es: "Cuándo buscar una evaluación",
        },
        paragraphs: [
          {
            en: "Digestive symptoms that persist, fatigue you can't explain, changing bowel habits, or discomfort that interferes with daily life are all good reasons to see a gastroenterologist. The earlier the evaluation, the easier answers tend to be.",
            es: "Los síntomas digestivos persistentes, la fatiga que no puede explicar, los cambios en los hábitos intestinales o las molestias que interfieren con la vida diaria son buenas razones para consultar a un gastroenterólogo. Cuanto antes se haga la evaluación, más fáciles suelen ser las respuestas.",
          },
          {
            en: "Digestion touches energy, focus, mood, and quality of life. Taking digestive symptoms seriously is not an overreaction — it is often the first step toward feeling like yourself again.",
            es: "La digestión influye en la energía, la concentración, el estado de ánimo y la calidad de vida. Tomar en serio los síntomas digestivos no es una exageración: muchas veces es el primer paso para volver a sentirse como usted mismo.",
          },
        ],
      },
    ],
  },
];
