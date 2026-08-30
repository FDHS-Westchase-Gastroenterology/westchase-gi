/* The site header: brand mark, primary nav, language menu and the two
   standing CTAs. Renders with the practice's real EN copy. */
import { Header, previewDict, previewLocale } from "westchase-gi";
export function Default() {
  return <Header locale={previewLocale} dict={previewDict} />;
}
