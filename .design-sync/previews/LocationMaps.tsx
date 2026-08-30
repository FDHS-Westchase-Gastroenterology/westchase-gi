/* Live maps for both offices. The embeds are keyless Google iframes and are
   lazy-loaded, so a static card shows the reserved frames. */
import { LocationMaps, previewDict, previewLocale } from "westchase-gi";
export function Default() {
  return <LocationMaps locale={previewLocale} dict={previewDict} />;
}
