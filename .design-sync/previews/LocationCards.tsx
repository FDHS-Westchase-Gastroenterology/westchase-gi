/* Both offices with full NAP each — a keep-list requirement, so every field
   shown here is load-bearing for local search. */
import { LocationCards, previewDict, previewLocale } from "westchase-gi";
export function Default() {
  return <LocationCards locale={previewLocale} dict={previewDict} />;
}
