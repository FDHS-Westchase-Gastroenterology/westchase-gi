/* Real repo data the preview cards compose with, exposed on the bundle.
 *
 * The site-section components take the practice's own content as props — the
 * locale dictionary (26 KB), the education library, the prep instructions.
 * Inlining any of that into each preview would duplicate it many times over
 * and rot the moment the copy changes, so the real modules are re-exported
 * here and the cards read from them. Every card therefore shows the words the
 * site actually ships.
 *
 * Wired via cfg.extraEntries; lands on window.WestchaseGi alongside the
 * components.
 */

import { educationTopics } from "@/lib/content/education";
import { prepDocs } from "@/lib/content/preps";

export { en as previewDict } from "@/lib/dictionaries/en";
/* The Spanish dictionary, for the LanguageChooser card: that component is
   evidence-gated and only opens when the browser's top language differs from
   the served locale, so an es-locale render is the only way to show its real
   open state in a headless (en-US) browser. */
export { es as previewDictEs } from "@/lib/dictionaries/es";
export { site as previewSite } from "@/lib/site";

/** The locale the cards render in. */
export const previewLocale = "en" as const;

/** A representative long-form article for the ArticleBody card. */
export const previewArticleSections = (
  educationTopics.find((t) => t.slug === "colonoscopy") ?? educationTopics[0]
).sections;

/** A representative prep document for the PrepBody card.
 *  NB: PrepDoc.sections is keyed BY LOCALE (Record<Locale, PrepSection[]>),
 *  unlike EducationTopic.sections which is already an array. Passing the whole
 *  record renders an empty card. */
export const previewPrepSections = prepDocs[0].sections[previewLocale];

/** The practice's provider profile-card graphic, for the ProfileCardViewer. */
export const previewCardImage = {
  src: "/images/staff/headshots/dr-chang.jpg",
  width: 1200,
  height: 1600,
};

/* Recharts primitives, re-exported from the bundle.
 *
 * ChartContainer wraps its children in the bundle's OWN ResponsiveContainer.
 * A preview that imports `recharts` directly gets a SECOND copy bundled into
 * its preview JS (~850 KB), and ResponsiveContainer then fails to recognise
 * children built by the other copy — the chart renders as an empty box, with
 * no error. Re-exporting here puts one shared instance on the global.
 *
 * Prefixed `Rc` because recharts ships Label, Tooltip, Legend, Cell and Text,
 * which would collide with the design system's own components.
 */
export {
  Area as RcArea,
  AreaChart as RcAreaChart,
  Bar as RcBar,
  BarChart as RcBarChart,
  CartesianGrid as RcCartesianGrid,
  Label as RcLabel,
  Line as RcLine,
  LineChart as RcLineChart,
  Pie as RcPie,
  PieChart as RcPieChart,
  PolarAngleAxis as RcPolarAngleAxis,
  PolarGrid as RcPolarGrid,
  PolarRadiusAxis as RcPolarRadiusAxis,
  Radar as RcRadar,
  RadarChart as RcRadarChart,
  RadialBar as RcRadialBar,
  RadialBarChart as RcRadialBarChart,
  XAxis as RcXAxis,
  YAxis as RcYAxis,
} from "recharts";
